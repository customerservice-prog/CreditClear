/**
 * Six FCRA / FDCPA-aligned letter templates. Pure functions: feed in the
 * normalized request payload pieces and a target agency/issue, get the body
 * text back. No AI, no DB, no I/O.
 *
 * Each template returns the FULL letter body (header + addresses + body +
 * sign-off). The generator wraps it into the SSE letter envelope.
 *
 * Legal note: these are document-assistance templates only, not legal advice.
 * Every template names the statute it relies on (FCRA §611, §1681s-2(b),
 * FDCPA §1692g, etc.) and instructs the user to verify accuracy before
 * mailing. No promises of removal or score outcomes are made.
 */

import { BUREAU_MAILING } from './bureauMail.js'

export const LETTER_TYPES = /** @type {const} */ ([
  'bureau_initial',
  'mov',
  'furnisher',
  'validation',
  'goodwill',
  'cfpb',
])

export const LETTER_TYPE_META = {
  bureau_initial: {
    label: 'Bureau initial dispute',
    citation: 'FCRA §611 · 15 U.S.C. §1681i',
    targetKind: 'bureau',
    description:
      'Round 1 letter mailed to the bureau requesting a reasonable reinvestigation of the disputed item.',
  },
  mov: {
    label: 'Method of verification',
    citation: 'FCRA §611(a)(7)',
    targetKind: 'bureau',
    description:
      'Round 2 follow-up sent after the bureau "verified" an item — demands disclosure of how they verified.',
  },
  furnisher: {
    label: 'Furnisher direct dispute',
    citation: 'FCRA §1681s-2(b)',
    targetKind: 'furnisher',
    description:
      'Round 3 letter mailed to the data furnisher (the original creditor or collector). Triggers the §1681s-2(b) investigation duty.',
  },
  validation: {
    label: 'Debt validation',
    citation: 'FDCPA §809 · 15 U.S.C. §1692g',
    targetKind: 'collector',
    description:
      'Sent to a collection agency within 30 days of first contact. Requires validation before further collection activity.',
  },
  goodwill: {
    label: 'Goodwill request',
    citation: 'No statute — courtesy request',
    targetKind: 'creditor',
    description:
      'Sent to the original creditor when a late payment is technically accurate but contextually disputable.',
  },
  cfpb: {
    label: 'CFPB complaint draft',
    citation: 'consumerfinance.gov/complaint',
    targetKind: 'cfpb',
    description:
      'Round 4 escalation. We generate the complaint text; the user submits it on the CFPB portal.',
  },
}

const AGENCY_NAMES = {
  equifax: 'Equifax',
  experian: 'Experian',
  transunion: 'TransUnion',
}

/**
 * @typedef {object} BuildLetterArgs
 * @property {keyof typeof LETTER_TYPE_META} type
 * @property {'equifax'|'experian'|'transunion'} agency
 * @property {object} info  Consumer info (firstName, lastName, address, city, state, zip, phone, email, dob, ssn)
 * @property {{ label: string, icon?: string }} issueMeta
 * @property {object|null} issueDetail  Step 3 per-issue row (creditorName, accountLast4, amountOrBalance, reportedDate, disputeReason)
 * @property {Array<{ file_name: string }>} forBureau Uploaded files attributed to this agency
 */

/**
 * @param {BuildLetterArgs} args
 * @returns {string}
 */
export function buildLetterText(args) {
  const type = LETTER_TYPES.includes(args.type) ? args.type : 'bureau_initial'
  switch (type) {
    case 'mov':
      return buildMovLetter(args)
    case 'furnisher':
      return buildFurnisherLetter(args)
    case 'validation':
      return buildValidationLetter(args)
    case 'goodwill':
      return buildGoodwillLetter(args)
    case 'cfpb':
      return buildCfpbComplaint(args)
    case 'bureau_initial':
    default:
      return buildBureauInitialLetter(args)
  }
}

