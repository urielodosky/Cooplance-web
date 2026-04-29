-- Add invitation tracking to coop_members
ALTER TABLE public.coop_members 
ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS invitation_message TEXT;

-- Update RLS if needed, but existing SELECT true should cover it
-- We might want to ensure users can only see invitations meant for them or where they are the inviter.
-- The existing policy is "Team members are public" (SELECT true), which is fine for now but could be tighter.
