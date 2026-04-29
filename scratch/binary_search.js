const fs = require('fs');
const buffer = fs.readFileSync('Analog Robert_Hassan - Copy.pdf');
const searchString = 'oceanofpdf.com';
const searchBuffer = Buffer.from(searchString, 'utf8');

let count = 0;
let pos = buffer.indexOf(searchBuffer);
while (pos !== -1) {
  count++;
  console.log(`Found instance at byte: ${pos}`);
  pos = buffer.indexOf(searchBuffer, pos + 1);
}

if (count === 0) {
  console.log('Literal string NOT found in binary.');
  // Try case-insensitive manually
  const lowerBuffer = Buffer.from(buffer.toString('latin1').toLowerCase(), 'latin1');
  let countInsensitive = 0;
  let posI = lowerBuffer.indexOf(searchString.toLowerCase());
  while (posI !== -1) {
    countInsensitive++;
    posI = lowerBuffer.indexOf(searchString.toLowerCase(), posI + 1);
  }
  console.log(`Case-insensitive match count in binary: ${countInsensitive}`);
} else {
  console.log(`Total literal matches: ${count}`);
}
