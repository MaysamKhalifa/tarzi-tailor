'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Mail, ShieldCheck } from 'lucide-react'
import { useLanguage } from '@/lib/context/LanguageContext'
import type { Language } from '@/lib/i18n'

export default function LoginPage() {
  const router = useRouter()
  const { t, isRTL, setLanguage, lang } = useLanguage()

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [unverified, setUnverified] = useState(false)
  const [resending, setResending]   = useState(false)
  const [resent, setResent]         = useState(false)
  const [code, setCode]             = useState('')
  const [verifyingCode, setVerifyingCode] = useState(false)
  const [codeError, setCodeError]   = useState('')

  // ── Forward any Supabase auth tokens to the callback handler ──────────────
  useEffect(() => {
    const search = window.location.search
    const hash   = window.location.hash
    const params = new URLSearchParams(search)
    const code   = params.get('code')
    const tokenHash = params.get('token_hash')
    const hasHashToken = hash.includes('access_token=')
    if (code || tokenHash || hasHashToken || params.get('error')) {
      router.replace(`/auth/callback${search}${hash}`)
    }
  }, [router])

  const inputStyle: React.CSSProperties = {
    border: '1.5px solid #e8e8e8', background: '#fafafa',
    borderRadius: 12, padding: '12px 14px', fontSize: 15,
    width: '100%', outline: 'none', boxSizing: 'border-box', color: '#1a1a1a',
    textAlign: isRTL ? 'right' : 'left',
    direction: isRTL ? 'rtl' : 'ltr',
  }
  const onFocus = (e: React.FocusEvent<HTMLInputElement>) => { e.target.style.borderColor = '#e91e8c' }
  const onBlur  = (e: React.FocusEvent<HTMLInputElement>) => { e.target.style.borderColor = '#e8e8e8' }

  const handleResend = async () => {
    setResending(true)
    const supabase = createClient()
    const { error: err } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    setResending(false)
    if (err) {
      console.error('[login] resend failed:', err.status, err.message)
    } else {
      setResent(true)
    }
  }

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (code.trim().length !== 6) { setCodeError(t('auth', 'err_code_length')); return }
    setVerifyingCode(true)
    setCodeError('')

    const supabase = createClient()
    const { data, error: verifyErr } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: code.trim(),
      type: 'signup',
    })

    if (verifyErr) {
      console.error('[login] verifyOtp failed:', verifyErr.status, verifyErr.message)
      setCodeError(verifyErr.message)
      setVerifyingCode(false)
      return
    }

    const user = data.user
    if (!user) {
      setCodeError('Could not verify your account. Please try again.')
      setVerifyingCode(false)
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, onboarding_complete')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile) {
      await supabase.from('profiles').upsert({
        id: user.id,
        full_name: user.user_metadata?.full_name || '',
        phone: user.user_metadata?.phone || null,
        role: 'tailor',
      }, { onConflict: 'id' })
      window.location.href = '/onboarding'
      return
    }

    window.location.href = profile.onboarding_complete ? '/home' : '/onboarding'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setUnverified(false)
    setLoading(true)

    const supabase = createClient()

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })

    if (authError) {
      console.error('[login] signInWithPassword failed:', authError.status, authError.code, authError.message)
      if (authError.code === 'email_not_confirmed' ||
          authError.message.toLowerCase().includes('not confirmed')) {
        setUnverified(true)
      } else {
        setError(authError.message)
      }
      setLoading(false)
      return
    }

    if (!authData.user) {
      setError('Something went wrong. Please try again.')
      setLoading(false)
      return
    }

    // Fetch profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, onboarding_complete')
      .eq('id', authData.user.id)
      .single()

    if (!profile) {
      await supabase.from('profiles').upsert({
        id: authData.user.id,
        full_name: authData.user.user_metadata?.full_name || '',
        phone: authData.user.user_metadata?.phone || null,
        role: 'tailor',
      }, { onConflict: 'id' })
      window.location.href = '/onboarding'
      return
    }

    if (profile.role !== 'tailor' && profile.role !== 'admin') {
      setError('Access restricted to tailor accounts. Please use the Tarzi customer app.')
      await supabase.auth.signOut()
      setLoading(false)
      return
    }

    if (!profile.onboarding_complete) {
      window.location.href = '/onboarding'
      return
    }

    window.location.href = '/home'
  }

  const LANG_BUTTONS: { code: Language; label: string }[] = [
    { code: 'en', label: 'EN' },
    { code: 'ar', label: 'عربي' },
    { code: 'ur', label: 'اردو' },
  ]

  const LanguageSwitcher = () => (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 8, paddingTop: 8 }}>
      {LANG_BUTTONS.map(({ code, label }) => (
        <button
          key={code}
          onClick={() => setLanguage(code)}
          style={{
            padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600,
            border: lang === code ? '2px solid #e91e8c' : '2px solid #e8e8e8',
            background: lang === code ? '#fce4ec' : 'white',
            color: lang === code ? '#e91e8c' : '#9e9e9e',
            cursor: 'pointer',
          }}
        >
          {label}
        </button>
      ))}
    </div>
  )

  // ── Email not verified screen ─────────────────────────────────────────────
  if (unverified) {
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
            {t('auth', 'unverified_title')}
          </h2>
          <p style={{ fontSize: 14, color: '#616161', lineHeight: 1.7, margin: '0 0 8px' }}>
            {t('auth', 'unverified_body')} <strong>{email}</strong>
          </p>
          <p style={{ fontSize: 13, color: '#9e9e9e', lineHeight: 1.6, margin: '0 0 32px' }}>
            {t('auth', 'unverified_sub')}
          </p>

          {resent && (
            <div style={{ width: '100%', background: '#e8f5e9', borderRadius: 10, padding: '10px 14px', color: '#2e7d32', fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
              {t('auth', 'resent_confirm')}
            </div>
          )}

          <button onClick={handleResend} disabled={resending || resent}
            style={{
              width: '100%', padding: '14px', borderRadius: 14, border: 'none', marginBottom: 20,
              background: resent ? '#e8f5e9' : 'linear-gradient(135deg, #e91e8c, #f06292)',
              color: resent ? '#2e7d32' : 'white',
              fontSize: 15, fontWeight: 700, cursor: resending ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
            {resending
              ? <><Loader2 size={16} className="animate-spin" /> {t('auth', 'resending')}</>
              : resent
              ? t('auth', 'resent')
              : t('auth', 'resend_verify')}
          </button>

          <form onSubmit={handleVerifyCode} style={{ width: '100%' }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#555', display: 'block', marginBottom: 6, textAlign: 'left' }}>
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

            {codeError && (
              <div style={{ width: '100%', background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', marginBottom: 14, color: '#dc2626', fontSize: 13 }}>
                {codeError}
              </div>
            )}

            <button type="submit" disabled={verifyingCode}
              style={{
                width: '100%', padding: '14px', borderRadius: 14, border: '1.5px solid #e91e8c',
                background: 'white', color: '#e91e8c',
                fontSize: 15, fontWeight: 700, cursor: verifyingCode ? 'not-allowed' : 'pointer',
                marginBottom: 14,
              }}>
              {verifyingCode ? t('auth', 'verifying_code') : t('auth', 'verify_btn')}
            </button>
          </form>

          <button onClick={() => setUnverified(false)}
            style={{ background: 'none', border: 'none', color: '#9e9e9e', fontSize: 14, cursor: 'pointer' }}>
            {t('auth', 'back_login')}
          </button>
        </div>
      </div>
    )
  }

  // ── Normal login screen ────────────────────────────────────────────────────
  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      style={{ minHeight: '100dvh', background: '#f7f7f7', display: 'flex', flexDirection: 'column', maxWidth: 430, margin: '0 auto' }}
    >
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #e91e8c 0%, #f06292 100%)',
        paddingTop: 64, paddingBottom: 44, paddingLeft: 24, paddingRight: 24,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
      }}>
        <div style={{
          width: 72, height: 72, background: 'rgba(255,255,255,0.2)',
          borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36,
        }}>✂️</div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: 'white', margin: 0, textAlign: 'center' }}>
          Tarzi Tailor Portal
        </h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', margin: 0, textAlign: 'center' }}>
          {t('auth', 'manage_subtitle')}
        </p>
      </div>

      {/* Form card */}
      <div style={{
        flex: 1, background: 'white', borderRadius: '24px 24px 0 0',
        marginTop: -20, padding: '32px 24px 48px',
        display: 'flex', flexDirection: 'column', gap: 20,
      }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a1a1a', margin: 0, textAlign: isRTL ? 'right' : 'left' }}>
            {t('auth', 'login_title')}
          </h2>
          <p style={{ fontSize: 13, color: '#9e9e9e', margin: '4px 0 0', textAlign: isRTL ? 'right' : 'left' }}>
            {t('auth', 'login_subtitle')}
          </p>
        </div>

        {error && (
          <div style={{ background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 14px', color: '#dc2626', fontSize: 13, lineHeight: 1.5 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#3a3a3a', textAlign: isRTL ? 'right' : 'left' }}>
              {t('auth', 'email')}
            </label>
            <input type="email" placeholder="your@email.com" value={email}
              onChange={e => setEmail(e.target.value)} onFocus={onFocus} onBlur={onBlur}
              style={inputStyle} required autoComplete="email" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#3a3a3a', textAlign: isRTL ? 'right' : 'left' }}>
              {t('auth', 'password')}
            </label>
            <input type="password" placeholder="••••••••" value={password}
              onChange={e => setPassword(e.target.value)} onFocus={onFocus} onBlur={onBlur}
              style={inputStyle} required autoComplete="current-password" />
          </div>

          <div style={{ textAlign: isRTL ? 'left' : 'right' }}>
            <Link href="/forgot-password" style={{ fontSize: 13, color: '#e91e8c', fontWeight: 600, textDecoration: 'none' }}>
              {t('auth', 'forgot_password')}
            </Link>
          </div>

          <button type="submit" disabled={loading} style={{
            background: loading ? 'linear-gradient(135deg, #f48fb1, #f8bbd0)' : 'linear-gradient(135deg, #e91e8c, #f06292)',
            color: 'white', border: 'none', borderRadius: 14, padding: '14px 0',
            fontSize: 16, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            marginTop: 4, boxShadow: loading ? 'none' : '0 4px 16px rgba(233,30,140,0.3)',
          }}>
            {loading
              ? <><Loader2 size={18} className="animate-spin" /> {t('auth', 'logging_in')}</>
              : t('auth', 'login_btn') + ' →'}
          </button>
        </form>

        <div style={{ textAlign: 'center', paddingTop: 8, borderTop: '1px solid #f5f5f5' }}>
          <p style={{ fontSize: 14, color: '#9e9e9e', margin: 0 }}>
            {t('auth', 'new_tailor')}{' '}
            <Link href="/signup" style={{ color: '#e91e8c', fontWeight: 700, textDecoration: 'none' }}>
              {t('auth', 'join_tarzi')}
            </Link>
          </p>
        </div>

        <LanguageSwitcher />
      </div>
    </div>
  )
}
