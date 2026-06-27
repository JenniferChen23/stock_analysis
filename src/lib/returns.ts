// 從 financials（每筆為「單季」資料）算出 ROE/ROA 三種口徑
// 單季：該季原始值
// 近4季(TTM)：滾動近 4 季單季值加總（年化真實報酬率）
// 年度：同一會計年度 4 季加總

export interface QuarterRow {
  year: number
  quarter: number
  roe?: number | null
  roa?: number | null
  eps?: number | null
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
      const sum = (k: 'roe' | 'roa') =>
        win.every(w => w[k] != null) ? r2(win.reduce((s, w) => s + (w[k] as number), 0)) : null
      out.push({ label: `${asc[i].year}Q${asc[i].quarter}`, roe: sum('roe'), roa: sum('roa') })
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
    const sum = (k: 'roe' | 'roa') =>
      list.every(w => w[k] != null) ? r2(list.reduce((s, w) => s + (w[k] as number), 0)) : null
    out.push({ label: `${y}`, roe: sum('roe'), roa: sum('roa') })
  }
  return out
}

// 取單一最新口徑值（給摘要/卡片用）；TTM 為主流「ROE」
export function latestReturn(rows: QuarterRow[], mode: ReturnMode = 'ttm'): { roe: number | null; roa: number | null } {
  const series = buildReturnSeries(rows, mode)
  const last = series.at(-1)
  return { roe: last?.roe ?? null, roa: last?.roa ?? null }
}
