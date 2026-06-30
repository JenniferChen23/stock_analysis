'use client'

import { useState } from 'react'
import LineChart from '@/components/LineChart'
import { buildReturnSeries, type QuarterRow, type ReturnMode } from '@/lib/returns'

const MODES: { key: ReturnMode; label: string }[] = [
  { key: 'single', label: '單季' },
  { key: 'ttm', label: '近4季' },
  { key: 'annual', label: '年度' },
]

const ROE_COLOR = '#D85A30'
const ROA_COLOR = '#1D9E75'

export default function ReturnChart({ rows, name, code }: { rows: QuarterRow[]; name?: string; code?: string }) {
  const [mode, setMode] = useState<ReturnMode>('single')
  const series = buildReturnSeries(rows, mode)
  // 圖表只顯示近 12 個點，表格由新到舊顯示
  const shown = series.slice(-12)
  const labels = shown.map(p => p.label)

  const hint = {
    single: '單季 ROE/ROA：當季獲利 ÷ 當季權益（未年化）',
    ttm: '近4季 ROE/ROA：近4季淨利加總 ÷ 最新股東權益（年化真實報酬率，同財報狗）',
    annual: '年度 ROE/ROA：全年度淨利加總 ÷ 年末股東權益',
  }[mode]

  return (
    <div className="border border-gray-200 rounded-xl p-4 mb-4 bg-white">
      <div className="flex items-center justify-between mb-0.5">
        <div className="text-sm font-medium">
          {name ?? ''}{code ? `(${code})` : ''} 報酬率（ROE/ROA）
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          {MODES.map(m => (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              className={`text-xs px-3 py-1 rounded-md transition ${
                mode === m.key ? 'bg-white shadow-sm text-gray-800 font-medium' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>
      <div className="text-xs text-gray-400 mb-3">{hint}</div>

      <div className="flex flex-wrap gap-3 mb-3">
        <span className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: ROE_COLOR }} />ROE
        </span>
        <span className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: ROA_COLOR }} />ROA
        </span>
      </div>

      {shown.length === 0 ? (
        <div className="text-center py-10 text-gray-400 text-sm">資料不足</div>
      ) : (
        <>
          <LineChart
            labels={labels}
            datasets={[
              { label: 'ROE', data: shown.map(p => p.roe ?? 0), color: ROE_COLOR },
              { label: 'ROA', data: shown.map(p => p.roa ?? 0), color: ROA_COLOR },
            ]}
            yUnit="%"
          />

          <div className="mt-4 overflow-x-auto max-h-64 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="text-xs text-gray-400 border-b border-gray-100">
                  <th className="text-left py-2 font-normal">{mode === 'annual' ? '年度' : '年度/季別'}</th>
                  <th className="text-right py-2 font-normal">ROE %</th>
                  <th className="text-right py-2 font-normal">ROA %</th>
                </tr>
              </thead>
              <tbody>
                {[...series].reverse().map(p => (
                  <tr key={p.label} className="border-b border-gray-50">
                    <td className="py-2">{p.label}</td>
                    <td className="py-2 text-right tabular-nums" style={{ color: ROE_COLOR }}>
                      {p.roe != null ? p.roe.toFixed(2) : '--'}
                    </td>
                    <td className="py-2 text-right tabular-nums" style={{ color: ROA_COLOR }}>
                      {p.roa != null ? p.roa.toFixed(2) : '--'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
