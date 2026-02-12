import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
  const started = Date.now();
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { error } = await supabase.from('products').select('id').limit(1);
    const ms = Date.now() - started;
    if (error) {
      return NextResponse.json({ ok: false, ms, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, ms });
  } catch (e: any) {
    const ms = Date.now() - started;
    return NextResponse.json({ ok: false, ms, error: e?.message || 'health failed' }, { status: 500 });
  }
}
