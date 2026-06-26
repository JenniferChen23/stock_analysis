'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import StockHeader from '@/components/StockHeader'
import TabNav from '@/components/TabNav'
import LatestTab from '@/components/tabs/LatestTab'
import FinancialsTab from '@/components/tabs/FinancialsTab'
import ProfitTab from '@/components/tabs/ProfitTab'
import SafetyTab from '@/components/tabs/SafetyTab'
import GrowthTab from '@/components/tabs/GrowthTab'
import ValuationTab from '@/components/tabs/ValuationTab'
import ScreenerModal from '@/components/ScreenerModal'

const TABS = ['最新動態', '財務報表', '獲利能力', '安全性分析', '成長力分析', '價值評估']

export default function StockPage() {
  const { code } = useParams<{ code: string }>()
  const [activeTab, setActiveTab] = useState(0)
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showScreener, setShowScreener] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/stock/${code}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [code])

  if (loading) return <div className="text-center py-20 text-gray-400">載入中…</div>
  if (!data?.price) return (
    <div className="text-center py-20">
      <p className="text-gray-500 mb-4">找不到股票代號 {code}</p>
      <Link href="/" className="text-blue-500 text-sm">← 回首頁</Link>
    </div>
  )

  const tabComponents = [
    <LatestTab key="latest" data={data} />,
    <FinancialsTab key="fin" data={data} />,
    <ProfitTab key="profit" data={data} />,
    <SafetyTab key="safety" data={data} />,
    <GrowthTab key="growth" data={data} />,
    <ValuationTab key="val" data={data} />,
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Link href="/" className="text-sm text-gray-400 hover:text-gray-600">← 回首頁</Link>
        <button
          onClick={() => setShowScreener(true)}
          className="flex items-center gap-1.5 border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
        >
          ⚡ 績優篩選
        </button>
      </div>

      <StockHeader price={data.price} />
      <TabNav tabs={TABS} active={activeTab} onChange={setActiveTab} />
      <div className="mt-4">{tabComponents[activeTab]}</div>

      {showScreener && <ScreenerModal onClose={() => setShowScreener(false)} />}
    </div>
  )
}
