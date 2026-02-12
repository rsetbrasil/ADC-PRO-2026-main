'use server';

import type { Order } from '@/lib/types';
import { createClient } from '@supabase/supabase-js';
import { mapDbOrderToOrder } from '@/lib/supabase-mappers';

export async function getOrderByIdAction(orderId: string) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Supabase env ausente (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY)');
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await supabase.from('orders').select('*').eq('id', orderId).maybeSingle();
    if (error) throw error;
    if (!data) return { success: true, data: null };

    return { success: true, data: mapDbOrderToOrder(data) as Order };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Falha ao buscar pedido' };
  }
}
