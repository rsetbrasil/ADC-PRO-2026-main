import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Category } from '@/lib/types';

export const dynamic = 'force-dynamic';

let cachedCategories: Category[] | null = null;
let cachedAt = 0;
const CACHE_TTL_MS = 30000;

export async function GET() {
  try {
    const now = Date.now();
    if (cachedCategories && now - cachedAt < CACHE_TTL_MS) {
      return NextResponse.json({ success: true, data: cachedCategories });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data, error } = await supabase
      .from('categories')
      .select('id,name,order,subcategories')
      .order('order', { ascending: true });
    if (error) throw error;

    const mapped: Category[] = (data || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      order: Number(c.order || 0),
      subcategories: Array.isArray(c.subcategories) ? c.subcategories : [],
    }));

    cachedCategories = mapped;
    cachedAt = now;

    return NextResponse.json({ success: true, data: mapped });
  } catch (e: any) {
    if (cachedCategories) {
      return NextResponse.json({ success: true, data: cachedCategories });
    }
    return NextResponse.json({ success: false, error: e?.message || 'Failed to fetch categories' }, { status: 500 });
  }
}
