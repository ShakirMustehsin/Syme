const { PDFDocument } = require('pdf-lib');
const fs = require('fs');

async function analyzePDF(filePath) {
  console.log(`Analyzing: ${filePath}`);
  try {
    const data = fs.readFileSync(filePath);
    const pdfDoc = await PDFDocument.load(data);
    
    console.log(`Pages: ${pdfDoc.getPageCount()}`);
    
    const pages = pdfDoc.getPages();
    for (let i = 0; i < Math.min(20, pages.length); i++) {
      const page = pages[i];
      const resources = page.node.Resources();
      const xObjects = resources ? resources.get(PDFDocument.context.obj('XObject')) : null;
      
      console.log(`\n--- Page ${i+1} ---`);
      
      const contents = page.node.get(pdfDoc.context.obj('Contents'));
      if (contents) {
        console.log('[INFO] Page has Content Streams.');
      } else {
        console.log('[WARN] Page has NO Content Streams.');
      }
      
      if (xObjects) {
        console.log('[INFO] Page has XObjects (images or nested forms).');
      }
    }
  } catch (err) {
    console.error('Error analyzing PDF:', err.message);
  }
}

analyzePDF('Analog Robert_Hassan - Copy.pdf');
