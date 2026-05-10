'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLanguage } from '@/lib/context/LanguageContext'
import { Check, Loader2, ChevronRight, Upload } from 'lucide-react'

// ─── Specialty options ────────────────────────────────────────────────────────
const SPECIALTY_OPTIONS = [
  { id: 'kandoora',    emoji: '👘', label: 'Kandoora / Thobe',       desc: 'Traditional Emirati & Gulf garments' },
  { id: 'abaya',       emoji: '🧕', label: 'Abaya / Jalabiya',       desc: "Women's traditional wear" },
  { id: 'suits',       emoji: '🤵', label: 'Suits & Blazers',        desc: 'Formal menswear' },
  { id: 'dresses',     emoji: '👗', label: 'Dresses & Gowns',        desc: 'Evening wear & casual dresses' },
  { id: 'wedding',     emoji: '💍', label: 'Wedding Wear',           desc: 'Bridal & groom attire' },
  { id: 'alterations', emoji: '✂️', label: 'Alterations & Repairs',  desc: 'Adjustments & fixes' },
  { id: 'upcycling',   emoji: '♻️', label: 'Upcycling',              desc: 'Transform & redesign old clothes' },
  { id: 'bisht',       emoji: '🌙', label: 'Bisht / Mishlah',        desc: 'Ceremonial cloaks' },
  { id: 'kids',        emoji: '🧒', label: 'Kids Clothing',          desc: "Children's garments" },
  { id: 'casual',      emoji: '👕', label: 'Casual Wear',            desc: 'Shirts, trousers, everyday items' },
  { id: 'sportswear',  emoji: '🏃', label: 'Sportswear',             desc: 'Athletic & activewear' },
  { id: 'embroidery',  emoji: '🪡', label: 'Embroidery',             desc: 'Custom embroidery & detailing' },
]

// ─── Language chip options ────────────────────────────────────────────────────
const LANG_OPTIONS = [
  { id: 'en', labelKey: 'lang_en' as const },
  { id: 'ar', labelKey: 'lang_ar' as const },
  { id: 'ur', labelKey: 'lang_ur' as const },
  { id: 'hi', labelKey: 'lang_hi' as const },
  { id: 'fr', labelKey: 'lang_fr' as const },
  { id: 'tl', labelKey: 'lang_tl' as const },
]

type Step = 'step1' | 'step2' | 'step3' | 'step4' | 'done'

interface FormState {
  shopName: string
  phone: string
  shopAddress: string
  availability: string
}

interface FieldErrors {
  shopName?: string
  phone?: string
  shopAddress?: string
  languages?: string
  specialties?: string
}

