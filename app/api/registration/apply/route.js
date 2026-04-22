import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { CONSENT_POLICY_TEXT } from '@/lib/constants/consent-policy'
import { calculateAge } from '@/lib/utils/date-helpers'

/**
 * Public registration: creates pending swimmers (no squad, no payment).
 * Admin assigns squad/coach and approves; parent pays from dashboard.
 */
export async function POST(request) {
  try {
    const body = await request.json()
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

    let parentId = null
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', parentInfo.email)
      .single()

    if (existingProfile) {
      parentId = existingProfile.id
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
          full_name: parentInfo.fullName,
          phone_number: parentInfo.phone,
          relationship: parentInfo.relationship,
          emergency_contact_name: parentInfo.emergencyContactName,
          emergency_contact_relationship: parentInfo.emergencyContactRelationship,
          emergency_contact_phone: parentInfo.emergencyContactPhone,
        })
        .eq('id', parentId)

      if (profileUpdateError) {
        console.error('Registration: profile contact fields update failed:', profileUpdateError)
      }

      if (parentInfo.shareHubAccess && parentInfo.coParentEmail?.trim()) {
        const invited = parentInfo.coParentEmail.trim().toLowerCase()
        const primaryEmail = parentInfo.email.trim().toLowerCase()
        if (invited && invited !== primaryEmail) {
          const { error: inviteError } = await supabase.from('family_account_members').insert({
            primary_parent_id: parentId,
            invited_email: invited,
            invited_name: parentInfo.coParentName?.trim() || null,
            status: 'pending',
            invited_by: parentId,
          })
          if (inviteError) {
            if (inviteError.code !== '23505') {
              console.error('Registration: family invite insert failed:', inviteError)
            }
          }
        }
      }
    } else if (parentInfo.shareHubAccess && parentInfo.coParentEmail?.trim()) {
      console.info(
        'Registration: shareHubAccess requested but no existing profile for email — invite skipped until parent account exists'
      )
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
