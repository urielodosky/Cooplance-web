-- Phase 5: Economy, Payouts and Anti-Exploitation Rules
-- This script handles the financial distribution logic for Coop projects.

-- 1. Job Payouts Table
CREATE TABLE IF NOT EXISTS job_payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id),
    percentage NUMERIC(5, 2) NOT NULL, -- e.g. 25.50
    amount NUMERIC(12, 2) NOT NULL, -- Calculated amount
    payout_method TEXT CHECK (payout_method IN ('equal', 'level_based', 'manual')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(job_id, user_id)
);

-- 2. RLS for job_payouts
ALTER TABLE job_payouts ENABLE ROW LEVEL SECURITY;

-- Workers only see their own payout
CREATE POLICY "Users can see their own payouts" ON job_payouts
    FOR SELECT
    USING (auth.uid() = user_id);

-- Owners and Admins can see all payouts for their Coop jobs
CREATE POLICY "Managers can see all project payouts" ON job_payouts
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM jobs j
            JOIN coop_members cm ON j.coop_id = cm.coop_id
            WHERE j.id = job_payouts.job_id
            AND cm.user_id = auth.uid()
            AND cm.role IN ('owner', 'admin', 'manager')
        )
    );

-- 3. Robust Payout Assignment Function (with Anti-Exploitation Rules)
CREATE OR REPLACE FUNCTION assign_job_team_and_payouts(
    p_job_id UUID,
    p_project_lead_id UUID,
    p_member_ids UUID[],
    p_percentages NUMERIC[],
    p_method TEXT
)
RETURNS VOID AS $$
DECLARE
    v_total_percentage NUMERIC := 0;
    v_member_percentage NUMERIC;
    v_job_budget NUMERIC;
    v_net_budget NUMERIC;
    v_idx INT;
BEGIN
    -- 1. Basic Validations
    IF array_length(p_member_ids, 1) != array_length(p_percentages, 1) THEN
        RAISE EXCEPTION 'La cantidad de miembros y porcentajes debe coincidir.';
    END IF;

    -- 2. Budget Calculation (12% platform fee)
    SELECT budget INTO v_job_budget FROM jobs WHERE id = p_job_id;
    v_net_budget := v_job_budget * 0.88;

    -- 3. Anti-Exploitation Check
    FOR v_idx IN 1..array_length(p_percentages, 1) LOOP
        v_member_percentage := p_percentages[v_idx];
        
        -- Rule: Min 10% per member
        IF v_member_percentage < 10 THEN
            RAISE EXCEPTION 'Regla Anti-Explotación: Ningún miembro puede recibir menos del 10%% del trabajo.';
        END IF;
        
        v_total_percentage := v_total_percentage + v_member_percentage;
    END LOOP;

    -- Rule: Must sum exactly 100%
    IF v_total_percentage != 100 THEN
        RAISE EXCEPTION 'La suma de porcentajes debe ser exactamente 100%%. Total actual: %', v_total_percentage;
    END IF;

    -- 4. Execute Assignment
    -- Update Job Lead and status
    UPDATE jobs 
    SET project_lead_id = p_project_lead_id, 
        status = 'active' 
    WHERE id = p_job_id;

    -- Clear old data
    DELETE FROM job_participants WHERE job_id = p_job_id;
    DELETE FROM job_payouts WHERE job_id = p_job_id;

    -- Insert new participants
    INSERT INTO job_participants (job_id, user_id)
    SELECT p_job_id, unnest(p_member_ids);

    -- Insert payouts
    FOR v_idx IN 1..array_length(p_member_ids, 1) LOOP
        INSERT INTO job_payouts (job_id, user_id, percentage, amount, payout_method)
        VALUES (
            p_job_id, 
            p_member_ids[v_idx], 
            p_percentages[v_idx], 
            (v_net_budget * p_percentages[v_idx] / 100),
            p_method
        );
    END LOOP;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
