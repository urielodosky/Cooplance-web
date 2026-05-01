-- FINAL Phase 11: Coop Recruitment, Rules & Governance
-- This script safely enables the postulation system and the rule acceptance gate.

-- 1. Ensure coop_members table has all necessary columns
ALTER TABLE public.coop_members ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.coop_members ADD COLUMN IF NOT EXISTS application_message TEXT;
ALTER TABLE public.coop_members ADD COLUMN IF NOT EXISTS joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.coop_members ADD COLUMN IF NOT EXISTS accepted_rules_at TIMESTAMP WITH TIME ZONE;

-- 2. Standardize existing members to 'active' if status was NULL
UPDATE public.coop_members SET status = 'active' WHERE status IS NULL;

-- 3. RLS: Public visibility of members (filtering out non-active ones)
DROP POLICY IF EXISTS "Team members are public" ON public.coop_members;
DROP POLICY IF EXISTS "Coop members are viewable by everyone" ON public.coop_members;
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

-- 4. RLS: Allow users to apply (Insert pending_application)
DROP POLICY IF EXISTS "Users can apply to coops" ON public.coop_members;
CREATE POLICY "Users can apply to coops" ON public.coop_members
    FOR INSERT
    WITH CHECK (
        auth.uid() = user_id 
        AND status = 'pending_application'
    );

-- 5. RLS: Allow admins to manage memberships (Accept/Reject)
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

-- 6. RLS: Rule Acceptance Gate for Internal Chats
-- Only active members who have accepted rules can see internal channels
DROP POLICY IF EXISTS "Coop members can see general and their direct channels" ON coop_channels;
CREATE POLICY "Coop members can see general and their direct channels" ON coop_channels
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM coop_members 
            WHERE coop_id = coop_channels.coop_id 
            AND user_id = auth.uid()
            AND status = 'active'
            AND accepted_rules_at IS NOT NULL
        ) AND (
            type = 'general' OR 
            (type = 'direct' AND auth.uid() = ANY(member_ids))
        )
    );
