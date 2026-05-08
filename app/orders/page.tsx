'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Scissors, Sparkles, RefreshCw, Calendar, Clock, DollarSign, FileText, ChevronRight, CheckCircle, Package } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useApp } from '@/lib/context/AppContext'
import BottomNav from '@/components/layout/BottomNav'
import type { Order } from '@/types/database'

type Tab = 'new' | 'all'

const STATUS_STYLE: Record<string, { color: string; bg: string; label: string }> = {
  pending:     { color: '#f57c00', bg: '#fff3e0', label: 'Pending' },
  confirmed:   { color: '#1565c0', bg: '#e3f2fd', label: 'Confirmed' },
  in_progress: { color: '#7b1fa2', bg: '#f3e5f5', label: 'In Progress' },
  ready:       { color: '#2e7d32', bg: '#e8f5e9', label: 'Ready' },
  delivered:   { color: '#2e7d32', bg: '#e8f5e9', label: 'Delivered' },
  cancelled:   { color: '#d32f2f', bg: '#fff0f0', label: 'Cancelled' },
}

function ServiceIcon({ type }: { type: Order['service_type'] }) {
  if (type === 'alterations') return <Scissors size={18} color="#e91e8c" />
  if (type === 'from_scratch') return <Sparkles size={18} color="#e91e8c" />
  return <RefreshCw size={18} color="#e91e8c" />
}

interface QuickAcceptFormProps {
  orderId: string
  onSuccess: () => void
  onCancel: () => void
}

function QuickAcceptForm({ orderId, onSuccess, onCancel }: QuickAcceptFormProps) {
  const { user } = useApp()
  const [price, setPrice] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleAccept = async () => {
    if (!price || isNaN(Number(price)) || Number(price) <= 0) {
      setError('Please enter a valid price.')
      return
    }
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error: err } = await supabase
      .from('orders')
      .update({
        status: 'confirmed',
        tailor_price: Number(price),
        tailor_note: note || null,
        tailor_id: user?.id,
      })
      .eq('id', orderId)
    setLoading(false)
    if (err) {
      setError('Failed to accept order. Try again.')
    } else {
      onSuccess()
    }
  }

  return (
    <div
      style={{
        marginTop: 10,
        background: '#fdf2f8',
        borderRadius: 12,
        padding: '14px 14px 10px',
        border: '1px solid #f8bbd9',
      }}
    >
      <p style={{ fontSize: 12, fontWeight: 700, color: '#e91e8c', marginBottom: 8 }}>
        Quick Accept
      </p>
      <div style={{ marginBottom: 8 }}>
        <label style={{ fontSize: 11, color: '#757575', fontWeight: 600 }}>Price (AED) *</label>
        <div style={{ display: 'flex', alignItems: 'center', marginTop: 4, background: 'white', borderRadius: 8, border: '1px solid #f0f0f0', padding: '8px 10px', gap: 6 }}>
          <span style={{ fontSize: 13, color: '#9e9e9e', fontWeight: 600 }}>AED</span>
          <input
            type="number"
            value={price}
            onChange={e => setPrice(e.target.value)}
            placeholder="0"
            min="0"
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, fontWeight: 700, color: '#1a1a1a', background: 'transparent' }}
          />
        </div>
      </div>
      <div style={{ marginBottom: 10 }}>
        <label style={{ fontSize: 11, color: '#757575', fontWeight: 600 }}>Note to Customer (optional)</label>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Any notes..."
          rows={2}
          style={{ marginTop: 4, width: '100%', background: 'white', border: '1px solid #f0f0f0', borderRadius: 8, padding: '8px 10px', fontSize: 13, color: '#1a1a1a', resize: 'none', outline: 'none', boxSizing: 'border-box' }}
        />
      </div>
      {error && <p style={{ fontSize: 12, color: '#d32f2f', marginBottom: 8 }}>{error}</p>}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={onCancel}
          style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: '1px solid #e0e0e0', background: 'white', fontSize: 13, fontWeight: 600, color: '#757575', cursor: 'pointer' }}
        >
          Cancel
        </button>
        <button
          onClick={handleAccept}
          disabled={loading}
          style={{ flex: 2, padding: '9px 0', borderRadius: 8, border: 'none', background: loading ? '#f8bbd9' : '#e91e8c', fontSize: 13, fontWeight: 700, color: 'white', cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? 'Accepting…' : 'Confirm Acceptance'}
        </button>
      </div>
    </div>
  )
}

interface OrderCardProps {
  order: Order
  onRefresh: () => void
}

