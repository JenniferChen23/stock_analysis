export interface StockSummary {
  code: string
  name: string
  sector?: string
  price?: number
  eps?: number
  roe?: number
  roa?: number
  gross_margin?: number
  debt_ratio?: number
  current_ratio?: number
  dividend_yield?: number
  revenue_growth_yoy?: number
  eps_growth_yoy?: number
  pe?: number
  updated_at?: string
}

export interface ScreenerOptions {
  roeMin: number
  grossMarginMin: number
  debtRatioMax: number
  currentRatioMin: number
  dividendYieldMin: number
  revenueGrowthMin: number
  epsGrowthMin: number
}

export const DEFAULT_OPTIONS: ScreenerOptions = {
  roeMin: 15,
  grossMarginMin: 20,
  debtRatioMax: 50,
  currentRatioMin: 150,
  dividendYieldMin: 0,       // 暫設 0，因無殖利率資料
  revenueGrowthMin: 0,       // 暫設 0，因無年增資料
  epsGrowthMin: 0,
}

function passes(value: number | null | undefined, min: number): boolean {
  if (value == null) return true   // 缺資料→不過濾
  return value >= min
}
function passesMax(value: number | null | undefined, max: number): boolean {
  if (value == null) return true
  return value <= max
}

export function screenStock(s: StockSummary, opts: ScreenerOptions = DEFAULT_OPTIONS): boolean {
  return (
    (s.eps == null || s.eps > 0) &&
    passes(s.roe, opts.roeMin) &&
    passes(s.gross_margin, opts.grossMarginMin) &&
    passesMax(s.debt_ratio, opts.debtRatioMax) &&
    passes(s.current_ratio, opts.currentRatioMin) &&
    passes(s.dividend_yield, opts.dividendYieldMin) &&
    passes(s.revenue_growth_yoy, opts.revenueGrowthMin) &&
    passes(s.eps_growth_yoy, opts.epsGrowthMin)
  )
}

export function runScreener(stocks: StockSummary[], opts: ScreenerOptions = DEFAULT_OPTIONS): StockSummary[] {
  return stocks
    .filter(s => screenStock(s, opts))
    .sort((a, b) => (b.roe ?? 0) - (a.roe ?? 0))
}
