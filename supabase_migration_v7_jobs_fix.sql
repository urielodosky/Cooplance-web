-- ============================================================
-- COOPLANCE - MIGRATION V7: JOBS & TRANSACTIONS FIX
-- ============================================================

-- 1. FIX JOBS TABLE (Ensuring all frontend columns exist)
DO $$ 
BEGIN
    -- Check if table exists, create if not
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'jobs') THEN
        CREATE TABLE public.jobs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            client_id UUID REFERENCES public.profiles(id),
            provider_id UUID REFERENCES public.profiles(id),
            service_id UUID REFERENCES public.services(id),
            project_id UUID REFERENCES public.projects(id),
            service_title TEXT,
            amount NUMERIC DEFAULT 0,
            tier TEXT DEFAULT 'Standard',
            status TEXT DEFAULT 'pending_approval',
            duration INTEGER,
            deadline TIMESTAMPTZ,
            buyer_name TEXT,
            buyer_role TEXT,
            booking_date DATE,
            booking_time TEXT,
            delivery_result TEXT,
            completed_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT now()
        );
    ELSE
        -- Table exists, add missing columns one by one
        ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id);
        ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS service_title TEXT;
        ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS buyer_name TEXT;
        ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS buyer_role TEXT;
        ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS booking_date DATE;
        ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS booking_time TEXT;
        ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS delivery_result TEXT;
        ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
        ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'Standard';
        ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS duration INTEGER;
    END IF;
END $$;

-- 2. ENSURE TRANSACTIONS TABLE EXISTS
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'income', 'expense'
    amount NUMERIC NOT NULL,
    method TEXT,
    description TEXT,
    related_id UUID, -- References jobs.id or similar
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. ENABLE RLS (Security)
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- 4. BASIC POLICIES (Allow users to see their own data)
CREATE POLICY "Users can view their own jobs" ON public.jobs
    FOR SELECT USING (auth.uid() = client_id OR auth.uid() = provider_id);

CREATE POLICY "Clients can create jobs" ON public.jobs
    FOR INSERT WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Users can updates their own jobs" ON public.jobs
    FOR UPDATE USING (auth.uid() = client_id OR auth.uid() = provider_id);

CREATE POLICY "Users can view their own transactions" ON public.transactions
    FOR SELECT USING (auth.uid() = user_id);

-- 5. REFRESH SCHEMA CACHE
-- Note: In Supabase, this happens automatically after running SQL,
-- but sometimes a manual refresh in the "API" settings is needed if 
-- using PostgREST directly from the frontend immediately.
