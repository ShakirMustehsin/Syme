const fs = require('fs');
const buffer = fs.readFileSync('Analog Robert_Hassan - Copy.pdf');
const pos = 1402;
const snippet = buffer.slice(Math.max(0, pos - 50), Math.min(buffer.length, pos + 100));
console.log('Snippet around 1402:');
console.log(snippet.toString('latin1'));
