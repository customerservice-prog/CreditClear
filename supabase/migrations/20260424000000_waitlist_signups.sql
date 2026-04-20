-- Waitlist for Coming Soon features. Anyone (logged-in or anonymous) can join
-- the list for any feature. Reads are restricted to the row owner (when known)
-- plus the service role — admin reporting runs as service role.

create table if not exists public.waitlist_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  feature_id text not null,
  user_id uuid references public.profiles(id) on delete set null,
  source text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists waitlist_signups_feature_idx on public.waitlist_signups (feature_id, created_at desc);
create index if not exists waitlist_signups_email_idx on public.waitlist_signups (lower(email));

alter table public.waitlist_signups enable row level security;

-- Anyone (anon + authenticated) may insert a waitlist row. Validation is
-- performed server-side in /api/waitlist (email format, feature id whitelist).
drop policy if exists "Anyone can join the waitlist" on public.waitlist_signups;
create policy "Anyone can join the waitlist"
  on public.waitlist_signups for insert
  to anon, authenticated
  with check (true);

-- Authenticated users can read only their own rows; service role bypasses RLS.
drop policy if exists "Users can read own waitlist rows" on public.waitlist_signups;
create policy "Users can read own waitlist rows"
  on public.waitlist_signups for select
  to authenticated
  using (user_id is not null and user_id = auth.uid());

comment on table public.waitlist_signups is
  'Email captures from Coming Soon feature cards. Source = the page/component that captured the email.';
