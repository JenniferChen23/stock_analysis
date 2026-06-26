import SummaryBox from '@/components/SummaryBox'
import MetricCard from '@/components/MetricCard'

export default function ValuationTab({ data }: { data: any }) {
  const f0 = data.financials?.[0] ?? {}
  const price = data.price?.price ?? 0
  const pe = f0.eps ? parseFloat((price / (f0.eps * 4)).toFixed(1)) : null
  const divYield = f0.dividend_yield

  return (
    <div>
      <SummaryBox
        highlights={[
          `本益比 ${pe ?? '-'} 倍：${pe && pe < 20 ? '低於 20 倍，相對便宜' : pe && pe < 30 ? '20–30 倍，合理偏貴' : '超過 30 倍，需成長支撐'}`,
          `殖利率 ${divYield ?? '-'}%，${(divYield ?? 0) >= 3 ? '高於 3%，配息有吸引力' : '配息偏低，較適合成長型投資人'}`,
          '本益比低於歷史均值，通常代表相對低估',
        ]}
        warnings={[
          '本益比高不一定貴——高成長公司本益比本來就高',
          '用 EPS × 4 估算年化獲利，若為景氣循環股可能高估',
          '價值評估需結合產業趨勢，不能只看單一指標',
        ]}
      />

      <div className="grid grid-cols-3 gap-2 mb-4">
        <MetricCard label="本益比 P/E" value={pe ? `${pe}x` : '-'} />
        <MetricCard label="殖利率" value={divYield ? `${divYield}%` : '-'} color="up" />
        <MetricCard label="現股價" value={price ? price.toFixed(2) : '-'} />
        <MetricCard label="年化 EPS" value={f0.eps ? `${(f0.eps * 4).toFixed(2)}` : '-'} />
      </div>

      <div className="border border-gray-200 rounded-xl p-4 bg-white">
        <div className="text-sm font-medium mb-3">股利紀錄</div>
        {data.dividend?.length ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-100">
                <th className="text-left pb-2 font-normal">年度</th>
                <th className="text-right pb-2 font-normal">現金股利</th>
                <th className="text-right pb-2 font-normal">股票股利</th>
              </tr>
            </thead>
            <tbody>
              {data.dividend.slice(0, 6).map((d: any, i: number) => (
                <tr key={i} className="border-b border-gray-50">
                  <td className="py-2 text-gray-700">{d.year}</td>
                  <td className="py-2 text-right text-[#1D9E75]">{d.cashDividend} 元</td>
                  <td className="py-2 text-right text-gray-400">{d.stockDividend} 元</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-sm text-gray-400">暫無股利資料</div>
        )}
      </div>
    </div>
  )
}
