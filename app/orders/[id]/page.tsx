'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Scissors, Sparkles, RefreshCw, Calendar, Clock, MapPin,
  FileText, User, Phone, Ruler, ImageIcon, MessageCircle,
  CheckCircle, XCircle, Package,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import PageHeader from '@/components/layout/PageHeader'
import type { Order, Measurement, Profile } from '@/types/database'

const STATUS_STYLE: Record<string, { color: string; bg: string; label: string }> = {
  pending:     { color: '#f57c00', bg: '#fff3e0', label: 'Pending' },
  confirmed:   { color: '#1565c0', bg: '#e3f2fd', label: 'Confirmed' },
  in_progress: { color: '#7b1fa2', bg: '#f3e5f5', label: 'In Progress' },
  ready:       { color: '#2e7d32', bg: '#e8f5e9', label: 'Ready' },
  delivered:   { color: '#2e7d32', bg: '#e8f5e9', label: 'Delivered' },
  cancelled:   { color: '#d32f2f', bg: '#fff0f0', label: 'Cancelled' },
}

function SectionCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ background: 'white', borderRadius: 16, padding: '16px', marginBottom: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: '#fdf2f8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {icon}
        </div>
        <span style={{ fontSize: 14, fontWeight: 800, color: '#1a1a1a' }}>{title}</span>
      </div>
      {children}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 10, marginBottom: 10, borderBottom: '1px solid #f5f5f5' }}>
      <span style={{ fontSize: 12, color: '#9e9e9e', fontWeight: 600, minWidth: 120 }}>{label}</span>
      <span style={{ fontSize: 13, color: '#1a1a1a', fontWeight: 500, textAlign: 'right', flex: 1, textTransform: 'capitalize' }}>{value}</span>
    </div>
  )
}

