import SummaryBox from '@/components/SummaryBox'
import MetricCard from '@/components/MetricCard'
import ChartCard from '@/components/ChartCard'
import LineChart from '@/components/LineChart'
import ReturnChart from '@/components/ReturnChart'
import { latestReturn } from '@/lib/returns'

export default function ProfitTab({ data }: { data: any }) {
  const all = data.financials ?? []
  const fins = all.slice(0, 8).reverse()
  const labels = fins.map((f: any) => `${f.year}Q${f.quarter}`)
  const f0 = all[0] ?? {}
  const name = data.price?.name

  // 近4季(TTM) ROE/ROA 作為主要顯示口徑
  const ttm = latestReturn(all, 'ttm')
  const roeDisplay = ttm.roe ?? f0.roe ?? null
  const roaDisplay = ttm.roa ?? f0.roa ?? null

  return (
    <div>
      <SummaryBox
        highlights={[
          `毛利率 ${f0.gross_margin ?? '-'}%，${(f0.gross_margin ?? 0) >= 25 ? '高於 25%，具定價能力與護城河' : '接近產業水準'}`,
          roeDisplay != null
            ? `近4季 ROE ${roeDisplay}%：每 100 元股東權益創造 ${roeDisplay} 元獲利`
            : 'ROE 資料累積中',
          '三率同步上升代表公司獲利品質改善中',
        ]}
        warnings={[
          '毛利率若連續下滑，代表競爭加劇或成本上升',
          roaDisplay != null ? `近4季 ROA ${roaDisplay}%，資產利用效率可持續追蹤` : 'ROA 資料累積中',
          '淨利率受業外收支影響，需搭配本業獲利判斷',
        ]}
      />

      <div className="grid grid-cols-3 gap-2 mb-4">
        <MetricCard label="毛利率" value={f0.gross_margin ? `${f0.gross_margin}%` : '-'} color="up" />
        <MetricCard label="營業利益率" value={f0.operating_margin ? `${f0.operating_margin}%` : '-'} color="up" />
        <MetricCard label="淨利率" value={f0.net_margin ? `${f0.net_margin}%` : '-'} color="up" />
        <MetricCard label="ROE（近4季）" value={roeDisplay != null ? `${roeDisplay}%` : '-'} color="up" />
        <MetricCard label="ROA（近4季）" value={roaDisplay != null ? `${roaDisplay}%` : '-'} color="up" />
      </div>

      <ReturnChart rows={all} name={name} code={data.price?.code} />

      <ChartCard
        title="三率趨勢"
        subtitle="毛利率 / 營業利益率 / 淨利率（%），單季近 8 季"
        legend={[
          { label: '毛利率', color: '#378ADD' },
          { label: '營益率', color: '#1D9E75' },
          { label: '淨利率', color: '#D85A30' },
        ]}
      >
        <LineChart
          labels={labels.length ? labels : ['—']}
          datasets={[
            { label: '毛利率', data: fins.map((f: any) => f.gross_margin ?? 0), color: '#378ADD' },
            { label: '營益率', data: fins.map((f: any) => f.operating_margin ?? 0), color: '#1D9E75' },
            { label: '淨利率', data: fins.map((f: any) => f.net_margin ?? 0), color: '#D85A30' },
          ]}
          yUnit="%"
        />
      </ChartCard>
    </div>
  )
}
