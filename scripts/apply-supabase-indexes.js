require('dotenv').config({ path: '.env.local' });

const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const { Client } = require('pg');

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL não encontrado em .env.local');
  }

  const client = new Client({ connectionString });
  await client.connect();

  const statements = [
    'create index if not exists audit_logs_timestamp_desc_idx on audit_logs ("timestamp" desc);',
    'create index if not exists orders_created_at_desc_idx on orders (created_at desc);',
    'create index if not exists products_created_at_desc_idx on products (created_at desc);',
    'create index if not exists products_deleted_at_idx on products (deleted_at);',
    'create index if not exists products_active_created_at_desc_idx on products (created_at desc) where deleted_at is null;',
  ];

  try {
    for (const sql of statements) {
      await client.query(sql);
      process.stdout.write(`OK: ${sql}\n`);
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
