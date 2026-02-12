'use server';

import { Product, User } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { createClient } from '@supabase/supabase-js';

let cachedProductsColumnStyle: 'camel' | 'snake' | null = null;

const getSupabaseAdmin = () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !key) {
        throw new Error('Supabase env ausente (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY)');
    }
    return createClient(supabaseUrl, key, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
};

async function getProductsColumnStyle(): Promise<'camel' | 'snake'> {
    if (cachedProductsColumnStyle) return cachedProductsColumnStyle;
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from('products').select('*').limit(1);
    if (error) throw error;
    const row = data?.[0] ?? {};
    if ('on_sale' in row || 'min_stock' in row || 'long_description' in row || 'is_hidden' in row) {
        cachedProductsColumnStyle = 'snake';
        return 'snake';
    }
    cachedProductsColumnStyle = 'camel';
    return 'camel';
}

function mapProductToDb(product: Partial<Product>, style: 'camel' | 'snake'): Record<string, any> {
    const out: Record<string, any> = {};

    if (product.code !== undefined) out.code = product.code || null;
    if (product.name !== undefined) out.name = product.name;
    if (product.description !== undefined) out.description = product.description || null;
    if (product.category !== undefined) out.category = product.category || null;
    if (product.subcategory !== undefined) out.subcategory = product.subcategory || null;

    if (product.price !== undefined) out.price = Number(product.price || 0);
    if (product.cost !== undefined) out.cost = product.cost === undefined ? null : Number(product.cost || 0);
    if (product.stock !== undefined) out.stock = Number(product.stock || 0);

    if (product.longDescription !== undefined)
        out[style === 'snake' ? 'long_description' : 'longDescription'] = product.longDescription || null;
    if (product.originalPrice !== undefined)
        out[style === 'snake' ? 'original_price' : 'originalPrice'] =
            product.originalPrice === undefined ? null : Number(product.originalPrice || 0);
    if (product.onSale !== undefined) out[style === 'snake' ? 'on_sale' : 'onSale'] = !!product.onSale;
    if (product.promotionEndDate !== undefined)
        out[style === 'snake' ? 'promotion_end_date' : 'promotionEndDate'] = product.promotionEndDate || null;
    if (product.isHidden !== undefined) out[style === 'snake' ? 'is_hidden' : 'isHidden'] = !!product.isHidden;
    if (product.minStock !== undefined)
        out[style === 'snake' ? 'min_stock' : 'minStock'] = product.minStock === undefined ? null : Number(product.minStock || 0);
    if (product.unit !== undefined) out.unit = product.unit || null;

    if (product.imageUrl !== undefined) out[style === 'snake' ? 'image_url' : 'imageUrl'] = product.imageUrl || null;
    if (product.imageUrls !== undefined)
        out[style === 'snake' ? 'image_urls' : 'imageUrls'] = Array.isArray(product.imageUrls) ? product.imageUrls : [];

    if (product.maxInstallments !== undefined)
        out[style === 'snake' ? 'max_installments' : 'maxInstallments'] =
            product.maxInstallments === undefined ? null : Number(product.maxInstallments || 0);
    if (product.paymentCondition !== undefined)
        out[style === 'snake' ? 'payment_condition' : 'paymentCondition'] = product.paymentCondition || null;
    if (product.commissionType !== undefined)
        out[style === 'snake' ? 'commission_type' : 'commissionType'] = product.commissionType || null;
    if (product.commissionValue !== undefined)
        out[style === 'snake' ? 'commission_value' : 'commissionValue'] =
            product.commissionValue === undefined ? null : Number(product.commissionValue || 0);

    if ((product as any)['data-ai-hint'] !== undefined) {
        out[style === 'snake' ? 'data_ai_hint' : 'dataAiHint'] = (product as any)['data-ai-hint'] || null;
    }

    out.updated_at = new Date().toISOString();
    return out;
}

export async function addProductAction(productData: any, user: User | null) {
    try {
        const supabase = getSupabaseAdmin();
        const style = await getProductsColumnStyle();

        const newProductId = `PROD-${Date.now().toString().slice(-6)}`;
        const newProductCode = Date.now().toString().slice(-6);

        const payload = mapProductToDb(
            {
                ...(productData || {}),
                id: newProductId,
                code: productData?.code || newProductCode,
                'data-ai-hint': String(productData?.name || '')
                    .toLowerCase()
                    .split(' ')
                    .filter(Boolean)
                    .slice(0, 2)
                    .join(' '),
            } as any,
            style
        );
        payload.id = newProductId;
        payload.created_at = new Date().toISOString();

        const { error } = await supabase.from('products').insert(payload);
        if (error) throw error;
        revalidatePath('/admin/produtos');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updateProductAction(product: Product, user: User | null) {
    try {
        const supabase = getSupabaseAdmin();
        const style = await getProductsColumnStyle();

        const { id, ...rest } = product;
        const payload = mapProductToDb(rest, style);
        const { error } = await supabase.from('products').update(payload).eq('id', id);
        if (error) throw error;
        revalidatePath('/admin/produtos');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteProductAction(productId: string, user: User | null) {
    try {
        const supabase = getSupabaseAdmin();
        const style = await getProductsColumnStyle();
        const now = new Date().toISOString();
        const deletedKey = style === 'snake' ? 'deleted_at' : 'deletedAt';
        const payload: Record<string, any> = { [deletedKey]: now, updated_at: now };

        const { error } = await supabase.from('products').update(payload).eq('id', productId);
        if (error) throw error;
        revalidatePath('/admin/produtos');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
