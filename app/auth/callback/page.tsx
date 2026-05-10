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

        // ── PKCE flow: exchange code for session ──────────────────
        const code = url.searchParams.get('code')
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
          if (exchangeError) {
            // Code may already be used — try getSession anyway
            console.warn('Code exchange warning:', exchangeError.message)
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
          setStatus('error')
          setMessage('Could not verify your session. Please try logging in.')
          return
        }

        // ── Success — update profile role just in case ────────────
        await supabase.from('profiles').upsert({
          id: session.user.id,
          role: 'tailor',
          full_name: session.user.user_metadata?.full_name || '',
          phone: session.user.user_metadata?.phone || null,
        }, { onConflict: 'id' })

        // ── Check onboarding ──────────────────────────────────────
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_complete')
          .eq('id', session.user.id)
          .single()

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
