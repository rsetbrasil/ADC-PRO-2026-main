
'use server';

import { db } from '@/lib/db';
import { User, Product, CustomerInfo } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { createClient } from '@supabase/supabase-js';

const getSupabaseAdmin = () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error('Supabase env ausente (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY)');
    }
    return createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
};

const onlyDigits = (value?: string) => String(value || '').replace(/\D/g, '');

// --- Resets ---

export async function resetOrdersAction(user: User | null) {
    try {
        await db.order.deleteMany({});
        await db.commissionPayment.deleteMany({});
        revalidatePath('/admin/pedidos');
        revalidatePath('/admin/financeiro');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function resetProductsAction(user: User | null) {
    try {
        await db.product.deleteMany({});
        await db.category.deleteMany({});
        revalidatePath('/admin/produtos');
        revalidatePath('/admin/categorias');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function resetFinancialsAction(user: User | null) {
    try {
        await db.commissionPayment.deleteMany({});
        // Potentially reset financial fields in orders without deleting orders
        await db.order.updateMany({
            data: {
                commissionPaid: false,
                commissionDate: null
            }
        });
        revalidatePath('/admin/financeiro');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function resetAllAdminDataAction(user: User | null) {
    try {
        const tx: any[] = [
            db.order.deleteMany({}),
            db.product.deleteMany({}),
            db.customer.deleteMany({}),
            db.category.deleteMany({}),
            db.commissionPayment.deleteMany({}),
            db.stockAudit.deleteMany({}),
            db.avaria.deleteMany({}),
        ];

        const anyDb = db as any;
        if (anyDb.cashSession?.deleteMany) tx.push(anyDb.cashSession.deleteMany({}));
        if (anyDb.chatSession?.deleteMany) tx.push(anyDb.chatSession.deleteMany({}));
        if (anyDb.chatMessage?.deleteMany) tx.push(anyDb.chatMessage.deleteMany({}));

        await db.$transaction(tx);
        revalidatePath('/admin');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// --- Imports ---

export async function importProductsAction(products: Product[], user: User | null) {
    try {
        // Bulk create is efficient
        // Prisma createMany is supported in Postgres
        const productsToCreate = products.map(p => ({
            id: p.id || `PROD-${Math.random().toString(36).substr(2, 9)}`,
            name: p.name,
            code: p.code,
            description: p.description,
            longDescription: p.longDescription,
            price: p.price,
            originalPrice: p.originalPrice,
            cost: p.cost,
            onSale: p.onSale,
            isHidden: p.isHidden,
            category: p.category,
            subcategory: p.subcategory,
            stock: p.stock,
            imageUrls: p.imageUrls || (p.imageUrl ? [p.imageUrl] : []),
            maxInstallments: p.maxInstallments,
            paymentCondition: p.paymentCondition,
            commissionType: p.commissionType,
            commissionValue: p.commissionValue,
            createdAt: new Date().toISOString()
        }));

        await db.product.createMany({
            data: productsToCreate,
            skipDuplicates: true
        });

        // Also ensure categories exist
        const uniqueCategories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));
        for (const catName of uniqueCategories) {
            const exists = await db.category.findFirst({ where: { name: catName } });
            if (!exists) {
                await db.category.create({
                    data: {
                        name: catName,
                        subcategories: []
                    }
                });
            }
        }

        revalidatePath('/admin/produtos');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function importCustomersAction(customers: CustomerInfo[], user: User | null) {
    try {
        const supabase = getSupabaseAdmin();

        const customersToUpsert = customers.map((c) => ({
            id: c.id || onlyDigits(c.cpf) || `CUST-${Math.random().toString(36).slice(2, 11)}`,
            name: c.name,
            code: c.code || null,
            cpf: c.cpf || null,
            phone: c.phone || '',
            phone2: c.phone2 || null,
            phone3: c.phone3 || null,
            email: c.email || null,
            address: c.address || null,
            zip: c.zip || null,
            number: c.number || null,
            complement: c.complement || null,
            neighborhood: c.neighborhood || null,
            city: c.city || null,
            state: c.state || null,
            password: c.password || null,
            observations: c.observations || null,
            sellerId: c.sellerId || null,
            sellerName: c.sellerName || null,
            blocked: !!c.blocked,
            blockedReason: c.blockedReason || null,
            rating: c.rating ?? null,
        }));

        const { error } = await supabase
            .from('customers')
            .upsert(customersToUpsert, { onConflict: 'id' });
        if (error) throw error;

        revalidatePath('/admin/clientes');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// --- Trash Management ---

export async function emptyTrashAction(user: User | null) {
    try {
        // Permanently delete soft-deleted items
        await db.product.deleteMany({
            where: { deletedAt: { not: null } }
        });
        revalidatePath('/admin/produtos');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function restoreProductAction(id: string, user: User | null) {
    try {
        await db.product.update({
            where: { id },
            data: { deletedAt: null }
        });
        revalidatePath('/admin/produtos');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function permanentlyDeleteProductWithIdAction(id: string, user: User | null) {
    try {
        await db.product.delete({
            where: { id }
        });
        revalidatePath('/admin/produtos');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function fetchDeletedProductsAction() {
    try {
        const products = await db.product.findMany({
            where: { deletedAt: { not: null } }
        });
        return { success: true, data: products as unknown as Product[] };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
