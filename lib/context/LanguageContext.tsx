'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { translations, RTL_LANGUAGES } from '@/lib/i18n'
import type { Language } from '@/lib/i18n'

interface LanguageContextType {
  lang: Language
  setLanguage: (lang: Language, userId?: string) => Promise<void>
  t: <S extends keyof typeof translations.en>(
    section: S,
    key: keyof typeof translations.en[S]
  ) => string
  isRTL: boolean
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Language>('en')

  useEffect(() => {
    const saved = localStorage.getItem('tarzi_tailor_lang') as Language | null
    if (saved && ['en', 'ar', 'ur'].includes(saved)) {
      setLang(saved)
      applyDir(saved)
    }
  }, [])

  const applyDir = (l: Language) => {
    document.documentElement.setAttribute('lang', l)
    document.documentElement.setAttribute('dir', RTL_LANGUAGES.includes(l) ? 'rtl' : 'ltr')
  }

  const setLanguage = useCallback(async (newLang: Language, userId?: string) => {
    setLang(newLang)
    localStorage.setItem('tarzi_tailor_lang', newLang)
    applyDir(newLang)

    if (userId) {
      try {
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        await supabase.from('profiles').update({ preferred_language: newLang }).eq('id', userId)
      } catch {
        // Non-critical — localStorage already saved
      }
    }
  }, [])

  const t = useCallback(<S extends keyof typeof translations.en>(
    section: S,
    key: keyof typeof translations.en[S]
  ): string => {
    const dict = translations[lang] as typeof translations.en
    const sectionDict = dict[section]
    if (sectionDict && key in sectionDict) {
      return String(sectionDict[key as keyof typeof sectionDict])
    }
    // Fallback to English
    const enSection = translations.en[section]
    return String(enSection[key as keyof typeof enSection])
  }, [lang])

  const isRTL = RTL_LANGUAGES.includes(lang)

  return (
    <LanguageContext.Provider value={{ lang, setLanguage, t, isRTL }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider')
  return ctx
}
