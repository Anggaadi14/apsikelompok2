// Service-role Supabase client — bypasses RLS entirely. This is the ONLY
// client used for actual data queries (see supabase/migrations/0002 for why:
// every table has RLS enabled with no anon/authenticated policies, so this
// is the one privileged connection, same role the old mysql2 pool played).
//
// NEVER import this in a Client Component or anything that ships to the
// browser — the service_role key has full read/write access to every table.

import { createClient } from '@supabase/supabase-js'

let client: ReturnType<typeof createClient<any>> | null = null

export function createSupabaseAdminClient() {
  if (!client) {
    client = createClient<any>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    )
  }
  return client
}
