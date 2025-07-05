const fs = require('fs');
const path = require('path');

// Get PDF.js version from package.json
const packageJson = require('../package.json');
const pdfjsVersion = packageJson.dependencies['pdfjs-dist'].replace('^', '');

// Source path in node_modules - using web version
const workerSrc = path.join(
  __dirname,
  '../node_modules/pdfjs-dist/build/pdf.worker.min.js'
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
  console.error('Failed to copy PDF.js worker file:', error);
  console.error('Tried path:', workerSrc);
  process.exit(1);
} 