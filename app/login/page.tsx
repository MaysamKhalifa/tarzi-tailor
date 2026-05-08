'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Mail } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [unverified, setUnverified] = useState(false)
  const [resending, setResending]   = useState(false)
  const [resent, setResent]         = useState(false)

  // ── Forward any Supabase auth tokens to the callback handler ──────────────
  // This handles the edge case where Supabase redirects to /login instead of
  // /auth/callback (e.g. the callback URL wasn't in the Supabase allowlist yet)
  useEffect(() => {
    const search = window.location.search
    const hash   = window.location.hash
    const code   = new URLSearchParams(search).get('code')
    const hasHashToken = hash.includes('access_token=')
    if (code || hasHashToken) {
      router.replace(`/auth/callback${search}${hash}`)
    }
  }, [router])

  const inputStyle: React.CSSProperties = {
    border: '1.5px solid #e8e8e8', background: '#fafafa',
    borderRadius: 12, padding: '12px 14px', fontSize: 15,
    width: '100%', outline: 'none', boxSizing: 'border-box', color: '#1a1a1a',
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
    if (!err) setResent(true)
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
      // Supabase returns this when email is not confirmed
      if (authError.message.toLowerCase().includes('email not confirmed') ||
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

    // ── If we got here, Supabase accepted the login — email IS verified ──
    // Fetch profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, onboarding_complete')
      .eq('id', authData.user.id)
      .single()

    if (!profile) {
      // Profile doesn't exist yet — create it and send to onboarding
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

    // Send to onboarding if not completed yet
    if (!profile.onboarding_complete) {
      window.location.href = '/onboarding'
      return
    }

    window.location.href = '/home'
  }

  // ── Email not verified screen ─────────────────────────────────────────────
  if (unverified) {
    return (
      <div style={{ minHeight: '100dvh', maxWidth: 430, margin: '0 auto', background: 'white', display: 'flex', flexDirection: 'column' }}>
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
            Verify your email first
          </h2>
          <p style={{ fontSize: 14, color: '#616161', lineHeight: 1.7, margin: '0 0 8px' }}>
            We sent a link to <strong>{email}</strong>
          </p>
          <p style={{ fontSize: 13, color: '#9e9e9e', lineHeight: 1.6, margin: '0 0 32px' }}>
            Click the link in your email to activate your account, then come back and sign in.
          </p>

          {resent && (
            <div style={{ width: '100%', background: '#e8f5e9', borderRadius: 10, padding: '10px 14px', color: '#2e7d32', fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
              ✓ Verification email resent!
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
            {resending ? <><Loader2 size={16} className="animate-spin" /> Sending...</> : resent ? '✓ Email Sent' : 'Resend Verification Email'}
          </button>

          <button onClick={() => setUnverified(false)}
            style={{ background: 'none', border: 'none', color: '#9e9e9e', fontSize: 14, cursor: 'pointer' }}>
            ← Back to Sign In
          </button>
        </div>
      </div>
    )
  }

  // ── Normal login screen ────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100dvh', background: '#f7f7f7', display: 'flex', flexDirection: 'column', maxWidth: 430, margin: '0 auto' }}>

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
          Manage your orders & grow your business
        </p>
      </div>

      {/* Form card */}
      <div style={{
        flex: 1, background: 'white', borderRadius: '24px 24px 0 0',
        marginTop: -20, padding: '32px 24px 48px',
        display: 'flex', flexDirection: 'column', gap: 20,
      }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>Welcome back</h2>
          <p style={{ fontSize: 13, color: '#9e9e9e', margin: '4px 0 0' }}>Sign in to your tailor account</p>
        </div>

        {error && (
          <div style={{ background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 14px', color: '#dc2626', fontSize: 13, lineHeight: 1.5 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#3a3a3a' }}>Email Address</label>
            <input type="email" placeholder="your@email.com" value={email}
              onChange={e => setEmail(e.target.value)} onFocus={onFocus} onBlur={onBlur}
              style={inputStyle} required autoComplete="email" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#3a3a3a' }}>Password</label>
            <input type="password" placeholder="Your password" value={password}
              onChange={e => setPassword(e.target.value)} onFocus={onFocus} onBlur={onBlur}
              style={inputStyle} required autoComplete="current-password" />
          </div>

          <button type="submit" disabled={loading} style={{
            background: loading ? 'linear-gradient(135deg, #f48fb1, #f8bbd0)' : 'linear-gradient(135deg, #e91e8c, #f06292)',
            color: 'white', border: 'none', borderRadius: 14, padding: '14px 0',
            fontSize: 16, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            marginTop: 4, boxShadow: loading ? 'none' : '0 4px 16px rgba(233,30,140,0.3)',
          }}>
            {loading ? <><Loader2 size={18} className="animate-spin" /> Signing In...</> : 'Sign In →'}
          </button>
        </form>

        <div style={{ textAlign: 'center', paddingTop: 8, borderTop: '1px solid #f5f5f5' }}>
          <p style={{ fontSize: 14, color: '#9e9e9e', margin: 0 }}>
            New tailor?{' '}
            <Link href="/signup" style={{ color: '#e91e8c', fontWeight: 700, textDecoration: 'none' }}>
              Join Tarzi
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
