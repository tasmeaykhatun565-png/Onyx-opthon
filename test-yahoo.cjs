const https = require('https');
https.get('https://query1.finance.yahoo.com/v7/finance/quote?symbols=EURUSD=X,GBPUSD=X,JPY=X,CAD=X,GBPJPY=X,EURJPY=X,AUDJPY=X', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(data));
});
