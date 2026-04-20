-- PR 7: Real round tracking. Replaces the static "Coming Soon" round
-- timeline on the dispute detail page with persisted state per dispute.
--
-- A dispute can have up to four rounds:
--   1 = Bureau initial dispute (FCRA §611)
--   2 = Method-of-verification (FCRA §611(a)(7))
--   3 = Furnisher direct dispute (FCRA §1681s-2(b))
--   4 = CFPB complaint escalation
--
-- Round 1 is created automatically when the user generates and saves
-- their first batch of letters. Subsequent rounds are created when the
-- user clicks "Start round N" in the UI. The 30-day waiting window for
-- round 2 unlocks via the response_due_on date computed from round 1's
-- mailed_on.

create table if not exists public.dispute_rounds (
  id uuid primary key default gen_random_uuid(),
  dispute_id uuid not null references public.disputes(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  round_number int not null,
  letter_type text not null default 'bureau_initial',
  status text not null default 'drafted',
  drafted_at timestamptz not null default timezone('utc', now()),
  mailed_on date,
  response_due_on date,
  response_received_on date,
  outcome text,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.dispute_rounds
  drop constraint if exists dispute_rounds_round_number_check;
alter table public.dispute_rounds
  add constraint dispute_rounds_round_number_check
  check (round_number between 1 and 4);

alter table public.dispute_rounds
  drop constraint if exists dispute_rounds_status_check;
alter table public.dispute_rounds
  add constraint dispute_rounds_status_check
  check (status in ('drafted', 'mailed', 'response_received', 'closed'));

alter table public.dispute_rounds
  drop constraint if exists dispute_rounds_letter_type_check;
alter table public.dispute_rounds
  add constraint dispute_rounds_letter_type_check
  check (letter_type in ('bureau_initial', 'mov', 'furnisher', 'validation', 'goodwill', 'cfpb'));

create unique index if not exists dispute_rounds_unique_per_dispute
  on public.dispute_rounds (dispute_id, round_number);

create index if not exists dispute_rounds_user_id_idx
  on public.dispute_rounds (user_id);

create index if not exists dispute_rounds_response_due_on_idx
  on public.dispute_rounds (response_due_on)
  where status = 'mailed';

drop trigger if exists dispute_rounds_set_updated_at on public.dispute_rounds;
create trigger dispute_rounds_set_updated_at
before update on public.dispute_rounds
for each row
execute function public.set_updated_at();

alter table public.dispute_rounds enable row level security;

drop policy if exists "Users can read own dispute rounds" on public.dispute_rounds;
create policy "Users can read own dispute rounds"
on public.dispute_rounds
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own dispute rounds" on public.dispute_rounds;
create policy "Users can insert own dispute rounds"
on public.dispute_rounds
for insert
with check (
  auth.uid() = user_id
  and public.dispute_belongs_to_user(dispute_id, auth.uid())
);

drop policy if exists "Users can update own dispute rounds" on public.dispute_rounds;
create policy "Users can update own dispute rounds"
on public.dispute_rounds
for update
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and public.dispute_belongs_to_user(dispute_id, auth.uid())
);

drop policy if exists "Users can delete own dispute rounds" on public.dispute_rounds;
create policy "Users can delete own dispute rounds"
on public.dispute_rounds
for delete
using (auth.uid() = user_id);

comment on table public.dispute_rounds is
  'Tracks each round of a dispute (1=bureau initial, 2=MOV, 3=furnisher, 4=CFPB). '
  'Rows are user-owned, RLS-protected, and unique per (dispute_id, round_number).';
