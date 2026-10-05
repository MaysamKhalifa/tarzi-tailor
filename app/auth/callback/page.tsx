'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { useLanguage } from '@/lib/context/LanguageContext'

type Status = 'loading' | 'success' | 'error'

export default function AuthCallbackPage() {
  const router = useRouter()
  const { t, isRTL } = useLanguage()
  const [status, setStatus] = useState<Status>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const supabase = createClient()

    const handle = async () => {
      try {
        const url = new URL(window.location.href)

        // ── Check for error from Supabase ─────────────────────────
        const urlError = url.searchParams.get('error')
        const urlErrorDesc = url.searchParams.get('error_description')
        if (urlError) {
          setStatus('error')
          setMessage(urlErrorDesc || urlError)
          return
        }

        // ── Preferred flow: token_hash + type ──────────────────────
        // This is Supabase's recommended email-confirmation link format.
        // It's verified statelessly, so it works even if this link is
        // opened in a different browser/device/tab than the one used to
        // sign up — unlike the PKCE code flow below, which requires a
        // matching code-verifier that was saved in *this* browser's
        // storage at signup time (and silently fails otherwise).
        const tokenHash = url.searchParams.get('token_hash')
        const otpType = url.searchParams.get('type') as
          | 'signup' | 'email' | 'recovery' | 'invite' | 'magiclink' | 'email_change' | null
        if (tokenHash && otpType) {
          const { error: verifyError } = await supabase.auth.verifyOtp({ type: otpType, token_hash: tokenHash })
          if (verifyError) {
            console.error('[auth/callback] verifyOtp failed:', verifyError.status, verifyError.code, verifyError.message)
            setStatus('error')
            setMessage(verifyError.message)
            return
          }
        }

        // ── PKCE flow: exchange code for session ──────────────────
        const code = url.searchParams.get('code')
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
          if (exchangeError) {
            // Code may already be used, or the verifier from the original
            // signup browser isn't present in this one — try getSession
            // below anyway in case the token_hash branch above already
            // established a session.
            console.error('[auth/callback] Code exchange failed:', exchangeError.status, exchangeError.code, exchangeError.message)
          }
        }

        // ── Implicit flow: hash tokens are auto-handled by SDK ────
        // (getSession below will pick them up)

        // ── Wait for session to be established ────────────────────
        // Poll up to 5 seconds in case the auth state takes a moment
        let session = null
        for (let i = 0; i < 10; i++) {
          const { data } = await supabase.auth.getSession()
          if (data.session) { session = data.session; break }
          await new Promise(r => setTimeout(r, 500))
        }

        if (!session) {
          console.error('[auth/callback] No session established after verification attempt for url:', window.location.href)
          setStatus('error')
          setMessage('Could not verify your session. Please try logging in.')
          return
        }

        console.info(
          '[auth/callback] Session established for', session.user.email,
          '— email_confirmed_at:', session.user.email_confirmed_at
        )

        // ── Check existing profile (and fetch onboarding status) ───
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, onboarding_complete')
          .eq('id', session.user.id)
          .maybeSingle()

        // ── Success — ensure profile exists. Only set role on
        // first-time creation; never overwrite an existing profile's
        // role (e.g. an admin re-confirming an email would otherwise
        // get silently downgraded back to 'tailor').
        await supabase.from('profiles').upsert({
          id: session.user.id,
          ...(profile ? {} : { role: 'tailor' }),
          full_name: session.user.user_metadata?.full_name || '',
          phone: session.user.user_metadata?.phone || null,
        }, { onConflict: 'id' })

        setStatus('success')

        // Short delay so user sees the success state
        await new Promise(r => setTimeout(r, 1200))

        if (profile?.onboarding_complete) {
          router.replace('/home')
        } else {
          router.replace('/onboarding')
        }

      } catch (err) {
        console.error('Auth callback error:', err)
        setStatus('error')
        setMessage('Something went wrong. Please try logging in.')
      }
    }

    handle()
  }, [router])

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      style={{
        minHeight: '100dvh', maxWidth: 430, margin: '0 auto',
        background: 'white', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: '40px 32px',
        textAlign: 'center',
      }}
    >
      {status === 'loading' && (
        <>
          <div style={{
            width: 88, height: 88, borderRadius: 24,
            background: 'linear-gradient(135deg, #fce4ec, #f8bbd0)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24,
          }}>
            <Loader2 size={40} color="#e91e8c" style={{ animation: 'spin 1s linear infinite' }} />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1a1a1a', margin: '0 0 10px' }}>
            {t('auth', 'verifying')}
          </h2>
          <p style={{ fontSize: 14, color: '#9e9e9e', lineHeight: 1.6 }}>
            {t('auth', 'please_wait')}
          </p>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </>
      )}

      {status === 'success' && (
        <>
          <div style={{
            width: 88, height: 88, borderRadius: 24,
            background: '#e8f5e9', display: 'flex', alignItems: 'center',
            justifyContent: 'center', marginBottom: 24,
          }}>
            <CheckCircle size={44} color="#2e7d32" />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1a1a1a', margin: '0 0 10px' }}>
            {t('auth', 'verified_title')}
          </h2>
          <p style={{ fontSize: 14, color: '#616161', lineHeight: 1.6 }}>
            {t('auth', 'verified_sub')}
          </p>
        </>
      )}

      {status === 'error' && (
        <>
          <div style={{
            width: 88, height: 88, borderRadius: 24,
            background: '#fff0f0', display: 'flex', alignItems: 'center',
            justifyContent: 'center', marginBottom: 24,
          }}>
            <XCircle size={44} color="#d32f2f" />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1a1a1a', margin: '0 0 10px' }}>
            {t('auth', 'failed_title')}
          </h2>
          <p style={{ fontSize: 14, color: '#757575', lineHeight: 1.6, margin: '0 0 28px' }}>
            {message || t('auth', 'failed_sub')}
          </p>
          <button
            onClick={() => router.replace('/login')}
            style={{
              width: '100%', padding: '14px', borderRadius: 14, border: 'none',
              background: 'linear-gradient(135deg, #e91e8c, #f06292)',
              color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(233,30,140,0.25)',
            }}>
            {t('auth', 'back_signin')}
          </button>
        </>
      )}
    </div>
  )
}
