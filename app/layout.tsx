import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'UI/UX New Project',
  description: 'Builder.io dev-tools project',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}


