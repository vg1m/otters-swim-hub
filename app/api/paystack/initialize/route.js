import { NextResponse } from 'next/server'

/**
 * @deprecated Registration payment at checkout is disabled.
 * Use POST /api/registration/apply for applications, then parents pay from the dashboard.
 */
export async function POST() {
  return NextResponse.json(
    {
      error:
        'Registration checkout is no longer available. Submit the registration form to apply; once the club approves your swimmer, pay from your dashboard under Invoices.',
      code: 'REGISTRATION_PAYMENT_DISABLED',
    },
    { status: 410 }
  )
}
