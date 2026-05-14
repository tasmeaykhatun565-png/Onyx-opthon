const https = require('https');
https.get('https://api.binance.com/api/v3/ticker/24hr?symbols=["EURUSDT","GBPUSDT","AUDUSDT"]', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log(data);
  });
});
