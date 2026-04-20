-- Structured credit-report data model. Replaces the prior "scrape 12K of raw
-- PDF text into the letter body" approach. Each row in public.credit_reports
-- represents one bureau snapshot for one user (from an upload or, eventually,
-- an aggregator pull). Tradelines, inquiries, and public records hang off it.
--
-- No UI consumes these tables yet. Inserted in PR 2 so PR 3 (PDF parser) and
-- PR 4 (aggregator stub) can persist into a stable shape without further
-- migrations. RLS mirrors public.uploads exactly: a row is readable / writable
-- only by the owning user.

create table if not exists public.credit_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  dispute_id uuid references public.disputes(id) on delete set null,
  upload_id uuid references public.uploads(id) on delete set null,
  bureau text not null,
  source text not null,
  pulled_at timestamptz not null default timezone('utc', now()),
  report_date date,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.credit_reports
  drop constraint if exists credit_reports_bureau_check;
alter table public.credit_reports
  add constraint credit_reports_bureau_check
  check (bureau in ('equifax', 'experian', 'transunion'));

alter table public.credit_reports
  drop constraint if exists credit_reports_source_check;
alter table public.credit_reports
  add constraint credit_reports_source_check
  check (source in ('upload', 'aggregator', 'manual'));

create index if not exists credit_reports_user_idx
  on public.credit_reports (user_id, pulled_at desc);
create index if not exists credit_reports_dispute_idx
  on public.credit_reports (dispute_id);
create index if not exists credit_reports_upload_idx
  on public.credit_reports (upload_id);

comment on table public.credit_reports is
  'One snapshot of one bureau report for one user. Source describes how it was obtained (PDF upload, aggregator API, or manual entry).';
comment on column public.credit_reports.raw is
  'Full parsed JSON payload for the report (aggregator response or PDF parser output). Source of truth for re-derivation.';

