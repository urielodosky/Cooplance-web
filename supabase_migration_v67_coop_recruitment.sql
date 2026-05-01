-- Phase 11: Coop Recruitment and Postulation System
-- This script enables freelancers to apply to join a Coop and allows admins to manage these applications.

-- 1. Add application tracking and status columns to coop_members
ALTER TABLE public.coop_members ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.coop_members ADD COLUMN IF NOT EXISTS application_message TEXT;
ALTER TABLE public.coop_members ADD COLUMN IF NOT EXISTS joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. Update status to support different phases
-- Note: status might already exist as 'pending'. 
-- Standardizing on: 'pending_invitation', 'pending_application', 'active', 'rejected', 'left'
-- Existing 'pending' records will be treated as invitations.

-- 3. RLS Update
-- Ensure Owners/Admins can see applications, others can't.
DROP POLICY IF EXISTS "Team members are public" ON public.coop_members;
CREATE POLICY "Team members are public" ON public.coop_members
    FOR SELECT
    USING (
        status = 'active' OR 
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM public.coop_members cm 
            WHERE cm.coop_id = public.coop_members.coop_id 
            AND cm.user_id = auth.uid() 
            AND cm.role IN ('owner', 'admin')
        )
    );

-- Allow users to insert their own application
DROP POLICY IF EXISTS "Users can apply to coops" ON public.coop_members;
CREATE POLICY "Users can apply to coops" ON public.coop_members
    FOR INSERT
    WITH CHECK (
        auth.uid() = user_id 
        AND status = 'pending_application'
    );

-- Allow admins to update status
DROP POLICY IF EXISTS "Admins can manage memberships" ON public.coop_members;
CREATE POLICY "Admins can manage memberships" ON public.coop_members
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.coop_members cm 
            WHERE cm.coop_id = public.coop_members.coop_id 
            AND cm.user_id = auth.uid() 
            AND cm.role IN ('owner', 'admin')
        )
    );

-- 4. Rules Enforcement Policy
-- Ensure members who haven't accepted rules have restricted access to internal channels

DROP POLICY IF EXISTS "Coop members can see general and their direct channels" ON coop_channels;
CREATE POLICY "Coop members can see general and their direct channels" ON coop_channels
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM coop_members 
            WHERE coop_id = coop_channels.coop_id 
            AND user_id = auth.uid()
            AND accepted_rules_at IS NOT NULL
            AND status = 'active'
        ) AND (
            type = 'general' OR 
            (type = 'direct' AND auth.uid() = ANY(member_ids))
        )
    );
