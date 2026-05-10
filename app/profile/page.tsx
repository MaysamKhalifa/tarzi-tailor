'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useApp } from '@/lib/context/AppContext'
import { useLanguage } from '@/lib/context/LanguageContext'
import BottomNav from '@/components/layout/BottomNav'
import { Camera, Loader2, CheckCircle, Trash2, ImagePlus, Upload } from 'lucide-react'
import type { PortfolioItem } from '@/types/database'
import type { Language } from '@/lib/i18n'

const SPECIALTIES = [
  'Traditional Wear',
  'Western Wear',
  'Bridal',
  'Formal',
  'Casual',
  'Kids Wear',
  'Alterations Only',
  'All Types',
]

const LANGUAGE_OPTIONS: { code: string; label: string }[] = [
  { code: 'English',  label: 'English' },
  { code: 'Arabic',   label: 'عربي' },
  { code: 'Urdu',     label: 'اردو' },
  { code: 'Hindi',    label: 'हिंदी' },
  { code: 'French',   label: 'Français' },
  { code: 'Filipino', label: 'Filipino' },
]

const APP_LANGUAGES: { code: Language; label: string }[] = [
  { code: 'en', label: 'EN' },
  { code: 'ar', label: 'عربي' },
  { code: 'ur', label: 'اردو' },
]

interface ProfileForm {
  full_name: string
  phone: string
  bio: string
  specialty: string
  years_exp: string
  city: string
  area: string
  shop_name: string
  shop_address: string
  languages: string[]
  availability: string
  permit_url: string
}

