'use client'

import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, Filler, Tooltip,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip)

interface Props {
  labels: string[]
  datasets: { label: string; data: number[]; color: string; fill?: boolean }[]
  yUnit?: string
  yMin?: number
}

export default function LineChart({ labels, datasets, yUnit = '', yMin }: Props) {
  return (
    <div className="relative w-full h-48">
      <Line
        data={{
          labels,
          datasets: datasets.map(d => ({
            label: d.label,
            data: d.data,
            borderColor: d.color,
            borderWidth: 2,
            pointRadius: 3,
            pointBackgroundColor: d.color,
            fill: d.fill ? true : false,
            backgroundColor: d.fill ? d.color + '12' : undefined,
          })),
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.y}${yUnit}` } } },
          scales: {
            x: { grid: { color: 'rgba(0,0,0,.06)' }, ticks: { font: { size: 11 } } },
            y: { grid: { color: 'rgba(0,0,0,.06)' }, min: yMin, ticks: { font: { size: 11 }, callback: v => v + yUnit } },
          },
        }}
      />
    </div>
  )
}
