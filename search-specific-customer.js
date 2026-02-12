const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Erro: Variáveis de ambiente Supabase não configuradas.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function searchCustomerAndOrders() {
  const searchTerm = 'MARIA ESCOLASTICA RODRIGUES DA SILVA';
  console.log(`\n=== BUSCANDO CLIENTE: "${searchTerm}" ===`);

  // 1. Buscar na tabela 'customers'
  const { data: customers, error: customerError } = await supabase
    .from('customers')
    .select('*')
    .ilike('name', `%${searchTerm}%`);

  if (customerError) {
    console.error('Erro ao buscar cliente:', customerError);
    return;
  }

  console.log(`Clientes encontrados na tabela 'customers': ${customers.length}`);
  if (customers.length > 0) {
    customers.forEach(c => console.log(`- ID: ${c.id}, CPF: ${c.cpf}, Nome: ${c.name}, Status: ${c.blocked ? 'Bloqueado' : 'Ativo'}`));
  }

  // 2. Buscar na tabela 'orders' por diversos campos
  console.log(`\n=== BUSCANDO PEDIDOS PARA ESTA CLIENTE NA TABELA 'orders' ===`);
  
  // Buscar todos os pedidos para filtrar manualmente (mais seguro para campos JSON)
  const { data: allOrders, error: ordersError } = await supabase
    .from('orders')
    .select('*')
    .order('date', { ascending: false });

  if (ordersError) {
    console.error('Erro ao buscar pedidos:', ordersError);
    return;
  }

  const matchedOrders = allOrders.filter(o => {
    // Busca por nome do cliente no campo JSON ou campo direto
    const nameInJson = o.customer?.name || '';
    const nameInField = o.customerName || '';
    const cpfInJson = o.customer?.cpf || '';
    const idInJson = o.customer?.id || '';
    
    const term = searchTerm.toLowerCase();
    
    return nameInJson.toLowerCase().includes(term) || 
           nameInField.toLowerCase().includes(term) ||
           (customers.length > 0 && (idInJson === customers[0].id || cpfInJson === customers[0].cpf));
  });

  console.log(`Pedidos encontrados: ${matchedOrders.length}`);
  matchedOrders.forEach(o => {
    console.log(`\n- Pedido ID: ${o.id}`);
    console.log(`  Data: ${o.date}`);
    console.log(`  Status: ${o.status}`);
    console.log(`  Total: R$ ${o.total}`);
    console.log(`  Método: ${o.paymentMethod}`);
    console.log(`  Cliente no Pedido: ${o.customer?.name || o.customerName || 'N/A'}`);
    
    const inst = o.installment_details || o.installmentDetails || [];
    if (inst.length > 0) {
      console.log(`  Parcelas: ${inst.length} (${inst.filter(i => i.status === 'Pago').length} pagas)`);
    }
  });

  // 3. Verificar especificamente o pedido PED-119392 que apareceu antes e agora não
  console.log(`\n=== VERIFICANDO PEDIDO ESPECÍFICO: PED-119392 ===`);
  const ped119392 = allOrders.find(o => o.id === 'PED-119392');
  if (ped119392) {
    console.log(`Pedido PED-119392 encontrado!`);
    console.log(`Status: ${ped119392.status}`);
    console.log(`Cliente no JSON:`, ped119392.customer?.name);
    console.log(`Data: ${ped119392.date}`);
  } else {
    console.log(`Pedido PED-119392 NÃO encontrado na lista geral de pedidos.`);
    // Tentar busca direta por ID
    const { data: directPed, error: directError } = await supabase.from('orders').select('*').eq('id', 'PED-119392').maybeSingle();
    if (directPed) {
      console.log(`Pedido PED-119392 encontrado via busca direta por ID!`);
      console.log(`Status: ${directPed.status}`);
      console.log(`Cliente no JSON:`, directPed.customer?.name);
    } else {
      console.log(`Pedido PED-119392 realmente não existe ou está em outra tabela.`);
    }
  }
}

searchCustomerAndOrders();
