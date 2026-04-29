-- Migration: Add DELETE policy for coop_members
-- This fixes the issue where invitations could not be cancelled or rejected because there was no DELETE policy.

DROP POLICY IF EXISTS "Members and Admins can delete coop_members" ON coop_members;
CREATE POLICY "Members and Admins can delete coop_members" ON coop_members
    FOR DELETE
    USING (
        -- A user can delete their own membership (e.g. rejecting an invite, leaving a coop)
        user_id = auth.uid() 
        OR 
        -- An owner or admin can delete other members (e.g. canceling an invite)
        EXISTS (
            SELECT 1 FROM coop_members cm
            WHERE cm.coop_id = coop_members.coop_id
            AND cm.user_id = auth.uid()
            AND cm.role IN ('owner', 'admin')
        )
    );
