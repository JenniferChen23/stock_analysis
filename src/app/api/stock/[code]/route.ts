import { NextRequest, NextResponse } from 'next/server'
import { fetchStockPrice, fetchMonthlyRevenue, fetchDividend } from '@/lib/twse'
import { supabase } from '@/lib/supabase'

export async function GET(req: NextRequest, { params }: { params: { code: string } }) {
  const { code } = params

  const [price, financials, revenue, dividend] = await Promise.all([
    fetchStockPrice(code),
    supabase
      .from('financials')
      .select('*')
      .eq('code', code)
      .order('year', { ascending: false })
      .order('quarter', { ascending: false })
      .limit(8),
    fetchMonthlyRevenue(code),
    fetchDividend(code),
  ])

  if (!price) {
    return NextResponse.json({ error: '找不到此股票代號' }, { status: 404 })
  }

  return NextResponse.json({
    price,
    financials: financials.data ?? [],
    revenue,
    dividend,
  })
}
