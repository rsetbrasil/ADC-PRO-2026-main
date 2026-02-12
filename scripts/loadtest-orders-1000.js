const http = require('http');
const https = require('https');

function percentile(values, p) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}

function requestOnce(url, agent) {
  return new Promise((resolve) => {
    const started = Date.now();
    const lib = url.startsWith('https:') ? https : http;
    const req = lib.request(url, { method: 'GET', agent }, (res) => {
      res.resume();
      res.on('end', () => {
        resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, ms: Date.now() - started, status: res.statusCode });
      });
    });
    req.setTimeout(10000, () => {
      req.destroy();
      resolve({ ok: false, ms: Date.now() - started, status: 0, timeout: true });
    });
    req.on('error', () => {
      resolve({ ok: false, ms: Date.now() - started, status: 0 });
    });
    req.end();
  });
}

async function main() {
  const url = process.argv[2] || 'http://localhost:3100/api/admin/orders?limit=200';
  const total = Number(process.argv[3] || '1000');

  const agent = url.startsWith('https:')
    ? new https.Agent({ keepAlive: true, maxSockets: total })
    : new http.Agent({ keepAlive: true, maxSockets: total });

  const startedAll = Date.now();
  const results = await Promise.all(Array.from({ length: total }, () => requestOnce(url, agent)));
  const totalMs = Date.now() - startedAll;

  const okCount = results.filter((r) => r.ok).length;
  const lat = results.map((r) => r.ms);
  const max = lat.length ? Math.max(...lat) : null;
  const p50 = percentile(lat, 50);
  const p95 = percentile(lat, 95);
  const p99 = percentile(lat, 99);

  const slow3s = results.filter((r) => r.ms > 3000).length;
  const slow5s = results.filter((r) => r.ms > 5000).length;
  const timeouts = results.filter((r) => r.timeout).length;

  console.log(JSON.stringify({
    url,
    total,
    totalMs,
    ok: okCount,
    errors: total - okCount,
    p50,
    p95,
    p99,
    max,
    slowOver3s: slow3s,
    slowOver5s: slow5s,
    timeouts,
  }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
