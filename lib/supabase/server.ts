// lib/supabase/server.ts
import { createClient } from '@supabase/supabase-js'

export function getSupabaseServer() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url) throw new Error('SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL is missing.')
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is missing.')

  return createClient(url, key)
}
