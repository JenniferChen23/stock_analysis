'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import ScreenerModal from '@/components/ScreenerModal'

export default function Home() {
  const [query, setQuery] = useState('')
  const [showScreener, setShowScreener] = useState(false)
  const router = useRouter()

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const code = query.trim().split(/\s+/)[0]
    if (code) router.push(`/stock/${code}`)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
      <div className="text-center">
        <h1 className="text-3xl font-medium text-gray-900 mb-2">台股財務分析</h1>
        <p className="text-gray-500 text-sm">輸入股票代號查看財務報表、獲利能力、安全性與成長力分析</p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2 w-full max-w-md">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="輸入股票代號，如 2330、2308…"
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400"
        />
        <button
          type="submit"
          className="bg-blue-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-600"
        >
          查詢
        </button>
      </form>

      <button
        onClick={() => setShowScreener(true)}
        className="flex items-center gap-2 border border-gray-300 rounded-lg px-5 py-2.5 text-sm text-gray-700 hover:bg-gray-100"
      >
        ⚡ 績優股篩選
      </button>

      <div className="flex gap-4 text-sm text-gray-400">
        {['2330 台積電', '2308 台達電', '2454 聯發科', '2382 廣達'].map(s => (
          <button
            key={s}
            onClick={() => router.push(`/stock/${s.split(' ')[0]}`)}
            className="hover:text-blue-500"
          >
            {s}
          </button>
        ))}
      </div>

      {showScreener && <ScreenerModal onClose={() => setShowScreener(false)} />}
    </div>
  )
}
