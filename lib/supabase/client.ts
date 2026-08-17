import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        // PKCE requires the code-verifier that was stored in the SAME
        // browser at signup time. Email confirmation links are routinely
        // opened in a different browser/device/app (Mail app's embedded
        // browser, a different device, etc.), which made PKCE exchange
        // fail there every time. Implicit flow embeds the tokens directly
        // in the redirect URL, so it works regardless of which
        // browser/device opens the link.
        flowType: 'implicit',
        detectSessionInUrl: true,  // auto-detect hash tokens (#access_token=...)
        persistSession: true,
        autoRefreshToken: true,
      },
    }
  )
}
