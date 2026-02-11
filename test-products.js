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
  const p = await supabase.from('products').select('*').limit(3);
  const c = await supabase.from('categories').select('*').limit(3);
  console.log('products:', p.error ? p.error : (p.data || []).length);
  console.log('categories:', c.error ? c.error : (c.data || []).length);
}

main();
