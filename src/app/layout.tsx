import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '台股分析',
  description: '個股財務分析與績優股篩選',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <body className="min-h-screen bg-gray-50">
        <nav className="border-b border-gray-200 bg-white px-6 py-3 flex items-center gap-4">
          <a href="/" className="text-base font-medium text-gray-900">台股分析</a>
          <span className="text-gray-300">|</span>
          <span className="text-sm text-gray-400">數據來源：TWSE 公開資訊觀測站</span>
        </nav>
        <main className="max-w-4xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  )
}
