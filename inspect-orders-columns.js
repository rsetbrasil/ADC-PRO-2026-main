const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function main() {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data, error } = await supabase.from('orders').select('*').limit(1);
  if (error) throw error;
  if (!data || data.length === 0) {
    console.log('No orders found');
    return;
  }
  console.log(Object.keys(data[0]).sort().join('\n'));
}

main().catch((e) => {
  console.error('Error:', e?.message || e);
  process.exit(1);
});

