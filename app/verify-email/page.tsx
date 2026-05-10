'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Mail, RefreshCw, CheckCircle } from 'lucide-react'
import { useLanguage } from '@/lib/context/LanguageContext'

export default function VerifyEmailPage() {
  const { t, isRTL } = useLanguage()
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)
  const [error, setError] = useState('')

  const handleResend = async () => {
    setResending(true)
    setError('')
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user?.email) {
      setError('Could not find your email. Please try signing up again.')
      setResending(false)
      return
    }

    const { error: err } = await supabase.auth.resend({
      type: 'signup',
      email: session.user.email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })

    setResending(false)
    if (err) setError(err.message)
    else setResent(true)
  }

  const steps = [
    t('auth', 'check_sent'),
    t('auth', 'open_gmail'),
    t('auth', 'already_verified'),
  ]

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
        <p style={{ fontSize: 13, color: '#9e9e9e', lineHeight: 1.6, margin: '0 0 36px', textAlign: 'center' }}>
          {t('auth', 'check_spam')}
        </p>

        {/* Steps hint */}
        <div style={{
          width: '100%', background: '#f9f9f9', borderRadius: 16,
          padding: '20px', marginBottom: 32, textAlign: isRTL ? 'right' : 'left',
        }}>
          {[
            { step: '1', text: t('auth', 'check_sent') },
            { step: '2', text: t('auth', 'open_gmail') },
            { step: '3', text: t('auth', 'already_verified') },
          ].map(({ step, text }) => (
            <div
              key={step}
              style={{
                display: 'flex', alignItems: 'center',
                flexDirection: isRTL ? 'row-reverse' : 'row',
                gap: 12, marginBottom: step === '3' ? 0 : 14,
              }}
            >
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'linear-gradient(135deg, #e91e8c, #f06292)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: 'white' }}>{step}</span>
              </div>
              <span style={{ fontSize: 14, color: '#3a3a3a', fontWeight: 500 }}>{text}</span>
            </div>
          ))}
        </div>

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

        {error && (
          <div style={{
            width: '100%', background: '#fff5f5', border: '1px solid #fecaca',
            borderRadius: 10, padding: '10px 14px', marginBottom: 16,
            color: '#dc2626', fontSize: 13,
          }}>
            {error}
          </div>
        )}

        {/* Resend button */}
        <button onClick={handleResend} disabled={resending || resent}
          style={{
            width: '100%', padding: '14px', borderRadius: 14, border: 'none',
            background: resent ? '#e8f5e9' : 'linear-gradient(135deg, #e91e8c, #f06292)',
            color: resent ? '#2e7d32' : 'white',
            fontSize: 15, fontWeight: 700, cursor: resending ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            marginBottom: 16,
            boxShadow: resent ? 'none' : '0 4px 14px rgba(233,30,140,0.25)',
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
