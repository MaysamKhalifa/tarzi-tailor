'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Scissors, Sparkles, RefreshCw, Calendar, Clock, MapPin,
  FileText, User, Phone, Ruler, ImageIcon, MessageCircle,
  CheckCircle, XCircle, Package,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useLanguage } from '@/lib/context/LanguageContext'
import PageHeader from '@/components/layout/PageHeader'
import type { Order, Measurement, Profile } from '@/types/database'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getStatusStyle(status: string, t: (s: 'orders', k: any) => string): { color: string; bg: string; label: string } {
  const map: Record<string, { color: string; bg: string; labelKey: string }> = {
    pending:     { color: '#f57c00', bg: '#fff3e0', labelKey: 'pending' },
    confirmed:   { color: '#1565c0', bg: '#e3f2fd', labelKey: 'confirmed' },
    in_progress: { color: '#7b1fa2', bg: '#f3e5f5', labelKey: 'in_progress' },
    ready:       { color: '#2e7d32', bg: '#e8f5e9', labelKey: 'ready' },
    delivered:   { color: '#2e7d32', bg: '#e8f5e9', labelKey: 'delivered' },
    cancelled:   { color: '#d32f2f', bg: '#fff0f0', labelKey: 'cancelled' },
  }
  const entry = map[status] ?? map.pending
  return { color: entry.color, bg: entry.bg, label: t('orders', entry.labelKey) }
}

function SectionCard({ title, icon, children, isRTL }: { title: string; icon: React.ReactNode; children: React.ReactNode; isRTL?: boolean }) {
  return (
    <div style={{ background: 'white', borderRadius: 16, padding: '16px', marginBottom: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: '#fdf2f8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {icon}
        </div>
        <span style={{ fontSize: 14, fontWeight: 800, color: '#1a1a1a' }}>{title}</span>
      </div>
      {children}
    </div>
  )
}

function InfoRow({ label, value, isRTL }: { label: string; value: string | null | undefined; isRTL?: boolean }) {
  if (!value) return null
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: 10, marginBottom: 10, borderBottom: '1px solid #f5f5f5', flexDirection: isRTL ? 'row-reverse' : 'row' }}>
      <span style={{ fontSize: 12, color: '#9e9e9e', fontWeight: 600, minWidth: 120, textAlign: isRTL ? 'right' : 'left' }}>{label}</span>
      <span style={{ fontSize: 13, color: '#1a1a1a', fontWeight: 500, textAlign: isRTL ? 'left' : 'right', flex: 1, textTransform: 'capitalize' }}>{value}</span>
    </div>
  )
}

