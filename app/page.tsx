'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useApp } from '@/lib/context/AppContext'

export default function RootPage() {
  const { user, loading } = useApp()
  const router = useRouter()

  useEffect(() => {
    // ── Intercept Supabase auth redirects BEFORE doing anything else ──
    // When Supabase falls back to Site URL (e.g. /auth/callback not allowlisted),
    // the ?code= or #access_token= lands here. Forward it to the callback handler.
    if (typeof window !== 'undefined') {
      const search = window.location.search
      const hash   = window.location.hash
      const code   = new URLSearchParams(search).get('code')
      const hasHashToken = hash.includes('access_token=')

      if (code || hasHashToken) {
        router.replace(`/auth/callback${search}${hash}`)
        return
      }
    }

    if (loading) return
    if (user) router.replace('/home')
    else router.replace('/login')
  }, [user, loading, router])

  return (
    <div className="min-h-dvh flex items-center justify-center">
      <div className="w-10 h-10 rounded-full border-2 border-pink-200 border-t-pink-500 animate-spin" />
    </div>
  )
}
