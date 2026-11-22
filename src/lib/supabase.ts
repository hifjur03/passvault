import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(url && anonKey)

/**
 * Only the anon key lives in the bundle — that is safe as long as row level
 * security is enabled (see supabase/schema.sql). Vault contents are encrypted
 * client-side, so even a leaked anon key exposes no passwords.
 */
export const supabase = createClient(
  url ?? 'https://placeholder.supabase.co',
  anonKey ?? 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
)

export function friendlyAuthError(error: unknown): string {
  const message =
    error && typeof error === 'object' && 'message' in error
      ? String((error as { message: unknown }).message)
      : String(error ?? 'Unknown error')

  if (/invalid login credentials/i.test(message)) {
    return 'Wrong email or password.'
  }
  if (/email not confirmed/i.test(message)) {
    return 'Please confirm your email first, then sign in.'
  }
  if (/user already registered/i.test(message)) {
    return 'An account with this email already exists. Try signing in.'
  }
  if (/password should be at least/i.test(message)) {
    return 'Password is too short. Use at least 8 characters.'
  }
  if (/rate limit|too many requests/i.test(message)) {
    return 'Too many attempts. Please wait a minute and try again.'
  }
  if (/failed to fetch|network/i.test(message)) {
    return 'Network error. Check your connection and try again.'
  }
  return message
}
