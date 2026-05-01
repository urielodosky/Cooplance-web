-- Migration: v70_rls_consolidation_and_optimization
-- Description: Consolidates redundant RLS policies and optimizes performance using (select auth.uid())

BEGIN;

-- ============================================================
-- 1. PROFILES
-- ============================================================
DROP POLICY IF EXISTS "Profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile." ON public.profiles;

CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (deleted_at IS NULL);
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE USING ((select auth.uid()) = id);

-- ============================================================
-- 2. PROJECTS
-- ============================================================
DROP POLICY IF EXISTS "Projects are viewable by everyone" ON public.projects;
DROP POLICY IF EXISTS "Users can create projects" ON public.projects;
DROP POLICY IF EXISTS "Clients can update their own projects" ON public.projects;
DROP POLICY IF EXISTS "Clients can delete their own projects" ON public.projects;

CREATE POLICY "projects_select" ON public.projects FOR SELECT USING (true);
CREATE POLICY "projects_insert" ON public.projects FOR INSERT WITH CHECK ((select auth.uid()) = client_id);
CREATE POLICY "projects_update" ON public.projects FOR UPDATE USING ((select auth.uid()) = client_id);
CREATE POLICY "projects_delete" ON public.projects FOR DELETE USING ((select auth.uid()) = client_id);

-- ============================================================
-- 3. PROPOSALS
-- ============================================================
DROP POLICY IF EXISTS "Proposals are viewable by participants" ON public.proposals;
DROP POLICY IF EXISTS "Freelancers can insert proposals" ON public.proposals;
DROP POLICY IF EXISTS "Participants can update proposal status" ON public.proposals;
DROP POLICY IF EXISTS "Auth insert proposals" ON public.proposals;
DROP POLICY IF EXISTS "Public select proposals" ON public.proposals;
DROP POLICY IF EXISTS "Freelancers and team owners can insert proposals" ON public.proposals;

CREATE POLICY "proposals_select" ON public.proposals
    FOR SELECT USING (
        (select auth.uid()) = freelancer_id 
        OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = public.proposals.project_id AND p.client_id = (select auth.uid()))
        OR (public.proposals.coop_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.coop_members tm WHERE tm.coop_id = public.proposals.coop_id AND tm.user_id = (select auth.uid())))
    );

CREATE POLICY "proposals_insert" ON public.proposals
    FOR INSERT WITH CHECK (
        (select auth.uid()) = freelancer_id 
        OR (public.proposals.coop_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.coop_members tm WHERE tm.coop_id = public.proposals.coop_id AND tm.user_id = (select auth.uid()) AND tm.role IN ('owner', 'admin')))
    );

CREATE POLICY "proposals_update" ON public.proposals
    FOR UPDATE USING (
        (select auth.uid()) = freelancer_id 
        OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = public.proposals.project_id AND p.client_id = (select auth.uid()))
        OR (public.proposals.coop_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.coop_members tm WHERE tm.coop_id = public.proposals.coop_id AND tm.user_id = (select auth.uid()) AND tm.role IN ('owner', 'admin')))
    );

-- ============================================================
-- 4. COOPS & COOP_MEMBERS
-- ============================================================

-- Coops
DROP POLICY IF EXISTS "Coops are viewable by everyone" ON public.coops;
DROP POLICY IF EXISTS "Coops son visibles para todos" ON public.coops;
DROP POLICY IF EXISTS "Public read access for coops" ON public.coops;
DROP POLICY IF EXISTS "Authenticated users can create coops" ON public.coops;
DROP POLICY IF EXISTS "Only owners and admins can update coop" ON public.coops;
DROP POLICY IF EXISTS "Owners and admins can update their coop" ON public.coops;
DROP POLICY IF EXISTS "Solo fundadores pueden editar la Coop" ON public.coops;

CREATE POLICY "coops_select" ON public.coops FOR SELECT USING (true);
CREATE POLICY "coops_insert" ON public.coops FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);
CREATE POLICY "coops_update" ON public.coops FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.coop_members WHERE coop_id = public.coops.id AND user_id = (select auth.uid()) AND role IN ('owner', 'admin'))
);

