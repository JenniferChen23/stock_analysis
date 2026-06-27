/**
 * 每月執行：抓 MOPS 月營收靜態檔（近 15 個月）+ 全市場殖利率，存入 Supabase
 *   node scripts/fetch-revenue.mjs
 *
 * 月營收來源：https://mopsov.twse.com.tw/nas/t21/sii/t21sc03_{民國年}_{月}_0.html
 *   （MOPS 預先產生的靜態檔，不擋伺服器，直接 HTTP 抓即可，Big5 編碼）
 */
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
require('dotenv').config({ path: '.env.local' })

import * as cheerio from 'cheerio'
import { createClient } from '@supabase/supabase-js'
import ws from 'ws'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { realtime: { transport: ws } }
)

// 抓單月靜態檔並解析（回傳 [{code, name, revenue, yoy}]）
async function fetchMonth(rocYear, month) {
  const url = `https://mopsov.twse.com.tw/nas/t21/sii/t21sc03_${rocYear}_${month}_0.html`
  let res
  try { res = await fetch(url) } catch { return null }
  if (res.status !== 200) return null
  const buf = await res.arrayBuffer()
  const html = new TextDecoder('big5').decode(buf)
  if (html.length < 5000) return null  // 查無資料

  const $ = cheerio.load(html)
  const out = []
  $('tr').each((_, tr) => {
    const cells = $(tr).find('td').toArray().map(td => $(td).text().trim().replace(/\s+/g, ''))
    if (cells.length < 7) return
    const code = cells[0]
    if (!/^\d{4}$/.test(code)) return
    const revenue = parseInt(cells[2].replace(/,/g, ''))
    const yoyRaw = parseFloat(cells[6].replace(/,/g, ''))
    // yoy 欄位 numeric(8,2) 上限 ±999999.99，超出（基期極低的爆量）視為 null
    const yoy = (isNaN(yoyRaw) || Math.abs(yoyRaw) > 999999.99) ? null : yoyRaw
    out.push({
      code,
      name: cells[1],
      revenue: isNaN(revenue) ? null : revenue,
      yoy,
    })
  })
  return out
}

// 全市場殖利率/本益比（BWIBBU_d 回傳當日全市場；欄位：代號|名稱|收盤價|殖利率|股利年度|本益比|淨值比|財報年季）
async function fetchAllRatios() {
  const url = 'https://www.twse.com.tw/exchangeReport/BWIBBU_d?response=json&stockNo=2330&showAll=0'
  const data = await fetch(url).then(r => r.json())
  const map = {}
  for (const r of data.data ?? []) {
    const dy = parseFloat(r[3]); const pe = parseFloat(r[5])
    map[r[0]] = { dividend_yield: isNaN(dy) ? null : dy, pe: isNaN(pe) ? null : pe }
  }
  return map
}

async function main() {
  // 從本月往回抓 15 個月（缺的月份自動略過）
  const now = new Date()
  let y = now.getFullYear(), m = now.getMonth() + 1
  const rows = []
  const latestYoY = {}   // code -> 最新月份 yoy

  console.log('⬇️  抓取月營收靜態檔…')
  let collected = 0
  for (let i = 0; i < 15; i++) {
    const rocYear = y - 1911
    const list = await fetchMonth(rocYear, m)
    if (list) {
      for (const r of list) {
        rows.push({ code: r.code, year: y, month: m, revenue: r.revenue, yoy: r.yoy, updated_at: new Date().toISOString() })
        // 記錄每檔最新一筆 yoy（i 由新到舊，第一次出現即最新）
        if (latestYoY[r.code] === undefined) latestYoY[r.code] = r.yoy
      }
      collected++
      console.log(`  ${y}/${m}: ${list.length} 家`)
    } else {
      console.log(`  ${y}/${m}: （無資料，略過）`)
    }
    m -= 1
    if (m < 1) { m = 12; y -= 1 }
  }

  console.log(`共 ${rows.length} 筆月營收（${collected} 個月）`)

  // 寫入 monthly_revenue
  console.log('💾 寫入 monthly_revenue…')
  for (let i = 0; i < rows.length; i += 300) {
    const batch = rows.slice(i, i + 300)
    const { error } = await supabase.from('monthly_revenue').upsert(batch, { onConflict: 'code,year,month' })
    if (error) console.error('  批次錯誤:', error.message)
    process.stdout.write(`\r  ${Math.min(i + 300, rows.length)}/${rows.length}`)
  }
  console.log('')

  // 更新 stock_summary：殖利率、本益比、最新月營收年增率
  console.log('📊 更新 stock_summary 殖利率/本益比/營收年增…')
  const ratios = await fetchAllRatios()
  const codes = new Set([...Object.keys(ratios), ...Object.keys(latestYoY)])
  const updates = []
  for (const code of codes) {
    updates.push({
      code,
      dividend_yield: ratios[code]?.dividend_yield ?? null,
      pe: ratios[code]?.pe ?? null,
      revenue_growth_yoy: latestYoY[code] ?? null,
      updated_at: new Date().toISOString(),
    })
  }
  // 只更新已存在的股票（用 upsert 但保留其他欄位 → 先讀現有 code）
  const { data: existing } = await supabase.from('stock_summary').select('code')
  const existSet = new Set((existing ?? []).map(r => r.code))
  const filtered = updates.filter(u => existSet.has(u.code))
  // 並行批次更新（每批 50 個同時送，加速）
  for (let i = 0; i < filtered.length; i += 50) {
    const batch = filtered.slice(i, i + 50)
    await Promise.all(batch.map(u =>
      supabase.from('stock_summary')
        .update({ dividend_yield: u.dividend_yield, pe: u.pe, revenue_growth_yoy: u.revenue_growth_yoy })
        .eq('code', u.code)
    ))
    process.stdout.write(`\r  ${Math.min(i + 50, filtered.length)}/${filtered.length}`)
  }
  console.log('')
  console.log(`✅ 完成！月營收 ${rows.length} 筆，殖利率更新 ${filtered.length} 家`)
}

main().catch(console.error)
