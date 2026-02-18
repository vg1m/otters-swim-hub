import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Manually link orphaned registration data to current user's account
 * This is useful for users who signed up AFTER registering/paying
 */
export async function POST(request) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('Linking orphaned registrations for user:', user.email)

    // Call the database function to link records
    const { data, error } = await supabase
      .rpc('link_my_orphaned_registrations')
      .single()

    if (error) {
      console.error('Error linking registrations:', error)
      
      // Handle duplicate swimmer error gracefully
      if (error.code === '23505' && error.message.includes('unique_swimmer_per_parent')) {
        console.log('Duplicate swimmer detected - data already linked')
        return NextResponse.json({
          success: true,
          message: 'Your registration data is already linked to your account',
          linked: {
            invoices: 0,
            swimmers: 0,
            consents: 0,
          },
          note: 'No action needed - data was already linked'
        })
      }
      
      return NextResponse.json(
        { 
          error: 'Failed to link registrations',
          details: error.message 
        },
        { status: 500 }
      )
    }

    const { linked_invoices, linked_swimmers, linked_consents } = data || {}

    console.log('Linking results:', {
      invoices: linked_invoices,
      swimmers: linked_swimmers,
      consents: linked_consents,
    })

    // Return success with counts
    return NextResponse.json({
      success: true,
      message: linked_invoices > 0 || linked_swimmers > 0
        ? 'Successfully linked your registration data!'
        : 'No orphaned registrations found for your email',
      linked: {
        invoices: linked_invoices || 0,
        swimmers: linked_swimmers || 0,
        consents: linked_consents || 0,
      },
    })
  } catch (error) {
    console.error('Link registrations error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error.message 
      },
      { status: 500 }
    )
  }
}
