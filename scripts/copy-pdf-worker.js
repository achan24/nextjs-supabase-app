const fs = require('fs');
const path = require('path');

// Get PDF.js version from package.json
const packageJson = require('../package.json');
const pdfjsVersion = packageJson.dependencies['pdfjs-dist'].replace('^', '');

// Source path in node_modules - updated for newer versions of pdfjs-dist
const workerSrc = path.join(
  __dirname,
  '../node_modules/pdfjs-dist/legacy/build/pdf.worker.min.js'
);

// Destination path in public directory
const workerDest = path.join(__dirname, '../public/pdf.worker.min.js');

// Create public directory if it doesn't exist
const publicDir = path.join(__dirname, '../public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir);
}

// Copy the file
try {
  fs.copyFileSync(workerSrc, workerDest);
  console.log(`Copied PDF.js worker (v${pdfjsVersion}) to public directory`);
} catch (error) {
  if (error.code === 'ENOENT') {
    // Try the non-legacy path as fallback
    const altWorkerSrc = path.join(
      __dirname,
      '../node_modules/pdfjs-dist/build/pdf.worker.min.js'
    );
    try {
      fs.copyFileSync(altWorkerSrc, workerDest);
      console.log(`Copied PDF.js worker (v${pdfjsVersion}) from alternate location to public directory`);
    } catch (altError) {
      console.error('Failed to copy PDF.js worker file. Please ensure pdfjs-dist is installed.');
      console.error('Tried paths:');
      console.error('- ' + workerSrc);
      console.error('- ' + altWorkerSrc);
      process.exit(1);
    }
  } else {
    console.error('Error copying PDF.js worker file:', error);
    process.exit(1);
  }
} 