const fs = require('fs');

let content = fs.readFileSync('src/LeaderboardPage.tsx', 'utf8');

const replacements = [
  { from: /text-white/g, to: 'text-[var(--color-text-primary)]' },
  { from: /text-gray-400/g, to: 'text-[var(--color-text-secondary)]' },
  { from: /text-gray-500/g, to: 'text-[var(--color-text-secondary)]' },
  { from: /text-gray-300/g, to: 'text-[var(--color-text-primary)]' },
  { from: /text-gray-200/g, to: 'text-[var(--color-text-primary)]' },
  { from: /text-gray-600/g, to: 'text-[var(--color-text-secondary)]' },
];

for (const rule of replacements) {
  content = content.replace(rule.from, rule.to);
}

fs.writeFileSync('src/LeaderboardPage.tsx', content);
