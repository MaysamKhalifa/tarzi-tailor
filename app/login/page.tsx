'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
  }

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = '#e91e8c'
  }

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = '#e8e8e8'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const supabase = createClient()

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (authError) {
        setError(authError.message)
        setLoading(false)
        return
      }

      if (!authData.user) {
        setError('Something went wrong. Please try again.')
        setLoading(false)
        return
      }

      // Check profile role
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authData.user.id)
        .single()

      if (profileError || !profile) {
        setError('Could not verify your account. Please contact support.')
        await supabase.auth.signOut()
        setLoading(false)
        return
      }

      if (profile.role === 'tailor' || profile.role === 'admin') {
        router.push('/home')
      } else {
        setError('Access restricted to tailor accounts.')
        await supabase.auth.signOut()
        setLoading(false)
      }
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
          paddingTop: 72,
          paddingBottom: 48,
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
          Tarzi Tailor Portal
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
          Manage your orders &amp; grow your business
        </p>
      </div>

      {/* Form card */}
      <div
        style={{
          flex: 1,
          background: 'white',
          borderRadius: '24px 24px 0 0',
          marginTop: -20,
          padding: '32px 24px 40px',
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
            Welcome back
          </h2>
          <p style={{ fontSize: 13, color: '#9e9e9e', margin: '4px 0 0' }}>
            Sign in to your tailor account
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#3a3a3a' }}>
              Email Address
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#3a3a3a' }}>
              Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={handleFocus}
              onBlur={handleBlur}
              style={inputStyle}
              required
              autoComplete="current-password"
            />
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
                Signing In...
              </>
            ) : (
              'Sign In'
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
            New tailor?{' '}
            <Link
              href="/signup"
              style={{
                color: '#e91e8c',
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              Join Tarzi
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
