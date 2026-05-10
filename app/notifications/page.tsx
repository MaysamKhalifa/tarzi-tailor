'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, ChevronRight } from 'lucide-react'
import BottomNav from '@/components/layout/BottomNav'
import PageHeader from '@/components/layout/PageHeader'
import { createClient } from '@/lib/supabase/client'
import { useApp } from '@/lib/context/AppContext'
import { useLanguage } from '@/lib/context/LanguageContext'
import type { Order } from '@/types/database'

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(diff / 86400000)
  if (m < 1) return 'Just now'
  if (m < 60) return `${m}m ago`
  if (h < 24) return `${h}h ago`
  return `${d}d ago`
}

const STATUS_NOTIF = {
  pending:     { emoji: '📦', text: 'New order request',        color: '#f57c00', bg: '#fff3e0' },
  confirmed:   { emoji: '✅', text: 'You accepted order',       color: '#1565c0', bg: '#e3f2fd' },
  in_progress: { emoji: '🧵', text: 'Currently working on',    color: '#7b1fa2', bg: '#f3e5f5' },
  ready:       { emoji: '🎁', text: 'Order marked as ready',   color: '#2e7d32', bg: '#e8f5e9' },
  delivered:   { emoji: '🎉', text: 'Delivered successfully',  color: '#2e7d32', bg: '#e8f5e9' },
  cancelled:   { emoji: '❌', text: 'Order cancelled',          color: '#d32f2f', bg: '#fff0f0' },
}

export default function NotificationsPage() {
  const { user, loading: authLoading } = useApp()
  const router = useRouter()
  const { t, isRTL } = useLanguage()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!user) { router.replace('/login'); return }
    const supabase = createClient()
    supabase
      .from('orders')
      .select('*')
      .eq('tailor_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setOrders(data || [])
        setLoading(false)
      })
  }, [user, authLoading, router])

  return (
    <div className="min-h-dvh bg-white pb-24" dir={isRTL ? 'rtl' : undefined}>
      <PageHeader title={t('notifications', 'title')} showBack />

      <div className="px-5 py-4">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 rounded-full border-2 border-pink-200 border-t-pink-500 animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20">
            <Bell size={48} color="#e8e8e8" className="mx-auto mb-4" />
            <p style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a', marginBottom: 8 }}>{t('notifications', 'no_notif')}</p>
            <p style={{ color: '#9e9e9e', fontSize: 13 }}>{t('notifications', 'no_notif_sub')}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {orders.map(order => {
              const cfg = STATUS_NOTIF[order.status as keyof typeof STATUS_NOTIF] || STATUS_NOTIF.pending
              const isPending = order.status === 'pending'
              return (
                <button
                  key={order.id}
                  onClick={() => router.push(`/orders/${order.id}`)}
                  className="w-full flex items-center gap-3 p-4 rounded-2xl text-left transition-all"
                  style={{
                    background: isPending ? cfg.bg : 'white',
                    border: `1px solid ${isPending ? cfg.color + '30' : '#f0f0f0'}`,
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                  }}
                >
                  {/* Emoji badge */}
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-xl"
                    style={{ background: cfg.bg }}
                  >
                    {cfg.emoji}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p style={{ fontSize: 13, fontWeight: 700, color: cfg.color, textAlign: isRTL ? 'right' : 'left' }}>{cfg.text}</p>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', marginTop: 1, textAlign: isRTL ? 'right' : 'left' }}>
                      {order.garment_type}
                    </p>
                    <p style={{ fontSize: 11, color: '#9e9e9e', marginTop: 1, textAlign: isRTL ? 'right' : 'left' }}>{order.order_number}</p>
                  </div>

                  <div className="flex flex-col items-end gap-1" style={{ alignItems: isRTL ? 'flex-start' : 'flex-end' }}>
                    <span style={{ fontSize: 11, color: '#bbb' }}>{timeAgo(order.created_at)}</span>
                    {isPending && (
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ background: '#e91e8c' }}
                      />
                    )}
                    <ChevronRight size={14} color="#ccc" style={{ transform: isRTL ? 'scaleX(-1)' : undefined }} />
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
