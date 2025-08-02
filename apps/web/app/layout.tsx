import '@repo/ui/globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Providers from '~/components/providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Omnigate',
  description: 'Build Faster, Secure Smarter.',
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
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
