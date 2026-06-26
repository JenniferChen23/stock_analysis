const TWSE_BASE = 'https://www.twse.com.tw/exchangeReport'
const MOPS_BASE = 'https://mops.twse.com.tw/mops/web'

export interface StockPrice {
  code: string
  name: string
  price: number
  change: number
  changePercent: number
  volume: number
  date: string
}

export interface FinancialData {
  code: string
  year: number
  quarter: number
  revenue: number        // 營業收入（千元）
  grossProfit: number    // 毛利（千元）
  operatingIncome: number// 營業利益（千元）
  netIncome: number      // 淨利（千元）
  eps: number            // EPS
  grossMargin: number    // 毛利率 %
  operatingMargin: number// 營益率 %
  netMargin: number      // 淨利率 %
  roe: number            // ROE %
  roa: number            // ROA %
  debtRatio: number      // 負債比 %
  currentRatio: number   // 流動比率 %
  dividendYield: number  // 殖利率 %
  revenueGrowthYoY: number // 營收年增率 %
  epsGrowthYoY: number     // EPS 年增率 %
}

// 取得即時股價（TWSE 即時行情）
export async function fetchStockPrice(code: string): Promise<StockPrice | null> {
  try {
    const url = `https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=tse_${code}.tw&json=1&delay=0`
    const res = await fetch(url, { next: { revalidate: 60 } })
    const data = await res.json()
    if (!data.msgArray?.length) return null

    const d = data.msgArray[0]
    const price = parseFloat(d.z) || parseFloat(d.y)
    const prev = parseFloat(d.y)
    const change = parseFloat(d.z) ? price - prev : 0

    return {
      code,
      name: d.n,
      price,
      change: parseFloat(change.toFixed(2)),
      changePercent: parseFloat(((change / prev) * 100).toFixed(2)),
      volume: parseInt(d.v) || 0,
      date: d.d,
    }
  } catch {
    return null
  }
}

// 取得月營收（TWSE OpenAPI）
export async function fetchMonthlyRevenue(code: string): Promise<{ year: number; month: number; revenue: number; growthYoY: number }[]> {
  try {
    const url = `https://www.twse.com.tw/exchangeReport/TAISHIN?response=json&stockNo=${code}`
    const res = await fetch(url, { next: { revalidate: 86400 } })
    const data = await res.json()
    if (!data.data) return []

    return data.data.slice(0, 12).map((row: string[]) => ({
      year: parseInt(row[0].split('/')[0]) + 1911,
      month: parseInt(row[0].split('/')[1]),
      revenue: parseInt(row[2].replace(/,/g, '')) || 0,
      growthYoY: parseFloat(row[5]?.replace('%', '')) || 0,
    }))
  } catch {
    return []
  }
}

// 取得股利資料（TWSE）
export async function fetchDividend(code: string): Promise<{ year: number; cashDividend: number; stockDividend: number }[]> {
  try {
    const url = `https://www.twse.com.tw/exchangeReport/BWIBBU_d?response=json&stockNo=${code}&showAll=0`
    const res = await fetch(url, { next: { revalidate: 86400 } })
    const data = await res.json()
    if (!data.data) return []

    return data.data.slice(0, 8).map((row: string[]) => ({
      year: parseInt(row[0]),
      cashDividend: parseFloat(row[2]) || 0,
      stockDividend: parseFloat(row[3]) || 0,
    }))
  } catch {
    return []
  }
}

// 計算近 N 季平均 EPS 成長率
export function calcEpsGrowthCagr(financials: FinancialData[], years = 3): number {
  if (financials.length < years * 4) return 0
  const latest = financials.slice(0, 4).reduce((s, f) => s + f.eps, 0)
  const base = financials.slice(years * 4 - 4, years * 4).reduce((s, f) => s + f.eps, 0)
  if (base <= 0) return 0
  return parseFloat((((latest / base) ** (1 / years) - 1) * 100).toFixed(1))
}
