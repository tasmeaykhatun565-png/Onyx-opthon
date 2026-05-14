const fs = require('fs');
const path = require('path');

const srcDir = './src';

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
      file = dir + '/' + file;
      const stat = fs.statSync(file);
      if (stat && stat.isDirectory()) { 
          results = results.concat(walk(file));
      } else { 
          if(file.endsWith('.tsx') || file.endsWith('.ts')) {
              results.push(file);
          }
      }
  });
  return results;
}

const files = walk(srcDir);

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');

  // Let's also handle backticks/quotes properly just in case
  content = content.replace(/bg-\[var\(--color-bg-primary\)\]/g, 'bg-bg-primary');
  content = content.replace(/bg-\[var\(--color-bg-secondary\)\]/g, 'bg-bg-secondary');
  content = content.replace(/bg-\[var\(--color-bg-tertiary\)\]/g, 'bg-bg-tertiary');
  content = content.replace(/text-\[var\(--color-text-primary\)\]/g, 'text-text-primary');
  content = content.replace(/text-\[var\(--color-text-secondary\)\]/g, 'text-text-secondary');
  content = content.replace(/border-\[var\(--color-border-color\)\]/g, 'border-border-color');
  content = content.replace(/bg-\[var\(--color-accent-color\)\]/g, 'bg-accent-color');
  content = content.replace(/text-\[var\(--color-accent-color\)\]/g, 'text-accent-color');
  content = content.replace(/border-\[var\(--color-accent-color\)\]/g, 'border-accent-color');

  fs.writeFileSync(file, content);
}
console.log('Done!');
