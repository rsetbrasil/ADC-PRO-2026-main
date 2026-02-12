require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase env ausente');

  const supabase = createClient(url, key);
  const { data, error } = await supabase.from('orders').select('*').limit(1);
  if (error) throw error;

  const row = (data || [])[0] || {};
  console.log(Object.keys(row).sort().join(','));
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

