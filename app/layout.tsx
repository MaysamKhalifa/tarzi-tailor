import type { Metadata } from 'next'
import './globals.css'
import { AppProvider } from '@/lib/context/AppContext'

export const metadata: Metadata = {
  title: 'Tarzi Tailor Portal',
  description: 'Manage your tailoring orders, chat with customers, and grow your business.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppProvider>
          <div style={{ maxWidth: 430, margin: '0 auto', minHeight: '100dvh', background: 'white' }}>
            {children}
          </div>
        </AppProvider>
      </body>
    </html>
  )
}
