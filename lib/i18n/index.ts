import { en } from './en'
import { ar } from './ar'
import { ur } from './ur'

export type Language = 'en' | 'ar' | 'ur'

export const translations = { en, ar, ur }

export const RTL_LANGUAGES: Language[] = ['ar', 'ur']

export function isRTL(lang: Language): boolean {
  return RTL_LANGUAGES.includes(lang)
}

export { en, ar, ur }
