'use client'

import { useState, useEffect } from 'react'
import type { StockSummary, ScreenerOptions } from '@/lib/screener'
import { DEFAULT_OPTIONS } from '@/lib/screener'
import { useRouter } from 'next/navigation'

export default function ScreenerModal({ onClose }: { onClose: () => void }) {
  const [opts, setOpts] = useState<ScreenerOptions>(DEFAULT_OPTIONS)
  const [results, setResults] = useState<StockSummary[]>([])
  const [total, setTotal] = useState(0)
  const [updatedAt, setUpdatedAt] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function fetchResults() {
    setLoading(true)
    const params = new URLSearchParams(Object.entries(opts).map(([k, v]) => [k, String(v)]))
    const res = await fetch(`/api/screener?${params}`)
    const data = await res.json()
    setResults(data.results ?? [])
    setTotal(data.total ?? 0)
    setUpdatedAt(data.updatedAt ?? '')
    setLoading(false)
  }

  useEffect(() => { fetchResults() }, [opts])

  function set(key: keyof ScreenerOptions, val: number) {
    setOpts(prev => ({ ...prev, [key]: val }))
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center p-6 overflow-y-auto"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl border border-gray-200 w-full max-w-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-base font-medium">⚡ 績優股篩選</span>
            {updatedAt && (
              <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
                更新：{new Date(updatedAt).toLocaleDateString('zh-TW')}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchResults} className="text-xs text-blue-500 border border-blue-200 rounded px-3 py-1 hover:bg-blue-50">
              立即更新
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
          </div>
        </div>

        <div className="px-5 py-4">
          <div className="bg-gray-50 rounded-lg p-3 mb-4 text-xs text-gray-500 leading-relaxed">
            篩出<strong className="text-gray-700">賺錢效率高、財務安全、仍在成長</strong>的公司。調整條件即時篩選，點代號查看詳細分析。
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              { key: 'roeMin' as const, label: 'ROE 最低', unit: '%', options: [10, 12, 15, 20], hint: '賺錢效率' },
              { key: 'grossMarginMin' as const, label: '毛利率最低', unit: '%', options: [15, 20, 25, 30], hint: '護城河' },
              { key: 'debtRatioMax' as const, label: '負債比最高', unit: '%', options: [40, 50, 60, 70], hint: '財務安全' },
              { key: 'dividendYieldMin' as const, label: '殖利率最低', unit: '%', options: [1.5, 2, 2.5, 3, 4], hint: '配息誠意' },
              { key: 'revenueGrowthMin' as const, label: '營收年增最低', unit: '%', options: [0, 5, 10, 15], hint: '業務成長' },
              { key: 'epsGrowthMin' as const, label: 'EPS 年增最低', unit: '%', options: [-5, 0, 5, 10], hint: '獲利趨勢' },
            ].map(({ key, label, unit, options, hint }) => (
              <div key={key} className="flex flex-col gap-1">
                <label className="text-xs text-gray-500">{label} <span className="text-gray-300">— {hint}</span></label>
                <select
                  value={opts[key]}
                  onChange={e => set(key, parseFloat(e.target.value))}
                  className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-300"
                >
                  {options.map(o => (
                    <option key={o} value={o}>{o}{unit}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="text-xs text-gray-400 mb-2">
            符合條件：<strong className="text-gray-700">{results.length}</strong> 檔（共掃描 {total} 檔）
          </div>

          {loading ? (
            <div className="text-center py-10 text-gray-400 text-sm">篩選中…</div>
          ) : results.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">沒有符合條件的股票，請放寬篩選條件</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-400 border-b border-gray-100">
                    <th className="text-left pb-2 font-normal">代號</th>
                    <th className="text-left pb-2 font-normal">名稱</th>
                    <th className="text-right pb-2 font-normal">ROE</th>
                    <th className="text-right pb-2 font-normal">負債比</th>
                    <th className="text-right pb-2 font-normal">殖利率</th>
                    <th className="text-right pb-2 font-normal">年增率</th>
                    <th className="text-right pb-2 font-normal">股價</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map(s => (
                    <tr
                      key={s.code}
                      className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer"
                      onClick={() => { router.push(`/stock/${s.code}`); onClose() }}
                    >
                      <td className="py-2.5 text-blue-500 font-medium">{s.code}</td>
                      <td className="py-2.5 font-medium">{s.name}</td>
                      <td className="py-2.5 text-right">
                        <span className="bg-orange-50 text-orange-700 text-xs px-2 py-0.5 rounded">{s.roe}%</span>
                      </td>
                      <td className="py-2.5 text-right">
                        <span className="bg-green-50 text-green-700 text-xs px-2 py-0.5 rounded">{s.debtRatio}%</span>
                      </td>
                      <td className="py-2.5 text-right">
                        <span className="bg-orange-50 text-orange-700 text-xs px-2 py-0.5 rounded">{s.dividendYield}%</span>
                      </td>
                      <td className="py-2.5 text-right">
                        <span className={`text-xs px-2 py-0.5 rounded ${s.revenueGrowthYoY >= 0 ? 'bg-orange-50 text-orange-700' : 'bg-green-50 text-green-700'}`}>
                          {s.revenueGrowthYoY >= 0 ? '+' : ''}{s.revenueGrowthYoY}%
                        </span>
                      </td>
                      <td className="py-2.5 text-right font-medium">{s.price}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
