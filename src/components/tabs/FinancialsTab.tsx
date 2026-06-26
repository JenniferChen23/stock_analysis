import SummaryBox from '@/components/SummaryBox'
import ChartCard from '@/components/ChartCard'
import BarChart from '@/components/BarChart'
import LineChart from '@/components/LineChart'

export default function FinancialsTab({ data }: { data: any }) {
  const fins = (data.financials ?? []).slice(0, 8).reverse()
  const labels = fins.map((f: any) => `${f.year}Q${f.quarter}`)
  const revenues = fins.map((f: any) => Math.round((f.revenue ?? 0) / 100000))
  const grossProfits = fins.map((f: any) => Math.round((f.gross_profit ?? 0) / 100000))
  const eps = fins.map((f: any) => f.eps ?? 0)

  return (
    <div>
      <SummaryBox
        highlights={[
          '近 8 季營收趨勢，可觀察是否持續創高',
          'EPS 走勢代表每股盈餘，穩定向上為佳',
          '毛利與營收同步成長，代表擴張品質良好',
        ]}
        warnings={[
          '若營收增但毛利不增，要注意成本壓力上升',
          '單季 EPS 下滑不一定是問題，需看全年趨勢',
          '財報數據為季度資料，每季公告後更新',
        ]}
      />

      <ChartCard
        title="季度營收與毛利"
        subtitle="近 8 季（億元）"
        legend={[{ label: '營收', color: '#378ADD' }, { label: '毛利', color: '#1D9E75' }]}
      >
        <BarChart
          labels={labels.length ? labels : ['—']}
          datasets={[
            { label: '營收', data: revenues, color: '#378ADD' },
            { label: '毛利', data: grossProfits, color: '#1D9E75' },
          ]}
          yUnit="億"
        />
      </ChartCard>

      <ChartCard
        title="EPS 每股盈餘"
        subtitle="近 8 季（元）"
        legend={[{ label: 'EPS', color: '#534AB7' }]}
      >
        <LineChart
          labels={labels.length ? labels : ['—']}
          datasets={[{ label: 'EPS', data: eps, color: '#534AB7', fill: true }]}
          yUnit="元"
        />
      </ChartCard>
    </div>
  )
}
