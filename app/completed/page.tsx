'use client'

import { useEffect, useState } from 'react'
import {
  Scissors, Sparkles, RefreshCw, Calendar,
  TrendingUp, Package, XCircle, CheckCircle,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useApp } from '@/lib/context/AppContext'
import BottomNav from '@/components/layout/BottomNav'
import type { Order } from '@/types/database'

type Tab = 'delivered' | 'cancelled'

function ServiceIcon({ type }: { type: Order['service_type'] }) {
  if (type === 'alterations') return <Scissors size={15} color="#e91e8c" />
  if (type === 'from_scratch') return <Sparkles size={15} color="#e91e8c" />
  return <RefreshCw size={15} color="#e91e8c" />
}

function CompletedCard({ order }: { order: Order }) {
  const isDelivered = order.status === 'delivered'
  const date = order.updated_at
    ? new Date(order.updated_at).toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' })
    : new Date(order.created_at).toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <div style={{
      background: 'white',
      borderRadius: 16,
      padding: '16px',
      marginBottom: 10,
      boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
      border: `1px solid ${isDelivered ? '#e8f5e9' : '#fff0f0'}`,
      display: 'flex',
      gap: 12,
      alignItems: 'flex-start',
    }}>
      <div style={{
        width: 40,
        height: 40,
        borderRadius: 20,
        background: isDelivered ? '#e8f5e9' : '#fff0f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        {isDelivered
          ? <CheckCircle size={18} color="#2e7d32" />
          : <XCircle size={18} color="#d32f2f" />
        }
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: '#1a1a1a', textTransform: 'capitalize' }}>
            {order.garment_type}
          </span>
          {isDelivered && order.tailor_price != null && (
            <span style={{ fontSize: 14, fontWeight: 900, color: '#2e7d32', flexShrink: 0, marginLeft: 8 }}>
              AED {order.tailor_price}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <ServiceIcon type={order.service_type} />
            <span style={{ fontSize: 11, color: '#9e9e9e', textTransform: 'capitalize' }}>
              {order.service_type.replace('_', ' ')}
            </span>
          </div>
          <span style={{ fontSize: 10, color: '#bdbdbd' }}>•</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Calendar size={11} color="#9e9e9e" />
            <span style={{ fontSize: 11, color: '#9e9e9e' }}>{date}</span>
          </div>
        </div>

        <p style={{ fontSize: 10, color: '#bdbdbd', marginTop: 4 }}>#{order.order_number}</p>

        {!isDelivered && order.decline_reason && (
          <p style={{ fontSize: 11, color: '#d32f2f', marginTop: 4, fontStyle: 'italic' }}>
            Reason: {order.decline_reason}
          </p>
        )}
      </div>
    </div>
  )
}

