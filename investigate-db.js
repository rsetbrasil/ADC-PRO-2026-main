
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Erro: Variáveis de ambiente do Supabase não configuradas.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTotalOrders() {
  console.log('--- Investigação de Pedidos no Banco de Dados ---');
  
  // 1. Contagem total exata
  const { count, error: countError } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true });
    
  if (countError) {
    console.error('Erro ao contar pedidos:', countError);
    return;
  }
  console.log(`Total de pedidos no banco: ${count}`);

  // 2. Contagem por status
  const { data: statusData, error: statusError } = await supabase
    .from('orders')
    .select('status');
    
  if (statusError) {
    console.error('Erro ao buscar status:', statusError);
  } else {
    const statusCounts = statusData.reduce((acc, curr) => {
      acc[curr.status] = (acc[curr.status] || 0) + 1;
      return acc;
    }, {});
    console.log('Pedidos por Status:', statusCounts);
  }

  // 3. Verificar pedidos de Jan/2026 especificamente
  const { data: jan26Data, error: jan26Error } = await supabase
    .from('orders')
    .select('id, date')
    .gte('date', '2026-01-01T00:00:00')
    .lt('date', '2026-02-01T00:00:00');

  if (jan26Error) {
    console.error('Erro ao buscar pedidos de Jan/2026:', jan26Error);
  } else {
    console.log(`Pedidos em Janeiro/2026: ${jan26Data.length}`);
  }

  // 4. Verificar pedidos de Fev/2026 especificamente
  const { data: feb26Data, error: feb26Error } = await supabase
    .from('orders')
    .select('id, date')
    .gte('date', '2026-02-01T00:00:00')
    .lt('date', '2026-03-01T00:00:00');

  if (feb26Error) {
    console.error('Erro ao buscar pedidos de Fev/2026:', feb26Error);
  } else {
    console.log(`Pedidos em Fevereiro/2026: ${feb26Data.length}`);
  }

  // 4.5 Verificar pedidos sem status definido ou com outros status
  const { data: allStatusData, error: allStatusError } = await supabase
    .from('orders')
    .select('status');
  
  if (!allStatusError) {
    const counts = {};
    allStatusData.forEach(r => {
      const s = r.status || 'SEM STATUS';
      counts[s] = (counts[s] || 0) + 1;
    });
    console.log('Todos os Status encontrados:', counts);
  }

  // 4.6 Verificar pedidos com status "Processando"
  const { count: procCount, error: procError } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'Processando');
  console.log('Pedidos com status Processando:', procCount);

  // 4.7 Verificar pedidos com status "Pendente"
  const { count: pendCount, error: pendError } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'Pendente');
  console.log('Pedidos com status Pendente:', pendCount);
  
  // 4.8 Verificar pedidos com status "Excluído"
  const { count: delCount, error: delError } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'Excluído');
  console.log('Pedidos com status Excluído:', delCount);

  // 4.9 Amostra de pedidos sem status esperado
  const { data: sampleData, error: sampleError } = await supabase
    .from('orders')
    .select('id, status, date')
    .not('status', 'in', '("Entregue","Cancelado","Processando","Pendente","Excluído")')
    .limit(5);
  console.log('Amostra de pedidos com status desconhecido:', sampleData);

  // 5. Verificar se existem pedidos com datas muito antigas ou nulas
  const { data: oldData, error: oldError } = await supabase
    .from('orders')
    .select('id, date, status')
    .lt('date', '2025-11-01T00:00:00')
    .limit(20);
  
  if (oldData && oldData.length > 0) {
    console.log('Amostra de pedidos com datas antes de Nov/2025:', oldData);
  }

  // 6. Verificar especificamente Nov/2025
  const { count: novCount } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .gte('date', '2025-11-01T00:00:00')
    .lt('date', '2025-12-01T00:00:00');
  console.log('Total em Nov/2025:', novCount);

  // 7. Verificar pedidos com status "Processando"
  const { data: procData } = await supabase
    .from('orders')
    .select('id, date, status')
    .eq('status', 'Processando')
    .limit(20);
  console.log('Amostra de pedidos em Processando:', procData);

  // 8. Verificar especificamente a contagem por mês e ano
  const { data: dateDist } = await supabase
    .from('orders')
    .select('date, status')
    .not('status', 'eq', 'Excluído');
  
  const monthMap = {};
  const statusMonthMap = {};
  dateDist.forEach(r => {
    const d = new Date(r.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthMap[key] = (monthMap[key] || 0) + 1;
    
    if (!statusMonthMap[key]) statusMonthMap[key] = {};
    statusMonthMap[key][r.status] = (statusMonthMap[key][r.status] || 0) + 1;
  });
  console.log('Distribuição por Mês (Excluindo Excluídos):', monthMap);
  console.log('Status por Mês:', statusMonthMap);

  // 10. Contagem total exata (sem filtros)
  const { count: totalReal } = await supabase.from('orders').select('*', { count: 'exact', head: true });
  console.log('Total real de registros na tabela orders:', totalReal);

  // 11. Verificar se existem registros na tabela 'orders' que não estão sendo retornados por filtros comuns
  let allDataRaw = [];
  let lastId = null;
  let hasMore = true;
  
  while (hasMore) {
    let query = supabase.from('orders').select('id, status, date').order('id', { ascending: true }).limit(1000);
    if (lastId) query = query.gt('id', lastId);
    
    const { data, error } = await query;
    if (error || !data || data.length === 0) {
      hasMore = false;
    } else {
      allDataRaw = allDataRaw.concat(data);
      lastId = data[data.length - 1].id;
      if (data.length < 1000) hasMore = false;
    }
  }
  
  console.log('Total de registros retornados pelo select raw (PAGINADO):', allDataRaw.length);
  
  const statusSummary = {};
  const monthMapRaw = {};
  
  allDataRaw.forEach(r => {
    statusSummary[r.status] = (statusSummary[r.status] || 0) + 1;
    if (r.status !== 'Excluído') {
      const d = new Date(r.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthMapRaw[key] = (monthMapRaw[key] || 0) + 1;
    }
  });
  console.log('Resumo de Status Final (Raw Paginado):', statusSummary);
  console.log('Distribuição por Mês Real (Raw Paginado, sem Excluídos):', monthMapRaw);
}

checkTotalOrders();
