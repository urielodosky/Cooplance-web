-- Migration v48: Job Cancellation and Dispute System
-- Implementation of the administrative resolution flow for client-initiated cancellations

-- 1. Modify existing tables
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false;

-- 2. Update jobs status constraint to include cancellation_requested
DO $$ 
BEGIN 
    ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_status_check;
    ALTER TABLE jobs ADD CONSTRAINT jobs_status_check CHECK (status IN (
        'open', 
        'pending_approval', 
        'active', 
        'delivered', 
        'completed', 
        'canceled', 
        'rejected', 
        'disputed', 
        'cancellation_requested'
    ));
EXCEPTION
    WHEN OTHERS THEN 
        RAISE NOTICE 'Could not update status constraint.';
END $$;

-- 3. Create job_cancellations table
CREATE TABLE IF NOT EXISTS job_cancellations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL UNIQUE REFERENCES jobs(id) ON DELETE CASCADE,
    cancelled_by UUID NOT NULL REFERENCES profiles(id),
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'refund_approved', 'fraud_rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES profiles(id)
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_job_cancellations_job_id ON job_cancellations(job_id);
CREATE INDEX IF NOT EXISTS idx_job_cancellations_status ON job_cancellations(status);

-- 4. RPC Function for Resolution
CREATE OR REPLACE FUNCTION resolve_cancellation(
    p_cancellation_id UUID,
    p_resolution TEXT,
    p_admin_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_job_id UUID;
    v_client_id UUID;
    v_freelancer_id UUID;
    v_amount NUMERIC;
BEGIN
    -- Get cancellation and job details
    SELECT job_id, cancelled_by INTO v_job_id, v_client_id
    FROM job_cancellations
    WHERE id = p_cancellation_id;

    IF v_job_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Cancelación no encontrada');
    END IF;

    -- Get job details for accounting/payout
    SELECT freelancer_id, amount INTO v_freelancer_id, v_amount
    FROM jobs
    WHERE id = v_job_id;

    -- 1. Handle Refund Approved (Client wins)
    IF p_resolution = 'refund_approved' THEN
        -- Update cancellation record
        UPDATE job_cancellations
        SET status = 'refund_approved',
            resolved_at = now(),
            resolved_by = p_admin_id
        WHERE id = p_cancellation_id;

        -- Update job status to canceled (Logic in app or DB trigger handles the balance refund)
        UPDATE jobs
        SET status = 'canceled',
            updated_at = now()
        WHERE id = v_job_id;

        RETURN jsonb_build_object('success', true, 'message', 'Reembolso aprobado y trabajo cancelado');

    -- 2. Handle Fraud Rejected (Freelancer wins, Client penalized)
    ELSIF p_resolution = 'fraud_rejected' THEN
        -- Update cancellation record
        UPDATE job_cancellations
        SET status = 'fraud_rejected',
            resolved_at = now(),
            resolved_by = p_admin_id
        WHERE id = p_cancellation_id;

        -- Block the client
        UPDATE profiles
        SET is_blocked = true
        WHERE id = v_client_id;

        -- Complete the job to release funds to the freelancer
        UPDATE jobs
        SET status = 'completed',
            completed_at = now(),
            updated_at = now()
        WHERE id = v_job_id;

        RETURN jsonb_build_object('success', true, 'message', 'Fraude detectado: Cliente bloqueado y fondos liberados al freelancer');
    
    ELSE
        RETURN jsonb_build_object('success', false, 'message', 'Resolución no válida');
    END IF;
END;
$$;
