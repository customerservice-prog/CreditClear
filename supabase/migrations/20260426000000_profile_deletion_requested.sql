-- PR 10: track right-to-delete requests on profiles, enable a 7-day grace
-- window before the operations team executes the actual purge.

alter table public.profiles
  add column if not exists deletion_requested_at timestamptz;

comment on column public.profiles.deletion_requested_at is
  'When set, the user has exercised the right to delete (CCPA/GDPR/CROA). The actual data purge runs after a 7-day grace window via api/account-delete.js.';

create index if not exists profiles_deletion_requested_at_idx
  on public.profiles (deletion_requested_at)
  where deletion_requested_at is not null;
