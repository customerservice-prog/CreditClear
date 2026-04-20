-- PR 11: Pro tier scaffolding
-- Adds an explicit role on profiles plus a pro_clients link table so a
-- consultant ("pro") can have an authenticated roster of consumer clients.
-- Roles:
--   consumer  -> default. Sees only their own data.
--   pro       -> can invite & view clients via the /pro/dashboard route.
--   admin     -> internal only (not exposed in UI yet).

alter table public.profiles
  add column if not exists role text not null default 'consumer';

alter table public.profiles
  drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('consumer', 'pro', 'admin'));

create index if not exists profiles_role_idx on public.profiles(role);

-- pro_clients links a pro user_id to a client (consumer) user_id. Either
-- side can be initiated as a pending invite (client_user_id null + email)
-- and later attached when the consumer signs up under the same email.
create table if not exists public.pro_clients (
  id uuid primary key default gen_random_uuid(),
  pro_user_id uuid not null references public.profiles(id) on delete cascade,
  client_user_id uuid references public.profiles(id) on delete set null,
  client_email text not null,
  client_full_name text,
  status text not null default 'invited',
  invited_at timestamptz not null default timezone('utc', now()),
  accepted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.pro_clients
  drop constraint if exists pro_clients_status_check;
alter table public.pro_clients
  add constraint pro_clients_status_check
  check (status in ('invited', 'active', 'paused', 'archived'));

alter table public.pro_clients
  drop constraint if exists pro_clients_unique_per_pro;
alter table public.pro_clients
  add constraint pro_clients_unique_per_pro
  unique (pro_user_id, client_email);

create index if not exists pro_clients_pro_idx on public.pro_clients(pro_user_id);
create index if not exists pro_clients_client_idx on public.pro_clients(client_user_id);

alter table public.pro_clients enable row level security;

drop policy if exists "pro can manage own clients" on public.pro_clients;
create policy "pro can manage own clients"
  on public.pro_clients
  for all
  using (auth.uid() = pro_user_id)
  with check (auth.uid() = pro_user_id);

drop policy if exists "client can read own pro link" on public.pro_clients;
create policy "client can read own pro link"
  on public.pro_clients
  for select
  using (auth.uid() = client_user_id);

comment on table public.pro_clients is
  'PR 11: Consultant-to-client roster. Read access for the pro and the linked client.';
comment on column public.profiles.role is
  'PR 11: consumer (default) | pro (consultant) | admin (internal).';
