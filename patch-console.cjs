const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const regex = /console\.error\('Firestore.*?',\s*(error|e|err)\);/g;

code = code.replace(regex, (match, errVar) => {
  return `console.warn('[SILENT] Firestore error suppressed:', ${errVar} && ${errVar}.message ? ${errVar}.message : ${errVar});`;
});

fs.writeFileSync('server.ts', code, 'utf8');
console.log('Patched console.error for Firestore');
