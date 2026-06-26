/**
 * 每季執行：抓 MOPS 財務資料，計算比率存入 Supabase
 * node scripts/fetch-mops.mjs
 */
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
require('dotenv').config({ path: '.env.local' })

import { chromium } from 'playwright'
import * as cheerio from 'cheerio'
import { createClient } from '@supabase/supabase-js'
import ws from 'ws'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { realtime: { transport: ws } }
)

// 用瀏覽器提交表單，取回加密 URL（繞過 MOPS SPA）
async function getRedirectUrl(page, typek, rocYear, quarter, formId) {
  const url = `https://mops.twse.com.tw/mops/#/web/${formId}`
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.waitForSelector('#TYPEK', { timeout: 15000 })
  await page.selectOption('#TYPEK', typek)
  await page.fill('#year', String(rocYear))
  await page.selectOption('#season', quarter.toString().padStart(2, '0'))
  const [resp] = await Promise.all([
    page.waitForResponse(r => r.url().includes('redirectToOld'), { timeout: 15000 }),
    page.click('#searchBtn'),
  ])
  const json = await resp.json()
  return json.result?.url
}

// 解析 MOPS HTML 表格，回傳 { code -> { colName: value } }
function parseMopsTable(html, relevantCols) {
  const $ = cheerio.load(html)
  const result = {}

  // 找所有獨立表格區塊（每個區塊有自己的 th 欄位定義）
  const sections = []
  let currentHeaders = []

  $('tr').each((_, tr) => {
    const ths = $(tr).find('th')
    const tds = $(tr).find('td')

    if (ths.length > 3) {
      // 新的表頭區塊
      currentHeaders = ths.toArray().map(th => $(th).text().trim())
    } else if (tds.length > 3 && currentHeaders.length > 0) {
      const cells = tds.toArray().map(td => $(td).text().trim())
      const code = cells[0]
      if (/^\d{4}$/.test(code)) {
        const row = {}
        currentHeaders.forEach((h, i) => {
          if (cells[i] && cells[i] !== '--') {
            const num = parseFloat(cells[i].replace(/,/g, ''))
            row[h] = isNaN(num) ? cells[i] : num
          }
        })
        result[code] = result[code] ? { ...result[code], ...row } : row
      }
    }
  })

  return result
}

// 從 income/balance 資料物件取對應欄位（支援多種欄位名稱）
function pick(obj, ...names) {
  for (const name of names) {
    if (obj[name] !== undefined) return obj[name]
  }
  return null
}

function calcRatios(inc, bal) {
  if (!inc || !bal) return null

  const revenue = pick(inc, '營業收入', '收益')
  const grossProfit = pick(inc, '營業毛利（毛損）淨額', '營業毛利（毛損）', '淨收益')
  const operatingIncome = pick(inc, '營業利益（損失）', '營業利益', '繼續營業單位稅前淨利（淨損）')
  const netIncome = pick(inc, '本期淨利（淨損）', '繼續營業單位本期淨利（淨損）', '本期稅後淨利（淨損）')
  const netIncomeParent = pick(inc, '淨利（損）歸屬於母公司業主', '淨利（淨損）歸屬於母公司業主')
  const eps = pick(inc, '基本每股盈餘（元）')

  const totalAssets = pick(bal, '資產總計', '資產合計')
  const totalLiabilities = pick(bal, '負債總計', '負債合計')
  const currentAssets = pick(bal, '流動資產')
  const currentLiabilities = pick(bal, '流動負債')
  const equity = pick(bal, '權益總計', '股東權益', '權益合計')

  const net = netIncomeParent ?? netIncome
  const safe = (a, b) => (a != null && b != null && b !== 0)
    ? parseFloat(((a / b) * 100).toFixed(2)) : null

  return {
    revenue,
    gross_profit: grossProfit,
    net_income: net,
    eps,
    gross_margin: safe(grossProfit, revenue),
    operating_margin: safe(operatingIncome, revenue),
    net_margin: safe(net, revenue),
    roe: safe(net * 4, equity),    // 年化（單季 × 4）
    roa: safe(net * 4, totalAssets),
    debt_ratio: safe(totalLiabilities, totalAssets),
    current_ratio: (currentAssets != null && currentLiabilities != null && currentLiabilities !== 0)
      ? parseFloat(((currentAssets / currentLiabilities) * 100).toFixed(2)) : null,
  }
}

async function main() {
  const now = new Date()
  const rocYear = now.getFullYear() - 1911
  const q = Math.ceil((now.getMonth() + 1) / 3)
  // 取上一季（確保資料已公告）
  const prevQ = q === 1 ? { y: rocYear - 1, q: 4 } : { y: rocYear, q: q - 1 }

  console.log(`🗂  抓取民國 ${prevQ.y} 年第 ${prevQ.q} 季資料`)

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'zh-TW,zh;q=0.9' })

  // 取得兩份加密 URL（上市）
  console.log('📡 取得損益表加密 URL...')
  const incomeUrl = await getRedirectUrl(page, 'sii', prevQ.y, prevQ.q, 't163sb04')
  console.log('📡 取得資產負債表加密 URL...')
  const balanceUrl = await getRedirectUrl(page, 'sii', prevQ.y, prevQ.q, 't163sb05')

  await browser.close()

  if (!incomeUrl || !balanceUrl) {
    console.error('❌ 無法取得 URL')
    return
  }

  // 直接 HTTP fetch（mopsov.twse.com.tw 不擋伺服器 IP）
  console.log('⬇️  下載損益表資料...')
  const [incomeHtml, balanceHtml] = await Promise.all([
    fetch(incomeUrl).then(r => r.text()),
    fetch(balanceUrl).then(r => r.text()),
  ])
  console.log(`損益表 ${(incomeHtml.length / 1024).toFixed(0)} KB，資產負債表 ${(balanceHtml.length / 1024).toFixed(0)} KB`)

  // 解析
  console.log('🔍 解析資料...')
  const incomeMap = parseMopsTable(incomeHtml)
  const balanceMap = parseMopsTable(balanceHtml)

  const codes = Object.keys(incomeMap)
  console.log(`共 ${codes.length} 家公司`)

  // 批量 upsert
  const BATCH = 50
  let success = 0, skip = 0

  for (let i = 0; i < codes.length; i += BATCH) {
    const batch = codes.slice(i, i + BATCH)
    const rows = []
    const summaryUpdates = []

    for (const code of batch) {
      const ratios = calcRatios(incomeMap[code], balanceMap[code])
      if (!ratios || ratios.gross_margin == null) { skip++; continue }

      rows.push({
        code,
        year: prevQ.y + 1911,
        quarter: prevQ.q,
        ...ratios,
      })
      summaryUpdates.push({
        code,
        name: incomeMap[code]['公司名稱'] ?? '',
        roe: ratios.roe,
        gross_margin: ratios.gross_margin,
        debt_ratio: ratios.debt_ratio,
        current_ratio: ratios.current_ratio,
        eps: ratios.eps,
      })
    }

    if (rows.length) {
      await supabase.from('financials').upsert(rows, { onConflict: 'code,year,quarter' })
      for (const s of summaryUpdates) {
        await supabase.from('stock_summary').upsert(s, { onConflict: 'code' })
      }
      success += rows.length
    }

    console.log(`進度 ${Math.min(i + BATCH, codes.length)}/${codes.length}`)
  }

  console.log(`✅ 完成！成功 ${success}，跳過 ${skip}`)
}

main().catch(console.error)
