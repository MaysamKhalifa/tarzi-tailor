'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Scissors, Sparkles, RefreshCw, Calendar, MessageCircle,
  Play, CheckCircle, Package, Truck,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useApp } from '@/lib/context/AppContext'
import BottomNav from '@/components/layout/BottomNav'
import type { Order } from '@/types/database'

type ActiveStatus = 'confirmed' | 'in_progress' | 'ready'
type Tab = ActiveStatus

const TAB_CONFIG: { key: Tab; label: string; color: string }[] = [
  { key: 'confirmed',   label: 'Confirmed',   color: '#1565c0' },
  { key: 'in_progress', label: 'In Progress', color: '#7b1fa2' },
  { key: 'ready',       label: 'Ready',       color: '#2e7d32' },
]

const STATUS_STEPS: Order['status'][] = ['confirmed', 'in_progress', 'ready', 'delivered']

function ServiceIcon({ type }: { type: Order['service_type'] }) {
  if (type === 'alterations') return <Scissors size={16} color="#e91e8c" />
  if (type === 'from_scratch') return <Sparkles size={16} color="#e91e8c" />
  return <RefreshCw size={16} color="#e91e8c" />
}

function ProgressDots({ status }: { status: Order['status'] }) {
  const currentIdx = STATUS_STEPS.indexOf(status)
  const labels = ['Confirmed', 'In Progress', 'Ready', 'Delivered']
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginTop: 10 }}>
      {STATUS_STEPS.map((step, i) => {
        const done = i <= currentIdx
        const isCurrent = i === currentIdx
        return (
          <div key={step} style={{ display: 'flex', alignItems: 'center', flex: i < STATUS_STEPS.length - 1 ? 1 : 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{
                width: isCurrent ? 12 : 8,
                height: isCurrent ? 12 : 8,
                borderRadius: '50%',
                background: done ? '#e91e8c' : '#e0e0e0',
                border: isCurrent ? '2px solid #e91e8c' : 'none',
                boxShadow: isCurrent ? '0 0 0 3px rgba(233,30,140,0.15)' : 'none',
                flexShrink: 0,
                transition: 'all 0.2s',
              }} />
              <span style={{ fontSize: 8, color: done ? '#e91e8c' : '#bdbdbd', marginTop: 2, fontWeight: done ? 700 : 400, whiteSpace: 'nowrap' }}>
                {labels[i]}
              </span>
            </div>
            {i < STATUS_STEPS.length - 1 && (
              <div style={{
                flex: 1,
                height: 2,
                background: i < currentIdx ? '#e91e8c' : '#e0e0e0',
                marginBottom: 12,
                marginLeft: 2,
                marginRight: 2,
                transition: 'background 0.2s',
              }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

interface ActiveOrderCardProps {
  order: Order
  onUpdate: (id: string, newStatus: Order['status']) => void
}

function ActiveOrderCard({ order, onUpdate }: ActiveOrderCardProps) {
  const router = useRouter()
  const [updating, setUpdating] = useState(false)

  const handleStatusUpdate = async (newStatus: Order['status']) => {
    setUpdating(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', order.id)
    setUpdating(false)
    if (!error) onUpdate(order.id, newStatus)
  }

  const actionConfig: { label: string; next: Order['status']; color: string; icon: React.ReactNode } | null =
    order.status === 'confirmed'
      ? { label: 'Start Work', next: 'in_progress', color: '#7b1fa2', icon: <Play size={14} color="white" fill="white" /> }
      : order.status === 'in_progress'
      ? { label: 'Mark Ready', next: 'ready', color: '#2e7d32', icon: <CheckCircle size={14} color="white" /> }
      : order.status === 'ready'
      ? { label: 'Mark Delivered', next: 'delivered', color: '#1565c0', icon: <Truck size={14} color="white" /> }
      : null

  return (
    <div style={{
      background: 'white',
      borderRadius: 16,
      padding: '16px',
      marginBottom: 12,
      boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      border: '1px solid #f5f5f5',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
        <div style={{
          width: 38,
          height: 38,
          borderRadius: 19,
          background: '#fdf2f8',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <ServiceIcon type={order.service_type} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: '#1a1a1a', textTransform: 'capitalize' }}>
              {order.garment_type}
            </span>
            <span style={{ fontSize: 10, color: '#9e9e9e' }}>#{order.order_number}</span>
          </div>
          {order.customer_name && (
            <p style={{ fontSize: 12, color: '#616161', marginTop: 2 }}>{order.customer_name}</p>
          )}
          {order.pickup_date && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
              <Calendar size={11} color="#9e9e9e" />
              <span style={{ fontSize: 11, color: '#9e9e9e' }}>{order.pickup_date}</span>
            </div>
          )}
        </div>
      </div>

      <ProgressDots status={order.status} />

      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <button
          onClick={() => router.push(`/chat/${order.id}`)}
          style={{
            padding: '9px 14px',
            borderRadius: 10,
            border: '1.5px solid #e91e8c',
            background: 'white',
            fontSize: 12,
            fontWeight: 700,
            color: '#e91e8c',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            flexShrink: 0,
          }}
        >
          <MessageCircle size={13} color="#e91e8c" />
          Chat
        </button>
        {actionConfig && (
          <button
            onClick={() => handleStatusUpdate(actionConfig.next)}
            disabled={updating}
            style={{
              flex: 1,
              padding: '9px 0',
              borderRadius: 10,
              border: 'none',
              background: updating ? '#e0e0e0' : actionConfig.color,
              fontSize: 13,
              fontWeight: 700,
              color: 'white',
              cursor: updating ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            {actionConfig.icon}
            {updating ? 'Updating…' : actionConfig.label}
          </button>
        )}
        <button
          onClick={() => router.push(`/orders/${order.id}`)}
          style={{
            padding: '9px 14px',
            borderRadius: 10,
            border: '1.5px solid #e0e0e0',
            background: 'white',
            fontSize: 12,
            fontWeight: 600,
            color: '#616161',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          Details
        </button>
      </div>
    </div>
  )
}

export default function ActivePage() {
  const { user } = useApp()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('confirmed')

  useEffect(() => {
    if (!user) return
    const supabase = createClient()

    const fetchActive = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('orders')
        .select(`*, profiles:user_id ( full_name )`)
        .eq('tailor_id', user.id)
        .in('status', ['confirmed', 'in_progress', 'ready'])
        .order('created_at', { ascending: false })

      const mapped = (data ?? []).map((o: Order & { profiles?: { full_name: string | null } }) => ({
        ...o,
        customer_name: o.profiles?.full_name ?? null,
      }))
      setOrders(mapped)
      setLoading(false)
    }

    fetchActive()

    // Realtime: keep active orders in sync
    const channel = supabase
      .channel(`active-orders:${user.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `tailor_id=eq.${user.id}`,
      }, () => { fetchActive() })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user])

  const handleUpdate = (id: string, newStatus: Order['status']) => {
    if (newStatus === 'delivered') {
      setOrders(prev => prev.filter(o => o.id !== id))
    } else {
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o))
    }
  }

  const displayed = orders.filter(o => o.status === tab)
  const counts = {
    confirmed: orders.filter(o => o.status === 'confirmed').length,
    in_progress: orders.filter(o => o.status === 'in_progress').length,
    ready: orders.filter(o => o.status === 'ready').length,
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f9f9f9', maxWidth: 430, margin: '0 auto' }}>
      {/* Pink gradient header */}
      <div style={{
        background: 'linear-gradient(135deg, #e91e8c 0%, #ff6bb3 100%)',
        padding: '52px 20px 24px',
      }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: 'white' }}>Active Orders</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>
          Track your in-progress work
        </p>
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          {TAB_CONFIG.map(({ key, label, color }) => (
            <div key={key} style={{
              background: 'rgba(255,255,255,0.2)',
              borderRadius: 10,
              padding: '6px 12px',
              textAlign: 'center',
            }}>
              <p style={{ fontSize: 18, fontWeight: 900, color: 'white' }}>{counts[key]}</p>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Sub-tabs */}
      <div style={{
        background: 'white',
        borderBottom: '1px solid #f0f0f0',
        display: 'flex',
        padding: '0 4px',
      }}>
        {TAB_CONFIG.map(({ key, label, color }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              flex: 1,
              padding: '13px 4px',
              fontSize: 12,
              fontWeight: 700,
              color: tab === key ? color : '#9e9e9e',
              background: 'transparent',
              border: 'none',
              borderBottom: tab === key ? `2px solid ${color}` : '2px solid transparent',
              cursor: 'pointer',
              marginBottom: -1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
            }}
          >
            {label}
            {counts[key] > 0 && (
              <span style={{
                fontSize: 10,
                fontWeight: 800,
                background: tab === key ? color : '#e0e0e0',
                color: tab === key ? 'white' : '#9e9e9e',
                borderRadius: 8,
                padding: '0px 6px',
              }}>
                {counts[key]}
              </span>
            )}
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
            <p style={{ fontSize: 13, color: '#9e9e9e', marginTop: 12 }}>Loading active orders…</p>
          </div>
        ) : displayed.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{
              width: 64, height: 64, borderRadius: 32,
              background: '#fdf2f8',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <Package size={28} color="#e91e8c" />
            </div>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a' }}>
              No {TAB_CONFIG.find(t => t.key === tab)?.label.toLowerCase()} orders
            </p>
            <p style={{ fontSize: 13, color: '#9e9e9e', marginTop: 4 }}>
              Orders in this stage will appear here.
            </p>
          </div>
        ) : (
          displayed.map(order => (
            <ActiveOrderCard key={order.id} order={order} onUpdate={handleUpdate} />
          ))
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <BottomNav />
    </div>
  )
}
