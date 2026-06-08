const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Patch place-trade to handle anonymous demo trades
const targetPatch = `    if (!userFromDb) {
      console.error(\`place-trade: user not found for email \${email}\`);
      socket.emit('trade-error', 'User not found.');
      return;
    }`;

const replacementPatch = `    if (!userFromDb) {
      if (email === 'anonymous' && trade.accountType === 'DEMO') {
        const connectedUser = connectedUsers[socket.id];
        userFromDb = { 
           uid: 'anonymous', 
           balance: 0, 
           bonus_balance: 0, 
           demoBalance: connectedUser ? (connectedUser.demoBalance || 10000) : 10000, 
           trades: '[]' 
        };
      } else {
        console.error(\`place-trade: user not found for email \${email}\`);
        socket.emit('trade-error', 'User not found. Please reload or log in again.');
        return;
      }
    }`;

code = code.replace(targetPatch, replacementPatch);

// Second patch: skip firestore update for anonymous
const firestoreUpdatePattern = `if (canSyncFirestore() && (trade.accountType === 'REAL' || trade.accountType === 'DEMO')) {`;
const firestoreUpdateReplacement = `if (canSyncFirestore() && (trade.accountType === 'REAL' || trade.accountType === 'DEMO') && userFromDb.uid !== 'anonymous') {`;

code = code.replace(firestoreUpdatePattern, firestoreUpdateReplacement);

// Fix SQLite updates for demo balance for anonymous
const demoBalancePatch = `db.prepare('UPDATE users SET demoBalance = demoBalance - ? WHERE email = ?').run(trade.amount, email);`;
const demoBalanceReplacement = `if (email !== 'anonymous') {
        db.prepare('UPDATE users SET demoBalance = demoBalance - ? WHERE email = ?').run(trade.amount, email);
      } else {
        if (connectedUsers[socket.id]) {
           connectedUsers[socket.id].demoBalance = userFromDb.demoBalance - trade.amount;
        }
      }`;

code = code.replace(demoBalancePatch, demoBalanceReplacement);

// Fix DB insertion for trade at the end of the file
const dbInsertTradePattern = `db.prepare('UPDATE users SET trades = ? WHERE email = ?').run(JSON.stringify(userTrades), trade.email);`;
const dbInsertTradeReplacement = `if (trade.email !== 'anonymous') {
           db.prepare('UPDATE users SET trades = ? WHERE email = ?').run(JSON.stringify(userTrades), trade.email);
        }`;

// Wait, the DB insert code might be dynamically generated, let's search it!
code = code.replace(dbInsertTradePattern, dbInsertTradeReplacement);


fs.writeFileSync('server.ts', code, 'utf8');
console.log('Patched anonymous trades logic.');
