import type { IssueAccountDetail, IssueId } from '../types'

/** Educational, step-by-step guidance for each dispute category — not legal advice. */
export interface IssueActionGuide {
  issueId: IssueId
  /** Short headline for the expanded panel */
  headline: string
  /** One sentence on what fixing this usually involves */
  summary: string
  /** Concrete numbered steps the user can follow */
  steps: string[]
  /** Optional: documents or proof to gather */
  evidenceTips?: string[]
  /** How this ties to the letter rounds in CreditClear */
  letterRoundHint: string
}

const GUIDES: Record<IssueId, IssueActionGuide> = {
  late: {
    issueId: 'late',
    headline: 'Late payment history',
    summary:
      'You either prove the late notation is wrong or incomplete, bring the account current and ask the creditor for a goodwill adjustment, or wait for accurate aging.',
    steps: [
      'Pull your free reports from all three bureaus and screenshot the exact late months and balance shown.',
      'Compare to your bank records, statements, or payment confirmations. If the bureau shows late payments you actually made on time, that is a dispute under the FCRA.',
      'If the late pay is technically accurate but was caused by hardship you have since resolved, consider a goodwill letter to the creditor (not a legal requirement for them to help).',
      'Mail your Round 1 bureau dispute letters from CreditClear, then wait for results before Round 2 (method of verification) or Round 3 (furnisher).',
      'Keep accounts current going forward — recent on-time history is the strongest signal you can add.',
    ],
    evidenceTips: ['Bank transfer confirmations', 'Creditor portal payment history', 'Emails or letters showing payoff or arrangement'],
    letterRoundHint: 'Round 1: bureau dispute. Round 2: MOV if they “verify” without proof. Round 3: furnisher direct dispute under §1681s-2(b). Goodwill is optional if you are not disputing accuracy.',
  },
  coll: {
    issueId: 'coll',
    headline: 'Collection accounts',
    summary:
      'Validate the debt with the collector if within time limits, dispute inaccurate reporting with the bureaus, and keep proof of every communication.',
    steps: [
      'Identify the original creditor and balance on your report and match them to any letters or calls you received.',
      'If the collection is new to you or the amount looks wrong, send a written debt validation request to the collector (FDCPA §1692g) within the statutory window when applicable.',
      'Dispute inaccurate or unverifiable items with each bureau using your generated Round 1 letters.',
      'Do not ignore court papers — this guidance is about credit reporting, not lawsuits.',
      'Save certified mail receipts and copies of every letter you send.',
    ],
    evidenceTips: ['Validation request sent certified', 'Bureau dispute responses', 'Settlement or payoff letters'],
    letterRoundHint: 'Use validation letter type for the collector; bureau rounds 1–3 for tradeline accuracy; CFPB draft only after you have a paper trail.',
  },
  inq: {
    issueId: 'inq',
    headline: 'Hard inquiries',
    summary:
      'Remove inquiries that are duplicate, unauthorized, or reported beyond permissible retention — not every inquiry is removable.',
    steps: [
      'List each hard inquiry with date and creditor name from each bureau report.',
      'For any inquiry you did not authorize, file an identity-theft report with the FTC and consider a fraud alert or security freeze.',
      'Dispute with the bureau that shows the error, naming the inquiry and why it is wrong (wrong company, duplicate pull, or no permissible purpose).',
      'If an inquiry is legitimate, it will generally remain until it ages off — focus disputes on factual errors only.',
    ],
    evidenceTips: ['Application denials', 'Screenshots showing you did not apply', 'Police report for identity theft if applicable'],
    letterRoundHint: 'Round 1 bureau dispute is usually enough for clear errors; follow with MOV if they verify without explanation.',
  },
  id: {
    issueId: 'id',
    headline: 'Identity and header errors',
    summary:
      'Separate your file from another person’s data, fix merged or mixed files, and correct wrong names, addresses, or DOB.',
    steps: [
      'Collect government ID and proof of address that matches what you want on file.',
      'Dispute each bureau with specific wrong names, addresses, or accounts that are not yours.',
      'Request a free copy of your disclosure after disputes complete to confirm corrections.',
      'If mixed files persist, document every contact and consider escalation (CFPB complaint draft in-app) with your paper trail.',
    ],
    evidenceTips: ['Driver license or passport', 'Utility bill or lease', 'Prior bureau correspondence'],
    letterRoundHint: 'Identity disputes often need Round 1 on all three bureaus simultaneously; keep wording factual and reference file numbers if shown.',
  },
  dup: {
    issueId: 'dup',
    headline: 'Duplicate accounts',
    summary:
      'Show the same debt is listed more than once so the bureau can merge or delete the extra tradeline after verification.',
    steps: [
      'Print or PDF the report pages where the same creditor or balance appears twice.',
      'Note account numbers, open dates, and balances for each duplicate line.',
      'Dispute stating clearly that these are duplicate tradelines for the same obligation.',
      'If one line updates but the duplicate remains, use Round 2 (MOV) to ask how each line was verified.',
    ],
    evidenceTips: ['Side-by-side screenshots', 'Single loan agreement showing one account'],
    letterRoundHint: 'Start with Round 1 bureau letters; duplicates often resolve in one cycle if the bureau confirms one tradeline is erroneous.',
  },
  bal: {
    issueId: 'bal',
    headline: 'Wrong balances or limits',
    summary:
      'Prove the correct balance, limit, or high balance with statements and ask the bureau and furnisher to correct or delete unverifiable data.',
    steps: [
      'Gather the most recent creditor statement showing balance and credit limit (for revolving accounts).',
      'Compare to each bureau — note any mismatch in balance, limit, or payment amount.',
      'Dispute with specific numbers: what the report shows vs. what your evidence shows.',
      'If the furnisher confirms an error, the bureau should update; if not, proceed to furnisher direct dispute (Round 3).',
    ],
    evidenceTips: ['Monthly statements', 'Payoff letters', 'Screenshots of creditor portal'],
    letterRoundHint: 'Round 1 at the bureau; Round 3 to the furnisher if the creditor is reporting wrong data to the CRAs.',
  },
  bk: {
    issueId: 'bk',
    headline: 'Bankruptcy reporting',
    summary:
      'Ensure chapter, dates, and status match the court record; obsolete bankruptcies must fall off on time.',
    steps: [
      'Obtain your court filing or PACER docket showing filing date, chapter, and discharge or dismissal.',
      'Compare to what each bureau reports — including liability amounts and status.',
      'Dispute any date or status that does not match the court record.',
      'Know the maximum reporting periods for Chapter 7 and 13 — dispute if the item remains past those limits.',
    ],
    evidenceTips: ['Discharge order', 'Case number and court name'],
    letterRoundHint: 'Use factual disputes referencing court documents; MOV if the bureau insists on verification without documentation.',
  },
  repo: {
    issueId: 'repo',
    headline: 'Repossession or surrender',
    summary:
      'Verify dates, balance, and status against your loan documents and state law; dispute material inaccuracies.',
    steps: [
      'Locate your loan agreement and any repossession or voluntary surrender paperwork.',
      'Check reported balance, date, and status against what actually happened.',
      'Dispute incorrect facts with the bureau; use furnisher dispute if the lender is reporting wrong information.',
      'Keep records of any settlement or deficiency balance after repossession.',
    ],
    evidenceTips: ['Loan statements', 'Repossession notices', 'Payoff or settlement letters'],
    letterRoundHint: 'Bureau first, then furnisher if the lender’s data does not match your documents.',
  },
  jud: {
    issueId: 'jud',
    headline: 'Judgments or liens',
    summary:
      'Public records must be accurate and timely; vacated or satisfied judgments should not report as active.',
    steps: [
      'Get a copy of the court judgment or release/satisfaction from the court or your attorney.',
      'Compare amount, filing date, and status on the report.',
      'Dispute if satisfied, vacated, or beyond reporting limits for your situation.',
      'Large errors may need court documentation attached to your dispute.',
    ],
    evidenceTips: ['Court docket printout', 'Satisfaction of judgment'],
    letterRoundHint: 'Precise court citations help — case number, county, and disposition.',
  },
  cl: {
    issueId: 'cl',
    headline: 'Closed account reporting',
    summary:
      'Correct wrong closed dates, charge-off coding, or payment history after the account closed.',
    steps: [
      'Note what the report says for closed date, status, and last payment.',
      'Compare to your last statement or closure letter from the creditor.',
      'Dispute specific inaccuracies — e.g., “shows open” when closed, or wrong closed month.',
      'If the account should show paid and does not, include proof of payoff.',
    ],
    evidenceTips: ['Account closure letters', 'Final statements showing zero balance'],
    letterRoundHint: 'Often resolved in Round 1; MOV if the bureau re-verifies incorrectly.',
  },
  sl: {
    issueId: 'sl',
    headline: 'Student loans',
    summary:
      'Align servicer data with NSLDS/Direct Loan records; fix duplicates between servicers and wrong statuses.',
    steps: [
      'Log into StudentAid.gov and download your loan summary.',
      'Match each tradeline to a real loan — note wrong balances, wrong servicer, or duplicate listings.',
      'Dispute with the bureau with loan IDs and correct status from NSLDS.',
      'Contact the servicer in writing for servicing errors; use bureau and furnisher disputes for reporting errors.',
    ],
    evidenceTips: ['NSLDS export', 'Servicer correspondence', 'IDR or deferment notices'],
    letterRoundHint: 'Multiple bureaus may need parallel disputes; keep servicer name and loan ID consistent in every letter.',
  },
  med: {
    issueId: 'med',
    headline: 'Medical debt',
    summary:
      'Separate billing errors from accurate debts; use HIPAA-aware practices and dispute credit reporting that does not match EOBs or insurance.',
    steps: [
      'Gather explanation of benefits (EOB), insurer denial or payment, and provider bills.',
      'Check whether the debt should have been sent to collections per No Surprises Act or state protections where applicable.',
      'Dispute with the bureau if balance, provider, or insurance status is wrong.',
      'Request validation from the collector if the debt is in collection and you dispute what is owed.',
    ],
    evidenceTips: ['EOBs', 'Insurance cards and policy numbers', 'Payment to provider'],
    letterRoundHint: 'Validation for collectors; bureau rounds for tradeline accuracy; document dates carefully.',
  },
}

