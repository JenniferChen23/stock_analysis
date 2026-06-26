/**
 * 每季執行：從 TWSE 抓取財務資料，寫入 Supabase
 * 手動執行：node scripts/fetch-financials.mjs
 */

import { createRequire } from 'module'
const require = createRequire(import.meta.url)
require('dotenv').config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'
import ws from 'ws'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { realtime: { transport: ws } }
)

// 上市股票代號清單（從 TWSE 取得）
async function fetchStockList() {
  const res = await fetch('https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL')
  const data = await res.json()
  return data.map(s => ({ code: s.Code, name: s.Name })).filter(s => /^\d{4}$/.test(s.code))
}

// 月營收年增率（公開資訊觀測站）
async function fetchRevenueGrowth(code) {
  try {
    const url = `https://www.twse.com.tw/exchangeReport/TAISHIN?response=json&stockNo=${code}`
    const res = await fetch(url)
    const data = await res.json()
    if (!data.data?.length) return null
    return parseFloat(data.data[0][5]?.replace('%', '')) || 0
  } catch {
    return null
  }
}

// 財務比率（公開資訊觀測站 BWIBBU）
async function fetchRatios(code) {
  try {
    const url = `https://www.twse.com.tw/exchangeReport/BWIBBU_d?response=json&stockNo=${code}&showAll=0`
    const res = await fetch(url)
    const data = await res.json()
    if (!data.data?.length) return null
    const row = data.data[0]
    return {
      pe: parseFloat(row[4]) || null,
      pb: parseFloat(row[5]) || null,
      dividendYield: parseFloat(row[2]) || null,
    }
  } catch {
    return null
  }
}

// 測試 MOPS 是否可存取
async function testMops() {
  const body = new URLSearchParams({
    encodeURIComponent: '1', step: '1', firstin: '1', off: '1',
    TYPEK: 'sii', co_id: '2330', SYEAR: '114', SSEASON: '4',
  })
  const res = await fetch('https://mops.twse.com.tw/mops/web/ajax_t163sb06', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      'Referer': 'https://mops.twse.com.tw/mops/web/t163sb06',
    },
    body: body.toString(),
  })
  const buffer = await res.arrayBuffer()
  const html = new TextDecoder('big5').decode(buffer)
  const blocked = html.includes('SECURITY') || html.includes('CAN NOT BE ACCESSED')
  console.log(blocked ? '❌ MOPS 封鎖此 IP' : '✅ MOPS 可正常存取')
  console.log('HTML 長度:', html.length, '含ROE:', html.includes('股東權益報酬率'))
  return !blocked
}

async function main() {
  console.log('開始抓取股票清單…')
  await testMops()
  const stocks = await fetchStockList()
  console.log(`共 ${stocks.length} 檔，開始更新…`)

  const batchSize = 10
  for (let i = 0; i < stocks.length; i += batchSize) {
    const batch = stocks.slice(i, i + batchSize)
    await Promise.all(batch.map(async ({ code, name }) => {
      const [revenueGrowth, ratios] = await Promise.all([
        fetchRevenueGrowth(code),
        fetchRatios(code),
      ])

      await supabase.from('stock_summary').upsert({
        code,
        name,
        pe: ratios?.pe,
        dividend_yield: ratios?.dividendYield,
        revenue_growth_yoy: revenueGrowth,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'code' })
    }))

    // 避免打太快被封 IP，每批間隔 1 秒
    await new Promise(r => setTimeout(r, 1000))
    if ((i / batchSize) % 10 === 0) console.log(`進度 ${i}/${stocks.length}`)
  }

  console.log('更新完成！')
}

main().catch(console.error)
