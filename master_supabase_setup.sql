-- ============================================================
-- COOPLANCE - MASTER INITIAL DATABASE SETUP (V24)
-- This script contains ALL tables, triggers, and RLS policies.
-- Run this in the Supabase SQL Editor of your NEW project.
-- ============================================================

-- 0. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USER PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    first_name TEXT,
    last_name TEXT,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'freelancer',
    level INTEGER NOT NULL DEFAULT 1,
    avatar_url TEXT,
    bio TEXT,
    points INTEGER NOT NULL DEFAULT 0,
    xp INTEGER NOT NULL DEFAULT 0,
    gender TEXT,
    company_name TEXT,
    responsible_name TEXT,
    location TEXT,
    country TEXT,
    dob DATE,
    phone TEXT,
    dni TEXT,
    vacancies INTEGER DEFAULT 0,
    work_hours TEXT,
    payment_methods TEXT,
    cv_url TEXT,
    province TEXT,
    city TEXT,
    cuil_cuit TEXT, -- For companies
    terms_accepted_at TIMESTAMPTZ,
    is_verified BOOLEAN DEFAULT FALSE,
    verification_status TEXT DEFAULT 'pending', -- 'pending', 'verified', 'rejected'
    gamification JSONB DEFAULT '{"badges": [], "vacation": {"active": false, "credits": 4}}',
    deleted_at TIMESTAMPTZ, -- Soft delete support
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by everyone." ON public.profiles FOR SELECT USING (deleted_at IS NULL);
CREATE POLICY "Users can update their own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 2. PROJECTS (OFERTAS)
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,
    subcategories TEXT[],
    budget_type TEXT DEFAULT 'fixed',
    budget NUMERIC DEFAULT 0,
    deadline TIMESTAMPTZ,
    client_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    status TEXT DEFAULT 'open', -- 'open', 'in_progress', 'completed', 'cancelled'
    work_mode TEXT[] DEFAULT '{remote}',
    country TEXT,
    province TEXT[],
    city TEXT[],
    payment_methods JSONB,
    payment_frequency TEXT DEFAULT 'fixed', -- 'fixed', 'milestone', 'weekly', 'monthly'
    contract_duration TEXT,
    faqs JSONB,
    questions JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Projects are viewable by everyone" ON public.projects FOR SELECT USING (true);
CREATE POLICY "Users can create projects" ON public.projects FOR INSERT WITH CHECK (auth.uid() = client_id);
CREATE POLICY "Clients can update their own projects" ON public.projects FOR UPDATE USING (auth.uid() = client_id);

-- 3. PROPOSALS (POSTULACIONES)
CREATE TABLE IF NOT EXISTS public.proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    freelancer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    user_name TEXT,
    user_role TEXT,
    amount NUMERIC(12,2) NOT NULL,
    delivery_days INTEGER,
    cover_letter TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'canceled', 'completed')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Proposals are viewable by participants" ON public.proposals
    FOR SELECT USING (auth.uid() = freelancer_id OR EXISTS (
        SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.client_id = auth.uid()
    ));
CREATE POLICY "Freelancers can insert proposals" ON public.proposals FOR INSERT WITH CHECK (auth.uid() = freelancer_id);
CREATE POLICY "Participants can update proposal status" ON public.proposals FOR UPDATE USING (auth.uid() = freelancer_id OR EXISTS (
    SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.client_id = auth.uid()
));

-- 4. TEAMS / COOPS
CREATE TABLE IF NOT EXISTS public.teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    founder_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    avatar_url TEXT,
    categories JSONB,
    tags TEXT[],
    status TEXT DEFAULT 'active',
    internal_rules TEXT,
    distribution_config JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teams are viewable by everyone" ON public.teams FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create teams" ON public.teams FOR INSERT WITH CHECK (auth.uid() = founder_id);

CREATE TABLE IF NOT EXISTS public.team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member', -- 'owner', 'member'
    status TEXT DEFAULT 'pending',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(team_id, user_id)
);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team members are public" ON public.team_members FOR SELECT USING (true);
CREATE POLICY "Users manage their own team membership" ON public.team_members FOR UPDATE USING (auth.uid() = user_id);

-- 5. SERVICES
CREATE TABLE IF NOT EXISTS public.services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,
    subcategory TEXT,
    price NUMERIC,
    delivery_time INTEGER,
    revisions INTEGER,
    image_url TEXT,
    video_url TEXT,
    tags TEXT[],
    work_mode TEXT[],
    active BOOLEAN DEFAULT TRUE,
    config JSONB, -- JSONB for flexible attributes (packages, faqs, etc)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Services are public" ON public.services FOR SELECT USING (true);
CREATE POLICY "Users manage their own services" ON public.services FOR ALL USING (auth.uid() = owner_id);

