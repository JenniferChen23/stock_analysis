'use client'

import { Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip } from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip)

interface Props {
  labels: string[]
  datasets: { label: string; data: number[]; color: string | string[] }[]
  yUnit?: string
}

export default function BarChart({ labels, datasets, yUnit = '' }: Props) {
  return (
    <div className="relative w-full h-48">
      <Bar
        data={{
          labels,
          datasets: datasets.map(d => ({
            label: d.label,
            data: d.data,
            backgroundColor: d.color,
          })),
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.y}${yUnit}` } } },
          scales: {
            x: { grid: { color: 'rgba(0,0,0,.06)' }, ticks: { font: { size: 11 } } },
            y: { grid: { color: 'rgba(0,0,0,.06)' }, ticks: { font: { size: 11 }, callback: v => v + yUnit } },
          },
        }}
      />
    </div>
  )
}