export default function CompletedPage() {
  const { user } = useApp()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('delivered')

  useEffect(() => {
    if (!user) return
    const fetchCompleted = async () => {
      setLoading(true)
      const supabase = createClient()
      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('tailor_id', user.id)
        .in('status', ['delivered', 'cancelled'])
        .order('updated_at', { ascending: false })
      setOrders(data ?? [])
      setLoading(false)
    }
    fetchCompleted()
  }, [user])

  const delivered = orders.filter(o => o.status === 'delivered')
  const cancelled = orders.filter(o => o.status === 'cancelled')
  const totalEarned = delivered.reduce((sum, o) => sum + (o.tailor_price ?? 0), 0)

  const displayed = tab === 'delivered' ? delivered : cancelled

  return (
    <div style={{ minHeight: '100vh', background: '#f9f9f9', maxWidth: 430, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ background: 'white', padding: '52px 20px 16px', borderBottom: '1px solid #f0f0f0' }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: '#1a1a1a' }}>Completed Orders</h1>
        <p style={{ fontSize: 13, color: '#9e9e9e', marginTop: 2 }}>Your history</p>
      </div>

      {/* Stats bar */}
      <div style={{
        background: 'linear-gradient(135deg, #e91e8c 0%, #ff6bb3 100%)',
        padding: '16px 20px',
        display: 'flex',
        gap: 0,
      }}>
        <div style={{ flex: 1, textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.3)' }}>
          <p style={{ fontSize: 22, fontWeight: 900, color: 'white' }}>{delivered.length}</p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: 600, marginTop: 1 }}>Delivered</p>
        </div>
        <div style={{ flex: 1, textAlign: 'center', borderRight: '1px solid rgba(255,255,255,0.3)' }}>
          <p style={{ fontSize: 22, fontWeight: 900, color: 'white' }}>{cancelled.length}</p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: 600, marginTop: 1 }}>Cancelled</p>
        </div>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
            <TrendingUp size={14} color="white" />
            <p style={{ fontSize: 18, fontWeight: 900, color: 'white' }}>{totalEarned.toLocaleString()}</p>
          </div>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: 600, marginTop: 1 }}>AED Earned</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        background: 'white',
        borderBottom: '1px solid #f0f0f0',
        display: 'flex',
      }}>
        {(['delivered', 'cancelled'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1,
              padding: '14px 0',
              fontSize: 14,
              fontWeight: 700,
              color: tab === t ? (t === 'delivered' ? '#2e7d32' : '#d32f2f') : '#9e9e9e',
              background: 'transparent',
              border: 'none',
              borderBottom: tab === t
                ? `2px solid ${t === 'delivered' ? '#2e7d32' : '#d32f2f'}`
                : '2px solid transparent',
              cursor: 'pointer',
              marginBottom: -1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            {t === 'delivered'
              ? <CheckCircle size={15} color={tab === t ? '#2e7d32' : '#bdbdbd'} />
              : <XCircle size={15} color={tab === t ? '#d32f2f' : '#bdbdbd'} />
            }
            {t === 'delivered' ? 'Delivered' : 'Cancelled'}
            <span style={{
              fontSize: 11,
              fontWeight: 800,
              background: tab === t ? (t === 'delivered' ? '#e8f5e9' : '#fff0f0') : '#f5f5f5',
              color: tab === t ? (t === 'delivered' ? '#2e7d32' : '#d32f2f') : '#9e9e9e',
              borderRadius: 10,
              padding: '1px 7px',
            }}>
              {t === 'delivered' ? delivered.length : cancelled.length}
            </span>
          </button>
        ))}
      </div>

      {/* Order list */}
      <div style={{ padding: '16px 16px 100px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{
              width: 36, height: 36,
              border: '3px solid #f8bbd9',
              borderTopColor: '#e91e8c',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto',
            }} />
            <p style={{ fontSize: 13, color: '#9e9e9e', marginTop: 12 }}>Loading history…</p>
          </div>
        ) : displayed.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{
              width: 64, height: 64, borderRadius: 32,
              background: '#f5f5f5',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <Package size={28} color="#bdbdbd" />
            </div>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a' }}>
              No {tab === 'delivered' ? 'delivered' : 'cancelled'} orders
            </p>
            <p style={{ fontSize: 13, color: '#9e9e9e', marginTop: 4 }}>
              {tab === 'delivered'
                ? 'Orders you deliver will appear here.'
                : 'Cancelled orders will appear here.'
              }
            </p>
          </div>
        ) : (
          <>
            {tab === 'delivered' && totalEarned > 0 && (
              <div style={{
                background: 'linear-gradient(135deg, #e8f5e9, #f1f8e9)',
                borderRadius: 12,
                padding: '12px 16px',
                marginBottom: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                border: '1px solid #a5d6a7',
              }}>
                <TrendingUp size={18} color="#2e7d32" />
                <div>
                  <p style={{ fontSize: 12, color: '#388e3c', fontWeight: 600 }}>Total Earned from {delivered.length} order{delivered.length !== 1 ? 's' : ''}</p>
                  <p style={{ fontSize: 20, fontWeight: 900, color: '#2e7d32' }}>AED {totalEarned.toLocaleString()}</p>
                </div>
              </div>
            )}
            {displayed.map(order => (
              <CompletedCard key={order.id} order={order} />
            ))}
          </>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <BottomNav />
    </div>
  )
}
