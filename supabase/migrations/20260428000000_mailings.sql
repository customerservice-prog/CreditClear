-- PR 8: certified-mail tracking. Records every certified-mail send (real
-- or stubbed) so the dispute detail page can surface tracking numbers,
-- delivery status, and the postage we charged for each letter.

create table if not exists public.mailings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  letter_id uuid references public.letters(id) on delete cascade,
  dispute_id uuid references public.disputes(id) on delete set null,
  bureau text not null,
  recipient_name text not null,
  recipient_address jsonb not null default '{}'::jsonb,
  status text not null default 'queued',
  carrier text not null default 'usps',
  service text not null default 'certified-mail',
  tracking_number text,
  postage_cents integer,
  provider text not null default 'stub',
  provider_payload jsonb not null default '{}'::jsonb,
  mailed_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.mailings
  drop constraint if exists mailings_status_check;
alter table public.mailings
  add constraint mailings_status_check
  check (status in ('queued', 'mailed', 'in_transit', 'delivered', 'returned', 'failed', 'cancelled'));

alter table public.mailings
  drop constraint if exists mailings_bureau_check;
alter table public.mailings
  add constraint mailings_bureau_check
  check (bureau in ('equifax', 'experian', 'transunion', 'general'));

create index if not exists mailings_user_id_idx on public.mailings (user_id);
create index if not exists mailings_dispute_id_idx on public.mailings (dispute_id);
create unique index if not exists mailings_letter_id_unique on public.mailings (letter_id) where letter_id is not null;

drop trigger if exists mailings_set_updated_at on public.mailings;
create trigger mailings_set_updated_at
before update on public.mailings
for each row
execute function public.set_updated_at();

alter table public.mailings enable row level security;

drop policy if exists "Users can read own mailings" on public.mailings;
create policy "Users can read own mailings"
on public.mailings
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own mailings" on public.mailings;
create policy "Users can insert own mailings"
on public.mailings
for insert
with check (
  auth.uid() = user_id
  and public.dispute_belongs_to_user(dispute_id, auth.uid())
);

drop policy if exists "Users can update own mailings" on public.mailings;
create policy "Users can update own mailings"
on public.mailings
for update
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and public.dispute_belongs_to_user(dispute_id, auth.uid())
);

drop policy if exists "Users can delete own mailings" on public.mailings;
create policy "Users can delete own mailings"
on public.mailings
for delete
using (auth.uid() = user_id);

comment on table public.mailings is
  'One row per certified-mail send (or stub send). Wires the dispute_rounds workflow to the real-world mail provider once one is integrated. provider=stub until then.';
