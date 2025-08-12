const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function findLocalStorage() {
  console.log('🔍 Searching for localStorage data...');
  
  let browser;
  try {
    // Launch browser
    browser = await puppeteer.launch({ 
      headless: false, // Show browser so you can see what's happening
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Go to your app
    console.log('🌐 Navigating to your app...');
    await page.goto('http://localhost:3000/dashboard/decision-timelines', { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    
    // Wait a bit for any auth/login to complete
    await page.waitForTimeout(3000);
    
    // Check if we need to login
    const currentUrl = page.url();
    if (currentUrl.includes('/login') || currentUrl.includes('/auth')) {
      console.log('⚠️  Need to login first. Please login in the browser window.');
      console.log('⏳ Waiting 30 seconds for you to login...');
      await page.waitForTimeout(30000);
    }
    
    // Extract localStorage data
    console.log('📋 Extracting localStorage data...');
    const localStorageData = await page.evaluate(() => {
      const data = localStorage.getItem('branching-timelines-v1');
      if (data) {
        return JSON.parse(data);
      }
      return null;
    });
    
    if (localStorageData) {
      console.log('✅ Found localStorage data!');
      console.log(`📊 Nodes found: ${Object.keys(localStorageData.nodes).length}`);
      console.log(`🏠 Root ID: ${localStorageData.rootId}`);
      
      // Save to backup file
      const backupPath = path.join(__dirname, 'localstorage-backup.json');
      fs.writeFileSync(backupPath, JSON.stringify(localStorageData, null, 2));
      console.log(`💾 Saved to: ${backupPath}`);
      
      // Show some details
      console.log('\n📋 Node details:');
      for (const [id, node] of Object.entries(localStorageData.nodes)) {
        console.log(`  - ${node.title} (${node.kind})`);
      }
      
      return localStorageData;
    } else {
      console.log('❌ No localStorage data found');
      console.log('💡 Make sure you have created some timeline data first');
      return null;
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the script
findLocalStorage().then(data => {
  if (data) {
    console.log('\n🎉 localStorage data extracted successfully!');
    console.log('🚀 You can now run: node scripts/migrate-localstorage-server.js');
  } else {
    console.log('\n💡 No data found. Create some timeline data first, then run this script again.');
  }
});
