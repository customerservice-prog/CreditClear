-- PR 12: Furnisher / collector / creditor mailing-address lookup table.
-- Lets letter generation auto-fill the recipient block on furnisher,
-- validation, and goodwill letters instead of leaving "[Furnisher mailing
-- address]" placeholders the user has to hunt down themselves.
--
-- Lookup is by `alias_norm` — a lowercased, alphanum-only normalization
-- of either the canonical name or any known DBA / brand variant. Multiple
-- aliases can point to the same canonical furnisher row.

create table if not exists public.furnishers (
  id uuid primary key default gen_random_uuid(),
  canonical_name text not null,
  kind text not null default 'furnisher',
  street text not null,
  city text not null,
  state text not null,
  zip text not null,
  country text not null default 'US',
  source_url text,
  notes text,
  last_verified_on date not null default current_date,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.furnishers
  drop constraint if exists furnishers_kind_check;
alter table public.furnishers
  add constraint furnishers_kind_check
  check (kind in ('furnisher', 'collector', 'creditor', 'bureau'));

alter table public.furnishers
  drop constraint if exists furnishers_canonical_name_unique;
alter table public.furnishers
  add constraint furnishers_canonical_name_unique unique (canonical_name);

create index if not exists furnishers_canonical_idx on public.furnishers(canonical_name);

create table if not exists public.furnisher_aliases (
  id uuid primary key default gen_random_uuid(),
  furnisher_id uuid not null references public.furnishers(id) on delete cascade,
  alias_norm text not null unique,
  alias_display text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists furnisher_aliases_furnisher_idx on public.furnisher_aliases(furnisher_id);

-- Row-level security: read-open to all authenticated users (the directory
-- itself is public information — these are the same addresses the bureaus
-- and the FTC publish on consumer-rights guides). No write policies — the
-- table is curated by us via migrations.
alter table public.furnishers enable row level security;
alter table public.furnisher_aliases enable row level security;

drop policy if exists "anyone authenticated can read furnishers" on public.furnishers;
create policy "anyone authenticated can read furnishers"
  on public.furnishers
  for select
  using (auth.role() = 'authenticated');

drop policy if exists "anyone authenticated can read furnisher_aliases" on public.furnisher_aliases;
create policy "anyone authenticated can read furnisher_aliases"
  on public.furnisher_aliases
  for select
  using (auth.role() = 'authenticated');

comment on table public.furnishers is
  'PR 12: Curated mailing-address directory for credit data furnishers, original creditors, and collectors. Read-only to authenticated users. Writes are migration-controlled.';
comment on column public.furnishers.last_verified_on is
  'Last date a human verified the address from the company''s public consumer-disputes page or USPS lookup.';

-- Helper used by the backend to do exact-or-substring lookups in one round
-- trip. Returns the canonical furnisher row whose alias either equals the
-- normalized input OR contains it as a substring (covers cases like the
-- user typing "BoA" while the alias is "bankofamerica").
create or replace function public.lookup_furnisher(p_alias_norm text)
returns table (
  furnisher_id uuid,
  canonical_name text,
  kind text,
  street text,
  city text,
  state text,
  zip text,
  country text,
  source_url text,
  last_verified_on date
)
language sql
stable
as $$
  select f.id, f.canonical_name, f.kind, f.street, f.city, f.state, f.zip, f.country, f.source_url, f.last_verified_on
  from public.furnishers f
  join public.furnisher_aliases a on a.furnisher_id = f.id
  where a.alias_norm = p_alias_norm
     or a.alias_norm like '%' || p_alias_norm || '%'
     or p_alias_norm like '%' || a.alias_norm || '%'
  order by length(a.alias_norm) - length(p_alias_norm) asc
  limit 1
$$;
