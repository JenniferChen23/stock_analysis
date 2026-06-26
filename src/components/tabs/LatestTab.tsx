import SummaryBox from '@/components/SummaryBox'
import MetricCard from '@/components/MetricCard'
import ChartCard from '@/components/ChartCard'
import LineChart from '@/components/LineChart'

export default function LatestTab({ data }: { data: any }) {
  const f = data.financials?.[0] ?? {}
  const price = data.price

  const revenueMonths = (data.revenue ?? []).slice(0, 13).reverse()
  const labels = revenueMonths.map((r: any) => `${r.month}月`)
  const revenues = revenueMonths.map((r: any) => Math.round(r.revenue / 1000))

  return (
    <div>
      <SummaryBox
        highlights={[
          `EPS ${f.eps ?? '-'} 元，本季財報表現`,
          `毛利率 ${f.gross_margin ?? '-'}%，${(f.gross_margin ?? 0) > 25 ? '高於市場均值，具護城河優勢' : '接近產業平均'}`,
          `殖利率 ${f.dividend_yield ?? '-'}%，配息穩定`,
        ]}
        warnings={[
          `負債比 ${f.debt_ratio ?? '-'}%，${(f.debt_ratio ?? 0) > 45 ? '偏高，財務槓桿需注意' : '財務結構健全'}`,
          `ROE ${f.roe ?? '-'}%，${(f.roe ?? 0) < 15 ? '低於 15% 基準，賺錢效率待觀察' : '獲利效率良好'}`,
          '數據每季更新，建議搭配即時新聞判斷',
        ]}
      />

      <div className="grid grid-cols-3 gap-2 mb-4">
        <MetricCard label="EPS" value={f.eps ?? '-'} />
        <MetricCard label="ROE" value={f.roe ? `${f.roe}%` : '-'} color="up" />
        <MetricCard label="毛利率" value={f.gross_margin ? `${f.gross_margin}%` : '-'} color="up" />
        <MetricCard label="負債比" value={f.debt_ratio ? `${f.debt_ratio}%` : '-'} color="down" />
        <MetricCard label="現股價" value={price.price.toFixed(2)} />
        <MetricCard label="殖利率" value={f.dividend_yield ? `${f.dividend_yield}%` : '-'} color="up" />
      </div>

      <ChartCard
        title="月營收走勢"
        subtitle="近 13 個月（百萬元）"
        legend={[{ label: '月營收', color: '#378ADD' }]}
      >
        <LineChart
          labels={labels.length ? labels : ['—']}
          datasets={[{ label: '月營收', data: revenues, color: '#378ADD', fill: true }]}
          yUnit="M"
          yMin={0}
        />
      </ChartCard>
    </div>
  )
}
