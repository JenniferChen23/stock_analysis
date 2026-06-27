import { NextRequest, NextResponse } from 'next/server'
import { fetchStockPrice, fetchStockRatios } from '@/lib/twse'
import { supabase } from '@/lib/supabase'

export async function GET(req: NextRequest, { params }: { params: { code: string } }) {
  const { code } = params

  const [price, ratios, dbResult, revResult] = await Promise.all([
    fetchStockPrice(code),
    fetchStockRatios(code),
    supabase
      .from('financials')
      .select('*')
      .eq('code', code)
      .order('year', { ascending: false })
      .order('quarter', { ascending: false })
      .limit(20),
    supabase
      .from('monthly_revenue')
      .select('*')
      .eq('code', code)
      .order('year', { ascending: false })
      .order('month', { ascending: false })
      .limit(24),
  ])

  if (!price) {
    return NextResponse.json({ error: '找不到此股票代號' }, { status: 404 })
  }

  const financials = (dbResult.data ?? []).slice()

  // 把即時殖利率/本益比併進最新一季財報列（DB 沒存這兩個欄位）
  if (financials.length) {
    financials[0] = {
      ...financials[0],
      dividend_yield: ratios?.dividendYield ?? null,
      pe_ratio: ratios?.pe ?? null,
    }
  }

  const f0 = financials[0] ?? {
    code,
    year: new Date().getFullYear(),
    quarter: Math.ceil((new Date().getMonth() + 1) / 3),
    dividend_yield: ratios?.dividendYield ?? null,
    pe_ratio: ratios?.pe ?? null,
  }

  // 月營收（由新到舊）→ 前端再 reverse
  const revenue = (revResult.data ?? []).map((r: any) => ({
    year: r.year,
    month: r.month,
    revenue: r.revenue,
    growthYoY: r.yoy,
  }))

  return NextResponse.json({
    price,
    financials: financials.length ? financials : [f0],
    ratios,
    revenue,
    dividend: null,
  })
}
