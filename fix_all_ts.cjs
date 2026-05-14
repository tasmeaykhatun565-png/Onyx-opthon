const fs = require('fs');
const path = require('path');

const srcDir = './src';
const files = fs.readdirSync(srcDir)
  .filter(file => file.endsWith('.tsx') || file.endsWith('.ts'))
  .map(file => path.join(srcDir, file));

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');

  // Replace text-white variations in any context (including inside backticks or quotes)
  // that don't look like they are inside a colored background (we can't easily detect colored backgrounds dynamically with regex, so we'll just replace the ones we know are problematic)
  
  content = content.replace(/text-white\/10/g, 'text-[var(--color-text-secondary)]/10');
  content = content.replace(/text-white\/20/g, 'text-[var(--color-text-secondary)]/20');
  content = content.replace(/text-white\/30/g, 'text-[var(--color-text-secondary)]/30');
  content = content.replace(/text-white\/40/g, 'text-[var(--color-text-secondary)]/40');
  content = content.replace(/text-white\/50/g, 'text-[var(--color-text-secondary)]/50');
  content = content.replace(/text-white\/60/g, 'text-[var(--color-text-secondary)]/60');
  content = content.replace(/text-white\/70/g, 'text-[var(--color-text-secondary)]/70');
  content = content.replace(/text-white\/80/g, 'text-[var(--color-text-primary)]/80');
  content = content.replace(/text-white\/90/g, 'text-[var(--color-text-primary)]/90');
  content = content.replace(/text-white\/95/g, 'text-[var(--color-text-primary)]/95');
  content = content.replace(/bg-black\/40/g, 'bg-[var(--color-bg-secondary)]');
  content = content.replace(/bg-black\/20/g, 'bg-[var(--color-bg-tertiary)]');
  content = content.replace(/bg-[#1a1b20]/g, 'bg-[var(--color-bg-secondary)]');
  content = content.replace(/bg-[#101114]\/50/g, 'bg-[var(--color-bg-primary)]/50');

  // Some specific cases without opacity
  content = content.replace(/"text-white"/g, '"text-[var(--color-text-primary)]"');
  content = content.replace(/'text-white'/g, "'text-[var(--color-text-primary)]'");
  content = content.replace(/`text-white`/g, '`text-[var(--color-text-primary)]`');
  
  fs.writeFileSync(file, content);
}
