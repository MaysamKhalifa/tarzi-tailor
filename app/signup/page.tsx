'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'
import { useLanguage } from '@/lib/context/LanguageContext'
import type { Language } from '@/lib/i18n'

export default function SignupPage() {
  const { t, isRTL, setLanguage, lang } = useLanguage()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const inputStyle: React.CSSProperties = {
    border: '1.5px solid #e8e8e8',
    background: '#fafafa',
    borderRadius: 12,
    padding: '12px 14px',
    fontSize: 15,
    width: '100%',
    outline: 'none',
    boxSizing: 'border-box',
    color: '#1a1a1a',
    textAlign: isRTL ? 'right' : 'left',
    direction: isRTL ? 'rtl' : 'ltr',
  }

  const onFocus = (e: React.FocusEvent<HTMLInputElement>) => { e.target.style.borderColor = '#e91e8c' }
  const onBlur  = (e: React.FocusEvent<HTMLInputElement>) => { e.target.style.borderColor = '#e8e8e8' }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!fullName.trim()) { setError(t('onboarding', 'err_name')); return }
    if (!phone.trim())    { setError(t('onboarding', 'err_phone')); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }

    setLoading(true)

    try {
      const supabase = createClient()

      const { data, error: authError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            phone: phone.trim(),
            role: 'tailor',
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (authError) {
        setError(authError.message)
        setLoading(false)
        return
      }

      if (!data.user) {
        setError('Could not create account. Please try again.')
        setLoading(false)
        return
      }

      if (data.session) {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          full_name: fullName.trim(),
          phone: phone.trim(),
          role: 'tailor',
        }, { onConflict: 'id' })
        window.location.href = '/onboarding'
      } else {
        window.location.href = '/verify-email'
      }

    } catch {
      setError('An unexpected error occurred. Please try again.')
      setLoading(false)
    }
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
          borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 36, marginBottom: 4,
        }}>✂️</div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: 'white', margin: 0, textAlign: 'center' }}>
          {t('auth', 'signup_title')}
        </h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', margin: 0, textAlign: 'center' }}>
          {t('auth', 'signup_subtitle')}
        </p>
      </div>

      {/* Form */}
      <div style={{
        flex: 1, background: 'white', borderRadius: '24px 24px 0 0',
        marginTop: -20, padding: '32px 24px 48px',
        display: 'flex', flexDirection: 'column', gap: 20,
      }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a1a1a', margin: 0, textAlign: isRTL ? 'right' : 'left' }}>
            {t('auth', 'create_btn')}
          </h2>
          <p style={{ fontSize: 13, color: '#9e9e9e', margin: '4px 0 0', textAlign: isRTL ? 'right' : 'left' }}>
            {t('auth', 'signup_subtitle')}
          </p>
        </div>

        {error && (
          <div style={{ background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 14px', color: '#dc2626', fontSize: 13, lineHeight: 1.5 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Full Name */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#3a3a3a', textAlign: isRTL ? 'right' : 'left' }}>
              {t('auth', 'full_name')} <span style={{ color: '#e91e8c' }}>*</span>
            </label>
            <input type="text" placeholder="Ahmed Al Rashidi" value={fullName}
              onChange={e => setFullName(e.target.value)} onFocus={onFocus} onBlur={onBlur}
              style={inputStyle} required autoComplete="name" />
          </div>

          {/* Email */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#3a3a3a', textAlign: isRTL ? 'right' : 'left' }}>
              {t('auth', 'email')} <span style={{ color: '#e91e8c' }}>*</span>
            </label>
            <input type="email" placeholder="your@email.com" value={email}
              onChange={e => setEmail(e.target.value)} onFocus={onFocus} onBlur={onBlur}
              style={inputStyle} required autoComplete="email" />
          </div>

          {/* Password */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#3a3a3a', textAlign: isRTL ? 'right' : 'left' }}>
              {t('auth', 'password')} <span style={{ color: '#e91e8c' }}>*</span>
            </label>
            <input type="password" placeholder="Min. 6 characters" value={password}
              onChange={e => setPassword(e.target.value)} onFocus={onFocus} onBlur={onBlur}
              style={inputStyle} required autoComplete="new-password" />
          </div>

          {/* Phone */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#3a3a3a', textAlign: isRTL ? 'right' : 'left' }}>
              {t('auth', 'phone')} <span style={{ color: '#e91e8c' }}>*</span>
            </label>
            <input type="tel" placeholder="+971 50 000 0000" value={phone}
              onChange={e => setPhone(e.target.value)} onFocus={onFocus} onBlur={onBlur}
              style={inputStyle} required autoComplete="tel" />
            <p style={{ fontSize: 11, color: '#9e9e9e', margin: 0, textAlign: isRTL ? 'right' : 'left' }}>
              {t('auth', 'phone_hint')}
            </p>
          </div>

          <button type="submit" disabled={loading} style={{
            background: loading
              ? 'linear-gradient(135deg, #f48fb1, #f8bbd0)'
              : 'linear-gradient(135deg, #e91e8c, #f06292)',
            color: 'white', border: 'none', borderRadius: 14,
            padding: '14px 0', fontSize: 16, fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            marginTop: 4,
            boxShadow: loading ? 'none' : '0 4px 16px rgba(233,30,140,0.3)',
          }}>
            {loading
              ? <><Loader2 size={18} className="animate-spin" /> {t('auth', 'creating')}</>
              : t('auth', 'create_btn') + ' →'}
          </button>
        </form>

        <div style={{ textAlign: 'center', paddingTop: 8, borderTop: '1px solid #f5f5f5' }}>
          <p style={{ fontSize: 14, color: '#9e9e9e', margin: 0 }}>
            {t('auth', 'have_account')}{' '}
            <Link href="/login" style={{ color: '#e91e8c', fontWeight: 700, textDecoration: 'none' }}>
              {t('auth', 'sign_in')}
            </Link>
          </p>
        </div>

        <LanguageSwitcher />
      </div>
    </div>
  )
}
