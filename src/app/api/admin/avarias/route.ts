import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Avaria } from '@/lib/types';

export const dynamic = 'force-dynamic';

let cached: { at: number; data: Avaria[] } | null = null;
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

    const res = await supabase.from('avarias').select('*').order('id', { ascending: false }).limit(2000);
    if (res.error) throw res.error;

    const mapped: Avaria[] = (res.data || []).map((a: any) => ({
      id: a.id,
      createdAt: a.created_at ?? a.createdAt,
      createdBy: a.created_by ?? a.createdBy,
      createdByName: a.created_by_name ?? a.createdByName,
      customerId: a.customer_id ?? a.customerId,
      customerName: a.customer_name ?? a.customerName,
      productId: a.product_id ?? a.productId,
      productName: a.product_name ?? a.productName,
      description: a.description,
    }));

    cached = { at: now, data: mapped };
    return NextResponse.json({ success: true, data: mapped });
  } catch (e: any) {
    if (cached) return NextResponse.json({ success: true, data: cached.data });
    return NextResponse.json({ success: false, error: e?.message || 'Falha ao buscar avarias' }, { status: 500 });
  }
}

