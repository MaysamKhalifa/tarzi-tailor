'use client'

import { use, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useApp } from '@/lib/context/AppContext'
import { useLanguage } from '@/lib/context/LanguageContext'
import { ArrowLeft, ArrowRight, ArrowUp, Loader2 } from 'lucide-react'
import type { Order, ChatMessage } from '@/types/database'

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-AE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

function formatDateLabel(dateStr: string, todayLabel: string, yesterdayLabel: string): string {
  const date = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  if (date.toDateString() === today.toDateString()) return todayLabel
  if (date.toDateString() === yesterday.toDateString()) return yesterdayLabel
  return date.toLocaleDateString('en-AE', { weekday: 'long', day: 'numeric', month: 'long' })
}

function isSameDay(a: string, b: string): boolean {
  return new Date(a).toDateString() === new Date(b).toDateString()
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: '#fff3e0', text: '#e65100' },
  confirmed: { bg: '#ede9fe', text: '#7c3aed' },
  in_progress: { bg: '#dbeafe', text: '#1d4ed8' },
  ready: { bg: '#dcfce7', text: '#16a34a' },
  delivered: { bg: '#dcfce7', text: '#15803d' },
  cancelled: { bg: '#fee2e2', text: '#dc2626' },
}

export default function ChatThreadPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params)
  const router = useRouter()
  const { user, profile, loading: authLoading } = useApp()
  const { t, isRTL } = useLanguage()
  const [order, setOrder] = useState<Order | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Build STATUS_LABELS from t()
  const STATUS_LABELS: Record<string, string> = {
    pending: t('orders', 'pending'),
    confirmed: t('orders', 'confirmed'),
    in_progress: t('orders', 'in_progress'),
    ready: t('orders', 'ready'),
    delivered: t('orders', 'delivered'),
    cancelled: t('orders', 'cancelled'),
  }

  useEffect(() => {
    if (!authLoading && !user) router.push('/login')
  }, [authLoading, user, router])

  useEffect(() => {
    if (!user || !orderId) return

    const fetchData = async () => {
      setLoading(true)
      const supabase = createClient()

      const { data: orderData } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single()

      setOrder(orderData ?? null)

      const { data: msgData } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true })

      setMessages((msgData as ChatMessage[]) ?? [])
      setLoading(false)
    }

    fetchData()
  }, [user, orderId])

  // Real-time subscription
  useEffect(() => {
    if (!user || !orderId) return
    const supabase = createClient()

    const channel = supabase
      .channel(`chat:${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `order_id=eq.${orderId}`,
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage
          setMessages((prev) => {
            if (prev.find((m) => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, orderId])

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 100) + 'px'
  }, [text])

  const sendMessage = async () => {
    if (!text.trim() || !user || !orderId || sending) return
    if (order?.status === 'cancelled') return

    const content = text.trim()
    setText('')
    setSending(true)
    setError('')

    const supabase = createClient()
    const { error: err } = await supabase.from('chat_messages').insert({
      order_id: orderId,
      sender_id: user.id,
      sender_type: 'tailor',
      sender_name: profile?.full_name || user.email || 'Tailor',
      message: content,
    })

    if (err) {
      setError('Failed to send. Please try again.')
      setText(content)
    }
    setSending(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const isCancelled = order?.status === 'cancelled'
  const statusInfo = order ? STATUS_COLORS[order.status] ?? { bg: '#f3f4f6', text: '#6b7280' } : null

  if (authLoading || loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f7f7f7' }}>
        <Loader2 size={32} color="#e91e8c" style={{ animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  const BackArrow = isRTL ? ArrowRight : ArrowLeft

  return (
    <div
      dir={isRTL ? 'rtl' : undefined}
      style={{
        height: '100dvh',
        maxWidth: 430,
        margin: '0 auto',
        background: '#f7f7f7',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Custom Header */}
      <div
        style={{
          background: 'white',
          borderBottom: '1px solid #f0f0f0',
          paddingTop: 48,
          paddingBottom: 12,
          paddingLeft: 16,
          paddingRight: 16,
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
          <button
            onClick={() => router.back()}
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              background: '#f5f5f5',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <BackArrow size={18} color="#1a1a1a" />
          </button>
          <div style={{ flex: 1, minWidth: 0, textAlign: isRTL ? 'right' : 'left' }}>
            <p style={{ fontSize: 15, fontWeight: 800, color: '#1a1a1a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {order ? `${order.garment_type} — #${order.order_number}` : t('chat', 'title')}
            </p>
            {order && statusInfo && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  background: statusInfo.bg,
                  color: statusInfo.text,
                  padding: '2px 8px',
                  borderRadius: 20,
                  display: 'inline-block',
                  marginTop: 2,
                }}
              >
                {STATUS_LABELS[order.status] ?? order.status}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div
        style={{
          flex: 1,
          overflowY: 'scroll',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', paddingTop: 40 }}>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a', marginBottom: 6 }}>{t('chat', 'start')}</p>
            <p style={{ fontSize: 13, color: '#bdbdbd' }}>{t('chat', 'start_sub')}</p>
          </div>
        )}

        {messages.map((msg, idx) => {
          const isMine = msg.sender_id === user?.id
          const showDateSeparator =
            idx === 0 || !isSameDay(messages[idx - 1].created_at, msg.created_at)

          return (
            <div key={msg.id}>
              {showDateSeparator && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    margin: '12px 0',
                  }}
                >
                  <div style={{ flex: 1, height: 1, background: '#e0e0e0' }} />
                  <span style={{ fontSize: 11, color: '#9e9e9e', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {formatDateLabel(msg.created_at, t('chat', 'today'), t('chat', 'yesterday'))}
                  </span>
                  <div style={{ flex: 1, height: 1, background: '#e0e0e0' }} />
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isMine ? (isRTL ? 'flex-start' : 'flex-end') : (isRTL ? 'flex-end' : 'flex-start'),
                  marginBottom: 8,
                }}
              >
                {!isMine && msg.sender_name && (
                  <span style={{ fontSize: 11, color: '#9e9e9e', marginBottom: 3, [isRTL ? 'marginRight' : 'marginLeft']: 4, fontWeight: 600 }}>
                    {msg.sender_name}
                  </span>
                )}
                <div
                  style={{
                    maxWidth: '75%',
                    padding: '10px 14px',
                    borderRadius: isMine
                      ? (isRTL ? '18px 18px 18px 4px' : '18px 18px 4px 18px')
                      : (isRTL ? '18px 18px 4px 18px' : '18px 18px 18px 4px'),
                    background: isMine ? 'linear-gradient(135deg, #e91e8c, #f06292)' : 'white',
                    border: isMine ? 'none' : '1.5px solid #f0f0f0',
                    color: isMine ? 'white' : '#1a1a1a',
                    fontSize: 14,
                    lineHeight: 1.5,
                    wordBreak: 'break-word',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                    textAlign: isRTL ? 'right' : 'left',
                  }}
                >
                  {msg.message}
                </div>
                <span style={{ fontSize: 10, color: '#bdbdbd', marginTop: 3, paddingLeft: 4, paddingRight: 4 }}>
                  {formatTime(msg.created_at)}
                </span>
              </div>
            </div>
          )
        })}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div
        style={{
          background: 'white',
          borderTop: '1px solid #f0f0f0',
          padding: '10px 12px',
          paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))',
          flexShrink: 0,
        }}
      >
        {error && (
          <p style={{ fontSize: 12, color: '#dc2626', margin: '0 0 6px 4px', textAlign: isRTL ? 'right' : 'left' }}>{error}</p>
        )}
        {isCancelled ? (
          <div
            style={{
              background: '#f9fafb',
              border: '1.5px solid #e5e7eb',
              borderRadius: 16,
              padding: '12px 16px',
              textAlign: 'center',
            }}
          >
            <p style={{ fontSize: 13, color: '#9e9e9e', margin: 0 }}>
              {t('orders', 'cancelled')}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, flexDirection: isRTL ? 'row-reverse' : 'row' }}>
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('chat', 'type_msg')}
              rows={1}
              style={{
                flex: 1,
                resize: 'none',
                border: '1.5px solid #f0f0f0',
                borderRadius: 20,
                padding: '10px 14px',
                fontSize: 14,
                color: '#1a1a1a',
                background: '#f7f7f7',
                outline: 'none',
                lineHeight: 1.4,
                overflow: 'hidden',
                maxHeight: 100,
                fontFamily: 'inherit',
                textAlign: isRTL ? 'right' : 'left',
                direction: isRTL ? 'rtl' : 'ltr',
              }}
            />
            <button
              onClick={sendMessage}
              disabled={!text.trim() || sending}
              aria-label={t('chat', 'send')}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                background: text.trim() && !sending ? 'linear-gradient(135deg, #e91e8c, #f06292)' : '#e0e0e0',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: text.trim() && !sending ? 'pointer' : 'default',
                flexShrink: 0,
                transition: 'background 0.2s',
              }}
            >
              {sending ? (
                <Loader2 size={18} color="white" style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <ArrowUp size={18} color="white" />
              )}
            </button>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
