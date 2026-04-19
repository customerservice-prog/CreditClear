-- Per-issue account details from Step 3 (creditor, account, dispute reason) for saved disputes.
alter table public.disputes
  add column if not exists issue_account_details jsonb not null default '{}'::jsonb;

comment on column public.disputes.issue_account_details is
  'Maps issue id -> { creditorName, accountLast4, amountOrBalance, reportedDate, disputeReason }.';
