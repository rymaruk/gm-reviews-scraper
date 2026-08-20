import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import { getSupabaseKey, getSupabaseUrl, isSupabaseConfigured } from './env.js'

let client: SupabaseClient | undefined

export { isSupabaseConfigured }

export function getSupabase(): SupabaseClient {
  const url = getSupabaseUrl()
  const key = getSupabaseKey()

  if (!url || !key) {
    throw new Error('Supabase is not configured. Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY.')
  }

  if (!client) {
    client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }

  return client
}
