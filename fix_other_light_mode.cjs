const fs = require('fs');

const files = [
  'src/WithdrawFlow.tsx', 
  'src/TransactionHistory.tsx', 
  'src/ReferralPage.tsx', 
  'src/AdminPanel.tsx', 
  'src/ActivitiesSheet.tsx', 
  'src/ProfilePage.tsx', 
  'src/SettingsPage.tsx',
  'src/AuthModal.tsx',
  'src/TradeDetailsModal.tsx',
  'src/MarketPage.tsx',
  'src/index.css'
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');

  // Let's find all className="..." and perform replacements inside them
  content = content.replace(/className="([^"]+)"/g, (match, classes) => {
    let replaced = classes;
    
    // Background replacements
    replaced = replaced.replace(/bg-\[#0a0a0a\]/g, 'bg-[var(--color-bg-primary)]');
    replaced = replaced.replace(/bg-black(\s|$)/g, 'bg-[var(--color-bg-primary)]$1');
    replaced = replaced.replace(/bg-\[#181a20\]/g, 'bg-[var(--color-bg-secondary)]');
    replaced = replaced.replace(/bg-\[#1c1c1c\]/g, 'bg-[var(--color-bg-secondary)]');
    replaced = replaced.replace(/bg-\[#252525\]/g, 'bg-[var(--color-bg-secondary)]');
    // replaced = replaced.replace(/bg-white\/5/g, 'bg-[var(--color-bg-secondary)]');
    // replaced = replaced.replace(/bg-white\/10/g, 'bg-[var(--color-bg-tertiary)]');

    // Text opacities
    replaced = replaced.replace(/text-white\/30/g, 'text-[var(--color-text-secondary)]/30');
    replaced = replaced.replace(/text-white\/40/g, 'text-[var(--color-text-secondary)]/40');
    replaced = replaced.replace(/text-white\/50/g, 'text-[var(--color-text-secondary)]/50');
    replaced = replaced.replace(/text-white\/60/g, 'text-[var(--color-text-secondary)]/60');
    replaced = replaced.replace(/text-white\/70/g, 'text-[var(--color-text-secondary)]/70');
    replaced = replaced.replace(/text-white\/80/g, 'text-[var(--color-text-primary)]/80');
    replaced = replaced.replace(/text-white\/90/g, 'text-[var(--color-text-primary)]/90');

    // For plain text-white, only replace if there's no brightly colored bg in the same class list
    const hasColoredBg = /bg-(blue|green|red|purple|pink|yellow|orange)-/.test(replaced) || /bg-\[#(?!0a0a0a|181a20|1c1c1c|252525)[0-9a-fA-F]{6}\]/.test(replaced);
    
    if (!hasColoredBg) {
      replaced = replaced.replace(/text-white(\s|$)/g, 'text-[var(--color-text-primary)]$1');
    }

    return `className="${replaced}"`;
  });

  fs.writeFileSync(file, content);
}
