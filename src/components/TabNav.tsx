export default function TabNav({ tabs, active, onChange }: {
  tabs: string[]
  active: number
  onChange: (i: number) => void
}) {
  return (
    <div className="flex border-b border-gray-200 overflow-x-auto">
      {tabs.map((tab, i) => (
        <button
          key={tab}
          onClick={() => onChange(i)}
          className={`px-4 py-2.5 text-sm whitespace-nowrap border-b-2 transition-colors ${
            i === active
              ? 'border-blue-500 text-blue-600 font-medium'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          {tab}
        </button>
      ))}
    </div>
  )
}
