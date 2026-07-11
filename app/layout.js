import './globals.css'
import { fontOutfit, fontReenieBeanie } from '@/lib/fonts'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { Toaster } from 'react-hot-toast'
import { ThemeProvider } from '@/contexts/ThemeContext'
import SessionTimeoutWatcher from '@/components/SessionTimeoutWatcher'
import PrivacyConsentWidget from '@/components/PrivacyConsentWidget'
import RecoverySessionRedirect from '@/components/RecoverySessionRedirect'
import AuthEmailLinkBridge from '@/components/AuthEmailLinkBridge'
import PwaLaunchSplash from '@/components/PwaLaunchSplash'

export const metadata = {
  title: 'Otters Kenya Academy of Swimming',
  description: 'Swim club management platform for Otters Kenya',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Otters Kenya',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#ffffff',
}

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={`${fontOutfit.variable} ${fontReenieBeanie.variable}`}
    >
      <head>
        <link rel="apple-touch-icon" href="/icons/icon.svg" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
                  document.documentElement.style.backgroundColor = '#ffffff';
                }
                // Default to dark; light only when explicitly saved
                if (localStorage.theme === 'light') {
                  document.documentElement.classList.remove('dark')
                } else {
                  document.documentElement.classList.add('dark')
                  if (!('theme' in localStorage)) {
                    localStorage.setItem('theme', 'dark')
                  }
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body
        className={`${fontOutfit.className} bg-stone-50 dark:bg-gray-900 text-stone-900 dark:text-gray-100 transition-colors duration-200`}
      >
        <ThemeProvider>
          <PwaLaunchSplash />
          <div className="grain-overlay"></div>
          <SessionTimeoutWatcher />
          <RecoverySessionRedirect />
          <AuthEmailLinkBridge />
          <PrivacyConsentWidget />
          {children}
          <Toaster 
            position="top-right"
            toastOptions={{
              style: {
                background: '#FFFFFF',
                color: '#292524',
                borderRadius: '1rem',
                padding: '16px',
                boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.1)',
              },
              className: 'dark:!bg-gray-800 dark:!text-gray-100',
            }}
          />
          <Analytics />
          <SpeedInsights />
        </ThemeProvider>
      </body>
    </html>
  )
}