-- Coop Members
DROP POLICY IF EXISTS "Team members are public" ON public.coop_members;
DROP POLICY IF EXISTS "Owners can see applications" ON public.coop_members;
DROP POLICY IF EXISTS "Public read access for members" ON public.coop_members;
DROP POLICY IF EXISTS "Miembros son visibles para todos" ON public.coop_members;
DROP POLICY IF EXISTS "Owners can manage memberships" ON public.coop_members;
DROP POLICY IF EXISTS "Members can update their own status" ON public.coop_members;
DROP POLICY IF EXISTS "Members can accept rules" ON public.coop_members;
DROP POLICY IF EXISTS "Users can apply to coops" ON public.coop_members;
DROP POLICY IF EXISTS "System/Owners can add members" ON public.coop_members;
DROP POLICY IF EXISTS "Users can update their own member record" ON public.coop_members;
DROP POLICY IF EXISTS "Members and Admins can delete coop_members" ON public.coop_members;
DROP POLICY IF EXISTS "Coop members are viewable by everyone" ON public.coop_members;

-- HELPER FUNCTIONS TO BREAK RLS RECURSION
-- These are SECURITY DEFINER to bypass RLS and avoid infinite loops

CREATE OR REPLACE FUNCTION public.check_user_is_coop_member(p_coop_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.coop_members 
        WHERE coop_id = p_coop_id AND user_id = p_user_id AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.check_user_is_coop_admin(p_coop_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.coop_members 
        WHERE coop_id = p_coop_id AND user_id = p_user_id AND role IN ('owner', 'admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.check_user_in_chat(p_chat_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.chat_participants 
        WHERE chat_id = p_chat_id AND user_id = p_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. COOP MEMBERS (Standardized)
ALTER TABLE public.coop_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "coop_members_select" ON public.coop_members;
CREATE POLICY "coop_members_select" ON public.coop_members
    FOR SELECT USING (
        status = 'active' 
        OR user_id = (select auth.uid()) 
        -- Use the helper to check if the current user is an admin of this coop
        OR public.check_user_is_coop_admin(coop_id, (select auth.uid()))
    );

DROP POLICY IF EXISTS "coop_members_insert" ON public.coop_members;
CREATE POLICY "coop_members_insert" ON public.coop_members
    FOR INSERT WITH CHECK (
        -- Founders can always add members to their coops
        EXISTS (SELECT 1 FROM public.coops WHERE id = coop_id AND founder_id = (select auth.uid()))
        -- Or admins can invite
        OR public.check_user_is_coop_admin(coop_id, (select auth.uid()))
    );

DROP POLICY IF EXISTS "coop_members_all" ON public.coop_members;
CREATE POLICY "coop_members_all" ON public.coop_members
    FOR ALL USING (
        user_id = (select auth.uid()) 
        OR public.check_user_is_coop_admin(coop_id, (select auth.uid()))
    );

-- 9. CHATS
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "chats_select" ON public.chats;
CREATE POLICY "chats_select" ON public.chats
    FOR SELECT USING (
        public.check_user_in_chat(id, (select auth.uid()))
    );

DROP POLICY IF EXISTS "chats_insert" ON public.chats;
CREATE POLICY "chats_insert" ON public.chats
    FOR INSERT WITH CHECK (true);

-- 10. CHAT PARTICIPANTS
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "chat_participants_access" ON public.chat_participants;
CREATE POLICY "chat_participants_access" ON public.chat_participants
    FOR ALL USING (
        user_id = (select auth.uid()) 
        OR public.check_user_in_chat(chat_id, (select auth.uid()))
    );

-- ============================================================
-- 5. CHAT SYSTEM (CHATS, PARTICIPANTS, MESSAGES)
-- ============================================================

-- Messages
DROP POLICY IF EXISTS "Participants can see messages" ON public.messages;
DROP POLICY IF EXISTS "Participants can send messages" ON public.messages;
DROP POLICY IF EXISTS "messages_select_v2" ON public.messages;
DROP POLICY IF EXISTS "messages_insert_v2" ON public.messages;
DROP POLICY IF EXISTS "Usuarios pueden ver mensajes" ON public.messages;
DROP POLICY IF EXISTS "Usuarios pueden insertar mensajes" ON public.messages;

CREATE POLICY "messages_select" ON public.messages
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.chat_participants WHERE chat_id = public.messages.chat_id AND user_id = (select auth.uid()))
    );

CREATE POLICY "messages_insert" ON public.messages
    FOR INSERT WITH CHECK (
        (select auth.uid()) = sender_id 
        AND EXISTS (SELECT 1 FROM public.chat_participants WHERE chat_id = public.messages.chat_id AND user_id = (select auth.uid()))
    );

-- ============================================================
-- 6. COOP INTERNAL CHAT
-- ============================================================

-- Coop Channels
DROP POLICY IF EXISTS "Coop members can see general and their direct channels" ON public.coop_channels;
DROP POLICY IF EXISTS "Coop members can see channels they belong to" ON public.coop_channels;
DROP POLICY IF EXISTS "Coop members can see project channels they are assigned to" ON public.coop_channels;
DROP POLICY IF EXISTS "Owners and admins can create channels" ON public.coop_channels;
DROP POLICY IF EXISTS "Owners and admins can update channels" ON public.coop_channels;

CREATE POLICY "coop_channels_select" ON public.coop_channels
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.coop_members 
            WHERE coop_id = public.coop_channels.coop_id 
            AND user_id = (select auth.uid())
            AND status = 'active'
            AND (accepted_rules_at IS NOT NULL OR type = 'general')
        ) AND (
            type IN ('general', 'project') OR 
            (type IN ('direct', 'extra') AND (select auth.uid()) = ANY(member_ids))
        )
    );

