const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function testSearch() {
  const searchTerm = 'MARIA ESCOLASTICA';
  console.log(`Testando busca por: "${searchTerm}"`);

  // Simula a query exata do backend
  const { data, error } = await supabase
    .from('orders')
    .select('id, customer, customerName')
    .or(`id.ilike.%${searchTerm}%,customerName.ilike.%${searchTerm}%,customer->>name.ilike.%${searchTerm}%,customer->>cpf.ilike.%${searchTerm}%`)
    .limit(10);

  if (error) {
    console.error('Erro na query:', error);
    return;
  }

  console.log(`Resultados encontrados: ${data.length}`);
  data.forEach(o => {
    console.log(`- ID: ${o.id}`);
    console.log(`  customerName field: "${o.customerName}"`);
    console.log(`  customer JSON name: "${o.customer?.name}"`);
  });
}

testSearch();
