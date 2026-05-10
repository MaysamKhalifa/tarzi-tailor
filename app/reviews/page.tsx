'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Star, Award, TrendingUp } from 'lucide-react'
import BottomNav from '@/components/layout/BottomNav'
import { createClient } from '@/lib/supabase/client'
import { useApp } from '@/lib/context/AppContext'
import { useLanguage } from '@/lib/context/LanguageContext'
import type { Order } from '@/types/database'

export default function ReviewsPage() {
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
      .then(({ data }) => {
        setOrders(data || [])
        setLoading(false)
      })
  }, [user, authLoading, router])

  const delivered = orders.filter(o => o.status === 'delivered')
  const totalEarned = delivered.reduce((sum, o) => sum + (o.tailor_price || o.price || 0), 0)
  const avgPrice = delivered.length > 0 ? Math.round(totalEarned / delivered.length) : 0

  return (
    <div className="min-h-dvh bg-white pb-24" dir={isRTL ? 'rtl' : undefined}>
      {/* Header */}
      <div className="px-5 pt-12 pb-6"
        style={{ background: 'linear-gradient(135deg, #e91e8c 0%, #f06292 100%)' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'white', marginBottom: 16, textAlign: isRTL ? 'right' : 'left' }}>
          {t('reviews', 'title')}
        </h1>

        {/* Rating showcase */}
        <div className="p-4 rounded-2xl mb-4"
          style={{ background: 'rgba(255,255,255,0.15)' }}>
          <div className="flex items-center gap-4" style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}>
            <div className="text-center">
              <p style={{ fontSize: 36, fontWeight: 900, color: 'white', lineHeight: 1 }}>4.8</p>
              <div className="flex gap-0.5 mt-1 justify-center" style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                {[1,2,3,4,5].map(i => (
                  <Star key={i} size={12} fill={i <= 4 ? 'white' : 'transparent'} color="white" />
                ))}
              </div>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>{t('reviews', 'avg_rating')}</p>
            </div>
            <div className="w-px h-12" style={{ background: 'rgba(255,255,255,0.3)' }} />
            <div className="flex-1 grid grid-cols-3 gap-2">
              {[
                { label: t('orders', 'completed'), value: delivered.length },
                { label: t('common', 'aed'), value: totalEarned },
                { label: t('reviews', 'avg_rating'), value: `${avgPrice}` },
              ].map(({ label, value }) => (
                <div key={label} className="text-center">
                  <p style={{ fontSize: 18, fontWeight: 800, color: 'white' }}>{value}</p>
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 1 }}>{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 py-4">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 rounded-full border-2 border-pink-200 border-t-pink-500 animate-spin" />
          </div>
        ) : delivered.length === 0 ? (
          <div className="text-center py-16">
            <Award size={52} color="#e8e8e8" className="mx-auto mb-4" />
            <p style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a', marginBottom: 8 }}>
              {t('reviews', 'no_reviews')}
            </p>
            <p style={{ color: '#9e9e9e', fontSize: 13 }}>
              {t('reviews', 'no_reviews_sub')}
            </p>
          </div>
        ) : (
          <>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a', marginBottom: 12, textAlign: isRTL ? 'right' : 'left' }}>
              {t('reviews', 'total_reviews')} ({delivered.length})
            </h2>
            <div className="flex flex-col gap-3">
              {delivered.map(order => {
                const svcLabel = order.service_type === 'from_scratch' ? t('orders', 'from_scratch') :
                  order.service_type === 'upcycling' ? t('orders', 'upcycling') : t('orders', 'alterations')
                const earned = order.tailor_price || order.price
                return (
                  <div key={order.id} className="p-4 rounded-2xl"
                    style={{ background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
                    <div className="flex items-start justify-between mb-2" style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                      <div className="flex items-center gap-3" style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                          style={{ background: '#e8f5e9' }}>
                          <TrendingUp size={18} color="#2e7d32" />
                        </div>
                        <div style={{ textAlign: isRTL ? 'right' : 'left' }}>
                          <p style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a' }}>{order.garment_type}</p>
                          <p style={{ fontSize: 11, color: '#9e9e9e' }}>{order.order_number}</p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-xl flex items-center gap-1"
                        style={{ background: '#e8f5e9', color: '#2e7d32', fontSize: 11, fontWeight: 700 }}>
                        ✓ {t('orders', 'delivered')}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2"
                      style={{ borderTop: '1px solid #f5f5f5', flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                      <span style={{ fontSize: 12, color: '#757575' }}>{svcLabel}</span>
                      <div className="flex items-center gap-3" style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                        <span style={{ fontSize: 11, color: '#9e9e9e' }}>
                          {order.created_at ? new Date(order.created_at).toLocaleDateString('en-AE', { day: 'numeric', month: 'short' }) : '—'}
                        </span>
                        {earned && (
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#e91e8c' }}>
                            {t('common', 'aed')} {earned}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
