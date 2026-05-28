import { NextResponse } from 'next/server'
import {
  isBillingSimulateAllowed,
  parseSimulateAsOf,
} from '@/lib/billing/billing-simulate'
import { runRecurringBillingJob } from '@/lib/billing/run-recurring-billing-job'

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

  const url = new URL(request.url)
  const asOfParam = url.searchParams.get('asOf')
  const simulate =
    url.searchParams.get('simulate') === '1' || url.searchParams.get('force') === '1'

  if (simulate && !isBillingSimulateAllowed()) {
    return NextResponse.json(
      { error: 'Billing simulation is disabled in this environment' },
      { status: 403 }
    )
  }

  let issueDate = new Date()
  if (asOfParam) {
    if (!simulate) {
      return NextResponse.json(
        {
          error:
            'Query param asOf requires simulate=1 (only allowed in development or ALLOW_BILLING_SIMULATE=1)',
        },
        { status: 400 }
      )
    }
    const parsed = parseSimulateAsOf(asOfParam)
    if (!parsed) {
      return NextResponse.json(
        { error: 'Invalid asOf; use YYYY-MM-DD or YYYY-MM (month uses the 25th)' },
        { status: 400 }
      )
    }
    issueDate = parsed
  } else if (simulate) {
    return NextResponse.json(
      { error: 'simulate=1 requires asOf=YYYY-MM-DD or asOf=YYYY-MM' },
      { status: 400 }
    )
  }

  try {
    const result = await runRecurringBillingJob(issueDate, { force: simulate })
    return NextResponse.json(result)
  } catch (e) {
    console.error('recurring-billing cron', e)
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}

export async function POST(request) {
  return GET(request)
}
