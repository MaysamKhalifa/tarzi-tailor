'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useApp } from '@/lib/context/AppContext'

export default function RootPage() {
  const { user, loading } = useApp()
  const router = useRouter()

  useEffect(() => {
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
