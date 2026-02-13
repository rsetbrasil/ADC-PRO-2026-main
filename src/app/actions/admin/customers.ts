'use server';

import { CustomerInfo, User } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

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

function invalidateCustomersApiCache() {
    if (typeof globalThis !== 'undefined') {
        (globalThis as any).__adminCustomersApiCache = null;
    }
}

const mapDbCustomerToCustomerInfo = (c: any): CustomerInfo => ({
    id: String(c.id),
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
    sellerId: c.seller_id ?? c.sellerId ?? undefined,
    sellerName: c.seller_name ?? c.sellerName ?? undefined,
    blocked: !!c.blocked,
    blockedReason: c.blocked_reason ?? c.blockedReason ?? undefined,
    rating: c.rating ?? undefined,
});

export async function findCustomersAction(query: string) {
    try {
        const supabase = getSupabaseAdmin();
        const rawQuery = String(query || '').trim();
        if (!rawQuery) {
            return { success: true, data: [] as CustomerInfo[] };
        }
        const safeQuery = rawQuery.replace(/,/g, ' ');
        const cleanQuery = rawQuery.replace(/\D/g, '');
        const cpfLoosePattern = cleanQuery ? `%${cleanQuery.split('').join('%')}%` : '';
        
        let queryBuilder = supabase.from('customers').select('*').limit(50);

        if (cleanQuery.length >= 3) {
            queryBuilder = queryBuilder.or(`cpf.ilike.%${cleanQuery}%,cpf.ilike.%${safeQuery}%,cpf.ilike.${cpfLoosePattern},name.ilike.%${safeQuery}%`);
        } else {
            queryBuilder = queryBuilder.ilike('name', `%${safeQuery}%`);
        }

        const { data, error } = await queryBuilder;

        if (error) throw error;

        return { 
            success: true, 
            data: (data || []).map(mapDbCustomerToCustomerInfo) 
        };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function addCustomerAction(customerData: CustomerInfo, user: User | null) {
    try {
        const supabase = getSupabaseAdmin();

        const rawId = String(customerData.id || '').trim();
        const cpfDigits = onlyDigits(customerData.cpf);

        if (cpfDigits) {
            const { data: existingCustomer, error: existingError } = await supabase
                .from('customers')
                .select('*')
                .eq('cpf', cpfDigits)
                .maybeSingle();
            if (existingError) throw existingError;
            if (existingCustomer?.id) {
                return { success: false, error: 'Um cliente com este CPF já existe.', existingCustomer: mapDbCustomerToCustomerInfo(existingCustomer) };
            }
        }

        const id = (rawId ? rawId : null) || cpfDigits || randomUUID();
        const code = customerData.code || `CLI-${Date.now()}`;

        const { error } = await supabase.from('customers').insert({
            id,
            code,
            name: customerData.name,
            cpf: cpfDigits || null,
            phone: customerData.phone || '',
            phone2: customerData.phone2 || null,
            phone3: customerData.phone3 || null,
            email: customerData.email || null,
            zip: customerData.zip || null,
            address: customerData.address || null,
            number: customerData.number || null,
            complement: customerData.complement || null,
            neighborhood: customerData.neighborhood || null,
            city: customerData.city || null,
            state: customerData.state || null,
            password: customerData.password || null,
            observations: customerData.observations || null,
            sellerId: customerData.sellerId || null,
            sellerName: customerData.sellerName || null,
            blocked: !!customerData.blocked,
            blockedReason: customerData.blockedReason || null,
            rating: customerData.rating ?? null,
        });
        if (error) throw error;

        invalidateCustomersApiCache();
        revalidatePath('/admin/clientes');
        return { success: true, id };
    } catch (error: any) {
        const code = String(error?.code || '');
        const message = String(error?.message || '');
        if (code === '23505' || message.includes('customers_pkey') || message.toLowerCase().includes('duplicate key')) {
            try {
                const supabase = getSupabaseAdmin();
                const rawId = String(customerData.id || '').trim();
                const cpfDigits = onlyDigits(customerData.cpf);

                if (cpfDigits) {
                    const { data } = await supabase.from('customers').select('*').eq('cpf', cpfDigits).maybeSingle();
                    if (data?.id) {
                        return { success: false, error: 'Um cliente com este CPF já existe.', existingCustomer: mapDbCustomerToCustomerInfo(data) };
                    }
                }
                if (rawId) {
                    const { data } = await supabase.from('customers').select('*').eq('id', rawId).maybeSingle();
                    if (data?.id) {
                        return { success: false, error: 'Já existe um cliente com este ID.', existingCustomer: mapDbCustomerToCustomerInfo(data) };
                    }
                }
            } catch {
            }
            return { success: false, error: 'Já existe um cliente com este CPF ou ID.' };
        }
        return { success: false, error: message || 'Falha ao criar cliente' };
    }
}


export async function getCustomersAction() {
    try {
        const supabase = getSupabaseAdmin();
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
            sellerId: c.seller_id || c.sellerId || undefined,
            sellerName: c.seller_name || c.sellerName || undefined,
            blocked: !!c.blocked,
            blockedReason: c.blocked_reason || c.blockedReason || undefined,
            rating: c.rating ?? undefined,
        }));
        return { success: true, data: mapped };
    } catch (error: any) {
        return { success: false, error: error?.message || 'Falha ao buscar clientes' };
    }
}

