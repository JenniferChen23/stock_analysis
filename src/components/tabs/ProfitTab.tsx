import SummaryBox from '@/components/SummaryBox'
import MetricCard from '@/components/MetricCard'
import ChartCard from '@/components/ChartCard'
import LineChart from '@/components/LineChart'

export default function ProfitTab({ data }: { data: any }) {
  const fins = (data.financials ?? []).slice(0, 8).reverse()
  const labels = fins.map((f: any) => `${f.year}Q${f.quarter}`)
  const f0 = data.financials?.[0] ?? {}

  return (
    <div>
      <SummaryBox
        highlights={[
          `毛利率 ${f0.gross_margin ?? '-'}%，${(f0.gross_margin ?? 0) >= 25 ? '高於 25%，具定價能力與護城河' : '接近產業水準'}`,
          `ROE ${f0.roe ?? '-'}%：每 100 元股東權益創造 ${f0.roe ?? '-'} 元獲利`,
          '三率同步上升代表公司獲利品質改善中',
        ]}
        warnings={[
          '毛利率若連續下滑，代表競爭加劇或成本上升',
          `ROA ${f0.roa ?? '-'}%，資產利用效率可持續追蹤`,
          '淨利率受業外收支影響，需搭配本業獲利判斷',
        ]}
      />

      <div className="grid grid-cols-3 gap-2 mb-4">
        <MetricCard label="毛利率" value={f0.gross_margin ? `${f0.gross_margin}%` : '-'} color="up" />
        <MetricCard label="營業利益率" value={f0.operating_margin ? `${f0.operating_margin}%` : '-'} color="up" />
        <MetricCard label="淨利率" value={f0.net_margin ? `${f0.net_margin}%` : '-'} color="up" />
        <MetricCard label="ROE" value={f0.roe ? `${f0.roe}%` : '-'} color="up" />
        <MetricCard label="ROA" value={f0.roa ? `${f0.roa}%` : '-'} color="up" />
      </div>

      <ChartCard
        title="三率趨勢"
        subtitle="毛利率 / 營業利益率 / 淨利率（%），近 8 季"
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
