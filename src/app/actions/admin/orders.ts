'use server';

import { Order, User } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import { mapDbOrderToOrder, mapOrderPatchToDb } from '@/lib/supabase-mappers';

let cachedOrdersColumnStyle: 'camel' | 'snake' | null = null;

async function getOrdersExistingColumns(supabase: any): Promise<Set<string> | null> {
    try {
        const { data, error } = await supabase.from('orders').select('*').limit(1);
        if (error) return null;
        const row = (data || [])[0] as Record<string, any> | undefined;
        if (!row) return null;
        return new Set(Object.keys(row));
    } catch {
        return null;
    }
}

function filterPayloadByColumns(payload: Record<string, any>, columns: Set<string> | null): Record<string, any> {
    if (!columns || columns.size === 0) return payload;
    const out: Record<string, any> = {};
    for (const [key, value] of Object.entries(payload)) {
        if (columns.has(key)) out[key] = value;
    }
    return out;
}

function calculateCommissionFromItems(items: any[], productCommission: Map<string, { type: string | null; value: number | null }>, fallbackPercentage = 5) {
    const toNumber = (value: unknown) => {
        if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
        if (typeof value === 'string') {
            const normalized = value
                .replace(/\s/g, '')
                .replace(/^R\$/i, '')
                .replace(/\./g, '')
                .replace(',', '.');
            const parsed = Number.parseFloat(normalized);
            return Number.isFinite(parsed) ? parsed : 0;
        }
        return 0;
    };

    return (items || []).reduce((total: number, item: any) => {
        const id = String(item?.id || '');
        const quantity = toNumber(item?.quantity);
        const price = toNumber(item?.price);
        const itemTotal = price * quantity;

        const cfg = productCommission.get(id);
        const hasExplicitValue = cfg && typeof cfg.value === 'number' && Number.isFinite(cfg.value) && cfg.value > 0;
        const commissionType = hasExplicitValue ? (cfg!.type || 'percentage') : 'percentage';
        const commissionValue = hasExplicitValue ? cfg!.value! : fallbackPercentage;

        if (commissionType === 'fixed') {
            return total + commissionValue * quantity;
        }

        return total + itemTotal * (commissionValue / 100);
    }, 0);
}

async function detectOrdersColumnStyle(supabase: any): Promise<'camel' | 'snake'> {
    if (cachedOrdersColumnStyle) return cachedOrdersColumnStyle;
    const { data, error } = await supabase.from('orders').select('*').limit(1);
    if (error) throw error;
    const row = (data || [])[0] as Record<string, any> | undefined;
    if (!row) {
        cachedOrdersColumnStyle = 'camel';
        return cachedOrdersColumnStyle;
    }
    const keys = Object.keys(row);
    cachedOrdersColumnStyle = keys.some((k) => k.includes('_')) ? 'snake' : 'camel';
    return cachedOrdersColumnStyle;
}

