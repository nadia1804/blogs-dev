const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEBUG_PORT = 9222;
const TARGET_PAGE = 'http://localhost:4321/pelajaran/RPP-deep-learning';
const TEMP_USER_DATA = path.join(os.tmpdir(), 'chrome-devtools-safelink-test-' + Date.now());

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

class CDPClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 1;
    this.callbacks = new Map();

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.callbacks.has(msg.id)) {
        const { resolve, reject } = this.callbacks.get(msg.id);
        this.callbacks.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      }
    };
  }

  ready() {
    return new Promise(resolve => {
      if (this.ws.readyState === WebSocket.OPEN) return resolve();
      this.ws.onopen = () => resolve();
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.id++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    return res.result ? res.result.value : null;
  }

  async captureScreenshot(outputPath) {
    const res = await this.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(outputPath, Buffer.from(res.data, 'base64'));
    return outputPath;
  }

  close() {
    try {
      this.ws.close();
    } catch (e) {}
  }
}

async function runDevToolsAnalysis() {
  console.log('=== CHROME DEVTOOLS SAFELINK ANALYSIS ===');
  console.log(`1. Launching Headless Chrome on port ${DEBUG_PORT}...`);

  fs.mkdirSync(TEMP_USER_DATA, { recursive: true });

  const chromeProc = spawn(CHROME_PATH, [
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    `--user-data-dir=${TEMP_USER_DATA}`,
    TARGET_PAGE
  ], { stdio: 'ignore' });

  // Wait for Chrome remote debugging endpoint
  let pageTarget = null;
  for (let i = 0; i < 30; i++) {
    await sleep(500);
    try {
      const targets = await getJson(`http://localhost:${DEBUG_PORT}/json`);
      pageTarget = targets.find(t => t.type === 'page');
      if (pageTarget) break;
    } catch (e) {}
  }

  if (!pageTarget) {
    console.error('Failed to attach Chrome DevTools endpoint.');
    chromeProc.kill();
    return;
  }

  console.log(`2. Chrome DevTools attached successfully: ${pageTarget.title}`);
  const client = new CDPClient(pageTarget.webSocketDebuggerUrl);
  await client.ready();
  await client.send('Page.enable');
  await client.send('Runtime.enable');

  console.log(`3. Navigated to: ${TARGET_PAGE}`);
  await sleep(1500); // Allow DOM and safelink script to execute

  // Analisis tautan di halaman artikel
  console.log('4. Analyzing DOM links in article...');
  const linkAnalysis = await client.eval(`
    (() => {
      const links = Array.from(document.querySelectorAll('.post-prose a, .notion-link'));
      return links.map(a => ({
        text: a.innerText.trim(),
        href: a.getAttribute('href'),
        target: a.getAttribute('target'),
        rel: a.getAttribute('rel'),
        isProtected: a.getAttribute('data-safelink-protected') === 'true'
      }));
    })()
  `);

  console.log(`Found ${linkAnalysis.length} links in article:`);
  linkAnalysis.forEach((l, idx) => {
    console.log(`  [Link ${idx + 1}] "${l.text}"`);
    console.log(`    -> Current Href: ${l.href}`);
    console.log(`    -> data-safelink-protected: ${l.isProtected}`);
    console.log(`    -> target: ${l.target}, rel: ${l.rel}`);
  });

  const firstLink = linkAnalysis.find(l => l.isProtected && l.text.includes('RPP deep learning'));
  if (!firstLink || !firstLink.href.includes('/safelink')) {
    console.error('❌ Safelink link rewriting did NOT take place!');
    client.close();
    chromeProc.kill();
    return;
  }

  console.log('\n✅ PASS: Link successfully intercepted & rewritten to Safelink format!');
  const safelinkUrl = firstLink.href.startsWith('http')
    ? firstLink.href
    : `http://localhost:4321${firstLink.href}`;

  console.log(`\n5. Simulating User Click: Navigating to Safelink URL:`);
  console.log(`   ${safelinkUrl}`);

  await client.send('Page.navigate', { url: safelinkUrl });
  await sleep(1000);

  // Check initial safelink page state
  const safelinkInitState = await client.eval(`
    (() => {
      const timerEl = document.getElementById('timerCount');
      const timerWrap = document.getElementById('safelinkTimerWrap');
      const actionWrap = document.getElementById('safelinkActionWrap');
      const btnDest = document.getElementById('btnDestination');
      return {
        timerCount: timerEl ? timerEl.innerText : null,
        timerText: timerWrap ? timerWrap.innerText : null,
        actionVisible: actionWrap ? (window.getComputedStyle(actionWrap).display !== 'none') : false,
        destHref: btnDest ? btnDest.getAttribute('href') : null
      };
    })()
  `);

  console.log('Initial Safelink State:');
  console.log(`  Timer Text: "${safelinkInitState.timerText}" (Seconds: ${safelinkInitState.timerCount})`);
  console.log(`  Action Button Visible: ${safelinkInitState.actionVisible}`);

  // Take screenshot of countdown in progress
  const countdownShot = path.join(__dirname, '..', 'safelink-countdown.png');
  await client.captureScreenshot(countdownShot);
  console.log(`  Screenshot saved: ${countdownShot}`);

  console.log('\n6. Monitoring Countdown Timer in real-time...');
  for (let s = 1; s <= 10; s++) {
    await sleep(1000);
    const count = await client.eval(`document.getElementById('timerCount') ? document.getElementById('timerCount').innerText : 'done'`);
    process.stdout.write(`  [T+${s}s] Countdown: ${count}s...\n`);
    if (count === 'done' || count === '0' || s === 11) break;
  }

  await sleep(1000);

  // Check finished state
  const safelinkDoneState = await client.eval(`
    (() => {
      const timerWrap = document.getElementById('safelinkTimerWrap');
      const actionWrap = document.getElementById('safelinkActionWrap');
      const btnDest = document.getElementById('btnDestination');
      return {
        timerText: timerWrap ? timerWrap.innerText : null,
        actionVisible: actionWrap ? (window.getComputedStyle(actionWrap).display !== 'none') : false,
        finalDestinationUrl: btnDest ? btnDest.getAttribute('href') : null,
        buttonText: btnDest ? btnDest.innerText.trim() : null
      };
    })()
  `);

  console.log('\nFinal Safelink State (Timer Expired):');
  console.log(`  Status Banner: "${safelinkDoneState.timerText}"`);
  console.log(`  Action Button Visible: ${safelinkDoneState.actionVisible}`);
  console.log(`  Button Label: "${safelinkDoneState.buttonText}"`);
  console.log(`  Final Destination Target: ${safelinkDoneState.finalDestinationUrl}`);

  // Take screenshot of final unlocked button
  const unlockedShot = path.join(__dirname, '..', 'safelink-unlocked.png');
  await client.captureScreenshot(unlockedShot);
  console.log(`  Screenshot saved: ${unlockedShot}`);

  const expectedGdrivePrefix = 'https://drive.google.com/drive/folders/';
  if (safelinkDoneState.finalDestinationUrl && safelinkDoneState.finalDestinationUrl.startsWith(expectedGdrivePrefix)) {
    console.log('\n🎉 SUCCESS: Safelink verified end-to-end via Chrome DevTools!');
    console.log(`   External Google Drive URL accurately decoded and restored!`);
  } else {
    console.error('\n❌ FAIL: Destination URL did not match expected Google Drive URL.');
  }

  client.close();
  chromeProc.kill();
  try {
    fs.rmSync(TEMP_USER_DATA, { recursive: true, force: true });
  } catch (e) {}
}

runDevToolsAnalysis().catch(err => {
  console.error('Error during DevTools test:', err);
  process.exit(1);
});
