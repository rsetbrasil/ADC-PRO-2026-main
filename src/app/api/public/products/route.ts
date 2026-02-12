import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Product } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    if (error) throw error;

    const mapped: Product[] = (data || []).map((p: any) => ({
      id: p.id,
      code: p.code || undefined,
      name: p.name,
      description: p.description || '',
      longDescription: p.long_description || '',
      price: Number(p.price || 0),
      originalPrice: p.original_price ?? undefined,
      cost: p.cost ?? undefined,
      onSale: !!p.on_sale,
      promotionEndDate: p.promotion_end_date || undefined,
      isHidden: !!p.is_hidden,
      category: p.category || '',
      subcategory: p.subcategory || undefined,
      stock: Number(p.stock || 0),
      minStock: p.min_stock ?? undefined,
      unit: p.unit || undefined,
      imageUrl: p.image_url || undefined,
      imageUrls: Array.isArray(p.image_urls) ? p.image_urls : [],
      maxInstallments: p.max_installments ?? undefined,
      paymentCondition: p.payment_condition || undefined,
      commissionType: p.commission_type || undefined,
      commissionValue: p.commission_value ?? undefined,
      ['data-ai-hint']: p['data_ai_hint'] || undefined,
      createdAt: p.created_at,
      deletedAt: p.deleted_at || undefined,
    }));

    return NextResponse.json({ success: true, data: mapped });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'Failed to fetch products' }, { status: 500 });
  }
}