CREATE POLICY "coop_channels_manage" ON public.coop_channels
    FOR ALL WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.coop_members
            WHERE coop_id = public.coop_channels.coop_id
            AND user_id = (select auth.uid())
            AND role IN ('owner', 'admin')
        )
    );

-- Coop Messages
DROP POLICY IF EXISTS "Users can send messages to channels they have access to" ON public.coop_messages;

CREATE POLICY "coop_messages_select" ON public.coop_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.coop_channels 
            WHERE id = public.coop_messages.channel_id
        )
    );

CREATE POLICY "coop_messages_insert" ON public.coop_messages
    FOR INSERT WITH CHECK (
        sender_id = (select auth.uid()) 
        AND EXISTS (
            SELECT 1 FROM public.coop_channels 
            WHERE id = public.coop_messages.channel_id
        )
    );

-- ============================================================
-- 7. SERVICES & JOBS
-- ============================================================

-- Services
DROP POLICY IF EXISTS "Services are public" ON public.services;
DROP POLICY IF EXISTS "Users manage their own services" ON public.services;

CREATE POLICY "services_select" ON public.services FOR SELECT USING (true);
CREATE POLICY "services_manage" ON public.services FOR ALL USING ((select auth.uid()) = owner_id);

-- Jobs
DROP POLICY IF EXISTS "Users can see their own jobs" ON public.jobs;
DROP POLICY IF EXISTS "Participants can manage jobs" ON public.jobs;
DROP POLICY IF EXISTS "jobs_select" ON public.jobs;
CREATE POLICY "jobs_select" ON public.jobs 
    FOR SELECT USING (
        (select auth.uid()) = client_id 
        OR (select auth.uid()) = provider_id 
        OR (coop_id IS NOT NULL AND public.check_user_is_coop_member(coop_id, (select auth.uid())))
    );

CREATE POLICY "jobs_update" ON public.jobs 
    FOR UPDATE USING ((select auth.uid()) = client_id OR (select auth.uid()) = provider_id);

-- ============================================================
-- 8. WALLET & TRANSACTIONS
-- ============================================================

-- Transactions
DROP POLICY IF EXISTS "Users see their own transactions" ON public.transactions;
CREATE POLICY "transactions_select" ON public.transactions FOR SELECT USING ((select auth.uid()) = user_id);

