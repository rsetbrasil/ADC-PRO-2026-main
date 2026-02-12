const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function fixDates() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('--- Iniciando correção de datas (Nov/2025 -> Jan/2026) ---');

    let allOrders = [];
    let from = 0;
    const step = 1000;
    let hasMore = true;

    while (hasMore) {
        const { data: orders, error: fetchErr } = await supabase
            .from('orders')
            .select('id, date')
            .gte('date', '2025-11-01T00:00:00')
            .lte('date', '2025-11-30T23:59:59')
            .like('id', 'IMP-%')
            .range(from, from + step - 1);

        if (fetchErr) {
            console.error('Erro ao buscar pedidos:', fetchErr.message);
            break;
        }

        if (orders.length === 0) {
            hasMore = false;
        } else {
            allOrders = allOrders.concat(orders);
            from += step;
            console.log(`Buscados ${allOrders.length} pedidos...`);
        }
    }

    console.log(`Total de pedidos para corrigir: ${allOrders.length}`);

    if (allOrders.length === 0) {
        console.log('Nenhum pedido restante para corrigir em Nov/2025.');
        return;
    }

    // 2. Processar em lotes para evitar sobrecarga
    const CHUNK_SIZE = 50;
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < allOrders.length; i += CHUNK_SIZE) {
        const chunk = allOrders.slice(i, i + CHUNK_SIZE);
        
        const updates = chunk.map(order => {
            const oldDate = new Date(order.date);
            const newDate = new Date(oldDate);
            newDate.setFullYear(2026);
            newDate.setMonth(0); // Janeiro
            
            return supabase
                .from('orders')
                .update({ date: newDate.toISOString() })
                .eq('id', order.id);
        });

        const results = await Promise.all(updates);
        
        results.forEach(res => {
            if (res.error) {
                console.error(`Erro ao atualizar pedido:`, res.error.message);
                errorCount++;
            } else {
                successCount++;
            }
        });

        if ((successCount + errorCount) % 500 === 0) {
            console.log(`Progresso: ${successCount + errorCount} / ${allOrders.length}`);
        }
    }

    console.log(`--- Correção finalizada ---`);
    console.log(`Sucessos: ${successCount}`);
    console.log(`Erros: ${errorCount}`);
}

fixDates();
