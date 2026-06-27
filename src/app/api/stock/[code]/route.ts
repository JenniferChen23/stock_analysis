import { NextRequest, NextResponse } from 'next/server'
import { fetchStockPrice, fetchStockRatios } from '@/lib/twse'
import { supabase } from '@/lib/supabase'

export async function GET(req: NextRequest, { params }: { params: { code: string } }) {
  const { code } = params

  const [price, ratios, dbResult] = await Promise.all([
    fetchStockPrice(code),
    fetchStockRatios(code),
    supabase
      .from('financials')
      .select('*')
      .eq('code', code)
      .order('year', { ascending: false })
      .order('quarter', { ascending: false })
      .limit(20),
  ])

  if (!price) {
    return NextResponse.json({ error: '找不到此股票代號' }, { status: 404 })
  }

  const financials = dbResult.data ?? []
  const latest = financials[0]

  // 合併 TWSE 即時資料 + Supabase 財務資料
  const f0 = {
    code,
    year: latest?.year ?? new Date().getFullYear(),
    quarter: latest?.quarter ?? Math.ceil((new Date().getMonth() + 1) / 3),
    eps: latest?.eps ?? null,
    roe: latest?.roe ?? null,
    roa: latest?.roa ?? null,
    gross_margin: latest?.gross_margin ?? null,
    operating_margin: latest?.operating_margin ?? null,
    net_margin: latest?.net_margin ?? null,
    debt_ratio: latest?.debt_ratio ?? null,
    current_ratio: latest?.current_ratio ?? null,
    dividend_yield: ratios?.dividendYield ?? null,
    pe_ratio: ratios?.pe ?? null,
  }

  return NextResponse.json({
    price,
    financials: financials.length ? financials : [f0],
    ratios,
    revenue: null,   // 待 Playwright 腳本填入後從 DB 讀
    dividend: null,
  })
}
