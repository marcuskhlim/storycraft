import { DM_Sans } from 'next/font/google'
import ClientLayout from './client-layout'
import './globals.css'

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react'

const dmSans = DM_Sans({ 
  subsets: ['latin'],
  display: 'swap',
})

export const metadata = {
  title: 'VidFreak',
  description: 'Create cinematic AI scenes that tell your brand story',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={dmSans.className}>
      <body>
        <NextAuthSessionProvider>
          <ClientLayout>{children}</ClientLayout>
        </NextAuthSessionProvider>
      </body>
    </html>
  )
}

