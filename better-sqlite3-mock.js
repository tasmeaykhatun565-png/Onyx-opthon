
const storage = new Map();

class Statement {
  constructor(sql, db) {
    this.sql = sql.trim().toLowerCase();
    this.db = db;
  }

  get(...args) {
    // Basic mock for common queries
    if (this.sql.includes('select * from users where email = ?')) {
      return storage.get(`user:${args[0]}`) || null;
    }
    if (this.sql.includes('select * from trade_stats where date = ?')) {
      return storage.get(`stats:${args[0]}`) || null;
    }
    if (this.sql.includes('select kycstatus from users where email = ?')) {
      const user = storage.get(`user:${args[0]}`);
      return user ? { kycStatus: user.kycStatus } : null;
    }
    return null;
  }

  all(...args) {
    if (this.sql.includes('select * from kyc_submissions')) {
      return Array.from(storage.values()).filter(v => v._type === 'kyc');
    }
    if (this.sql.includes('select * from trade_stats')) {
      return Array.from(storage.values()).filter(v => v._type === 'stats');
    }
    return [];
  }

  run(...args) {
    // Basic mock for INSERT/UPDATE
    if (this.sql.includes('insert into users') || this.sql.includes('update users')) {
      // Very crude parsing of email (usually the first or last arg)
      const email = args.find(a => typeof a === 'string' && a.includes('@'));
      if (email) {
        const existing = storage.get(`user:${email}`) || {};
        // This is just a mock, we don't actually parse all the columns
        storage.set(`user:${email}`, { ...existing, email, _type: 'user' });
      }
    }
    if (this.sql.includes('insert into kyc_submissions')) {
      const id = args[0];
      const email = args[1];
      storage.set(`kyc:${id}`, { id, email, _type: 'kyc' });
    }
    return { changes: 1, lastInsertRowid: Date.now() };
  }
}

class Database {
  constructor(path, options) {
    console.log(`[MOCK DB] Initialized stateful in-memory mock for ${path}`);
  }
  prepare(sql) {
    return new Statement(sql, this);
  }
  exec(sql) {
    return this;
  }
  pragma(sql) {
    return this;
  }
  transaction(fn) {
    return (...args) => fn(...args);
  }
  close() {
    return this;
  }
}

export default Database;
