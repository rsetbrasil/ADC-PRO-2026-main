const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function main() {
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: order, error: oErr } = await supabase
    .from('orders')
    .select('id,sellerId,sellerName')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (oErr) throw oErr;
  if (!order) throw new Error('No orders found');

  const original = { sellerId: order.sellerId || null, sellerName: order.sellerName || null };
  const next = { sellerId: 'TEST-SELLER', sellerName: 'Vendedor Teste' };

  const upd = await supabase.from('orders').update(next).eq('id', order.id);
  if (upd.error) throw upd.error;

  const { data: verify, error: vErr } = await supabase
    .from('orders')
    .select('id,sellerId,sellerName')
    .eq('id', order.id)
    .maybeSingle();
  if (vErr) throw vErr;

  console.log('Order:', order.id);
  console.log('Updated sellerName:', verify.sellerName);

  const rollback = await supabase.from('orders').update(original).eq('id', order.id);
  if (rollback.error) throw rollback.error;
  console.log('Rolled back');
}

main().catch((e) => {
  console.error('Error:', e?.message || e);
  process.exit(1);
});

