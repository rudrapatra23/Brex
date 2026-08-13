import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.BUN_PUBLIC_SUPABASE_URL!,
    process.env.BUN_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      // Keep the Supabase session in persistent, browser-readable cookies.
      // It cannot be HttpOnly because the browser client must refresh tokens.
      cookieOptions: {
        name: "brex-auth",
        path: "/",
        sameSite: "lax",
        secure: window.location.protocol === "https:",
      },
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    }
  )
}
