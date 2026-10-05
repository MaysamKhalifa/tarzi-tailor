'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Mail, RefreshCw, CheckCircle, ShieldCheck } from 'lucide-react'
import { useLanguage } from '@/lib/context/LanguageContext'

function VerifyEmailForm() {
  const { t, isRTL } = useLanguage()
  const searchParams = useSearchParams()
  const email = searchParams.get('email') || ''

  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)
  const [error, setError] = useState('')
  const [code, setCode] = useState('')
  const [verifying, setVerifying] = useState(false)

  const getEmail = async () => {
    if (email) return email
    // Fallback for direct navigation without ?email= — only works if a
    // session already exists (it won't for a brand-new unconfirmed user).
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    return session?.user?.email || ''
  }

  const handleResend = async () => {
    setResending(true)
    setError('')
    const targetEmail = await getEmail()
    if (!targetEmail) {
      console.error('[verify-email] No email found when attempting resend')
      setError('Could not find your email. Please try signing up again.')
      setResending(false)
      return
    }

    const supabase = createClient()
    const { error: err } = await supabase.auth.resend({
      type: 'signup',
      email: targetEmail,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })

    setResending(false)
    if (err) {
      console.error('[verify-email] resend failed:', err.status, err.message)
      setError(err.message)
    } else {
      setResent(true)
    }
  }

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (code.trim().length !== 6) { setError(t('auth', 'err_code_length')); return }
    setVerifying(true)
    setError('')

    const targetEmail = await getEmail()
    if (!targetEmail) {
      setError('Could not find your email. Please try signing up again.')
      setVerifying(false)
      return
    }

    const supabase = createClient()
    const { data, error: verifyErr } = await supabase.auth.verifyOtp({
      email: targetEmail,
      token: code.trim(),
      type: 'signup',
    })

    if (verifyErr) {
      console.error('[verify-email] verifyOtp failed:', verifyErr.status, verifyErr.message)
      setError(verifyErr.message)
      setVerifying(false)
      return
    }

    const user = data.user
    if (!user) {
      setError('Could not verify your account. Please try again.')
      setVerifying(false)
      return
    }

    // Only set role on first-time profile creation — never overwrite an
    // existing profile's role.
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, onboarding_complete')
      .eq('id', user.id)
      .maybeSingle()

    await supabase.from('profiles').upsert({
      id: user.id,
      ...(profile ? {} : { role: 'tailor' }),
      full_name: user.user_metadata?.full_name || '',
      phone: user.user_metadata?.phone || null,
    }, { onConflict: 'id' })

    window.location.href = profile?.onboarding_complete ? '/home' : '/onboarding'
  }

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      style={{
        minHeight: '100dvh', maxWidth: 430, margin: '0 auto',
        background: 'white', display: 'flex', flexDirection: 'column',
      }}
    >
      {/* Pink top strip */}
      <div style={{
        background: 'linear-gradient(135deg, #e91e8c 0%, #f06292 100%)',
        height: 6,
      }} />

      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '40px 32px', textAlign: isRTL ? 'right' : 'center',
      }}>
        {/* Icon */}
        <div style={{
          width: 96, height: 96, borderRadius: 28,
          background: 'linear-gradient(135deg, #fce4ec, #f8bbd0)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 28,
        }}>
          <Mail size={44} color="#e91e8c" />
        </div>

        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#1a1a1a', margin: '0 0 12px', textAlign: 'center' }}>
          {t('auth', 'check_inbox')}
        </h1>
        <p style={{ fontSize: 15, color: '#616161', lineHeight: 1.7, margin: '0 0 8px', textAlign: 'center' }}>
          {t('auth', 'check_sent')}
        </p>
        {email && (
          <p style={{ fontSize: 15, color: '#e91e8c', fontWeight: 700, margin: '0 0 8px', textAlign: 'center' }}>
            {email}
          </p>
        )}
        <p style={{ fontSize: 13, color: '#9e9e9e', lineHeight: 1.6, margin: '0 0 28px', textAlign: 'center' }}>
          {t('auth', 'check_spam')}
        </p>

        {/* 6-digit code entry */}
        <form onSubmit={handleVerifyCode} style={{ width: '100%' }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#555', display: 'block', marginBottom: 6, textAlign: isRTL ? 'right' : 'left' }}>
            {t('auth', 'verify_code_label')}
          </label>
          <div style={{ position: 'relative', marginBottom: 14 }}>
            <input
              type="text" inputMode="numeric" maxLength={6} value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder={t('auth', 'verify_code_placeholder')}
              style={{
                width: '100%', padding: '14px 14px 14px 44px', borderRadius: 14,
                border: '1.5px solid #e8e8e8', background: '#fafafa', fontSize: 16,
                textAlign: 'center', letterSpacing: 6, fontWeight: 700, outline: 'none',
                boxSizing: 'border-box',
              }}
              onFocus={e => e.target.style.borderColor = '#e91e8c'} onBlur={e => e.target.style.borderColor = '#e8e8e8'}
            />
            <ShieldCheck size={18} color="#9e9e9e" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
          </div>

          {error && (
            <div style={{
              width: '100%', background: '#fff5f5', border: '1px solid #fecaca',
              borderRadius: 10, padding: '10px 14px', marginBottom: 14,
              color: '#dc2626', fontSize: 13,
            }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={verifying}
            style={{
              width: '100%', padding: '14px', borderRadius: 14, border: 'none',
              background: verifying ? '#f9a0c8' : 'linear-gradient(135deg, #e91e8c, #f06292)',
              color: 'white', fontSize: 15, fontWeight: 700, cursor: verifying ? 'not-allowed' : 'pointer',
              marginBottom: 16, boxShadow: verifying ? 'none' : '0 4px 14px rgba(233,30,140,0.25)',
            }}>
            {verifying ? t('auth', 'verifying_code') : t('auth', 'verify_btn')}
          </button>
        </form>

        {/* Resent success */}
        {resent && (
          <div style={{
            width: '100%', background: '#e8f5e9', borderRadius: 12,
            padding: '12px 16px', marginBottom: 16,
            display: 'flex', alignItems: 'center',
            flexDirection: isRTL ? 'row-reverse' : 'row',
            gap: 10,
          }}>
            <CheckCircle size={18} color="#2e7d32" />
            <span style={{ fontSize: 14, color: '#2e7d32', fontWeight: 600 }}>
              {t('auth', 'resent_confirm')}
            </span>
          </div>
        )}

        {/* Resend button */}
        <button onClick={handleResend} disabled={resending || resent}
          style={{
            width: '100%', padding: '14px', borderRadius: 14, border: '1.5px solid #fce4ec',
            background: resent ? '#e8f5e9' : 'white',
            color: resent ? '#2e7d32' : '#e91e8c',
            fontSize: 15, fontWeight: 700, cursor: resending ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            marginBottom: 16,
          }}>
          {resending ? (
            <><RefreshCw size={16} className="animate-spin" /> {t('auth', 'resending')}</>
          ) : resent ? (
            <><CheckCircle size={16} /> {t('auth', 'resent')}</>
          ) : (
            t('auth', 'resend_btn')
          )}
        </button>

        <Link href="/login" style={{ fontSize: 14, color: '#9e9e9e', textDecoration: 'none' }}>
          {t('auth', 'already_verified')}{' '}
          <span style={{ color: '#e91e8c', fontWeight: 700 }}>{t('auth', 'go_login')}</span>
        </Link>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailForm />
    </Suspense>
  )
}
