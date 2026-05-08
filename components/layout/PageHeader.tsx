'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  showBack?: boolean
  right?: React.ReactNode
}

export default function PageHeader({ title, subtitle, showBack = true, right }: PageHeaderProps) {
  const router = useRouter()
  return (
    <div className="flex items-center gap-3 px-5 pt-12 pb-4"
      style={{ background: 'white', borderBottom: '1px solid #f5f5f5' }}>
      {showBack && (
        <button onClick={() => router.back()}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: '#f5f5f5' }}>
          <ArrowLeft size={18} color="#1a1a1a" />
        </button>
      )}
      <div className="flex-1">
        <h1 style={{ fontSize: 18, fontWeight: 800, color: '#1a1a1a' }}>{title}</h1>
        {subtitle && <p style={{ fontSize: 12, color: '#9e9e9e', marginTop: 1 }}>{subtitle}</p>}
      </div>
      {right}
    </div>
  )
}
