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
  const needle = (process.argv[2] || 'Wilton').trim();

  const q = await supabase
    .from('customers')
    .select('id,code,name,cpf')
    .ilike('name', `%${needle}%`)
    .order('name', { ascending: true })
    .limit(25);

  if (q.error) {
    console.error('Search error:', q.error);
    process.exit(1);
  }

  console.log(`Customer matches for "${needle}":`, (q.data || []).length);
  for (const row of q.data || []) {
    console.log('-', row.id, '|', row.code, '|', row.name, '|', row.cpf || '');
  }
}

main().catch((e) => {
  console.error('Unexpected error:', e);
  process.exit(1);
});

