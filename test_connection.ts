
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import pg from 'pg';
const { Client } = pg;

async function testConnection(connectionString: string, label: string) {
    console.log(`Testing ${label}...`);
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 5000,
    });

    try {
        await client.connect();
        console.log(`✅ Success: ${label}`);
        await client.end();
        return true;
    } catch (e: any) {
        console.log(`❌ Failed: ${label} - ${e.message}`);
        return false;
    }
}

async function main() {
    const originalUrl = process.env.DATABASE_URL;
    if (!originalUrl) {
        console.error('DATABASE_URL not found');
        return;
    }

    // 1. Test original
    await testConnection(originalUrl, 'Original (Port 5432)');

    // 2. Test Port 6543 (Supabase Transaction Pooler)
    const url6543 = originalUrl.replace(':5432', ':6543');
    await testConnection(url6543, 'Port 6543 (Pooler)');

    // 3. Test IPv4 Workaround (if needed, usually solved by replacing host)
    // We will stick to port testing first.
}

main();
