const fs = require('fs');

const files = ['src/DepositFlow.tsx', 'src/SettingsSubPages.tsx', 'src/App.tsx', 'src/TradingChart.tsx', 'src/AssetsSheet.tsx', 'src/AccountMenu.tsx'];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');

  // Let's replace \\/ with /
  content = content.replace(/\\\/(\d+)/g, '/$1');
  
  fs.writeFileSync(file, content);
}
