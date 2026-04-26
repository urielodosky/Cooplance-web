-- Migration v47: Robust Escrow and Job Lifecycle
-- Implementation of the Escrow simulation and delivery tracking

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS escrow_amount NUMERIC DEFAULT 0;

-- Update status constraint to include all required states for the new Escrow machine
-- We use a soft approach to not break existing data if possible, but ensuring the new states are valid.
DO $$ 
BEGIN 
    ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_status_check;
    ALTER TABLE jobs ADD CONSTRAINT jobs_status_check CHECK (status IN ('open', 'pending_approval', 'active', 'delivered', 'completed', 'canceled', 'rejected', 'disputed'));
EXCEPTION
    WHEN OTHERS THEN 
        RAISE NOTICE 'Could not update status constraint, it might not exist or have a different name.';
END $$;

COMMENT ON COLUMN jobs.delivered_at IS 'Timestamp when the freelancer submitted the work.';
COMMENT ON COLUMN jobs.escrow_amount IS 'Amount currently held in escrow for this job.';
