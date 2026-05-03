const volatility = 0.0001;
const tfMs = 60000;
let currentOpen = 1.08;
const firstTime = Date.now();
const synthetic = [];

for (let i = 1; i <= 2000; i++) {
  const time = firstTime - (i * tfMs);
  const move = (Math.random() - 0.5) * volatility * 15; // Higher volatility for synthetic history
  const close = currentOpen;
  const open = close - move;
  const high = Math.max(open, close) + Math.random() * volatility * 4;
  const low = Math.min(open, close) - Math.random() * volatility * 4;
  
  synthetic.push({ time, open, high, low, close });
  currentOpen = open;
}
console.log('Last synthetic item:', synthetic[synthetic.length - 1]);
