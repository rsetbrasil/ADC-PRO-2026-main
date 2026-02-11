'use server';

import { db } from '@/lib/db';
import { CustomerInfo, User } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { createClient } from '@supabase/supabase-js';

export async function addCustomerAction(customerData: CustomerInfo, user: User | null) {
    try {
        // Basic add logic
        const code = customerData.code || `CLI-${Date.now()}`;
        await db.customer.create({
            data: {
                ...customerData,
                code,
                id: customerData.id || `CUST-${Date.now()}`
            }
        });
        revalidatePath('/admin/clientes');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}


export async function getCustomersAction() {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const { data, error } = await supabase
            .from('customers')
            .select('*')
            .order('name', { ascending: true });
        if (error) throw error;
        const mapped: CustomerInfo[] = (data || []).map((c: any) => ({
            id: c.id,
            code: c.code || undefined,
            name: c.name,
            cpf: c.cpf || undefined,
            phone: c.phone || '',
            phone2: c.phone2 || undefined,
            phone3: c.phone3 || undefined,
            email: c.email || undefined,
            zip: c.zip || '',
            address: c.address || '',
            number: c.number || '',
            complement: c.complement || undefined,
            neighborhood: c.neighborhood || '',
            city: c.city || '',
            state: c.state || '',
            password: c.password || undefined,
            observations: c.observations || undefined,
            sellerId: c.sellerId || undefined,
            sellerName: c.sellerName || undefined,
            blocked: !!c.blocked,
            blockedReason: c.blockedReason || undefined,
            rating: c.rating ?? undefined,
        }));
        return { success: true, data: mapped };
    } catch {
        try {
            const customers = await db.customer.findMany({
                orderBy: { name: 'asc' }
            });
            return { success: true, data: customers as unknown as CustomerInfo[] };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }
}

export async function updateCustomerAction(customerData: CustomerInfo, user: User | null) {
    try {
        await db.customer.update({
            where: { id: customerData.id },
            data: customerData
        });
        revalidatePath('/admin/clientes');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteCustomerAction(id: string, user: User | null) {
    try {
        await db.customer.update({
            where: { id },
            data: {
                blocked: true,
                blockedReason: 'Excluído',
                // Soft delete logic can be enhanced
            }
        });
        // Or actually delete: await db.customer.delete({ where: { id } });
        revalidatePath('/admin/clientes');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}


export async function generateCustomerCodesAction(user: User | null) {
    try {
        const customersWithoutCode = await db.customer.findMany({
            where: { OR: [{ code: null }, { code: '' }] },
            orderBy: { createdAt: 'asc' }
        });

        let updatedCount = 0;
        // Simple sequential strategy: find last code or start from 1
        // For robustness, simply using Timestamp or a counter in a transaction is better, 
        // but here we iterate. To be safe, we can use a prefix.

        // Let's rely on date largely for now to avoid collision or a complex seq table
        for (const cust of customersWithoutCode) {
            const code = `CLI-${cust.createdAt.toISOString().slice(0, 4)}-${cust.id.slice(0, 4).toUpperCase()}`;
            await db.customer.update({
                where: { id: cust.id },
                data: { code }
            });
            updatedCount++;
        }

        revalidatePath('/admin/clientes');
        return { success: true, count: updatedCount };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
