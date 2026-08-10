'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Check, X, MessageSquare, ChevronDown, ChevronUp,
  Loader2, LogOut, ExternalLink, Clock, AlertCircle
} from 'lucide-react'

// ─── Types ─────────────────────────────────────────────────────────────────────
type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'needs_info'
type TabFilter = 'pending' | 'approved' | 'rejected' | 'needs_info' | 'all'

interface TailorProfile {
  id: string
  full_name: string | null
  shop_name: string | null
  phone: string | null
  shop_address: string | null
  specialties: string[] | null
  languages: string[] | null
  availability: string | null
  permit_url: string | null
  is_approved: boolean
  approval_status: ApprovalStatus | null
  approval_notes: string | null
  onboarding_complete: boolean
  created_at: string
  // service pricing joined
  services?: { service_type: string; price_from: number }[]
}

interface NoteState {
  tailorId: string
  action: ApprovalStatus
  text: string
}

// ─── Status badge ───────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: ApprovalStatus | null }) {
  const cfg: Record<ApprovalStatus, { label: string; bg: string; color: string; icon: string }> = {
    pending:    { label: 'Pending',       bg: '#fff8e1', color: '#f57f17', icon: '⏳' },
    approved:   { label: 'Approved',      bg: '#e8f5e9', color: '#2e7d32', icon: '✓' },
    rejected:   { label: 'Rejected',      bg: '#ffebee', color: '#c62828', icon: '✗' },
    needs_info: { label: 'Needs Info',    bg: '#e3f2fd', color: '#1565c0', icon: '💬' },
  }
  const s = status ?? 'pending'
  const c = cfg[s]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700,
      background: c.bg, color: c.color,
    }}>
      {c.icon} {c.label}
    </span>
  )
}

