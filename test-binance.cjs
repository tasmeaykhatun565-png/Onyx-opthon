const https = require('https');
https.get('https://api.binance.com/api/v3/ticker/price?symbols=["EURUSDT","GBPUSDT","AUDUSDT","USDTJPY","USDTCAD"]', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(data));
});
