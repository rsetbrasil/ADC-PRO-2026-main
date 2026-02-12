import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Category } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('order', { ascending: true });
    if (error) throw error;

    const mapped: Category[] = (data || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      order: Number(c.order || 0),
      subcategories: Array.isArray(c.subcategories) ? c.subcategories : [],
    }));

    return NextResponse.json({ success: true, data: mapped });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Failed to fetch categories' }, { status: 500 });
  }
}

