const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Patch 1: history[symbol].push
code = code.replace(
  /history\[symbol\]\.push\(historyEntry\);/g,
  'if (history[symbol]) history[symbol].push(historyEntry); else history[symbol] = [historyEntry];'
);

fs.writeFileSync('server.ts', code, 'utf8');
console.log('Patched history[symbol].push');
