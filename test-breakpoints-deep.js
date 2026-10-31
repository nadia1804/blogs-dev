const { spawn } = require('child_process');

async function runDeepVerification() {
  // 1. Ensure dev-server is running on port 4321
  let serverProcess = null;
  try {
    const check = await fetch('http://127.0.0.1:4321/theme');
    if (!check.ok) throw new Error('status not ok');
    console.log('Dev server already active on port 4321.');
  } catch (e) {
    console.log('Starting dev-server.js on port 4321...');
    serverProcess = spawn('node', ['dev-server.js'], { cwd: __dirname, stdio: 'ignore' });
    await new Promise(r => setTimeout(r, 1200));
  }

  const profileDir = require('os').tmpdir() + '/chrome-audit-' + Date.now();
  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9230',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=' + profileDir
  ]);

  let ver = null;
  for (let attempt = 0; attempt < 20; attempt++) {
    await new Promise(r => setTimeout(r, 300));
    try {
      const res = await fetch('http://127.0.0.1:9230/json/version');
      if (res.ok) {
        ver = await res.json();
        break;
      }
    } catch (e) {}
  }
  if (!ver) throw new Error('Could not connect to Chrome debugging port 9230 after 20 attempts');

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

  const pages = ['/theme', '/posts', '/authors', '/author', '/page', '/post'];
  const breakpoints = [
    { name: 'SM-375', width: 375, height: 820 },
    { name: 'SM-414', width: 414, height: 896 },
    { name: 'MD-768', width: 768, height: 1024 },
    { name: 'LG-1200', width: 1200, height: 900 }
  ];

  let totalFailures = 0;
  const auditReport = [];

  console.log('================================================================');
  console.log('   DEEP BREAKPOINT & RESPONSIVENESS AUTOMATED VERIFICATION');
  console.log('================================================================');

  for (const pagePath of pages) {
    console.log(`\n>>> Testing Page: ${pagePath}`);
    await sendSession('Page.navigate', { url: `http://localhost:4321${pagePath}` });
    await new Promise(r => setTimeout(r, 600));

    for (const bp of breakpoints) {
      await sendSession('Emulation.setDeviceMetricsOverride', {
        width: bp.width,
        height: bp.height,
        deviceScaleFactor: 1,
        mobile: false
      });
      await new Promise(r => setTimeout(r, 200));

      const res = await sendSession('Runtime.evaluate', {
        expression: `(() => {
          const docEl = document.documentElement;
          const body = document.body;
          const scrollW = Math.max(docEl.scrollWidth, body.scrollWidth);
          const innerW = window.innerWidth;
          const overflowX = scrollW > innerW;

          // Card Grid Columns (Computed CSS Grid Track Columns)
          const cardGrid = document.querySelector('.capsule-card-grid, .capsule-authors-grid');
          let gridCols = 0;
          if (cardGrid) {
            const tmpl = getComputedStyle(cardGrid).gridTemplateColumns;
            if (tmpl && tmpl !== 'none') {
              gridCols = tmpl.split(' ').filter(s => s.trim().length > 0).length;
            }
          }

          // Header components
          const hamburger = document.querySelector('.capsule-mobile-toggle');
          const hamburgerVisible = hamburger ? getComputedStyle(hamburger).display !== 'none' : false;
          const navList = document.querySelector('.capsule-nav');
          const navListVisible = navList ? getComputedStyle(navList).display !== 'none' : false;

          // Card footer check (author avatar + name on left, date on right, no overlap)
          let cardFooterOk = true;
          let cardFooterDetails = '';
          const footers = document.querySelectorAll('.card-footer');
          if (footers.length > 0) {
            for (const f of footers) {
              const authorLink = f.querySelector('.card-author-link');
              const authorName = f.querySelector('.card-author-name');
              const dateEl = f.querySelector('.card-date');
              if (authorLink && dateEl) {
                const aRect = authorLink.getBoundingClientRect();
                const dRect = dateEl.getBoundingClientRect();
                // Check if overlapping
                if (aRect.right > dRect.left + 2) {
                  cardFooterOk = false;
                  cardFooterDetails = \`Overlap detected: author right \${Math.round(aRect.right)} > date left \${Math.round(dRect.left)}\`;
                  break;
                }
              }
            }
          }

          // Single post meta capsule check
          const metaCapsule = document.querySelector('.post-meta-capsule');
          let metaCapsuleFits = true;
          if (metaCapsule) {
            const mRect = metaCapsule.getBoundingClientRect();
            if (mRect.right > innerW || mRect.width > innerW) {
              metaCapsuleFits = false;
            }
          }

          return {
            innerW,
            scrollW,
            overflowX,
            overflowDiff: scrollW - innerW,
            gridCols,
            hamburgerVisible,
            navListVisible,
            cardFooterOk,
            cardFooterDetails,
            metaCapsuleFits
          };
        })()`,
        returnByValue: true
      });

      const data = res.result?.result?.value;
      if (!data) {
        console.error('  Failed to evaluate page data:', res);
        totalFailures++;
        continue;
      }

      let passed = !data.overflowX;
      let notes = [];

      // Breakpoint specific checks
      if (bp.width <= 414) {
        // SM checks
        if (!data.hamburgerVisible) {
          notes.push('WARN: hamburger not visible on SM');
        }
        if (data.gridCols > 1) {
          passed = false;
          notes.push(`FAIL: card grid has ${data.gridCols} cols on SM (expected 1)`);
        }
        if (!data.cardFooterOk) {
          passed = false;
          notes.push(`FAIL: card footer overlap: ${data.cardFooterDetails}`);
        }
        if (!data.metaCapsuleFits) {
          passed = false;
          notes.push('FAIL: meta capsule overflows SM');
        }
      } else if (bp.width === 768) {
        // MD checks
        if (data.gridCols !== 2 && data.gridCols !== 0) {
          // Some pages like /page don't have grid
          passed = false;
          notes.push(`FAIL: card grid has ${data.gridCols} cols on MD (expected 2)`);
        }
      } else if (bp.width === 1200) {
        // LG checks
        if (data.gridCols !== 3 && data.gridCols !== 0) {
          passed = false;
          notes.push(`FAIL: card grid has ${data.gridCols} cols on LG (expected 3)`);
        }
        if (!data.navListVisible) {
          passed = false;
          notes.push('FAIL: desktop nav list hidden on LG');
        }
      }

      if (data.overflowX) {
        totalFailures++;
        console.log(`  [${bp.name}] ❌ OVERFLOW: scrollW ${data.scrollW}px > innerW ${data.innerW}px (diff: +${data.overflowDiff}px)`);
      } else if (!passed) {
        totalFailures++;
        console.log(`  [${bp.name}] ❌ SPEC FAILURE: ${notes.join('; ')}`);
      } else {
        console.log(`  [${bp.name}] ✅ PASS: zero overflow (cols: ${data.gridCols}, hamburger: ${data.hamburgerVisible}, navList: ${data.navListVisible})`);
      }
    }

    // Extra Edge-Case Verification: Ultra-narrow mobile viewports (360px Android and 320px Small Mobile)
    for (const narrowWidth of [360, 320]) {
      await sendSession('Emulation.setDeviceMetricsOverride', { width: narrowWidth, height: 740, deviceScaleFactor: 1, mobile: false });
      await new Promise(r => setTimeout(r, 150));
      const narrowRes = await sendSession('Runtime.evaluate', {
        expression: `(() => {
          const docEl = document.documentElement;
          const body = document.body;
          const scrollW = Math.max(docEl.scrollWidth, body.scrollWidth);
          const innerW = window.innerWidth;
          return { overflowX: scrollW > innerW, scrollW, innerW, diff: scrollW - innerW };
        })()`,
        returnByValue: true
      });
      const ndata = narrowRes.result?.result?.value;
      if (ndata?.overflowX) {
        totalFailures++;
        console.log(`  [NARROW-${narrowWidth}] ❌ OVERFLOW: scrollW ${ndata.scrollW}px > innerW ${ndata.innerW}px (diff: +${ndata.diff}px)`);
      } else {
        console.log(`  [NARROW-${narrowWidth}] ✅ PASS: zero overflow at ${narrowWidth}px`);
      }
    }

    // Interactive SM Tests: Hamburger dropdown toggle (with click outside) & Search Modal on mobile 375px
    console.log(`\n  >>> [${pagePath}] Testing Mobile Hamburger Menu Toggle & Click-Outside at 375px:`);
    await sendSession('Emulation.setDeviceMetricsOverride', { width: 375, height: 820, deviceScaleFactor: 1, mobile: false });
    await new Promise(r => setTimeout(r, 150));

    const hamburgerTest = await sendSession('Runtime.evaluate', {
      expression: `(async () => {
        const btn = document.getElementById('btnCapsuleMobile');
        const nav = document.getElementById('capsuleNavList');
        if (!btn || !nav) return { ok: false, error: 'Button or nav not found' };
        
        const initialOpen = nav.classList.contains('mobile-open');
        btn.click();
        await new Promise(r => setTimeout(r, 100));
        const afterClickOpen = nav.classList.contains('mobile-open');
        const navDisplay = getComputedStyle(nav).display;
        const rect = nav.getBoundingClientRect();
        const overflowX = document.documentElement.scrollWidth > window.innerWidth;

        // Click outside on body to test outside click dismissal
        document.body.click();
        await new Promise(r => setTimeout(r, 100));
        const closedByOutside = !nav.classList.contains('mobile-open');

        // Toggle open and close again
        btn.click();
        await new Promise(r => setTimeout(r, 50));
        btn.click();
        await new Promise(r => setTimeout(r, 50));
        const closedAgain = !nav.classList.contains('mobile-open');

        return {
          ok: true,
          initialOpen,
          afterClickOpen,
          closedByOutside,
          closedAgain,
          navDisplay,
          rectWidth: Math.round(rect.width),
          overflowX
        };
      })()`,
      awaitPromise: true,
      returnByValue: true
    });
    const hb = hamburgerTest.result?.result?.value;
    if (hb?.afterClickOpen && hb?.closedByOutside && !hb?.overflowX) {
      console.log(`  ✅ Hamburger Menu Toggle & Dismiss: Smoothly toggles mobile-open and dismisses on outside click (width: ${hb.rectWidth}px)`);
    } else {
      totalFailures++;
      console.log('  ❌ Hamburger Menu Toggle failed:', hb);
    }

    console.log(`  >>> [${pagePath}] Testing Instant Search Modal at 375px:`);
    const searchTest = await sendSession('Runtime.evaluate', {
      expression: `(async () => {
        const searchBtn = document.getElementById('btnCapsuleSearch');
        const modal = document.getElementById('capsuleSearchModal');
        const dialog = document.querySelector('.capsule-search-dialog');
        if (!searchBtn || !modal || !dialog) return { ok: false, error: 'Elements not found' };

        searchBtn.click();
        await new Promise(r => setTimeout(r, 200));

        const modalDisplay = getComputedStyle(modal).display;
        const modalActive = modal.classList.contains('active');
        const dialogRect = dialog.getBoundingClientRect();
        const fitsScreen = dialogRect.width <= 375 && dialogRect.right <= 375;
        const overflowX = document.documentElement.scrollWidth > window.innerWidth;

        // Close modal
        const closeBtn = document.getElementById('btnCloseSearchModal');
        if (closeBtn) closeBtn.click();
        await new Promise(r => setTimeout(r, 100));
        const closed = !modal.classList.contains('active') || getComputedStyle(modal).display === 'none';

        return {
          ok: true,
          modalDisplay,
          modalActive,
          closed,
          dialogWidth: Math.round(dialogRect.width),
          dialogRight: Math.round(dialogRect.right),
          fitsScreen,
          overflowX
        };
      })()`,
      awaitPromise: true,
      returnByValue: true
    });
    const st = searchTest.result?.result?.value;
    if (st?.fitsScreen && st?.closed && !st?.overflowX) {
      console.log(`  ✅ Search Modal: Fits within mobile width (width: ${st.dialogWidth}px <= 375px, clean close, zero overflow)`);
    } else {
      totalFailures++;
      console.log('  ❌ Search Modal test failed:', st);
    }
  }

  // Admin Sandbox Interactive Verification
  console.log('\n>>> Testing Admin Shell Sandbox (/admin):');
  await sendSession('Page.navigate', { url: 'http://localhost:4321/admin' });
  await new Promise(r => setTimeout(r, 600));

  await sendSession('Emulation.setDeviceMetricsOverride', { width: 1400, height: 900, deviceScaleFactor: 1, mobile: false });
  await new Promise(r => setTimeout(r, 200));

  const adminRes = await sendSession('Runtime.evaluate', {
    expression: `(async () => {
      const btnPreview = document.getElementById('btnPreview');
      if (btnPreview) btnPreview.click();
      const modal = document.getElementById('sandboxModal');
      const w = document.getElementById('viewportWrapper');
      const iframe = document.getElementById('themePreviewIframe');
      
      const states = {};

      for (const vp of ['sm', 'md', 'lg']) {
        const btn = document.querySelector(\`[data-vp="\${vp}"]\`);
        if (btn) btn.click();
        await new Promise(r => setTimeout(r, 400));
        const rect = w.getBoundingClientRect();
        const computed = getComputedStyle(w).width;
        states[vp] = {
          expected: vp === 'sm' ? 375 : vp === 'md' ? 768 : 1200,
          actual: Math.round(rect.width),
          computedWidth: computed,
          iframePresent: !!iframe
        };
      }

      return states;
    })()`,
    awaitPromise: true,
    returnByValue: true
  });

  const admStates = adminRes.result?.result?.value;
  console.log('  Admin Viewport States:', JSON.stringify(admStates, null, 2));

  let adminOk = true;
  for (const [vp, s] of Object.entries(admStates || {})) {
    if (Math.abs(s.actual - s.expected) > 5) {
      adminOk = false;
      totalFailures++;
      console.log(`  ❌ Admin ${vp.toUpperCase()} resize failed: actual ${s.actual}px != expected ${s.expected}px`);
    } else {
      console.log(`  ✅ Admin ${vp.toUpperCase()}: exact resize to ${s.actual}px (${s.computedWidth})`);
    }
  }

  console.log('\n================================================================');
  if (totalFailures === 0) {
    console.log('🎉 ALL BREAKPOINTS & RESPONSIVE AUDITS PASSED PERFECTLY (0 FAILURES)');
  } else {
    console.log(`⚠️ AUDIT COMPLETED WITH ${totalFailures} FAILURES`);
  }
  console.log('================================================================');

  ws.close();
  chrome.kill();
  if (serverProcess) serverProcess.kill();
  process.exit(totalFailures === 0 ? 0 : 1);
}

runDeepVerification().catch(err => {
  console.error('Audit run error:', err);
  process.exit(1);
});
