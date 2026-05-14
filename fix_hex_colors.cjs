const fs = require('fs');

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

const replaceMap = {
  'bg-[#061626]': 'bg-bg-primary',
  'bg-[#0d2238]': 'bg-bg-secondary',
  'bg-[#13141b]': 'bg-bg-secondary',
  'bg-[#1b1c21]': 'bg-bg-secondary',
  'bg-[#222327]': 'bg-bg-tertiary',
  'bg-[#111116]': 'bg-bg-secondary',
  'bg-[#1a1b20]': 'bg-bg-secondary',
  'bg-[#2a2b30]': 'bg-bg-tertiary',
  'bg-[#0d0e12]': 'bg-bg-primary',
  'bg-[#040d17]': 'bg-bg-primary',
  'bg-[#3d3f44]': 'bg-bg-tertiary',
  'bg-[#25262b]': 'bg-bg-secondary',
  'bg-[#2c2d33]': 'bg-bg-tertiary',
  'text-[#061626]': 'text-text-primary',
  'bg-white/5': 'bg-bg-secondary',
  'bg-white/10': 'bg-bg-tertiary',
  'hover:bg-white/5': 'hover:bg-bg-secondary',
  'hover:bg-white/10': 'hover:bg-bg-tertiary'
};

let count = 0;
for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  for (const [key, value] of Object.entries(replaceMap)) {
    content = content.split(key).join(value);
  }
  
  if (original !== content) {
    count++;
    fs.writeFileSync(file, content);
  }
}
console.log('Fixed ' + count + ' files for bg hex colors!');
