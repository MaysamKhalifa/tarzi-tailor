'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useApp } from '@/lib/context/AppContext'
import { useLanguage } from '@/lib/context/LanguageContext'
import BottomNav from '@/components/layout/BottomNav'
import {
  Bell,
  Scissors,
  Sparkles,
  RefreshCw,
  Calendar,
  Tag,
  Star,
  Loader2,
  ChevronRight,
  MessageCircle,
  Eye,
} from 'lucide-react'
import type { Order } from '@/types/database'

function getServiceIcon(serviceType: Order['service_type']) {
  switch (serviceType) {
    case 'alterations':
      return <Scissors size={18} color="#e91e8c" />
    case 'from_scratch':
      return <Sparkles size={18} color="#7c3aed" />
    case 'upcycling':
      return <RefreshCw size={18} color="#0891b2" />
    default:
      return <Scissors size={18} color="#e91e8c" />
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'No date set'
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-AE', { day: 'numeric', month: 'short' })
}

function getStatusColor(status: Order['status']): { bg: string; text: string } {
  switch (status) {
    case 'confirmed':
      return { bg: '#ede9fe', text: '#7c3aed' }
    case 'in_progress':
      return { bg: '#dbeafe', text: '#1d4ed8' }
    default:
      return { bg: '#f3f4f6', text: '#6b7280' }
  }
}

function getMonthEarnings(orders: Order[]): number {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  return orders
    .filter((o) => {
      if (o.status !== 'delivered') return false
      const updated = o.updated_at ? new Date(o.updated_at) : new Date(o.created_at)
      return updated >= startOfMonth
    })
    .reduce((sum, o) => sum + (o.tailor_price ?? o.price ?? 0), 0)
}

export default function HomePage() {
  const router = useRouter()
  const { user, profile, loading: authLoading } = useApp()
  const { t, isRTL } = useLanguage()
  const [orders, setOrders] = useState<Order[]>([])
  const [ordersLoading, setOrdersLoading] = useState(true)

  function getHourGreeting(): string {
    const hour = new Date().getHours()
    if (hour < 12) return t('home', 'greeting_morning')
    if (hour < 17) return t('home', 'greeting_afternoon')
    return t('home', 'greeting_evening')
  }

  function getStatusLabel(status: Order['status']): string {
    switch (status) {
      case 'confirmed':
        return t('orders', 'confirmed')
      case 'in_progress':
        return t('orders', 'in_progress')
      case 'ready':
        return t('orders', 'ready')
      case 'delivered':
        return t('orders', 'delivered')
      case 'cancelled':
        return t('orders', 'cancelled')
      default:
        return status.charAt(0).toUpperCase() + status.slice(1)
    }
  }

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [authLoading, user, router])

  // Fetch orders
  useEffect(() => {
    if (!user) return

    const fetchOrders = async () => {
      setOrdersLoading(true)
      const supabase = createClient()

      // Show: (1) all unclaimed pending orders, OR (2) orders this tailor has accepted
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .or(`tailor_id.eq.${user.id},and(tailor_id.is.null,status.eq.pending)`)
        .order('created_at', { ascending: false })

      if (!error && data) {
        setOrders(data as Order[])
      }
      setOrdersLoading(false)
    }

    fetchOrders()
  }, [user])

  // Derived stats
  const pendingOrders = orders.filter((o) => o.status === 'pending')
  const activeOrders = orders.filter(
    (o) => o.status === 'confirmed' || o.status === 'in_progress'
  )
  const monthEarnings = getMonthEarnings(orders)

  const firstName = profile?.full_name?.split(' ')[0] ?? 'Tailor'

  if (authLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f7f7f7',
        }}
      >
        <Loader2 size={32} color="#e91e8c" style={{ animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <div
      dir={isRTL ? 'rtl' : undefined}
      style={{
        minHeight: '100vh',
        background: '#f7f7f7',
        maxWidth: 430,
        margin: '0 auto',
        paddingBottom: 80,
      }}
    >
      {/* ── Pending approval banner ── */}
      {profile && !profile.is_approved && (
        <div style={{
          background: '#fff8e1',
          borderBottom: '1px solid #ffe082',
          padding: '10px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <span style={{ fontSize: 18 }}>⏳</span>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#f57c00', margin: 0 }}>
              Account Pending Approval
            </p>
            <p style={{ fontSize: 11, color: '#795548', margin: 0 }}>
              You won&apos;t appear in customer searches until an admin approves your profile.
            </p>
          </div>
        </div>
      )}

      {/* ── Pink gradient header ── */}
      <div
        style={{
          background: 'linear-gradient(135deg, #e91e8c 0%, #f06292 100%)',
          paddingTop: 48,
          paddingBottom: 24,
          paddingLeft: 20,
          paddingRight: 20,
        }}
      >
        {/* Top row: greeting + bell */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', margin: 0 }}>
            {getHourGreeting()}, <strong style={{ color: 'white' }}>{firstName}!</strong> 👋
          </p>
          <Link href="/notifications">
            <div
              style={{
                width: 36,
                height: 36,
                background: 'rgba(255,255,255,0.2)',
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Bell size={18} color="white" />
            </div>
          </Link>
        </div>

        <h1
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: 'white',
            margin: '0 0 20px',
            letterSpacing: -0.5,
            textAlign: isRTL ? 'right' : 'left',
          }}
        >
          {t('home', 'dashboard')}
        </h1>

        {/* 2×2 stat cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 12,
          }}
        >
          {/* New Orders */}
          <div
            style={{
              background: 'white',
              borderRadius: 16,
              padding: '14px 16px',
              boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
            }}
          >
            <p style={{ fontSize: 11, color: '#9e9e9e', fontWeight: 600, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: isRTL ? 'right' : 'left' }}>
              {t('home', 'new_orders')}
            </p>
            {ordersLoading ? (
              <div style={{ height: 28, display: 'flex', alignItems: 'center' }}>
                <Loader2 size={16} color="#e91e8c" style={{ animation: 'spin 1s linear infinite' }} />
              </div>
            ) : (
              <p style={{ fontSize: 28, fontWeight: 800, color: '#e91e8c', margin: 0, lineHeight: 1 }}>
                {pendingOrders.length}
              </p>
            )}
            <p style={{ fontSize: 11, color: '#bdbdbd', margin: '4px 0 0', textAlign: isRTL ? 'right' : 'left' }}>{t('home', 'awaiting')}</p>
          </div>

          {/* Active */}
          <div
            style={{
              background: 'white',
              borderRadius: 16,
              padding: '14px 16px',
              boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
            }}
          >
            <p style={{ fontSize: 11, color: '#9e9e9e', fontWeight: 600, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: isRTL ? 'right' : 'left' }}>
              {t('home', 'active')}
            </p>
            {ordersLoading ? (
              <div style={{ height: 28, display: 'flex', alignItems: 'center' }}>
                <Loader2 size={16} color="#7c3aed" style={{ animation: 'spin 1s linear infinite' }} />
              </div>
            ) : (
              <p style={{ fontSize: 28, fontWeight: 800, color: '#7c3aed', margin: 0, lineHeight: 1 }}>
                {activeOrders.length}
              </p>
            )}
            <p style={{ fontSize: 11, color: '#bdbdbd', margin: '4px 0 0', textAlign: isRTL ? 'right' : 'left' }}>{t('home', 'in_progress')}</p>
          </div>

          {/* Earnings */}
          <div
            style={{
              background: 'white',
              borderRadius: 16,
              padding: '14px 16px',
              boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
            }}
          >
            <p style={{ fontSize: 11, color: '#9e9e9e', fontWeight: 600, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: isRTL ? 'right' : 'left' }}>
              {t('home', 'earnings')}
            </p>
            {ordersLoading ? (
              <div style={{ height: 28, display: 'flex', alignItems: 'center' }}>
                <Loader2 size={16} color="#059669" style={{ animation: 'spin 1s linear infinite' }} />
              </div>
            ) : (
              <p style={{ fontSize: 22, fontWeight: 800, color: '#059669', margin: 0, lineHeight: 1 }}>
                {t('common', 'aed')} {monthEarnings.toFixed(0)}
              </p>
            )}
            <p style={{ fontSize: 11, color: '#bdbdbd', margin: '4px 0 0', textAlign: isRTL ? 'right' : 'left' }}>{t('home', 'this_month')}</p>
          </div>

          {/* Rating */}
          <div
            style={{
              background: 'white',
              borderRadius: 16,
              padding: '14px 16px',
              boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
            }}
          >
            <p style={{ fontSize: 11, color: '#9e9e9e', fontWeight: 600, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: isRTL ? 'right' : 'left' }}>
              {t('home', 'rating')}
            </p>
            <p style={{ fontSize: 28, fontWeight: 800, color: '#f59e0b', margin: 0, lineHeight: 1 }}>
              4.8 ⭐
            </p>
            <p style={{ fontSize: 11, color: '#bdbdbd', margin: '4px 0 0', textAlign: isRTL ? 'right' : 'left' }}>{t('home', 'overall')}</p>
          </div>
        </div>
      </div>

      {/* ── Body sections ── */}
      <div style={{ padding: '20px 0', display: 'flex', flexDirection: 'column', gap: 0 }}>

        {/* Section 1: New Requests */}
        <section style={{ padding: '0 0 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', marginBottom: 12, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1a1a1a', margin: 0, textAlign: isRTL ? 'right' : 'left' }}>
              {t('home', 'new_requests')}
            </h2>
            <Link
              href="/orders"
              style={{ fontSize: 13, color: '#e91e8c', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 2, flexDirection: isRTL ? 'row-reverse' : 'row' }}
            >
              {t('home', 'see_all')} <ChevronRight size={14} />
            </Link>
          </div>

          {ordersLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
              <Loader2 size={24} color="#e91e8c" style={{ animation: 'spin 1s linear infinite' }} />
            </div>
          ) : pendingOrders.length === 0 ? (
            <div
              style={{
                margin: '0 20px',
                background: 'white',
                borderRadius: 16,
                padding: '24px 20px',
                textAlign: 'center',
                border: '1.5px dashed #f0f0f0',
              }}
            >
              <p style={{ fontSize: 13, color: '#bdbdbd', margin: 0 }}>{t('home', 'no_requests')}</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '0 20px' }}>
              {pendingOrders.slice(0, 3).map((order) => (
                <div
                  key={order.id}
                  style={{
                    background: 'white',
                    borderRadius: 16,
                    padding: '14px 16px',
                    boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                  }}
                >
                  {/* Service icon */}
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      background: '#fdf2f8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {getServiceIcon(order.service_type)}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: '#1a1a1a',
                        margin: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        textAlign: isRTL ? 'right' : 'left',
                      }}
                    >
                      {order.garment_type}
                    </p>
                    <p style={{ fontSize: 12, color: '#9e9e9e', margin: '2px 0 0', textAlign: isRTL ? 'right' : 'left' }}>
                      #{order.order_number} · {order.customer_name ?? 'Customer'}
                    </p>
                    {order.pickup_date && (
                      <p style={{ fontSize: 11, color: '#bdbdbd', margin: '2px 0 0', textAlign: isRTL ? 'right' : 'left' }}>
                        {t('home', 'pickup_prefix')} {formatDate(order.pickup_date)}
                      </p>
                    )}
                  </div>

                  {/* View button */}
                  <Link href={`/orders/${order.id}`}>
                    <div
                      style={{
                        background: 'linear-gradient(135deg, #e91e8c 0%, #f06292 100%)',
                        color: 'white',
                        borderRadius: 10,
                        padding: '7px 14px',
                        fontSize: 12,
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        flexDirection: isRTL ? 'row-reverse' : 'row',
                      }}
                    >
                      <Eye size={12} />
                      {t('home', 'view')}
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Divider */}
        <div style={{ height: 8, background: '#f7f7f7' }} />

        {/* Section 2: Active Orders */}
        <section style={{ padding: '20px 0 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', marginBottom: 12, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1a1a1a', margin: 0, textAlign: isRTL ? 'right' : 'left' }}>
              {t('home', 'active_orders')}
            </h2>
            <Link
              href="/orders"
              style={{ fontSize: 13, color: '#e91e8c', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 2, flexDirection: isRTL ? 'row-reverse' : 'row' }}
            >
              {t('home', 'see_all')} <ChevronRight size={14} />
            </Link>
          </div>

          {ordersLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
              <Loader2 size={24} color="#7c3aed" style={{ animation: 'spin 1s linear infinite' }} />
            </div>
          ) : activeOrders.length === 0 ? (
            <div
              style={{
                margin: '0 20px',
                background: 'white',
                borderRadius: 16,
                padding: '24px 20px',
                textAlign: 'center',
                border: '1.5px dashed #f0f0f0',
              }}
            >
              <p style={{ fontSize: 13, color: '#bdbdbd', margin: 0 }}>{t('home', 'no_active')}</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '0 20px' }}>
              {activeOrders.slice(0, 3).map((order) => {
                const statusColor = getStatusColor(order.status)
                return (
                  <div
                    key={order.id}
                    style={{
                      background: 'white',
                      borderRadius: 16,
                      padding: '14px 16px',
                      boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                    }}
                  >
                    {/* Service icon */}
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        background: '#f5f3ff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {getServiceIcon(order.service_type)}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                        <p
                          style={{
                            fontSize: 14,
                            fontWeight: 700,
                            color: '#1a1a1a',
                            margin: 0,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {order.garment_type}
                        </p>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            background: statusColor.bg,
                            color: statusColor.text,
                            padding: '2px 7px',
                            borderRadius: 20,
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                          }}
                        >
                          {getStatusLabel(order.status)}
                        </span>
                      </div>
                      <p style={{ fontSize: 12, color: '#9e9e9e', margin: 0, textAlign: isRTL ? 'right' : 'left' }}>
                        #{order.order_number} · {order.customer_name ?? 'Customer'}
                      </p>
                      {order.pickup_date && (
                        <p style={{ fontSize: 11, color: '#bdbdbd', margin: '2px 0 0', textAlign: isRTL ? 'right' : 'left' }}>
                          {t('home', 'pickup_prefix')} {formatDate(order.pickup_date)}
                        </p>
                      )}
                    </div>

                    {/* Chat button */}
                    <Link href={`/chat/${order.id}`}>
                      <div
                        style={{
                          background: '#ede9fe',
                          color: '#7c3aed',
                          borderRadius: 10,
                          padding: '7px 14px',
                          fontSize: 12,
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                          flexDirection: isRTL ? 'row-reverse' : 'row',
                        }}
                      >
                        <MessageCircle size={12} />
                        {t('home', 'chat')}
                      </div>
                    </Link>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Divider */}
        <div style={{ height: 8, background: '#f7f7f7' }} />

        {/* Section 3: Quick Actions */}
        <section style={{ padding: '20px 20px 8px' }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1a1a1a', margin: '0 0 14px', textAlign: isRTL ? 'right' : 'left' }}>
            {t('home', 'quick_actions')}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {[
              { href: '/schedule', icon: Calendar, labelKey: 'schedule' as const, color: '#e91e8c', bg: '#fdf2f8' },
              { href: '/services', icon: Tag, labelKey: 'services' as const, color: '#7c3aed', bg: '#f5f3ff' },
              { href: '/reviews', icon: Star, labelKey: 'reviews' as const, color: '#f59e0b', bg: '#fffbeb' },
              { href: '/notifications', icon: Bell, labelKey: 'alerts' as const, color: '#0891b2', bg: '#ecfeff' },
            ].map(({ href, icon: Icon, labelKey, color, bg }) => (
              <Link key={href} href={href} style={{ textDecoration: 'none' }}>
                <div
                  style={{
                    background: 'white',
                    borderRadius: 16,
                    padding: '14px 8px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 8,
                    boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      background: bg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon size={18} color={color} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#3a3a3a', textAlign: 'center' }}>
                    {t('home', labelKey)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <BottomNav />

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
