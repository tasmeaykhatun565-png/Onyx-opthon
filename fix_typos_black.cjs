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

let count = 0;
for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  content = content.replace(/bg-bg-secondarylack/g, 'bg-black');
  
  if (original !== content) {
    count++;
    fs.writeFileSync(file, content);
  }
}
console.log('Fixed ' + count + ' files for bg-black typos!');
