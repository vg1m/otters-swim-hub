import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { CONSENT_POLICY_TEXT } from '@/lib/constants/consent-policy'
import { calculateAge } from '@/lib/utils/date-helpers'
import { notifyAllAdmins } from '@/lib/notifications/notify-all-admins'
import { assertHcaptcha } from '@/lib/hcaptcha/verify-token'

/**
 * Public registration: creates pending swimmers (no squad, no payment).
 * Admin assigns squad/coach and approves; parent pays from dashboard.
 */
export async function POST(request) {
  try {
    const body = await request.json()

    const captchaError = await assertHcaptcha(request, body)
    if (captchaError) {
      return NextResponse.json({ error: captchaError.error }, { status: captchaError.status })
    }

    const { swimmers, parentInfo, consents } = body

    if (!swimmers || swimmers.length === 0) {
      return NextResponse.json({ error: 'No swimmers provided' }, { status: 400 })
    }

    if (!parentInfo || !parentInfo.phone || !parentInfo.email || !parentInfo.fullName || !parentInfo.relationship) {
      return NextResponse.json({ error: 'Parent information incomplete' }, { status: 400 })
    }

    if (!parentInfo.emergencyContactName || !parentInfo.emergencyContactRelationship || !parentInfo.emergencyContactPhone) {
      return NextResponse.json({ error: 'Emergency contact information incomplete' }, { status: 400 })
    }

    if (!consents || !consents.dataAccuracy || !consents.codeOfConduct) {
      return NextResponse.json({ error: 'Required consents not provided' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()
    const parentInfoResolved = { ...parentInfo }

    let parentId = null
    const authClient = await createClient()
    const {
      data: { user: authUser },
    } = await authClient.auth.getUser()

    if (authUser) {
      const { data: authProfile } = await authClient
        .from('profiles')
        .select('id, role, email')
        .eq('id', authUser.id)
        .maybeSingle()

      if (authProfile?.role === 'parent') {
        parentId = authProfile.id
        if (authProfile.email) {
          parentInfoResolved.email = String(authProfile.email).trim().toLowerCase()
        }
      }
    }

    if (!parentId) {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', parentInfoResolved.email)
        .single()

      if (existingProfile) {
        parentId = existingProfile.id
      }
    }

    // Fetch Pups squad ID once for under-6 auto-assignment
    const { data: pupsSquad } = await supabase
      .from('squads')
      .select('id')
      .eq('slug', 'pups')
      .single()

    const swimmersToInsert = swimmers.map((swimmer) => {
      const ageAtRegistration = calculateAge(swimmer.dateOfBirth)
      const isUnderSix = ageAtRegistration < 6

      return {
        parent_id: parentId,
        first_name: swimmer.firstName,
        last_name: swimmer.lastName,
        date_of_birth: swimmer.dateOfBirth,
        gender: swimmer.gender,
        squad_id: isUnderSix ? (pupsSquad?.id ?? null) : null,
        gala_events_opt_in: isUnderSix ? false : swimmer.galaEventsOptIn === true,
        sessions_per_week: isUnderSix ? '1-2' : (swimmer.sessionsPerWeek || null),
        preferred_payment_type: isUnderSix
          ? 'monthly'
          : (['monthly', 'quarterly', 'per_session'].includes(swimmer.preferredPaymentType)
            ? swimmer.preferredPaymentType
            : 'monthly'),
        status: 'pending',
        registration_complete: true,
        payment_deferred: true,
      }
    })

    const { data: createdSwimmers, error: swimmersError } = await supabase
      .from('swimmers')
      .insert(swimmersToInsert)
      .select()

    if (swimmersError) {
      console.error('Swimmers creation error:', swimmersError)
      return NextResponse.json(
        { error: 'Failed to create swimmer records', details: swimmersError.message },
        { status: 500 }
      )
    }

    const consentRecords = createdSwimmers.map((swimmer) => ({
      parent_id: parentId,
      swimmer_id: swimmer.id,
      media_consent: consents.mediaConsent,
      code_of_conduct_consent: consents.codeOfConduct,
      data_accuracy_confirmed: consents.dataAccuracy,
      consent_text: CONSENT_POLICY_TEXT,
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
      user_agent: request.headers.get('user-agent') || null,
    }))

    const { data: insertedConsents, error: consentError } = await supabase
      .from('registration_consents')
      .insert(consentRecords)
      .select()

    if (consentError) {
      console.error('Consent storage failed:', consentError)
      return NextResponse.json(
        {
          error: 'Failed to store consent records',
          details: consentError.message,
        },
        { status: 500 }
      )
    }

    if (!insertedConsents || insertedConsents.length !== consentRecords.length) {
      return NextResponse.json({ error: 'Consent verification failed' }, { status: 500 })
    }

    if (parentId) {
      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({
          full_name: parentInfoResolved.fullName,
          phone_number: parentInfoResolved.phone,
          relationship: parentInfoResolved.relationship,
          emergency_contact_name: parentInfoResolved.emergencyContactName,
          emergency_contact_relationship: parentInfoResolved.emergencyContactRelationship,
          emergency_contact_phone: parentInfoResolved.emergencyContactPhone,
        })
        .eq('id', parentId)

      if (profileUpdateError) {
        console.error('Registration: profile contact fields update failed:', profileUpdateError)
      }

      if (parentInfoResolved.shareHubAccess && parentInfoResolved.coParentEmail?.trim()) {
        const invited = parentInfoResolved.coParentEmail.trim().toLowerCase()
        const primaryEmail = parentInfoResolved.email.trim().toLowerCase()
        if (invited && invited !== primaryEmail) {
          const { error: inviteError } = await supabase.from('family_account_members').insert({
            primary_parent_id: parentId,
            invited_email: invited,
            invited_name: parentInfoResolved.coParentName?.trim() || null,
            status: 'pending',
            invited_by: parentId,
          })
          if (inviteError) {
            if (inviteError.code !== '23505') {
              console.error('Registration: family invite insert failed:', inviteError)
            }
          } else {
            try {
              const { sendFamilySharedAccessInviteEmail } = await import('@/lib/utils/send-email')
              const emailOut = await sendFamilySharedAccessInviteEmail({
                inviteeEmail: invited,
                inviteeName: parentInfoResolved.coParentName?.trim() || null,
                primaryName: parentInfoResolved.fullName,
                primaryEmail,
              })
              if (!emailOut.success) {
                console.warn('Registration: family invite email:', emailOut.error)
              }
            } catch (mailErr) {
              console.warn('Registration: family invite email exception:', mailErr)
            }
          }
        }
      }
    } else if (parentInfoResolved.shareHubAccess && parentInfoResolved.coParentEmail?.trim()) {
      console.info(
        'Registration: shareHubAccess requested but no existing profile for email; invite skipped until parent account exists'
      )
    }

    for (const swimmer of createdSwimmers) {
      await notifyAllAdmins(supabase, {
        type: 'registration_pending',
        title: `New registration: ${swimmer.first_name} ${swimmer.last_name}`,
        body: swimmer.squad_id
          ? 'Review and approve in Registrations when ready.'
          : 'Assign a squad in Swimmer Management, then approve in Registrations.',
        dedupe_key: `registration:${swimmer.id}`,
        swimmer_id: swimmer.id,
        sendEmail: true,
      })
    }

    return NextResponse.json({
      success: true,
      message:
        'Application received. The club will assign a squad and coach. You can pay from your dashboard once your registration is approved.',
      swimmerIds: createdSwimmers.map((s) => s.id),
    })
  } catch (error) {
    console.error('Registration apply error:', error)
    return NextResponse.json(
      { error: error.message || 'Registration failed' },
      { status: 500 }
    )
  }
}
