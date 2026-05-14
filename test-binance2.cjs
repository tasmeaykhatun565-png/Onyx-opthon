const https = require('https');
const symbols = ["EURUSDT","GBPUSDT","AUDUSDT","USDTJPY","USDTCAD","GBPJPY"];
symbols.forEach(sym => {
  https.get('https://api.binance.com/api/v3/ticker/price?symbol='+sym, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => console.log(sym, data));
  });
});
