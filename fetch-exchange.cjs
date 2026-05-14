const https = require('https');
https.get('https://api.binance.com/api/v3/exchangeInfo', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const json = JSON.parse(data);
    const jpy = json.symbols.filter(s => s.symbol.includes('JPY'));
    console.log('JPY pairs:', jpy.map(j => j.symbol).join(', '));
  });
});
