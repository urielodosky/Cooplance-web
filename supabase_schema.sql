-- ============================================================
-- COOPLANCE - SUPABASE DATABASE SCHEMA
-- Run this in the Supabase SQL Editor to create all tables.
-- ============================================================

-- 1. USER PROFILES (extends Supabase auth.users)
create table if not exists public.profiles (
    id uuid references auth.users(id) on delete cascade primary key,
    username text unique not null,
    first_name text,
    last_name text,
    email text unique not null,
    role text not null default 'client', -- 'freelancer', 'client', 'empresa'
    level integer not null default 1,
    avatar_url text,
    bio text,
    points integer not null default 0,
    gender text,
    company_name text,
    responsible_name text,
    location text,
    country text,
    work_hours text,
    payment_methods text,
    vacancies integer default 0,
    cv_url text,
    created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "Profiles are viewable by everyone." on public.profiles for select using (true);
create policy "Users can update their own profile." on public.profiles for update using (auth.uid() = id);


-- 2. SERVICES
create table if not exists public.services (
    id uuid primary key default gen_random_uuid(),
    owner_id uuid references public.profiles(id) on delete cascade not null,
    team_id uuid references public.teams(id) on delete set null, -- nullable, only if it belongs to a team
    title text not null,
    description text,
    category text,
    subcategory text,
    specialties text[],
    price numeric,
    delivery_time integer,
    revisions integer,
    image_url text,
    video_url text,
    tags text[],
    work_mode text[],
    active boolean not null default true,
    booking_config jsonb,
    packages jsonb,
    faqs jsonb,
    created_at timestamptz not null default now()
);
alter table public.services enable row level security;
create policy "Services are viewable by everyone." on public.services for select using (true);
create policy "Users can create their own services." on public.services for insert with check (auth.uid() = owner_id);
create policy "Users can update their own services." on public.services for update using (auth.uid() = owner_id);
create policy "Users can delete their own services." on public.services for delete using (auth.uid() = owner_id);


-- 3. TEAMS / COOPS
create table if not exists public.teams (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    description text,
    logo_url text,
    categories jsonb,
    tags text[],
    founder_id uuid references public.profiles(id) on delete set null,
    internal_rules text,
    distribution_config jsonb,
    created_at timestamptz not null default now()
);
alter table public.teams enable row level security;
create policy "Teams are viewable by everyone." on public.teams for select using (true);
create policy "Authenticated users can create teams." on public.teams for insert with check (auth.uid() = founder_id);
create policy "Founders can update their team." on public.teams for update using (auth.uid() = founder_id);


-- 4. TEAM MEMBERS
create table if not exists public.team_members (
    id uuid primary key default gen_random_uuid(),
    team_id uuid references public.teams(id) on delete cascade not null,
    user_id uuid references public.profiles(id) on delete cascade not null,
    role text not null default 'member', -- 'owner', 'member'
    status text not null default 'invited', -- 'invited', 'active', 'inactive'
    joined_at timestamptz not null default now(),
    unique(team_id, user_id)
);
alter table public.team_members enable row level security;
create policy "Team members are viewable by everyone." on public.team_members for select using (true);


-- 5. JOBS / ORDERS
create table if not exists public.jobs (
    id uuid primary key default gen_random_uuid(),
    service_id uuid references public.services(id) on delete set null,
    client_id uuid references public.profiles(id) on delete set null not null,
    provider_id uuid references public.profiles(id) on delete set null not null,
    team_id uuid references public.teams(id) on delete set null,
    status text not null default 'pending',
    amount numeric not null,
    booking_date date,
    booking_time text,
    created_at timestamptz not null default now()
);
alter table public.jobs enable row level security;
create policy "Users can view their own jobs." on public.jobs for select using (auth.uid() = client_id or auth.uid() = provider_id);
create policy "Clients can create jobs." on public.jobs for insert with check (auth.uid() = client_id);


-- 6. REVIEWS
create table if not exists public.reviews (
    id uuid primary key default gen_random_uuid(),
    job_id uuid references public.jobs(id) on delete cascade unique,
    service_id uuid references public.services(id) on delete cascade,
    team_id uuid references public.teams(id) on delete cascade,
    reviewer_id uuid references public.profiles(id) on delete cascade not null,
    rating integer check(rating >= 1 and rating <= 5),
    comment text,
    created_at timestamptz not null default now()
);
alter table public.reviews enable row level security;
create policy "Reviews are viewable by everyone." on public.reviews for select using (true);
create policy "Users can create reviews for their own jobs." on public.reviews for insert with check (auth.uid() = reviewer_id);


-- 7. CHAT MESSAGES
create table if not exists public.messages (
    id uuid primary key default gen_random_uuid(),
    sender_id uuid references public.profiles(id) on delete cascade not null,
    receiver_id uuid references public.profiles(id) on delete cascade not null,
    content text not null,
    is_read boolean not null default false,
    created_at timestamptz not null default now()
);
alter table public.messages enable row level security;
create policy "Users can view their own messages." on public.messages for select using (auth.uid() = sender_id or auth.uid() = receiver_id);
create policy "Users can send messages." on public.messages for insert with check (auth.uid() = sender_id);


-- FUNCTION: auto-create a profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
    insert into public.profiles (
        id, 
        username, 
        first_name, 
        last_name, 
        email, 
        role,
        gender,
        company_name,
        responsible_name,
        location,
        country,
        work_hours,
        payment_methods,
        vacancies
    )
    values (
        new.id,
        coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
        coalesce(new.raw_user_meta_data->>'first_name', ''),
        coalesce(new.raw_user_meta_data->>'last_name', ''),
        new.email,
        coalesce(new.raw_user_meta_data->>'role', 'client'),
        new.raw_user_meta_data->>'gender',
        new.raw_user_meta_data->>'company_name',
        new.raw_user_meta_data->>'responsible_name',
        new.raw_user_meta_data->>'location',
        new.raw_user_meta_data->>'country',
        new.raw_user_meta_data->>'work_hours',
        new.raw_user_meta_data->>'payment_methods',
        (new.raw_user_meta_data->>'vacancies')::integer
    );
    return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user();
