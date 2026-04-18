import '@repo/ui/globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Providers from '~/components/providers'
import { env, getApiBaseUrl } from '~/env'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Spatial Data Framework',
  description: 'Spatial Data Framework',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
  },
}

// Note: Need to be force-dynamic to get the correct env variables at runtime
export const dynamic = 'force-dynamic'

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen`}>
        <Providers
          appUrl={env.APP_URL ?? ''}
          apiBaseUrl={getApiBaseUrl()}
          mapStyleUrl={env.MAP_STYLE_URL}
        >
          {children}
        </Providers>
      </body>
    </html>
  )
}
