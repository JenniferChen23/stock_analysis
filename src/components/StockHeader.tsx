import type { StockPrice } from '@/lib/twse'

export default function StockHeader({ price }: { price: StockPrice }) {
  const isUp = price.change >= 0
  return (
    <div className="mb-4">
      <div className="text-xs text-gray-400 mb-1">{price.code} {price.name}</div>
      <div className="flex items-baseline gap-3 flex-wrap">
        <span className="text-3xl font-medium">{price.price.toFixed(2)}</span>
        <span className={`text-base ${isUp ? 'text-[#D85A30]' : 'text-[#1D9E75]'}`}>
          {isUp ? '▲' : '▼'} {Math.abs(price.change).toFixed(2)} ({isUp ? '+' : ''}{price.changePercent.toFixed(2)}%)
        </span>
        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">{price.date}</span>
      </div>
    </div>
  )
}
