const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(/console\.warn\('\[SILENT\].*?'\);/g, '// SILENT LOG OMITTED');
code = code.replace(/console\.warn\('\[SILENT\].*?;\n/g, '// SILENT LOG OMITTED\n');
code = code.replace(/console\.warn\('\[SILENT\].*?\n/g, '// SILENT LOG OMITTED\n');

fs.writeFileSync('server.ts', code, 'utf8');
console.log('Removed SILENT warnings');
