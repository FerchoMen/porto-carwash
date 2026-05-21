import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Porto Car Wash - Cliente Fiel',
  description: 'Sistema de fidelidad Porto Car Wash, Portoviejo',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={inter.className} style={{ background: '#0a0a0a', minHeight: '100vh' }}>
        <main style={{ maxWidth: '430px', margin: '0 auto', minHeight: '100vh' }}>
          {children}
        </main>
      </body>
    </html>
  )
}
