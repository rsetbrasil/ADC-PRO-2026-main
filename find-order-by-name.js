const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function normalize(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

async function main() {
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
  }

  const needleRaw = process.argv.slice(2).join(' ').trim() || 'Jose Wilton';
  const needle = normalize(needleRaw);

  const supabase = createClient(supabaseUrl, supabaseKey);

  const pageSize = 500;
  let from = 0;
  let found = [];

  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await supabase
      .from('orders')
      .select('id,status,date,created_at,customer')
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Fetch error:', error);
      process.exit(1);
    }

    if (!data || data.length === 0) break;

    for (const row of data) {
      const customer = row.customer;
      const customerText = typeof customer === 'object' ? JSON.stringify(customer) : String(customer || '');
      if (normalize(customerText).includes(needle)) {
        found.push(row);
        if (found.length >= 20) break;
      }
    }

    if (found.length >= 20) break;
    from += pageSize;
  }

  console.log(`Found ${found.length} orders matching "${needleRaw}" (normalized)`);
  for (const row of found) {
    const customerName = row.customer && typeof row.customer === 'object' ? row.customer.name : undefined;
    console.log('-', row.id, '|', row.status, '|', row.date, '|', customerName);
  }
}

main().catch((e) => {
  console.error('Unexpected error:', e);
  process.exit(1);
});