function MeasurementGrid({ m, isRTL }: { m: Measurement; isRTL?: boolean }) {
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
      <div style={{ marginBottom: 10, padding: '8px 12px', background: '#f5f5f5', borderRadius: 8, display: 'flex', gap: 12, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#616161' }}>{m.name}</span>
        <span style={{ fontSize: 12, color: '#9e9e9e', textTransform: 'capitalize' }}>{m.gender}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px' }}>
        {active.map(([label, val, unit]) => (
          <div key={label} style={{ background: '#fafafa', borderRadius: 8, padding: '8px 10px' }}>
            <p style={{ fontSize: 10, color: '#9e9e9e', fontWeight: 600, marginBottom: 2, textAlign: isRTL ? 'right' : 'left' }}>{label}</p>
            <p style={{ fontSize: 15, fontWeight: 800, color: '#1a1a1a', textAlign: isRTL ? 'right' : 'left' }}>{val} <span style={{ fontSize: 11, fontWeight: 500, color: '#9e9e9e' }}>{unit}</span></p>
          </div>
        ))}
      </div>
      {m.notes && (
        <p style={{ fontSize: 12, color: '#757575', marginTop: 10, fontStyle: 'italic', textAlign: isRTL ? 'right' : 'left' }}>Note: {m.notes}</p>
      )}
    </div>
  )
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { t, isRTL } = useLanguage()
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
      <div dir={isRTL ? 'rtl' : undefined} style={{ minHeight: '100vh', background: '#f9f9f9', maxWidth: 430, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
        <PageHeader title={t('orders', 'order_details')} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 36, height: 36, border: '3px solid #f8bbd9', borderTopColor: '#e91e8c', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
            <p style={{ fontSize: 13, color: '#9e9e9e', marginTop: 12 }}>{t('common', 'loading')}</p>
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div dir={isRTL ? 'rtl' : undefined} style={{ minHeight: '100vh', background: '#f9f9f9', maxWidth: 430, margin: '0 auto' }}>
        <PageHeader title={t('orders', 'order_details')} />
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <Package size={48} color="#e0e0e0" />
          <p style={{ fontSize: 15, color: '#9e9e9e', marginTop: 12 }}>{t('orders', 'no_orders')}</p>
        </div>
      </div>
    )
  }

  const s = getStatusStyle(order.status, t)

  const ServiceIconEl = order.service_type === 'alterations'
    ? <Scissors size={14} color="#e91e8c" />
    : order.service_type === 'from_scratch'
    ? <Sparkles size={14} color="#e91e8c" />
    : <RefreshCw size={14} color="#e91e8c" />

  return (
    <div dir={isRTL ? 'rtl' : undefined} style={{ minHeight: '100vh', background: '#f9f9f9', maxWidth: 430, margin: '0 auto', paddingBottom: 110 }}>
      <PageHeader title={t('orders', 'order_details')} subtitle={`#${order.order_number}`} />

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
        <SectionCard title={t('orders', 'order_details')} icon={ServiceIconEl} isRTL={isRTL}>
          <InfoRow label={t('orders', 'service')} value={order.service_type.replace('_', ' ')} isRTL={isRTL} />
          <InfoRow label={t('orders', 'garment')} value={order.garment_type} isRTL={isRTL} />
          <InfoRow label={t('orders', 'order_num')} value={`#${order.order_number}`} isRTL={isRTL} />
          <InfoRow
            label={t('common', 'view')}
            value={new Date(order.created_at).toLocaleDateString('en-AE', { day: 'numeric', month: 'short', year: 'numeric' })}
            isRTL={isRTL}
          />
          {order.tailor_price != null && (
            <InfoRow label={t('orders', 'your_price')} value={`${t('common', 'aed')} ${order.tailor_price}`} isRTL={isRTL} />
          )}
          {order.tailor_note && (
            <InfoRow label={t('orders', 'your_note')} value={order.tailor_note} isRTL={isRTL} />
          )}
        </SectionCard>

        {/* Customer Details */}
        <SectionCard title={t('orders', 'customer')} icon={<User size={14} color="#e91e8c" />} isRTL={isRTL}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
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
            <div style={{ textAlign: isRTL ? 'right' : 'left' }}>
              <p style={{ fontSize: 15, fontWeight: 800, color: '#1a1a1a' }}>
                {customer?.full_name ?? 'Unknown Customer'}
              </p>
              {customer?.phone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                  <Phone size={11} color="#9e9e9e" />
                  <span style={{ fontSize: 12, color: '#757575' }}>{customer.phone}</span>
                </div>
              )}
            </div>
          </div>
        </SectionCard>

        {/* Measurements */}
        {order.measurement_id && (
          <SectionCard title={t('orders', 'measurements')} icon={<Ruler size={14} color="#e91e8c" />} isRTL={isRTL}>
            {measurement
              ? <MeasurementGrid m={measurement} isRTL={isRTL} />
              : <p style={{ fontSize: 13, color: '#9e9e9e' }}>{t('common', 'loading')}</p>
            }
          </SectionCard>
        )}

        {/* Garment Images */}
        {order.image_urls && order.image_urls.length > 0 && (
          <SectionCard title={t('orders', 'images')} icon={<ImageIcon size={14} color="#e91e8c" />} isRTL={isRTL}>
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
          <SectionCard title={t('orders', 'pickup_details')} icon={<Calendar size={14} color="#e91e8c" />} isRTL={isRTL}>
            {order.pickup_date && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                <Calendar size={14} color="#9e9e9e" />
                <span style={{ fontSize: 13, color: '#1a1a1a' }}>
                  {new Date(order.pickup_date + 'T00:00:00').toLocaleDateString('en-AE', { weekday: 'short', day: 'numeric', month: 'short' })}
                </span>
              </div>
            )}
            {order.pickup_time && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                <Clock size={14} color="#9e9e9e" />
                <span style={{ fontSize: 13, color: '#1a1a1a' }}>{order.pickup_time}</span>
              </div>
            )}
            {order.pickup_address && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
                <MapPin size={14} color="#9e9e9e" style={{ marginTop: 2 }} />
                <span style={{ fontSize: 13, color: '#1a1a1a', lineHeight: 1.4 }}>{order.pickup_address}</span>
              </div>
            )}
          </SectionCard>
        )}

        {/* Notes from Customer */}
        {order.comments && (
          <SectionCard title={t('orders', 'comments')} icon={<FileText size={14} color="#e91e8c" />} isRTL={isRTL}>
            <p style={{ fontSize: 13, color: '#424242', lineHeight: 1.6, fontStyle: 'italic', textAlign: isRTL ? 'right' : 'left' }}>
              &ldquo;{order.comments}&rdquo;
            </p>
          </SectionCard>
        )}

        {/* Decline reason */}
        {order.status === 'cancelled' && order.decline_reason && (
          <SectionCard title={t('orders', 'decline_reason')} icon={<XCircle size={14} color="#d32f2f" />} isRTL={isRTL}>
            <p style={{ fontSize: 13, color: '#d32f2f', textAlign: isRTL ? 'right' : 'left' }}>{order.decline_reason}</p>
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
          <div style={{ display: 'flex', gap: 10, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
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
                flexDirection: isRTL ? 'row-reverse' : 'row',
              }}
            >
              <XCircle size={16} />
              {t('orders', 'decline')}
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
                flexDirection: isRTL ? 'row-reverse' : 'row',
              }}
            >
              <CheckCircle size={16} />
              {t('orders', 'accept_order')}
            </button>
          </div>
        )}

        {(order.status === 'confirmed' || order.status === 'in_progress') && (
          <div style={{ display: 'flex', gap: 10, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
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
                flexDirection: isRTL ? 'row-reverse' : 'row',
              }}
            >
              <MessageCircle size={16} />
              {t('orders', 'chat')}
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
                flexDirection: isRTL ? 'row-reverse' : 'row',
              }}
            >
              <CheckCircle size={16} />
              {updating ? t('common', 'loading') : t('orders', 'mark_ready')}
            </button>
          </div>
        )}

        {order.status === 'ready' && (
          <div style={{ display: 'flex', gap: 10, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
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
                flexDirection: isRTL ? 'row-reverse' : 'row',
              }}
            >
              <MessageCircle size={16} />
              {t('orders', 'chat')}
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
                flexDirection: isRTL ? 'row-reverse' : 'row',
              }}
            >
              <CheckCircle size={16} />
              {updating ? t('common', 'loading') : t('orders', 'mark_delivered')}
            </button>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
