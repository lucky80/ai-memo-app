import { createClient, SupabaseClient } from '@supabase/supabase-js'

let _supabase: SupabaseClient | null = null

/** 서버 전용 Supabase 클라이언트 (Service Role). Server Actions, API Routes에서만 사용하세요. */
export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !serviceRoleKey) {
      throw new Error(
        'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment.'
      )
    }
    _supabase = createClient(url, serviceRoleKey)
  }
  return _supabase
}

/** @deprecated getSupabase() 사용 권장. 하위 호환용. */
export const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    return getSupabase()[prop as keyof SupabaseClient]
  },
})
