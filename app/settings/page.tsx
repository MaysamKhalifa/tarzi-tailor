'use client'

import { useRouter } from 'next/navigation'
import {
  Globe, Bell, Shield, Info, LogOut,
  ChevronRight, Ruler, Star, Mail, Phone
} from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import BottomNav from '@/components/layout/BottomNav'
import { useApp } from '@/lib/context/AppContext'
import { useLanguage } from '@/lib/context/LanguageContext'
import { createClient } from '@/lib/supabase/client'
import type { Language } from '@/lib/i18n'

export default function SettingsPage() {
  const router = useRouter()
  const { user, profile } = useApp()
  const { t, lang, setLanguage, isRTL } = useLanguage()

  const handleLogout = async () => {
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
    } catch { /* ignore */ }
    window.location.replace('/login')
  }

  const LANGUAGES: { code: Language; label: string; native: string }[] = [
    { code: 'en', label: 'English',  native: 'English' },
    { code: 'ar', label: 'Arabic',   native: 'عربي' },
    { code: 'ur', label: 'Urdu',     native: 'اردو' },
  ]

  const MENU_ITEMS = [
    {
      icon: Ruler,
      label: 'My Profile',
      sub: 'Edit shop info, location & portfolio',
      href: '/profile',
    },
    {
      icon: Star,
      label: 'My Reviews',
      sub: 'See what customers are saying',
      href: '/reviews',
    },
    {
      icon: Bell,
      label: t('notifications', 'title'),
      sub: 'Order alerts and updates',
      href: '/notifications',
    },
    {
      icon: Mail,
      label: 'Email',
      sub: user?.email || '—',
      href: null,
    },
    {
      icon: Phone,
      label: t('profile', 'phone'),
      sub: profile?.phone || 'Not set — update in Profile',
      href: '/profile',
    },
    {
      icon: Shield,
      label: 'Trade License',
      sub: profile?.permit_url ? 'Uploaded ✓' : 'Not uploaded — required for visibility',
      href: '/profile',
    },
    {
      icon: Info,
      label: 'App Version',
      sub: 'v1.0.0 — Tarzi Tailor',
      href: null,
    },
  ]

  return (
    <div className="min-h-dvh bg-white pb-24" dir={isRTL ? 'rtl' : undefined}>
      {/* Header */}
      <PageHeader title="Settings" subtitle="Preferences & account management" showBack />

      <div className="px-5 py-4 flex flex-col gap-5">

        {/* Language */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Globe size={16} color="#e91e8c" />
            <p style={{ fontSize: 13, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {t('profile', 'language_pref')}
            </p>
          </div>
          <div className="flex gap-2">
            {LANGUAGES.map(langOption => (
              <button
                key={langOption.code}
                onClick={() => setLanguage(langOption.code as Language, user?.id)}
                className="flex-1 py-3 rounded-2xl transition-all"
                style={{
                  border: `2px solid ${lang === langOption.code ? '#e91e8c' : '#e8e8e8'}`,
                  background: lang === langOption.code ? '#fce4ec' : '#f9f9f9',
                }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: lang === langOption.code ? '#e91e8c' : '#1a1a1a' }}>
                  {langOption.native}
                </p>
                <p style={{ fontSize: 11, color: lang === langOption.code ? '#e91e8c' : '#9e9e9e' }}>
                  {langOption.label}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Approval status */}
        {profile && (
          <div className="p-4 rounded-2xl" style={{
            background: profile.is_approved ? '#e8f5e9' : '#fff8e1',
            border: `1px solid ${profile.is_approved ? '#a5d6a7' : '#ffe082'}`,
          }}>
            <p style={{
              fontSize: 14, fontWeight: 700,
              color: profile.is_approved ? '#2e7d32' : '#f57c00',
              marginBottom: 4,
            }}>
              {profile.is_approved ? '✅ Account Approved' : '⏳ Pending Admin Approval'}
            </p>
            <p style={{ fontSize: 12, color: '#555' }}>
              {profile.is_approved
                ? 'Your profile is live and visible to customers.'
                : 'Your profile is under review. You will be notified once approved.'}
            </p>
          </div>
        )}

        {/* Menu items */}
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
            Account
          </p>
          <div className="rounded-2xl overflow-hidden" style={{ background: 'white', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
            {MENU_ITEMS.map((item, i) => {
              const Icon = item.icon
              const content = (
                <>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#fce4ec' }}>
                    <Icon size={16} color="#e91e8c" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a' }}>{item.label}</p>
                    {item.sub && (
                      <p style={{ fontSize: 11, color: '#9e9e9e' }} className="truncate">{item.sub}</p>
                    )}
                  </div>
                  {item.href && <ChevronRight size={16} color="#bbb" />}
                </>
              )
              const rowStyle: React.CSSProperties = {
                borderBottom: i < MENU_ITEMS.length - 1 ? '1px solid #f5f5f5' : 'none',
              }
              const rowClass = 'flex items-center gap-3 px-4 py-3.5 w-full text-left'

              if (item.href) {
                return (
                  <button key={item.label} onClick={() => router.push(item.href!)}
                    className={rowClass} style={rowStyle}>
                    {content}
                  </button>
                )
              }
              return (
                <div key={item.label} className={rowClass} style={rowStyle}>
                  {content}
                </div>
              )
            })}
          </div>
        </div>

        {/* Log out */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3.5 rounded-2xl w-full"
          style={{ background: '#fff0f0', border: '1px solid #ffcdd2' }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#ffebee' }}>
            <LogOut size={16} color="#f44336" />
          </div>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#f44336' }}>{t('profile', 'logout')}</span>
        </button>

        <p style={{ textAlign: 'center', fontSize: 11, color: '#bbb' }}>Tarzi Tailor v1.0.0</p>
      </div>

      <BottomNav />
    </div>
  )
}
