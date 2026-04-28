-- Migration: Enable RLS and add policies for coops
ALTER TABLE coops ENABLE ROW LEVEL SECURITY;

-- 1. Anyone can view coops
DROP POLICY IF EXISTS "Coops are viewable by everyone" ON coops;
CREATE POLICY "Coops are viewable by everyone" ON coops
    FOR SELECT USING (true);

-- 2. Authenticated users can create coops
DROP POLICY IF EXISTS "Authenticated users can create coops" ON coops;
CREATE POLICY "Authenticated users can create coops" ON coops
    FOR INSERT 
    WITH CHECK (auth.uid() IS NOT NULL);

-- 3. Only owners/admins can update coops
DROP POLICY IF EXISTS "Owners and admins can update their coop" ON coops;
CREATE POLICY "Owners and admins can update their coop" ON coops
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM coop_members
            WHERE coop_id = id
            AND user_id = auth.uid()
            AND role IN ('owner', 'admin')
        )
    );

-- 4. Enable RLS and policies for coop_members as well
ALTER TABLE coop_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Coop members are viewable by everyone" ON coop_members;
CREATE POLICY "Coop members are viewable by everyone" ON coop_members
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "System/Owners can add members" ON coop_members;
CREATE POLICY "System/Owners can add members" ON coop_members
    FOR INSERT
    WITH CHECK (true); -- We'll rely on service-level logic for now, or tighten if needed

DROP POLICY IF EXISTS "Members can update their own status" ON coop_members;
CREATE POLICY "Members can update their own status" ON coop_members
    FOR UPDATE
    USING (user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM coop_members cm
        WHERE cm.coop_id = coop_members.coop_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('owner', 'admin')
    ));
