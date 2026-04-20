-- Ensure profiles table has RLS enabled and an UPDATE policy for authenticated users.
-- This allows users to save their contact details (saved_contact column) and full_name.
-- Run this in the Supabase SQL editor if the dispute wizard shows a saved_contact error.

alter table public.profiles enable row level security;

-- Allow authenticated users to read their own profile
drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Allow authenticated users to update their own profile (name, saved_contact, etc.)
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Ensure the saved_contact column exists (idempotent)
alter table public.profiles
  add column if not exists saved_contact jsonb not null default '{}'::jsonb;

-- Ensure full_name column exists (idempotent)
alter table public.profiles
  add column if not exists full_name text;
