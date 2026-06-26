import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { runScreener, DEFAULT_OPTIONS, ScreenerOptions } from '@/lib/screener'

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams

  const opts: ScreenerOptions = {
    roeMin: parseFloat(p.get('roeMin') ?? '') || DEFAULT_OPTIONS.roeMin,
    grossMarginMin: parseFloat(p.get('grossMarginMin') ?? '') || DEFAULT_OPTIONS.grossMarginMin,
    debtRatioMax: parseFloat(p.get('debtRatioMax') ?? '') || DEFAULT_OPTIONS.debtRatioMax,
    currentRatioMin: parseFloat(p.get('currentRatioMin') ?? '') || DEFAULT_OPTIONS.currentRatioMin,
    dividendYieldMin: parseFloat(p.get('dividendYieldMin') ?? '') || DEFAULT_OPTIONS.dividendYieldMin,
    revenueGrowthMin: parseFloat(p.get('revenueGrowthMin') ?? '') || DEFAULT_OPTIONS.revenueGrowthMin,
    epsGrowthMin: parseFloat(p.get('epsGrowthMin') ?? '') || DEFAULT_OPTIONS.epsGrowthMin,
  }

  const { data, error } = await supabase.from('stock_summary').select('*')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const results = runScreener(data ?? [], opts)
  return NextResponse.json({ results, total: data?.length ?? 0, updatedAt: data?.[0]?.updated_at })
}
