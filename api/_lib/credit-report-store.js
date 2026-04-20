/**
 * Persist a {@link ParsedReport} (from credit-report-parser.js) into the
 * credit_reports / tradelines / report_inquiries / report_public_records
 * tables. Runs server-side with the service-role Supabase client; RLS is
 * still enforced because every row carries an explicit user_id.
 *
 * Returns the inserted credit_reports id plus child counts so the API
 * endpoint can report them back to the UI without doing additional reads.
 */

import { ApiError } from './http.js'

/**
 * @typedef {import('./credit-report-parser.js').ParsedReport} ParsedReport
 */

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} client  service-role client
 * @param {object} args
 * @param {string} args.userId
 * @param {ParsedReport} args.parsed
 * @param {string|null} [args.uploadId]
 * @param {string|null} [args.disputeId]
 * @param {'upload'|'aggregator'|'manual'} [args.source='upload']
 */
export async function persistParsedReport(client, args) {
  const { userId, parsed, uploadId = null, disputeId = null, source = 'upload' } = args

  if (!parsed || !parsed.bureau) {
    throw new ApiError(422, 'No bureau could be detected in the report.', { expose: true })
  }

  const reportInsert = await client
    .from('credit_reports')
    .insert({
      user_id: userId,
      dispute_id: disputeId,
      upload_id: uploadId,
      bureau: parsed.bureau,
      source,
      report_date: parsed.reportDate,
      raw: parsed.raw || {},
    })
    .select('id, created_at')
    .single()

  if (reportInsert.error || !reportInsert.data) {
    throw new ApiError(500, 'Could not save the parsed credit report.', { expose: false })
  }

  const reportId = reportInsert.data.id

  // Replace any prior child rows for this report id (idempotent re-parse).
  await client.from('tradelines').delete().eq('report_id', reportId)
  await client.from('report_inquiries').delete().eq('report_id', reportId)
  await client.from('report_public_records').delete().eq('report_id', reportId)

  const tradelineRows = (parsed.tradelines || []).map((t) => ({
    report_id: reportId,
    user_id: userId,
    creditor: t.creditor,
    account_last4: t.accountLast4,
    account_type: t.accountType,
    account_status: t.accountStatus,
    payment_status: t.paymentStatus,
    worst_delinquency: t.worstDelinquency,
    balance_cents: t.balanceCents,
    high_balance_cents: t.highBalanceCents,
    credit_limit_cents: t.creditLimitCents,
    past_due_cents: t.pastDueCents,
    monthly_payment_cents: t.monthlyPaymentCents,
    opened_on: t.openedOn,
    reported_on: t.reportedOn,
    closed_on: t.closedOn,
    payment_history: t.paymentHistory || [],
    raw: t.raw || {},
  }))

  if (tradelineRows.length > 0) {
    const insertResult = await client.from('tradelines').insert(tradelineRows)
    if (insertResult.error) {
      throw new ApiError(500, 'Could not save tradelines.', { expose: false })
    }
  }

  const inquiryRows = (parsed.inquiries || []).map((i) => ({
    report_id: reportId,
    user_id: userId,
    inquirer: i.inquirer,
    inquiry_type: i.inquiryType,
    inquired_on: i.inquiredOn,
    raw: i.raw || {},
  }))

  if (inquiryRows.length > 0) {
    const insertResult = await client.from('report_inquiries').insert(inquiryRows)
    if (insertResult.error) {
      throw new ApiError(500, 'Could not save inquiries.', { expose: false })
    }
  }

  const publicRecordRows = (parsed.publicRecords || []).map((p) => ({
    report_id: reportId,
    user_id: userId,
    record_type: p.recordType,
    court: p.court,
    reference_number: p.referenceNumber,
    filed_on: p.filedOn,
    resolved_on: p.resolvedOn,
    amount_cents: p.amountCents,
    status: p.status,
    raw: p.raw || {},
  }))

  if (publicRecordRows.length > 0) {
    const insertResult = await client.from('report_public_records').insert(publicRecordRows)
    if (insertResult.error) {
      throw new ApiError(500, 'Could not save public records.', { expose: false })
    }
  }

  return {
    reportId,
    bureau: parsed.bureau,
    source,
    tradelineCount: tradelineRows.length,
    inquiryCount: inquiryRows.length,
    publicRecordCount: publicRecordRows.length,
    createdAt: reportInsert.data.created_at,
  }
}

/**
 * Find the most recent existing credit_reports row for a given upload, so a
 * re-parse replaces it instead of stacking. Returns null if none exists.
 */
export async function findExistingReportForUpload(client, { userId, uploadId }) {
  if (!uploadId) return null
  const result = await client
    .from('credit_reports')
    .select('id')
    .eq('user_id', userId)
    .eq('upload_id', uploadId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (result.error || !result.data) return null
  return result.data.id
}

/** Cascading-delete helper used when a re-parse should replace a prior row. */
export async function deleteExistingReport(client, reportId) {
  if (!reportId) return
  await client.from('credit_reports').delete().eq('id', reportId)
}
