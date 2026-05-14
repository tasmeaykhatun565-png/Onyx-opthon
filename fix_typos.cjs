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

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');

  content = content.replace(/bg-bg-secondarylue/g, 'bg-blue');
  content = content.replace(/bg-bg-primarylack/g, 'bg-black');
  
  fs.writeFileSync(file, content);
}
console.log('Fixed typos!');
