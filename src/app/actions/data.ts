'use server';

import { db } from '@/lib/db';
import { unstable_noStore as noStore } from 'next/cache';
import { Product, Category } from '@/lib/types';
import { createClient } from '@supabase/supabase-js';

export async function getProductsAction() {
    noStore(); // Disable cache
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const { data, error: sError } = await supabase
            .from('products')
            .select('*')
            .is('deleted_at', null)
            .order('created_at', { ascending: false });
        if (sError) throw sError;
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
        return { success: true, data: mapped };
    } catch {
        try {
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
            const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
            const supabase = createClient(supabaseUrl, supabaseServiceKey);
            const { data, error: sError } = await supabase
                .from('products')
                .select('*')
                .is('deleted_at', null)
                .order('created_at', { ascending: false });
            if (sError) throw sError;
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
            return { success: true, data: mapped };
        } catch {
            try {
                const allProducts = await db.product.findMany({
                    where: { deletedAt: null },
                    orderBy: { createdAt: 'desc' }
                });
                return { success: true, data: allProducts as unknown as Product[] };
            } catch (error: any) {
                return { success: false, error: error.message };
            }
        }
    }
}

export async function getCategoriesAction() {
    noStore();
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const { data, error: sError } = await supabase
            .from('categories')
            .select('*')
            .order('order', { ascending: true });
        if (sError) throw sError;
        const mapped: Category[] = (data || []).map((c: any) => ({
            id: c.id,
            name: c.name,
            order: Number(c.order || 0),
            subcategories: Array.isArray(c.subcategories) ? c.subcategories : [],
        }));
        return { success: true, data: mapped };
    } catch {
        try {
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
            const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
            const supabase = createClient(supabaseUrl, supabaseServiceKey);
            const { data, error: sError } = await supabase
                .from('categories')
                .select('*')
                .order('order', { ascending: true });
            if (sError) throw sError;
            const mapped: Category[] = (data || []).map((c: any) => ({
                id: c.id,
                name: c.name,
                order: Number(c.order || 0),
                subcategories: Array.isArray(c.subcategories) ? c.subcategories : [],
            }));
            return { success: true, data: mapped };
        } catch {
            try {
                const allCategories = await db.category.findMany({
                    orderBy: { order: 'asc' }
                });
                return { success: true, data: allCategories as unknown as Category[] };
            } catch (error: any) {
                return { success: false, error: error.message };
            }
        }
    }
}
