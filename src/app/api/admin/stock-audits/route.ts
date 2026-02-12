import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { StockAudit } from '@/lib/types';

export const dynamic = 'force-dynamic';

let cached: { at: number; data: StockAudit[] } | null = null;
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

    const res = await supabase.from('stock_audits').select('*').order('id', { ascending: false }).limit(24);
    if (res.error) throw res.error;

    const mapped: StockAudit[] = (res.data || []).map((a: any) => ({
      id: a.id,
      month: a.month,
      year: a.year,
      createdAt: a.created_at ?? a.createdAt,
      auditedBy: a.audited_by ?? a.auditedBy,
      auditedByName: a.audited_by_name ?? a.auditedByName,
      products: Array.isArray(a.products) ? a.products : [],
    }));

    cached = { at: now, data: mapped };
    return NextResponse.json({ success: true, data: mapped });
  } catch (e: any) {
    if (cached) return NextResponse.json({ success: true, data: cached.data });
    return NextResponse.json({ success: false, error: e?.message || 'Falha ao buscar auditorias' }, { status: 500 });
  }
}

