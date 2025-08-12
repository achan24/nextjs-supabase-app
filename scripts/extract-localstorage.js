// Script to help extract localStorage data
// Run this in the browser console on the decision-timelines page

console.log('=== localStorage Extraction Helper ===');
console.log('');
console.log('1. Make sure you are on the decision-timelines page');
console.log('2. Run this command in the browser console:');
console.log('');
console.log('copy(JSON.stringify(JSON.parse(localStorage.getItem("branching-timelines-v1"))))');
console.log('');
console.log('3. Paste the result into scripts/localstorage-backup.json');
console.log('4. Then run: node scripts/migrate-localstorage-server.js');
console.log('');
console.log('Or run this to see what\'s in localStorage:');
console.log('console.log(JSON.stringify(JSON.parse(localStorage.getItem("branching-timelines-v1")), null, 2))');
