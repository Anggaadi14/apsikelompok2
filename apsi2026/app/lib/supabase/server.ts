// Cookie-aware Supabase client for use inside Route Handlers / Server
// Components. Reads the caller's auth session from cookies — this is how we
// find out *who* is making the request. Respects RLS (anon-equivalent
// privileges), so it is NOT used for data queries — use the admin client in
// app/lib/supabase/admin.ts for that (see note in supabase/migrations/0002).

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createSupabaseServerClient() {
  const cookieStore = await cookies()

  return createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // Called from a context that can't set cookies (e.g. a Server
            // Component render). Safe to ignore — proxy.ts refreshes the
            // session on every request, so the cookie stays current.
          }
        },
      },
    },
  )
}
