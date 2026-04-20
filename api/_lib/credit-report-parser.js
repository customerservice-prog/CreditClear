/**
 * Pure, deterministic credit-report parser. No I/O, no DB calls, no PDF
 * decoding — feed it the text already extracted from a PDF (via pdf-parse) and
 * it returns a normalized JSON shape ready to insert into the credit_reports /
 * tradelines / report_inquiries / report_public_records tables.
 *
 * Why pure-text in / structured-out:
 *  - Easy to unit test with synthetic fixtures.
 *  - PR 4 (aggregator stub) will reuse the same normalized output shape.
 *  - The /api/parse-upload endpoint owns the PDF -> text step; this module
 *    owns text -> structure. They evolve independently.
 *
 * The parser is intentionally conservative: it returns nulls (not guesses) for
 * any field it cannot confidently extract, and always preserves the original
 * block in `raw.text` so the user can correct it later.
 */

const BUREAU_SIGNATURES = [
  { id: 'equifax', patterns: [/\bequifax\b/i, /\bmyequifax\b/i, /eport\.equifax\.com/i] },
  {
    id: 'experian',
    patterns: [
      /\bexperian\b/i,
      /experian\.com/i,
      /experiandirect/i,
      /usa\.experian/i,
      /consumer\.experian/i,
      /printable-report\/experian/i,
      /printable-report[^\n]{0,240}\bexperian\b/is,
      /\/mfe\/credit\/printable/i,
      /\/experian\/now\b/i,
      // Consumer site summary / printable views often keep these strings even when the word "Experian" is missing from PDF text extraction.
      /\bself[\s\-]?reported\s+accounts\b/i,
      /\baccounts\s+ever\s+late\b/i,
      /\boverall\s+credit\s+usage\b/i,
      /\bcredit\s+card\s+and\s+credit\s+line\s+debt\b/i,
      /\bfico[\s\u00ae\u2122]*\s*score\s*8\b/i,
    ],
  },
  { id: 'transunion', patterns: [/\btransunion\b/i, /transunion\.com/i, /\btruecredit\b/i] },
]

// Section headers MUST be line-anchored. Otherwise patterns like
// "revolving accounts" would happily match the line break between
// "Account Type: Revolving" and "Account Status: ..." and mis-place the
// section boundary inside a tradeline block.
const SECTION_HEADERS = {
  accounts: [
    /^[\s\u2022\-*]*accounts?\s+(?:in\s+good\s+standing|history|summary|information)\b/im,
    /^[\s\u2022\-*]*account\s+history\b/im,
    /^[\s\u2022\-*]*tradelines?\b/im,
    /^[\s\u2022\-*]*credit\s+accounts?\b/im,
    /^[\s\u2022\-*]*negative\s+accounts?\b/im,
    /^[\s\u2022\-*]*revolving\s+accounts?\b/im,
    /^[\s\u2022\-*]*installment\s+accounts?\b/im,
    /^\s*ACCOUNTS\s*$/m,
  ],
  inquiries: [
    /^[\s\u2022\-*]*credit\s+inquiries\b/im,
    /^[\s\u2022\-*]*recent\s+inquir(?:y|ies)\b/im,
    /^[\s\u2022\-*]*requests\s+for\s+your\s+credit\s+history\b/im,
    /^[\s\u2022\-*]*inquir(?:y|ies)\b/im,
    /^\s*INQUIRIES\s*$/m,
  ],
  publicRecords: [
    /^[\s\u2022\-*]*public\s+records?\b/im,
    /^[\s\u2022\-*]*court\s+records?\b/im,
    /^\s*PUBLIC\s+RECORDS?\s*$/m,
  ],
  personal: [
    /^[\s\u2022\-*]*personal\s+information\b/im,
    /^[\s\u2022\-*]*consumer\s+information\b/im,
    /^\s*PERSONAL\s+INFORMATION\s*$/m,
  ],
}

