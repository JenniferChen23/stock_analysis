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

// 取得月營收（MOPS）
export async function fetchMonthlyRevenue(code: string): Promise<{ year: number; month: number; revenue: number; growthYoY: number }[]> {
  try {
    const now = new Date()
    const rocYear = now.getFullYear() - 1911

    const body = new URLSearchParams({
      encodeURIComponent: '1',
      step: '1',
      firstin: '1',
      TYPEK: 'sii',
      co_id: code,
      year: String(rocYear),
    })

    const res = await fetch('https://mops.twse.com.tw/mops/web/ajax_t05st10_q1', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'https://mops.twse.com.tw/',
      },
      body: body.toString(),
      cache: 'no-store',
    })

    const html = await res.text()
    const rows = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)]
    const results: { year: number; month: number; revenue: number; growthYoY: number }[] = []

    for (const row of rows) {
      const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)]
        .map(c => c[1].replace(/<[^>]+>/g, '').replace(/,/g, '').trim())
      if (cells.length >= 6 && /^\d+$/.test(cells[0]) && /^\d+$/.test(cells[1])) {
        results.push({
          year: parseInt(cells[0]) + 1911,
          month: parseInt(cells[1]),
          revenue: parseInt(cells[2]) || 0,
          growthYoY: parseFloat(cells[5]) || 0,
        })
      }
    }

    return results.slice(0, 13)
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

    return data.data.slice(0, 8).map((row: string[]) => {
      const raw = parseInt(row[0])
      const year = raw < 1000 ? raw + 1911 : Math.floor(raw / 10) + 1911
      return {
        year,
        cashDividend: parseFloat(row[2]) || 0,
        stockDividend: parseFloat(row[3]) || 0,
      }
    })
  } catch {
    return []
  }
}

// 取得個股財務比率（MOPS：ROE、負債比、流動比率等）
export async function fetchMopsRatios(code: string): Promise<{
  roe: number | null
  roa: number | null
  grossMargin: number | null
  operatingMargin: number | null
  netMargin: number | null
  debtRatio: number | null
  currentRatio: number | null
} | null> {
  try {
    const now = new Date()
    const rocYear = now.getFullYear() - 1911
    const quarter = Math.ceil((now.getMonth() + 1) / 3)
    const prevQ = quarter === 1 ? { y: rocYear - 1, q: 4 } : { y: rocYear, q: quarter - 1 }

    const body = new URLSearchParams({
      encodeURIComponent: '1',
      step: '1',
      firstin: '1',
      off: '1',
      TYPEK: 'sii',
      co_id: code,
      SYEAR: String(prevQ.y),
      SSEASON: String(prevQ.q),
    })

    const res = await fetch('https://mops.twse.com.tw/mops/web/ajax_t163sb06', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'https://mops.twse.com.tw/mops/web/t163sb06',
      },
      body: body.toString(),
      cache: 'no-store',
    })

    const html = await res.text()

    // 用關鍵字定位各指標的值
    function extractAfter(keyword: string): number | null {
      const idx = html.indexOf(keyword)
      if (idx === -1) return null
      const slice = html.slice(idx, idx + 300)
      const match = slice.match(/<td[^>]*>\s*(-?[\d.]+)\s*<\/td>/)
      return match ? parseFloat(match[1]) : null
    }

    const roe = extractAfter('股東權益報酬率')
    const roa = extractAfter('資產報酬率')
    const grossMargin = extractAfter('毛利率') ?? extractAfter('銷貨毛利率')
    const operatingMargin = extractAfter('營業利益率')
    const netMargin = extractAfter('稅前純益率') ?? extractAfter('稅後純益率')
    const debtRatio = extractAfter('負債占資產比率') ?? extractAfter('負債比率')
    const currentRatio = extractAfter('流動比率')

    if ([roe, roa, grossMargin, debtRatio].every(v => v === null)) return null

    return { roe, roa, grossMargin, operatingMargin, netMargin, debtRatio, currentRatio }
  } catch {
    return null
  }
}

// 取得個股財務比率（TWSE BWIBBU：本益比、殖利率、淨值比）
export async function fetchStockRatios(code: string): Promise<{
  pe: number | null
  dividendYield: number | null
  pb: number | null
} | null> {
  try {
    const url = `https://www.twse.com.tw/exchangeReport/BWIBBU_d?response=json&stockNo=${code}&showAll=0`
    const res = await fetch(url, { next: { revalidate: 3600 } })
    const data = await res.json()
    if (!data.data?.length) return null
    const row = data.data[0]
    return {
      dividendYield: parseFloat(row[2]) || null,
      pe: parseFloat(row[4]) || null,
      pb: parseFloat(row[5]) || null,
    }
  } catch {
    return null
  }
}

// 取得個股財務摘要（從 TWSE OpenAPI stock_summary 表）
export async function fetchStockSummaryFromApi(code: string): Promise<Record<string, number> | null> {
  try {
    const url = `https://openapi.twse.com.tw/v1/exchangeReport/BWIBBU`
    const res = await fetch(url, { next: { revalidate: 86400 } })
    const data = await res.json()
    const found = data.find((s: any) => s.Code === code)
    if (!found) return null
    return {
      pe: parseFloat(found['本益比']) || 0,
      dividendYield: parseFloat(found['殖利率(%)']) || 0,
      pb: parseFloat(found['股價淨值比']) || 0,
    }
  } catch {
    return null
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
