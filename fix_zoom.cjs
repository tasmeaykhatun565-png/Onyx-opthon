const fs = require('fs');

const path = './src/TradingChart.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/hover:bg-white\/10/g, 'hover:bg-text-primary/10');
content = content.replace(/bg-white\/10/g, 'bg-text-primary/10');

fs.writeFileSync(path, content);
console.log('Fixed TradingChart.tsx');
