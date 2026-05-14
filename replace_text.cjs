const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

const replacements = [
  // Backgrounds with specific exact matches 
  { from: /<div className="fixed inset-0 z-\[100\] bg-black text-white font-sans flex flex-col overflow-hidden">/g, to: '<div className="fixed inset-0 z-[100] bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] font-sans flex flex-col overflow-hidden">' },
  { from: /<div className="fixed inset-0 z-\[100\] bg-\[#000000\] text-white font-sans flex flex-col overflow-hidden">/g, to: '<div className="fixed inset-0 z-[100] bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] font-sans flex flex-col overflow-hidden">' },
  { from: /<div key={`soon-\$\{activeSubPage\}`} className="fixed inset-0 z-\[100\] bg-black p-6">/g, to: '<div key={`soon-${activeSubPage}`} className="fixed inset-0 z-[100] bg-[var(--color-bg-primary)] p-6 text-[var(--color-text-primary)]">' },

  { from: /text-white\/30/g, to: 'text-[var(--color-text-secondary)]\\/30' },
  { from: /text-white\/50/g, to: 'text-[var(--color-text-secondary)]\\/50' },
  { from: /text-white\/70/g, to: 'text-[var(--color-text-secondary)]\\/70' },
  { from: /text-white\/80/g, to: 'text-[var(--color-text-primary)]\\/80' },
  { from: /text-white\/90/g, to: 'text-[var(--color-text-primary)]\\/90' },
  { from: /text-white\/10/g, to: 'text-[var(--color-text-secondary)]\\/10' },
  { from: /text-white\/20/g, to: 'text-[var(--color-text-secondary)]\\/20' },
  
  { from: /bg-\[#252525\]/g, to: 'bg-[var(--color-bg-tertiary)]' },
  { from: /hover:bg-\[#252525\]/g, to: 'hover:bg-[var(--color-bg-tertiary)]' },
  { from: /bg-\[#1c1c1c\]/g, to: 'bg-[var(--color-bg-secondary)]' },
];

for (const rule of replacements) {
  content = content.replace(rule.from, rule.to);
}

content = content.replace(/text-white focus:ring-0/g, "text-[var(--color-text-primary)] focus:ring-0");
content = content.replace(/text-white hover:text-white/g, "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]");

fs.writeFileSync('src/App.tsx', content);
