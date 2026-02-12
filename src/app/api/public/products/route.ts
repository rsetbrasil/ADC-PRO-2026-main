import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Product } from '@/lib/types';

export const dynamic = 'force-dynamic';

let cachedProducts: Product[] | null = null;
let cachedAt = 0;
const CACHE_TTL_MS = 60000;

export async function GET() {
  try {
    const now = Date.now();
    if (cachedProducts && now - cachedAt < CACHE_TTL_MS) {
      return NextResponse.json({ success: true, data: cachedProducts });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let data: any[] | null = null;
    let error: any = null;

    {
      const res = await supabase
        .from('products')
        .select(
          'id,code,name,description,long_description,price,original_price,cost,on_sale,promotion_end_date,is_hidden,category,subcategory,stock,min_stock,unit,image_url,image_urls,max_installments,payment_condition,commission_type,commission_value,data_ai_hint,created_at,deleted_at'
        )
        .is('deleted_at', null)
        .order('id', { ascending: false })
        .limit(300);
      data = (res as any).data || null;
      error = (res as any).error || null;
    }

    if (error) {
      const message = String(error?.message || '');
      if (message.toLowerCase().includes('statement timeout')) {
        const res2 = await supabase
          .from('products')
          .select('id,code,name,price,category,subcategory,stock,image_url,image_urls,is_hidden,created_at,deleted_at')
          .is('deleted_at', null)
          .limit(150);
        if ((res2 as any).error) throw (res2 as any).error;
        data = (res2 as any).data || [];
      } else {
        throw error;
      }
    }

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

    cachedProducts = mapped;
    cachedAt = now;

    return NextResponse.json({ success: true, data: mapped });
  } catch (e: any) {
    if (cachedProducts) {
      return NextResponse.json({ success: true, data: cachedProducts });
    }
    return NextResponse.json({ success: false, error: e?.message || 'Failed to fetch products' }, { status: 500 });
  }
}
