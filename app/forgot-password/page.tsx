'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Mail, CheckCircle } from 'lucide-react'
import { useLanguage } from '@/lib/context/LanguageContext'

export default function ForgotPasswordPage() {
  const { t, isRTL } = useLanguage()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)

  const inputStyle: React.CSSProperties = {
    border: '1.5px solid #e8e8e8', background: '#fafafa',
    borderRadius: 12, padding: '12px 14px', fontSize: 15,
    width: '100%', outline: 'none', boxSizing: 'border-box', color: '#1a1a1a',
    textAlign: isRTL ? 'right' : 'left',
    direction: isRTL ? 'rtl' : 'ltr',
  }
  const onFocus = (e: React.FocusEvent<HTMLInputElement>) => { e.target.style.borderColor = '#e91e8c' }
  const onBlur  = (e: React.FocusEvent<HTMLInputElement>) => { e.target.style.borderColor = '#e8e8e8' }

  const sendReset = async (targetEmail: string) => {
    const supabase = createClient()
    return supabase.auth.resetPasswordForEmail(targetEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!email.trim()) { setError(t('forgot_password', 'err_required')); return }
    setLoading(true)
    const { error: err } = await sendReset(email.trim().toLowerCase())
    setLoading(false)
    if (err) {
      console.error('[forgot-password] resetPasswordForEmail failed:', err.status, err.message)
      setError(err.message || t('forgot_password', 'err_generic'))
      return
    }
    setSent(true)
  }

  const handleResend = async () => {
    setResending(true)
    const { error: err } = await sendReset(email.trim().toLowerCase())
    setResending(false)
    if (!err) setResent(true)
  }

  if (sent) {
    return (
      <div
        dir={isRTL ? 'rtl' : 'ltr'}
        style={{ minHeight: '100dvh', maxWidth: 430, margin: '0 auto', background: 'white', display: 'flex', flexDirection: 'column' }}
      >
        <div style={{ background: 'linear-gradient(135deg, #e91e8c, #f06292)', height: 6 }} />
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', padding: '40px 32px', textAlign: 'center',
        }}>
          <div style={{
            width: 88, height: 88, borderRadius: 24,
            background: 'linear-gradient(135deg, #fce4ec, #f8bbd0)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24,
          }}>
            <Mail size={40} color="#e91e8c" />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1a1a1a', margin: '0 0 12px' }}>
            {t('forgot_password', 'sent_title')}
          </h2>
          <p style={{ fontSize: 14, color: '#616161', lineHeight: 1.7, margin: '0 0 8px' }}>
            {t('forgot_password', 'sent_sub')} <strong>{email}</strong>
          </p>
          <p style={{ fontSize: 13, color: '#9e9e9e', lineHeight: 1.6, margin: '0 0 32px' }}>
            {t('forgot_password', 'sent_check')}
          </p>

          {resent && (
            <div style={{ width: '100%', background: '#e8f5e9', borderRadius: 10, padding: '10px 14px', color: '#2e7d32', fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
              {t('forgot_password', 'resent')}
            </div>
          )}

          <button onClick={handleResend} disabled={resending || resent}
            style={{
              width: '100%', padding: '14px', borderRadius: 14, border: 'none', marginBottom: 14,
              background: resent ? '#e8f5e9' : 'linear-gradient(135deg, #e91e8c, #f06292)',
              color: resent ? '#2e7d32' : 'white',
              fontSize: 15, fontWeight: 700, cursor: resending ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
            {resending
              ? <><Loader2 size={16} className="animate-spin" /> {t('forgot_password', 'resending')}</>
              : resent
              ? <><CheckCircle size={16} /> {t('forgot_password', 'resent')}</>
              : t('forgot_password', 'resend_btn')}
          </button>

          <Link href="/login" style={{ background: 'none', border: 'none', color: '#9e9e9e', fontSize: 14, textDecoration: 'none' }}>
            {t('forgot_password', 'back_login')}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      style={{ minHeight: '100dvh', background: '#f7f7f7', display: 'flex', flexDirection: 'column', maxWidth: 430, margin: '0 auto' }}
    >
      <div style={{
        background: 'linear-gradient(135deg, #e91e8c 0%, #f06292 100%)',
        paddingTop: 64, paddingBottom: 44, paddingLeft: 24, paddingRight: 24,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
      }}>
        <div style={{
          width: 72, height: 72, background: 'rgba(255,255,255,0.2)',
          borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36,
        }}>🔑</div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: 'white', margin: 0, textAlign: 'center' }}>
          {t('forgot_password', 'title')}
        </h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', margin: 0, textAlign: 'center' }}>
          {t('forgot_password', 'subtitle')}
        </p>
      </div>

      <div style={{
        flex: 1, background: 'white', borderRadius: '24px 24px 0 0',
        marginTop: -20, padding: '32px 24px 48px',
        display: 'flex', flexDirection: 'column', gap: 20,
      }}>
        {error && (
          <div style={{ background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 14px', color: '#dc2626', fontSize: 13, lineHeight: 1.5 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#3a3a3a', textAlign: isRTL ? 'right' : 'left' }}>
              {t('forgot_password', 'email')}
            </label>
            <input type="email" placeholder="your@email.com" value={email}
              onChange={e => setEmail(e.target.value)} onFocus={onFocus} onBlur={onBlur}
              style={inputStyle} required autoComplete="email" />
          </div>

          <button type="submit" disabled={loading} style={{
            background: loading ? 'linear-gradient(135deg, #f48fb1, #f8bbd0)' : 'linear-gradient(135deg, #e91e8c, #f06292)',
            color: 'white', border: 'none', borderRadius: 14, padding: '14px 0',
            fontSize: 16, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            marginTop: 4, boxShadow: loading ? 'none' : '0 4px 16px rgba(233,30,140,0.3)',
          }}>
            {loading
              ? <><Loader2 size={18} className="animate-spin" /> {t('forgot_password', 'sending')}</>
              : t('forgot_password', 'send_btn')}
          </button>
        </form>

        <div style={{ textAlign: 'center', paddingTop: 8, borderTop: '1px solid #f5f5f5' }}>
          <Link href="/login" style={{ color: '#e91e8c', fontWeight: 700, textDecoration: 'none', fontSize: 14 }}>
            {t('forgot_password', 'back_login')}
          </Link>
        </div>
      </div>
    </div>
  )
}
