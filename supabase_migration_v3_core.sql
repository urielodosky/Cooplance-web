-- ============================================================
-- COOPLANCE - MIGRATION V3: CORE ENTITIES (Projects, Teams, Jobs, Notifications)
-- Run this in the Supabase SQL Editor
-- ============================================================

-- 1. PROJECTS TABLE
CREATE TABLE IF NOT EXISTS public.projects (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text,
    category text,
    subcategories text[],
    budget_type text DEFAULT 'fixed',
    budget numeric DEFAULT 0,
    deadline timestamptz,
    execution_time integer,
    image_url text,
    video_url text,
    client_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    client_name text,
    client_avatar text,
    client_role text,
    vacancies integer DEFAULT 1,
    status text DEFAULT 'open', -- 'open', 'in_progress', 'completed', 'cancelled'
    work_mode text[] DEFAULT '{remote}',
    country text,
    province text[],
    city text[],
    location text,
    payment_methods jsonb,
    faqs jsonb,
    questions jsonb,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Projects are viewable by everyone" ON public.projects;
CREATE POLICY "Projects are viewable by everyone" ON public.projects FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create projects" ON public.projects;
CREATE POLICY "Users can create projects" ON public.projects FOR INSERT WITH CHECK (auth.uid() = client_id);

DROP POLICY IF EXISTS "Clients can update their own projects" ON public.projects;
CREATE POLICY "Clients can update their own projects" ON public.projects FOR UPDATE USING (auth.uid() = client_id);

DROP POLICY IF EXISTS "Clients can delete their own projects" ON public.projects;
CREATE POLICY "Clients can delete their own projects" ON public.projects FOR DELETE USING (auth.uid() = client_id);


-- 2. JOBS (CONTRACTS) TABLE ENHANCEMENTS
-- Ensure jobs table has all necessary columns for Supabase synchronization
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS amount numeric;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS currency text DEFAULT 'ARS';
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id);
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS service_id uuid REFERENCES public.services(id);
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();


-- 3. TEAMS (COOPS) & TEAM MEMBERS
CREATE TABLE IF NOT EXISTS public.teams (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text UNIQUE NOT NULL,
    description text,
    founder_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    avatar_url text,
    status text DEFAULT 'active', -- 'active', 'inactive', 'dissolved'
    stats jsonb DEFAULT '{"totalProjects": 0, "avgRating": 0}',
    internal_rules text,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.team_members (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    role text DEFAULT 'member', -- 'owner', 'admin', 'member', 'service_manager'
    status text DEFAULT 'pending', -- 'pending', 'active', 'left'
    joined_at timestamptz DEFAULT now(),
    left_at timestamptz,
    UNIQUE(team_id, user_id)
);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Team Policies
DROP POLICY IF EXISTS "Teams are viewable by everyone" ON public.teams;
CREATE POLICY "Teams are viewable by everyone" ON public.teams FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can create teams" ON public.teams;
CREATE POLICY "Authenticated users can create teams" ON public.teams FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Team Members Policies
DROP POLICY IF EXISTS "Everyone can see team members" ON public.team_members;
CREATE POLICY "Everyone can see team members" ON public.team_members FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage their responses to team invites" ON public.team_members;
CREATE POLICY "Users can manage their responses to team invites" ON public.team_members FOR UPDATE USING (auth.uid() = user_id);


-- 4. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    type text NOT NULL, -- 'system', 'message', 'job', 'team'
    title text,
    content text NOT NULL,
    link text,
    is_read boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can see their own notifications" ON public.notifications;
CREATE POLICY "Users can see their own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can mark notifications as read" ON public.notifications;
CREATE POLICY "Users can mark notifications as read" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