-- ============================================================
-- 9. NOTIFICATIONS
-- ============================================================
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users see their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users update their own notifications" ON public.notifications;

CREATE POLICY "notifications_all" ON public.notifications FOR ALL USING ((select auth.uid()) = user_id);

-- ============================================================
-- 10. REVIEWS & CANCELLATIONS
-- ============================================================

-- Reviews
DROP POLICY IF EXISTS "Reviews are public" ON public.reviews;
DROP POLICY IF EXISTS "Users can create reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can create reviews for their jobs" ON public.reviews;
DROP POLICY IF EXISTS "Reviews are public." ON public.service_reviews;
DROP POLICY IF EXISTS "Users can create reviews for their jobs." ON public.service_reviews;
DROP POLICY IF EXISTS "Users can update their own reviews." ON public.service_reviews;

CREATE POLICY "reviews_select" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "reviews_insert" ON public.reviews FOR INSERT WITH CHECK (
    (select auth.uid()) = reviewer_id 
    AND EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND (j.client_id = (select auth.uid()) OR j.provider_id = (select auth.uid())))
);

CREATE POLICY "service_reviews_select" ON public.service_reviews FOR SELECT USING (true);
CREATE POLICY "service_reviews_insert" ON public.service_reviews FOR INSERT WITH CHECK (
    (select auth.uid()) = reviewer_id 
    AND EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND (j.client_id = (select auth.uid()) OR j.provider_id = (select auth.uid())))
);
CREATE POLICY "service_reviews_update" ON public.service_reviews FOR UPDATE USING ((select auth.uid()) = reviewer_id);

-- Job Cancellations
DROP POLICY IF EXISTS "Usuarios pueden ver sus propias cancelaciones o de sus trabajos" ON public.job_cancellations;
DROP POLICY IF EXISTS "Clientes pueden solicitar cancelaciones" ON public.job_cancellations;

CREATE POLICY "job_cancellations_select" ON public.job_cancellations
    FOR SELECT USING (
        (select auth.uid()) = cancelled_by OR (select auth.uid()) IN (SELECT provider_id FROM public.jobs WHERE id = job_id)
    );

CREATE POLICY "job_cancellations_insert" ON public.job_cancellations
    FOR INSERT WITH CHECK (
        (select auth.uid()) = cancelled_by AND (select auth.uid()) IN (SELECT client_id FROM public.jobs WHERE id = job_id)
    );

-- Job Payouts
DROP POLICY IF EXISTS "Managers can see all project payouts" ON public.job_payouts;
DROP POLICY IF EXISTS "Users can see their own payouts" ON public.job_payouts;
CREATE POLICY "job_payouts_select" ON public.job_payouts FOR SELECT USING ((select auth.uid()) = user_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = (select auth.uid()) AND role = 'admin'));

-- Reports
DROP POLICY IF EXISTS "Users can insert their own reports" ON public.reports;
DROP POLICY IF EXISTS "Users can create reports" ON public.reports;
DROP POLICY IF EXISTS "Users can see their own reports" ON public.reports;
CREATE POLICY "reports_all" ON public.reports FOR ALL USING ((select auth.uid()) = reporter_id);

-- User Blocks
DROP POLICY IF EXISTS "Users can insert their own blocks" ON public.user_blocks;
DROP POLICY IF EXISTS "Users can see their own blocks" ON public.user_blocks;
DROP POLICY IF EXISTS "Users can delete their own blocks" ON public.user_blocks;
CREATE POLICY "user_blocks_all" ON public.user_blocks FOR ALL USING ((select auth.uid()) = blocker_id);

-- ============================================================
-- 11. EXPULSION LOGS
-- ============================================================

-- Expulsion Logs
DROP POLICY IF EXISTS "Coop members can see expulsion logs" ON public.coop_expulsion_logs;
CREATE POLICY "coop_expulsion_logs_select" ON public.coop_expulsion_logs FOR SELECT USING (EXISTS (SELECT 1 FROM public.coop_members WHERE coop_id = public.coop_expulsion_logs.coop_id AND user_id = (select auth.uid())));

COMMIT;
