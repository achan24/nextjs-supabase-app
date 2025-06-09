import './globals.css'
import { Inter } from 'next/font/google'
import type { Metadata } from 'next'
import { NotificationProvider } from '../contexts/NotificationContext'
import { ServiceWorkerRegistration } from '../components/ServiceWorkerRegistration'
import { Toaster } from '@/components/ui/toaster'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Guardian Angel',
  description: 'Your 24-hour cognitive prosthetic for managing time, tasks, and focus',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.className}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#3b82f6" />
      </head>
      <body className="antialiased">
        <NotificationProvider>
          <ServiceWorkerRegistration />
          {children}
          <Toaster />
        </NotificationProvider>
      </body>
    </html>
  )
} 