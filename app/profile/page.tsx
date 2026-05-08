'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useApp } from '@/lib/context/AppContext'
import BottomNav from '@/components/layout/BottomNav'
import { Camera, Loader2, CheckCircle } from 'lucide-react'

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

interface ProfileForm {
  full_name: string
  phone: string
  bio: string
  specialty: string
  years_exp: string
  city: string
  area: string
}

export default function ProfilePage() {
  const router = useRouter()
  const { user, profile, loading: authLoading, refreshProfile } = useApp()
  const [form, setForm] = useState<ProfileForm>({
    full_name: '',
    phone: '',
    bio: '',
    specialty: '',
    years_exp: '',
    city: '',
    area: '',
  })
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [toast, setToast] = useState('')
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

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
    })
    setAvatarUrl(profile.avatar_url ?? null)
  }, [profile])

  const handleAvatarPress = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
    const publicUrl = urlData.publicUrl

    const { error: updateErr } = await supabase
      .from('profiles')
      .upsert({ id: user.id, avatar_url: publicUrl })

    if (updateErr) {
      setError('Uploaded but failed to save URL.')
    } else {
      setAvatarUrl(publicUrl)
      await refreshProfile()
    }
    setUploadingAvatar(false)
  }

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
    })

    if (err) {
      setError('Failed to save. Please try again.')
    } else {
      await refreshProfile()
      setToast('Profile saved!')
      setTimeout(() => setToast(''), 3000)
    }
    setSaving(false)
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.replace('/login')
  }

  const set = (key: keyof ProfileForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
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
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 600,
    color: '#9e9e9e',
    marginBottom: 6,
    display: 'block',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f7f7f7', maxWidth: 430, margin: '0 auto', paddingBottom: 140 }}>
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

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />

        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 18, fontWeight: 800, color: 'white', margin: 0 }}>
            {form.full_name || 'Your Name'}
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
            Tailor
          </span>
        </div>
      </div>

      {/* Form sections */}
      <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {error && (
          <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 12, padding: '10px 14px' }}>
            <p style={{ fontSize: 13, color: '#dc2626', margin: 0 }}>{error}</p>
          </div>
        )}

        {/* Personal */}
        <div style={{ background: 'white', borderRadius: 16, padding: '16px', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
          <p style={{ fontSize: 14, fontWeight: 800, color: '#1a1a1a', margin: '0 0 14px' }}>Personal</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={labelStyle}>Full Name</label>
              <input style={inputStyle} value={form.full_name} onChange={set('full_name')} placeholder="Your full name" />
            </div>
            <div>
              <label style={labelStyle}>Phone</label>
              <input style={inputStyle} value={form.phone} onChange={set('phone')} placeholder="+971 50 000 0000" type="tel" />
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <input
                style={{ ...inputStyle, color: '#9e9e9e', background: '#f3f4f6' }}
                value={user?.email ?? ''}
                readOnly
              />
            </div>
          </div>
        </div>

        {/* Business */}
        <div style={{ background: 'white', borderRadius: 16, padding: '16px', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
          <p style={{ fontSize: 14, fontWeight: 800, color: '#1a1a1a', margin: '0 0 14px' }}>Business</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={labelStyle}>Specialty</label>
              <select style={{ ...inputStyle, appearance: 'none' }} value={form.specialty} onChange={set('specialty')}>
                <option value="">Select specialty</option>
                {SPECIALTIES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Years of Experience</label>
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
              <label style={labelStyle}>Bio / Description</label>
              <textarea
                style={{ ...inputStyle, resize: 'none', minHeight: 80, lineHeight: 1.5 }}
                value={form.bio}
                onChange={set('bio')}
                placeholder="Tell customers about yourself and your work…"
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* Location */}
        <div style={{ background: 'white', borderRadius: 16, padding: '16px', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
          <p style={{ fontSize: 14, fontWeight: 800, color: '#1a1a1a', margin: '0 0 14px' }}>Location</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={labelStyle}>City</label>
              <input style={inputStyle} value={form.city} onChange={set('city')} placeholder="e.g. Dubai" />
            </div>
            <div>
              <label style={labelStyle}>Area / Neighborhood</label>
              <input style={inputStyle} value={form.area} onChange={set('area')} placeholder="e.g. Jumeirah, Deira" />
            </div>
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
          Log Out
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
          {saving ? 'Saving…' : 'Save Profile'}
        </button>
      </div>

      <BottomNav />
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
