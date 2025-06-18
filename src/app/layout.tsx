import './globals.css'
import { Inter } from 'next/font/google'
import type { Metadata } from 'next'
import { ClientLayout } from './ClientLayout'

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
    <html lang="en">
      <body className={`${inter.className} dark:bg-gray-900 dark:text-gray-100`}>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  )
} 