export function getIssueActionGuide(issueId: IssueId): IssueActionGuide {
  return GUIDES[issueId]
}

const ALL_ISSUE_IDS = Object.keys(GUIDES) as IssueId[]

export function isValidIssueId(value: string): value is IssueId {
  return ALL_ISSUE_IDS.includes(value as IssueId)
}

/** DOM id for each issue row in `DisputeIssueActionPanel` (deep links + scroll target). */
export const ISSUE_GUIDE_ID_PREFIX = 'issue-guide-'

export function issueGuideElementId(issueId: IssueId): string {
  return `${ISSUE_GUIDE_ID_PREFIX}${issueId}`
}

/** Window event so letter cards can open a guide even when the hash is unchanged. */
export const OPEN_ISSUE_GUIDE_EVENT = 'creditclear:open-issue-guide' as const

export interface OpenIssueGuideDetail {
  issueId: IssueId
}

/** Updates the URL hash and notifies `DisputeIssueActionPanel` to expand + scroll. */
export function openIssueGuideNavigation(issueId: IssueId): void {
  if (typeof window === 'undefined') return
  const id = issueGuideElementId(issueId)
  window.history.replaceState(null, '', `#${id}`)
  window.dispatchEvent(new CustomEvent<OpenIssueGuideDetail>(OPEN_ISSUE_GUIDE_EVENT, { detail: { issueId } }))
}

/** Optional account context line for the panel header */
export function formatIssueAccountHint(detail: IssueAccountDetail | undefined): string | null {
  if (!detail?.creditorName?.trim()) return null
  const parts = [detail.creditorName.trim()]
  if (detail.accountLast4?.trim()) parts.push(`···${detail.accountLast4.trim()}`)
  return parts.join(' ')
}
