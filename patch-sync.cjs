const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const targetStr = "if (canSyncFirestore() && finalUserId) {";
const replacementStr = "if (canSyncFirestore() && finalUserId && finalUserId !== 'anonymous' && email !== 'anonymous') {";

code = code.replace(targetStr, replacementStr);
fs.writeFileSync('server.ts', code, 'utf8');
console.log('Patched finalUserId and email anonymous check');
