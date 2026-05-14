const https = require('https');
https.get('https://api.binance.com/api/v3/exchangeInfo', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const json = JSON.parse(data);
    const btcPairs = json.symbols.filter(s => s.symbol.startsWith('BTC')).map(s => s.symbol);
    console.log('BTC pairs:', btcPairs.join(', '));
  });
});
