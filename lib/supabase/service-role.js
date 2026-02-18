import { createClient } from '@supabase/supabase-js'

/**
 * Create Supabase client with service role key
 * This bypasses Row Level Security (RLS) policies
 * ONLY use this in server-side API routes for system operations
 * NEVER expose this to the client
 */
export function createServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase service role credentials')
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
