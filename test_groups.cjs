const db = require('better-sqlite3')('trading_v2.db');

const rows = db.prepare("SELECT (time - time % 60000) as candle, min(time), max(time), count(*) FROM market_history WHERE symbol='EUR/USD' group by candle LIMIT 20").all();
console.log(rows);
