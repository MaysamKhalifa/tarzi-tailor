'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useApp } from '@/lib/context/AppContext'
import { Check, Loader2, ChevronRight } from 'lucide-react'

const SPECIALTY_OPTIONS = [
  { id: 'kandoora',    emoji: '👘', label: 'Kandoora / Thobe',    desc: 'Traditional Emirati & Gulf garments' },
  { id: 'abaya',       emoji: '🧕', label: 'Abaya / Jalabiya',    desc: 'Women\'s traditional wear' },
  { id: 'suits',       emoji: '🤵', label: 'Suits & Blazers',     desc: 'Formal menswear' },
  { id: 'dresses',     emoji: '👗', label: 'Dresses & Gowns',     desc: 'Evening wear & casual dresses' },
  { id: 'wedding',     emoji: '💍', label: 'Wedding Wear',        desc: 'Bridal & groom attire' },
  { id: 'alterations', emoji: '✂️', label: 'Alterations & Repairs', desc: 'Adjustments & fixes' },
  { id: 'upcycling',   emoji: '♻️', label: 'Upcycling',           desc: 'Transform & redesign old clothes' },
  { id: 'bisht',       emoji: '🌙', label: 'Bisht / Mishlah',    desc: 'Ceremonial cloaks' },
  { id: 'kids',        emoji: '🧒', label: 'Kids Clothing',       desc: 'Children\'s garments' },
  { id: 'casual',      emoji: '👕', label: 'Casual Wear',         desc: 'Shirts, trousers, everyday items' },
  { id: 'sportswear',  emoji: '🏃', label: 'Sportswear',          desc: 'Athletic & activewear' },
  { id: 'embroidery',  emoji: '🪡', label: 'Embroidery',          desc: 'Custom embroidery & detailing' },
]

export default function OnboardingPage() {
  const { user, loading: authLoading, refreshProfile } = useApp()
  const router = useRouter()
  const [selected, setSelected] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState<'specialties' | 'done'>('specialties')

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.replace('/login')
      return
    }
    // Ensure profile role is set to tailor (in case trigger didn't run yet)
    const supabase = createClient()
    supabase.from('profiles').upsert({
      id: user.id,
      role: 'tailor',
      full_name: user.user_metadata?.full_name || '',
      phone: user.user_metadata?.phone || null,
    }, { onConflict: 'id' })
  }, [user, authLoading, router])

  const toggle = (id: string) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }

  const handleSave = async () => {
    if (selected.length === 0) {
      setError('Please select at least one specialty.')
      return
    }
    setSaving(true)
    setError('')
    const supabase = createClient()
    const { error: err } = await supabase
      .from('profiles')
      .upsert({
        id: user!.id,
        specialties: selected,
        onboarding_complete: true,
        role: 'tailor',
      }, { onConflict: 'id' })

    if (err) {
      setError('Failed to save. Please try again.')
      setSaving(false)
      return
    }
    await refreshProfile()
    setStep('done')
    setTimeout(() => router.replace('/home'), 1800)
  }

  if (authLoading) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={32} color="#e91e8c" className="animate-spin" />
      </div>
    )
  }

  if (step === 'done') {
    return (
      <div style={{
        minHeight: '100dvh', maxWidth: 430, margin: '0 auto',
        background: 'linear-gradient(135deg, #e91e8c 0%, #f06292 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '40px 32px', textAlign: 'center',
      }}>
        <div style={{
          width: 96, height: 96, borderRadius: '50%',
          background: 'rgba(255,255,255,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 24, fontSize: 48,
        }}>🎉</div>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: 'white', margin: '0 0 12px' }}>
          You&apos;re all set!
        </h1>
        <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.9)', lineHeight: 1.6 }}>
          Your tailor profile is ready. Start accepting orders!
        </p>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100dvh', maxWidth: 430, margin: '0 auto',
      background: '#f9f9f9', display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #e91e8c 0%, #f06292 100%)',
        padding: '56px 24px 36px',
      }}>
        {/* Progress bar */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
          {[1, 2].map(i => (
            <div key={i} style={{
              flex: 1, height: 4, borderRadius: 2,
              background: i === 1 ? 'white' : 'rgba(255,255,255,0.35)',
            }} />
          ))}
        </div>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: 600, margin: '0 0 6px' }}>
          STEP 1 OF 1
        </p>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: 'white', margin: '0 0 8px' }}>
          What do you specialise in?
        </h1>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', margin: 0, lineHeight: 1.5 }}>
          Select all that apply — customers will use this to find you
        </p>
      </div>

      {/* Specialty grid */}
      <div style={{ flex: 1, padding: '20px 16px 120px', overflowY: 'auto' }}>
        {error && (
          <div style={{
            background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 10,
            padding: '10px 14px', color: '#dc2626', fontSize: 13, marginBottom: 16,
          }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {SPECIALTY_OPTIONS.map(opt => {
            const isSelected = selected.includes(opt.id)
            return (
              <button key={opt.id} onClick={() => toggle(opt.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 16px', borderRadius: 16, border: 'none',
                  background: isSelected ? '#fce4ec' : 'white',
                  outline: isSelected ? '2px solid #e91e8c' : '2px solid transparent',
                  cursor: 'pointer', textAlign: 'left', width: '100%',
                  boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
                  transition: 'all 0.15s',
                }}>
                <span style={{ fontSize: 28, lineHeight: 1 }}>{opt.emoji}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: isSelected ? '#e91e8c' : '#1a1a1a', margin: 0 }}>
                    {opt.label}
                  </p>
                  <p style={{ fontSize: 12, color: '#9e9e9e', margin: '2px 0 0' }}>
                    {opt.desc}
                  </p>
                </div>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                  background: isSelected ? '#e91e8c' : '#f0f0f0',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s',
                }}>
                  {isSelected && <Check size={14} color="white" strokeWidth={3} />}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Sticky bottom button */}
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 430,
        padding: '16px 20px',
        paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
        background: 'white', borderTop: '1px solid #f0f0f0',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 13, color: '#9e9e9e' }}>
            {selected.length === 0 ? 'Select at least 1' : `${selected.length} selected`}
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            {selected.slice(0, 4).map(id => {
              const opt = SPECIALTY_OPTIONS.find(o => o.id === id)
              return opt ? (
                <span key={id} style={{ fontSize: 18 }}>{opt.emoji}</span>
              ) : null
            })}
            {selected.length > 4 && (
              <span style={{ fontSize: 12, color: '#e91e8c', fontWeight: 700 }}>+{selected.length - 4}</span>
            )}
          </div>
        </div>
        <button onClick={handleSave} disabled={saving || selected.length === 0}
          style={{
            width: '100%', padding: '15px', borderRadius: 14, border: 'none',
            background: selected.length === 0
              ? '#e0e0e0'
              : saving
              ? 'linear-gradient(135deg, #f48fb1, #f8bbd0)'
              : 'linear-gradient(135deg, #e91e8c, #f06292)',
            color: selected.length === 0 ? '#9e9e9e' : 'white',
            fontSize: 16, fontWeight: 700,
            cursor: selected.length === 0 || saving ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: selected.length > 0 && !saving ? '0 4px 16px rgba(233,30,140,0.3)' : 'none',
          }}>
          {saving ? (
            <><Loader2 size={18} className="animate-spin" /> Saving your profile...</>
          ) : (
            <>Complete Setup <ChevronRight size={18} /></>
          )}
        </button>
      </div>
    </div>
  )
}
