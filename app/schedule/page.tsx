'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar, Clock, ChevronRight, Save } from 'lucide-react'
import BottomNav from '@/components/layout/BottomNav'
import PageHeader from '@/components/layout/PageHeader'
import { createClient } from '@/lib/supabase/client'
import { useApp } from '@/lib/context/AppContext'
import { useLanguage } from '@/lib/context/LanguageContext'
import type { Order } from '@/types/database'

const HOURS = Array.from({ length: 17 }, (_, i) => {
  const h = i + 6
  const suffix = h >= 12 ? 'PM' : 'AM'
  const display = h > 12 ? h - 12 : h
  return { value: h, label: `${display}:00 ${suffix}` }
})

function getWeekDates() {
  const today = new Date()
  const dow = today.getDay() // 0=Sun
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((dow + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })
}

export default function SchedulePage() {
  const { user, loading: authLoading } = useApp()
  const router = useRouter()
  const { t, isRTL } = useLanguage()
  const [availableDays, setAvailableDays] = useState<number[]>([0, 1, 2, 3, 6]) // Mon-Thu + Sun
  const [startHour, setStartHour] = useState(9)
  const [endHour, setEndHour] = useState(18)
  const [upcomingOrders, setUpcomingOrders] = useState<Order[]>([])
  const [saved, setSaved] = useState(false)
  const weekDates = getWeekDates()
  const today = new Date()

  const DAY_NAMES = [
    t('schedule', 'mon'),
    t('schedule', 'tue'),
    t('schedule', 'wed'),
    t('schedule', 'thu'),
    t('schedule', 'fri'),
    t('schedule', 'sat'),
    t('schedule', 'sun'),
  ]

  useEffect(() => {
    if (authLoading) return
    if (!user) { router.replace('/login'); return }
    const supabase = createClient()
    const in14Days = new Date(today.getTime() + 14 * 86400000).toISOString().split('T')[0]
    const todayStr = today.toISOString().split('T')[0]
    supabase
      .from('orders')
      .select('*')
      .eq('tailor_id', user.id)
      .gte('pickup_date', todayStr)
      .lte('pickup_date', in14Days)
      .order('pickup_date', { ascending: true })
      .then(({ data }) => setUpcomingOrders(data || []))
  }, [user, authLoading, router])

  const toggleDay = (idx: number) => {
    setAvailableDays(prev =>
      prev.includes(idx) ? prev.filter(d => d !== idx) : [...prev, idx]
    )
  }

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const selectStyle = {
    border: '1.5px solid #e8e8e8',
    background: '#fafafa',
    borderRadius: 10,
    padding: '10px 12px',
    fontSize: 14,
    width: '100%',
    outline: 'none',
    appearance: 'none' as const,
  }

  return (
    <div className="min-h-dvh bg-white pb-24" dir={isRTL ? 'rtl' : undefined}>
      <PageHeader title={t('schedule', 'title')} showBack={false} />

      <div className="px-5 py-4 flex flex-col gap-5">

        {/* Week view */}
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', marginBottom: 12, textAlign: isRTL ? 'right' : 'left' }}>
            {t('schedule', 'days')}
          </h3>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1" style={{ flexDirection: isRTL ? 'row-reverse' : 'row' }}>
            {weekDates.map((date, idx) => {
              const isToday = date.toDateString() === today.toDateString()
              const isAvail = availableDays.includes(idx)
              return (
                <button
                  key={idx}
                  onClick={() => toggleDay(idx)}
                  className="flex flex-col items-center flex-shrink-0 py-3 rounded-2xl transition-all"
                  style={{
                    minWidth: 52,
                    background: isAvail ? 'linear-gradient(135deg, #e91e8c 0%, #f06292 100%)' : '#f9f9f9',
                    border: isToday ? '2px solid #e91e8c' : '2px solid transparent',
                  }}
                >
                  <span style={{ fontSize: 11, fontWeight: 600, color: isAvail ? 'rgba(255,255,255,0.8)' : '#9e9e9e' }}>
                    {DAY_NAMES[idx]}
                  </span>
                  <span style={{ fontSize: 16, fontWeight: 800, color: isAvail ? 'white' : '#1a1a1a', marginTop: 2 }}>
                    {date.getDate()}
                  </span>
                  {isToday && (
                    <span className="w-1.5 h-1.5 rounded-full mt-1"
                      style={{ background: isAvail ? 'white' : '#e91e8c' }} />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Working hours */}
        <div className="p-4 rounded-2xl" style={{ background: '#f9f9f9' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', marginBottom: 12, textAlign: isRTL ? 'right' : 'left' }}>
            <Clock size={14} style={{ display: 'inline', marginRight: isRTL ? 0 : 6, marginLeft: isRTL ? 6 : 0, color: '#e91e8c' }} />
            {t('schedule', 'working_hours')}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 5, textAlign: isRTL ? 'right' : 'left' }}>
                {t('schedule', 'from')}
              </label>
              <select value={startHour} onChange={e => setStartHour(Number(e.target.value))} style={selectStyle}>
                {HOURS.filter(h => h.value < endHour).map(h => (
                  <option key={h.value} value={h.value}>{h.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 5, textAlign: isRTL ? 'right' : 'left' }}>
                {t('schedule', 'to')}
              </label>
              <select value={endHour} onChange={e => setEndHour(Number(e.target.value))} style={selectStyle}>
                {HOURS.filter(h => h.value > startHour).map(h => (
                  <option key={h.value} value={h.value}>{h.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Upcoming pickups */}
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', marginBottom: 12, textAlign: isRTL ? 'right' : 'left' }}>
            <Calendar size={14} style={{ display: 'inline', marginRight: isRTL ? 0 : 6, marginLeft: isRTL ? 6 : 0, color: '#e91e8c' }} />
            {t('orders', 'pickup')}
          </h3>

          {upcomingOrders.length === 0 ? (
            <div className="text-center py-8 rounded-2xl" style={{ background: '#f9f9f9' }}>
              <Calendar size={32} color="#ddd" className="mx-auto mb-2" />
              <p style={{ fontSize: 13, color: '#9e9e9e' }}>{t('orders', 'no_date')}</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {upcomingOrders.map(order => (
                <button
                  key={order.id}
                  onClick={() => router.push(`/orders/${order.id}`)}
                  className="flex items-center gap-3 p-3 rounded-xl text-left w-full"
                  style={{ background: '#f9f9f9', border: '1px solid #f0f0f0', flexDirection: isRTL ? 'row-reverse' : 'row' }}
                >
                  <div className="px-3 py-2 rounded-xl flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #e91e8c 0%, #f06292 100%)' }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: 'white' }}>
                      {order.pickup_time || '—'}
                    </p>
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)', marginTop: 1 }}>
                      {order.pickup_date ? new Date(order.pickup_date + 'T00:00:00').toLocaleDateString('en-AE', { weekday: 'short', day: 'numeric', month: 'short' }) : '—'}
                    </p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a', textAlign: isRTL ? 'right' : 'left' }}>{order.garment_type}</p>
                    <p style={{ fontSize: 11, color: '#9e9e9e', textAlign: isRTL ? 'right' : 'left' }}>{order.order_number}</p>
                  </div>
                  <ChevronRight size={14} color="#ccc" style={{ transform: isRTL ? 'scaleX(-1)' : undefined }} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          className="w-full py-4 rounded-full text-white font-bold text-base flex items-center justify-center gap-2"
          style={{
            background: saved ? '#4caf50' : 'linear-gradient(135deg, #e91e8c 0%, #f06292 100%)',
            boxShadow: '0 4px 15px rgba(233,30,140,0.3)',
          }}
        >
          <Save size={18} />
          {saved ? t('schedule', 'saved') : t('schedule', 'save_schedule')}
        </button>
      </div>

      <BottomNav />
    </div>
  )
}
