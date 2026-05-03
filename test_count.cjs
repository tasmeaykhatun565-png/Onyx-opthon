const db = require('better-sqlite3')('trading_v2.db');

const rows = db.prepare("SELECT count(*) as count FROM market_history WHERE symbol='EUR/USD'").get();
console.log(rows);
