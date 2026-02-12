
'use server';

import { db } from '@/lib/db';
import { Order } from '@/lib/types';
import { createClient } from '@supabase/supabase-js';
import { mapDbOrderToOrder } from '@/lib/supabase-mappers';

function getSupabaseAdmin() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Supabase env ausente (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY)');
    }

    return createClient(supabaseUrl, supabaseServiceKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
}

export async function getOrderForCarnetAction(orderId: string) {
    try {
        const supabase = getSupabaseAdmin();
        const { data: orderRecord, error } = await supabase
            .from('orders')
            .select('*')
            .eq('id', orderId)
            .maybeSingle();

        if (error) throw error;
        if (!orderRecord) {
            return { success: false, error: 'Pedido não encontrado' };
        }

        let order = mapDbOrderToOrder(orderRecord);

        // Populate customer details if missing
        const cpf = (order.customer?.cpf || '').replace(/\D/g, '');
        const needsCustomerDetails =
            !order.customer?.code ||
            !order.customer?.phone ||
            !order.customer?.address ||
            !order.customer?.number ||
            !order.customer?.neighborhood ||
            !order.customer?.city ||
            !order.customer?.state ||
            !order.customer?.zip;

        if (cpf.length === 11 && needsCustomerDetails) {
            const customerRecord = await db.customer.findFirst({
                where: { cpf: cpf }
            });

            if (customerRecord) {
                // We don't have to parse JSON for Customer model generally, but check type definition if needed.
                // Assuming Customer model fields map directly or similar logic.
                // Actually Customer in Prisma: 
                // model Customer { ... address String? ... } matches types.

                order = {
                    ...order,
                    customer: {
                        ...order.customer,
                        code: order.customer.code || customerRecord.code || undefined,
                        phone: order.customer.phone || customerRecord.phone || '',
                        phone2: order.customer.phone2 || customerRecord.phone2 || undefined,
                        phone3: order.customer.phone3 || customerRecord.phone3 || undefined,
                        email: order.customer.email || customerRecord.email || undefined,
                        address: order.customer.address || customerRecord.address || '',
                        number: order.customer.number || customerRecord.number || '',
                        complement: order.customer.complement || customerRecord.complement || undefined,
                        neighborhood: order.customer.neighborhood || customerRecord.neighborhood || '',
                        city: order.customer.city || customerRecord.city || '',
                        state: order.customer.state || customerRecord.state || '',
                        zip: order.customer.zip || customerRecord.zip || '',
                    },
                };
            }
        }

        return { success: true, data: order };
    } catch (error: any) {
        console.error("Error fetching order for carnet:", error);
        return { success: false, error: error.message };
    }
}
