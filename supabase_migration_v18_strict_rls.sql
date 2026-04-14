-- ============================================================
-- MIGRATION V18: COOPLANCE STRICT RLS (Defensa en Profundidad)
-- ============================================================
-- Asegura el blindaje a nivel de base de datos de todas las 14 tablas.

-- 1. PROFILES (Públicos)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Profiles SELECT" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can delete their own profile." ON public.profiles;

CREATE POLICY "Profiles SELECT" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Profiles INSERT" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Profiles UPDATE" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Profiles DELETE" ON public.profiles FOR DELETE USING (auth.uid() = id);

-- 2. SERVICES (Públicos)
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Services are viewable by everyone." ON public.services;
DROP POLICY IF EXISTS "Services SELECT" ON public.services;
DROP POLICY IF EXISTS "Users can create their own services." ON public.services;
DROP POLICY IF EXISTS "Users can update their own services." ON public.services;
DROP POLICY IF EXISTS "Users can delete their own services." ON public.services;

CREATE POLICY "Services SELECT" ON public.services FOR SELECT USING (true);
CREATE POLICY "Services INSERT" ON public.services FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Services UPDATE" ON public.services FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Services DELETE" ON public.services FOR DELETE USING (auth.uid() = owner_id);

-- 3. PROJECTS (Públicos)
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Projects are viewable by everyone" ON public.projects;
DROP POLICY IF EXISTS "Users can create projects" ON public.projects;
DROP POLICY IF EXISTS "Clients can update their own projects" ON public.projects;
DROP POLICY IF EXISTS "Clients can delete their own projects" ON public.projects;

CREATE POLICY "Projects SELECT" ON public.projects FOR SELECT USING (true);
CREATE POLICY "Projects INSERT" ON public.projects FOR INSERT WITH CHECK (auth.uid() = client_id);
CREATE POLICY "Projects UPDATE" ON public.projects FOR UPDATE USING (auth.uid() = client_id);
CREATE POLICY "Projects DELETE" ON public.projects FOR DELETE USING (auth.uid() = client_id);

-- 4. TEAMS (Públicos)
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Teams are viewable by everyone." ON public.teams;
DROP POLICY IF EXISTS "Authenticated users can create teams." ON public.teams;
DROP POLICY IF EXISTS "Founders can update their team." ON public.teams;

CREATE POLICY "Teams SELECT" ON public.teams FOR SELECT USING (true);
CREATE POLICY "Teams INSERT" ON public.teams FOR INSERT WITH CHECK (auth.uid() = founder_id);
CREATE POLICY "Teams UPDATE" ON public.teams FOR UPDATE USING (auth.uid() = founder_id);

-- 5. TEAM MEMBERS
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Team members are viewable by everyone." ON public.team_members;

CREATE POLICY "Team Members SELECT" ON public.team_members FOR SELECT USING (true);
CREATE POLICY "Team Members INSERT" ON public.team_members FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT founder_id FROM public.teams WHERE id = team_id)
);
CREATE POLICY "Team Members UPDATE/DELETE" ON public.team_members FOR ALL USING (
    auth.uid() IN (SELECT founder_id FROM public.teams WHERE id = team_id)
    OR auth.uid() = user_id -- Permitir dejar el equipo
);

-- 6. REVIEWS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Reviews are viewable by everyone." ON public.reviews;
DROP POLICY IF EXISTS "Users can create reviews for their own jobs." ON public.reviews;

CREATE POLICY "Reviews SELECT" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Reviews INSERT" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);
CREATE POLICY "Reviews UPDATE/DELETE" ON public.reviews FOR ALL USING (auth.uid() = reviewer_id);

-- 7. SERVICE REVIEWS
ALTER TABLE public.service_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Reviews are public." ON public.service_reviews;

CREATE POLICY "Service Reviews SELECT" ON public.service_reviews FOR SELECT USING (true);
CREATE POLICY "Service Reviews INSERT" ON public.service_reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);
CREATE POLICY "Service Reviews UPDATE/DELETE" ON public.service_reviews FOR ALL USING (auth.uid() = reviewer_id);

-- 8. JOBS (Privados Estrictos)
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own jobs." ON public.jobs;
DROP POLICY IF EXISTS "Clients can create jobs." ON public.jobs;

CREATE POLICY "Jobs SELECT" ON public.jobs FOR SELECT USING (auth.uid() = client_id OR auth.uid() = provider_id);
CREATE POLICY "Jobs INSERT" ON public.jobs FOR INSERT WITH CHECK (auth.uid() = client_id);
CREATE POLICY "Jobs UPDATE" ON public.jobs FOR UPDATE USING (auth.uid() = client_id OR auth.uid() = provider_id);

-- 9. PROPOSALS (Aislados al Cliente y el Freelancer)
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Proposals are viewable by owner and job owner." ON public.proposals;
DROP POLICY IF EXISTS "Freelancers can insert proposals." ON public.proposals;

CREATE POLICY "Proposals SELECT" ON public.proposals FOR SELECT USING (
    auth.uid() = freelancer_id OR 
    auth.uid() IN (SELECT client_id FROM public.projects WHERE id = project_id)
);
CREATE POLICY "Proposals INSERT" ON public.proposals FOR INSERT WITH CHECK (auth.uid() = freelancer_id);
CREATE POLICY "Proposals UPDATE/DELETE" ON public.proposals FOR ALL USING (
    auth.uid() = freelancer_id OR 
    auth.uid() IN (SELECT client_id FROM public.projects WHERE id = project_id)
);

-- 10. TRANSACTIONS (Wallet)
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can only see their own transactions." ON public.transactions;

CREATE POLICY "Transactions SELECT" ON public.transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Transactions INSERT" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 11. CHATS (Privados e intrínsecos a los participantes)
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view chats they are part of" ON public.chats;

CREATE POLICY "Chats SELECT" ON public.chats FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.chat_participants WHERE chat_id = id AND user_id = auth.uid())
);
CREATE POLICY "Chats INSERT" ON public.chats FOR INSERT WITH CHECK (true); -- Usually restricted by RPC, but safe locally

-- 12. CHAT PARTICIPANTS
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their participant records" ON public.chat_participants;

CREATE POLICY "Chat Participants SELECT" ON public.chat_participants FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Chat Participants INSERT/DELETE" ON public.chat_participants FOR ALL USING (user_id = auth.uid());

-- 13. MESSAGES (Inmutabilidad Estricta - Sin DELETE/UPDATE)
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Participants can view messages" ON public.messages;
DROP POLICY IF EXISTS "Participants can insert messages" ON public.messages;

CREATE POLICY "Messages SELECT" ON public.messages FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.chat_participants WHERE chat_id = messages.chat_id AND user_id = auth.uid())
    OR auth.uid() = sender_id OR auth.uid() = receiver_id
);
CREATE POLICY "Messages INSERT" ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
-- Sin políticas UPDATE o DELETE intencionadamente para prevenir alteraciones de evidencia

-- 14. NOTIFICATIONS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their notifications" ON public.notifications;

CREATE POLICY "Notifications SELECT" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Notifications UPDATE/DELETE" ON public.notifications FOR ALL USING (auth.uid() = user_id);
