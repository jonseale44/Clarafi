// Quick Puppeteer test to verify browser launch
import puppeteer from 'puppeteer';

async function testPuppeteer() {
  console.log('🔧 [PuppeteerTest] Starting browser launch test...');
  
  const replicaArgs = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--disable-web-security',
    '--disable-features=VizDisplayCompositor',
    '--disable-features=TranslateUI',
    '--disable-extensions',
    '--disable-default-apps',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    '--disable-ipc-flooding-protection',
    '--disable-hang-monitor',
    '--disable-client-side-phishing-detection',
    '--disable-popup-blocking',
    '--disable-prompt-on-repost',
    '--disable-sync',
    '--metrics-recording-only',
    '--no-first-run',
    '--safebrowsing-disable-auto-update',
    '--disable-background-networking',
    '--disable-component-extensions-with-background-pages',
    '--single-process',
    '--no-zygote'
  ];

  try {
    console.log('🔧 [PuppeteerTest] Attempting system Chromium...');
    const browser = await puppeteer.launch({
      headless: true,
      executablePath: '/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium-browser',
      args: replicaArgs,
      timeout: 30000
    });
    
    console.log('✅ [PuppeteerTest] Browser launched successfully!');
    console.log('✅ [PuppeteerTest] Browser version:', await browser.version());
    
    // Test page creation and PDF generation
    const page = await browser.newPage();
    await page.setContent('<html><body><h1>Test PDF</h1><p>This is a test document.</p></body></html>');
    
    const pdf = await page.pdf({ 
      format: 'A4',
      printBackground: true 
    });
    
    console.log('✅ [PuppeteerTest] PDF generated successfully, size:', pdf.length, 'bytes');
    
    await page.close();
    await browser.close();
    
    console.log('✅ [PuppeteerTest] All tests passed!');
    return true;
    
  } catch (error) {
    console.error('❌ [PuppeteerTest] Browser launch failed:', error.message);
    console.error('❌ [PuppeteerTest] Full error:', error);
    return false;
  }
}

testPuppeteer().then(success => {
  process.exit(success ? 0 : 1);
});