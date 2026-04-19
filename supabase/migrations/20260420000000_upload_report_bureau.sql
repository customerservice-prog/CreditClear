alter table public.uploads
  add column if not exists report_bureau text;

alter table public.uploads
  drop constraint if exists uploads_report_bureau_check;

alter table public.uploads
  add constraint uploads_report_bureau_check
  check (
    report_bureau is null
    or report_bureau in ('equifax', 'experian', 'transunion', 'combined')
  );

comment on column public.uploads.report_bureau is
  'Which bureau this credit report file belongs to, or combined for a tri-merge file. Null = not labeled yet.';
