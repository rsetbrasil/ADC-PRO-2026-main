# Otimizações de Performance (Pedidos)

## Causa raiz do atraso
- A listagem de pedidos dependia de consultas que estouravam `statement timeout` sob carga e/ou ordenações sem índice adequado.
- A tela de pedidos carregava apenas um lote fixo e não tinha paginação real para escalar com volume.

## Mudanças implementadas

### API de pedidos
- Endpoint `GET /api/admin/orders` com:
  - Paginação por cursor (`cursor` baseado em `date`), `limit` (10–200).
  - Cache em memória otimizado (hot cache 8s) e fallback `STALE` (até 30s) para alta disponibilidade.
  - Métrica de latência (`x-response-ms`) e indicador de cache (`x-cache`).

### UI/Admin
- Botão "Carregar mais pedidos" que faz paginação usando `nextCursor`.

### Monitoramento e alertas
- Métricas em memória com endpoint:
  - `GET /api/admin/monitoring?limit=100`
  - `GET /api/admin/monitoring/summary?name=GET%20%2Fapi%2Fadmin%2Forders&limit=200`
- Alertas automáticos quando `ms > 3000` via `ALERT_WEBHOOK_URL` (se não estiver definido, cai para `console.warn`).

### Índices (Supabase/Postgres)
- Migration aplicada: `supabase/migrations/create_orders_performance_indexes.sql`
- Índices principais:
  - `orders_date_desc_idx` em `orders(date desc)`
  - `orders_status_date_desc_idx` em `orders(status, date desc)`
  - `orders_seller_id_date_desc_idx` em `orders("sellerId", date desc)`
  - índices de expressão em `customer->>'cpf'` e `customer->>'code'` para buscas.

## Teste de carga
- Script: `scripts/loadtest-orders-1000.js`
- Exemplo:
  - `node scripts/loadtest-orders-1000.js http://localhost:3100/api/admin/orders?limit=200 1000`
- Saída: JSON com `p50/p95/p99/max` e contagem de requisições acima de 3s e 5s.

## Variáveis de ambiente
- `ALERT_WEBHOOK_URL`: endpoint (Slack/Discord/Telegram/HTTP) para receber alertas de latência.

