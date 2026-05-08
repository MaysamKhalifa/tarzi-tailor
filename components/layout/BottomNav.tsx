'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, ClipboardList, MessageCircle, User } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/home',    icon: Home,          label: 'Home'    },
  { href: '/orders',  icon: ClipboardList, label: 'Orders'  },
  { href: '/chat',    icon: MessageCircle, label: 'Chat'    },
  { href: '/profile', icon: User,          label: 'Profile' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px]"
      style={{
        background: 'white',
        borderTop: '1px solid #f0f0f0',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        zIndex: 50,
      }}
    >
      <div className="flex">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link key={href} href={href}
              className="flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5"
              style={{ color: active ? '#e91e8c' : '#9e9e9e' }}>
              <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
              <span style={{ fontSize: 10, fontWeight: active ? 700 : 500 }}>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
