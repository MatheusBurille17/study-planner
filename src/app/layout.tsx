import type { Metadata, Viewport } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import './globals.css'
import { ToastProvider } from '@/shared/components/ui/toast'
import { AuthProvider } from '@/features/auth/presentation/components/AuthProvider'
import { QueryProvider } from '@/shared/config/queryClient'
import { ServiceWorkerInitializer } from '@/features/notifications/presentation/components/ServiceWorkerInitializer'
import { VersionGuard } from '@/shared/components/VersionGuard'
import { APP_NAME, APP_SHORT_NAME } from '@/shared/constants/config'

/*
 * Fontes servidas pelo próprio domínio (next/font) em vez de um @import do
 * Google Fonts no CSS: elimina uma conexão externa que bloqueava a primeira
 * pintura e evita mudança de layout quando a fonte termina de carregar.
 */
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-serif',
  style: ['normal', 'italic'],
})

export const metadata: Metadata = {
  title: {
    default: APP_NAME,
    template: `%s · ${APP_SHORT_NAME}`,
  },
  description: 'Organize tarefas, provas e trabalhos da sua vida acadêmica em um só lugar.',
  applicationName: APP_NAME,
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: APP_SHORT_NAME,
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/favicon.ico', sizes: '32x32', type: 'image/x-icon' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'mobile-web-app-status-bar-style': 'black-translucent',
    'msapplication-TileColor': '#7c3aed',
    'msapplication-TileImage': '/icons/icon-192x192.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: '#7c3aed',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${playfair.variable}`}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <meta name="theme-color" content="#7c3aed" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Study Planner" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body>
        <QueryProvider>
          <ToastProvider>
            <AuthProvider>
              <ServiceWorkerInitializer />
              {children}
            </AuthProvider>
          </ToastProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