// ─── Main component ─────────────────────────────────────────────────────────────
export default function AdminPage() {
  const router = useRouter()

  const [adminUser, setAdminUser] = useState<{ id: string; email: string } | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  const [tailors, setTailors] = useState<TailorProfile[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [tab, setTab] = useState<TabFilter>('pending')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [noteState, setNoteState] = useState<NoteState | null>(null)
  const [processing, setProcessing] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  // ── Check admin auth ──────────────────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.replace('/login'); return }
      // Check role
      supabase.from('profiles').select('role').eq('id', user.id).single().then(({ data }) => {
        if (data?.role !== 'admin') { router.replace('/home'); return }
        setAdminUser({ id: user.id, email: user.email ?? '' })
        setAuthLoading(false)
      })
    })
  }, [router])

  // ── Fetch tailors ─────────────────────────────────────────────────────────
  const fetchTailors = useCallback(async () => {
    setLoadingData(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, shop_name, phone, shop_address, specialties, languages, availability, permit_url, is_approved, approval_status, approval_notes, onboarding_complete, created_at')
      .eq('role', 'tailor')
      .eq('onboarding_complete', true)
      .order('created_at', { ascending: false })

    if (error || !data) { setLoadingData(false); return }

    // Fetch pricing for each tailor
    const tailorIds = data.map(t => t.id)
    let services: { tailor_id: string; service_type: string; price_from: number }[] = []
    if (tailorIds.length > 0) {
      const { data: svcData } = await supabase
        .from('tailor_services')
        .select('tailor_id, service_type, price_from')
        .in('tailor_id', tailorIds)
      services = svcData ?? []
    }

    const enriched: TailorProfile[] = data.map(t => ({
      ...t,
      approval_status: (t.approval_status as ApprovalStatus | null) ?? 'pending',
      services: services.filter(s => s.tailor_id === t.id),
    }))

    setTailors(enriched)
    setLoadingData(false)
  }, [])

  useEffect(() => {
    if (!authLoading) fetchTailors()
  }, [authLoading, fetchTailors])

  // ── Update approval status ─────────────────────────────────────────────────
  const updateStatus = async (tailorId: string, newStatus: ApprovalStatus, notes?: string) => {
    setProcessing(tailorId)
    const supabase = createClient()
    const { error } = await supabase
      .from('profiles')
      .update({
        approval_status: newStatus,
        is_approved: newStatus === 'approved',
        approval_notes: notes ?? null,
      })
      .eq('id', tailorId)

    if (error) {
      showToast('❌ Failed to update. Please try again.')
    } else {
      setTailors(prev => prev.map(t =>
        t.id === tailorId
          ? { ...t, approval_status: newStatus, is_approved: newStatus === 'approved', approval_notes: notes ?? null }
          : t
      ))
      const msgs: Record<ApprovalStatus, string> = {
        approved:   '✅ Tailor approved and is now visible to customers.',
        rejected:   '🚫 Tailor has been rejected.',
        needs_info: '💬 Tailor has been asked for more information.',
        pending:    '⏳ Status reset to pending.',
      }
      showToast(msgs[newStatus])
    }
    setProcessing(null)
    setNoteState(null)
  }

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }

  const signOut = async () => {
    await createClient().auth.signOut()
    router.replace('/login')
  }

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filtered = tailors.filter(t => {
    if (tab === 'all') return true
    const s = t.approval_status ?? 'pending'
    return s === tab
  })

  const counts: Record<TabFilter, number> = {
    pending:    tailors.filter(t => (t.approval_status ?? 'pending') === 'pending').length,
    approved:   tailors.filter(t => t.approval_status === 'approved').length,
    rejected:   tailors.filter(t => t.approval_status === 'rejected').length,
    needs_info: tailors.filter(t => t.approval_status === 'needs_info').length,
    all:        tailors.length,
  }

  const tabConfig: { id: TabFilter; label: string; color: string }[] = [
    { id: 'pending',    label: 'Pending',    color: '#f57f17' },
    { id: 'approved',   label: 'Approved',   color: '#2e7d32' },
    { id: 'rejected',   label: 'Rejected',   color: '#c62828' },
    { id: 'needs_info', label: 'Needs Info', color: '#1565c0' },
    { id: 'all',        label: 'All',        color: '#616161' },
  ]

  const serviceLabels: Record<string, string> = {
    alterations: 'Alterations',
    from_scratch: 'From Scratch',
    upcycling: 'Upcycling',
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
        <Loader2 size={32} color="#e91e8c" className="animate-spin" />
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100dvh', background: '#f5f5f5', fontFamily: 'system-ui, sans-serif' }}>

      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        padding: '20px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: 'white', margin: 0 }}>
            🛡️ Tarzi Admin
          </h1>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: '2px 0 0' }}>
            {adminUser?.email}
          </p>
        </div>
        <button
          onClick={signOut}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
            borderRadius: 10, border: 'none', background: 'rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.75)', cursor: 'pointer', fontSize: 13,
          }}
        >
          <LogOut size={14} /> Sign Out
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 70, left: '50%', transform: 'translateX(-50%)',
          background: '#1a1a1a', color: 'white', padding: '12px 20px',
          borderRadius: 12, fontSize: 14, fontWeight: 500, zIndex: 200,
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          whiteSpace: 'nowrap',
        }}>
          {toast}
        </div>
      )}

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          {[
            { label: 'Total Tailors',  value: counts.all,        bg: '#e3f2fd', color: '#1565c0' },
            { label: 'Pending Review', value: counts.pending,    bg: '#fff8e1', color: '#f57f17' },
            { label: 'Approved',       value: counts.approved,   bg: '#e8f5e9', color: '#2e7d32' },
            { label: 'Rejected',       value: counts.rejected,   bg: '#ffebee', color: '#c62828' },
          ].map(s => (
            <div key={s.label} style={{
              flex: '1 1 120px', background: s.bg, borderRadius: 12,
              padding: '14px 16px',
            }}>
              <p style={{ fontSize: 24, fontWeight: 800, color: s.color, margin: 0 }}>{s.value}</p>
              <p style={{ fontSize: 12, color: s.color, margin: '2px 0 0', opacity: 0.8 }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {tabConfig.map(tc => (
            <button
              key={tc.id}
              onClick={() => setTab(tc.id)}
              style={{
                padding: '7px 14px', borderRadius: 20, border: 'none',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                background: tab === tc.id ? tc.color : '#e8e8e8',
                color: tab === tc.id ? 'white' : '#616161',
                transition: 'all 0.15s',
              }}
            >
              {tc.label} {counts[tc.id] > 0 && `(${counts[tc.id]})`}
            </button>
          ))}
        </div>

        {/* Tailor list */}
        {loadingData ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <Loader2 size={28} color="#e91e8c" className="animate-spin" style={{ margin: '0 auto 12px' }} />
            <p style={{ color: '#9e9e9e', fontSize: 14 }}>Loading tailors…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#9e9e9e' }}>
            <AlertCircle size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
            <p style={{ fontSize: 15 }}>No tailors in this category</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map(tailor => {
              const isExp = expanded === tailor.id
              const isProcessing = processing === tailor.id
              const status = tailor.approval_status ?? 'pending'

              return (
                <div key={tailor.id} style={{
                  background: 'white', borderRadius: 16,
                  boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
                  overflow: 'hidden',
                  border: status === 'pending' ? '2px solid #ffe082' : '2px solid transparent',
                }}>
                  {/* Card header */}
                  <div
                    onClick={() => setExpanded(isExp ? null : tailor.id)}
                    style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>
                          {tailor.shop_name || tailor.full_name || 'Unnamed Tailor'}
                        </h3>
                        <StatusBadge status={status} />
                      </div>
                      <p style={{ fontSize: 13, color: '#757575', margin: 0 }}>
                        {tailor.full_name && tailor.shop_name ? `👤 ${tailor.full_name} · ` : ''}
                        📍 {tailor.shop_address || 'No address'} ·
                        📱 {tailor.phone || 'No phone'}
                      </p>
                      <p style={{ fontSize: 11, color: '#bbb', margin: '4px 0 0' }}>
                        Submitted {new Date(tailor.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <div style={{ color: '#9e9e9e', flexShrink: 0, marginTop: 2 }}>
                      {isExp ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExp && (
                    <div style={{ borderTop: '1px solid #f5f5f5', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

                      {/* Specialties */}
                      {tailor.specialties && tailor.specialties.length > 0 && (
                        <div>
                          <p style={{ fontSize: 12, fontWeight: 700, color: '#9e9e9e', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 0.5 }}>Specialties</p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {tailor.specialties.map(s => (
                              <span key={s} style={{ padding: '4px 10px', borderRadius: 20, background: '#fce4ec', color: '#e91e8c', fontSize: 12, fontWeight: 600 }}>
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Service pricing */}
                      {tailor.services && tailor.services.length > 0 && (
                        <div>
                          <p style={{ fontSize: 12, fontWeight: 700, color: '#9e9e9e', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 0.5 }}>Pricing</p>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {tailor.services.map(s => (
                              <div key={s.service_type} style={{ padding: '6px 12px', borderRadius: 10, background: '#f5f5f5', fontSize: 13 }}>
                                <span style={{ fontWeight: 600, color: '#1a1a1a' }}>{serviceLabels[s.service_type] ?? s.service_type}</span>
                                <span style={{ color: '#e91e8c', marginLeft: 6, fontWeight: 700 }}>AED {s.price_from}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Languages & availability */}
                      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                        {tailor.languages && tailor.languages.length > 0 && (
                          <div>
                            <p style={{ fontSize: 12, fontWeight: 700, color: '#9e9e9e', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: 0.5 }}>Languages</p>
                            <p style={{ fontSize: 13, color: '#1a1a1a', margin: 0 }}>{tailor.languages.join(', ')}</p>
                          </div>
                        )}
                        {tailor.availability && (
                          <div>
                            <p style={{ fontSize: 12, fontWeight: 700, color: '#9e9e9e', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: 0.5 }}>Availability</p>
                            <p style={{ fontSize: 13, color: '#1a1a1a', margin: 0 }}>{tailor.availability}</p>
                          </div>
                        )}
                      </div>

                      {/* Trade license */}
                      {tailor.permit_url && (
                        <div>
                          <p style={{ fontSize: 12, fontWeight: 700, color: '#9e9e9e', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: 0.5 }}>Trade License</p>
                          <a
                            href={tailor.permit_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, background: '#e3f2fd', color: '#1565c0', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}
                          >
                            <ExternalLink size={14} /> View Document
                          </a>
                        </div>
                      )}

                      {/* Existing approval notes */}
                      {tailor.approval_notes && (
                        <div style={{ background: '#fff8e1', borderRadius: 10, padding: '10px 14px' }}>
                          <p style={{ fontSize: 11, fontWeight: 700, color: '#f57f17', margin: '0 0 4px', textTransform: 'uppercase' }}>Admin Notes</p>
                          <p style={{ fontSize: 13, color: '#1a1a1a', margin: 0, lineHeight: 1.5 }}>{tailor.approval_notes}</p>
                        </div>
                      )}

                      {/* Note input (when action selected) */}
                      {noteState?.tailorId === tailor.id && (
                        <div>
                          <label style={{ fontSize: 12, fontWeight: 700, color: '#3a3a3a', display: 'block', marginBottom: 6 }}>
                            {noteState.action === 'needs_info' ? 'What information is needed?' : 'Reason / notes (optional)'}
                          </label>
                          <textarea
                            value={noteState.text}
                            onChange={e => setNoteState(prev => prev ? { ...prev, text: e.target.value } : null)}
                            placeholder={noteState.action === 'needs_info' ? 'e.g. Please upload a clearer photo of your trade license.' : 'Optional reason…'}
                            rows={3}
                            style={{
                              width: '100%', padding: '10px 14px', borderRadius: 10,
                              border: '1.5px solid #e0e0e0', fontSize: 14, outline: 'none',
                              resize: 'vertical', boxSizing: 'border-box',
                            }}
                          />
                          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                            <button
                              onClick={() => updateStatus(tailor.id, noteState.action, noteState.text || undefined)}
                              disabled={isProcessing}
                              style={{
                                flex: 1, padding: '10px', borderRadius: 10, border: 'none',
                                background: noteState.action === 'approved' ? '#2e7d32' : noteState.action === 'rejected' ? '#c62828' : '#1565c0',
                                color: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                              }}
                            >
                              {isProcessing ? <Loader2 size={14} className="animate-spin" /> : 'Confirm'}
                            </button>
                            <button
                              onClick={() => setNoteState(null)}
                              style={{ padding: '10px 16px', borderRadius: 10, border: '1.5px solid #e0e0e0', background: 'white', color: '#616161', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Action buttons */}
                      {(!noteState || noteState.tailorId !== tailor.id) && (
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {status !== 'approved' && (
                            <button
                              onClick={() => setNoteState({ tailorId: tailor.id, action: 'approved', text: '' })}
                              disabled={isProcessing}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px',
                                borderRadius: 10, border: 'none', background: '#e8f5e9', color: '#2e7d32',
                                fontWeight: 700, fontSize: 13, cursor: 'pointer',
                              }}
                            >
                              <Check size={14} /> Approve
                            </button>
                          )}
                          {status !== 'rejected' && (
                            <button
                              onClick={() => setNoteState({ tailorId: tailor.id, action: 'rejected', text: '' })}
                              disabled={isProcessing}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px',
                                borderRadius: 10, border: 'none', background: '#ffebee', color: '#c62828',
                                fontWeight: 700, fontSize: 13, cursor: 'pointer',
                              }}
                            >
                              <X size={14} /> Reject
                            </button>
                          )}
                          {status !== 'needs_info' && (
                            <button
                              onClick={() => setNoteState({ tailorId: tailor.id, action: 'needs_info', text: '' })}
                              disabled={isProcessing}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px',
                                borderRadius: 10, border: 'none', background: '#e3f2fd', color: '#1565c0',
                                fontWeight: 700, fontSize: 13, cursor: 'pointer',
                              }}
                            >
                              <MessageSquare size={14} /> Request Info
                            </button>
                          )}
                          {status !== 'pending' && (
                            <button
                              onClick={() => updateStatus(tailor.id, 'pending')}
                              disabled={isProcessing}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px',
                                borderRadius: 10, border: '1.5px solid #e0e0e0', background: 'white', color: '#616161',
                                fontWeight: 600, fontSize: 13, cursor: 'pointer',
                              }}
                            >
                              <Clock size={14} /> Reset to Pending
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