/** Labels we look for inside a tradeline block. Order = priority. */
const TRADELINE_FIELDS = {
  accountNumber: [
    /account\s*(?:#|number|no\.?)\s*[:\-]?\s*([X\*\d\-\s]{4,30})/i,
    /acct\s*(?:#|number|no\.?)\s*[:\-]?\s*([X\*\d\-\s]{4,30})/i,
  ],
  accountType: [
    /(?:account\s+type|type\s+of\s+account|account\s+kind)\s*[:\-]?\s*([A-Za-z][A-Za-z \/\-]{2,60})/i,
    /\b(revolving|installment|mortgage|auto|student\s+loan|credit\s+card|charge\s+account|line\s+of\s+credit|collection)\b/i,
  ],
  accountStatus: [
    /(?:account\s+status|status)\s*[:\-]?\s*([A-Za-z][A-Za-z \/\-]{2,60})(?=\n|$|\.)/i,
  ],
  paymentStatus: [
    /(?:payment\s+status|pay\s+status)\s*[:\-]?\s*([A-Za-z][A-Za-z \/\-0-9]{2,80})(?=\n|$|\.)/i,
    /\b(pays?\s+as\s+agreed|charge[\s\-]?off|collection|in\s+collection|past\s+due|delinquent|paid|closed\s+by\s+credit\s+grantor|never\s+late|current)\b/i,
  ],
  worstDelinquency: [
    /(?:worst\s+delinquency|highest\s+delinquency|max\s+delinquency)\s*[:\-]?\s*([A-Za-z0-9 \/\-]{2,40})/i,
  ],
  balance: [
    /(?:current\s+balance|balance\s+owed|balance|amount\s+owed|open\s+balance)\s*[:\-]?\s*\$\s*([0-9,]+(?:\.\d+)?)/i,
  ],
  highBalance: [
    /(?:high\s+balance|highest\s+balance|original\s+amount|original\s+loan\s+amount)\s*[:\-]?\s*\$\s*([0-9,]+(?:\.\d+)?)/i,
  ],
  creditLimit: [
    /(?:credit\s+limit|limit\/high\s+balance|limit)\s*[:\-]?\s*\$\s*([0-9,]+(?:\.\d+)?)/i,
  ],
  pastDue: [
    /(?:past\s+due|amount\s+past\s+due)\s*[:\-]?\s*\$\s*([0-9,]+(?:\.\d+)?)/i,
  ],
  monthlyPayment: [
    /(?:monthly\s+payment|scheduled\s+payment|minimum\s+payment)\s*[:\-]?\s*\$\s*([0-9,]+(?:\.\d+)?)/i,
  ],
  openedOn: [
    /(?:date\s+opened|opened|account\s+opened)\s*[:\-]?\s*([\w\-\/]{4,20})/i,
  ],
  reportedOn: [
    /(?:date\s+reported|last\s+reported|reported|date\s+updated)\s*[:\-]?\s*([\w\-\/]{4,20})/i,
  ],
  closedOn: [
    /(?:date\s+closed|closed)\s*[:\-]?\s*([\w\-\/]{4,20})/i,
  ],
}

const PUBLIC_RECORD_TYPES = [
  { id: 'bankruptcy', patterns: [/\bbankruptcy\b/i, /\bchapter\s+(7|11|13)\b/i] },
  { id: 'judgment', patterns: [/\bjudgment\b/i, /\bcivil\s+judgment\b/i] },
  { id: 'lien', patterns: [/\b(?:tax\s+)?lien\b/i] },
  { id: 'foreclosure', patterns: [/\bforeclosure\b/i] },
  { id: 'civil_claim', patterns: [/\bcivil\s+(?:claim|suit)\b/i] },
]

const MAX_TRADELINES = 200
const MAX_INQUIRIES = 200
const MAX_PUBLIC_RECORDS = 50
const MAX_RAW_TEXT = 80_000

/**
 * @typedef {object} ParsedTradeline
 * @property {string|null} creditor
 * @property {string|null} accountLast4
 * @property {string|null} accountType
 * @property {string|null} accountStatus
 * @property {string|null} paymentStatus
 * @property {string|null} worstDelinquency
 * @property {number|null} balanceCents
 * @property {number|null} highBalanceCents
 * @property {number|null} creditLimitCents
 * @property {number|null} pastDueCents
 * @property {number|null} monthlyPaymentCents
 * @property {string|null} openedOn   ISO yyyy-mm-dd
 * @property {string|null} reportedOn ISO yyyy-mm-dd
 * @property {string|null} closedOn   ISO yyyy-mm-dd
 * @property {unknown[]}   paymentHistory
 * @property {Record<string, unknown>} raw
 */

/**
 * @typedef {object} ParsedInquiry
 * @property {string|null} inquirer
 * @property {'hard'|'soft'|'unknown'|null} inquiryType
 * @property {string|null} inquiredOn ISO yyyy-mm-dd
 * @property {Record<string, unknown>} raw
 */

/**
 * @typedef {object} ParsedPublicRecord
 * @property {string|null} recordType
 * @property {string|null} court
 * @property {string|null} referenceNumber
 * @property {string|null} filedOn
 * @property {string|null} resolvedOn
 * @property {number|null} amountCents
 * @property {string|null} status
 * @property {Record<string, unknown>} raw
 */

/**
 * @typedef {object} ParsedReport
 * @property {'equifax'|'experian'|'transunion'} bureau
 * @property {string|null} reportDate ISO yyyy-mm-dd
 * @property {ParsedTradeline[]} tradelines
 * @property {ParsedInquiry[]} inquiries
 * @property {ParsedPublicRecord[]} publicRecords
 * @property {Record<string, unknown>} raw  Normalized text + counts; persisted to credit_reports.raw.
 */

/**
 * Parse a credit-report text blob into structured data.
 * @param {string} text  Output from pdf-parse, or any plain-text bureau report.
 * @param {object} [opts]
 * @param {string} [opts.bureauHint]  Optional bureau id to override detection.
 * @returns {ParsedReport|null}
 */
export function parseCreditReportText(text, opts = {}) {
  if (typeof text !== 'string' || !text.trim()) {
    return null
  }

  const normalized = normalizeText(text)
  const bureau = opts.bureauHint || detectBureau(normalized)
  if (!bureau) {
    return null
  }

  const sections = extractSections(normalized)
  const tradelines = parseTradelines(sections.accounts || normalized)
  const inquiries = parseInquiries(sections.inquiries || normalized)
  const publicRecords = parsePublicRecords(sections.publicRecords || '')
  const reportDate = extractReportDate(normalized)

  return {
    bureau,
    reportDate,
    tradelines: tradelines.slice(0, MAX_TRADELINES),
    inquiries: inquiries.slice(0, MAX_INQUIRIES),
    publicRecords: publicRecords.slice(0, MAX_PUBLIC_RECORDS),
    raw: {
      bureauDetected: bureau,
      sectionsFound: Object.keys(sections),
      textLength: normalized.length,
      text: normalized.slice(0, MAX_RAW_TEXT),
    },
  }
}

export function detectBureau(text) {
  const counts = BUREAU_SIGNATURES.map((sig) => ({
    id: sig.id,
    score: sig.patterns.reduce((acc, pattern) => acc + (pattern.test(text) ? 1 : 0), 0),
  }))
  counts.sort((a, b) => b.score - a.score)
  if (counts[0]?.score > 0) {
    return counts[0].id
  }

  // Last-resort: Experian's printable / "now" report PDFs sometimes extract almost no branding text
  // (logos as images) but still include the FICO 8 header plus summary rows together.
  const hasFico8 = /\bfico[\s\u00ae\u2122]*\s*score\s*8\b/i.test(text)
  const hasExperianSummaryRow =
    /\bself[\s\-]?reported\s+accounts\b/i.test(text) && /\baccounts\s+ever\s+late\b/i.test(text)
  if (hasFico8 && hasExperianSummaryRow) {
    return 'experian'
  }

  return null
}

/**
 * Split the report into known sections by header. Returns an object whose
 * keys are subset of: accounts, inquiries, publicRecords, personal.
 * Each value is the slice of text *between* that section's header and the
 * next recognized header (or end of document).
 */
export function extractSections(text) {
  const headers = []
  for (const [name, patterns] of Object.entries(SECTION_HEADERS)) {
    for (const pattern of patterns) {
      const match = pattern.exec(text)
      if (match && typeof match.index === 'number') {
        headers.push({ name, index: match.index, length: match[0].length })
        break
      }
    }
  }
  headers.sort((a, b) => a.index - b.index)

  /** @type {Record<string, string>} */
  const sections = {}
  for (let i = 0; i < headers.length; i += 1) {
    const start = headers[i].index + headers[i].length
    const end = headers[i + 1]?.index ?? text.length
    const slice = text.slice(start, end).trim()
    if (slice) {
      sections[headers[i].name] = slice
    }
  }
  return sections
}

/**
 * Heuristic block splitter: finds tradeline blocks within an "Accounts" section
 * and extracts canonical fields from each. Conservative — when a block does
 * not have at least a creditor name OR an account number, it is skipped.
 */
export function parseTradelines(text) {
  if (!text || typeof text !== 'string') return []

  const blocks = splitTradelineBlocks(text)
  const tradelines = []

  for (const block of blocks) {
    const creditor = extractCreditorName(block)
    const accountLast4 = extractAccountLast4(block)
    if (!creditor && !accountLast4) {
      continue
    }

    const tradeline = {
      creditor,
      accountLast4,
      accountType: cleanLabel(matchFirst(block, TRADELINE_FIELDS.accountType)),
      accountStatus: cleanLabel(matchFirst(block, TRADELINE_FIELDS.accountStatus)),
      paymentStatus: cleanLabel(matchFirst(block, TRADELINE_FIELDS.paymentStatus)),
      worstDelinquency: cleanLabel(matchFirst(block, TRADELINE_FIELDS.worstDelinquency)),
      balanceCents: dollarsToCents(matchFirst(block, TRADELINE_FIELDS.balance)),
      highBalanceCents: dollarsToCents(matchFirst(block, TRADELINE_FIELDS.highBalance)),
      creditLimitCents: dollarsToCents(matchFirst(block, TRADELINE_FIELDS.creditLimit)),
      pastDueCents: dollarsToCents(matchFirst(block, TRADELINE_FIELDS.pastDue)),
      monthlyPaymentCents: dollarsToCents(matchFirst(block, TRADELINE_FIELDS.monthlyPayment)),
      openedOn: parseDate(matchFirst(block, TRADELINE_FIELDS.openedOn)),
      reportedOn: parseDate(matchFirst(block, TRADELINE_FIELDS.reportedOn)),
      closedOn: parseDate(matchFirst(block, TRADELINE_FIELDS.closedOn)),
      paymentHistory: extractPaymentHistory(block),
      raw: { block: block.slice(0, 4000) },
    }

    tradelines.push(tradeline)
  }

  return dedupeTradelines(tradelines)
}

export function parseInquiries(text) {
  if (!text || typeof text !== 'string') return []

  const inquiries = []
  const lines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean)

  for (const line of lines) {
    if (line.length > 240) continue
    const dateMatch = line.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})|(\d{4}-\d{2}-\d{2})|((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4})/i)
    if (!dateMatch) continue

    const inquiredOn = parseDate(dateMatch[0])
    if (!inquiredOn) continue

    const inquirer = line
      .replace(dateMatch[0], '')
      .replace(/\b(hard|soft|promotional|account\s+review|unknown)\s+inquir(?:y|ies)\b/i, '')
      .replace(/[\-:|,]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    if (!inquirer || inquirer.length < 2) continue

    let inquiryType = 'unknown'
    if (/\bhard\b/i.test(line)) inquiryType = 'hard'
    else if (/\bsoft\b|\bpromotional\b|\baccount\s+review\b/i.test(line)) inquiryType = 'soft'

    inquiries.push({
      inquirer: titleCase(inquirer).slice(0, 160),
      inquiryType,
      inquiredOn,
      raw: { line },
    })
  }

  return inquiries
}

