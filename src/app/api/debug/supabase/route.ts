import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const host = new URL(supabaseUrl).hostname;
    const ref = host.split('.')[0];

    const countRes = await supabase.from('orders').select('*', { count: 'exact', head: true });
    const maxRes = await supabase.from('orders').select('date').order('date', { ascending: false }).limit(1);

    const windowStart = new Date();
    windowStart.setDate(windowStart.getDate() - 120);
    const windowStartIso = windowStart.toISOString();
    const recentRes = await supabase
      .from('orders')
      .select('id,date')
      .gte('date', windowStartIso)
      .order('date', { ascending: false })
      .limit(5);

    return NextResponse.json({
      success: true,
      supabase: {
        urlHost: host,
        projectRef: ref,
      },
      orders: {
        count: countRes.count ?? null,
        newestDate: (maxRes.data || [])[0]?.date ?? null,
        recentQuery: {
          windowStartIso,
          error: recentRes.error ? { message: recentRes.error.message, code: (recentRes.error as any).code } : null,
          sample: (recentRes.data || []) as any,
        },
      },
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Falha ao diagnosticar Supabase' }, { status: 500 });
  }
}
