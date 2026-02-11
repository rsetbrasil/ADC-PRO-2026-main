'use server';

import { db } from '@/lib/db';
import { CustomerInfo, Order } from '@/lib/types';
import { createClient } from '@supabase/supabase-js';

export async function findCustomerByCpfAction(cpf: string) {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const { data: customer, error: cError } = await supabase
            .from('customers')
            .select('*')
            .eq('cpf', cpf)
            .maybeSingle();
        if (cError) throw cError;
        if (customer) {
            const mapped: CustomerInfo = {
                id: customer.id,
                code: customer.code || undefined,
                name: customer.name,
                cpf: customer.cpf || undefined,
                phone: customer.phone || '',
                phone2: customer.phone2 || undefined,
                phone3: customer.phone3 || undefined,
                email: customer.email || undefined,
                zip: customer.zip || '',
                address: customer.address || '',
                number: customer.number || '',
                complement: customer.complement || undefined,
                neighborhood: customer.neighborhood || '',
                city: customer.city || '',
                state: customer.state || '',
                password: customer.password || undefined,
                observations: customer.observations || undefined,
                sellerId: customer.sellerId || undefined,
                sellerName: customer.sellerName || undefined,
                blocked: !!customer.blocked,
                blockedReason: customer.blockedReason || undefined,
                rating: customer.rating ?? undefined,
            };
            return { success: true, data: mapped, source: 'active' };
        }

        const { data: trash, error: tError } = await supabase
            .from('customers_trash')
            .select('data')
            .eq('cpf', cpf)
            .maybeSingle();
        if (tError) throw tError;
        if (trash?.data) return { success: true, data: trash.data as unknown as CustomerInfo, source: 'trash' };

        return { success: true, data: null };
    } catch {
        try {
            const customer = await db.customer.findUnique({
                where: { cpf }
            });
            if (customer) return { success: true, data: customer as unknown as CustomerInfo, source: 'active' };

            const trash = await db.customerTrash.findFirst({
                where: { cpf }
            });

            if (trash) return { success: true, data: trash.data as unknown as CustomerInfo, source: 'trash' };

            return { success: true, data: null };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }
}

export async function allocateNextCustomerCodeAction() {
    return { success: true, code: `CLI-${Date.now().toString().slice(-6)}` };
}

export type CreateOrderResult =
    | { success: true; orderId: string }
    | { success: false; error: string };

export async function createOrderAction(orderData: any, customerData: any): Promise<CreateOrderResult> {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        let customerId = customerData.id;
        if (customerData?.cpf) {
            const { data: existingCustomer, error: ecError } = await supabase
                .from('customers')
                .select('id')
                .eq('cpf', customerData.cpf)
                .maybeSingle();
            if (ecError) throw ecError;
            if (existingCustomer?.id) customerId = existingCustomer.id;
        }

        const customerRow: any = {
            id: customerId,
            code: customerData.code ?? null,
            name: customerData.name,
            cpf: customerData.cpf ?? null,
            phone: customerData.phone || '',
            phone2: customerData.phone2 ?? null,
            phone3: customerData.phone3 ?? null,
            email: customerData.email ?? null,
            zip: customerData.zip ?? null,
            address: customerData.address ?? null,
            number: customerData.number ?? null,
            complement: customerData.complement ?? null,
            neighborhood: customerData.neighborhood ?? null,
            city: customerData.city ?? null,
            state: customerData.state ?? null,
            password: customerData.password ?? null,
            observations: customerData.observations ?? null,
            sellerId: customerData.sellerId ?? null,
            sellerName: customerData.sellerName ?? null,
            blocked: customerData.blocked ?? false,
            blockedReason: customerData.blockedReason ?? null,
            rating: customerData.rating ?? null,
            createdBy: customerData.createdBy ?? null,
            createdByName: customerData.createdByName ?? null,
        };

        const { error: cError } = await supabase
            .from('customers')
            .upsert(customerRow, { onConflict: 'id' });
        if (cError) throw cError;

        for (const item of orderData.items || []) {
            if (String(item.id || '').startsWith('CUSTOM-')) continue;

            const { data: product, error: pError } = await supabase
                .from('products')
                .select('id,name,stock')
                .eq('id', item.id)
                .maybeSingle();
            if (pError) throw pError;
            if (!product) throw new Error(`Produto ${item.name} não encontrado.`);

            const currentStock = Number(product.stock || 0);
            const qty = Number(item.quantity || 0);
            if (currentStock < qty) throw new Error(`Estoque insuficiente para ${item.name}.`);

            const { error: uError } = await supabase
                .from('products')
                .update({ stock: currentStock - qty })
                .eq('id', item.id);
            if (uError) throw uError;
        }

        const orderRow: any = {
            id: orderData.id,
            customer: orderData.customer,
            items: orderData.items,
            total: orderData.total,
            discount: orderData.discount ?? null,
            downPayment: orderData.downPayment ?? null,
            installments: orderData.installments ?? null,
            installmentValue: orderData.installmentValue ?? null,
            date: orderData.date,
            firstDueDate: orderData.firstDueDate ?? null,
            status: orderData.status,
            paymentMethod: orderData.paymentMethod ?? null,
            installmentDetails: orderData.installmentDetails ?? null,
            attachments: orderData.attachments ?? null,
            sellerId: orderData.sellerId ?? null,
            sellerName: orderData.sellerName ?? null,
            commission: orderData.commission ?? null,
            commissionPaid: orderData.commissionPaid ?? null,
            isCommissionManual: orderData.isCommissionManual ?? null,
            observations: orderData.observations ?? null,
            source: orderData.source ?? null,
            createdById: orderData.createdById ?? null,
            createdByName: orderData.createdByName ?? null,
            createdByRole: orderData.createdByRole ?? null,
            createdIp: orderData.createdIp ?? null,
            asaas: orderData.asaas ?? null,
        };

        const { error: oError } = await supabase.from('orders').insert(orderRow);
        if (oError) throw oError;

        return { success: true, orderId: orderData.id };
    } catch {
        try {
            return await db.$transaction(async (tx) => {
                for (const item of orderData.items) {
                    if (item.id.startsWith('CUSTOM-')) {
                        continue;
                    }

                    // @ts-ignore
                    const product = await tx.product.findUnique({
                        where: { id: item.id }
                    });

                    if (!product) throw new Error(`Produto ${item.name} não encontrado.`);
                    if ((product.stock || 0) < item.quantity) {
                        throw new Error(`Estoque insuficiente para ${item.name}.`);
                    }

                    // @ts-ignore
                    await tx.product.update({
                        where: { id: item.id },
                        data: { stock: (product.stock || 0) - item.quantity }
                    });
                }

                const { firstDueDate, ...orderToSave } = orderData;
                // @ts-ignore
                await tx.order.create({
                    data: orderToSave
                });

                // @ts-ignore
                await tx.customer.upsert({
                    where: { id: customerData.id },
                    update: customerData,
                    create: customerData
                });

                return { success: true, orderId: orderData.id };
            });
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    }
}
