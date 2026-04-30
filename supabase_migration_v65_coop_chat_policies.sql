-- Migration: Add missing INSERT/UPDATE policies for coop_channels and coop_messages
-- This ensures owners can manually recover/create channels if the automatic triggers fail.

-- 1. Policies for coop_channels
DROP POLICY IF EXISTS "Owners and admins can create channels" ON coop_channels;
CREATE POLICY "Owners and admins can create channels" ON coop_channels
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM coop_members
            WHERE coop_id = coop_channels.coop_id
            AND user_id = auth.uid()
            AND role IN ('owner', 'admin')
        )
    );

DROP POLICY IF EXISTS "Owners and admins can update channels" ON coop_channels;
CREATE POLICY "Owners and admins can update channels" ON coop_channels
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM coop_members
            WHERE coop_id = coop_channels.coop_id
            AND user_id = auth.uid()
            AND role IN ('owner', 'admin')
        )
    );

-- 2. Ensure Realtime is enabled for these tables (Critical for chat)
-- This might need to be run by a superuser, but adding here as a reminder
-- ALTER PUBLICATION supabase_realtime ADD TABLE coop_messages;
-- ALTER PUBLICATION supabase_realtime ADD TABLE coop_channels;
