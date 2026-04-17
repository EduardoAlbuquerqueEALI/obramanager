import { createClient } from '@supabase/supabase-js'

// Service-role client — bypasses RLS, no typed generic to avoid version conflicts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        fetch: (url, options = {}) => {
          return fetch(url, { ...options, cache: 'no-store' })
        },
      },
    }
  )
}
