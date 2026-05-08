'use client'

import { use, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle, XCircle, Calendar, Clock, Scissors, Sparkles, RefreshCw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useApp } from '@/lib/context/AppContext'
import PageHeader from '@/components/layout/PageHeader'
import type { Order } from '@/types/database'

const DECLINE_REASONS = [
  'Too busy',
  'Outside expertise',
  'Location too far',
  'Other',
]

function ServiceLabel({ type }: { type: Order['service_type'] }) {
  if (type === 'alterations') return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <Scissors size={13} color="#e91e8c" />
      Alterations
    </span>
  )
  if (type === 'from_scratch') return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <Sparkles size={13} color="#e91e8c" />
      From Scratch
    </span>
  )
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <RefreshCw size={13} color="#e91e8c" />
      Upcycling
    </span>
  )
}

export default function RespondPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useApp()

  const defaultAction = searchParams.get('action') === 'decline' ? 'decline' : 'accept'
  const [selected, setSelected] = useState<'accept' | 'decline'>(defaultAction)
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Accept form state
  const [price, setPrice] = useState('')
  const [tailorNote, setTailorNote] = useState('')

  // Decline form state
  const [reason, setReason] = useState(DECLINE_REASONS[0])
  const [declineNotes, setDeclineNotes] = useState('')

  useEffect(() => {
    const fetchOrder = async () => {
      const supabase = createClient()
      const { data } = await supabase.from('orders').select('*').eq('id', id).single()
      setOrder(data ?? null)
      setLoading(false)
    }
    fetchOrder()
  }, [id])

  const handleAccept = async () => {
    if (!price || isNaN(Number(price)) || Number(price) <= 0) {
      setError('Please enter a valid price.')
      return
    }
    setError('')
    setSubmitting(true)
    const supabase = createClient()
    const { error: err } = await supabase
      .from('orders')
      .update({
        status: 'confirmed',
        tailor_price: Number(price),
        tailor_note: tailorNote || null,
        tailor_id: user?.id,
        tailor_name: user?.user_metadata?.full_name ?? null,
      })
      .eq('id', id)
    setSubmitting(false)
    if (err) {
      setError('Failed to accept order. Please try again.')
    } else {
      router.push('/orders')
    }
  }

  const handleDecline = async () => {
    setError('')
    setSubmitting(true)
    const supabase = createClient()
    const { error: err } = await supabase
      .from('orders')
      .update({
        status: 'cancelled',
        decline_reason: declineNotes ? `${reason}: ${declineNotes}` : reason,
      })
      .eq('id', id)
    setSubmitting(false)
    if (err) {
      setError('Failed to decline order. Please try again.')
    } else {
      router.push('/orders')
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f9f9f9', maxWidth: 430, margin: '0 auto', paddingBottom: 32 }}>
      <PageHeader title="Respond to Order" />

      <div style={{ padding: '16px' }}>
        {/* Order summary card */}
        {loading ? (
          <div style={{ background: 'white', borderRadius: 16, padding: 20, marginBottom: 20, textAlign: 'center' }}>
            <div style={{ width: 28, height: 28, border: '3px solid #f8bbd9', borderTopColor: '#e91e8c', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
          </div>
        ) : order ? (
          <div style={{
            background: 'white',
            borderRadius: 16,
            padding: '16px',
            marginBottom: 20,
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            border: '1px solid #f5f5f5',
          }}>
            <p style={{ fontSize: 11, color: '#9e9e9e', fontWeight: 600, marginBottom: 8 }}>ORDER SUMMARY</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 13, color: '#616161' }}>Garment</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a', textTransform: 'capitalize' }}>{order.garment_type}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 13, color: '#616161' }}>Service</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a' }}>
                <ServiceLabel type={order.service_type} />
              </span>
            </div>
            {order.pickup_date && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: '#616161', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Calendar size={12} color="#9e9e9e" /> Pickup
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a' }}>{order.pickup_date}</span>
              </div>
            )}
            {order.pickup_time && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: '#616161', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={12} color="#9e9e9e" /> Time
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a' }}>{order.pickup_time}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, color: '#616161' }}>Order #</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#e91e8c' }}>#{order.order_number}</span>
            </div>
          </div>
        ) : (
          <div style={{ background: 'white', borderRadius: 16, padding: 20, marginBottom: 20, textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: '#9e9e9e' }}>Order not found.</p>
          </div>
        )}

        {/* Choice cards */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <button
            onClick={() => setSelected('accept')}
            style={{
              flex: 1,
              padding: '14px 12px',
              borderRadius: 14,
              border: selected === 'accept' ? '2px solid #2e7d32' : '2px solid #e0e0e0',
              background: selected === 'accept' ? '#f1f8e9' : 'white',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.15s',
            }}
          >
            <CheckCircle size={24} color={selected === 'accept' ? '#2e7d32' : '#bdbdbd'} />
            <span style={{ fontSize: 13, fontWeight: 800, color: selected === 'accept' ? '#2e7d32' : '#9e9e9e' }}>Accept</span>
          </button>
          <button
            onClick={() => setSelected('decline')}
            style={{
              flex: 1,
              padding: '14px 12px',
              borderRadius: 14,
              border: selected === 'decline' ? '2px solid #d32f2f' : '2px solid #e0e0e0',
              background: selected === 'decline' ? '#fff0f0' : 'white',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.15s',
            }}
          >
            <XCircle size={24} color={selected === 'decline' ? '#d32f2f' : '#bdbdbd'} />
            <span style={{ fontSize: 13, fontWeight: 800, color: selected === 'decline' ? '#d32f2f' : '#9e9e9e' }}>Decline</span>
          </button>
        </div>

        {/* Accept card */}
        {selected === 'accept' && (
          <div style={{
            background: 'white',
            borderRadius: 16,
            padding: '20px',
            boxShadow: '0 4px 20px rgba(46,125,50,0.1)',
            border: '1.5px solid #a5d6a7',
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #2e7d32, #66bb6a)',
              borderRadius: 12,
              padding: '14px 16px',
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}>
              <CheckCircle size={22} color="white" />
              <div>
                <p style={{ fontSize: 15, fontWeight: 800, color: 'white' }}>Accept Order</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>Set your price and confirm</p>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#424242', display: 'block', marginBottom: 8 }}>
                Price Quote (AED) <span style={{ color: '#d32f2f' }}>*</span>
              </label>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                background: '#f9f9f9',
                borderRadius: 12,
                border: '1.5px solid #e0e0e0',
                padding: '12px 14px',
                gap: 8,
              }}>
                <span style={{ fontSize: 15, fontWeight: 800, color: '#2e7d32' }}>AED</span>
                <input
                  type="number"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  style={{
                    flex: 1,
                    border: 'none',
                    outline: 'none',
                    fontSize: 22,
                    fontWeight: 900,
                    color: '#1a1a1a',
                    background: 'transparent',
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#424242', display: 'block', marginBottom: 8 }}>
                Note to Customer <span style={{ color: '#9e9e9e', fontWeight: 500 }}>(optional)</span>
              </label>
              <textarea
                value={tailorNote}
                onChange={e => setTailorNote(e.target.value)}
                placeholder="Any details about timeline, fitting appointments, etc."
                rows={3}
                style={{
                  width: '100%',
                  background: '#f9f9f9',
                  border: '1.5px solid #e0e0e0',
                  borderRadius: 12,
                  padding: '12px 14px',
                  fontSize: 14,
                  color: '#1a1a1a',
                  resize: 'none',
                  outline: 'none',
                  boxSizing: 'border-box',
                  lineHeight: 1.5,
                }}
              />
            </div>

            {error && (
              <p style={{ fontSize: 13, color: '#d32f2f', marginBottom: 12 }}>{error}</p>
            )}

            <button
              onClick={handleAccept}
              disabled={submitting}
              style={{
                width: '100%',
                padding: '15px 0',
                borderRadius: 12,
                border: 'none',
                background: submitting ? '#a5d6a7' : 'linear-gradient(135deg, #2e7d32, #43a047)',
                fontSize: 15,
                fontWeight: 800,
                color: 'white',
                cursor: submitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <CheckCircle size={18} />
              {submitting ? 'Confirming…' : 'Confirm Acceptance'}
            </button>
          </div>
        )}

        {/* Decline card */}
        {selected === 'decline' && (
          <div style={{
            background: 'white',
            borderRadius: 16,
            padding: '20px',
            boxShadow: '0 4px 20px rgba(211,47,47,0.08)',
            border: '1.5px solid #ef9a9a',
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #d32f2f, #e57373)',
              borderRadius: 12,
              padding: '14px 16px',
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}>
              <XCircle size={22} color="white" />
              <div>
                <p style={{ fontSize: 15, fontWeight: 800, color: 'white' }}>Decline Order</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>Let the customer know why</p>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#424242', display: 'block', marginBottom: 8 }}>
                Reason <span style={{ color: '#d32f2f' }}>*</span>
              </label>
              <select
                value={reason}
                onChange={e => setReason(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 12,
                  border: '1.5px solid #e0e0e0',
                  background: '#f9f9f9',
                  fontSize: 14,
                  color: '#1a1a1a',
                  outline: 'none',
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239e9e9e' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 14px center',
                }}
              >
                {DECLINE_REASONS.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#424242', display: 'block', marginBottom: 8 }}>
                Additional Notes <span style={{ color: '#9e9e9e', fontWeight: 500 }}>(optional)</span>
              </label>
              <textarea
                value={declineNotes}
                onChange={e => setDeclineNotes(e.target.value)}
                placeholder="Any additional details for the customer…"
                rows={3}
                style={{
                  width: '100%',
                  background: '#f9f9f9',
                  border: '1.5px solid #e0e0e0',
                  borderRadius: 12,
                  padding: '12px 14px',
                  fontSize: 14,
                  color: '#1a1a1a',
                  resize: 'none',
                  outline: 'none',
                  boxSizing: 'border-box',
                  lineHeight: 1.5,
                }}
              />
            </div>

            {error && (
              <p style={{ fontSize: 13, color: '#d32f2f', marginBottom: 12 }}>{error}</p>
            )}

            <button
              onClick={handleDecline}
              disabled={submitting}
              style={{
                width: '100%',
                padding: '15px 0',
                borderRadius: 12,
                border: 'none',
                background: submitting ? '#ef9a9a' : 'linear-gradient(135deg, #d32f2f, #e53935)',
                fontSize: 15,
                fontWeight: 800,
                color: 'white',
                cursor: submitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <XCircle size={18} />
              {submitting ? 'Declining…' : 'Decline Order'}
            </button>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
