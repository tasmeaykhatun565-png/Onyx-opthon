const https = require('https');
https.get('https://api.binance.com/api/v3/ticker/price?symbols=["BTCUSDT","BTCEUR","BTCGBP","BTCJPY","BTCAUD"]', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log(data);
  });
});
