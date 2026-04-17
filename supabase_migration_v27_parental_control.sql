-- ============================================================
-- COOPLANCE - MIGRATION V27: PARENTAL CONTROL & MIRROR MODE
-- ============================================================

-- 1. ADD COLUMNS TO PROFILES
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'pending_parental_approval', 'suspended'));

-- 2. CONSTRAINT: LIMIT 2 MINORS PER PARENT
CREATE OR REPLACE FUNCTION check_parent_limit() 
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.parent_id IS NOT NULL) THEN
        -- Verify parent exists, is an adult, and is a freelancer
        IF NOT EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = NEW.parent_id 
            AND role = 'freelancer' 
            AND (dob IS NULL OR dob <= (CURRENT_DATE - INTERVAL '18 years'))
        ) THEN
            RAISE EXCEPTION 'El tutor debe ser un Freelancer mayor de 18 años registrado en Cooplance.';
        END IF;

        -- Verify limit
        IF (SELECT COUNT(*) FROM public.profiles WHERE parent_id = NEW.parent_id AND id != NEW.id) >= 2 THEN
            RAISE EXCEPTION 'Un tutor no puede tener más de 2 menores a cargo.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_limit_minors_per_parent ON public.profiles;
CREATE TRIGGER tr_limit_minors_per_parent
BEFORE INSERT OR UPDATE OF parent_id ON public.profiles
FOR EACH ROW EXECUTE FUNCTION check_parent_limit();

-- 3. UPDATED RLS POLICIES (MIRROR MODE)
-- Policy: SELECT access if auth.uid() is the owner OR auth.uid() is the parent_id of the owner.

-- A. Messages
DROP POLICY IF EXISTS "Participants can see messages" ON public.messages;
CREATE POLICY "Participants or parents can see messages" ON public.messages
FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.chat_participants WHERE chat_id = public.messages.chat_id AND user_id = auth.uid())
    OR EXISTS (
        SELECT 1 FROM public.chat_participants cp
        JOIN public.profiles p ON cp.user_id = p.id
        WHERE cp.chat_id = public.messages.chat_id AND p.parent_id = auth.uid()
    )
);

-- B. Chats
DROP POLICY IF EXISTS "Users can see chats they are in" ON public.chats;
CREATE POLICY "Users or parents can see chats" ON public.chats
FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.chat_participants WHERE chat_id = public.chats.id AND user_id = auth.uid())
    OR EXISTS (
        SELECT 1 FROM public.chat_participants cp
        JOIN public.profiles p ON cp.user_id = p.id
        WHERE cp.chat_id = public.chats.id AND p.parent_id = auth.uid()
    )
);

-- C. Transactions
DROP POLICY IF EXISTS "Users see their own transactions" ON public.transactions;
CREATE POLICY "Users or parents see transactions" ON public.transactions
FOR SELECT USING (
    auth.uid() = user_id 
    OR (SELECT parent_id FROM public.profiles WHERE id = user_id) = auth.uid()
);

-- D. Proposals (Postulaciones)
DROP POLICY IF EXISTS "Proposals are viewable by participants" ON public.proposals;
CREATE POLICY "Proposals are viewable by participants or parents" ON public.proposals
FOR SELECT USING (
    auth.uid() = freelancer_id 
    OR (SELECT parent_id FROM public.profiles WHERE id = freelancer_id) = auth.uid()
    OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.client_id = auth.uid())
);

-- E. Services
DROP POLICY IF EXISTS "Users manage their own services" ON public.services;
CREATE POLICY "Users or parents see services" ON public.services
FOR SELECT USING (true); -- Services are public already
CREATE POLICY "Users manage their own services" ON public.services
FOR ALL USING (auth.uid() = owner_id);

-- F. Notifications
DROP POLICY IF EXISTS "Users see their own notifications" ON public.notifications;
CREATE POLICY "Users or parents see notifications" ON public.notifications
FOR SELECT USING (
    auth.uid() = user_id 
    OR (SELECT parent_id FROM public.profiles WHERE id = user_id) = auth.uid()
);

-- 4. REFRESH SCHEMA CACHE (Internal)
