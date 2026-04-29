-- Add team_id to proposals
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE;

-- Update proposals RLS policies to allow team members to view/insert/update
-- Drop existing policies first
DROP POLICY IF EXISTS "Proposals are viewable by participants" ON public.proposals;
DROP POLICY IF EXISTS "Freelancers can insert proposals" ON public.proposals;
DROP POLICY IF EXISTS "Participants can update proposal status" ON public.proposals;

CREATE POLICY "Proposals are viewable by participants" ON public.proposals
    FOR SELECT USING (
        auth.uid() = freelancer_id 
        OR EXISTS (
            SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.client_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.team_members tm WHERE tm.team_id = public.proposals.team_id AND tm.user_id = auth.uid()
        )
    );

CREATE POLICY "Freelancers and team owners can insert proposals" ON public.proposals 
    FOR INSERT WITH CHECK (
        auth.uid() = freelancer_id 
        OR EXISTS (
            SELECT 1 FROM public.team_members tm WHERE tm.team_id = public.proposals.team_id AND tm.user_id = auth.uid() AND tm.role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Participants can update proposal status" ON public.proposals 
    FOR UPDATE USING (
        auth.uid() = freelancer_id 
        OR EXISTS (
            SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.client_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.team_members tm WHERE tm.team_id = public.proposals.team_id AND tm.user_id = auth.uid() AND tm.role IN ('owner', 'admin')
        )
    );
