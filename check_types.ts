
import pg from 'pg';

const { Client } = pg;

async function main() {
    console.log('Verificando tipos de colunas problemática...');

    const connectionString = "postgresql://postgres:Gfx3tX2DzvuqClaZ@db.hnpschlfoecpddoydnuv.supabase.co:6543/postgres?pgbouncer=true";

    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();

        // Check Category.subcategories type
        const resCat = await client.query(`
      SELECT column_name, data_type, udt_name
      FROM information_schema.columns 
      WHERE table_name = 'categories' AND column_name = 'subcategories';
    `);
        console.log('Category.subcategories:', resCat.rows);

        // Check Product.imageUrls type
        const resProd = await client.query(`
      SELECT column_name, data_type, udt_name
      FROM information_schema.columns 
      WHERE table_name = 'products' AND column_name = 'image_urls';
    `);
        console.log('Product.imageUrls:', resProd.rows);

    } catch (e: any) {
        console.error('❌ Erro:', e.message);
    } finally {
        await client.end();
    }
}

main();