export default function OnboardingPage() {
  const { t, isRTL } = useLanguage()
  const router = useRouter()

  // ── Auth state ────────────────────────────────────────────────────────────
  const [userId, setUserId] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  // ── Step state ────────────────────────────────────────────────────────────
  const [step, setStep] = useState<Step>('step1')

  // ── Form fields ───────────────────────────────────────────────────────────
  const [form, setForm] = useState<FormState>({ shopName: '', phone: '', shopAddress: '', availability: '' })
  const [selected, setSelected] = useState<string[]>([])            // specialties
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([])

  // ── Upload state ──────────────────────────────────────────────────────────
  const [permitFile, setPermitFile] = useState<File | null>(null)
  const [permitUrl, setPermitUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── UI state ──────────────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})

  // ── Get current user ──────────────────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        router.replace('/login')
        return
      }
      const u = session.user
      setUserId(u.id)
      // Pre-fill phone from metadata if available
      const metaPhone = u.user_metadata?.phone || ''
      setForm(prev => ({ ...prev, phone: metaPhone }))
      // Ensure profile role is set
      supabase.from('profiles').upsert({
        id: u.id,
        role: 'tailor',
        full_name: u.user_metadata?.full_name || '',
        phone: metaPhone || null,
      }, { onConflict: 'id' })
      setAuthLoading(false)
    })
  }, [router])

  // ── Helpers ───────────────────────────────────────────────────────────────
  const stepNumber = () => {
    const map: Record<Step, number> = { step1: 1, step2: 2, step3: 3, step4: 4, done: 4 }
    return map[step] ?? 1
  }

  const stepLabel = () =>
    t('onboarding', 'step_of')
      .replace('{n}', String(stepNumber()))
      .replace('{total}', '4')

  const toggleSpecialty = (id: string) =>
    setSelected(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])

  const toggleLanguage = (id: string) =>
    setSelectedLanguages(prev => prev.includes(id) ? prev.filter(l => l !== id) : [...prev, id])

  const updateForm = (key: keyof FormState, value: string) =>
    setForm(prev => ({ ...prev, [key]: value }))

  // ── Step validation ───────────────────────────────────────────────────────
  const validateStep1 = () => {
    const errs: FieldErrors = {}
    if (!form.shopName.trim()) errs.shopName = t('onboarding', 'err_name')
    if (!form.phone.trim())    errs.phone    = t('onboarding', 'err_phone')
    if (!form.shopAddress.trim()) errs.shopAddress = t('onboarding', 'err_name')
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const validateStep2 = () => {
    if (selected.length === 0) {
      setErrors({ specialties: t('onboarding', 'err_select') })
      return false
    }
    setErrors({})
    return true
  }

  const validateStep3 = () => {
    if (selectedLanguages.length === 0) {
      setErrors({ languages: t('onboarding', 'err_language') })
      return false
    }
    setErrors({})
    return true
  }

  // ── File upload ───────────────────────────────────────────────────────────
  const handleFileSelect = async (file: File) => {
    if (!userId) return
    setPermitFile(file)
    setUploading(true)
    setUploadProgress(0)

    // Simulate progress ticks
    const ticker = setInterval(() => {
      setUploadProgress(p => Math.min(p + 15, 90))
    }, 200)

    const supabase = createClient()
    const ext = file.name.split('.').pop()
    const path = `permits/${userId}/${Date.now()}.${ext}`

    const { data, error } = await supabase.storage
      .from('garment-images')
      .upload(path, file, { upsert: true })

    clearInterval(ticker)
    setUploadProgress(100)
    setUploading(false)

    if (!error && data) {
      const { data: urlData } = supabase.storage.from('garment-images').getPublicUrl(data.path)
      setPermitUrl(urlData.publicUrl)
    }
  }

  // ── Final save ────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!userId) return
    setSaving(true)
    setErrors({})

    const supabase = createClient()
    const { error: err } = await supabase.from('profiles').upsert({
      id: userId,
      shop_name: form.shopName,
      phone: form.phone,
      shop_address: form.shopAddress,
      specialties: selected,
      languages: selectedLanguages,
      availability: form.availability,
      permit_url: permitUrl || null,
      onboarding_complete: true,
      role: 'tailor',
    }, { onConflict: 'id' })

    if (err) {
      setErrors({ specialties: t('onboarding', 'err_save') })
      setSaving(false)
      return
    }

    setStep('done')
    setTimeout(() => router.replace('/home'), 1800)
  }

  // ─── Input / label style helpers ──────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    border: '1.5px solid #e8e8e8', background: '#fafafa',
    borderRadius: 12, padding: '12px 14px', fontSize: 15,
    width: '100%', outline: 'none', boxSizing: 'border-box', color: '#1a1a1a',
    textAlign: isRTL ? 'right' : 'left',
    direction: isRTL ? 'rtl' : 'ltr',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 13, fontWeight: 600, color: '#3a3a3a',
    textAlign: isRTL ? 'right' : 'left',
  }

  const onFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.target.style.borderColor = '#e91e8c'
  }
  const onBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.target.style.borderColor = '#e8e8e8'
  }

  // ─── Progress bar ──────────────────────────────────────────────────────────
  const ProgressBar = () => (
    <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
      {[1, 2, 3, 4].map(i => (
        <div key={i} style={{
          flex: 1, height: 4, borderRadius: 2,
          background: i <= stepNumber() ? 'white' : 'rgba(255,255,255,0.35)',
          transition: 'background 0.3s',
        }} />
      ))}
    </div>
  )

  // ─── Header ────────────────────────────────────────────────────────────────
  const Header = ({ title, subtitle }: { title: string; subtitle: string }) => (
    <div style={{
      background: 'linear-gradient(135deg, #e91e8c 0%, #f06292 100%)',
      padding: '56px 24px 36px',
    }}>
      <ProgressBar />
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: 600, margin: '0 0 6px', textAlign: isRTL ? 'right' : 'left' }}>
        {stepLabel()}
      </p>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: 'white', margin: '0 0 8px', textAlign: isRTL ? 'right' : 'left' }}>
        {title}
      </h1>
      <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', margin: 0, lineHeight: 1.5, textAlign: isRTL ? 'right' : 'left' }}>
        {subtitle}
      </p>
    </div>
  )

  // ─── Sticky bottom action bar ──────────────────────────────────────────────
  const ActionBar = ({ children }: { children: React.ReactNode }) => (
    <div style={{
      position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 430,
      padding: '16px 20px',
      paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
      background: 'white', borderTop: '1px solid #f0f0f0',
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      {children}
    </div>
  )

  // ─── Auth loading ──────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={32} color="#e91e8c" className="animate-spin" />
      </div>
    )
  }

  // ─── Done screen: Pending admin review ────────────────────────────────────
  if (step === 'done') {
    return (
      <div style={{
        minHeight: '100dvh', maxWidth: 430, margin: '0 auto',
        background: 'linear-gradient(135deg, #1565c0 0%, #1976d2 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '40px 32px', textAlign: 'center',
      }}>
        <div style={{
          width: 96, height: 96, borderRadius: '50%',
          background: 'rgba(255,255,255,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 24, fontSize: 48,
        }}>⏳</div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: 'white', margin: '0 0 12px' }}>
          {t('onboarding', 'pending_title')}
        </h1>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.9)', lineHeight: 1.7, marginBottom: 32 }}>
          {t('onboarding', 'pending_sub')}
        </p>
        <div style={{
          background: 'rgba(255,255,255,0.15)', borderRadius: 16, padding: '16px 20px',
          marginBottom: 20, width: '100%',
        }}>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 1.6, margin: 0 }}>
            {t('onboarding', 'pending_note')}
          </p>
        </div>
      </div>
    )
  }

  // ─── Step 1: Shop Info ─────────────────────────────────────────────────────
  if (step === 'step1') {
    return (
      <div dir={isRTL ? 'rtl' : 'ltr'} style={{ minHeight: '100dvh', maxWidth: 430, margin: '0 auto', background: '#f9f9f9', display: 'flex', flexDirection: 'column' }}>
        <Header title={t('onboarding', 'step1_title')} subtitle={t('onboarding', 'step1_sub')} />

        <div style={{ flex: 1, padding: '24px 20px 140px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Shop Name */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={labelStyle}>
              {t('onboarding', 'shop_name')} <span style={{ color: '#e91e8c' }}>*</span>
            </label>
            <input
              type="text"
              placeholder={t('onboarding', 'shop_name_ph')}
              value={form.shopName}
              onChange={e => updateForm('shopName', e.target.value)}
              onFocus={onFocus} onBlur={onBlur}
              style={{ ...inputStyle, borderColor: errors.shopName ? '#dc2626' : '#e8e8e8' }}
            />
            {errors.shopName && <p style={{ fontSize: 12, color: '#dc2626', margin: 0 }}>{errors.shopName}</p>}
          </div>

          {/* Phone */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={labelStyle}>
              {t('auth', 'phone')} <span style={{ color: '#e91e8c' }}>*</span>
            </label>
            <input
              type="tel"
              placeholder="+971 50 000 0000"
              value={form.phone}
              onChange={e => updateForm('phone', e.target.value)}
              onFocus={onFocus} onBlur={onBlur}
              style={{ ...inputStyle, borderColor: errors.phone ? '#dc2626' : '#e8e8e8' }}
            />
            {errors.phone && <p style={{ fontSize: 12, color: '#dc2626', margin: 0 }}>{errors.phone}</p>}
          </div>

          {/* Shop Address */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={labelStyle}>
              {t('onboarding', 'shop_address')} <span style={{ color: '#e91e8c' }}>*</span>
            </label>
            <input
              type="text"
              placeholder={t('onboarding', 'shop_address_ph')}
              value={form.shopAddress}
              onChange={e => updateForm('shopAddress', e.target.value)}
              onFocus={onFocus} onBlur={onBlur}
              style={{ ...inputStyle, borderColor: errors.shopAddress ? '#dc2626' : '#e8e8e8' }}
            />
            {errors.shopAddress && <p style={{ fontSize: 12, color: '#dc2626', margin: 0 }}>{errors.shopAddress}</p>}
          </div>
        </div>

        <ActionBar>
          <button
            onClick={() => { if (validateStep1()) setStep('step2') }}
            style={{
              width: '100%', padding: '15px', borderRadius: 14, border: 'none',
              background: 'linear-gradient(135deg, #e91e8c, #f06292)',
              color: 'white', fontSize: 16, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 4px 16px rgba(233,30,140,0.3)',
            }}
          >
            {t('onboarding', 'continue_btn')} <ChevronRight size={18} />
          </button>
        </ActionBar>
      </div>
    )
  }

  // ─── Step 2: Specialties ───────────────────────────────────────────────────
  if (step === 'step2') {
    return (
      <div dir={isRTL ? 'rtl' : 'ltr'} style={{ minHeight: '100dvh', maxWidth: 430, margin: '0 auto', background: '#f9f9f9', display: 'flex', flexDirection: 'column' }}>
        <Header title={t('onboarding', 'step2_title')} subtitle={t('onboarding', 'step2_sub')} />

        <div style={{ flex: 1, padding: '20px 16px 140px', overflowY: 'auto' }}>
          {errors.specialties && (
            <div style={{ background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', color: '#dc2626', fontSize: 13, marginBottom: 16 }}>
              {errors.specialties}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {SPECIALTY_OPTIONS.map(opt => {
              const isSel = selected.includes(opt.id)
              return (
                <button key={opt.id} onClick={() => toggleSpecialty(opt.id)}
                  style={{
                    display: 'flex', alignItems: 'center',
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                    gap: 14,
                    padding: '14px 16px', borderRadius: 16, border: 'none',
                    background: isSel ? '#fce4ec' : 'white',
                    outline: isSel ? '2px solid #e91e8c' : '2px solid transparent',
                    cursor: 'pointer', textAlign: isRTL ? 'right' : 'left', width: '100%',
                    boxShadow: '0 1px 6px rgba(0,0,0,0.06)', transition: 'all 0.15s',
                  }}>
                  <span style={{ fontSize: 28, lineHeight: 1 }}>{opt.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: isSel ? '#e91e8c' : '#1a1a1a', margin: 0 }}>
                      {opt.label}
                    </p>
                    <p style={{ fontSize: 12, color: '#9e9e9e', margin: '2px 0 0' }}>
                      {opt.desc}
                    </p>
                  </div>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                    background: isSel ? '#e91e8c' : '#f0f0f0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.15s',
                  }}>
                    {isSel && <Check size={14} color="white" strokeWidth={3} />}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <ActionBar>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: '#9e9e9e' }}>
              {selected.length === 0
                ? t('onboarding', 'select_min')
                : t('onboarding', 'selected').replace('{n}', String(selected.length))}
            </span>
            <div style={{ display: 'flex', gap: 4 }}>
              {selected.slice(0, 4).map(id => {
                const opt = SPECIALTY_OPTIONS.find(o => o.id === id)
                return opt ? <span key={id} style={{ fontSize: 18 }}>{opt.emoji}</span> : null
              })}
              {selected.length > 4 && (
                <span style={{ fontSize: 12, color: '#e91e8c', fontWeight: 700 }}>+{selected.length - 4}</span>
              )}
            </div>
          </div>
          <button
            onClick={() => { if (validateStep2()) setStep('step3') }}
            disabled={selected.length === 0}
            style={{
              width: '100%', padding: '15px', borderRadius: 14, border: 'none',
              background: selected.length === 0 ? '#e0e0e0' : 'linear-gradient(135deg, #e91e8c, #f06292)',
              color: selected.length === 0 ? '#9e9e9e' : 'white',
              fontSize: 16, fontWeight: 700, cursor: selected.length === 0 ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: selected.length > 0 ? '0 4px 16px rgba(233,30,140,0.3)' : 'none',
            }}
          >
            {t('onboarding', 'continue_btn')} <ChevronRight size={18} />
          </button>
        </ActionBar>
      </div>
    )
  }

  // ─── Step 3: Languages & Availability ─────────────────────────────────────
  if (step === 'step3') {
    return (
      <div dir={isRTL ? 'rtl' : 'ltr'} style={{ minHeight: '100dvh', maxWidth: 430, margin: '0 auto', background: '#f9f9f9', display: 'flex', flexDirection: 'column' }}>
        <Header title={t('onboarding', 'step3_title')} subtitle={t('onboarding', 'step3_sub')} />

        <div style={{ flex: 1, padding: '24px 20px 140px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Languages */}
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', margin: '0 0 12px', textAlign: isRTL ? 'right' : 'left' }}>
              {t('onboarding', 'languages')}
            </p>
            {errors.languages && (
              <p style={{ fontSize: 12, color: '#dc2626', margin: '0 0 10px' }}>{errors.languages}</p>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {LANG_OPTIONS.map(({ id, labelKey }) => {
                const isSel = selectedLanguages.includes(id)
                return (
                  <button
                    key={id}
                    onClick={() => toggleLanguage(id)}
                    style={{
                      padding: '8px 16px', borderRadius: 20, fontSize: 14, fontWeight: 600,
                      border: isSel ? '2px solid #e91e8c' : '2px solid #e8e8e8',
                      background: isSel ? '#fce4ec' : 'white',
                      color: isSel ? '#e91e8c' : '#616161',
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    {t('onboarding', labelKey)}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Availability */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={labelStyle}>
              {t('onboarding', 'availability')}
              <span style={{ color: '#9e9e9e', fontWeight: 400, fontSize: 12 }}> ({t('common', 'optional')})</span>
            </label>
            <input
              type="text"
              placeholder={t('onboarding', 'avail_ph')}
              value={form.availability}
              onChange={e => updateForm('availability', e.target.value)}
              onFocus={onFocus} onBlur={onBlur}
              style={inputStyle}
            />
          </div>
        </div>

        <ActionBar>
          <button
            onClick={() => { if (validateStep3()) setStep('step4') }}
            disabled={selectedLanguages.length === 0}
            style={{
              width: '100%', padding: '15px', borderRadius: 14, border: 'none',
              background: selectedLanguages.length === 0 ? '#e0e0e0' : 'linear-gradient(135deg, #e91e8c, #f06292)',
              color: selectedLanguages.length === 0 ? '#9e9e9e' : 'white',
              fontSize: 16, fontWeight: 700, cursor: selectedLanguages.length === 0 ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: selectedLanguages.length > 0 ? '0 4px 16px rgba(233,30,140,0.3)' : 'none',
            }}
          >
            {t('onboarding', 'continue_btn')} <ChevronRight size={18} />
          </button>
        </ActionBar>
      </div>
    )
  }

  // ─── Step 4: Trade License ─────────────────────────────────────────────────
  if (step === 'step4') {
    return (
      <div dir={isRTL ? 'rtl' : 'ltr'} style={{ minHeight: '100dvh', maxWidth: 430, margin: '0 auto', background: '#f9f9f9', display: 'flex', flexDirection: 'column' }}>
        <Header title={t('onboarding', 'step4_title')} subtitle={t('onboarding', 'step4_sub')} />

        <div style={{ flex: 1, padding: '24px 20px 160px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Upload area */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,application/pdf"
            style={{ display: 'none' }}
            onChange={e => {
              const file = e.target.files?.[0]
              if (file) handleFileSelect(file)
            }}
          />

          {!permitUrl ? (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              style={{
                width: '100%', padding: '36px 20px', borderRadius: 16,
                border: '2px dashed #e91e8c', background: '#fdf5f9',
                cursor: uploading ? 'not-allowed' : 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
              }}
            >
              {uploading ? (
                <>
                  <Loader2 size={32} color="#e91e8c" className="animate-spin" />
                  <p style={{ fontSize: 14, color: '#e91e8c', fontWeight: 600, margin: 0 }}>
                    {t('common', 'uploading')} {uploadProgress}%
                  </p>
                  <div style={{ width: '100%', background: '#fce4ec', borderRadius: 4, height: 6 }}>
                    <div style={{
                      width: `${uploadProgress}%`, background: 'linear-gradient(135deg, #e91e8c, #f06292)',
                      height: '100%', borderRadius: 4, transition: 'width 0.2s',
                    }} />
                  </div>
                </>
              ) : (
                <>
                  <Upload size={32} color="#e91e8c" />
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#e91e8c', margin: 0 }}>
                    {t('onboarding', 'upload_permit')}
                  </p>
                  <p style={{ fontSize: 13, color: '#9e9e9e', margin: 0 }}>
                    {t('onboarding', 'permit_types')}
                  </p>
                </>
              )}
            </button>
          ) : (
            <div style={{
              width: '100%', padding: '20px', borderRadius: 16,
              background: '#e8f5e9', border: '2px solid #4caf50',
              display: 'flex', alignItems: 'center',
              flexDirection: isRTL ? 'row-reverse' : 'row',
              gap: 14,
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: '#c8e6c9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Check size={22} color="#2e7d32" strokeWidth={3} />
              </div>
              <div>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#2e7d32', margin: 0 }}>
                  {t('onboarding', 'permit_uploaded')}
                </p>
                {permitFile && (
                  <p style={{ fontSize: 12, color: '#4caf50', margin: '4px 0 0' }}>{permitFile.name}</p>
                )}
              </div>
            </div>
          )}

          {/* Note */}
          <p style={{ fontSize: 13, color: '#9e9e9e', lineHeight: 1.6, margin: 0, textAlign: isRTL ? 'right' : 'left' }}>
            {t('onboarding', 'permit_note')}
          </p>
          <div style={{
            background: '#fff3e0', borderRadius: 10, padding: '10px 14px',
            display: 'flex', alignItems: 'flex-start', gap: 8,
            flexDirection: isRTL ? 'row-reverse' : 'row',
          }}>
            <span style={{ fontSize: 16 }}>⚠️</span>
            <p style={{ fontSize: 13, color: '#e65100', margin: 0, lineHeight: 1.5 }}>
              {t('onboarding', 'permit_required_note')}
            </p>
          </div>

          {errors.specialties && (
            <div style={{ background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', color: '#dc2626', fontSize: 13 }}>
              {errors.specialties}
            </div>
          )}
        </div>

        <ActionBar>
          <button
            onClick={() => {
              if (!permitUrl) {
                setErrors({ specialties: t('onboarding', 'err_permit') })
                return
              }
              handleSave()
            }}
            disabled={saving || uploading}
            style={{
              width: '100%', padding: '15px', borderRadius: 14, border: 'none',
              background: (saving || uploading)
                ? 'linear-gradient(135deg, #f48fb1, #f8bbd0)'
                : 'linear-gradient(135deg, #e91e8c, #f06292)',
              color: 'white', fontSize: 16, fontWeight: 700,
              cursor: (saving || uploading) ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: (saving || uploading) ? 'none' : '0 4px 16px rgba(233,30,140,0.3)',
            }}
          >
            {saving
              ? <><Loader2 size={18} className="animate-spin" /> {t('onboarding', 'saving')}</>
              : uploading
              ? <><Loader2 size={18} className="animate-spin" /> {t('common', 'uploading')}</>
              : <>{t('onboarding', 'complete_btn')} <ChevronRight size={18} /></>}
          </button>
        </ActionBar>
      </div>
    )
  }

  return null
}
