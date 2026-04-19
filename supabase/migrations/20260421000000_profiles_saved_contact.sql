-- Optional JSON blob to prefill the dispute wizard (user-editable contact fields).
alter table public.profiles
  add column if not exists saved_contact jsonb not null default '{}'::jsonb;

comment on column public.profiles.saved_contact is
  'User-owned contact snapshot for the dispute form (firstName, lastName, address, etc.).';
