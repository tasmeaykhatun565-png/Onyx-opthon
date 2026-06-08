const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Patch 1: place-trade anonymous skip
const placeTradeSyncTarget = `if (!userFromDb && canSyncFirestore()) {
      console.log(\`[SYNC] place-trade: User \${email} not found in SQLite. Attempting lazy sync from Firestore...\`);
      try {`;
const placeTradeSyncReplacement = `if (!userFromDb && canSyncFirestore() && email !== 'anonymous') {
      console.log(\`[SYNC] place-trade: User \${email} not found in SQLite. Attempting lazy sync from Firestore...\`);
      try {`;

code = code.replace(placeTradeSyncTarget, placeTradeSyncReplacement);

// Just to be safe, downgrade the console.error
const consoleErrorTarget = `console.error('Lazy Firestore sync failed for place-trade:', e);`;
const consoleErrorReplacement = `console.warn('[SILENT] Lazy Firestore sync failed for place-trade');`;

code = code.replace(consoleErrorTarget, consoleErrorReplacement);

// Same for submit withdraw
const withdrawConsoleErrorTarget = `console.error('Lazy Firestore sync failed for submit-withdraw:', e);`;
const withdrawConsoleErrorReplacement = `console.warn('[SILENT] Lazy Firestore sync failed for submit-withdraw');`;
code = code.replace(withdrawConsoleErrorTarget, withdrawConsoleErrorReplacement);

fs.writeFileSync('server.ts', code, 'utf8');
console.log('Patched lazy sync for anonymous users and silence errors.');
