import '@repo/ui/globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Providers from '~/components/providers'
import { env, getApiBaseUrl } from '~/env'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'CSDR Cloud Spatial App',
  description: 'Data Explorer',
  icons: '/favicon.svg',
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
      <body className={inter.className}>
        <Providers
          appUrl={env.APP_URL ?? ''}
          apiBaseUrl={getApiBaseUrl()}
          dataBaseUrl={env.DATA_BASE_URL}
        >
          {children}
        </Providers>
      </body>
    </html>
  )
}
