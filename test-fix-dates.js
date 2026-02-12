const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function checkDates() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
        console.error('Missing Supabase credentials');
        return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('--- Analisando datas dos pedidos ---');

    // 1. Contar pedidos em Nov/2025
    const { count: novCount, error: novErr } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .gte('date', '2025-11-01T00:00:00')
        .lte('date', '2025-11-30T23:59:59');

    if (novErr) {
        console.error('Erro ao contar pedidos de Nov/2025:', novErr.message);
    } else {
        console.log(`Pedidos em Nov/2025: ${novCount}`);
    }

    // 2. Pegar uma amostra de pedidos de Nov/2025 para ver o ID e se são migrados
    const { data: sample, error: sampleErr } = await supabase
        .from('orders')
        .select('id, date, customer')
        .gte('date', '2025-11-01T00:00:00')
        .lte('date', '2025-11-30T23:59:59')
        .limit(5);

    if (sampleErr) {
        console.error('Erro ao pegar amostra:', sampleErr.message);
    } else {
        console.log('Amostra de pedidos em Nov/2025:');
        sample.forEach(s => {
            console.log(` - ID: ${s.id}, Data: ${s.date}`);
        });
    }

    // 3. Contar pedidos em Jan/2026
    const { count: janCount, error: janErr } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .gte('date', '2026-01-01T00:00:00')
        .lte('date', '2026-01-31T23:59:59');

    if (janErr) {
        console.error('Erro ao contar pedidos de Jan/2026:', janErr.message);
    } else {
        console.log(`Pedidos em Jan/2026: ${janCount}`);
    }
}

checkDates();
