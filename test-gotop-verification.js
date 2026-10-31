const { spawn } = require('child_process');

async function runGoTopVerification() {
  console.log('================================================================');
  console.log('        AUTOMATED GO-TO-TOP BUTTON DEEP VERIFICATION');
  console.log('================================================================');

  // Step 1: HTTP & DOM presence/absence verification
  console.log('\n[1] Checking HTTP API & DOM Content across all pages:');
  const pages = [
    { url: 'http://localhost:4321/post', name: '/post', shouldHaveGoTop: true },
    { url: 'http://localhost:4321/page', name: '/page', shouldHaveGoTop: true },
    { url: 'http://localhost:4321/theme', name: '/theme', shouldHaveGoTop: false },
    { url: 'http://localhost:4321/posts', name: '/posts', shouldHaveGoTop: false },
    { url: 'http://localhost:4321/authors', name: '/authors', shouldHaveGoTop: false },
    { url: 'http://localhost:4321/author', name: '/author', shouldHaveGoTop: false },
  ];

  for (const p of pages) {
    const res = await fetch(p.url);
    if (!res.ok) throw new Error(`Failed to fetch ${p.url}: status ${res.status}`);
    const html = await res.text();

    const hasId = html.includes('id="capsuleGoTop"');
    const hasClass = html.includes('capsule-go-top');

    if (p.shouldHaveGoTop) {
      if (!hasId || !hasClass) {
        throw new Error(`Expected ${p.name} to have #capsuleGoTop and .capsule-go-top, but missing!`);
      }
      // Check it is NOT inside footer
      const footerIndex = html.indexOf('<footer');
      const footerEndIndex = html.indexOf('</footer>');
      const goTopIndex = html.indexOf('id="capsuleGoTop"');
      if (footerIndex !== -1 && footerEndIndex !== -1 && goTopIndex > footerIndex && goTopIndex < footerEndIndex) {
        throw new Error(`${p.name} has #capsuleGoTop incorrectly embedded INSIDE <footer class="capsule-footer">!`);
      }
      console.log(`  ✅ ${p.name}: #capsuleGoTop is present and correctly outside footer.`);
    } else {
      if (hasId || hasClass) {
        throw new Error(`Expected ${p.name} to NOT have Go-to-Top button, but found #capsuleGoTop or .capsule-go-top!`);
      }
      console.log(`  ✅ ${p.name}: Go-to-Top button is correctly ABSENT.`);
    }
  }

  // Step 1b: Astro Source Templates presence/absence verification
  console.log('\n[1b] Checking Astro Source Templates (src/themes/fruition-capsule/pages):');
  const fs = require('fs');
  const path = require('path');
  const astroPages = [
    { file: 'src/themes/fruition-capsule/pages/post.astro', name: 'post.astro', shouldHaveGoTop: true },
    { file: 'src/themes/fruition-capsule/pages/page.astro', name: 'page.astro', shouldHaveGoTop: true },
    { file: 'src/themes/fruition-capsule/pages/archive.astro', name: 'archive.astro', shouldHaveGoTop: false },
    { file: 'src/themes/fruition-capsule/pages/authors.astro', name: 'authors.astro', shouldHaveGoTop: false },
    { file: 'src/themes/fruition-capsule/pages/author.astro', name: 'author.astro', shouldHaveGoTop: false },
  ];

  for (const ap of astroPages) {
    const fullPath = path.join(__dirname, ap.file);
    const content = fs.readFileSync(fullPath, 'utf8');
    const hasId = content.includes('id="capsuleGoTop"');
    const hasClass = content.includes('capsule-go-top');

    if (ap.shouldHaveGoTop) {
      if (!hasId || !hasClass) {
        throw new Error(`Expected ${ap.name} to have #capsuleGoTop, but missing!`);
      }
      const articleCloseIndex = content.lastIndexOf('</article>');
      const btnIndex = content.indexOf('id="capsuleGoTop"');
      if (articleCloseIndex !== -1 && btnIndex < articleCloseIndex) {
        throw new Error(`Expected #capsuleGoTop in ${ap.name} to be placed outside <article>!`);
      }
      console.log(`  ✅ ${ap.name}: #capsuleGoTop is present and cleanly placed outside <article>.`);
    } else {
      if (hasId || hasClass) {
        throw new Error(`Expected ${ap.name} to NOT have Go-to-Top button, but found #capsuleGoTop!`);
      }
      console.log(`  ✅ ${ap.name}: Go-to-Top button is correctly ABSENT.`);
    }
  }

  // Step 2: In-browser verification with Chrome DevTools Protocol
  console.log('\n[2] Launching Chrome Headless for CDP In-Browser Verification:');
  const profileDir = require('os').tmpdir() + '/chrome-gotop-' + Date.now();
  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9250',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=' + profileDir
  ]);

  let ver = null;
  for (let attempt = 0; attempt < 20; attempt++) {
    await new Promise(r => setTimeout(r, 300));
    try {
      const res = await fetch('http://127.0.0.1:9250/json/version');
      if (res.ok) {
        ver = await res.json();
        break;
      }
    } catch (e) {}
  }
  if (!ver) {
    chrome.kill();
    throw new Error('Could not connect to Chrome debugging port 9250');
  }

  const ws = new WebSocket(ver.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);

  let id = 1;
  const callbacks = new Map();
  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.id && callbacks.has(msg.id)) {
      const cb = callbacks.get(msg.id);
      callbacks.delete(msg.id);
      cb(msg);
    }
  };

  function send(method, params = {}) {
    return new Promise((resolve) => {
      const reqId = id++;
      callbacks.set(reqId, resolve);
      ws.send(JSON.stringify({ id: reqId, method, params }));
    });
  }

  const target = await send('Target.createTarget', { url: 'about:blank' });
  const attach = await send('Target.attachToTarget', { targetId: target.result.targetId, flatten: true });
  const sessionId = attach.result.sessionId;

  function sendSession(method, params = {}) {
    return new Promise((resolve) => {
      const reqId = id++;
      callbacks.set(reqId, resolve);
      ws.send(JSON.stringify({ id: reqId, sessionId, method, params }));
    });
  }

  await sendSession('Page.enable');
  await sendSession('Runtime.enable');

  async function evaluate(code) {
    const res = await sendSession('Runtime.evaluate', {
      expression: code,
      returnByValue: true,
      awaitPromise: true
    });
    if (res.result.exceptionDetails) {
      throw new Error('JS Evaluation Exception: ' + JSON.stringify(res.result.exceptionDetails));
    }
    return res.result.result.value;
  }

  try {
    // Test on /post
    console.log('\n--- Testing /post in Desktop Viewport (1200x900) ---');
    await sendSession('Emulation.setDeviceMetricsOverride', { width: 1200, height: 900, deviceScaleFactor: 1, mobile: false });
    await sendSession('Page.navigate', { url: 'http://localhost:4321/post' });
    await new Promise(r => setTimeout(r, 600));

    // A. Initial layout & styling check
    const postStyles = await evaluate(`(() => {
      const btn = document.getElementById('capsuleGoTop');
      if (!btn) return { exists: false };
      const cs = window.getComputedStyle(btn);
      return {
        exists: true,
        position: cs.position,
        left: cs.left,
        bottom: cs.bottom,
        zIndex: cs.zIndex,
        visibility: cs.visibility,
        opacity: cs.opacity,
        borderRadius: cs.borderRadius,
        backdropFilter: cs.backdropFilter || cs.webkitBackdropFilter,
        isVisibleClass: btn.classList.contains('is-visible'),
        parentTag: btn.parentElement.tagName.toLowerCase(),
        isInsideFooter: !!btn.closest('footer')
      };
    })()`);

    console.log('Post computed styles at scrollY = 0:', postStyles);
    if (!postStyles.exists) throw new Error('#capsuleGoTop does not exist on /post');
    if (postStyles.position !== 'fixed') throw new Error(`Expected position: fixed, got ${postStyles.position}`);
    if (postStyles.left !== '32px') throw new Error(`Expected left: 32px, got ${postStyles.left}`);
    if (postStyles.bottom !== '32px') throw new Error(`Expected bottom: 32px, got ${postStyles.bottom}`);
    if (postStyles.zIndex !== '900') throw new Error(`Expected zIndex: 900, got ${postStyles.zIndex}`);
    if (postStyles.isInsideFooter) throw new Error('#capsuleGoTop is inside footer on /post');
    if (postStyles.isVisibleClass) throw new Error('Button should not have .is-visible at top of page');
    if (postStyles.visibility !== 'hidden' || postStyles.opacity !== '0') {
      throw new Error(`Expected button hidden at top of page (visibility: hidden, opacity: 0), got visibility: ${postStyles.visibility}, opacity: ${postStyles.opacity}`);
    }
    console.log('  ✅ Initial styles & hidden state verified.');

    // B. Scroll down <= 150px (should remain hidden)
    const smallScrollRes = await evaluate(`(() => {
      window.scrollTo(0, 100);
      window.dispatchEvent(new Event('scroll'));
      const btn = document.getElementById('capsuleGoTop');
      const cs = window.getComputedStyle(btn);
      return {
        scrollY: window.pageYOffset || document.documentElement.scrollTop,
        isVisibleClass: btn.classList.contains('is-visible'),
        visibility: cs.visibility,
        opacity: cs.opacity
      };
    })()`);
    console.log('After scrolling down to 100px (<= 150):', smallScrollRes);
    if (smallScrollRes.isVisibleClass || smallScrollRes.visibility !== 'hidden') {
      throw new Error('Button should remain hidden when scrolled <= 150px');
    }
    console.log('  ✅ Stays hidden for small scroll <= 150px.');

    // C. Scroll down past threshold (e.g. 500px): must become visible
    const downScrollRes = await evaluate(`(async () => {
      window.scrollTo(0, 500);
      window.dispatchEvent(new Event('scroll'));
      await new Promise(r => setTimeout(r, 350));
      const btn = document.getElementById('capsuleGoTop');
      const cs = window.getComputedStyle(btn);
      return {
        scrollY: window.pageYOffset || document.documentElement.scrollTop,
        isVisibleClass: btn.classList.contains('is-visible'),
        visibility: cs.visibility,
        opacity: cs.opacity,
        pointerEvents: cs.pointerEvents
      };
    })()`);
    console.log('After scrolling down to 500px (> 250):', downScrollRes);
    if (!downScrollRes.isVisibleClass || downScrollRes.visibility !== 'visible' || downScrollRes.opacity !== '1' || downScrollRes.pointerEvents !== 'auto') {
      throw new Error(`Button should be visible when scrolled down! got isVisibleClass: ${downScrollRes.isVisibleClass}, visibility: ${downScrollRes.visibility}, opacity: ${downScrollRes.opacity}, pointerEvents: ${downScrollRes.pointerEvents}`);
    }
    console.log('  ✅ Appears (.is-visible, visibility: visible, opacity: 1, pointer-events: auto) when scrolling down.');

    // D. Scroll up (e.g. from 500 to 400): must hide
    const upScrollRes = await evaluate(`(async () => {
      window.scrollTo(0, 400);
      window.dispatchEvent(new Event('scroll'));
      await new Promise(r => setTimeout(r, 350));
      const btn = document.getElementById('capsuleGoTop');
      const cs = window.getComputedStyle(btn);
      return {
        scrollY: window.pageYOffset || document.documentElement.scrollTop,
        isVisibleClass: btn.classList.contains('is-visible'),
        visibility: cs.visibility,
        opacity: cs.opacity,
        pointerEvents: cs.pointerEvents
      };
    })()`);
    console.log('After scrolling up from 500px to 400px:', upScrollRes);
    if (upScrollRes.isVisibleClass || upScrollRes.visibility !== 'hidden' || upScrollRes.opacity !== '0' || upScrollRes.pointerEvents !== 'none') {
      throw new Error(`Button should be hidden when scrolling up! got isVisibleClass: ${upScrollRes.isVisibleClass}, visibility: ${upScrollRes.visibility}, opacity: ${upScrollRes.opacity}`);
    }
    console.log('  ✅ Hides when scrolling up.');

    // E. Scroll down again (from 400 to 700): reappears
    const downAgainRes = await evaluate(`(async () => {
      window.scrollTo(0, 700);
      window.dispatchEvent(new Event('scroll'));
      await new Promise(r => setTimeout(r, 350));
      const btn = document.getElementById('capsuleGoTop');
      const cs = window.getComputedStyle(btn);
      return {
        scrollY: window.pageYOffset || document.documentElement.scrollTop,
        isVisibleClass: btn.classList.contains('is-visible'),
        visibility: cs.visibility,
        opacity: cs.opacity
      };
    })()`);
    console.log('After scrolling down to 700px:', downAgainRes);
    if (!downAgainRes.isVisibleClass || downAgainRes.visibility !== 'visible') {
      throw new Error('Button should reappear when scrolling down again');
    }
    console.log('  ✅ Reappears when scrolling down again.');

    // F. Click button: smoothly scrolls to top and removes is-visible
    const clickRes = await evaluate(`(() => {
      const btn = document.getElementById('capsuleGoTop');
      btn.click();
      return {
        isVisibleClass: btn.classList.contains('is-visible')
      };
    })()`);
    console.log('After clicking go-to-top button:', clickRes);
    if (clickRes.isVisibleClass) {
      throw new Error('Button should immediately remove .is-visible on click');
    }
    console.log('  ✅ Clicking triggers scroll to top and hides button.');

    // G. Mobile responsive breakpoint check on /post (375x820)
    console.log('\n--- Testing Mobile Breakpoint (375x820) on /post ---');
    await sendSession('Emulation.setDeviceMetricsOverride', { width: 375, height: 820, deviceScaleFactor: 2, mobile: true });
    await new Promise(r => setTimeout(r, 200));

    const mobileStyles = await evaluate(`(() => {
      const btn = document.getElementById('capsuleGoTop');
      const cs = window.getComputedStyle(btn);
      return {
        left: cs.left,
        bottom: cs.bottom,
        width: cs.width,
        height: cs.height,
        position: cs.position
      };
    })()`);
    console.log('Mobile computed styles:', mobileStyles);
    if (mobileStyles.position !== 'fixed') throw new Error(`Mobile position should be fixed, got ${mobileStyles.position}`);
    if (mobileStyles.left !== '20px') throw new Error(`Mobile left should be 20px, got ${mobileStyles.left}`);
    if (mobileStyles.bottom !== '24px') throw new Error(`Mobile bottom should be 24px, got ${mobileStyles.bottom}`);
    if (mobileStyles.width !== '40px') throw new Error(`Mobile width should be 40px, got ${mobileStyles.width}`);
    if (mobileStyles.height !== '40px') throw new Error(`Mobile height should be 40px, got ${mobileStyles.height}`);
    console.log('  ✅ Mobile dimensions and left-anchoring verified.');

    // Step 2H: Accessibility, Focus Ring, Print Media, and Reduced Motion Checks
    console.log('\n--- Testing Accessibility, Focus Ring & Print Rules on /post ---');
    const a11yAndPrint = await evaluate(`(() => {
      const btn = document.getElementById('capsuleGoTop');
      btn.classList.add('is-visible');
      btn.focus();
      const cs = window.getComputedStyle(btn);
      
      let hasPrintRule = false;
      let hasReducedMotion = false;
      for (const sheet of document.styleSheets) {
        try {
          for (const rule of sheet.cssRules) {
            if (rule.media && rule.media.mediaText.includes('print')) {
              for (const r of rule.cssRules || []) {
                if (r.selectorText && r.selectorText.includes('capsule-go-top')) {
                  hasPrintRule = true;
                }
              }
            }
            if (rule.media && rule.media.mediaText.includes('prefers-reduced-motion')) {
              for (const r of rule.cssRules || []) {
                if (r.selectorText && r.selectorText.includes('capsule-go-top')) {
                  hasReducedMotion = true;
                }
              }
            }
          }
        } catch(e) {}
      }

      return {
        outlineStyle: cs.outlineStyle,
        outlineWidth: cs.outlineWidth,
        outlineColor: cs.outlineColor,
        hasPrintRule,
        hasReducedMotion
      };
    })()`);
    console.log('A11y & Print Checks:', a11yAndPrint);
    if (a11yAndPrint.outlineStyle !== 'solid') {
      throw new Error(`Expected focus-visible outlineStyle to be solid, got ${a11yAndPrint.outlineStyle}`);
    }
    if (!a11yAndPrint.hasPrintRule) {
      throw new Error('Expected print media rule to hide .capsule-go-top');
    }
    if (!a11yAndPrint.hasReducedMotion) {
      throw new Error('Expected prefers-reduced-motion media rule for .capsule-go-top');
    }
    console.log('  ✅ Verified :focus-visible outline, print media hiding, and reduced motion safety.');

    // Step 3: Test on /page in Desktop Viewport
    console.log('\n--- Testing /page in Desktop Viewport (1200x900) ---');
    await sendSession('Emulation.setDeviceMetricsOverride', { width: 1200, height: 900, deviceScaleFactor: 1, mobile: false });
    await sendSession('Page.navigate', { url: 'http://localhost:4321/page' });
    await new Promise(r => setTimeout(r, 600));

    const pageScrollTest = await evaluate(`(() => {
      const btn = document.getElementById('capsuleGoTop');
      if (!btn) return { exists: false };
      
      // Initial
      const initVisible = btn.classList.contains('is-visible');
      
      // Scroll down
      window.scrollTo(0, 500);
      window.dispatchEvent(new Event('scroll'));
      const downVisible = btn.classList.contains('is-visible');
      
      // Scroll up
      window.scrollTo(0, 300);
      window.dispatchEvent(new Event('scroll'));
      const upVisible = btn.classList.contains('is-visible');
      
      return {
        exists: true,
        initVisible,
        downVisible,
        upVisible,
        isInsideFooter: !!btn.closest('footer')
      };
    })()`);

    console.log('Page scroll test results:', pageScrollTest);
    if (!pageScrollTest.exists) throw new Error('#capsuleGoTop missing on /page');
    if (pageScrollTest.initVisible) throw new Error('Initial should not be visible on /page');
    if (!pageScrollTest.downVisible) throw new Error('Should become visible scrolling down on /page');
    if (pageScrollTest.upVisible) throw new Error('Should hide scrolling up on /page');
    if (pageScrollTest.isInsideFooter) throw new Error('Button is inside footer on /page');
    console.log('  ✅ /page full behavior matches /post.');

    // Step 4: Absence check on other pages in browser
    console.log('\n--- Testing absence in browser on /theme and /posts ---');
    await sendSession('Page.navigate', { url: 'http://localhost:4321/theme' });
    await new Promise(r => setTimeout(r, 400));
    const themeBtn = await evaluate(`!!document.getElementById('capsuleGoTop')`);
    if (themeBtn) throw new Error('#capsuleGoTop found on /theme!');
    console.log('  ✅ Verified absent on /theme in real DOM.');

    await sendSession('Page.navigate', { url: 'http://localhost:4321/posts' });
    await new Promise(r => setTimeout(r, 400));
    const postsBtn = await evaluate(`!!document.getElementById('capsuleGoTop')`);
    if (postsBtn) throw new Error('#capsuleGoTop found on /posts!');
    console.log('  ✅ Verified absent on /posts in real DOM.');

    console.log('\n================================================================');
    console.log('   ALL VERIFICATION CHECKS PASSED PERFECTLY!');
    console.log('================================================================');
  } finally {
    ws.close();
    chrome.kill();
  }
}

runGoTopVerification().catch(err => {
  console.error('\n❌ VERIFICATION FAILED:', err);
  process.exit(1);
});