function MeasurementGrid({ m }: { m: Measurement }) {
  const fields: [string, number | null, string][] = [
    ['Chest', m.chest, 'cm'],
    ['Waist', m.waist, 'cm'],
    ['Hips', m.hips, 'cm'],
    ['Shoulder', m.shoulder_width, 'cm'],
    ['Arm Length', m.arm_length, 'cm'],
    ['Neck', m.neck, 'cm'],
    ['Inseam', m.inseam, 'cm'],
    ['Thigh', m.thigh, 'cm'],
    ['Height', m.height, 'cm'],
    ['Weight', m.weight, 'kg'],
  ]
  const active = fields.filter(([, val]) => val != null)
  if (active.length === 0) return <p style={{ fontSize: 13, color: '#9e9e9e' }}>No measurements recorded.</p>
  return (
    <div>
      <div style={{ marginBottom: 10, padding: '8px 12px', background: '#f5f5f5', borderRadius: 8, display: 'flex', gap: 12 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#616161' }}>{m.name}</span>
        <span style={{ fontSize: 12, color: '#9e9e9e', textTransform: 'capitalize' }}>{m.gender}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px' }}>
        {active.map(([label, val, unit]) => (
          <div key={label} style={{ background: '#fafafa', borderRadius: 8, padding: '8px 10px' }}>
            <p style={{ fontSize: 10, color: '#9e9e9e', fontWeight: 600, marginBottom: 2 }}>{label}</p>
            <p style={{ fontSize: 15, fontWeight: 800, color: '#1a1a1a' }}>{val} <span style={{ fontSize: 11, fontWeight: 500, color: '#9e9e9e' }}>{unit}</span></p>
          </div>
        ))}
      </div>
      {m.notes && (
        <p style={{ fontSize: 12, color: '#757575', marginTop: 10, fontStyle: 'italic' }}>Note: {m.notes}</p>
      )}
    </div>
  )
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [order, setOrder] = useState<Order | null>(null)
  const [customer, setCustomer] = useState<Profile | null>(null)
  const [measurement, setMeasurement] = useState<Measurement | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    const supabase = createClient()

    const { data: orderData } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single()

    if (!orderData) { setLoading(false); return }
    setOrder(orderData)

    const [profileRes, measRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', orderData.user_id).single(),
      orderData.measurement_id
        ? supabase.from('measurements').select('*').eq('id', orderData.measurement_id).single()
        : Promise.resolve({ data: null }),
    ])

    setCustomer(profileRes.data ?? null)
    setMeasurement(measRes.data ?? null)
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [id])

  const updateStatus = async (newStatus: Order['status']) => {
    if (!order) return
    setUpdating(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', order.id)
      .select()
      .single()
    if (data) setOrder(data)
    setUpdating(false)
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f9f9f9', maxWidth: 430, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
        <PageHeader title="Order Details" />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 36, height: 36, border: '3px solid #f8bbd9', borderTopColor: '#e91e8c', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
            <p style={{ fontSize: 13, color: '#9e9e9e', marginTop: 12 }}>Loading order…</p>
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div style={{ minHeight: '100vh', background: '#f9f9f9', maxWidth: 430, margin: '0 auto' }}>
        <PageHeader title="Order Details" />
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <Package size={48} color="#e0e0e0" />
          <p style={{ fontSize: 15, color: '#9e9e9e', marginTop: 12 }}>Order not found.</p>
        </div>
      </div>
    )
  }

  const s = STATUS_STYLE[order.status] ?? STATUS_STYLE.pending

  const ServiceIconEl = order.service_type === 'alterations'
    ? <Scissors size={14} color="#e91e8c" />
    : order.service_type === 'from_scratch'
    ? <Sparkles size={14} color="#e91e8c" />
    : <RefreshCw size={14} color="#e91e8c" />

  return (
    <div style={{ minHeight: '100vh', background: '#f9f9f9', maxWidth: 430, margin: '0 auto', paddingBottom: 110 }}>
      <PageHeader title="Order Details" subtitle={`#${order.order_number}`} />

      <div style={{ padding: '16px 16px 0' }}>
        {/* Status badge */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <span style={{
            fontSize: 14,
            fontWeight: 800,
            color: s.color,
            background: s.bg,
            borderRadius: 20,
            padding: '7px 22px',
          }}>
            {s.label}
          </span>
        </div>

        {/* Order Info */}
        <SectionCard title="Order Info" icon={ServiceIconEl}>
          <InfoRow label="Service Type" value={order.service_type.replace('_', ' ')} />
          <InfoRow label="Garment" value={order.garment_type} />
          <InfoRow label="Order Number" value={`#${order.order_number}`} />
          <InfoRow
            label="Created"
            value={new Date(order.created_at).toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' })}
          />
          {order.tailor_price != null && (
            <InfoRow label="Your Price" value={`AED ${order.tailor_price}`} />
          )}
          {order.tailor_note && (
            <InfoRow label="Your Note" value={order.tailor_note} />
          )}
        </SectionCard>

        {/* Customer Details */}
        <SectionCard title="Customer Details" icon={<User size={14} color="#e91e8c" />}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              background: 'linear-gradient(135deg, #e91e8c, #ff6bb3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <span style={{ fontSize: 18, fontWeight: 900, color: 'white' }}>
                {(customer?.full_name ?? 'C').charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 800, color: '#1a1a1a' }}>
                {customer?.full_name ?? 'Unknown Customer'}
              </p>
              {customer?.phone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <Phone size={11} color="#9e9e9e" />
                  <span style={{ fontSize: 12, color: '#757575' }}>{customer.phone}</span>
                </div>
              )}
            </div>
          </div>
        </SectionCard>

        {/* Measurements */}
        {order.measurement_id && (
          <SectionCard title="Measurements" icon={<Ruler size={14} color="#e91e8c" />}>
            {measurement
              ? <MeasurementGrid m={measurement} />
              : <p style={{ fontSize: 13, color: '#9e9e9e' }}>Loading measurements…</p>
            }
          </SectionCard>
        )}

        {/* Garment Images */}
        {order.image_urls && order.image_urls.length > 0 && (
          <SectionCard title="Garment Images" icon={<ImageIcon size={14} color="#e91e8c" />}>
            <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
              {order.image_urls.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt={`Garment image ${i + 1}`}
                  style={{
                    width: 90,
                    height: 90,
                    objectFit: 'cover',
                    borderRadius: 10,
                    flexShrink: 0,
                    border: '1px solid #f0f0f0',
                  }}
                />
              ))}
            </div>
          </SectionCard>
        )}

        {/* Pickup & Delivery */}
        {(order.pickup_date || order.pickup_time || order.pickup_address) && (
          <SectionCard title="Pickup & Delivery" icon={<Calendar size={14} color="#e91e8c" />}>
            {order.pickup_date && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Calendar size={14} color="#9e9e9e" />
                <span style={{ fontSize: 13, color: '#1a1a1a' }}>
                  {new Date(order.pickup_date + 'T00:00:00').toLocaleDateString('en-AE', { weekday: 'short', day: 'numeric', month: 'short' })}
                </span>
              </div>
            )}
            {order.pickup_time && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Clock size={14} color="#9e9e9e" />
                <span style={{ fontSize: 13, color: '#1a1a1a' }}>{order.pickup_time}</span>
              </div>
            )}
            {order.pickup_address && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <MapPin size={14} color="#9e9e9e" style={{ marginTop: 2 }} />
                <span style={{ fontSize: 13, color: '#1a1a1a', lineHeight: 1.4 }}>{order.pickup_address}</span>
              </div>
            )}
          </SectionCard>
        )}

        {/* Notes from Customer */}
        {order.comments && (
          <SectionCard title="Notes from Customer" icon={<FileText size={14} color="#e91e8c" />}>
            <p style={{ fontSize: 13, color: '#424242', lineHeight: 1.6, fontStyle: 'italic' }}>
              &ldquo;{order.comments}&rdquo;
            </p>
          </SectionCard>
        )}

        {/* Decline reason */}
        {order.status === 'cancelled' && order.decline_reason && (
          <SectionCard title="Decline Reason" icon={<XCircle size={14} color="#d32f2f" />}>
            <p style={{ fontSize: 13, color: '#d32f2f' }}>{order.decline_reason}</p>
          </SectionCard>
        )}
      </div>

      {/* Sticky action buttons */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: 430,
        background: 'white',
        borderTop: '1px solid #f0f0f0',
        padding: '12px 16px',
        paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
        zIndex: 40,
      }}>
        {order.status === 'pending' && (
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => router.push(`/orders/${order.id}/respond?action=decline`)}
              style={{
                flex: 1,
                padding: '13px 0',
                borderRadius: 12,
                border: '1.5px solid #d32f2f',
                background: 'white',
                fontSize: 14,
                fontWeight: 700,
                color: '#d32f2f',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <XCircle size={16} />
              Decline
            </button>
            <button
              onClick={() => router.push(`/orders/${order.id}/respond`)}
              style={{
                flex: 2,
                padding: '13px 0',
                borderRadius: 12,
                border: 'none',
                background: '#2e7d32',
                fontSize: 14,
                fontWeight: 700,
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <CheckCircle size={16} />
              Accept Order
            </button>
          </div>
        )}

        {(order.status === 'confirmed' || order.status === 'in_progress') && (
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => router.push(`/chat/${order.id}`)}
              style={{
                flex: 1,
                padding: '13px 0',
                borderRadius: 12,
                border: '1.5px solid #e91e8c',
                background: 'white',
                fontSize: 14,
                fontWeight: 700,
                color: '#e91e8c',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <MessageCircle size={16} />
              Chat
            </button>
            <button
              onClick={() => updateStatus('ready')}
              disabled={updating}
              style={{
                flex: 2,
                padding: '13px 0',
                borderRadius: 12,
                border: 'none',
                background: updating ? '#e0e0e0' : '#7b1fa2',
                fontSize: 14,
                fontWeight: 700,
                color: 'white',
                cursor: updating ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <CheckCircle size={16} />
              {updating ? 'Updating…' : 'Mark as Ready'}
            </button>
          </div>
        )}

        {order.status === 'ready' && (
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => router.push(`/chat/${order.id}`)}
              style={{
                flex: 1,
                padding: '13px 0',
                borderRadius: 12,
                border: '1.5px solid #e91e8c',
                background: 'white',
                fontSize: 14,
                fontWeight: 700,
                color: '#e91e8c',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <MessageCircle size={16} />
              Chat
            </button>
            <button
              onClick={() => updateStatus('delivered')}
              disabled={updating}
              style={{
                flex: 2,
                padding: '13px 0',
                borderRadius: 12,
                border: 'none',
                background: updating ? '#e0e0e0' : '#2e7d32',
                fontSize: 14,
                fontWeight: 700,
                color: 'white',
                cursor: updating ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <CheckCircle size={16} />
              {updating ? 'Updating…' : 'Mark Delivered'}
            </button>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
