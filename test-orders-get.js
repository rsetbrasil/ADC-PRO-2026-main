const http = require('http');

const path = process.argv[2] || '/api/admin/orders?limit=20&includeItems=0';

const options = {
  hostname: 'localhost',
  port: 3100,
  path,
  method: 'GET'
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  console.log('X-RESPONSE-MS', res.headers['x-response-ms']);
  console.log('X-CACHE', res.headers['x-cache']);
  let body = '';
  res.on('data', (chunk) => {
    body += chunk;
  });
  res.on('end', () => {
    try {
      const json = JSON.parse(body);
      const first = json?.data?.[0];
      console.log('SOURCE', json?.source);
      console.log('RECENT_META', json?.recentMeta);
      console.log('FIRST', first?.id, first?.date);
      console.log(body.slice(0, 300));
    } catch {
      console.log(body.slice(0, 300));
    }
  });
});

req.setTimeout(20000, () => {
  console.error('TIMEOUT');
  req.destroy();
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.end();
