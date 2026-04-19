-- Migration v34: Implement Reporting System for Safe Harbor Compliance

-- 1. Create the reports table
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    reporter_id UUID REFERENCES public.profiles(id) NOT NULL,
    reported_item_id UUID NOT NULL,
    reported_item_type TEXT NOT NULL CHECK (reported_item_type IN ('profile', 'service', 'chat')),
    reason TEXT NOT NULL,
    details TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. Add helpful comments
COMMENT ON COLUMN public.reports.reported_item_id IS 'UUID of the entity being reported (Profile ID, Service ID, or Chat ID)';
COMMENT ON COLUMN public.reports.reported_item_type IS 'Type of the entity being reported to allow polymorphic association in frontend';

-- 3. Enable RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- 4. Policies
-- Reporters can see their own reports (if we decide to add a user-facing view later)
CREATE POLICY "Users can view their own reports" ON public.reports
    FOR SELECT USING (auth.uid() = reporter_id);

-- Any authenticated user can create a report
CREATE POLICY "Authenticated users can create reports" ON public.reports
    FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- Admin Policy (Assuming we identify admins by a metadata field or a specific table)
-- In Cooplance, we often use a secret route for admin, but for DB security:
CREATE POLICY "Admins can manage all reports" ON public.reports
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND (raw_user_meta_data->>'role' = 'admin' OR username = 'admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND (raw_user_meta_data->>'role' = 'admin' OR username = 'admin')
        )
    );

-- 5. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_reported_item ON public.reports(reported_item_type, reported_item_id);
