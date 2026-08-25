import { Analytics } from '@vercel/analytics/next'
import { PWARegister } from '@/components/pwa-register'
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'My Library — Personal Reading Tracker',
  description: 'A private command center for your personal reading journey.',
  generator: 'By Nishant',
  manifest: '/manifest.json',
  icons: {
    icon: './my-logo.png',
    apple: './my-logo.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'My Library',
  },
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#0b0c0d',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="antialiased">
        <PWARegister />
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
