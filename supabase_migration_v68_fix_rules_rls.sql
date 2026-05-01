-- Fix for Rule Acceptance Gate
-- This policy allows members to update their own record in coop_members.
-- This is strictly required so they can set 'accepted_rules_at' when they sign the rules.

DROP POLICY IF EXISTS "Members can accept rules" ON public.coop_members;
CREATE POLICY "Members can accept rules" ON public.coop_members
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Note: We trust the frontend for now to only update accepted_rules_at.
-- In a production environment, a trigger should be added to prevent role/status escalation by non-admins.
