import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { CommissionPayment } from '@/lib/types';

export const dynamic = 'force-dynamic';

let cached: { at: number; data: CommissionPayment[] } | null = null;
const CACHE_TTL_MS = 5000;

export async function GET() {
  try {
    const now = Date.now();
    if (cached && now - cached.at < CACHE_TTL_MS) {
      return NextResponse.json({ success: true, data: cached.data });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const res = await supabase.from('commission_payments').select('*').order('id', { ascending: false }).limit(1000);
    if (res.error) throw res.error;

    const mapped: CommissionPayment[] = (res.data || []).map((p: any) => ({
      id: p.id,
      sellerId: p.seller_id ?? p.sellerId,
      sellerName: p.seller_name ?? p.sellerName,
      amount: Number(p.amount || 0),
      paymentDate: p.payment_date ?? p.paymentDate,
      period: p.period,
      orderIds: Array.isArray(p.order_ids) ? p.order_ids : Array.isArray(p.orderIds) ? p.orderIds : [],
    }));

    cached = { at: now, data: mapped };
    return NextResponse.json({ success: true, data: mapped });
  } catch (e: any) {
    if (cached) return NextResponse.json({ success: true, data: cached.data });
    return NextResponse.json({ success: false, error: e?.message || 'Falha ao buscar pagamentos de comissão' }, { status: 500 });
  }
}