// Fetch all orders
export async function getAdminOrdersAction() {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const style = await detectOrdersColumnStyle(supabase);
        const attempt = async (orderBy: string) => {
            const { data, error } = await supabase
                .from('orders')
                .select('*')
                .order(orderBy, { ascending: false });
            if (error) throw error;
            return (data || []).map(mapDbOrderToOrder);
        };

        try {
            const orders = await attempt(style === 'snake' ? 'created_at' : 'createdAt');
            return { success: true, data: orders };
        } catch {
            try {
                const orders = await attempt(style === 'snake' ? 'date' : 'date');
                return { success: true, data: orders };
            } catch {
                const orders = await attempt('date');
                return { success: true, data: orders };
            }
        }
    } catch (error: any) {
        return { success: false, error: error?.message || 'Falha ao buscar pedidos' };
    }
}
// Update Order Status
export async function updateOrderStatusAction(orderId: string, status: Order['status'], user: User | null) {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const style = await detectOrdersColumnStyle(supabase);

        const { data: row, error: fetchError } = await supabase
            .from('orders')
            .select('*')
            .eq('id', orderId)
            .maybeSingle();
        if (fetchError) throw fetchError;
        if (!row) throw new Error('Order not found');

        const existingColumns = new Set(Object.keys(row as any));
        const current = mapDbOrderToOrder(row);

        if (status === 'Entregue') {
            let sellerId = current.sellerId || undefined;
            let sellerName = current.sellerName || undefined;

            if (!sellerId && sellerName) {
                const { data: matchedUser, error: userError } = await supabase
                    .from('users')
                    .select('id,name')
                    .eq('name', sellerName)
                    .limit(1)
                    .maybeSingle();
                if (userError) throw userError;
                if (matchedUser?.id) {
                    sellerId = matchedUser.id;
                    sellerName = matchedUser.name;
                }
            }

            const shouldComputeCommission =
                current.isCommissionManual !== true &&
                (!Number.isFinite(current.commission as any) || (current.commission ?? 0) <= 0) &&
                !!sellerId;

            if (shouldComputeCommission) {
                const items = (current.items as any) || [];
                const itemIds: string[] = Array.from(
                    new Set<string>((items || []).map((i: any) => String(i?.id || '')).filter(Boolean))
                );

                let productsRows: any[] = [];
                try {
                     const { data, error } = itemIds.length
                        ? await supabase
                            .from('products')
                            .select('id,commission_type,commission_value,commissionType,commissionValue')
                            .in('id', itemIds)
                        : { data: [], error: null };
                    if (error) {
                        console.warn('Falha ao buscar produtos para comissão (ignorado):', error.message);
                    } else {
                        productsRows = data || [];
                    }
                } catch (err: any) {
                    console.warn('Exceção ao buscar produtos para comissão (ignorado):', err.message);
                }

                const productCommission = new Map(
                    (productsRows || []).map((p: any) => [
                        String(p.id),
                        {
                            type: (p.commission_type ?? p.commissionType ?? null) as any,
                            value: (p.commission_value ?? p.commissionValue ?? null) as any,
                        },
                    ])
                );
                const commission = calculateCommissionFromItems(items, productCommission);

                const patch: Partial<Order> = {
                    status,
                    commission,
                };
                if (sellerId && sellerId !== current.sellerId) patch.sellerId = sellerId;
                if (sellerName && sellerName !== current.sellerName) patch.sellerName = sellerName;

                const payloadRaw = mapOrderPatchToDb(patch, style);
                const payload = filterPayloadByColumns(payloadRaw, existingColumns);
                const { error } = await supabase.from('orders').update(payload).eq('id', orderId);
                if (error) throw error;

                revalidatePath('/admin/pedidos');
                return { success: true };
            }
        }

        const payloadRaw = mapOrderPatchToDb({ status }, style);
        const payload = filterPayloadByColumns(payloadRaw, existingColumns);
        const { error } = await supabase.from('orders').update(payload).eq('id', orderId);
        if (error) throw error;

        revalidatePath('/admin/pedidos');
        return { success: true };
    } catch (error: any) {
        // Fallback: If anything failed (e.g. fetching order details or products), try a blind status update
        // This ensures the user can at least change the status even if commission calculation fails.
        try {
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
            const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
            const supabase = createClient(supabaseUrl, supabaseServiceKey);
            
            console.warn('Fallback: Atualizando status sem recálculos devido a erro:', error?.message);
            const { error: fallbackError } = await supabase
                .from('orders')
                .update({ status })
                .eq('id', orderId);
            
            if (fallbackError) throw fallbackError;
            
            revalidatePath('/admin/pedidos');
            return { success: true };
        } catch (finalError: any) {
            return { success: false, error: finalError?.message || 'Falha crítica ao atualizar status' };
        }
    }
}

export async function moveOrderToTrashAction(orderId: string) {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const { error } = await supabase
            .from('orders')
            .update({ status: 'Excluído' })
            .eq('id', orderId);
        if (error) throw error;
        revalidatePath('/admin/pedidos');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error?.message || 'Falha ao mover para lixeira' };
    }
}

export async function permanentlyDeleteOrderAction(orderId: string) {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const { error } = await supabase
            .from('orders')
            .delete()
            .eq('id', orderId);
        if (error) throw error;
        revalidatePath('/admin/pedidos');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error?.message || 'Falha ao excluir pedido' };
    }
}

// Installment Payments
export async function recordInstallmentPaymentAction(orderId: string, installmentNumber: number, payment: any) {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const style = await detectOrdersColumnStyle(supabase);
        const column = style === 'snake' ? 'installment_details' : 'installmentDetails';
        const { data: order, error: fError } = await supabase
                .from('orders')
                .select(column)
                .eq('id', orderId)
                .maybeSingle();
        if (fError) throw fError;
        if (!order) throw new Error('Order not found');
        const installments = ((order as any)[column] as any) || [];
        const updatedInstallments = installments.map((inst: any) => {
            if (inst.installmentNumber === installmentNumber) {
                const currentPaid = inst.paidAmount || 0;
                const newPaid = currentPaid + payment.amount;
                const newStatus = newPaid >= inst.amount ? 'Pago' : 'Parcial';
                return {
                    ...inst,
                    paidAmount: newPaid,
                    status: newStatus,
                    payments: [...(inst.payments || []), payment]
                };
            }
            return inst;
        });
        const { error } = await supabase
            .from('orders')
            .update({ [column]: updatedInstallments })
            .eq('id', orderId);
        if (error) throw error;

        revalidatePath('/admin/pedidos');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error?.message || 'Falha ao registrar pagamento da parcela' };
    }
}

// Update Order Details (General)
export async function updateOrderDetailsAction(orderId: string, data: Partial<Order>) {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const style = await detectOrdersColumnStyle(supabase);
        const existingColumns = await getOrdersExistingColumns(supabase);
        const payloadRaw = mapOrderPatchToDb(data, style);
        const payload = filterPayloadByColumns(payloadRaw, existingColumns);
        const { error } = await supabase
            .from('orders')
            .update(payload)
            .eq('id', orderId);
        if (error) throw error;
        revalidatePath('/admin/pedidos');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error?.message || 'Falha ao atualizar pedido' };
    }
}