function OrderCard({ order, onRefresh }: OrderCardProps) {
  const router = useRouter()
  const [showAccept, setShowAccept] = useState(false)
  const s = STATUS_STYLE[order.status] ?? STATUS_STYLE.pending

  return (
    <div
      style={{
        background: 'white',
        borderRadius: 16,
        padding: '16px',
        marginBottom: 12,
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        border: '1px solid #f5f5f5',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            background: '#fdf2f8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <ServiceIcon type={order.service_type} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: '#1a1a1a', textTransform: 'capitalize' }}>
              {order.garment_type}
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: s.color,
                background: s.bg,
                borderRadius: 20,
                padding: '3px 9px',
                whiteSpace: 'nowrap',
              }}
            >
              {s.label}
            </span>
          </div>
          <p style={{ fontSize: 11, color: '#9e9e9e', marginTop: 1 }}>#{order.order_number}</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 8 }}>
        {order.pickup_date && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Calendar size={12} color="#9e9e9e" />
            <span style={{ fontSize: 12, color: '#616161' }}>{order.pickup_date}</span>
          </div>
        )}
        {order.pickup_time && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Clock size={12} color="#9e9e9e" />
            <span style={{ fontSize: 12, color: '#616161' }}>{order.pickup_time}</span>
          </div>
        )}
        {order.tailor_price != null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <DollarSign size={12} color="#9e9e9e" />
            <span style={{ fontSize: 12, color: '#616161', fontWeight: 700 }}>AED {order.tailor_price}</span>
          </div>
        )}
      </div>

      {order.notes && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 10 }}>
          <FileText size={12} color="#bdbdbd" style={{ marginTop: 2 }} />
          <p style={{ fontSize: 12, color: '#757575', fontStyle: 'italic', lineHeight: 1.4 }}>
            {order.notes.length > 60 ? order.notes.slice(0, 60) + '…' : order.notes}
          </p>
        </div>
      )}

      {showAccept ? (
        <QuickAcceptForm
          orderId={order.id}
          onSuccess={() => { setShowAccept(false); onRefresh() }}
          onCancel={() => setShowAccept(false)}
        />
      ) : (
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button
            onClick={() => router.push(`/orders/${order.id}`)}
            style={{
              flex: 1,
              padding: '9px 0',
              borderRadius: 10,
              border: '1.5px solid #e91e8c',
              background: 'white',
              fontSize: 13,
              fontWeight: 700,
              color: '#e91e8c',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
            }}
          >
            View Details
            <ChevronRight size={14} color="#e91e8c" />
          </button>
          {order.status === 'pending' && (
            <button
              onClick={() => setShowAccept(true)}
              style={{
                flex: 1,
                padding: '9px 0',
                borderRadius: 10,
                border: 'none',
                background: '#e91e8c',
                fontSize: 13,
                fontWeight: 700,
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
              }}
            >
              <CheckCircle size={14} color="white" />
              Quick Accept
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function OrdersPage() {
  const { user } = useApp()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('new')

  const fetchOrders = async () => {
    if (!user) return
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('tailor_id', user.id)
      .order('created_at', { ascending: false })
    setOrders(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchOrders()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const displayed = tab === 'new'
    ? orders.filter(o => o.status === 'pending')
    : orders

  const newCount = orders.filter(o => o.status === 'pending').length

  return (
    <div style={{ minHeight: '100vh', background: '#f9f9f9', maxWidth: 430, margin: '0 auto' }}>
      {/* Pink gradient header */}
      <div
        style={{
          background: 'linear-gradient(135deg, #e91e8c 0%, #ff6bb3 100%)',
          padding: '52px 20px 24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: 'white' }}>New Orders</h1>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>
              Manage incoming requests
            </p>
          </div>
          {newCount > 0 && (
            <div
              style={{
                marginLeft: 'auto',
                background: 'white',
                borderRadius: 20,
                padding: '4px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span style={{ fontSize: 20, fontWeight: 900, color: '#e91e8c' }}>{newCount}</span>
              <span style={{ fontSize: 11, color: '#e91e8c', fontWeight: 600 }}>new</span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          background: 'white',
          padding: '0 20px',
          borderBottom: '1px solid #f0f0f0',
          display: 'flex',
          gap: 0,
        }}
      >
        {(['new', 'all'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '14px 20px',
              fontSize: 14,
              fontWeight: 700,
              color: tab === t ? '#e91e8c' : '#9e9e9e',
              background: 'transparent',
              border: 'none',
              borderBottom: tab === t ? '2px solid #e91e8c' : '2px solid transparent',
              cursor: 'pointer',
              marginBottom: -1,
            }}
          >
            {t === 'new' ? 'New Requests' : 'All Orders'}
            {t === 'new' && newCount > 0 && (
              <span
                style={{
                  marginLeft: 6,
                  background: '#e91e8c',
                  color: 'white',
                  borderRadius: 10,
                  padding: '1px 7px',
                  fontSize: 11,
                  fontWeight: 800,
                }}
              >
                {newCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Order list */}
      <div style={{ padding: '16px 16px 100px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div
              style={{
                width: 36,
                height: 36,
                border: '3px solid #f8bbd9',
                borderTopColor: '#e91e8c',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
                margin: '0 auto',
              }}
            />
            <p style={{ fontSize: 13, color: '#9e9e9e', marginTop: 12 }}>Loading orders…</p>
          </div>
        ) : displayed.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                background: '#fdf2f8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <Package size={28} color="#e91e8c" />
            </div>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a' }}>No new orders yet</p>
            <p style={{ fontSize: 13, color: '#9e9e9e', marginTop: 4 }}>
              {tab === 'new' ? 'New customer requests will appear here.' : 'Your orders will appear here.'}
            </p>
          </div>
        ) : (
          displayed.map(order => (
            <OrderCard key={order.id} order={order} onRefresh={fetchOrders} />
          ))
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <BottomNav />
    </div>
  )
}
