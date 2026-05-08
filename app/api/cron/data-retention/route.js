import { NextResponse } from 'next/server'
import { auditRetention } from '@/lib/retention/audit-retention'
import { sendRetentionAuditEmail } from '@/lib/utils/send-email'

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

async function runDataRetentionJob() {
  const findings = await auditRetention()

  const adminEmail =
    process.env.COACH_PAY_NOTIFY_EMAIL ||
    process.env.SMTP2GO_FROM_EMAIL

  if (!adminEmail) {
    console.warn('data-retention: no admin email configured (set COACH_PAY_NOTIFY_EMAIL or SMTP2GO_FROM_EMAIL)')
    return { ...findings, emailSent: false, emailError: 'No admin email configured' }
  }

  if (findings.errors.length > 0) {
    console.error('data-retention: audit errors', findings.errors)
  }

  const emailResult = await sendRetentionAuditEmail({
    to: adminEmail,
    runAt: findings.runAt,
    total: findings.total,
    checks: findings.checks,
    errors: findings.errors,
  })

  return {
    ...findings,
    emailSent: emailResult.success,
    ...(emailResult.skipped ? { emailSkipped: true } : {}),
    ...(emailResult.error ? { emailError: emailResult.error } : {}),
  }
}

export async function GET(request) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  }
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${secret}`) {
    return unauthorized()
  }

  try {
    const result = await runDataRetentionJob()
    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    console.error('data-retention cron', e)
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}

export async function POST(request) {
  return GET(request)
}
