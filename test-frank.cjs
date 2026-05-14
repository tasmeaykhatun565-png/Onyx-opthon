const https = require('https');
https.get('https://api.frankfurter.dev/v1/latest?base=USD&symbols=EUR,GBP,JPY,CAD,AUD', { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(data));
});
