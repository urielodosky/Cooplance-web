-- ============================================================
-- MIGRATION V42: AUTOMATED TRANSACTION TRIGGER
-- ============================================================
-- This trigger automatically records income and expense transactions
-- when a job is marked as 'completed'. This bypasses RLS issues
-- where a client cannot insert a transaction for a freelancer.

-- 1. Create the function to handle job completion
CREATE OR REPLACE FUNCTION public.handle_job_completion_transactions()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if status changed to 'completed'
    IF (NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status <> 'completed')) THEN
        
        -- A. Insert Income for Provider
        INSERT INTO public.transactions (
            user_id,
            type,
            amount,
            method,
            description,
            related_id,
            created_at
        ) VALUES (
            NEW.provider_id,
            'income',
            NEW.amount,
            COALESCE(NEW.payment_method, 'platform'),
            'Servicio completado: ' || COALESCE(NEW.service_title, 'Sin título'),
            NEW.id,
            now()
        );

        -- B. Insert Expense for Client
        INSERT INTO public.transactions (
            user_id,
            type,
            amount,
            method,
            description,
            related_id,
            created_at
        ) VALUES (
            NEW.client_id,
            'expense',
            NEW.amount,
            COALESCE(NEW.payment_method, 'platform'),
            'Pago por servicio: ' || COALESCE(NEW.service_title, 'Sin título'),
            NEW.id,
            now()
        );

        RAISE NOTICE 'Transactions automatically created for job %', NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create the trigger on jobs table
DROP TRIGGER IF EXISTS trigger_job_completion_transactions ON public.jobs;
CREATE TRIGGER trigger_job_completion_transactions
AFTER UPDATE ON public.jobs
FOR EACH ROW
EXECUTE FUNCTION public.handle_job_completion_transactions();

-- 3. Update existing completed jobs that might be missing transactions (Optional/Manual)
-- This logic is only for the trigger moving forward.
