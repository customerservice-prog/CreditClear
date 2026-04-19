create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null default '',
  full_name text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  status text not null default 'trialing',
  plan_name text not null default 'CreditClear Pro',
  price_id text,
  current_period_end timestamptz,
  trial_ends_at timestamptz not null default timezone('utc', now()) + interval '7 days',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.subscriptions
  drop constraint if exists subscriptions_status_check;
alter table public.subscriptions
  add constraint subscriptions_status_check
  check (status in ('trialing', 'active', 'past_due', 'canceled', 'expired'));

create table if not exists public.disputes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default 'Untitled dispute',
  status text not null default 'draft',
  bureau_targets jsonb not null default '[]'::jsonb,
  issue_categories jsonb not null default '[]'::jsonb,
  personal_info jsonb not null default '{}'::jsonb,
  ai_summary text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.letters (
  id uuid primary key default gen_random_uuid(),
  dispute_id uuid not null references public.disputes(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  bureau text not null,
  issue_type text not null,
  draft_text text not null,
  editable_text text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.letters
  drop constraint if exists letters_text_length_check;
alter table public.letters
  add constraint letters_text_length_check
  check (
    length(draft_text) between 1 and 12000
    and length(editable_text) between 1 and 12000
  );

create table if not exists public.uploads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  dispute_id uuid references public.disputes(id) on delete set null,
  file_path text not null,
  file_name text not null,
  mime_type text not null,
  file_size bigint not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.uploads
  drop constraint if exists uploads_file_size_check;
alter table public.uploads
  add constraint uploads_file_size_check
  check (file_size >= 0 and file_size <= 10485760);

alter table public.uploads
  drop constraint if exists uploads_mime_type_check;
alter table public.uploads
  add constraint uploads_mime_type_check
  check (mime_type in ('application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif'));

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at
before update on public.subscriptions
for each row
execute function public.set_updated_at();

drop trigger if exists disputes_set_updated_at on public.disputes;
create trigger disputes_set_updated_at
before update on public.disputes
for each row
execute function public.set_updated_at();

drop trigger if exists letters_set_updated_at on public.letters;
create trigger letters_set_updated_at
before update on public.letters
for each row
execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    new.raw_user_meta_data ->> 'full_name'
  )
  on conflict (id) do nothing;

  insert into public.subscriptions (user_id, status, plan_name, trial_ends_at)
  values (
    new.id,
    'trialing',
    'CreditClear Pro',
    timezone('utc', now()) + interval '7 days'
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create or replace function public.dispute_belongs_to_user(target_dispute_id uuid, target_user_id uuid)
returns boolean
language sql
stable
as $$
  select
    target_dispute_id is null
    or exists (
      select 1
      from public.disputes d
      where d.id = target_dispute_id
        and d.user_id = target_user_id
    );
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.disputes enable row level security;
alter table public.letters enable row level security;
alter table public.uploads enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
on public.profiles
for select
using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
on public.profiles
for insert
with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Users can read own subscription" on public.subscriptions;
create policy "Users can read own subscription"
on public.subscriptions
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own subscription" on public.subscriptions;
drop policy if exists "Users can update own subscription" on public.subscriptions;

drop policy if exists "Users can read own disputes" on public.disputes;
create policy "Users can read own disputes"
on public.disputes
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own disputes" on public.disputes;
create policy "Users can insert own disputes"
on public.disputes
for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update own disputes" on public.disputes;
create policy "Users can update own disputes"
on public.disputes
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own disputes" on public.disputes;
create policy "Users can delete own disputes"
on public.disputes
for delete
using (auth.uid() = user_id);

drop policy if exists "Users can read own letters" on public.letters;
create policy "Users can read own letters"
on public.letters
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own letters" on public.letters;
create policy "Users can insert own letters"
on public.letters
for insert
with check (
  auth.uid() = user_id
  and public.dispute_belongs_to_user(dispute_id, auth.uid())
);

drop policy if exists "Users can update own letters" on public.letters;
create policy "Users can update own letters"
on public.letters
for update
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and public.dispute_belongs_to_user(dispute_id, auth.uid())
);

drop policy if exists "Users can delete own letters" on public.letters;
create policy "Users can delete own letters"
on public.letters
for delete
using (auth.uid() = user_id);

drop policy if exists "Users can read own uploads" on public.uploads;
create policy "Users can read own uploads"
on public.uploads
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own uploads" on public.uploads;
create policy "Users can insert own uploads"
on public.uploads
for insert
with check (
  auth.uid() = user_id
  and public.dispute_belongs_to_user(dispute_id, auth.uid())
);

drop policy if exists "Users can update own uploads" on public.uploads;
create policy "Users can update own uploads"
on public.uploads
for update
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and public.dispute_belongs_to_user(dispute_id, auth.uid())
);

drop policy if exists "Users can delete own uploads" on public.uploads;
create policy "Users can delete own uploads"
on public.uploads
for delete
using (auth.uid() = user_id);

drop policy if exists "Users can read own audit logs" on public.audit_logs;
create policy "Users can read own audit logs"
on public.audit_logs
for select
using (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('private-uploads', 'private-uploads', false)
on conflict (id) do nothing;

drop policy if exists "Users can manage own storage objects" on storage.objects;
create policy "Users can manage own storage objects"
on storage.objects
for all
using (bucket_id = 'private-uploads' and auth.uid()::text = (storage.foldername(name))[1])
with check (bucket_id = 'private-uploads' and auth.uid()::text = (storage.foldername(name))[1]);
