-- ROLLBACK Phase 11: Restore policies to previous state
-- Run this if the v67 migration caused issues.

-- 1. Restore coop_members SELECT policy
DROP POLICY IF EXISTS "Team members are public" ON public.coop_members;
DROP POLICY IF EXISTS "Coop members are viewable by everyone" ON public.coop_members;
CREATE POLICY "Coop members are viewable by everyone" ON public.coop_members
    FOR SELECT USING (true);

-- 2. Restore coop_members INSERT policy
DROP POLICY IF EXISTS "Users can apply to coops" ON public.coop_members;
DROP POLICY IF EXISTS "System/Owners can add members" ON public.coop_members;
CREATE POLICY "System/Owners can add members" ON public.coop_members
    FOR INSERT WITH CHECK (true);

-- 3. Restore coop_members UPDATE policy
DROP POLICY IF EXISTS "Admins can manage memberships" ON public.coop_members;
DROP POLICY IF EXISTS "Members can update their own status" ON public.coop_members;
CREATE POLICY "Members can update their own status" ON public.coop_members
    FOR UPDATE
    USING (user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM coop_members cm
        WHERE cm.coop_id = coop_members.coop_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('owner', 'admin')
    ));

-- 4. Restore coop_channels SELECT policy
DROP POLICY IF EXISTS "Coop members can see general and their direct channels" ON coop_channels;
CREATE POLICY "Coop members can see general and their direct channels" ON coop_channels
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM coop_members 
            WHERE coop_id = coop_channels.coop_id 
            AND user_id = auth.uid()
        ) AND (
            type = 'general' OR 
            (type = 'direct' AND auth.uid() = ANY(member_ids))
        )
    );
