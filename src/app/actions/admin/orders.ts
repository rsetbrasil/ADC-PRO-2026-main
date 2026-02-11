'use server';

import { db } from '@/lib/db';
import { Order, User } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { createClient } from '@supabase/supabase-js';

// Fetch all orders
export async function getAdminOrdersAction() {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return { success: true, data: (data || []) as unknown as Order[] };
    } catch {
        try {
            const allOrders = await db.order.findMany({
                orderBy: { date: 'desc' }
            });
            return { success: true, data: allOrders as unknown as Order[] };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }
}
// Update Order Status
export async function updateOrderStatusAction(orderId: string, status: Order['status'], user: User | null) {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const { error } = await supabase
            .from('orders')
            .update({ status })
            .eq('id', orderId);
        if (error) throw error;
        revalidatePath('/admin/pedidos');
        return { success: true };
    } catch {
        try {
            await db.order.update({
                where: { id: orderId },
                data: { status }
            });
            revalidatePath('/admin/pedidos');
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
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
    } catch {
        try {
            await db.order.update({
                where: { id: orderId },
                data: { status: 'Excluído' }
            });
            revalidatePath('/admin/pedidos');
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
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
    } catch {
        try {
            await db.order.delete({
                where: { id: orderId }
            });
            revalidatePath('/admin/pedidos');
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }
}

// Installment Payments
export async function recordInstallmentPaymentAction(orderId: string, installmentNumber: number, payment: any) {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const { data: order, error: fError } = await supabase
            .from('orders')
            .select('installmentDetails')
            .eq('id', orderId)
            .maybeSingle();
        if (fError) throw fError;
        if (!order) throw new Error('Order not found');
        const installments = (order.installmentDetails as any) || [];
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
            .update({ installmentDetails: updatedInstallments })
            .eq('id', orderId);
        if (error) throw error;

        revalidatePath('/admin/pedidos');
    } catch {
        try {
            const order = await db.order.findUnique({
                where: { id: orderId }
            });
            if (!order) throw new Error('Order not found');
            const installments = (order.installmentDetails as any) || [];
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
            await db.order.update({
                where: { id: orderId },
                data: { installmentDetails: updatedInstallments }
            });
            revalidatePath('/admin/pedidos');
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }
}

// Update Order Details (General)
export async function updateOrderDetailsAction(orderId: string, data: Partial<Order>) {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const payload: any = {};
        if (data.status !== undefined) payload.status = data.status;
        if (data.customer !== undefined) payload.customer = data.customer as any;
        if (data.items !== undefined) payload.items = data.items as any;
        if (data.total !== undefined) payload.total = data.total;
        if (data.discount !== undefined) payload.discount = data.discount;
        if (data.downPayment !== undefined) payload.downPayment = data.downPayment;
        if (data.installments !== undefined) payload.installments = data.installments;
        if (data.installmentValue !== undefined) payload.installmentValue = data.installmentValue;
        if (data.date !== undefined) payload.date = data.date;
        if (data.firstDueDate !== undefined) payload.firstDueDate = data.firstDueDate as any;
        if (data.paymentMethod !== undefined) payload.paymentMethod = data.paymentMethod as any;
        if (data.installmentDetails !== undefined) payload.installmentDetails = data.installmentDetails as any;
        if (data.attachments !== undefined) payload.attachments = data.attachments as any;
        if (data.sellerId !== undefined) payload.sellerId = data.sellerId;
        if (data.sellerName !== undefined) payload.sellerName = data.sellerName;
        if (data.commission !== undefined) payload.commission = data.commission;
        if (data.commissionPaid !== undefined) payload.commissionPaid = data.commissionPaid as any;
        if (data.isCommissionManual !== undefined) payload.isCommissionManual = data.isCommissionManual as any;
        if (data.observations !== undefined) payload.observations = data.observations;
        if (data.source !== undefined) payload.source = data.source as any;
        if (data.createdById !== undefined) payload.createdById = data.createdById;
        if (data.createdByName !== undefined) payload.createdByName = data.createdByName;
        if (data.createdByRole !== undefined) payload.createdByRole = data.createdByRole as any;
        if (data.createdIp !== undefined) payload.createdIp = data.createdIp;
        if (data.asaas !== undefined) payload.asaas = data.asaas as any;
        const { error } = await supabase
            .from('orders')
            .update(payload)
            .eq('id', orderId);
        if (error) throw error;
        revalidatePath('/admin/pedidos');
        return { success: true };
    } catch {
        try {
            await db.order.update({
                where: { id: orderId },
                data: {
                    ...data,
                    installmentDetails: data.installmentDetails as any,
                    firstDueDate: data.firstDueDate instanceof Date ? data.firstDueDate.toISOString() : data.firstDueDate,
                    date: data.date,
                }
            });
            revalidatePath('/admin/pedidos');
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }
}
