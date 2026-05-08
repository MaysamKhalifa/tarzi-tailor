'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

export default function SignupPage() {
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
  }

  const onFocus = (e: React.FocusEvent<HTMLInputElement>) => { e.target.style.borderColor = '#e91e8c' }
  const onBlur  = (e: React.FocusEvent<HTMLInputElement>) => { e.target.style.borderColor = '#e8e8e8' }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate
    if (!fullName.trim()) { setError('Please enter your full name.'); return }
    if (!phone.trim())    { setError('Phone number is required.'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }

    setLoading(true)

    try {
      const supabase = createClient()

      // Sign up — profile is created automatically by a DB trigger (handle_new_user)
      // We pass full_name, phone, role in metadata so the trigger can use them
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

      // If session exists immediately (email confirmation disabled) → try to update profile
      if (data.session) {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          full_name: fullName.trim(),
          phone: phone.trim(),
          role: 'tailor',
        }, { onConflict: 'id' })
        window.location.href = '/onboarding'
      } else {
        // Email confirmation required → show verify screen
        window.location.href = '/verify-email'
      }

    } catch {
      setError('An unexpected error occurred. Please try again.')
      setLoading(false)
    }
  }

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
          borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 36, marginBottom: 4,
        }}>✂️</div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: 'white', margin: 0, textAlign: 'center' }}>
          Join as a Tailor
        </h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', margin: 0, textAlign: 'center' }}>
          Start accepting orders on Tarzi today
        </p>
      </div>

      {/* Form */}
      <div style={{
        flex: 1, background: 'white', borderRadius: '24px 24px 0 0',
        marginTop: -20, padding: '32px 24px 48px',
        display: 'flex', flexDirection: 'column', gap: 20,
      }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>Create your account</h2>
          <p style={{ fontSize: 13, color: '#9e9e9e', margin: '4px 0 0' }}>Fill in your details to get started</p>
        </div>

        {error && (
          <div style={{ background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 14px', color: '#dc2626', fontSize: 13, lineHeight: 1.5 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Full Name */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#3a3a3a' }}>
              Full Name <span style={{ color: '#e91e8c' }}>*</span>
            </label>
            <input type="text" placeholder="Ahmed Al Rashidi" value={fullName}
              onChange={e => setFullName(e.target.value)} onFocus={onFocus} onBlur={onBlur}
              style={inputStyle} required autoComplete="name" />
          </div>

          {/* Email */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#3a3a3a' }}>
              Email Address <span style={{ color: '#e91e8c' }}>*</span>
            </label>
            <input type="email" placeholder="your@email.com" value={email}
              onChange={e => setEmail(e.target.value)} onFocus={onFocus} onBlur={onBlur}
              style={inputStyle} required autoComplete="email" />
          </div>

          {/* Password */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#3a3a3a' }}>
              Password <span style={{ color: '#e91e8c' }}>*</span>
            </label>
            <input type="password" placeholder="Min. 6 characters" value={password}
              onChange={e => setPassword(e.target.value)} onFocus={onFocus} onBlur={onBlur}
              style={inputStyle} required autoComplete="new-password" />
          </div>

          {/* Phone — REQUIRED */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#3a3a3a' }}>
              Phone Number <span style={{ color: '#e91e8c' }}>*</span>
            </label>
            <input type="tel" placeholder="+971 50 000 0000" value={phone}
              onChange={e => setPhone(e.target.value)} onFocus={onFocus} onBlur={onBlur}
              style={inputStyle} required autoComplete="tel" />
            <p style={{ fontSize: 11, color: '#9e9e9e', margin: 0 }}>
              Customers will use this to reach you for pickups
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
            {loading ? <><Loader2 size={18} className="animate-spin" /> Creating Account...</> : 'Create Account →'}
          </button>
        </form>

        <div style={{ textAlign: 'center', paddingTop: 8, borderTop: '1px solid #f5f5f5' }}>
          <p style={{ fontSize: 14, color: '#9e9e9e', margin: 0 }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: '#e91e8c', fontWeight: 700, textDecoration: 'none' }}>
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
