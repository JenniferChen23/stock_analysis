export default function SummaryBox({ highlights, warnings }: {
  highlights: string[]
  warnings: string[]
}) {
  return (
    <div className="border border-gray-200 rounded-xl p-4 mb-4 bg-white">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-blue-400 text-base">✦</span>
        <span className="text-sm font-medium">AI 摘要</span>
      </div>
      <div className="flex gap-6 flex-wrap">
        <div className="flex-1 min-w-[170px]">
          <div className="text-xs text-gray-400 uppercase tracking-wide mb-2">亮點</div>
          {highlights.map((h, i) => (
            <div key={i} className="flex gap-2 text-sm text-gray-700 py-0.5">
              <span className="text-[#1D9E75] mt-0.5 flex-shrink-0">●</span>{h}
            </div>
          ))}
        </div>
        <div className="flex-1 min-w-[170px]">
          <div className="text-xs text-gray-400 uppercase tracking-wide mb-2">注意</div>
          {warnings.map((w, i) => (
            <div key={i} className="flex gap-2 text-sm text-gray-700 py-0.5">
              <span className="text-[#D85A30] mt-0.5 flex-shrink-0">●</span>{w}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
