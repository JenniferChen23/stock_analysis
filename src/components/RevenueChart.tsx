'use client'

import { Chart } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  BarElement, LineElement, PointElement, Tooltip, Legend,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend)

interface MonthRev { year: number; month: number; revenue: number; growthYoY: number }

const BAR_COLOR = '#9DBFE6'
const LINE_COLOR = '#D85A30'

// 月營收趨勢圖：柱=當月營收(億元)、線=年增率(%)，雙 Y 軸
export default function RevenueChart({ data }: { data: MonthRev[] }) {
  // 由舊到新
  const sorted = [...data].sort((a, b) => (a.year - b.year) || (a.month - b.month))
  const labels = sorted.map(d => `${String(d.year).slice(2)}/${String(d.month).padStart(2, '0')}`)
  const revenueYi = sorted.map(d => parseFloat((d.revenue / 100000).toFixed(1)))  // 千元→億元
  const yoy = sorted.map(d => d.growthYoY != null ? parseFloat(d.growthYoY.toFixed(1)) : null)

  return (
    <div className="relative w-full h-56">
      <Chart
        type="bar"
        data={{
          labels,
          datasets: [
            {
              type: 'bar' as const,
              label: '當月營收(億元)',
              data: revenueYi,
              backgroundColor: BAR_COLOR,
              yAxisID: 'y',
              order: 2,
            },
            {
              type: 'line' as const,
              label: '年增率(%)',
              data: yoy,
              borderColor: LINE_COLOR,
              backgroundColor: LINE_COLOR,
              borderWidth: 2,
              pointRadius: 2.5,
              yAxisID: 'y1',
              order: 1,
            },
          ],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: ctx => ctx.dataset.type === 'line'
                  ? ` 年增率 ${ctx.parsed.y}%`
                  : ` 營收 ${ctx.parsed.y} 億元`,
              },
            },
          },
          scales: {
            x: { grid: { display: false }, ticks: { font: { size: 10 } } },
            y: {
              position: 'left',
              grid: { color: 'rgba(0,0,0,.06)' },
              ticks: { font: { size: 10 }, callback: v => v + '億' },
            },
            y1: {
              position: 'right',
              grid: { drawOnChartArea: false },
              ticks: { font: { size: 10 }, callback: v => v + '%' },
            },
          },
        }}
      />
    </div>
  )
}
