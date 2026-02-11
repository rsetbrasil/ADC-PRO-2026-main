
'use server';

import { db } from '@/lib/db';
import { User, CommissionPayment } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { createClient } from '@supabase/supabase-js';

export async function payCommissionAction(sellerId: string, sellerName: string, amount: number, orderIds: string[], period: string, user: User | null) {
    try {
        const payment = await db.$transaction(async (tx: any) => {
            // 1. Create Commission Payment Record
            const newPayment = await tx.commissionPayment.create({
                data: {
                    sellerId,
                    sellerName,
                    amount,
                    period,
                    paymentDate: new Date().toISOString(),
                    orderIds: orderIds as any
                }
            });

            // 2. Mark orders as Paid
            if (orderIds.length > 0) {
                // Prisma doesn't support updateMany with where in list for Json fields easily without raw, 
                // but here we are updating a scalar 'commissionPaid' based on ID.
                await tx.order.updateMany({
                    where: {
                        id: { in: orderIds }
                    },
                    data: {
                        commissionPaid: true,
                        commissionDate: new Date().toISOString()
                    }
                });
            }
            return newPayment;
        });

        revalidatePath('/admin/financeiro');
        revalidatePath('/admin/minhas-comissoes');
        return { success: true, data: payment.id };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function reverseCommissionPaymentAction(paymentId: string, user: User | null) {
    try {
        await db.$transaction(async (tx: any) => {
            const payment = await tx.commissionPayment.findUnique({ where: { id: paymentId } });
            if (!payment) throw new Error('Payment not found');

            const orderIds = payment.orderIds as string[];

            // 1. Revert orders
            if (orderIds && orderIds.length > 0) {
                await tx.order.updateMany({
                    where: { id: { in: orderIds } },
                    data: { commissionPaid: false, commissionDate: null }
                });
            }

            // 2. Delete payment record
            await tx.commissionPayment.delete({ where: { id: paymentId } });
        });

        revalidatePath('/admin/financeiro');
        revalidatePath('/admin/minhas-comissoes');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getCommissionPaymentsAction() {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        const { data, error } = await supabase
            .from('commission_payments')
            .select('*')
            .order('payment_date', { ascending: false });
        if (error) throw error;
        const mapped: CommissionPayment[] = (data || []).map((p: any) => ({
            id: p.id,
            sellerId: p.seller_id,
            sellerName: p.seller_name,
            amount: Number(p.amount || 0),
            paymentDate: p.payment_date,
            period: p.period,
            orderIds: Array.isArray(p.order_ids) ? p.order_ids : [],
        }));
        return { success: true, data: mapped };
    } catch {
        try {
            const payments = await db.commissionPayment.findMany({
                orderBy: { paymentDate: 'desc' }
            });
            return { success: true, data: payments as unknown as CommissionPayment[] };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }
}
