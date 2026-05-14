const fs = require('fs');
const files = [
  'src/DepositFlow.tsx', 
  'src/SettingsSubPages.tsx', 
  'src/App.tsx', 
  'src/TradingChart.tsx', 
  'src/WithdrawFlow.tsx', 
  'src/TransactionHistory.tsx', 
  'src/ReferralPage.tsx', 
  'src/AdminPanel.tsx', 
  'src/ActivitiesSheet.tsx', 
  'src/ProfilePage.tsx', 
  'src/SettingsPage.tsx',
  'src/AuthModal.tsx',
  'src/TradeDetailsModal.tsx',
  'src/MarketPage.tsx'
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');

  // Replace text-white variations in any context (including inside backticks or quotes)
  // that don't look like they are inside a colored background (we can't easily detect colored backgrounds dynamically with regex, so we'll just replace the ones we know are problematic)
  
  content = content.replace(/text-white\/30/g, 'text-[var(--color-text-secondary)]/30');
  content = content.replace(/text-white\/40/g, 'text-[var(--color-text-secondary)]/40');
  content = content.replace(/text-white\/50/g, 'text-[var(--color-text-secondary)]/50');
  content = content.replace(/text-white\/60/g, 'text-[var(--color-text-secondary)]/60');
  content = content.replace(/text-white\/70/g, 'text-[var(--color-text-secondary)]/70');
  content = content.replace(/text-white\/80/g, 'text-[var(--color-text-primary)]/80');
  content = content.replace(/text-white\/90/g, 'text-[var(--color-text-primary)]/90');
  content = content.replace(/bg-black\/40/g, 'bg-[var(--color-bg-secondary)]');
  content = content.replace(/bg-black\/20/g, 'bg-[var(--color-bg-tertiary)]');

  // Some specific cases without opacity
  content = content.replace(/"text-white"/g, '"text-[var(--color-text-primary)]"');
  content = content.replace(/'text-white'/g, "'text-[var(--color-text-primary)]'");
  content = content.replace(/`text-white`/g, '`text-[var(--color-text-primary)]`');
  
  // Note: we'll leave alone "bg-blue-600 text-white" by ensuring we only replace literal standalone "text-white" or when it's grouped with others but NOT bg-blue etc. This is hard to do with naive string replace, but let's just do a careful pass where we replace ' text-white ' etc.
  
  fs.writeFileSync(file, content);
}