export function letterSubject({ type, agency, issueMeta }) {
  const agencyName = AGENCY_NAMES[agency] || agency
  const meta = LETTER_TYPE_META[type] || LETTER_TYPE_META.bureau_initial
  if (type === 'cfpb') {
    return `CFPB complaint draft — ${agencyName} · ${issueMeta.label}`
  }
  return `${agencyName} — ${meta.label}: ${issueMeta.label}`
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

function buildBureauInitialLetter({ agency, info, issueMeta, issueDetail, forBureau }) {
  const agencyName = AGENCY_NAMES[agency] || agency
  const bureauLines = BUREAU_MAILING[agency] || [agencyName]
  const lines = [
    letterDate(),
    '',
    ...consumerHeader(info),
    '',
    ...bureauLines,
    '',
    `Re: Fair Credit Reporting Act dispute — ${issueMeta.label}`,
    '',
    'Dear Sir or Madam,',
    '',
    'For verification of my identity (please match to my consumer file):',
    ...identityLines(info),
    '',
    'I am formally disputing the following item(s) on my consumer file pursuant to my rights under the Fair Credit Reporting Act, 15 U.S.C. § 1681i. I request a reasonable reinvestigation of each disputed item, written results of the reinvestigation, and a free updated disclosure of my consumer file.',
    '',
    accountSpecificParagraph(issueMeta, issueDetail) ||
      `The category in dispute is "${issueMeta.label}" as it appears on my ${agencyName} consumer file.`,
    '',
    'Under §611, you must notify any furnisher of the dispute within five business days, complete the reinvestigation within 30 days (45 days if I provide additional information during the dispute window), and delete or correct any item that cannot be verified as accurate and complete.',
    '',
    attachmentsLine(forBureau),
    '',
    'Please send the reinvestigation results and an updated file disclosure to the address above. I am keeping a copy of this dispute for my records.',
    '',
    'Respectfully,',
    '',
    fullName(info),
    ...consumerSignBlock(info),
  ]
  return joinClean(lines)
}

function buildMovLetter({ agency, info, issueMeta, issueDetail }) {
  const agencyName = AGENCY_NAMES[agency] || agency
  const bureauLines = BUREAU_MAILING[agency] || [agencyName]
  const lines = [
    letterDate(),
    '',
    ...consumerHeader(info),
    '',
    ...bureauLines,
    '',
    `Re: Method-of-verification request under FCRA §611(a)(7) — ${issueMeta.label}`,
    '',
    'Dear Sir or Madam,',
    '',
    'I previously disputed the item(s) described below and you returned the result "verified" without describing how the verification was performed. Pursuant to 15 U.S.C. § 1681i(a)(7), please disclose, within fifteen (15) days of receipt of this request:',
    '',
    '  1. The business name, address, and telephone number of every furnisher you contacted to verify the item.',
    '  2. The full description of the procedure you used to verify the item, including the names and titles of every individual who performed the verification.',
    '  3. Copies of every document you received, reviewed, or relied on during the reinvestigation.',
    '',
    'For verification of my identity:',
    ...identityLines(info),
    '',
    accountSpecificParagraph(issueMeta, issueDetail) ||
      `The previously-disputed category was "${issueMeta.label}" on my ${agencyName} consumer file.`,
    '',
    'If you cannot or will not provide the §611(a)(7) disclosures, you have not completed a reasonable reinvestigation as a matter of law and the item must be deleted from my consumer file. Please send the disclosures and an updated file copy to the address above.',
    '',
    'Respectfully,',
    '',
    fullName(info),
    ...consumerSignBlock(info),
  ]
  return joinClean(lines)
}

function buildFurnisherLetter({ agency, info, issueMeta, issueDetail }) {
  const agencyName = AGENCY_NAMES[agency] || agency
  const lines = [
    letterDate(),
    '',
    ...consumerHeader(info),
    '',
    '[Furnisher / Original Creditor name]',
    '[Furnisher mailing address — confirm at the company\'s consumer-disputes page]',
    '[City, State ZIP]',
    '',
    `Re: Direct dispute under FCRA §1681s-2(b) — ${issueMeta.label}`,
    '',
    'To Whom It May Concern,',
    '',
    `I am disputing information you have furnished about my account to ${agencyName} (and any other consumer reporting agency to which you furnish data) under the Fair Credit Reporting Act, 15 U.S.C. § 1681s-2(b).`,
    '',
    accountSpecificParagraph(issueMeta, issueDetail) ||
      `The disputed category is "${issueMeta.label}". If your records list this account under a slightly different name or number, please match by my identity information below.`,
    '',
    'For verification of my identity:',
    ...identityLines(info),
    '',
    'Under §1681s-2(b), upon receipt of a notice of dispute, you must:',
    '  1. Conduct your own investigation of the disputed information;',
    '  2. Review all relevant information I have provided;',
    '  3. Report the results of your investigation to every consumer reporting agency to which you furnished the inaccurate information; and',
    '  4. Modify, delete, or permanently block the reporting of any item you cannot verify as accurate and complete.',
    '',
    'Please mail your investigation results and confirmation of any modification, deletion, or block to the address above within thirty (30) days. I am keeping a copy of this dispute for my records and reserve all rights under the FCRA, including those under §1681n and §1681o.',
    '',
    'Respectfully,',
    '',
    fullName(info),
    ...consumerSignBlock(info),
  ]
  return joinClean(lines)
}

function buildValidationLetter({ info, issueMeta, issueDetail }) {
  const lines = [
    letterDate(),
    '',
    ...consumerHeader(info),
    '',
    '[Collection agency name]',
    '[Collection agency mailing address]',
    '[City, State ZIP]',
    '',
    `Re: Debt validation request under FDCPA §809 — ${issueMeta.label}`,
    '',
    'To Whom It May Concern,',
    '',
    'This is my written request, made pursuant to 15 U.S.C. § 1692g of the Fair Debt Collection Practices Act, that you validate the debt you are attempting to collect from me. Until you provide the validation described below, you must cease all collection activity.',
    '',
    accountSpecificParagraph(issueMeta, issueDetail) ||
      `The account category at issue is "${issueMeta.label}". Please confirm by my identity below if your records list this account under a slightly different name.`,
    '',
    'Validation must include each of the following:',
    '  1. The amount of the debt (with itemization of principal, interest, and fees);',
    '  2. The name and address of the original creditor;',
    '  3. Documentation of your right to collect this debt (assignment chain or signed agreement);',
    '  4. The date the original creditor charged off or assigned the account; and',
    '  5. A statement of the statute of limitations applicable in my state of residence.',
    '',
    'For verification of my identity:',
    ...identityLines(info),
    '',
    'Please cease any reporting of this debt to the consumer reporting agencies until validation is provided. Continued collection activity, or continued reporting of this debt, before validation is delivered violates §1692g(b) and may also violate §1681s-2 of the FCRA.',
    '',
    'Respectfully,',
    '',
    fullName(info),
    ...consumerSignBlock(info),
  ]
  return joinClean(lines)
}

function buildGoodwillLetter({ info, issueMeta, issueDetail }) {
  const lines = [
    letterDate(),
    '',
    ...consumerHeader(info),
    '',
    '[Original creditor name]',
    'Customer Service / Credit Bureau Reporting',
    '[Creditor mailing address]',
    '[City, State ZIP]',
    '',
    `Re: Goodwill courtesy adjustment request — ${issueMeta.label}`,
    '',
    'To Whom It May Concern,',
    '',
    accountSpecificParagraph(issueMeta, issueDetail) ||
      `I am writing about a "${issueMeta.label}" item on my account with you that is currently being reported to the consumer reporting agencies.`,
    '',
    'I am not disputing the accuracy of this item. I am asking, as a courtesy and in recognition of my otherwise consistent payment history with you, that you consider a goodwill adjustment to remove this item from my consumer file. The circumstances that led to the issue have been resolved, and continued reporting will materially affect my ability to qualify for housing or refinancing in the near term.',
    '',
    'I understand you are not legally required to grant this request. I would be grateful for any consideration, and for confirmation in writing of the outcome of your decision.',
    '',
    'For verification of my identity:',
    ...identityLines(info),
    '',
    'Thank you for your time. I am keeping a copy of this letter for my records.',
    '',
    'With appreciation,',
    '',
    fullName(info),
    ...consumerSignBlock(info),
  ]
  return joinClean(lines)
}

function buildCfpbComplaint({ agency, info, issueMeta, issueDetail }) {
  const agencyName = AGENCY_NAMES[agency] || agency
  const lines = [
    'CFPB COMPLAINT — DRAFT',
    'Submit at: https://www.consumerfinance.gov/complaint/',
    '',
    `Company complained against: ${agencyName}`,
    `Issue category: ${issueMeta.label}`,
    '',
    '— What happened (paste this into the "What happened?" field) —',
    '',
    accountSpecificParagraph(issueMeta, issueDetail) ||
      `I have an item on my ${agencyName} consumer report in the category "${issueMeta.label}" that I believe is inaccurate or incomplete.`,
    '',
    `I disputed this item directly with ${agencyName} under the Fair Credit Reporting Act (15 U.S.C. § 1681i). After my dispute, ${agencyName} either failed to respond within the statutory 30-day window, returned a "verified" result without describing how the item was verified (in violation of §611(a)(7)), or did not delete or correct the item even though it remained inaccurate or unverifiable.`,
    '',
    'Per FCRA §611(a)(7), the consumer reporting agency was required to disclose the method of verification on request. Per §611(a)(5), any item that cannot be verified as accurate and complete must be deleted. Neither obligation has been honored in my case.',
    '',
    '— What would resolve the issue (paste into the "What would be a fair resolution?" field) —',
    '',
    `Please direct ${agencyName} to delete the disputed item from my consumer file and send me a free updated file disclosure confirming the deletion. If the item is corrected rather than deleted, please direct ${agencyName} to send me notice of the specific change made and the source the change was based on.`,
    '',
    '— Consumer information (CFPB form fields) —',
    '',
    `Full name: ${fullName(info)}`,
    `Mailing address: ${joinIfBoth(info.address, joinIfBoth(info.city, joinIfBoth(info.state, info.zip)))}`,
    info.email ? `Email: ${info.email}` : '',
    info.phone ? `Phone: ${info.phone}` : '',
    '',
    'Note: Submit the complaint at consumerfinance.gov/complaint. Keep the CFPB tracking number — the bureau is required to respond through the portal within 15 calendar days.',
  ]
  return joinClean(lines)
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function consumerHeader(info) {
  const street = (info.address || '').trim()
  const cityLine = [info.city, info.state].filter(Boolean).join(', ').trim()
  const zip = (info.zip || '').trim()
  const cityZip = [cityLine, zip].filter(Boolean).join(' ').trim()
  return [fullName(info), street, cityZip, '', info.phone ? `Phone: ${info.phone}` : '', info.email ? `Email: ${info.email}` : '']
}

function consumerSignBlock(info) {
  const street = (info.address || '').trim()
  const cityLine = [info.city, info.state].filter(Boolean).join(', ').trim()
  const zip = (info.zip || '').trim()
  const cityZip = [cityLine, zip].filter(Boolean).join(' ').trim()
  const out = [street, cityZip]
  if (info.phone) out.push(`Phone: ${info.phone}`)
  if (info.email) out.push(`Email: ${info.email}`)
  return out
}

function identityLines(info) {
  const out = [`- Full name: ${fullName(info)}`]
  if (info.dob) out.push(`- Date of birth: ${info.dob}`)
  if (info.ssn) out.push(`- Social Security number (last four digits only): ${info.ssn}`)
  const street = (info.address || '').trim()
  const cityLine = [info.city, info.state].filter(Boolean).join(', ').trim()
  const zip = (info.zip || '').trim()
  const mailing = [street, [cityLine, zip].filter(Boolean).join(' ')].filter(Boolean).join(', ')
  if (mailing) out.push(`- Current mailing address: ${mailing}`)
  return out
}

function accountSpecificParagraph(issueMeta, issueDetail) {
  if (!issueDetail?.creditorName?.trim()) {
    return ''
  }
  const bits = [
    `The account at issue concerns "${issueDetail.creditorName.trim()}" as reported on my file for the dispute category "${issueMeta.label}".`,
  ]
  if (issueDetail.accountLast4?.trim()) {
    bits.push(`Account reference (as reported / last digits): ${issueDetail.accountLast4.trim()}.`)
  }
  if (issueDetail.amountOrBalance?.trim()) {
    bits.push(`Balance or amount shown: ${issueDetail.amountOrBalance.trim()}.`)
  }
  if (issueDetail.reportedDate?.trim()) {
    bits.push(`Relevant date or status period: ${issueDetail.reportedDate.trim()}.`)
  }
  if (issueDetail.disputeReason?.trim()) {
    bits.push(`Summary of my position: ${issueDetail.disputeReason.trim()}`)
  }
  return bits.join(' ')
}

function attachmentsLine(forBureau) {
  if (!forBureau || forBureau.length === 0) return ''
  return `Attached or referenced materials include credit-report file(s) for review: ${forBureau
    .map((u) => u.file_name)
    .join('; ')}.`
}

function fullName(info) {
  return `${info?.firstName || ''} ${info?.lastName || ''}`.trim() || 'Consumer'
}

function letterDate() {
  return new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

function joinIfBoth(a, b) {
  if (!a) return b || ''
  if (!b) return a
  return `${a}, ${b}`
}

function joinClean(lines) {
  return lines
    .filter((line, i, arr) => !(line === '' && arr[i + 1] === ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
