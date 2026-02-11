const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function main() {
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const nameNeedle = process.argv.slice(2).join(' ').trim() || 'José Wilton';

  const totalRes = await supabase.from('orders').select('id', { count: 'exact', head: true });
  if (totalRes.error) {
    console.error('Total orders count error:', totalRes.error);
  } else {
    console.log('Total orders:', totalRes.count);
  }

  const q = await supabase
    .from('orders')
    .select('id,status,date,created_at,customer')
    .ilike('customer->>name', `%${nameNeedle}%`)
    .order('created_at', { ascending: false })
    .limit(20);

  if (q.error) {
    console.error('Search error:', q.error);
    process.exit(1);
  }

  console.log(`Matches for "${nameNeedle}":`, (q.data || []).length);
  for (const row of q.data || []) {
    const customerName = row.customer && typeof row.customer === 'object' ? row.customer.name : undefined;
    console.log('-', row.id, '|', row.status, '|', row.date, '|', customerName);
  }
}

main().catch((e) => {
  console.error('Unexpected error:', e);
  process.exit(1);
});

