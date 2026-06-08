const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Patch resolveTrade to update memory balance for anonymous users
const demoBalancePatch = `          } else if (activeTrade.accountType === 'DEMO') {
             const amountToReturn = isWin ? activeTrade.amount + profit : activeTrade.amount;
             db.prepare('UPDATE users SET demoBalance = demoBalance + ? WHERE email = ?').run(amountToReturn, email);
          }`;

const replacementPatch = `          } else if (activeTrade.accountType === 'DEMO') {
             const amountToReturn = isWin ? activeTrade.amount + profit : activeTrade.amount;
             if (email !== 'anonymous') {
                db.prepare('UPDATE users SET demoBalance = demoBalance + ? WHERE email = ?').run(amountToReturn, email);
             } else {
                for (const socketId in connectedUsers) {
                   if (connectedUsers[socketId].email.toLowerCase() === 'anonymous') {
                       connectedUsers[socketId].demoBalance = (connectedUsers[socketId].demoBalance || 0) + amountToReturn;
                   }
                }
             }
          }`;

code = code.replace(demoBalancePatch, replacementPatch);

fs.writeFileSync('server.ts', code, 'utf8');
console.log('Patched resolveTrade anonymous demo logic');
