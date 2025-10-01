import '@repo/ui/globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Providers from '~/components/providers'
import { env } from '~/env'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'CSDR Cloud Spatial App',
  description: 'Data Explorer',
  icons: '/favicon.svg',
}

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
          apiBaseUrl={
            env.DEV_USE_INTERNAL_BACKEND_URL_IN_FRONTEND &&
            env.INTERNAL_BACKEND_URL
              ? env.INTERNAL_BACKEND_URL
              : env.APP_URL
          }
        >
          {children}
        </Providers>
      </body>
    </html>
  )
}
