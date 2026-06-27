import SummaryBox from '@/components/SummaryBox'
import MetricCard from '@/components/MetricCard'
import ChartCard from '@/components/ChartCard'
import RevenueChart from '@/components/RevenueChart'

export default function GrowthTab({ data }: { data: any }) {
  // data.revenue 由 API 給（由新到舊），取近 12 個月
  const revenue = (data.revenue ?? []).slice(0, 12)
  const hasData = revenue.length > 0

  const yoys = revenue.map((r: any) => r.growthYoY).filter((v: any) => v != null)
  const avgGrowth = yoys.length
    ? parseFloat((yoys.reduce((a: number, b: number) => a + b, 0) / yoys.length).toFixed(1))
    : null
  const latest = revenue[0]
  const positiveMonths = yoys.filter((v: number) => v >= 0).length

  return (
    <div>
      <SummaryBox
        highlights={[
          latest
            ? `最新 ${latest.month} 月營收 ${(latest.revenue / 100000).toFixed(1)} 億元，年增 ${latest.growthYoY ?? '-'}%`
            : '月營收資料準備中',
          avgGrowth != null
            ? `近 ${yoys.length} 個月平均年增 ${avgGrowth}%，${avgGrowth >= 10 ? '成長動能強勁' : avgGrowth >= 0 ? '溫和正成長' : '近期衰退中'}`
            : '—',
          '連續多月正成長代表訂單能見度高、需求穩定',
        ]}
        warnings={[
          '月營收有季節性，單月波動不代表趨勢反轉',
          '年增率需搭配絕對值判斷，基期低容易出現高增率',
          '若連續 3 個月以上年增率為負，需注意需求轉弱',
        ]}
      />

      <div className="grid grid-cols-3 gap-2 mb-4">
        <MetricCard
          label="最新月營收"
          value={latest ? `${(latest.revenue / 100000).toFixed(1)}億` : '-'}
        />
        <MetricCard
          label="最新年增率"
          value={latest?.growthYoY != null ? `${latest.growthYoY}%` : '-'}
          color={(latest?.growthYoY ?? 0) >= 0 ? 'up' : 'down'}
        />
        <MetricCard
          label="近期正成長月數"
          value={hasData ? `${positiveMonths} / ${yoys.length}` : '-'}
        />
      </div>

      <ChartCard
        title="月營收趨勢"
        subtitle="當月營收（柱，億元）與年增率（線，%），近 12 個月"
        legend={[
          { label: '當月營收', color: '#9DBFE6' },
          { label: '年增率', color: '#D85A30' },
        ]}
      >
        {hasData ? (
          <RevenueChart data={revenue} />
        ) : (
          <div className="text-center py-10 text-gray-400 text-sm">
            月營收資料準備中（需建立 monthly_revenue 表並執行 fetch-revenue.mjs）
          </div>
        )}
      </ChartCard>
    </div>
  )
}
