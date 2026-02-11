
import pg from 'pg';

const { Client } = pg;

async function main() {
    console.log('Verificando se existem dados no banco...');

    const connectionString = "postgresql://postgres:Gfx3tX2DzvuqClaZ@db.hnpschlfoecpddoydnuv.supabase.co:6543/postgres?pgbouncer=true";

    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();

        const users = await client.query('SELECT COUNT(*) FROM users');
        const products = await client.query('SELECT COUNT(*) FROM products');
        const orders = await client.query('SELECT COUNT(*) FROM orders');
        const categories = await client.query('SELECT COUNT(*) FROM categories');

        console.log('--- CONTAGEM DE DADOS ---');
        console.log(`Usuários: ${users.rows[0].count}`);
        console.log(`Produtos: ${products.rows[0].count}`);
        console.log(`Pedidos: ${orders.rows[0].count}`);
        console.log(`Categorias: ${categories.rows[0].count}`);
        console.log('-------------------------');

    } catch (e: any) {
        console.error('❌ Erro de conexão:', e.message);
    } finally {
        await client.end();
    }
}

main();