create table if not exists public.tradelines (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.credit_reports(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  creditor text,
  account_last4 text,
  account_type text,
  account_status text,
  payment_status text,
  worst_delinquency text,
  balance_cents bigint,
  high_balance_cents bigint,
  credit_limit_cents bigint,
  past_due_cents bigint,
  monthly_payment_cents bigint,
  opened_on date,
  reported_on date,
  closed_on date,
  payment_history jsonb not null default '[]'::jsonb,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.tradelines
  drop constraint if exists tradelines_amount_nonneg_check;
alter table public.tradelines
  add constraint tradelines_amount_nonneg_check
  check (
    (balance_cents is null or balance_cents >= 0)
    and (high_balance_cents is null or high_balance_cents >= 0)
    and (credit_limit_cents is null or credit_limit_cents >= 0)
    and (past_due_cents is null or past_due_cents >= 0)
    and (monthly_payment_cents is null or monthly_payment_cents >= 0)
  );

create index if not exists tradelines_report_idx
  on public.tradelines (report_id);
create index if not exists tradelines_user_idx
  on public.tradelines (user_id, reported_on desc);

comment on table public.tradelines is
  'One account / tradeline as it appeared on a single bureau report. Cents columns are integer to avoid float drift; payment_history is the bureau-provided 24-month grid.';

create table if not exists public.report_inquiries (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.credit_reports(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  inquirer text,
  inquiry_type text,
  inquired_on date,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.report_inquiries
  drop constraint if exists report_inquiries_type_check;
alter table public.report_inquiries
  add constraint report_inquiries_type_check
  check (inquiry_type is null or inquiry_type in ('hard', 'soft', 'unknown'));

create index if not exists report_inquiries_report_idx
  on public.report_inquiries (report_id);
create index if not exists report_inquiries_user_idx
  on public.report_inquiries (user_id, inquired_on desc);

comment on table public.report_inquiries is
  'Hard/soft inquiries on a credit report. Inquiry_type is bureau-provided; soft inquiries do not impact disputes but are tracked for completeness.';

create table if not exists public.report_public_records (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.credit_reports(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  record_type text,
  court text,
  reference_number text,
  filed_on date,
  resolved_on date,
  amount_cents bigint,
  status text,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.report_public_records
  drop constraint if exists report_public_records_type_check;
alter table public.report_public_records
  add constraint report_public_records_type_check
  check (record_type is null or record_type in ('bankruptcy', 'judgment', 'lien', 'foreclosure', 'civil_claim', 'other'));

alter table public.report_public_records
  drop constraint if exists report_public_records_amount_nonneg_check;
alter table public.report_public_records
  add constraint report_public_records_amount_nonneg_check
  check (amount_cents is null or amount_cents >= 0);

create index if not exists report_public_records_report_idx
  on public.report_public_records (report_id);
create index if not exists report_public_records_user_idx
  on public.report_public_records (user_id, filed_on desc);

comment on table public.report_public_records is
  'Bankruptcies, judgments, liens, etc. attached to a bureau report.';

drop trigger if exists credit_reports_set_updated_at on public.credit_reports;
create trigger credit_reports_set_updated_at
before update on public.credit_reports
for each row
execute function public.set_updated_at();

-- Helper: a child row is owned by the user only if its parent report is owned
-- by that user. Mirrors public.dispute_belongs_to_user from the initial schema
-- so RLS check expressions stay short and consistent.
create or replace function public.report_belongs_to_user(target_report_id uuid, target_user_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.credit_reports cr
    where cr.id = target_report_id
      and cr.user_id = target_user_id
  );
$$;

alter table public.credit_reports enable row level security;
alter table public.tradelines enable row level security;
alter table public.report_inquiries enable row level security;
alter table public.report_public_records enable row level security;

drop policy if exists "Users can read own credit reports" on public.credit_reports;
create policy "Users can read own credit reports"
on public.credit_reports
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own credit reports" on public.credit_reports;
create policy "Users can insert own credit reports"
on public.credit_reports
for insert
with check (
  auth.uid() = user_id
  and public.dispute_belongs_to_user(dispute_id, auth.uid())
);

drop policy if exists "Users can update own credit reports" on public.credit_reports;
create policy "Users can update own credit reports"
on public.credit_reports
for update
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and public.dispute_belongs_to_user(dispute_id, auth.uid())
);

drop policy if exists "Users can delete own credit reports" on public.credit_reports;
create policy "Users can delete own credit reports"
on public.credit_reports
for delete
using (auth.uid() = user_id);

drop policy if exists "Users can read own tradelines" on public.tradelines;
create policy "Users can read own tradelines"
on public.tradelines
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own tradelines" on public.tradelines;
create policy "Users can insert own tradelines"
on public.tradelines
for insert
with check (
  auth.uid() = user_id
  and public.report_belongs_to_user(report_id, auth.uid())
);

drop policy if exists "Users can update own tradelines" on public.tradelines;
create policy "Users can update own tradelines"
on public.tradelines
for update
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and public.report_belongs_to_user(report_id, auth.uid())
);

drop policy if exists "Users can delete own tradelines" on public.tradelines;
create policy "Users can delete own tradelines"
on public.tradelines
for delete
using (auth.uid() = user_id);

drop policy if exists "Users can read own report inquiries" on public.report_inquiries;
create policy "Users can read own report inquiries"
on public.report_inquiries
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own report inquiries" on public.report_inquiries;
create policy "Users can insert own report inquiries"
on public.report_inquiries
for insert
with check (
  auth.uid() = user_id
  and public.report_belongs_to_user(report_id, auth.uid())
);

drop policy if exists "Users can update own report inquiries" on public.report_inquiries;
create policy "Users can update own report inquiries"
on public.report_inquiries
for update
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and public.report_belongs_to_user(report_id, auth.uid())
);

drop policy if exists "Users can delete own report inquiries" on public.report_inquiries;
create policy "Users can delete own report inquiries"
on public.report_inquiries
for delete
using (auth.uid() = user_id);

drop policy if exists "Users can read own public records" on public.report_public_records;
create policy "Users can read own public records"
on public.report_public_records
for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert own public records" on public.report_public_records;
create policy "Users can insert own public records"
on public.report_public_records
for insert
with check (
  auth.uid() = user_id
  and public.report_belongs_to_user(report_id, auth.uid())
);

drop policy if exists "Users can update own public records" on public.report_public_records;
create policy "Users can update own public records"
on public.report_public_records
for update
using (auth.uid() = user_id)
with check (
  auth.uid() = user_id
  and public.report_belongs_to_user(report_id, auth.uid())
);

drop policy if exists "Users can delete own public records" on public.report_public_records;
create policy "Users can delete own public records"
on public.report_public_records
for delete
using (auth.uid() = user_id);
