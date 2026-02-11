
'use server';

import { db } from '@/lib/db';
import { User, StockAudit, Avaria } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { createClient } from '@supabase/supabase-js';

// --- Stock Audit ---

export async function saveStockAuditAction(audit: StockAudit, user: User | null) {
    try {
        await db.stockAudit.create({
            data: {
                id: audit.id, // e.g., "audit-2023-12"
                month: audit.month,
                year: audit.year,
                createdAt: new Date().toISOString(),
                auditedBy: user?.id || 'system',
                auditedByName: user?.name || 'Sistema',
                products: audit.products as any
            }
        });
        revalidatePath('/admin/auditoria');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getStockAuditsAction() {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const { data, error } = await supabase
            .from('stock_audits')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(24);
        if (error) throw error;
        const mapped: StockAudit[] = (data || []).map((a: any) => ({
            id: a.id,
            month: a.month,
            year: a.year,
            createdAt: a.created_at,
            auditedBy: a.audited_by,
            auditedByName: a.audited_by_name,
            products: Array.isArray(a.products) ? a.products : [],
        }));
        return { success: true, data: mapped };
    } catch {
        try {
            const audits = await db.stockAudit.findMany({
                orderBy: { createdAt: 'desc' },
                take: 24
            });
            return { success: true, data: audits as unknown as StockAudit[] };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }
}

// --- Avarias ---

export async function addAvariaAction(avaria: any, user: User | null) {
    try {
        await db.avaria.create({
            data: {
                ...avaria,
                createdAt: new Date().toISOString(),
                createdBy: user?.id || 'unknown',
                createdByName: user?.name || 'Desconhecido'
            }
        });
        revalidatePath('/admin/avarias');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updateAvariaAction(id: string, data: any, user: User | null) {
    try {
        await db.avaria.update({
            where: { id },
            data: data
        });
        revalidatePath('/admin/avarias');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteAvariaAction(id: string, user: User | null) {
    try {
        await db.avaria.delete({
            where: { id }
        });
        revalidatePath('/admin/avarias');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getAvariasAction() {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const { data, error } = await supabase
            .from('avarias')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        const mapped: Avaria[] = (data || []).map((a: any) => ({
            id: a.id,
            createdAt: a.created_at,
            createdBy: a.created_by,
            createdByName: a.created_by_name,
            customerId: a.customer_id,
            customerName: a.customer_name,
            productId: a.product_id,
            productName: a.product_name,
            description: a.description,
        }));
        return { success: true, data: mapped };
    } catch {
        try {
            const avarias = await db.avaria.findMany({
                orderBy: { id: 'desc' }
            });
            return { success: true, data: avarias as unknown as Avaria[] };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }
}
