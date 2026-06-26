import SummaryBox from '@/components/SummaryBox'
import MetricCard from '@/components/MetricCard'
import ChartCard from '@/components/ChartCard'
import BarChart from '@/components/BarChart'

export default function GrowthTab({ data }: { data: any }) {
  const revenue = (data.revenue ?? []).slice(0, 12).reverse()
  const labels = revenue.map((r: any) => `${r.month}月`)
  const growthData = revenue.map((r: any) => parseFloat(r.growthYoY?.toFixed(1) ?? 0))
  const colors = growthData.map((v: number) => v >= 0 ? '#1D9E75' : '#D85A30')

  const avgGrowth = growthData.length
    ? parseFloat((growthData.reduce((a: number, b: number) => a + b, 0) / growthData.length).toFixed(1))
    : 0

  return (
    <div>
      <SummaryBox
        highlights={[
          `近 12 個月平均年增率 ${avgGrowth}%，${avgGrowth >= 10 ? '成長動能強勁' : avgGrowth >= 0 ? '溫和正成長' : '近期衰退中'}`,
          '綠色代表年增正成長，公司業務仍在擴張',
          '連續多月正成長代表訂單能見度高、需求穩定',
        ]}
        warnings={[
          '月營收有季節性波動，單月衰退不代表趨勢反轉',
          '年增率需搭配絕對值判斷，基期低容易出現高增率',
          '若連續 3 個月以上年增率為負，需注意需求轉弱',
        ]}
      />

      <div className="grid grid-cols-2 gap-2 mb-4">
        <MetricCard label="近期平均年增率" value={`${avgGrowth}%`} color={avgGrowth >= 0 ? 'up' : 'down'} />
        <MetricCard label="正成長月數" value={`${growthData.filter((v: number) => v >= 0).length} / ${growthData.length}`} />
      </div>

      <ChartCard
        title="月營收年增率"
        subtitle="近 12 個月同比（%）"
        legend={[
          { label: '正成長', color: '#1D9E75' },
          { label: '負成長', color: '#D85A30' },
        ]}
      >
        <BarChart
          labels={labels.length ? labels : ['—']}
          datasets={[{ label: '年增率', data: growthData, color: colors }]}
          yUnit="%"
        />
      </ChartCard>
    </div>
  )
}
