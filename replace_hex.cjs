const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function traverseAndReplace(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      traverseAndReplace(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      const replacements = [
        { from: /bg-\[#000000\]/g, to: 'bg-[var(--color-bg-primary)]' },
        { from: /bg-\[#0a0b0d\]/g, to: 'bg-[var(--color-bg-primary)]' },
        { from: /bg-\[#0b0c0d\]/g, to: 'bg-[var(--color-bg-primary)]' },
        { from: /bg-\[#121212\]/g, to: 'bg-[var(--color-bg-secondary)]' },
        { from: /bg-\[#161616\]/g, to: 'bg-[var(--color-bg-secondary)]' },
        { from: /bg-\[#1c1c1c\]/g, to: 'bg-[var(--color-bg-secondary)]' },
        { from: /bg-\[#1c1c1e\]/g, to: 'bg-[var(--color-bg-secondary)]' },
        { from: /bg-\[#1e1e1e\]/g, to: 'bg-[var(--color-bg-tertiary)]' },
        { from: /bg-\[#1a1b1e\]/g, to: 'bg-[var(--color-bg-tertiary)]' },
        { from: /bg-\[#1a1a1a\]/g, to: 'bg-[var(--color-bg-tertiary)]' },
        { from: /bg-\[#0b0b0d\]/g, to: 'bg-[var(--color-bg-primary)]' },
        { from: /bg-\[#25262c\]/g, to: 'bg-[var(--color-bg-tertiary)]' },
        // Instead of replacing all text-white globally, I should only target text-white within bg classes... Wait, replacing all text-white might be risky if I want text-white on blue buttons.
        // Let's only replace hex backgrounds and borders.
        { from: /border-white\/5/g, to: 'border-[var(--color-border-color)]' },
        { from: /border-white\/10/g, to: 'border-[var(--color-border-color)]' },
        { from: /border-white\/\[0\.03\]/g, to: 'border-[var(--color-border-color)]' },
        { from: /border-white\/\[0\.05\]/g, to: 'border-[var(--color-border-color)]' },
        { from: /border-\[#1c1c1e\]/g, to: 'border-[var(--color-border-color)]' },
        { from: /divide-white\/5/g, to: 'divide-[var(--color-border-color)]' },
        // Let's NOT replace text-white globally, as text-white is used inside bg-blue-500 etc.
      ];

      let newContent = content;
      for (const rule of replacements) {
        newContent = newContent.replace(rule.from, rule.to);
      }
      
      // Let's safely replace text-white only when it's not preceded by a standard background? No, too hard with regex. 
      // But text-white on bg-[var(--color-bg-primary)] will be invisible in light mode.
      // So I must replace text-white to text-[var(--color-text-primary)] and THEN revert cases for solid bg like bg-blue-600.
      // Actually, many text-[var(--color-text-primary)] inside bg-blue will just change to black in light mode. We need text-white on primary buttons.
      
      if (content !== newContent) {
        fs.writeFileSync(fullPath, newContent);
        console.log('Processed', fullPath);
      }
    }
  }
}

traverseAndReplace(srcDir);
console.log('Replacement complete.');
