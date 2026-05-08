'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Scissors, Sparkles, RefreshCw, Check, Save } from 'lucide-react'
import BottomNav from '@/components/layout/BottomNav'
import PageHeader from '@/components/layout/PageHeader'
import { createClient } from '@/lib/supabase/client'
import { useApp } from '@/lib/context/AppContext'

const GARMENT_OPTIONS = [
  'Kandoora', 'Abaya', 'Suit', 'Dress', 'Shirt', 'Blouse', 'Trousers',
  'Jalabiya', 'Gown', 'Kaftan', 'Thobe', 'Bisht', 'Skirt', 'Jacket', 'Other',
]

const TURNAROUND_OPTIONS = [
  { value: '1_day', label: 'Same / Next Day' },
  { value: '2_3_days', label: '2–3 Days' },
  { value: '1_week', label: '1 Week' },
  { value: '2_weeks', label: '2 Weeks' },
]

export default function ServicesPage() {
  const { user, loading: authLoading } = useApp()
  const router = useRouter()

  const [services, setServices] = useState({
    alterations: true,
    from_scratch: false,
    upcycling: false,
  })
  const [prices, setPrices] = useState({ alterations: '', from_scratch: '', upcycling: '' })
  const [garments, setGarments] = useState<string[]>(['Kandoora', 'Abaya'])
  const [turnaround, setTurnaround] = useState('2_3_days')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (authLoading) return
    if (!user) { router.replace('/login'); return }
  }, [user, authLoading, router])

  const toggleGarment = (g: string) =>
    setGarments(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g])

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    const supabase = createClient()
    await supabase.from('profiles').upsert({
      id: user.id,
      services_json: JSON.stringify({ services, prices, garments, turnaround }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const inputStyle = {
    border: '1.5px solid #e8e8e8',
    background: '#fafafa',
    borderRadius: 10,
    padding: '10px 12px',
    fontSize: 14,
    width: '100%',
    outline: 'none',
  }

  const SERVICE_ITEMS = [
    { key: 'alterations' as const, icon: Scissors, label: 'Alterations', desc: 'Adjustments & repairs', color: '#e91e8c', bg: '#fce4ec' },
    { key: 'from_scratch' as const, icon: Sparkles, label: 'From Scratch', desc: 'Custom garments made fresh', color: '#7b1fa2', bg: '#f3e5f5' },
    { key: 'upcycling' as const, icon: RefreshCw, label: 'Upcycling', desc: 'Transform existing clothes', color: '#2e7d32', bg: '#e8f5e9' },
  ]

  return (
    <div className="min-h-dvh bg-white pb-24">
      <PageHeader title="My Services" showBack={false} />

      <div className="px-5 py-4 flex flex-col gap-5">

        {/* Service toggles */}
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', marginBottom: 12 }}>Services Offered</h3>
          <div className="flex flex-col gap-3">
            {SERVICE_ITEMS.map(({ key, icon: Icon, label, desc, color, bg }) => {
              const enabled = services[key]
              return (
                <div key={key} className="rounded-2xl overflow-hidden"
                  style={{ border: `1.5px solid ${enabled ? color + '40' : '#f0f0f0'}` }}>
                  <button
                    onClick={() => setServices(prev => ({ ...prev, [key]: !prev[key] }))}
                    className="w-full flex items-center gap-3 p-4 text-left"
                    style={{ background: enabled ? bg : 'white' }}
                  >
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center"
                      style={{ background: enabled ? color : '#f0f0f0' }}>
                      <Icon size={20} color={enabled ? 'white' : '#bbb'} />
                    </div>
                    <div className="flex-1">
                      <p style={{ fontSize: 15, fontWeight: 700, color: enabled ? '#1a1a1a' : '#9e9e9e' }}>{label}</p>
                      <p style={{ fontSize: 12, color: enabled ? '#555' : '#bbb' }}>{desc}</p>
                    </div>
                    <div className="w-6 h-6 rounded-full flex items-center justify-center"
                      style={{ background: enabled ? color : '#e0e0e0' }}>
                      {enabled && <Check size={14} color="white" />}
                    </div>
                  </button>

                  {enabled && (
                    <div className="px-4 pb-4 pt-1" style={{ background: bg }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: '#555', display: 'block', marginBottom: 5 }}>
                        Starting price (AED)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2"
                          style={{ fontSize: 13, fontWeight: 700, color: color }}>AED</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={prices[key]}
                          onChange={e => setPrices(prev => ({ ...prev, [key]: e.target.value.replace(/\D/g, '') }))}
                          placeholder="e.g. 50"
                          style={{ ...inputStyle, paddingLeft: 48 }}
                          onFocus={e => (e.target.style.borderColor = color)}
                          onBlur={e => (e.target.style.borderColor = '#e8e8e8')}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Garment specialties */}
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', marginBottom: 12 }}>Specialty Garments</h3>
          <div className="flex flex-wrap gap-2">
            {GARMENT_OPTIONS.map(g => {
              const selected = garments.includes(g)
              return (
                <button key={g} onClick={() => toggleGarment(g)}
                  className="px-3 py-2 rounded-xl text-sm font-semibold transition-all"
                  style={{
                    background: selected ? 'linear-gradient(135deg, #e91e8c 0%, #f06292 100%)' : '#f5f5f5',
                    color: selected ? 'white' : '#555',
                  }}>
                  {g}
                </button>
              )
            })}
          </div>
        </div>

        {/* Turnaround */}
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', marginBottom: 12 }}>Typical Turnaround Time</h3>
          <div className="grid grid-cols-2 gap-2">
            {TURNAROUND_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => setTurnaround(opt.value)}
                className="py-3 px-4 rounded-xl text-sm font-semibold transition-all"
                style={{
                  border: `2px solid ${turnaround === opt.value ? '#e91e8c' : '#e8e8e8'}`,
                  background: turnaround === opt.value ? '#fce4ec' : '#fafafa',
                  color: turnaround === opt.value ? '#e91e8c' : '#555',
                }}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-4 rounded-full text-white font-bold text-base flex items-center justify-center gap-2"
          style={{
            background: saved ? '#4caf50' : saving ? '#f9a0c8' : 'linear-gradient(135deg, #e91e8c 0%, #f06292 100%)',
            boxShadow: '0 4px 15px rgba(233,30,140,0.3)',
          }}
        >
          <Save size={18} />
          {saved ? 'Saved!' : saving ? 'Saving...' : 'Save Services'}
        </button>
      </div>

      <BottomNav />
    </div>
  )
}