export async function updateCustomerAction(customerData: CustomerInfo, user: User | null) {
    try {
        const supabase = getSupabaseAdmin();
        const cpfDigits = onlyDigits(customerData.cpf);

        const { error } = await supabase
            .from('customers')
            .update({
                code: customerData.code || null,
                name: customerData.name,
                cpf: cpfDigits || null,
                phone: customerData.phone || '',
                phone2: customerData.phone2 || null,
                phone3: customerData.phone3 || null,
                email: customerData.email || null,
                zip: customerData.zip || null,
                address: customerData.address || null,
                number: customerData.number || null,
                complement: customerData.complement || null,
                neighborhood: customerData.neighborhood || null,
                city: customerData.city || null,
                state: customerData.state || null,
                ...(customerData.password !== undefined ? { password: customerData.password || null } : {}),
                observations: customerData.observations || null,
                sellerId: customerData.sellerId || null,
                sellerName: customerData.sellerName || null,
                blocked: !!customerData.blocked,
                blockedReason: customerData.blockedReason || null,
                rating: customerData.rating ?? null,
            })
            .eq('id', customerData.id);
        if (error) throw error;

        invalidateCustomersApiCache();
        revalidatePath('/admin/clientes');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error?.message || 'Falha ao atualizar cliente' };
    }
}

export async function deleteCustomerAction(id: string, user: User | null) {
    try {
        const supabase = getSupabaseAdmin();

        const { error } = await supabase
            .from('customers')
            .update({ blocked: true, blockedReason: 'Excluído' })
            .eq('id', id);
        if (error) throw error;

        invalidateCustomersApiCache();
        revalidatePath('/admin/clientes');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error?.message || 'Falha ao bloquear cliente' };
    }
}

export async function permanentlyDeleteCustomerAction(id: string, user: User | null) {
    try {
        if (user?.role !== 'admin') {
            return { success: false, error: 'Sem permissão para excluir permanentemente.' };
        }

        const supabase = getSupabaseAdmin();
        const { error } = await supabase.from('customers').delete().eq('id', id);
        if (error) throw error;

        invalidateCustomersApiCache();
        revalidatePath('/admin/clientes');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error?.message || 'Falha ao excluir cliente permanentemente' };
    }
}


export async function generateCustomerCodesAction(user: User | null) {
    try {
        const supabase = getSupabaseAdmin();

        const { data, error } = await supabase
            .from('customers')
            .select('id,code,created_at')
            .or('code.is.null,code.eq.')
            .order('created_at', { ascending: true });
        if (error) throw error;

        let updatedCount = 0;
        for (const cust of data || []) {
            const createdAt = cust.created_at ? new Date(cust.created_at) : new Date();
            const code = `CLI-${createdAt.toISOString().slice(0, 4)}-${String(cust.id).slice(0, 4).toUpperCase()}`;
            const { error: uErr } = await supabase.from('customers').update({ code }).eq('id', cust.id);
            if (uErr) throw uErr;
            updatedCount++;
        }

        invalidateCustomersApiCache();
        revalidatePath('/admin/clientes');
        return { success: true, count: updatedCount };
    } catch (error: any) {
        return { success: false, error: error?.message || 'Falha ao gerar códigos' };
    }
}
