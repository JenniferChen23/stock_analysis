export interface StockSummary {
  code: string
  name: string
  sector: string
  price: number
  roe: number
  grossMargin: number
  debtRatio: number
  currentRatio: number
  dividendYield: number
  revenueGrowthYoY: number
  epsGrowthYoY: number
  eps: number
  pe: number
  updatedAt: string
}

export interface ScreenerOptions {
  roeMin: number          // ROE 最低 %，預設 15
  grossMarginMin: number  // 毛利率最低 %，預設 20
  debtRatioMax: number    // 負債比最高 %，預設 50
  currentRatioMin: number // 流動比率最低 %，預設 150
  dividendYieldMin: number// 殖利率最低 %，預設 2.5
  revenueGrowthMin: number// 營收年增最低 %，預設 5
  epsGrowthMin: number    // EPS 年增最低 %，預設 0
}

export const DEFAULT_OPTIONS: ScreenerOptions = {
  roeMin: 15,
  grossMarginMin: 20,
  debtRatioMax: 50,
  currentRatioMin: 150,
  dividendYieldMin: 2.5,
  revenueGrowthMin: 5,
  epsGrowthMin: 0,
}

// 核心篩選公式（之後可以直接改這裡）
export function screenStock(s: StockSummary, opts: ScreenerOptions = DEFAULT_OPTIONS): boolean {
  return (
    s.eps > 0 &&                          // 不能虧損
    s.roe >= opts.roeMin &&               // 賺錢效率
    s.grossMargin >= opts.grossMarginMin &&// 護城河
    s.debtRatio <= opts.debtRatioMax &&   // 財務安全
    s.currentRatio >= opts.currentRatioMin &&// 短期流動性
    s.dividendYield >= opts.dividendYieldMin &&// 配息誠意
    s.revenueGrowthYoY >= opts.revenueGrowthMin &&// 仍在成長
    s.epsGrowthYoY >= opts.epsGrowthMin   // 獲利不衰退
  )
}

export function runScreener(stocks: StockSummary[], opts: ScreenerOptions = DEFAULT_OPTIONS): StockSummary[] {
  return stocks
    .filter(s => screenStock(s, opts))
    .sort((a, b) => b.roe - a.roe)
}
