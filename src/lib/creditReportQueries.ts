import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  CreditReportRow,
  ReportInquiryRow,
  ReportPublicRecordRow,
  TradelineRow,
} from '../types'

export interface CreditReportSummary
  extends Pick<CreditReportRow, 'id' | 'bureau' | 'source' | 'pulled_at' | 'report_date' | 'upload_id'> {
  tradeline_count: number
  inquiry_count: number
  public_record_count: number
}

/**
 * Lists credit_reports for the current user with embedded child counts.
 * Returns an empty array (not an error) if the credit_reports table does
 * not yet exist on this database — handy for environments where the PR 2
 * migration has not yet been applied.
 */
export async function listCreditReportsForCurrentUser(
  supabase: SupabaseClient,
): Promise<{ data: CreditReportSummary[]; error: { message: string } | null }> {
  const result = await supabase
    .from('credit_reports')
    .select(
      'id, bureau, source, pulled_at, report_date, upload_id, tradelines(count), report_inquiries(count), report_public_records(count)',
    )
    .order('pulled_at', { ascending: false })

  if (result.error) {
    if (isMissingRelation(result.error)) {
      return { data: [], error: null }
    }
    return { data: [], error: { message: result.error.message } }
  }

  const rows = (result.data ?? []) as Array<{
    id: string
    bureau: 'equifax' | 'experian' | 'transunion'
    source: 'upload' | 'aggregator' | 'manual'
    pulled_at: string
    report_date: string | null
    upload_id: string | null
    tradelines: Array<{ count: number }> | null
    report_inquiries: Array<{ count: number }> | null
    report_public_records: Array<{ count: number }> | null
  }>

  return {
    data: rows.map((row) => ({
      id: row.id,
      bureau: row.bureau,
      source: row.source,
      pulled_at: row.pulled_at,
      report_date: row.report_date,
      upload_id: row.upload_id,
      tradeline_count: row.tradelines?.[0]?.count ?? 0,
      inquiry_count: row.report_inquiries?.[0]?.count ?? 0,
      public_record_count: row.report_public_records?.[0]?.count ?? 0,
    })),
    error: null,
  }
}

/**
 * Loads a single credit_reports row with all child rows expanded. Used by the
 * (forthcoming) report viewer / Step 3 tradeline picker.
 */
export async function getCreditReportDetail(
  supabase: SupabaseClient,
  reportId: string,
): Promise<{
  report: CreditReportRow | null
  tradelines: TradelineRow[]
  inquiries: ReportInquiryRow[]
  publicRecords: ReportPublicRecordRow[]
  error: { message: string } | null
}> {
  const reportResult = await supabase.from('credit_reports').select('*').eq('id', reportId).maybeSingle()
  if (reportResult.error) {
    return {
      report: null,
      tradelines: [],
      inquiries: [],
      publicRecords: [],
      error: { message: reportResult.error.message },
    }
  }

  const [tradelines, inquiries, publicRecords] = await Promise.all([
    supabase.from('tradelines').select('*').eq('report_id', reportId).order('reported_on', { ascending: false }),
    supabase.from('report_inquiries').select('*').eq('report_id', reportId).order('inquired_on', { ascending: false }),
    supabase.from('report_public_records').select('*').eq('report_id', reportId).order('filed_on', { ascending: false }),
  ])

  return {
    report: (reportResult.data as CreditReportRow) ?? null,
    tradelines: (tradelines.data as TradelineRow[]) ?? [],
    inquiries: (inquiries.data as ReportInquiryRow[]) ?? [],
    publicRecords: (publicRecords.data as ReportPublicRecordRow[]) ?? [],
    error: null,
  }
}

function isMissingRelation(error: { message?: string; code?: string } | null) {
  if (!error) return false
  if (error.code === '42P01' || error.code === '42703') return true
  return /relation\s+\".+\"\s+does\s+not\s+exist/i.test(error.message || '')
}
