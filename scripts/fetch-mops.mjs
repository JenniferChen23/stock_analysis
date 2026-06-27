/**
 * 每季執行：抓 MOPS 多季財務報表，還原單季後計算比率存入 Supabase
 *   node scripts/fetch-mops.mjs
 *
 * 重點：MOPS 損益表(t163sb04)是「年度累計」，必須相減還原單季。
 *       資產負債表(t163sb05)是時點快照，直接取用。
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

// ── 決定要抓哪些季 ───────────────────────────────────
// 財報申報期限：Q1≈5/15、Q2≈8/14、Q3≈11/14、Q4≈隔年3/31
function latestAvailableQuarter() {
  const now = new Date()
  const m = now.getMonth() + 1
  let roc = now.getFullYear() - 1911
  let q
  if (m >= 11) q = 3
  else if (m >= 8) q = 2
  else if (m >= 5) q = 1
  else { q = 4; roc -= 1 }   // 3~4月：用去年 Q4
  return { roc, q }
}

// 抓最近 4 個完整年度（含當年到最新季），確保能逐年還原單季
function quarterPlan() {
  const { roc, q } = latestAvailableQuarter()
  const startYear = roc - 3
  const list = []
  for (let y = startYear; y <= roc; y++) {
    const maxQ = y === roc ? q : 4
    for (let s = 1; s <= maxQ; s++) list.push({ roc: y, q: s })
  }
  return list
}

// ── 用瀏覽器拿加密 URL，再直接 fetch（mopsov 不擋伺服器） ──
async function getRedirectUrl(page, typek, rocYear, quarter, formId) {
  await page.goto('about:blank')
  await page.goto(`https://mops.twse.com.tw/mops/#/web/${formId}`, { waitUntil: 'networkidle' })
  await page.waitForSelector('#TYPEK', { timeout: 20000 })
  await page.selectOption('#TYPEK', typek)
  await page.fill('#year', String(rocYear))
  await page.selectOption('#season', quarter.toString().padStart(2, '0'))
  const [resp] = await Promise.all([
    page.waitForResponse(r => r.url().includes('redirectToOld'), { timeout: 20000 }),
    page.click('#searchBtn'),
  ])
  const json = await resp.json()
  return json.result?.url
}

// 解析 MOPS HTML 表格 → { code: { 欄名: 值 } }
function parseMopsTable(html) {
  const $ = cheerio.load(html)
  const result = {}
  let headers = []
  $('tr').each((_, tr) => {
    const ths = $(tr).find('th')
    const tds = $(tr).find('td')
    if (ths.length > 3) {
      headers = ths.toArray().map(th => $(th).text().trim())
    } else if (tds.length > 3 && headers.length) {
      const cells = tds.toArray().map(td => $(td).text().trim())
      const code = cells[0]
      if (/^\d{4}$/.test(code)) {
        const row = {}
        headers.forEach((h, i) => {
          if (cells[i] && cells[i] !== '--') {
            const n = parseFloat(cells[i].replace(/,/g, ''))
            row[h] = isNaN(n) ? cells[i] : n
          }
        })
        result[code] = { ...(result[code] || {}), ...row }
      }
    }
  })
  return result
}

const pick = (obj, ...names) => {
  for (const n of names) if (obj && obj[n] !== undefined) return obj[n]
  return null
}

// 從一列損益表取出累計數字
function extractIncome(row) {
  return {
    name: pick(row, '公司名稱'),
    revenue: pick(row, '營業收入', '收益', '淨收益'),
    grossProfit: pick(row, '營業毛利（毛損）淨額', '營業毛利（毛損）'),
    operatingIncome: pick(row, '營業利益（損失）', '營業利益'),
    netIncome: pick(row, '淨利（損）歸屬於母公司業主', '淨利（淨損）歸屬於母公司業主',
                          '本期淨利（淨損）', '繼續營業單位本期淨利（淨損）', '本期稅後淨利（淨損）'),
    eps: pick(row, '基本每股盈餘（元）'),
  }
}

// 從一列資產負債表取出快照
function extractBalance(row) {
  return {
    totalAssets: pick(row, '資產總計', '資產合計'),
    totalLiabilities: pick(row, '負債總計', '負債合計'),
    currentAssets: pick(row, '流動資產'),
    currentLiabilities: pick(row, '流動負債'),
    equity: pick(row, '權益總計', '權益合計', '股東權益總計', '股東權益'),
  }
}

import { existsSync, readFileSync, writeFileSync } from 'fs'
const CACHE_FILE = 'scripts/.mops-cache.json'

async function main() {
  const plan = quarterPlan()
  // income[roc][q][code] = 累計, balance[roc][q][code] = 快照
  let income = {}, balance = {}

  // 有快取且非 --refresh 就直接讀，省去 4 分鐘重抓
  if (existsSync(CACHE_FILE) && !process.argv.includes('--refresh')) {
    console.log('📦 讀取本地快取（加 --refresh 可強制重抓）')
    const cache = JSON.parse(readFileSync(CACHE_FILE, 'utf-8'))
    income = cache.income; balance = cache.balance
  } else {
    console.log(`🗂  抓取 ${plan.length} 季：${plan[0].roc}Q${plan[0].q} ~ ${plan.at(-1).roc}Q${plan.at(-1).q}`)
    const browser = await chromium.launch({ headless: true })
    const page = await browser.newPage()
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'zh-TW,zh;q=0.9' })

    const MARKETS = ['sii', 'otc']   // 上市 + 上櫃
    for (const { roc, q } of plan) {
      income[roc] = income[roc] || {}; income[roc][q] = {}
      balance[roc] = balance[roc] || {}; balance[roc][q] = {}
      let count = 0
      for (const market of MARKETS) {
        process.stdout.write(`  ${roc}Q${q} [${market}] 損益表…`)
        const incUrl = await getRedirectUrl(page, market, roc, q, 't163sb04')
        const incMap = parseMopsTable(await fetch(incUrl).then(r => r.text()))
        for (const code in incMap) income[roc][q][code] = extractIncome(incMap[code])

        process.stdout.write(' 資產負債表…')
        const balUrl = await getRedirectUrl(page, market, roc, q, 't163sb05')
        const balMap = parseMopsTable(await fetch(balUrl).then(r => r.text()))
        for (const code in balMap) balance[roc][q][code] = extractBalance(balMap[code])
        count += Object.keys(incMap).length
        process.stdout.write(' ✓')
      }
      console.log(` (${count} 家)`)
    }
    await browser.close()
    writeFileSync(CACHE_FILE, JSON.stringify({ income, balance }))
    console.log('📦 已存快取')
  }

  // ── 還原單季 + 計算比率 ───────────────────────────
  console.log('🔍 還原單季並計算比率…')
  const rows = []
  // 收集所有出現過的股票代號
  const allCodes = new Set()
  for (const roc in income) for (const q in income[roc]) for (const c in income[roc][q]) allCodes.add(c)

  // 比率：超出欄位範圍(numeric 5,2 = ±999.99)的極端值視為雜訊→null
  const clampRatio = (v, max = 999.99) => (v == null || !isFinite(v) || Math.abs(v) > max) ? null : v
  const safe = (a, b, max = 999.99) => {
    if (a == null || b == null || b === 0) return null
    return clampRatio(parseFloat(((a / b) * 100).toFixed(2)), max)
  }
  const sub = (a, b) => (a != null && b != null) ? a - b : (a ?? null)

  // 每股名稱（取最新一季）
  const nameOf = {}

  for (const { roc, q } of plan) {
    const incQ = income[roc]?.[q] || {}
    const balQ = balance[roc]?.[q] || {}
    const incPrev = q > 1 ? (income[roc]?.[q - 1] || {}) : null  // 同年前一季（累計）

    for (const code of allCodes) {
      const cur = incQ[code]
      if (!cur) continue
      const bal = balQ[code]
      if (cur.name) nameOf[code] = cur.name

      // 還原單季：Q1=累計本身；Q2~Q4=本季累計−前季累計
      let revenue, grossProfit, operatingIncome, netIncome, eps
      if (q === 1) {
        revenue = cur.revenue; grossProfit = cur.grossProfit
        operatingIncome = cur.operatingIncome; netIncome = cur.netIncome; eps = cur.eps
      } else {
        const prev = incPrev?.[code]
        if (!prev) continue  // 缺前季無法還原，略過
        revenue = sub(cur.revenue, prev.revenue)
        grossProfit = sub(cur.grossProfit, prev.grossProfit)
        operatingIncome = sub(cur.operatingIncome, prev.operatingIncome)
        netIncome = sub(cur.netIncome, prev.netIncome)
        eps = (cur.eps != null && prev.eps != null) ? parseFloat((cur.eps - prev.eps).toFixed(2)) : null
      }

      const equity = bal?.equity
      const totalAssets = bal?.totalAssets

      rows.push({
        code,
        year: roc + 1911,
        quarter: q,
        revenue: revenue != null ? Math.round(revenue) : null,
        gross_profit: grossProfit != null ? Math.round(grossProfit) : null,
        net_income: netIncome != null ? Math.round(netIncome) : null,
        gross_margin: safe(grossProfit, revenue),
        operating_margin: safe(operatingIncome, revenue),
        net_margin: safe(netIncome, revenue),
        roe: safe(netIncome, equity),          // 單季 ROE（未年化）
        roa: safe(netIncome, totalAssets),     // 單季 ROA
        debt_ratio: safe(bal?.totalLiabilities, totalAssets),
        current_ratio: safe(bal?.currentAssets, bal?.currentLiabilities, 9999.99),  // 欄位 numeric(6,2)
        eps: clampRatio(eps, 999999.99),       // 欄位 numeric(8,2)
      })
    }
  }

  console.log(`共 ${rows.length} 筆（${allCodes.size} 家 × 多季）`)

  // ── 寫入 financials ───────────────────────────────
  console.log('💾 寫入 financials…')
  for (let i = 0; i < rows.length; i += 200) {
    const batch = rows.slice(i, i + 200)
    const { error } = await supabase.from('financials').upsert(batch, { onConflict: 'code,year,quarter' })
    if (error) console.error('  upsert 錯誤:', error.message)
    process.stdout.write(`\r  ${Math.min(i + 200, rows.length)}/${rows.length}`)
  }
  console.log('')

  // ── 聚合 stock_summary（近4季 TTM）──────────────────
  console.log('📊 聚合 stock_summary（近4季）…')
  const byCode = {}
  for (const r of rows) {
    (byCode[r.code] = byCode[r.code] || []).push(r)
  }
  const summaries = []
  for (const code in byCode) {
    const list = byCode[code].sort((a, b) => (b.year - a.year) || (b.quarter - a.quarter))
    const last4 = list.slice(0, 4)
    if (last4.length < 4) continue
    const sum = (k) => last4.reduce((s, r) => s + (r[k] ?? 0), 0)
    const ttmRevenue = sum('revenue')
    const ttmNet = sum('net_income')
    const ttmGross = sum('gross_profit')
    const ttmEps = clampRatio(parseFloat(last4.reduce((s, r) => s + (r.eps ?? 0), 0).toFixed(2)), 999999.99)
    const latest = list[0]
    // 近4季 ROE ≈ 近 4 個單季 ROE 加總（年化真實報酬率近似）
    const ttmRoe = clampRatio(parseFloat(last4.reduce((s, r) => s + (r.roe ?? 0), 0).toFixed(2)))
    const ttmGrossMargin = ttmRevenue
      ? clampRatio(parseFloat(((ttmGross / ttmRevenue) * 100).toFixed(2)))
      : latest.gross_margin

    summaries.push({
      code,
      name: nameOf[code] ?? '',
      eps: ttmEps,
      roe: ttmRoe,
      gross_margin: ttmGrossMargin,
      debt_ratio: latest.debt_ratio,
      current_ratio: latest.current_ratio,
      updated_at: new Date().toISOString(),
    })
  }

  for (let i = 0; i < summaries.length; i += 200) {
    const batch = summaries.slice(i, i + 200)
    const { error } = await supabase.from('stock_summary').upsert(batch, { onConflict: 'code' })
    if (error) console.error('  summary 錯誤:', error.message)
  }
  console.log(`✅ 完成！financials ${rows.length} 筆，stock_summary ${summaries.length} 家`)
}

main().catch(console.error)