export default function ProfilePage() {
  const router = useRouter()
  const { user, profile, loading: authLoading, refreshProfile } = useApp()
  const { t, lang, setLanguage, isRTL } = useLanguage()

  const [form, setForm] = useState<ProfileForm>({
    full_name: '',
    phone: '',
    bio: '',
    specialty: '',
    years_exp: '',
    city: '',
    area: '',
    shop_name: '',
    shop_address: '',
    languages: [],
    availability: '',
    permit_url: '',
  })

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadingPermit, setUploadingPermit] = useState(false)
  const [uploadingPortfolio, setUploadingPortfolio] = useState(false)
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([])
  const [loadingPortfolio, setLoadingPortfolio] = useState(false)
  const [toast, setToast] = useState('')
  const [error, setError] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const permitInputRef = useRef<HTMLInputElement>(null)
  const portfolioInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!authLoading && !user) router.push('/login')
  }, [authLoading, user, router])

  useEffect(() => {
    if (!profile) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = profile as any
    setForm({
      full_name: p.full_name ?? '',
      phone: p.phone ?? '',
      bio: p.bio ?? '',
      specialty: p.specialty ?? '',
      years_exp: p.years_exp != null ? String(p.years_exp) : '',
      city: p.city ?? '',
      area: p.area ?? '',
      shop_name: p.shop_name ?? '',
      shop_address: p.shop_address ?? '',
      languages: Array.isArray(p.languages) ? p.languages : [],
      availability: p.availability ?? '',
      permit_url: p.permit_url ?? '',
    })
    setAvatarUrl(profile.avatar_url ?? null)
  }, [profile])

  useEffect(() => {
    if (!user) return
    const loadPortfolio = async () => {
      setLoadingPortfolio(true)
      const supabase = createClient()
      const { data } = await supabase
        .from('tailor_portfolio')
        .select('*')
        .eq('tailor_id', user.id)
        .order('created_at', { ascending: false })
      setPortfolioItems(data ?? [])
      setLoadingPortfolio(false)
    }
    loadPortfolio()
  }, [user])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  // ---------- Avatar ----------
  const handleAvatarPress = () => fileInputRef.current?.click()

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploadingAvatar(true)
    setError('')
    const supabase = createClient()
    const ext = file.name.split('.').pop()
    const path = `avatars/${user.id}.${ext}`

    const { error: uploadErr } = await supabase.storage
      .from('garment-images')
      .upload(path, file, { upsert: true })

    if (uploadErr) {
      setError('Failed to upload photo.')
      setUploadingAvatar(false)
      return
    }

    const { data: urlData } = supabase.storage.from('garment-images').getPublicUrl(path)
    const { error: updateErr } = await supabase
      .from('profiles')
      .upsert({ id: user.id, avatar_url: urlData.publicUrl })

    if (updateErr) {
      setError('Uploaded but failed to save URL.')
    } else {
      setAvatarUrl(urlData.publicUrl)
      await refreshProfile()
    }
    setUploadingAvatar(false)
  }

  // ---------- Permit ----------
  const handlePermitChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploadingPermit(true)
    setError('')
    const supabase = createClient()
    const ext = file.name.split('.').pop()
    const path = `permits/${user.id}.${ext}`

    const { error: uploadErr } = await supabase.storage
      .from('garment-images')
      .upload(path, file, { upsert: true })

    if (uploadErr) {
      setError('Failed to upload permit.')
      setUploadingPermit(false)
      return
    }

    const { data: urlData } = supabase.storage.from('garment-images').getPublicUrl(path)
    const publicUrl = urlData.publicUrl

    const { error: updateErr } = await supabase
      .from('profiles')
      .upsert({ id: user.id, permit_url: publicUrl })

    if (updateErr) {
      setError('Uploaded but failed to save permit URL.')
    } else {
      setForm((prev) => ({ ...prev, permit_url: publicUrl }))
      await refreshProfile()
      showToast(t('profile', 'permit_uploaded'))
    }
    setUploadingPermit(false)
  }

  // ---------- Portfolio ----------
  const handlePortfolioChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploadingPortfolio(true)
    setError('')
    const supabase = createClient()
    const timestamp = Date.now()
    const path = `${user.id}/${timestamp}_${file.name}`

    const { error: uploadErr } = await supabase.storage
      .from('tailor-portfolio')
      .upload(path, file)

    if (uploadErr) {
      setError('Failed to upload portfolio photo. Make sure the tailor-portfolio bucket exists.')
      setUploadingPortfolio(false)
      return
    }

    const { data: urlData } = supabase.storage.from('tailor-portfolio').getPublicUrl(path)

    const { data: inserted, error: insertErr } = await supabase
      .from('tailor_portfolio')
      .insert({ tailor_id: user.id, image_url: urlData.publicUrl, caption: null })
      .select()
      .single()

    if (insertErr) {
      setError('Photo uploaded but failed to save record.')
    } else if (inserted) {
      setPortfolioItems((prev) => [inserted as PortfolioItem, ...prev])
    }
    setUploadingPortfolio(false)
    // reset input so same file can be re-selected
    if (portfolioInputRef.current) portfolioInputRef.current.value = ''
  }

  const handleDeletePortfolio = async (item: PortfolioItem) => {
    if (!user) return
    const supabase = createClient()

    // Extract storage path from public URL
    try {
      const url = new URL(item.image_url)
      const parts = url.pathname.split('/tailor-portfolio/')
      if (parts.length === 2) {
        await supabase.storage.from('tailor-portfolio').remove([parts[1]])
      }
    } catch {
      // Non-fatal — still delete the DB row
    }

    const { error: delErr } = await supabase
      .from('tailor_portfolio')
      .delete()
      .eq('id', item.id)

    if (delErr) {
      setError('Failed to delete photo.')
    } else {
      setPortfolioItems((prev) => prev.filter((p) => p.id !== item.id))
    }
  }

  // ---------- Language chips (spoken) ----------
  const toggleSpokenLanguage = (lang: string) => {
    setForm((prev) => ({
      ...prev,
      languages: prev.languages.includes(lang)
        ? prev.languages.filter((l) => l !== lang)
        : [...prev.languages, lang],
    }))
  }

  // ---------- Save ----------
  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    setError('')
    const supabase = createClient()

    const { error: err } = await supabase.from('profiles').upsert({
      id: user.id,
      full_name: form.full_name || null,
      phone: form.phone || null,
      bio: form.bio || null,
      specialty: form.specialty || null,
      years_exp: form.years_exp ? parseInt(form.years_exp, 10) : null,
      city: form.city || null,
      area: form.area || null,
      shop_name: form.shop_name || null,
      shop_address: form.shop_address || null,
      languages: form.languages.length > 0 ? form.languages : null,
      availability: form.availability || null,
      permit_url: form.permit_url || null,
    })

    if (err) {
      setError('Failed to save. Please try again.')
    } else {
      await refreshProfile()
      showToast(t('profile', 'saved'))
    }
    setSaving(false)
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.replace('/login')
  }

  const set =
    (key: keyof ProfileForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }))

  const initial = form.full_name?.charAt(0)?.toUpperCase() || 'T'

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f7f7f7' }}>
        <Loader2 size={32} color="#e91e8c" style={{ animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '11px 14px',
    borderRadius: 12,
    border: '1.5px solid #f0f0f0',
    background: '#fafafa',
    fontSize: 14,
    color: '#1a1a1a',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    textAlign: isRTL ? 'right' : 'left',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 600,
    color: '#9e9e9e',
    marginBottom: 6,
    display: 'block',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    textAlign: isRTL ? 'right' : 'left',
  }

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: 14,
    fontWeight: 800,
    color: '#1a1a1a',
    margin: '0 0 14px',
    textAlign: isRTL ? 'right' : 'left',
  }

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      style={{ minHeight: '100vh', background: '#f7f7f7', maxWidth: 430, margin: '0 auto', paddingBottom: 140 }}
    >
      {/* Toast */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: 60,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#1a1a1a',
            color: 'white',
            padding: '10px 20px',
            borderRadius: 24,
            fontSize: 13,
            fontWeight: 600,
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
            whiteSpace: 'nowrap',
          }}
        >
          <CheckCircle size={15} color="#4ade80" />
          {toast}
        </div>
      )}

      {/* Pink gradient header */}
      <div
        style={{
          background: 'linear-gradient(135deg, #e91e8c 0%, #f06292 100%)',
          paddingTop: 56,
          paddingBottom: 32,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
        }}
      >
        {/* Avatar */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={handleAvatarPress}
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              border: '3px solid rgba(255,255,255,0.7)',
              overflow: 'hidden',
              background: 'rgba(255,255,255,0.25)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
            }}
          >
            {uploadingAvatar ? (
              <Loader2 size={28} color="white" style={{ animation: 'spin 1s linear infinite' }} />
            ) : avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: 32, fontWeight: 800, color: 'white' }}>{initial}</span>
            )}
          </button>
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              width: 26,
              height: 26,
              borderRadius: 13,
              background: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
            }}
          >
            <Camera size={13} color="#e91e8c" />
          </div>
        </div>

        {/* Hidden file inputs */}
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
        <input ref={permitInputRef} type="file" accept="image/*,application/pdf" onChange={handlePermitChange} style={{ display: 'none' }} />
        <input ref={portfolioInputRef} type="file" accept="image/*" onChange={handlePortfolioChange} style={{ display: 'none' }} />

        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 18, fontWeight: 800, color: 'white', margin: 0 }}>
            {form.shop_name || form.full_name || 'Your Name'}
          </p>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              background: 'rgba(255,255,255,0.25)',
              color: 'white',
              padding: '3px 10px',
              borderRadius: 20,
              display: 'inline-block',
              marginTop: 4,
            }}
          >
            {t('profile', 'title')}
          </span>
        </div>
      </div>

      {/* Form sections */}
      <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {error && (
          <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 12, padding: '10px 14px' }}>
            <p style={{ fontSize: 13, color: '#dc2626', margin: 0, textAlign: isRTL ? 'right' : 'left' }}>{error}</p>
          </div>
        )}

        {/* ── Personal ── */}
        <div style={{ background: 'white', borderRadius: 16, padding: 16, boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
          <p style={sectionTitleStyle}>{t('profile', 'personal')}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={labelStyle}>{t('profile', 'full_name')}</label>
              <input style={inputStyle} value={form.full_name} onChange={set('full_name')} placeholder="Your full name" />
            </div>
            <div>
              <label style={labelStyle}>{t('profile', 'phone')}</label>
              <input style={inputStyle} value={form.phone} onChange={set('phone')} placeholder="+971 50 000 0000" type="tel" />
            </div>
            <div>
              <label style={labelStyle}>{t('profile', 'email')}</label>
              <input
                style={{ ...inputStyle, color: '#9e9e9e', background: '#f3f4f6' }}
                value={user?.email ?? ''}
                readOnly
              />
            </div>
          </div>
        </div>

        {/* ── Business ── */}
        <div style={{ background: 'white', borderRadius: 16, padding: 16, boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
          <p style={sectionTitleStyle}>{t('profile', 'business')}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={labelStyle}>{t('profile', 'shop_name')}</label>
              <input style={inputStyle} value={form.shop_name} onChange={set('shop_name')} placeholder="e.g. Al Rashidi Tailoring" />
            </div>
            <div>
              <label style={labelStyle}>{t('profile', 'specialty')}</label>
              <select style={{ ...inputStyle, appearance: 'none' }} value={form.specialty} onChange={set('specialty')}>
                <option value="">Select specialty</option>
                {SPECIALTIES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>{t('profile', 'years_exp')}</label>
              <input
                style={inputStyle}
                value={form.years_exp}
                onChange={set('years_exp')}
                placeholder="e.g. 5"
                type="number"
                min="0"
                max="60"
              />
            </div>
            <div>
              <label style={labelStyle}>{t('profile', 'bio')}</label>
              <textarea
                style={{ ...inputStyle, resize: 'none', minHeight: 80, lineHeight: 1.5 }}
                value={form.bio}
                onChange={set('bio')}
                placeholder="Tell customers about yourself and your work…"
                rows={3}
              />
            </div>
            <div>
              <label style={labelStyle}>{t('profile', 'availability')}</label>
              <input
                style={inputStyle}
                value={form.availability}
                onChange={set('availability')}
                placeholder="e.g. Mon–Fri 9am–7pm, Sat 10am–5pm"
              />
            </div>
          </div>
        </div>

        {/* ── Location ── */}
        <div style={{ background: 'white', borderRadius: 16, padding: 16, boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
          <p style={sectionTitleStyle}>{t('profile', 'location')}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={labelStyle}>{t('profile', 'city')}</label>
              <input style={inputStyle} value={form.city} onChange={set('city')} placeholder="e.g. Dubai" />
            </div>
            <div>
              <label style={labelStyle}>{t('profile', 'area')}</label>
              <input style={inputStyle} value={form.area} onChange={set('area')} placeholder="e.g. Jumeirah, Deira" />
            </div>
            <div>
              <label style={labelStyle}>{t('profile', 'shop_address')}</label>
              <input
                style={inputStyle}
                value={form.shop_address}
                onChange={set('shop_address')}
                placeholder="e.g. Shop 14, Al Fahidi Street, Bur Dubai"
              />
            </div>
          </div>
        </div>

        {/* ── Languages Spoken ── */}
        <div style={{ background: 'white', borderRadius: 16, padding: 16, boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
          <p style={sectionTitleStyle}>{t('profile', 'languages')}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {LANGUAGE_OPTIONS.map((opt) => {
              const active = form.languages.includes(opt.code)
              return (
                <button
                  key={opt.code}
                  onClick={() => toggleSpokenLanguage(opt.code)}
                  style={{
                    padding: '7px 14px',
                    borderRadius: 20,
                    border: active ? '2px solid #e91e8c' : '2px solid #f0f0f0',
                    background: active ? 'rgba(233,30,140,0.08)' : 'white',
                    color: active ? '#e91e8c' : '#555',
                    fontSize: 13,
                    fontWeight: active ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Trade License / Permit ── */}
        <div style={{ background: 'white', borderRadius: 16, padding: 16, boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
          <p style={sectionTitleStyle}>{t('profile', 'permit')}</p>
          {form.permit_url ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 14px',
                borderRadius: 12,
                background: 'rgba(74,222,128,0.08)',
                border: '1.5px solid #4ade80',
                justifyContent: isRTL ? 'flex-end' : 'flex-start',
              }}
            >
              <CheckCircle size={16} color="#16a34a" />
              <span style={{ fontSize: 13, fontWeight: 600, color: '#16a34a' }}>{t('profile', 'permit_uploaded')}</span>
              <button
                onClick={() => permitInputRef.current?.click()}
                style={{
                  marginLeft: isRTL ? 0 : 'auto',
                  marginRight: isRTL ? 'auto' : 0,
                  fontSize: 12,
                  color: '#9e9e9e',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                  textDecoration: 'underline',
                }}
              >
                Replace
              </button>
            </div>
          ) : (
            <button
              onClick={() => permitInputRef.current?.click()}
              disabled={uploadingPermit}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: 12,
                border: '2px dashed #e0e0e0',
                background: '#fafafa',
                color: '#9e9e9e',
                fontSize: 14,
                fontWeight: 600,
                cursor: uploadingPermit ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              {uploadingPermit ? (
                <>
                  <Loader2 size={16} color="#9e9e9e" style={{ animation: 'spin 1s linear infinite' }} />
                  {t('common', 'uploading')}
                </>
              ) : (
                <>
                  <Upload size={16} />
                  {t('profile', 'upload_permit')}
                </>
              )}
            </button>
          )}
          <p style={{ fontSize: 11, color: '#bdbdbd', marginTop: 6, marginBottom: 0, textAlign: isRTL ? 'right' : 'left' }}>
            JPG, PNG, or PDF accepted
          </p>
        </div>

        {/* ── Portfolio (Previous Work) ── */}
        <div style={{ background: 'white', borderRadius: 16, padding: 16, boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <p style={{ ...sectionTitleStyle, margin: 0 }}>{t('profile', 'portfolio')}</p>
            <button
              onClick={() => portfolioInputRef.current?.click()}
              disabled={uploadingPortfolio}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 14px',
                borderRadius: 20,
                border: 'none',
                background: uploadingPortfolio ? '#e0e0e0' : 'linear-gradient(135deg, #e91e8c, #f06292)',
                color: 'white',
                fontSize: 12,
                fontWeight: 700,
                cursor: uploadingPortfolio ? 'default' : 'pointer',
              }}
            >
              {uploadingPortfolio ? (
                <Loader2 size={13} color="white" style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <ImagePlus size={13} />
              )}
              {uploadingPortfolio ? t('common', 'uploading') : t('profile', 'add_photo')}
            </button>
          </div>

          {loadingPortfolio ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
              <Loader2 size={24} color="#e91e8c" style={{ animation: 'spin 1s linear infinite' }} />
            </div>
          ) : portfolioItems.length === 0 ? (
            <div
              style={{
                padding: '28px 16px',
                textAlign: 'center',
                border: '2px dashed #f0f0f0',
                borderRadius: 12,
                color: '#bdbdbd',
              }}
            >
              <ImagePlus size={28} color="#e0e0e0" style={{ margin: '0 auto 8px', display: 'block' }} />
              <p style={{ margin: 0, fontSize: 13 }}>{t('profile', 'portfolio_empty')}</p>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 10,
              }}
            >
              {portfolioItems.map((item) => (
                <div
                  key={item.id}
                  style={{
                    borderRadius: 12,
                    overflow: 'hidden',
                    position: 'relative',
                    aspectRatio: '1 / 1',
                    background: '#f3f4f6',
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.image_url}
                    alt={item.caption ?? 'Portfolio photo'}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                  {/* Caption overlay */}
                  {item.caption && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)',
                        padding: '16px 8px 6px',
                      }}
                    >
                      <p style={{ margin: 0, fontSize: 11, color: 'white', fontWeight: 600 }}>{item.caption}</p>
                    </div>
                  )}
                  {/* Delete button */}
                  <button
                    onClick={() => handleDeletePortfolio(item)}
                    style={{
                      position: 'absolute',
                      top: 6,
                      right: 6,
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      background: 'rgba(0,0,0,0.55)',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 0,
                    }}
                  >
                    <Trash2 size={14} color="white" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── App Language ── */}
        <div style={{ background: 'white', borderRadius: 16, padding: 16, boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
          <p style={sectionTitleStyle}>{t('profile', 'language_pref')}</p>
          <div style={{ display: 'flex', gap: 10 }}>
            {APP_LANGUAGES.map((appLang) => {
              const active = lang === appLang.code
              return (
                <button
                  key={appLang.code}
                  onClick={() => setLanguage(appLang.code, user?.id)}
                  style={{
                    flex: 1,
                    padding: '10px 4px',
                    borderRadius: 12,
                    border: active ? '2px solid #e91e8c' : '2px solid #f0f0f0',
                    background: active ? 'rgba(233,30,140,0.08)' : 'white',
                    color: active ? '#e91e8c' : '#555',
                    fontSize: 14,
                    fontWeight: active ? 800 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {appLang.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          style={{
            width: '100%',
            padding: '13px',
            borderRadius: 14,
            border: '2px solid #ef4444',
            background: 'transparent',
            color: '#ef4444',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            marginTop: 4,
          }}
        >
          {t('profile', 'logout')}
        </button>
      </div>

      {/* Fixed Save button */}
      <div
        style={{
          position: 'fixed',
          bottom: 64,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: 430,
          padding: '12px 16px',
          background: 'linear-gradient(to top, white 70%, transparent)',
          zIndex: 40,
        }}
      >
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            width: '100%',
            padding: '14px',
            borderRadius: 16,
            border: 'none',
            background: saving ? '#e0e0e0' : 'linear-gradient(135deg, #e91e8c, #f06292)',
            color: 'white',
            fontSize: 15,
            fontWeight: 800,
            cursor: saving ? 'default' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          {saving && <Loader2 size={18} color="white" style={{ animation: 'spin 1s linear infinite' }} />}
          {saving ? t('profile', 'saving') : t('profile', 'save_profile')}
        </button>
      </div>

      <BottomNav />
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
