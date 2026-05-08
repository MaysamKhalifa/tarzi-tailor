'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useApp } from '@/lib/context/AppContext'
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

function getHourGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

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

function getStatusLabel(status: Order['status']): string {
  switch (status) {
    case 'confirmed':
      return 'Confirmed'
    case 'in_progress':
      return 'In Progress'
    default:
      return status.charAt(0).toUpperCase() + status.slice(1)
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
  const [orders, setOrders] = useState<Order[]>([])
  const [ordersLoading, setOrdersLoading] = useState(true)

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

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('tailor_id', user.id)
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
      style={{
        minHeight: '100vh',
        background: '#f7f7f7',
        maxWidth: 430,
        margin: '0 auto',
        paddingBottom: 80,
      }}
    >
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
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
          }}
        >
          Tailor Dashboard
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
            <p style={{ fontSize: 11, color: '#9e9e9e', fontWeight: 600, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              New Orders
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
            <p style={{ fontSize: 11, color: '#bdbdbd', margin: '4px 0 0' }}>Awaiting action</p>
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
            <p style={{ fontSize: 11, color: '#9e9e9e', fontWeight: 600, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Active
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
            <p style={{ fontSize: 11, color: '#bdbdbd', margin: '4px 0 0' }}>In progress</p>
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
            <p style={{ fontSize: 11, color: '#9e9e9e', fontWeight: 600, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Earnings
            </p>
            {ordersLoading ? (
              <div style={{ height: 28, display: 'flex', alignItems: 'center' }}>
                <Loader2 size={16} color="#059669" style={{ animation: 'spin 1s linear infinite' }} />
              </div>
            ) : (
              <p style={{ fontSize: 22, fontWeight: 800, color: '#059669', margin: 0, lineHeight: 1 }}>
                AED {monthEarnings.toFixed(0)}
              </p>
            )}
            <p style={{ fontSize: 11, color: '#bdbdbd', margin: '4px 0 0' }}>This month</p>
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
            <p style={{ fontSize: 11, color: '#9e9e9e', fontWeight: 600, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Rating
            </p>
            <p style={{ fontSize: 28, fontWeight: 800, color: '#f59e0b', margin: 0, lineHeight: 1 }}>
              4.8 ⭐
            </p>
            <p style={{ fontSize: 11, color: '#bdbdbd', margin: '4px 0 0' }}>Overall score</p>
          </div>
        </div>
      </div>

      {/* ── Body sections ── */}
      <div style={{ padding: '20px 0', display: 'flex', flexDirection: 'column', gap: 0 }}>

        {/* Section 1: New Requests */}
        <section style={{ padding: '0 0 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', marginBottom: 12 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>
              New Requests
            </h2>
            <Link
              href="/orders"
              style={{ fontSize: 13, color: '#e91e8c', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 2 }}
            >
              See All <ChevronRight size={14} />
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
              <p style={{ fontSize: 13, color: '#bdbdbd', margin: 0 }}>No new requests right now</p>
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
                      }}
                    >
                      {order.garment_type}
                    </p>
                    <p style={{ fontSize: 12, color: '#9e9e9e', margin: '2px 0 0' }}>
                      #{order.order_number} · {order.customer_name ?? 'Customer'}
                    </p>
                    {order.pickup_date && (
                      <p style={{ fontSize: 11, color: '#bdbdbd', margin: '2px 0 0' }}>
                        Pickup: {formatDate(order.pickup_date)}
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
                      }}
                    >
                      <Eye size={12} />
                      View
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', marginBottom: 12 }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>
              Active Orders
            </h2>
            <Link
              href="/orders"
              style={{ fontSize: 13, color: '#e91e8c', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 2 }}
            >
              See All <ChevronRight size={14} />
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
              <p style={{ fontSize: 13, color: '#bdbdbd', margin: 0 }}>No active orders at the moment</p>
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
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
                      <p style={{ fontSize: 12, color: '#9e9e9e', margin: 0 }}>
                        #{order.order_number} · {order.customer_name ?? 'Customer'}
                      </p>
                      {order.pickup_date && (
                        <p style={{ fontSize: 11, color: '#bdbdbd', margin: '2px 0 0' }}>
                          Pickup: {formatDate(order.pickup_date)}
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
                        }}
                      >
                        <MessageCircle size={12} />
                        Chat
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
          <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1a1a1a', margin: '0 0 14px' }}>
            Quick Actions
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {[
              { href: '/schedule', icon: Calendar, label: 'Schedule', color: '#e91e8c', bg: '#fdf2f8' },
              { href: '/services', icon: Tag, label: 'Services', color: '#7c3aed', bg: '#f5f3ff' },
              { href: '/reviews', icon: Star, label: 'Reviews', color: '#f59e0b', bg: '#fffbeb' },
              { href: '/notifications', icon: Bell, label: 'Alerts', color: '#0891b2', bg: '#ecfeff' },
            ].map(({ href, icon: Icon, label, color, bg }) => (
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
                    {label}
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
