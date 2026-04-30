-- Migration: Finalize Coop Chat RLS and add Extra Channels support
-- 1. Support for 'extra' channel types in RLS
DROP POLICY IF EXISTS "Coop members can see general and their direct channels" ON coop_channels;
CREATE POLICY "Coop members can see channels they belong to" ON coop_channels
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM coop_members 
            WHERE coop_id = coop_channels.coop_id 
            AND user_id = auth.uid()
        ) AND (
            type IN ('general', 'project') OR 
            (type IN ('direct', 'extra') AND auth.uid() = ANY(member_ids))
        )
    );

-- 2. Explicit INSERT policy for coop_messages
DROP POLICY IF EXISTS "Users can send messages to channels they have access to" ON coop_messages;
CREATE POLICY "Users can send messages to channels they have access to" ON coop_messages
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM coop_channels 
            WHERE id = coop_messages.channel_id
        ) AND sender_id = auth.uid()
    );

-- 3. Policy for creating extra channels (Owners/Admins only)
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
