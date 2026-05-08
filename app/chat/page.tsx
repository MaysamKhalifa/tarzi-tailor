'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useApp } from '@/lib/context/AppContext'
import PageHeader from '@/components/layout/PageHeader'
import BottomNav from '@/components/layout/BottomNav'
import { Scissors, Search, Loader2 } from 'lucide-react'
import type { Order, ChatMessage } from '@/types/database'

interface ConversationItem {
  order: Order
  lastMessage: ChatMessage | null
  unread: boolean
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) {
    return date.toLocaleTimeString('en-AE', { hour: '2-digit', minute: '2-digit', hour12: true })
  } else if (diffDays === 1) {
    return 'Yesterday'
  } else if (diffDays < 7) {
    return date.toLocaleDateString('en-AE', { weekday: 'short' })
  }
  return date.toLocaleDateString('en-AE', { day: 'numeric', month: 'short' })
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + '…' : str
}

function getOrderInitial(order: Order): string {
  return order.garment_type?.charAt(0)?.toUpperCase() ?? 'O'
}

export default function ChatListPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useApp()
  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!authLoading && !user) router.push('/login')
  }, [authLoading, user, router])

  useEffect(() => {
    if (!user) return
    const fetchConversations = async () => {
      setLoading(true)
      const supabase = createClient()

      const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .eq('tailor_id', user.id)
        .order('updated_at', { ascending: false, nullsFirst: false })

      if (error || !orders) {
        setLoading(false)
        return
      }

      // Fetch latest message for each order
      const items: ConversationItem[] = await Promise.all(
        orders.map(async (order: Order) => {
          const { data: messages } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('order_id', order.id)
            .order('created_at', { ascending: false })
            .limit(1)

          const lastMessage = messages?.[0] ?? null

          // Unread: last message exists and was not sent by tailor
          const unread = !!(lastMessage && lastMessage.sender_id !== user.id)

          return { order, lastMessage, unread }
        })
      )

      // Only show orders that have messages, but include all for discoverability
      setConversations(items)
      setLoading(false)
    }

    fetchConversations()
  }, [user])

  const filtered = useMemo(() => {
    if (!search.trim()) return conversations
    const q = search.toLowerCase()
    return conversations.filter(
      (c) =>
        c.order.order_number.toLowerCase().includes(q) ||
        c.order.garment_type.toLowerCase().includes(q) ||
        c.order.customer_name?.toLowerCase().includes(q)
    )
  }, [conversations, search])

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f7f7f7' }}>
        <Loader2 size={32} color="#e91e8c" style={{ animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f7f7f7', maxWidth: 430, margin: '0 auto', paddingBottom: 80 }}>
      <PageHeader title="Messages" showBack={false} />

      {/* Search */}
      <div style={{ padding: '12px 16px', background: 'white', borderBottom: '1px solid #f0f0f0' }}>
        <div style={{ position: 'relative' }}>
          <Search size={16} color="#bdbdbd" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search orders or garments…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              paddingLeft: 38,
              paddingRight: 14,
              paddingTop: 10,
              paddingBottom: 10,
              borderRadius: 12,
              border: '1.5px solid #f0f0f0',
              background: '#f7f7f7',
              fontSize: 14,
              color: '#1a1a1a',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
          <Loader2 size={28} color="#e91e8c" style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: '60px 32px', textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: 24, background: '#fdf2f8', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Scissors size={28} color="#e91e8c" />
          </div>
          <p style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a', margin: '0 0 8px' }}>
            {search ? 'No results found' : 'No conversations yet'}
          </p>
          <p style={{ fontSize: 13, color: '#9e9e9e', margin: 0 }}>
            {search ? 'Try a different search term' : 'Accept orders to start chatting.'}
          </p>
        </div>
      ) : (
        <div style={{ background: 'white' }}>
          {filtered.map((item, idx) => (
            <Link key={item.order.id} href={`/chat/${item.order.id}`} style={{ textDecoration: 'none' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '14px 16px',
                  borderBottom: idx < filtered.length - 1 ? '1px solid #f5f5f5' : 'none',
                  background: 'white',
                }}
              >
                {/* Avatar */}
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    background: 'linear-gradient(135deg, #e91e8c, #f06292)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    position: 'relative',
                  }}
                >
                  {item.order.garment_type ? (
                    <span style={{ fontSize: 18, fontWeight: 800, color: 'white' }}>
                      {getOrderInitial(item.order)}
                    </span>
                  ) : (
                    <Scissors size={20} color="white" />
                  )}
                  {item.unread && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 1,
                        right: 1,
                        width: 12,
                        height: 12,
                        borderRadius: 6,
                        background: '#e91e8c',
                        border: '2px solid white',
                      }}
                    />
                  )}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '65%' }}>
                      {item.order.garment_type} — #{item.order.order_number}
                    </p>
                    {item.lastMessage && (
                      <span style={{ fontSize: 11, color: '#bdbdbd', flexShrink: 0 }}>
                        {formatTime(item.lastMessage.created_at)}
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 13, color: item.unread ? '#1a1a1a' : '#9e9e9e', margin: 0, fontWeight: item.unread ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.lastMessage
                      ? truncate(item.lastMessage.message, 50)
                      : 'No messages yet — tap to start'}
                  </p>
                </div>

                {/* Unread dot (right side) */}
                {item.unread && (
                  <div style={{ width: 8, height: 8, borderRadius: 4, background: '#e91e8c', flexShrink: 0 }} />
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      <BottomNav />
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
