const https = require('https');
https.get('https://api.exchangerate-api.com/v4/latest/USD', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(data));
});
