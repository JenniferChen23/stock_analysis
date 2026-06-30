// 從 financials（每筆為「單季」資料）算出 ROE/ROA 三種口徑
// 單季：該季原始值（單季淨利 ÷ 股東權益）
// 近4季(TTM)：近4季淨利加總 ÷ 最新季末股東權益（= 財報狗/玩股網的年化 ROE）
// 年度：同一會計年度淨利加總 ÷ 年末股東權益
//
// financials 沒有直接存「股東權益」，但單季 roe = 單季淨利 / 權益，
// 故可反推：權益 = 單季淨利 / (單季roe/100)，roa 同理反推總資產。

export interface QuarterRow {
  year: number
  quarter: number
  roe?: number | null
  roa?: number | null
  eps?: number | null
  net_income?: number | null
  [k: string]: any
}

export type ReturnMode = 'single' | 'ttm' | 'annual'

export interface ReturnPoint {
  label: string      // 例如 2025Q3 或 2025
  roe: number | null
  roa: number | null
}

// 將資料由舊到新排序
function sortAsc(rows: QuarterRow[]): QuarterRow[] {
  return [...rows].sort((a, b) => (a.year - b.year) || (a.quarter - b.quarter))
}

const r2 = (n: number) => Math.round(n * 100) / 100

// 一組季資料的「淨利加總 ÷ 期末分母」報酬率
// rate 用最後一季反推分母（roe→權益、roa→總資產）：分母 = 該季淨利 / (該季rate/100)
function aggregateReturn(window: QuarterRow[], k: 'roe' | 'roa'): number | null {
  const latest = window[window.length - 1]
  const rate = latest[k]
  const ni = latest.net_income
  // 反推分母需要：最新季的 rate 與淨利皆有效，且每季都有淨利
  if (rate == null || rate === 0 || ni == null) {
    // 退而求其次：若資料不足以反推，回傳單季加總（舊近似）
    return window.every(w => w[k] != null)
      ? r2(window.reduce((s, w) => s + (w[k] as number), 0))
      : null
  }
  if (window.some(w => w.net_income == null)) return null
  const denom = ni / (rate / 100)              // 期末股東權益 / 總資產
  if (!isFinite(denom) || denom <= 0) return null
  const totalNet = window.reduce((s, w) => s + (w.net_income as number), 0)
  return r2((totalNet / denom) * 100)
}

export function buildReturnSeries(rows: QuarterRow[], mode: ReturnMode): ReturnPoint[] {
  const asc = sortAsc(rows)

  if (mode === 'single') {
    return asc.map(r => ({
      label: `${r.year}Q${r.quarter}`,
      roe: r.roe ?? null,
      roa: r.roa ?? null,
    }))
  }

  if (mode === 'ttm') {
    const out: ReturnPoint[] = []
    for (let i = 3; i < asc.length; i++) {
      const win = asc.slice(i - 3, i + 1)
      out.push({
        label: `${asc[i].year}Q${asc[i].quarter}`,
        roe: aggregateReturn(win, 'roe'),
        roa: aggregateReturn(win, 'roa'),
      })
    }
    return out
  }

  // annual：依年度分組，需 4 季齊全
  const byYear: Record<number, QuarterRow[]> = {}
  for (const r of asc) (byYear[r.year] = byYear[r.year] || []).push(r)
  const out: ReturnPoint[] = []
  for (const y of Object.keys(byYear).map(Number).sort()) {
    const list = byYear[y]
    if (list.length < 4) continue
    out.push({ label: `${y}`, roe: aggregateReturn(list, 'roe'), roa: aggregateReturn(list, 'roa') })
  }
  return out
}

// 取單一最新口徑值（給摘要/卡片用）；TTM 為主流「ROE」
export function latestReturn(rows: QuarterRow[], mode: ReturnMode = 'ttm'): { roe: number | null; roa: number | null } {
  const series = buildReturnSeries(rows, mode)
  const last = series.at(-1)
  return { roe: last?.roe ?? null, roa: last?.roa ?? null }
}
