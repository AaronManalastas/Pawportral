-- Enable UUID extension (for local Postgres; Supabase has it by default)
-- create extension if not exists "uuid-ossp";

-- Profiles table (maps auth.users.id)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'user' check (role in ('user','admin')),
  created_at timestamp with time zone default now()
);
alter table public.profiles enable row level security;

-- Allow users to read self; admins read all
create policy "read own profile or admin read all" on public.profiles
for select using (
  auth.uid() = id or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- Allow users to insert their own profile (on sign-up)
create policy "insert own profile" on public.profiles
for insert with check (auth.uid() = id);

-- Allow users to update own profile; admin update all
create policy "update own profile or admin any" on public.profiles
for update using (
  auth.uid() = id or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- Pets
create table if not exists public.pets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  species text not null check (species in ('Dog','Cat','Other')),
  breed text,
  sex text not null check (sex in ('Male','Female','Unknown')),
  age_years numeric,
  size text not null check (size in ('Small','Medium','Large')),
  location text not null,
  description text,
  status text not null default 'available' check (status in ('available','reserved','adopted')),
  photo_url text,
  created_at timestamp with time zone default now()
);
alter table public.pets enable row level security;

-- RLS: anyone can read available pets
create policy "read pets public" on public.pets for select using (true);

-- Only admins can insert/update/delete pets
create policy "admin manage pets" on public.pets
for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- Applications
create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets(id) on delete cascade,
  applicant_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  message text,
  created_at timestamp with time zone default now()
);
alter table public.applications enable row level security;

-- Users can insert and read their own applications
create policy "insert own application" on public.applications
for insert with check (auth.uid() = applicant_id);

create policy "read own application" on public.applications
for select using (auth.uid() = applicant_id);

-- Admins can read and update all applications
create policy "admin read applications" on public.applications
for select using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "admin update applications" on public.applications
for update using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- Link tables for joins (optional views)
create or replace view public.applications_with_details as
select a.*, pe.name as pet_name, pr.full_name as applicant_name
from public.applications a
left join public.pets pe on pe.id = a.pet_id
left join public.profiles pr on pr.id = a.applicant_id;

-- Storage bucket (create via dashboard): 'pets'
-- Set Public: true (for demo), or use signed URLs in production.