-- 6. JOBS (CONTRACTS)
CREATE TABLE IF NOT EXISTS public.jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    client_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    provider_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'active', -- 'active', 'delivered', 'pending_approval', 'completed', 'canceled'
    delivery_result TEXT,
    amount NUMERIC NOT NULL,
    payment_method TEXT,
    deadline TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can see their own jobs" ON public.jobs FOR SELECT USING (auth.uid() = client_id OR auth.uid() = provider_id);
CREATE POLICY "Participants can manage jobs" ON public.jobs FOR ALL USING (auth.uid() = client_id OR auth.uid() = provider_id);

-- 7. CHAT SYSTEM (Stable Participation Model)
CREATE TABLE IF NOT EXISTS public.chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT DEFAULT 'direct', -- 'direct', 'project', 'order'
    context_id UUID,
    context_title TEXT,
    last_message TEXT,
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.chat_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    UNIQUE(chat_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID REFERENCES public.chats(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    attachments JSONB DEFAULT '[]',
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see chats they are in" ON public.chats FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.chat_participants WHERE chat_id = public.chats.id AND user_id = auth.uid())
);
CREATE POLICY "Participants can see messages" ON public.messages FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.chat_participants WHERE chat_id = public.messages.chat_id AND user_id = auth.uid())
);
CREATE POLICY "Participants can send messages" ON public.messages FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.chat_participants WHERE chat_id = public.messages.chat_id AND user_id = auth.uid())
);

-- 8. NOTIFICATIONS & WALLET
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL,
    title TEXT,
    content TEXT NOT NULL,
    link TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT CHECK (type IN ('income', 'expense', 'withdrawal', 'deposit')),
    amount NUMERIC(12,2) NOT NULL,
    method TEXT,
    description TEXT,
    related_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see their own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update their own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see their own transactions" ON public.transactions FOR SELECT USING (auth.uid() = user_id);

-- 9. REVIEWS (Reputation System)
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
    reviewer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    target_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT CHECK (role IN ('client', 'provider')), -- Role of the target in this context
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reviews are public" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Users can create reviews for their jobs" ON public.reviews FOR INSERT WITH CHECK (
    auth.uid() = reviewer_id AND EXISTS (
        SELECT 1 FROM public.jobs j WHERE j.id = job_id AND (j.client_id = auth.uid() OR j.provider_id = auth.uid())
    )
);

-- 10. TRIGGERS & LOGIC

-- A. Automated Profile Creation (Hardened V23 Logic)
CREATE OR REPLACE FUNCTION public.handle_user_confirmation()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.email_confirmed_at IS NOT NULL) AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
        INSERT INTO public.profiles (
            id, username, email, role,
            first_name, last_name, avatar_url,
            location, country, dob, phone,
            gender, company_name, responsible_name, bio,
            dni, vacancies, work_hours, payment_methods, cv_url, province, city,
            cuil_cuit, terms_accepted_at
        )
        VALUES (
            NEW.id,
            COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1)),
            NEW.email,
            COALESCE(NEW.raw_user_meta_data->>'role', 'freelancer'),
            COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
            COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
            NEW.raw_user_meta_data->>'avatar_url',
            NEW.raw_user_meta_data->>'location',
            NEW.raw_user_meta_data->>'country',
            (NEW.raw_user_meta_data->>'dob')::DATE,
            NEW.raw_user_meta_data->>'phone',
            NEW.raw_user_meta_data->>'gender',
            NEW.raw_user_meta_data->>'company_name',
            NEW.raw_user_meta_data->>'responsible_name',
            COALESCE(NEW.raw_user_meta_data->>'bio', ''),
            NEW.raw_user_meta_data->>'dni',
            (COALESCE(NEW.raw_user_meta_data->>'vacancies', '0'))::INTEGER,
            NEW.raw_user_meta_data->>'work_hours',
            NEW.raw_user_meta_data->>'payment_methods',
            NEW.raw_user_meta_data->>'cv_url',
            NEW.raw_user_meta_data->>'province',
            NEW.raw_user_meta_data->>'city',
            NEW.raw_user_meta_data->>'cuil_cuit',
            CASE WHEN (NEW.raw_user_meta_data->>'terms_accepted')::BOOLEAN THEN NOW() ELSE NULL END
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE PROCEDURE public.handle_user_confirmation();
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated AFTER UPDATE ON auth.users FOR EACH ROW EXECUTE PROCEDURE public.handle_user_confirmation();

-- B. Account Deletion Protection (V22 Soft Delete Shield)
CREATE OR REPLACE FUNCTION public.protect_critical_profiles()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.role = 'admin' THEN
        RAISE EXCEPTION 'No se pueden eliminar cuentas de administrador desde el cliente.';
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER shield_critical_profiles
BEFORE DELETE ON public.profiles
FOR EACH ROW EXECUTE PROCEDURE public.protect_critical_profiles();
