export default function ChartCard({ title, subtitle, legend, children }: {
  title: string
  subtitle?: string
  legend?: { label: string; color: string; dashed?: boolean }[]
  children: React.ReactNode
}) {
  return (
    <div className="border border-gray-200 rounded-xl p-4 mb-4 bg-white">
      <div className="text-sm font-medium mb-0.5">{title}</div>
      {subtitle && <div className="text-xs text-gray-400 mb-2">{subtitle}</div>}
      {legend && (
        <div className="flex flex-wrap gap-3 mb-3">
          {legend.map(l => (
            <span key={l.label} className="flex items-center gap-1.5 text-xs text-gray-500">
              <span
                className="w-2.5 h-2.5 rounded-sm inline-block"
                style={{ background: l.dashed ? 'transparent' : l.color, border: l.dashed ? `1px dashed ${l.color}` : 'none' }}
              />
              {l.label}
            </span>
          ))}
        </div>
      )}
      {children}
    </div>
  )
}
