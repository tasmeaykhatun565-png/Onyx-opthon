const fs = require('fs');
const code = fs.readFileSync('src/App.tsx', 'utf8');
let depth = 0;
let lastOpen = [];
for (let i = 0; i < code.length; i++) {
  if (code[i] === '{') {
    depth++;
    lastOpen.push(i);
  } else if (code[i] === '}') {
    depth--;
    lastOpen.pop();
  }
}
console.log('Depth:', depth);
if (depth > 0) {
  const last = lastOpen[lastOpen.length - 1];
  const lines = code.substring(0, last).split('\n');
  console.log('Last unclosed { at line:', lines.length);
}
