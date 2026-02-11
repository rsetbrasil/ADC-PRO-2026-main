
import dns from 'dns';

const hostname = 'db.hnpschlfoecpddoydnuv.supabase.co';

try {
    dns.setServers(['8.8.8.8']);
    console.log('Set DNS servers to 8.8.8.8');
} catch (e) {
    console.error('Could not set DNS servers:', e);
}

dns.resolve6(hostname, (err, addresses) => {
    if (err) {
        console.error(`Error resolving IPv6 ${hostname}:`, err);
        return;
    }
    console.log(`IPv6 addresses for ${hostname}:`, addresses);
});
