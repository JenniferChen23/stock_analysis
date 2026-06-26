import SummaryBox from '@/components/SummaryBox'
import MetricCard from '@/components/MetricCard'
import ChartCard from '@/components/ChartCard'
import LineChart from '@/components/LineChart'

export default function SafetyTab({ data }: { data: any }) {
  const fins = (data.financials ?? []).slice(0, 8).reverse()
  const labels = fins.map((f: any) => `${f.year}Q${f.quarter}`)
  const f0 = data.financials?.[0] ?? {}
  const debtSafe = (f0.debt_ratio ?? 100) <= 50

  return (
    <div>
      <SummaryBox
        highlights={[
          `流動比率 ${f0.current_ratio ?? '-'}%：${(f0.current_ratio ?? 0) >= 150 ? '短期償債能力充裕，財務無虞' : '需注意短期流動性'}`,
          `負債比 ${f0.debt_ratio ?? '-'}%，${debtSafe ? '低於警戒線 50%，財務結構健全' : '已超過 50% 警戒線，需追蹤'}`,
          '利息保障倍數高代表借款壓力小，還息輕鬆',
        ]}
        warnings={[
          '負債比近幾季若持續上升，可能是擴廠或借款增加',
          '金融股負債比天生偏高，此指標不適用金融業',
          '流動比率低於 100% 代表短期資產不夠還短期債',
        ]}
      />

      <div className="grid grid-cols-3 gap-2 mb-4">
        <MetricCard label="流動比率" value={f0.current_ratio ? `${f0.current_ratio}%` : '-'} color="up" />
        <MetricCard label="負債比率" value={f0.debt_ratio ? `${f0.debt_ratio}%` : '-'} color={debtSafe ? 'down' : 'up'} />
      </div>

      <ChartCard
        title="負債比率走勢"
        subtitle="近 8 季（%），虛線為 50% 警戒線"
        legend={[
          { label: '負債比', color: '#D85A30' },
          { label: '警戒線 50%', color: '#aaa', dashed: true },
        ]}
      >
        <LineChart
          labels={labels.length ? labels : ['—']}
          datasets={[
            { label: '負債比', data: fins.map((f: any) => f.debt_ratio ?? 0), color: '#D85A30', fill: true },
            { label: '警戒線', data: fins.map(() => 50), color: '#ccc' },
          ]}
          yUnit="%"
          yMin={0}
        />
      </ChartCard>
    </div>
  )
}
