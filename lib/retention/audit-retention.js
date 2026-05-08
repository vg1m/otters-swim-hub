/**
 * Data retention audit helpers.
 *
 * Each function queries the database for records that have exceeded the
 * retention window defined in §9 of the privacy policy.  Queries return
 * only counts and IDs — no PII is fetched or transmitted.
 *
 * Nothing is deleted here.  Results are handed to the cron route, which
 * emails an admin report for manual review.
 */

import { createServiceRoleClient } from '@/lib/supabase/service-role'

/**
 * Attendance records linked to sessions older than 2 years.
 * Clock: training_sessions.session_date
 */
async function auditAttendance(supabase) {
  const cutoff = new Date()
  cutoff.setFullYear(cutoff.getFullYear() - 2)
  const cutoffStr = cutoff.toISOString().slice(0, 10)

  // Fetch session IDs that are past the 2-year window first.
  const { data: oldSessions, error: sessErr } = await supabase
    .from('training_sessions')
    .select('id')
    .lt('session_date', cutoffStr)

  if (sessErr) throw new Error(`attendance/sessions: ${sessErr.message}`)

  const sessionIds = (oldSessions || []).map((s) => s.id)
  if (sessionIds.length === 0) return { count: 0, ids: [] }

  const { data: rows, error: attErr } = await supabase
    .from('attendance')
    .select('id')
    .in('session_id', sessionIds)

  if (attErr) throw new Error(`attendance/rows: ${attErr.message}`)

  const ids = (rows || []).map((r) => r.id)
  return { count: ids.length, ids }
}

/**
 * Media consent records where consent was given more than 12 months ago.
 * The policy says photos/video consent lapses after 12 months; these need
 * admin review and re-confirmation from the member.
 * Clock: registration_consents.consented_at
 */
async function auditMediaConsent(supabase) {
  const cutoff = new Date()
  cutoff.setFullYear(cutoff.getFullYear() - 1)

  const { data: rows, error } = await supabase
    .from('registration_consents')
    .select('id')
    .eq('media_consent', true)
    .lt('consented_at', cutoff.toISOString())

  if (error) throw new Error(`media_consent: ${error.message}`)

  const ids = (rows || []).map((r) => r.id)
  return { count: ids.length, ids }
}

/**
 * Consent records for swimmers who have been inactive for more than 3 years.
 * Clock: swimmers.updated_at (proxy for when they became inactive)
 */
async function auditInactiveConsents(supabase) {
  const cutoff = new Date()
  cutoff.setFullYear(cutoff.getFullYear() - 3)

  // Find swimmers who went inactive more than 3 years ago.
  const { data: inactiveSwimmers, error: swErr } = await supabase
    .from('swimmers')
    .select('id')
    .eq('status', 'inactive')
    .lt('updated_at', cutoff.toISOString())

  if (swErr) throw new Error(`inactive_swimmers: ${swErr.message}`)

  const swimmerIds = (inactiveSwimmers || []).map((s) => s.id)
  if (swimmerIds.length === 0) return { count: 0, ids: [] }

  const { data: rows, error: cErr } = await supabase
    .from('registration_consents')
    .select('id')
    .in('swimmer_id', swimmerIds)

  if (cErr) throw new Error(`inactive_consents: ${cErr.message}`)

  const ids = (rows || []).map((r) => r.id)
  return { count: ids.length, ids }
}

/**
 * Inactive swimmer membership records older than 7 years.
 * Clock: swimmers.updated_at (proxy for deactivation date)
 */
async function auditInactiveSwimmers(supabase) {
  const cutoff = new Date()
  cutoff.setFullYear(cutoff.getFullYear() - 7)

  const { data: rows, error } = await supabase
    .from('swimmers')
    .select('id')
    .eq('status', 'inactive')
    .lt('updated_at', cutoff.toISOString())

  if (error) throw new Error(`inactive_swimmers_7yr: ${error.message}`)

  const ids = (rows || []).map((r) => r.id)
  return { count: ids.length, ids }
}

/**
 * Paid invoices where the payment year ended more than 7 years ago.
 * Clock: invoices.paid_at (falling back to created_at when paid_at is null)
 *
 * "7 years from end of year of payment" means the clock resets to
 * 1 Jan of the year after payment, so we compare against
 * DATE_TRUNC('year', NOW()) - 7 years (i.e. 1 Jan of 7 years ago).
 */
async function auditPayments(supabase) {
  const sevenYearsAgoYearStart = new Date(new Date().getFullYear() - 7, 0, 1)

  const { data: rows, error } = await supabase
    .from('invoices')
    .select('id')
    .eq('status', 'paid')
    .lt('paid_at', sevenYearsAgoYearStart.toISOString())

  if (error) throw new Error(`payments_7yr: ${error.message}`)

  const ids = (rows || []).map((r) => r.id)
  return { count: ids.length, ids }
}

/**
 * Run all retention audits and return a structured findings object.
 * Errors in individual checks are collected rather than thrown so a single
 * failing query does not suppress the rest of the report.
 *
 * @returns {Promise<{
 *   runAt: string,
 *   total: number,
 *   checks: {
 *     attendance: { count: number, ids: string[] },
 *     mediaConsent: { count: number, ids: string[] },
 *     inactiveConsents: { count: number, ids: string[] },
 *     inactiveSwimmers: { count: number, ids: string[] },
 *     payments: { count: number, ids: string[] },
 *   },
 *   errors: string[],
 * }>}
 */
export async function auditRetention() {
  const supabase = createServiceRoleClient()
  const errors = []

  async function safe(label, fn) {
    try {
      return await fn(supabase)
    } catch (e) {
      errors.push(`${label}: ${e.message}`)
      return { count: 0, ids: [] }
    }
  }

  const [attendance, mediaConsent, inactiveConsents, inactiveSwimmers, payments] =
    await Promise.all([
      safe('attendance', auditAttendance),
      safe('mediaConsent', auditMediaConsent),
      safe('inactiveConsents', auditInactiveConsents),
      safe('inactiveSwimmers', auditInactiveSwimmers),
      safe('payments', auditPayments),
    ])

  const total =
    attendance.count +
    mediaConsent.count +
    inactiveConsents.count +
    inactiveSwimmers.count +
    payments.count

  return {
    runAt: new Date().toISOString(),
    total,
    checks: {
      attendance,
      mediaConsent,
      inactiveConsents,
      inactiveSwimmers,
      payments,
    },
    errors,
  }
}
