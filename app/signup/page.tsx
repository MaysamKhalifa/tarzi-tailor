'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

const SPECIALTIES = [
  { value: 'kandoora_abaya', label: 'Kandoora/Abaya' },
  { value: 'wedding_formal', label: 'Wedding/Formal' },
  { value: 'alterations', label: 'Alterations' },
  { value: 'upcycling', label: 'Upcycling' },
  { value: 'general', label: 'General Tailoring' },
]

export default function SignupPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [specialty, setSpecialty] = useState('')
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
    transition: 'border-color 0.2s',
    color: '#1a1a1a',
  }

  const handleFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.target.style.borderColor = '#e91e8c'
  }

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.target.style.borderColor = '#e8e8e8'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()

      // Step 1: Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
        },
      })

      if (authError) {
        setError(authError.message)
        setLoading(false)
        return
      }

      if (!authData.user) {
        setError('Could not create account. Please try again.')
        setLoading(false)
        return
      }

      // Step 2: Upsert profile with tailor role
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: authData.user.id,
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        role: 'tailor',
      })

      if (profileError) {
        setError('Account created but profile setup failed. Please contact support.')
        setLoading(false)
        return
      }

      router.push('/home')
    } catch {
      setError('An unexpected error occurred. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f7f7f7',
        display: 'flex',
        flexDirection: 'column',
        maxWidth: 430,
        margin: '0 auto',
      }}
    >
      {/* Pink gradient header */}
      <div
        style={{
          background: 'linear-gradient(135deg, #e91e8c 0%, #f06292 100%)',
          paddingTop: 60,
          paddingBottom: 40,
          paddingLeft: 24,
          paddingRight: 24,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            background: 'rgba(255,255,255,0.2)',
            borderRadius: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 36,
            marginBottom: 4,
          }}
        >
          ✂️
        </div>
        <h1
          style={{
            fontSize: 26,
            fontWeight: 800,
            color: 'white',
            margin: 0,
            textAlign: 'center',
            letterSpacing: -0.5,
          }}
        >
          Join as a Tailor
        </h1>
        <p
          style={{
            fontSize: 14,
            color: 'rgba(255,255,255,0.85)',
            margin: 0,
            textAlign: 'center',
            lineHeight: 1.5,
          }}
        >
          Start accepting orders on Tarzi today
        </p>
      </div>

      {/* Form card */}
      <div
        style={{
          flex: 1,
          background: 'white',
          borderRadius: '24px 24px 0 0',
          marginTop: -20,
          padding: '32px 24px 48px',
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
        }}
      >
        <div>
          <h2
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: '#1a1a1a',
              margin: 0,
            }}
          >
            Create your account
          </h2>
          <p style={{ fontSize: 13, color: '#9e9e9e', margin: '4px 0 0' }}>
            Fill in your details to get started
          </p>
        </div>

        {error && (
          <div
            style={{
              background: '#fff5f5',
              border: '1px solid #fecaca',
              borderRadius: 10,
              padding: '12px 14px',
              color: '#dc2626',
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Full Name */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#3a3a3a' }}>
              Full Name <span style={{ color: '#e91e8c' }}>*</span>
            </label>
            <input
              type="text"
              placeholder="Ahmed Al Rashidi"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              onFocus={handleFocus}
              onBlur={handleBlur}
              style={inputStyle}
              required
              autoComplete="name"
            />
          </div>

          {/* Email */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#3a3a3a' }}>
              Email Address <span style={{ color: '#e91e8c' }}>*</span>
            </label>
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={handleFocus}
              onBlur={handleBlur}
              style={inputStyle}
              required
              autoComplete="email"
            />
          </div>

          {/* Password */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#3a3a3a' }}>
              Password <span style={{ color: '#e91e8c' }}>*</span>
            </label>
            <input
              type="password"
              placeholder="Min. 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={handleFocus}
              onBlur={handleBlur}
              style={inputStyle}
              required
              autoComplete="new-password"
            />
          </div>

          {/* Phone (optional) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#3a3a3a' }}>
              Phone{' '}
              <span style={{ fontSize: 12, color: '#bdbdbd', fontWeight: 400 }}>(optional)</span>
            </label>
            <input
              type="tel"
              placeholder="+971 50 000 0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onFocus={handleFocus}
              onBlur={handleBlur}
              style={inputStyle}
              autoComplete="tel"
            />
          </div>

          {/* Specialty dropdown */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#3a3a3a' }}>
              Specialty{' '}
              <span style={{ fontSize: 12, color: '#bdbdbd', fontWeight: 400 }}>(optional)</span>
            </label>
            <select
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              onFocus={handleFocus}
              onBlur={handleBlur}
              style={{
                ...inputStyle,
                appearance: 'none',
                WebkitAppearance: 'none',
                backgroundImage:
                  'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'16\' height=\'16\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%239e9e9e\' stroke-width=\'2\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'/%3E%3C/svg%3E")',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 14px center',
                paddingRight: 40,
                cursor: 'pointer',
              }}
            >
              <option value="">Select your specialty...</option>
              {SPECIALTIES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              background: loading
                ? 'linear-gradient(135deg, #f48fb1 0%, #f8bbd0 100%)'
                : 'linear-gradient(135deg, #e91e8c 0%, #f06292 100%)',
              color: 'white',
              border: 'none',
              borderRadius: 14,
              padding: '14px 0',
              fontSize: 16,
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              marginTop: 4,
              boxShadow: loading ? 'none' : '0 4px 16px rgba(233,30,140,0.3)',
              transition: 'all 0.2s',
            }}
          >
            {loading ? (
              <>
                <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                Creating Account...
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <div
          style={{
            textAlign: 'center',
            paddingTop: 8,
            borderTop: '1px solid #f5f5f5',
          }}
        >
          <p style={{ fontSize: 14, color: '#9e9e9e', margin: 0 }}>
            Already have an account?{' '}
            <Link
              href="/login"
              style={{
                color: '#e91e8c',
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              Sign In
            </Link>
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
