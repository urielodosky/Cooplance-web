-- Robust Final Migration for Cooplance to Supabase
-- Handles table creation and column addition safely

-- 1. PROPOSALS TABLE
CREATE TABLE IF NOT EXISTS public.proposals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
    freelancer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL,
    duration INTEGER NOT NULL,
    cover_letter TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ensure freelancer_id exists if table was pre-existing
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='proposals' AND column_name='freelancer_id') THEN
        ALTER TABLE public.proposals ADD COLUMN freelancer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 2. TRANSACTIONS TABLE (Wallet)
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'withdrawal', 'deposit')),
    amount DECIMAL(12,2) NOT NULL,
    currency TEXT DEFAULT 'ARS',
    method TEXT NOT NULL,
    status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    description TEXT,
    related_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. USER BADGES TABLE
CREATE TABLE IF NOT EXISTS public.user_badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    badge_key TEXT NOT NULL,
    awarded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, badge_key)
);

-- 4. SERVICE REVIEWS TABLE
CREATE TABLE IF NOT EXISTS public.service_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
    reviewer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    target_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    service_id UUID REFERENCES public.services(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. RLS POLICIES (DROP and RECREATE to be safe)

DROP POLICY IF EXISTS "Proposals are viewable by owner and job owner." ON public.proposals;
CREATE POLICY "Proposals are viewable by owner and job owner." ON public.proposals
    FOR SELECT USING (auth.uid() = freelancer_id OR EXISTS (
        SELECT 1 FROM public.jobs j WHERE j.id = job_id AND j.client_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Freelancers can insert proposals." ON public.proposals;
CREATE POLICY "Freelancers can insert proposals." ON public.proposals
    FOR INSERT WITH CHECK (auth.uid() = freelancer_id);

DROP POLICY IF EXISTS "Users can only see their own transactions." ON public.transactions;
CREATE POLICY "Users can only see their own transactions." ON public.transactions
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Reviews are public." ON public.service_reviews;
CREATE POLICY "Reviews are public." ON public.service_reviews
    FOR SELECT USING (true);

-- 6. Trigger for updated_at (if function exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
        DROP TRIGGER IF EXISTS set_proposals_updated_at ON public.proposals;
        CREATE TRIGGER set_proposals_updated_at
        BEFORE UPDATE ON public.proposals
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;
