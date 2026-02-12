require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase env ausente');

  const ids = process.argv.slice(2);
  if (ids.length === 0) throw new Error('Passe IDs como argumentos');

  const supabase = createClient(url, key);
  const { data, error } = await supabase.from('orders').select('id,date').in('id', ids);
  if (error) throw error;

  const found = new Map((data || []).map((r) => [r.id, r.date]));
  for (const id of ids) {
    console.log(`${id}: ${found.get(id) || 'NOT_FOUND'}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

