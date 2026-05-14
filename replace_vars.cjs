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
      
      content = content.replace(/var\(--bg-primary\)/g, 'var(--color-bg-primary)');
      content = content.replace(/var\(--bg-secondary\)/g, 'var(--color-bg-secondary)');
      content = content.replace(/var\(--bg-tertiary\)/g, 'var(--color-bg-tertiary)');
      content = content.replace(/var\(--text-primary\)/g, 'var(--color-text-primary)');
      content = content.replace(/var\(--text-secondary\)/g, 'var(--color-text-secondary)');
      content = content.replace(/var\(--border-color\)/g, 'var(--color-border-color)');
      content = content.replace(/var\(--accent-color\)/g, 'var(--color-accent-color)');
      content = content.replace(/var\(--accent-hover\)/g, 'var(--color-accent-hover)');

      fs.writeFileSync(fullPath, content);
      console.log('Processed', fullPath);
    }
  }
}

traverseAndReplace(srcDir);
console.log('Replacement complete.');
