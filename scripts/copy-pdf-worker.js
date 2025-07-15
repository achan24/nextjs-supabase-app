const fs = require('fs');
const path = require('path');

// Get PDF.js version from package.json
const packageJson = require('../package.json');
const pdfjsVersion = packageJson.dependencies['pdfjs-dist'].replace('^', '');

// Source path in node_modules - try multiple possible paths
const possiblePaths = [
  path.join(__dirname, '../node_modules/pdfjs-dist/build/pdf.worker.mjs'),
  path.join(__dirname, '../node_modules/pdfjs-dist/build/pdf.worker.min.js'),
  path.join(__dirname, '../node_modules/pdfjs-dist/legacy/build/pdf.worker.js'),
  path.join(__dirname, '../node_modules/pdfjs-dist/legacy/build/pdf.worker.min.js')
];

// Destination path in public directory
const workerDest = path.join(__dirname, '../public/pdf.worker.min.js');

// Create public directory if it doesn't exist
const publicDir = path.join(__dirname, '../public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir);
}

// Try to find and copy the worker file
let copied = false;
for (const workerSrc of possiblePaths) {
  if (fs.existsSync(workerSrc)) {
    try {
      fs.copyFileSync(workerSrc, workerDest);
      console.log(`Copied PDF.js worker (v${pdfjsVersion}) from ${workerSrc} to public directory`);
      copied = true;
      break;
    } catch (error) {
      console.error(`Failed to copy from ${workerSrc}:`, error);
    }
  }
}

if (!copied) {
  console.error('Could not find PDF.js worker file in any of these locations:', possiblePaths);
  process.exit(1);
} 