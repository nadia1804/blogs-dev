const { spawn } = require('child_process');

async function runReviewerDeepChecks() {
  console.log('================================================================');
  console.log('    REVIEWER DEEP CHECKS: EDGE CASES & REGRESSION TESTS');
  console.log('================================================================');

  const profileDir = require('os').tmpdir() + '/chrome-reviewer-' + Date.now();
  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9258',
    '--disable-gpu',
    '--no-first-run',
    '--user-data-dir=' + profileDir
  ]);

  let ver = null;
  for (let attempt = 0; attempt < 20; attempt++) {
    await new Promise(r => setTimeout(r, 300));
    try {
      const res = await fetch('http://127.0.0.1:9258/json/version');
      if (res.ok) {
        ver = await res.json();
        break;
      }
    } catch (e) {}
  }
  if (!ver) {
    chrome.kill();
    throw new Error('Could not connect to Chrome debugging port 9258');
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
    return new Promise(resolve => {
      const reqId = id++;
      callbacks.set(reqId, resolve);
      ws.send(JSON.stringify({ id: reqId, method, params }));
    });
  }

  const target = await send('Target.createTarget', { url: 'about:blank' });
  const attach = await send('Target.attachToTarget', { targetId: target.result.targetId, flatten: true });
  const sessionId = attach.result.sessionId;

  function sendSession(method, params = {}) {
    return new Promise(resolve => {
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
    // --------------------------------------------------------------------------
    // TEST 1: Boundary & Re-appearance on /page (Static Page with no .post-social-share)
    // --------------------------------------------------------------------------
    console.log('\n[TEST 1] Boundary & Re-appearance on /page:');
    await sendSession('Emulation.setDeviceMetricsOverride', { width: 1200, height: 900, deviceScaleFactor: 1, mobile: false });
    await sendSession('Page.navigate', { url: 'http://localhost:4321/page' });
    await new Promise(r => setTimeout(r, 800));

    // Scroll to end of prose on /page
    const pageBoundaries = await evaluate(`(() => {
      const prose = document.querySelector('.post-prose');
      const footer = document.querySelector('.footer-brand');
      return {
        proseBottomDocY: prose.getBoundingClientRect().bottom + window.scrollY,
        footerDocY: footer.getBoundingClientRect().top + window.scrollY,
        windowHeight: window.innerHeight,
        maxScroll: document.documentElement.scrollHeight - window.innerHeight
      };
    })()`);
    console.log('Geometry on /page:', pageBoundaries);

    // Scroll to past prose bottom into boundary zone (before footer trigger)
    const pageScrollTarget = Math.round(pageBoundaries.proseBottomDocY - pageBoundaries.windowHeight + 70);
    const inPageBoundary = await evaluate(`((targetScroll) => {
      window.scrollTo(0, targetScroll);
      window.dispatchEvent(new Event('scroll'));
      const btn = document.getElementById('capsuleGoTop');
      return {
        scrollY: window.scrollY,
        isVisible: btn.classList.contains('is-visible')
      };
    })(${pageScrollTarget})`);
    console.log('In /page content end boundary zone:', inPageBoundary);
    if (!inPageBoundary.isVisible) {
      throw new Error('Button MUST be visible when entering content end boundary zone on /page!');
    }
    console.log('  ✅ Button is visible in boundary zone on /page.');

    // Scroll all the way down to footer on /page
    const pageAtFooter = await evaluate(`(() => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollTo(0, maxScroll);
      window.dispatchEvent(new Event('scroll'));
      const btn = document.getElementById('capsuleGoTop');
      return {
        scrollY: window.scrollY,
        isVisible: btn.classList.contains('is-visible')
      };
    })()`);
    console.log('At footer on /page:', pageAtFooter);
    if (pageAtFooter.isVisible) {
      throw new Error('Button MUST be hidden at footer on /page!');
    }
    console.log('  ✅ Button is correctly hidden at footer on /page.');

    // Scroll back UP from footer on /page into boundary zone
    const pageScrollUpFromFooter = await evaluate(`((targetScroll) => {
      window.scrollTo(0, targetScroll);
      window.dispatchEvent(new Event('scroll'));
      const btn = document.getElementById('capsuleGoTop');
      return {
        scrollY: window.scrollY,
        isVisible: btn.classList.contains('is-visible')
      };
    })(${pageScrollTarget})`);
    console.log('Scrolling up from footer on /page:', pageScrollUpFromFooter);
    if (!pageScrollUpFromFooter.isVisible) {
      throw new Error('Button MUST re-appear when scrolling up from footer on /page!');
    }
    console.log('  ✅ Button RE-APPEARS when scrolling up away from footer on /page!');

    // --------------------------------------------------------------------------
    // TEST 2: Go to top click smooth suppression (button does NOT flash back on)
    // --------------------------------------------------------------------------
    console.log('\n[TEST 2] Go-to-top click smooth suppression on /post:');
    await sendSession('Page.navigate', { url: 'http://localhost:4321/post' });
    await new Promise(r => setTimeout(r, 800));

    // Scroll into share section
    await evaluate(`(() => {
      window.scrollTo(0, 2250);
      window.dispatchEvent(new Event('scroll'));
    })()`);

    const clickGoTopCheck = await evaluate(`(async () => {
      const btn = document.getElementById('capsuleGoTop');
      if (!btn.classList.contains('is-visible')) {
        return { error: 'Button was not visible before click' };
      }
      btn.click();
      // Immediately after click, is-visible should be removed
      const immediatelyAfterClick = btn.classList.contains('is-visible');

      // Simulate a scroll event while smooth scrolling is still in progress near 2100px
      window.scrollTo(0, 2100);
      window.dispatchEvent(new Event('scroll'));
      const duringSmoothScroll = btn.classList.contains('is-visible');

      // Scroll to top
      window.scrollTo(0, 0);
      window.dispatchEvent(new Event('scroll'));
      const atTop = btn.classList.contains('is-visible');

      return {
        immediatelyAfterClick,
        duringSmoothScroll,
        atTop
      };
    })()`);
    console.log('Click suppression states:', clickGoTopCheck);
    if (clickGoTopCheck.error) throw new Error(clickGoTopCheck.error);
    if (clickGoTopCheck.immediatelyAfterClick) throw new Error('Button should not be visible immediately after click');
    if (clickGoTopCheck.duringSmoothScroll) throw new Error('Button should NOT flash back visible during smooth scroll to top!');
    if (clickGoTopCheck.atTop) throw new Error('Button should remain hidden at top');
    console.log('  ✅ Button remains cleanly suppressed during smooth-scroll to top.');

    // --------------------------------------------------------------------------
    // TEST 3: TOC active class update on click
    // --------------------------------------------------------------------------
    console.log('\n[TEST 3] TOC active class update on click on /post:');
    await evaluate(`(() => {
      window.scrollTo(0, 0);
    })()`);

    const tocActiveCheck = await evaluate(`(() => {
      const linkPipeline = document.querySelector('.post-sidebar .toc-list a[href="#the-pipeline"]');
      const linkNotion = document.querySelector('.post-sidebar .toc-list a[href="#why-headless-notion"]');
      linkPipeline.click();
      return {
        pipelineActive: linkPipeline.classList.contains('active'),
        notionActive: linkNotion.classList.contains('active')
      };
    })()`);
    console.log('TOC active states after click:', tocActiveCheck);
    if (!tocActiveCheck.pipelineActive) throw new Error('Clicked TOC link #the-pipeline MUST receive active class');
    if (tocActiveCheck.notionActive) throw new Error('Previous TOC link must lose active class');
    console.log('  ✅ Clicked TOC link updates active highlight correctly.');

    console.log('\n================================================================');
    console.log('   🎉 ALL REVIEWER DEEP CHECKS PASSED PERFECTLY!');
    console.log('================================================================');
  } finally {
    ws.close();
    chrome.kill();
  }
}

runReviewerDeepChecks().catch(err => {
  console.error('\n❌ REVIEWER CHECKS FAILED:', err);
  process.exit(1);
});
