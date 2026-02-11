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

  const { data: customer, error: cErr } = await supabase
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (cErr) throw cErr;
  if (!customer) throw new Error('No customer found to use as test');

  const orderId = `TEST-${Date.now()}`;
  const now = new Date().toISOString();

  const orderRow = {
    id: orderId,
    customer: customer,
    items: [
      {
        id: `CUSTOM-${Date.now()}`,
        name: 'TESTE AVULSO',
        price: 1,
        quantity: 1,
        imageUrl: 'https://placehold.co/100x100.png?text=TEST',
      },
    ],
    total: 1,
    discount: 0,
    downPayment: 0,
    installments: 1,
    installmentValue: 1,
    date: now,
    firstDueDate: now,
    status: 'Processando',
    paymentMethod: 'Crediário',
    installmentDetails: [
      {
        id: `inst-${orderId}-1`,
        installmentNumber: 1,
        amount: 1,
        dueDate: now,
        status: 'Pendente',
        paidAmount: 0,
        payments: [],
      },
    ],
    sellerId: customer.sellerId || null,
    sellerName: customer.sellerName || null,
    source: 'Manual',
    observations: 'TEST ORDER - DELETE ME',
  };

  const ins = await supabase.from('orders').insert(orderRow);
  if (ins.error) throw ins.error;
  console.log('Inserted order:', orderId);

  const verify = await supabase.from('orders').select('id,status,customer').eq('id', orderId).maybeSingle();
  if (verify.error) throw verify.error;
  console.log('Verified order customer name:', verify.data?.customer?.name);

  const del = await supabase.from('orders').delete().eq('id', orderId);
  if (del.error) throw del.error;
  console.log('Deleted order:', orderId);
}

main().catch((e) => {
  console.error('Error:', e?.message || e);
  process.exit(1);
});
