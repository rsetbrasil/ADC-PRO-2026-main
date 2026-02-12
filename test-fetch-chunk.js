const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3100,
  path: '/_next/static/chunks/main-app.js',
  method: 'GET',
  headers: { 'accept': '*/*' }
};

const req = http.request(options, (res) => {
  console.log('STATUS', res.statusCode);
  console.log('content-type', res.headers['content-type']);
  let body = '';
  res.setEncoding('utf8');
  res.on('data', (chunk) => {
    if (body.length < 400) body += chunk;
  });
  res.on('end', () => {
    console.log('HEAD', JSON.stringify(body.slice(0, 300)));
  });
});

req.on('error', (e) => console.error(e));
req.end();

