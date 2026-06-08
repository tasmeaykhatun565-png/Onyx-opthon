const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(/console\.log\('\[SYNC\].*?'\);/g, '// SYNC LOG OMITTED');
code = code.replace(/console\.log\(`\[SYNC\].*?`\);/g, '// SYNC LOG OMITTED');

fs.writeFileSync('server.ts', code, 'utf8');
console.log('Removed SYNC logs');
