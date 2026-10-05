'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react'
import { useLanguage } from '@/lib/context/LanguageContext'

type Status = 'loading' | 'ready' | 'invalid' | 'success'

export default function ResetPasswordPage() {
  const { t, isRTL } = useLanguage()
  const [status, setStatus] = useState<Status>('loading')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // The reset-password link carries recovery tokens in the URL (hash or
  // ?code=), which the Supabase client auto-detects (detectSessionInUrl)
  // and exchanges for a session on page load. Poll briefly for that session.
  useEffect(() => {
    const supabase = createClient()
    const check = async () => {
      let session = null
      for (let i = 0; i < 10; i++) {
        const { data } = await supabase.auth.getSession()
        if (data.session) { session = data.session; break }
        await new Promise(r => setTimeout(r, 400))
      }
      setStatus(session ? 'ready' : 'invalid')
    }
    check()
  }, [])

  const inputStyle: React.CSSProperties = {
    border: '1.5px solid #e8e8e8', background: '#fafafa',
    borderRadius: 12, padding: '12px 14px', fontSize: 15,
    width: '100%', outline: 'none', boxSizing: 'border-box', color: '#1a1a1a',
    textAlign: isRTL ? 'right' : 'left',
    direction: isRTL ? 'rtl' : 'ltr',
  }
  const onFocus = (e: React.FocusEvent<HTMLInputElement>) => { e.target.style.borderColor = '#e91e8c' }
  const onBlur  = (e: React.FocusEvent<HTMLInputElement>) => { e.target.style.borderColor = '#e8e8e8' }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!password || !confirmPassword) { setError(t('reset_password', 'err_required')); return }
    if (password.length < 6) { setError(t('reset_password', 'err_length')); return }
    if (password !== confirmPassword) { setError(t('reset_password', 'err_match')); return }
    setSaving(true)

    const supabase = createClient()
    const { error: err } = await supabase.auth.updateUser({ password })
    if (err) {
      console.error('[reset-password] updateUser failed:', err.status, err.message)
      setError(err.message)
      setSaving(false)
      return
    }
    await supabase.auth.signOut()
    setStatus('success')
  }

  if (status === 'loading') {
    return (
      <div style={{ minHeight: '100dvh', maxWidth: 430, margin: '0 auto', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={40} color="#e91e8c" className="animate-spin" />
      </div>
    )
  }

  if (status === 'invalid') {
    return (
      <div dir={isRTL ? 'rtl' : 'ltr'} style={{ minHeight: '100dvh', maxWidth: 430, margin: '0 auto', background: 'white', display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: 'linear-gradient(135deg, #e91e8c, #f06292)', height: 6 }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 32px', textAlign: 'center' }}>
          <div style={{ width: 88, height: 88, borderRadius: 24, background: '#fff0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
            <XCircle size={40} color="#d32f2f" />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1a1a1a', margin: '0 0 12px' }}>{t('reset_password', 'invalid_title')}</h2>
          <p style={{ fontSize: 14, color: '#616161', lineHeight: 1.7, margin: '0 0 28px' }}>{t('reset_password', 'invalid_sub')}</p>
          <Link href="/forgot-password" style={{
            width: '100%', padding: '14px', borderRadius: 14, border: 'none',
            background: 'linear-gradient(135deg, #e91e8c, #f06292)', color: 'white',
            fontSize: 15, fontWeight: 700, textDecoration: 'none', display: 'block',
          }}>
            {t('reset_password', 'request_new')}
          </Link>
        </div>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div dir={isRTL ? 'rtl' : 'ltr'} style={{ minHeight: '100dvh', maxWidth: 430, margin: '0 auto', background: 'white', display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: 'linear-gradient(135deg, #e91e8c, #f06292)', height: 6 }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 32px', textAlign: 'center' }}>
          <div style={{ width: 88, height: 88, borderRadius: 24, background: '#e8f5e9', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
            <CheckCircle size={40} color="#2e7d32" />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1a1a1a', margin: '0 0 12px' }}>{t('reset_password', 'success_title')}</h2>
          <p style={{ fontSize: 14, color: '#616161', lineHeight: 1.7, margin: '0 0 28px' }}>{t('reset_password', 'success_sub')}</p>
          <Link href="/login" style={{
            width: '100%', padding: '14px', borderRadius: 14, border: 'none',
            background: 'linear-gradient(135deg, #e91e8c, #f06292)', color: 'white',
            fontSize: 15, fontWeight: 700, textDecoration: 'none', display: 'block',
          }}>
            {t('reset_password', 'go_login')}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} style={{ minHeight: '100dvh', background: '#f7f7f7', display: 'flex', flexDirection: 'column', maxWidth: 430, margin: '0 auto' }}>
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
          {t('reset_password', 'title')}
        </h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', margin: 0, textAlign: 'center' }}>
          {t('reset_password', 'subtitle')}
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
              {t('reset_password', 'password')}
            </label>
            <div style={{ position: 'relative' }}>
              <input type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password}
                onChange={e => setPassword(e.target.value)} onFocus={onFocus} onBlur={onBlur}
                style={{ ...inputStyle, paddingRight: 44 }} required autoComplete="new-password" />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#9e9e9e', cursor: 'pointer' }}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#3a3a3a', textAlign: isRTL ? 'right' : 'left' }}>
              {t('reset_password', 'confirm_password')}
            </label>
            <input type="password" placeholder="••••••••" value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)} onFocus={onFocus} onBlur={onBlur}
              style={inputStyle} required autoComplete="new-password" />
          </div>

          <button type="submit" disabled={saving} style={{
            background: saving ? 'linear-gradient(135deg, #f48fb1, #f8bbd0)' : 'linear-gradient(135deg, #e91e8c, #f06292)',
            color: 'white', border: 'none', borderRadius: 14, padding: '14px 0',
            fontSize: 16, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            marginTop: 4, boxShadow: saving ? 'none' : '0 4px 16px rgba(233,30,140,0.3)',
          }}>
            {saving
              ? <><Loader2 size={18} className="animate-spin" /> {t('reset_password', 'saving')}</>
              : t('reset_password', 'btn')}
          </button>
        </form>
      </div>
    </div>
  )
}
