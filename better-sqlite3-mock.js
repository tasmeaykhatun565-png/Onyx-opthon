
class Statement {
  constructor(sql) {
    this.sql = sql;
  }
  get(...args) {
    return null;
  }
  all(...args) {
    return [];
  }
  run(...args) {
    return { changes: 0, lastInsertRowid: 0 };
  }
}

class Database {
  constructor(path, options) {
    console.log(`[MOCK DB] Initialized in-memory mock for ${path}`);
  }
  prepare(sql) {
    return new Statement(sql);
  }
  exec(sql) {
    return this;
  }
  pragma(sql) {
    return this;
  }
  transaction(fn) {
    return fn;
  }
  close() {
    return this;
  }
}

export default Database;
