'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Mail, RefreshCw, CheckCircle } from 'lucide-react'

export default function VerifyEmailPage() {
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

  return (
    <div style={{
      minHeight: '100dvh', maxWidth: 430, margin: '0 auto',
      background: 'white', display: 'flex', flexDirection: 'column',
    }}>
      {/* Pink top strip */}
      <div style={{
        background: 'linear-gradient(135deg, #e91e8c 0%, #f06292 100%)',
        height: 6,
      }} />

      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '40px 32px', textAlign: 'center',
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

        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#1a1a1a', margin: '0 0 12px' }}>
          Check your inbox
        </h1>
        <p style={{ fontSize: 15, color: '#616161', lineHeight: 1.7, margin: '0 0 8px' }}>
          We sent a verification link to your email address.
        </p>
        <p style={{ fontSize: 13, color: '#9e9e9e', lineHeight: 1.6, margin: '0 0 36px' }}>
          Click the link in the email to verify your account and complete your tailor profile setup.
        </p>

        {/* Steps hint */}
        <div style={{
          width: '100%', background: '#f9f9f9', borderRadius: 16,
          padding: '20px', marginBottom: 32, textAlign: 'left',
        }}>
          {[
            { step: '1', text: 'Open the email from Tarzi' },
            { step: '2', text: 'Click "Verify Email"' },
            { step: '3', text: 'Complete your tailor profile' },
          ].map(({ step, text }) => (
            <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: step === '3' ? 0 : 14 }}>
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
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <CheckCircle size={18} color="#2e7d32" />
            <span style={{ fontSize: 14, color: '#2e7d32', fontWeight: 600 }}>
              Verification email resent!
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
            <><RefreshCw size={16} className="animate-spin" /> Sending...</>
          ) : resent ? (
            <><CheckCircle size={16} /> Email Sent!</>
          ) : (
            'Resend Verification Email'
          )}
        </button>

        <Link href="/login" style={{ fontSize: 14, color: '#9e9e9e', textDecoration: 'none' }}>
          Already verified?{' '}
          <span style={{ color: '#e91e8c', fontWeight: 700 }}>Sign In</span>
        </Link>
      </div>
    </div>
  )
}
