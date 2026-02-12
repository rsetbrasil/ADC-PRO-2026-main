const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function checkMoreDates() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const months = [
        { name: 'Set/2025', start: '2025-09-01', end: '2025-09-30' },
        { name: 'Out/2025', start: '2025-10-01', end: '2025-10-31' },
        { name: 'Nov/2025', start: '2025-11-01', end: '2025-11-30' },
        { name: 'Dez/2025', start: '2025-12-01', end: '2025-12-31' },
        { name: 'Jan/2026', start: '2026-01-01', end: '2026-01-31' },
        { name: 'Fev/2026', start: '2026-02-01', end: '2026-02-28' },
    ];

    for (const m of months) {
        const { count, error } = await supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .gte('date', `${m.start}T00:00:00`)
            .lte('date', `${m.end}T23:59:59`);
        
        console.log(`${m.name}: ${count || 0} pedidos`);
    }
}

checkMoreDates();
