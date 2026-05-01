-- Migration: v71_fix_rls_recursion
-- Description: Fixes infinite recursion (42P17) in coop_members and chat_participants using SECURITY DEFINER functions.
-- This script replaces recursive SELECT policies with safe helper functions.

BEGIN;

-- 1. Helper Functions (SECURITY DEFINER to bypass RLS)

CREATE OR REPLACE FUNCTION public.get_my_coops() 
RETURNS SETOF uuid 
LANGUAGE sql 
SECURITY DEFINER 
SET search_path = public 
AS $$ 
    SELECT coop_id FROM public.coop_members WHERE user_id = auth.uid(); 
$$;

CREATE OR REPLACE FUNCTION public.get_my_chats() 
RETURNS SETOF uuid 
LANGUAGE sql 
SECURITY DEFINER 
SET search_path = public 
AS $$ 
    SELECT chat_id FROM public.chat_participants WHERE user_id = auth.uid(); 
$$;

-- 2. Update coop_members policies

-- Drop all recursive policies for coop_members
DROP POLICY IF EXISTS "coop_members_select" ON public.coop_members;
DROP POLICY IF EXISTS "coop_members_all" ON public.coop_members;
DROP POLICY IF EXISTS "Miembros ven a su equipo" ON public.coop_members;
DROP POLICY IF EXISTS "Coop members are viewable by everyone" ON public.coop_members;
DROP POLICY IF EXISTS "Miembros son visibles para todos" ON public.coop_members;

-- New SELECT policy using the helper (Breaks recursion)
CREATE POLICY "Miembros ven a su equipo" 
ON public.coop_members 
FOR SELECT 
USING (coop_id IN (SELECT public.get_my_coops()));

-- Ensure users can still manage their own membership without recursion
CREATE POLICY "coop_members_self_manage" 
ON public.coop_members 
FOR ALL 
USING (user_id = auth.uid());


-- 3. Update chat_participants policies

-- Drop all recursive policies for chat_participants
DROP POLICY IF EXISTS "chat_participants_access" ON public.chat_participants;
DROP POLICY IF EXISTS "Participantes ven sus chats" ON public.chat_participants;

-- New SELECT policy using the helper (Breaks recursion)
CREATE POLICY "Participantes ven sus chats" 
ON public.chat_participants 
FOR SELECT 
USING (chat_id IN (SELECT public.get_my_chats()));

-- Ensure users can still manage their own participation record
CREATE POLICY "chat_participants_self_manage" 
ON public.chat_participants 
FOR ALL 
USING (user_id = auth.uid());

COMMIT;
