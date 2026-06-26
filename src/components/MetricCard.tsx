export default function MetricCard({ label, value, color }: {
  label: string
  value: string | number
  color?: 'up' | 'down' | 'neutral'
}) {
  const colorClass = color === 'up' ? 'text-[#D85A30]' : color === 'down' ? 'text-[#1D9E75]' : 'text-gray-900'
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div className={`text-lg font-medium ${colorClass}`}>{value}</div>
    </div>
  )
}