export function parsePublicRecords(text) {
  if (!text || typeof text !== 'string') return []

  const records = []
  // Paragraph split only: bureau public-record listings are usually one record
  // per blank-line-separated block. We do not split mid-paragraph because
  // labels like "Judgment Amount:" would otherwise create false boundaries.
  const blocks = text
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)

  for (const block of blocks) {
    const recordType = detectPublicRecordType(block)
    if (!recordType) continue

    records.push({
      recordType,
      court: cleanLabel(matchFirst(block, [/(?:court|filing\s+court)\s*[:\-]?\s*([A-Za-z][A-Za-z\s\.,'\-]{2,80})/i])),
      referenceNumber: cleanLabel(matchFirst(block, [/(?:case|reference|file)\s*(?:#|number|no\.?)\s*[:\-]?\s*([A-Za-z0-9\-]{3,40})/i])),
      filedOn: parseDate(matchFirst(block, [/(?:filed|date\s+filed|filing\s+date)\s*[:\-]?\s*([\w\-\/]{4,20})/i])),
      resolvedOn: parseDate(matchFirst(block, [/(?:date\s+resolved|resolved|discharged?(?:\s+date)?)\s*[:\-]?\s*([\w\-\/]{4,20})/i])),
      amountCents: dollarsToCents(matchFirst(block, [/(?:judgment\s+amount|liability|amount)\s*[:\-]?\s*\$\s*([0-9,]+(?:\.\d+)?)/i])),
      status: cleanLabel(matchFirst(block, [/(?:status|disposition)\s*[:\-]?\s*([A-Za-z][A-Za-z\s\/\-]{2,60})/i])),
      raw: { block: block.slice(0, 2000) },
    })
  }

  return records
}

export function extractReportDate(text) {
  const patterns = [
    /(?:report\s+date|date\s+of\s+report|generated\s+on|prepared\s+on|issued\s+on)\s*[:\-]?\s*([\w\-\/,\s]{6,30})/i,
    /\b(\d{4}-\d{2}-\d{2})\b/,
    /\b(\d{1,2}\/\d{1,2}\/\d{4})\b/,
  ]
  for (const pattern of patterns) {
    const match = pattern.exec(text)
    if (match) {
      const parsed = parseDate(match[1])
      if (parsed) return parsed
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// helpers (exported for tests)
// ---------------------------------------------------------------------------

export function normalizeText(text) {
  return String(text)
    .replace(/\r\n?/g, '\n')
    .replace(/[\u00A0\u2007\u202F]/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function dollarsToCents(value) {
  if (!value) return null
  const cleaned = String(value).replace(/[^0-9.]/g, '')
  if (!cleaned) return null
  const num = Number.parseFloat(cleaned)
  if (!Number.isFinite(num)) return null
  return Math.round(num * 100)
}

const MONTHS = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
}

export function parseDate(value) {
  if (!value) return null
  const raw = String(value).trim().slice(0, 30)
  if (!raw) return null

  // ISO: 2025-04-19
  let match = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (match) {
    return formatIso(Number(match[1]), Number(match[2]), Number(match[3]))
  }

  // Slash US: 04/19/2025 or 4/19/25
  match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/)
  if (match) {
    const yr = Number(match[3])
    return formatIso(yr < 100 ? 2000 + yr : yr, Number(match[1]), Number(match[2]))
  }

  // Slash MM/YYYY (no day) -- common for date opened
  match = raw.match(/^(\d{1,2})\/(\d{4})/)
  if (match) {
    return formatIso(Number(match[2]), Number(match[1]), 1)
  }

  // Hyphen MM-YYYY
  match = raw.match(/^(\d{1,2})-(\d{4})/)
  if (match) {
    return formatIso(Number(match[2]), Number(match[1]), 1)
  }

  // "April 19, 2025" / "Apr 2025" / "Apr 19 2025"
  match = raw.match(/^([A-Za-z]{3,9})\.?\s+(\d{1,2})?,?\s*(\d{4})/)
  if (match) {
    const month = MONTHS[match[1].toLowerCase().slice(0, 4)] || MONTHS[match[1].toLowerCase().slice(0, 3)]
    if (month) {
      return formatIso(Number(match[3]), month, match[2] ? Number(match[2]) : 1)
    }
  }

  // YYYY only
  match = raw.match(/^(\d{4})$/)
  if (match) {
    return formatIso(Number(match[1]), 1, 1)
  }

  return null
}

function formatIso(year, month, day) {
  if (!Number.isInteger(year) || year < 1900 || year > 2100) return null
  if (!Number.isInteger(month) || month < 1 || month > 12) return null
  if (!Number.isInteger(day) || day < 1 || day > 31) return null
  return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day
    .toString()
    .padStart(2, '0')}`
}

function matchFirst(text, patterns) {
  if (!text || !Array.isArray(patterns)) return null
  for (const pattern of patterns) {
    const match = pattern.exec(text)
    if (match) {
      return match[1] ?? match[0]
    }
  }
  return null
}

function cleanLabel(value) {
  if (value == null) return null
  const trimmed = String(value).replace(/\s+/g, ' ').trim()
  if (!trimmed) return null
  return trimmed.slice(0, 120)
}

function titleCase(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\b([a-z])/g, (m) => m.toUpperCase())
    .trim()
}

/**
 * Split an Accounts section into per-tradeline blocks.
 *
 * Strategy: paragraph-split on blank lines, then keep only paragraphs that
 * contain an account-number marker ("Account Number", "Acct #", etc.). This
 * preserves the creditor-name line that always precedes the account number,
 * which is the foundation extractCreditorName depends on.
 */
export function splitTradelineBlocks(text) {
  return text
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .filter((block) => /(?:account|acct)\s*(?:#|number|no\.?)/i.test(block))
}

const CREDITOR_LINE_PREFIX = /^(?:creditor|account\s+name|company|name)\s*[:\-]\s*/i
const CREDITOR_LINE_SKIP = /^(?:account\s*(?:#|number|no\.?|status|type|name|kind)|acct\s*(?:#|number|no\.?)|date|balance|amount|status|type|past\s+due|credit\s+limit|payment(?:\s+status)?|reported|opened|closed|monthly|high\s+balance|original|limit|pay\s+status|recent\s+payment)/i

/** Pull the most likely creditor name from the top of a tradeline block. */
export function extractCreditorName(block) {
  if (!block) return null
  const lines = block.split(/\n+/).map((line) => line.trim()).filter(Boolean)
  for (const line of lines) {
    let candidate = line.replace(CREDITOR_LINE_PREFIX, '').trim()
    if (!candidate) continue
    if (CREDITOR_LINE_SKIP.test(candidate)) continue
    if (/^[\$\d]/.test(candidate)) continue
    if (candidate.length < 2 || candidate.length > 80) continue
    if (!/[A-Za-z]/.test(candidate)) continue
    return cleanLabel(candidate)
  }
  return null
}

export function extractAccountLast4(block) {
  if (!block) return null
  // Mask patterns first: ****1234, XXXX-1234, XXX***1234, etc.
  const mask = block.match(/(?:[Xx*\u2022]{2,}|\.{3,})\s*[-\s]?\s*(\d{4})\b/)
  if (mask) return mask[1]

  // "Account Number 5178051234567890" — take last 4 if 8+ digits given
  const long = block.match(/(?:account|acct)\s*(?:#|number|no\.?)\s*[:\-]?\s*(\d{8,19})/i)
  if (long) return long[1].slice(-4)

  // "Account Number 1234" — accept exactly 4 digits if explicitly an account number
  const four = block.match(/(?:account|acct)\s*(?:#|number|no\.?)\s*[:\-]?\s*(\d{4})\b/i)
  if (four) return four[1]

  return null
}

export function extractPaymentHistory(block) {
  if (!block) return []
  const codes = []
  const grid = block.match(/(?:payment\s+history|24[\s\-]?month\s+history)[\s\S]{0,1200}/i)
  if (!grid) return []
  const tokens = grid[0].match(/\b(?:OK|30|60|90|120|150|180|CO|CHO|COLL|ND|NR|\*)\b/gi)
  if (!tokens) return []
  for (const token of tokens.slice(0, 60)) {
    codes.push(token.toUpperCase())
  }
  return codes
}

function detectPublicRecordType(block) {
  for (const candidate of PUBLIC_RECORD_TYPES) {
    if (candidate.patterns.some((pattern) => pattern.test(block))) {
      return candidate.id
    }
  }
  return null
}

function dedupeTradelines(tradelines) {
  const seen = new Set()
  const out = []
  for (const t of tradelines) {
    const key = `${t.creditor || ''}|${t.accountLast4 || ''}|${t.balanceCents ?? ''}|${t.openedOn ?? ''}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(t)
  }
  return out
}
