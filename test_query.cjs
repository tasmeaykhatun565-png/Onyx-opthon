const db = require('better-sqlite3')('trading_v2.db');

let tfMs = 60000;
let assetShortName = 'EUR/USD';
let endTime = Date.now();
let startTime = endTime - (tfMs * 100);

let query = `
  WITH Aggregated AS (
    SELECT 
      time - (time % ?) AS candle_time,
      MIN(time) as min_time,
      MAX(time) as max_time,
      MAX(high) AS high,
      MIN(low) AS low
    FROM market_history
    WHERE symbol = ? AND time >= ? AND time < ?
    GROUP BY candle_time
  )
  SELECT 
    a.candle_time as time,
    o.open as open,
    a.high as high,
    a.low as low,
    c.close as close
  FROM Aggregated a
  JOIN market_history o ON o.symbol = ? AND o.time = a.min_time
  JOIN market_history c ON c.symbol = ? AND c.time = a.max_time
  ORDER BY a.candle_time ASC
`;

let params = [tfMs, assetShortName, startTime, endTime, assetShortName, assetShortName];
const candles = db.prepare(query).all(...params);

console.log('Candles length:', candles.length);
if (candles.length > 0) {
  console.log('First candle:', candles[0]);
}

const raw = db.prepare('SELECT * FROM market_history WHERE symbol = ? LIMIT 1').get(assetShortName);
console.log('Sample raw row:', raw);
