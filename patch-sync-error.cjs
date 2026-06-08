const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(/console\.error\(`\[SYNC_ERROR\].*?`,\s*err\.message\);/g, '// SYNC_ERROR OMITTED');
code = code.replace(/console\.error\('\[SYNC_ERROR\].*?'\);/g, '// SYNC_ERROR OMITTED');

fs.writeFileSync('server.ts', code, 'utf8');
console.log('Removed SYNC_ERROR logs');
