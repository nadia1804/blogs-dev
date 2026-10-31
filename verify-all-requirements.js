const { spawn } = require('child_process');

async function runDeepVerification() {
  console.log('================================================================');
  console.log('    COMPREHENSIVE DEEP VERIFICATION: TOC OFFSET & GO-TOP 2.0');
  console.log('================================================================');

  const profileDir = require('os').tmpdir() + '/chrome-deep-' + Date.now();
  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9254',
    '--disable-gpu',
    '--no-first-run',
    '--user-data-dir=' + profileDir
  ]);

  let ver = null;
  for (let attempt = 0; attempt < 20; attempt++) {
    await new Promise(r => setTimeout(r, 300));
    try {
      const res = await fetch('http://127.0.0.1:9254/json/version');
      if (res.ok) {
        ver = await res.json();
        break;
      }
    } catch (e) {}
  }
  if (!ver) {
    chrome.kill();
    throw new Error('Could not connect to Chrome debugging port 9254');
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
    // TEST SUITE 1: TOC Scroll Offset Fix on Desktop & Mobile (/post & /page)
    // --------------------------------------------------------------------------
    console.log('\n[TEST 1] TOC Scroll Offset & Header Clearance on /post (Desktop 1200x900):');
    await sendSession('Emulation.setDeviceMetricsOverride', { width: 1200, height: 900, deviceScaleFactor: 1, mobile: false });
    await sendSession('Page.navigate', { url: 'http://localhost:4321/post' });
    await new Promise(r => setTimeout(r, 800));

    const tocCheck1 = await evaluate(`(() => {
      const heading = document.getElementById('the-pipeline');
      const cs = window.getComputedStyle(heading);
      return {
        id: heading.id,
        scrollMarginTop: cs.scrollMarginTop
      };
    })()`);
    console.log('Heading scroll-margin-top computed:', tocCheck1);
    if (tocCheck1.scrollMarginTop !== '104px') {
      throw new Error(`Expected scrollMarginTop: 104px, got ${tocCheck1.scrollMarginTop}`);
    }

    // Click TOC anchor link and measure clearance
    const clickTocResult = await evaluate(`(async () => {
      const link = document.querySelector('.post-sidebar .toc-list a[href="#the-pipeline"]');
      if (!link) return { found: false };
      link.click();
      await new Promise(r => setTimeout(r, 700));

      const heading = document.getElementById('the-pipeline');
      const header = document.querySelector('.capsule-header');
      const headingRect = heading.getBoundingClientRect();
      const headerRect = header.getBoundingClientRect();

      return {
        found: true,
        headingTop: headingRect.top,
        headerBottom: headerRect.bottom,
        clearanceBelowNavbar: headingRect.top - headerRect.bottom
      };
    })()`);

    console.log('TOC click scroll clearance on /post:', clickTocResult);
    if (!clickTocResult.found) throw new Error('TOC link #the-pipeline not found');
    if (clickTocResult.clearanceBelowNavbar < 10) {
      throw new Error(`Heading is too close to or behind navbar! clearance: ${clickTocResult.clearanceBelowNavbar}px`);
    }
    console.log(`  ✅ Heading landed with ${clickTocResult.clearanceBelowNavbar}px clean clearance below navbar.`);

    // Test TOC on /page (Desktop)
    console.log('\n[TEST 1b] TOC Scroll Offset on /page (Desktop 1200x900):');
    await sendSession('Page.navigate', { url: 'http://localhost:4321/page' });
    await new Promise(r => setTimeout(r, 800));

    const pageTocResult = await evaluate(`(async () => {
      const link = document.querySelector('.toc-list a[href="#notion-integration"]') || document.querySelector('a[href="#notion-integration"]');
      if (!link) return { found: false };
      link.click();
      await new Promise(r => setTimeout(r, 700));

      const heading = document.getElementById('notion-integration');
      const header = document.querySelector('.capsule-header');
      const headingRect = heading.getBoundingClientRect();
      const headerRect = header.getBoundingClientRect();

      return {
        found: true,
        headingTop: headingRect.top,
        headerBottom: headerRect.bottom,
        clearanceBelowNavbar: headingRect.top - headerRect.bottom
      };
    })()`);
    console.log('TOC click scroll clearance on /page:', pageTocResult);
    if (!pageTocResult.found) throw new Error('TOC link #typography not found on /page');
    if (pageTocResult.clearanceBelowNavbar < 10) {
      throw new Error(`Heading is behind navbar on /page! clearance: ${pageTocResult.clearanceBelowNavbar}px`);
    }
    console.log(`  ✅ /page heading landed with ${pageTocResult.clearanceBelowNavbar}px clearance below navbar.`);

    // Test TOC on Mobile (375x820)
    console.log('\n[TEST 1c] TOC Scroll Offset on Mobile Viewport (375x820):');
    await sendSession('Emulation.setDeviceMetricsOverride', { width: 375, height: 820, deviceScaleFactor: 2, mobile: true });
    await sendSession('Page.navigate', { url: 'http://localhost:4321/post' });
    await new Promise(r => setTimeout(r, 800));

    const mobileTocResult = await evaluate(`(async () => {
      const link = document.querySelector('.mobile-toc-box .toc-list a[href="#why-headless-notion"]');
      if (!link) return { found: false };
      link.click();
      await new Promise(r => setTimeout(r, 700));

      const heading = document.getElementById('why-headless-notion');
      const header = document.querySelector('.capsule-header');
      const headingRect = heading.getBoundingClientRect();
      const headerRect = header.getBoundingClientRect();

      return {
        found: true,
        headingTop: headingRect.top,
        headerBottom: headerRect.bottom,
        clearanceBelowNavbar: headingRect.top - headerRect.bottom
      };
    })()`);
    console.log('Mobile TOC clearance:', mobileTocResult);
    if (!mobileTocResult.found) throw new Error('Mobile TOC link not found');
    if (mobileTocResult.clearanceBelowNavbar < 10) {
      throw new Error(`Mobile heading behind navbar! clearance: ${mobileTocResult.clearanceBelowNavbar}px`);
    }
    console.log(`  ✅ Mobile heading landed with ${mobileTocResult.clearanceBelowNavbar}px clearance below navbar.`);

    // --------------------------------------------------------------------------
    // TEST SUITE 2: Reading Progress Percentage in Go Top Button
    // --------------------------------------------------------------------------
    console.log('\n[TEST 2] Reading Progress Percentage in Go Top Button:');
    await sendSession('Emulation.setDeviceMetricsOverride', { width: 1200, height: 900, deviceScaleFactor: 1, mobile: false });
    await sendSession('Page.navigate', { url: 'http://localhost:4321/post' });
    await new Promise(r => setTimeout(r, 800));

    // A. At scroll = 0
    const progress0 = await evaluate(`(() => {
      const btn = document.getElementById('capsuleGoTop');
      const circle = document.getElementById('capsuleProgressCircle');
      const label = document.getElementById('capsuleGoTopPercent');
      return {
        title: btn.getAttribute('title'),
        valuenow: btn.getAttribute('aria-valuenow'),
        labelText: label ? label.textContent.trim() : null,
        circleOffset: circle ? parseFloat(circle.style.strokeDashoffset) : null
      };
    })()`);
    console.log('Progress at scroll = 0:', progress0);
    if (progress0.valuenow !== '0' || progress0.labelText !== '0%') {
      throw new Error(`Expected progress 0% at scroll 0, got ${progress0.labelText}`);
    }
    if (Math.abs(progress0.circleOffset - 119.38) > 1) {
      throw new Error(`Expected circleOffset ~119.38, got ${progress0.circleOffset}`);
    }
    console.log('  ✅ Initial progress is correctly 0% with empty circle stroke.');

    // B. At mid-article scroll (e.g. scrollY = 1200)
    const progressMid = await evaluate(`(() => {
      window.scrollTo(0, 1200);
      window.dispatchEvent(new Event('scroll'));
      const btn = document.getElementById('capsuleGoTop');
      const circle = document.getElementById('capsuleProgressCircle');
      const label = document.getElementById('capsuleGoTopPercent');
      return {
        title: btn.getAttribute('title'),
        valuenow: parseInt(btn.getAttribute('aria-valuenow')),
        labelText: label ? label.textContent.trim() : null,
        circleOffset: circle ? parseFloat(circle.style.strokeDashoffset) : null
      };
    })()`);
    console.log('Progress at scroll = 1200:', progressMid);
    if (progressMid.valuenow <= 10 || progressMid.valuenow >= 90) {
      throw new Error(`Expected mid progress between 10% and 90%, got ${progressMid.valuenow}%`);
    }
    if (progressMid.circleOffset >= 119 || progressMid.circleOffset <= 5) {
      throw new Error(`Expected circleOffset partially filled, got ${progressMid.circleOffset}`);
    }
    console.log(`  ✅ Mid-article progress correctly calculated: ${progressMid.labelText} (offset: ${progressMid.circleOffset}px).`);

    // C. At end of article prose (e.g. scrollY = 2800)
    const progressEnd = await evaluate(`(() => {
      window.scrollTo(0, 2800);
      window.dispatchEvent(new Event('scroll'));
      const btn = document.getElementById('capsuleGoTop');
      const circle = document.getElementById('capsuleProgressCircle');
      const label = document.getElementById('capsuleGoTopPercent');
      return {
        valuenow: parseInt(btn.getAttribute('aria-valuenow')),
        labelText: label ? label.textContent.trim() : null,
        circleOffset: circle ? parseFloat(circle.style.strokeDashoffset) : null
      };
    })()`);
    console.log('Progress near end of prose (scrollY = 2800):', progressEnd);
    if (progressEnd.valuenow < 90) {
      throw new Error(`Expected progress >= 90% near end of prose, got ${progressEnd.valuenow}%`);
    }
    console.log(`  ✅ End of article reading progress: ${progressEnd.labelText}.`);

    // --------------------------------------------------------------------------
    // TEST SUITE 3: Boundary Logic ("Share this article" & Footer Brand)
    // --------------------------------------------------------------------------
    const geom = await evaluate(`(() => {
      const share = document.querySelector('.post-social-share');
      const footer = document.querySelector('.footer-brand');
      return {
        scrollHeight: document.documentElement.scrollHeight,
        windowHeight: window.innerHeight,
        maxScroll: document.documentElement.scrollHeight - window.innerHeight,
        shareDocY: share ? share.getBoundingClientRect().top + window.scrollY : null,
        footerDocY: footer ? footer.getBoundingClientRect().top + window.scrollY : null
      };
    })()`);
    console.log('Geometry on /post:', geom);

    // Target a scroll position where Share section is inside the viewport (shareDocY - windowHeight + 200)
    // and footer is still below viewport (footerDocY - windowHeight - 50)
    const targetShareScroll = Math.round(geom.shareDocY - geom.windowHeight + 250);
    console.log('Target share scroll position:', targetShareScroll);

    // Step 3A: Scroll down to share section
    const inShareSection = await evaluate(`((targetScroll) => {
      const share = document.querySelector('.post-social-share');
      const footer = document.querySelector('.footer-brand');
      window.scrollTo(0, targetScroll);
      window.dispatchEvent(new Event('scroll'));
      const btn = document.getElementById('capsuleGoTop');
      return {
        scrollY: window.scrollY,
        shareRectTop: share.getBoundingClientRect().top,
        footerRectTop: footer.getBoundingClientRect().top,
        windowHeight: window.innerHeight,
        isVisible: btn.classList.contains('is-visible')
      };
    })(${targetShareScroll})`);
    console.log('In share section state:', inShareSection);
    if (!inShareSection.isVisible) {
      throw new Error('Button MUST be visible when entering share section!');
    }
    console.log('  ✅ Button is visible in share section.');
    console.log('  ✅ Button is visible in share section.');

    // Step 3B: Scrolling slightly UP within share section (should RETAIN visibility)
    const scrollUpInShare = await evaluate(`((targetScroll) => {
      window.scrollTo(0, targetScroll - 50); // slight scroll up
      window.dispatchEvent(new Event('scroll'));
      const btn = document.getElementById('capsuleGoTop');
      return {
        scrollY: window.scrollY,
        isVisible: btn.classList.contains('is-visible')
      };
    })(${targetShareScroll})`);
    console.log('Scrolling up within share section:', scrollUpInShare);
    if (!scrollUpInShare.isVisible) {
      throw new Error('Button MUST stay permanently visible in share section even when scrolling up!');
    }
    console.log('  ✅ Button stays permanently visible in share section.');

    // Step 3C: Scrolling all the way down to footer (approaching/passing .footer-brand)
    const atFooter = await evaluate(`(() => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollTo(0, maxScroll);
      window.dispatchEvent(new Event('scroll'));
      const btn = document.getElementById('capsuleGoTop');
      const footerBrand = document.querySelector('.footer-brand');
      return {
        scrollY: window.scrollY,
        maxScroll,
        footerBrandTop: footerBrand.getBoundingClientRect().top,
        windowHeight: window.innerHeight,
        isVisible: btn.classList.contains('is-visible')
      };
    })()`);
    console.log('At footer brand state:', atFooter);
    if (atFooter.isVisible) {
      throw new Error('Button MUST be hidden when approaching or passing .footer-brand!');
    }
    console.log('  ✅ Button is correctly HIDDEN near/at footer brand.');

    // Step 3D: Scrolling UP away from footer towards "Share this article:"
    const scrollUpFromFooter = await evaluate(`((targetScroll) => {
      // Scroll back up away from footer into share zone
      window.scrollTo(0, targetScroll);
      window.dispatchEvent(new Event('scroll'));
      const btn = document.getElementById('capsuleGoTop');
      return {
        scrollY: window.scrollY,
        isVisible: btn.classList.contains('is-visible')
      };
    })(${targetShareScroll})`);
    console.log('Scrolling up from footer to share zone:', scrollUpFromFooter);
    if (!scrollUpFromFooter.isVisible) {
      throw new Error('Button MUST re-appear when scrolling up away from footer to Share section!');
    }
    console.log('  ✅ Button RE-APPEARS when scrolling up away from footer.');

    // Step 3E: Continuing to scroll UP past "Share this article:" into mid-article
    const scrollUpPastShare = await evaluate(`(() => {
      // Scroll back up past share section into article body
      window.scrollTo(0, 1500);
      window.dispatchEvent(new Event('scroll'));
      const btn = document.getElementById('capsuleGoTop');
      return {
        scrollY: window.scrollY,
        isVisible: btn.classList.contains('is-visible')
      };
    })()`);
    console.log('Scrolling up past share section into article body:', scrollUpPastShare);
    if (scrollUpPastShare.isVisible) {
      throw new Error('Button MUST hide when continuing to scroll UP past Share this article into article prose (previous rule)!');
    }
    console.log('  ✅ Button cleanly HIDES when scrolling up past Share section (previous rule re-applied).');

    // Step 3F: Scrolling down again in article body (> 250px)
    const scrollDownInArticle = await evaluate(`(() => {
      window.scrollTo(0, 1800);
      window.dispatchEvent(new Event('scroll'));
      const btn = document.getElementById('capsuleGoTop');
      return {
        scrollY: window.scrollY,
        isVisible: btn.classList.contains('is-visible')
      };
    })()`);
    console.log('Scrolling down in article body:', scrollDownInArticle);
    if (!scrollDownInArticle.isVisible) {
      throw new Error('Button should re-appear when scrolling down in article!');
    }
    console.log('  ✅ Button RE-APPEARS when scrolling down again.');

    console.log('\n================================================================');
    console.log('   🎉 ALL DEEP VERIFICATION CHECKS PASSED WITH FLYING COLORS!  ');
    console.log('================================================================');
  } finally {
    ws.close();
    chrome.kill();
  }
}

runDeepVerification().catch(err => {
  console.error('\n❌ DEEP VERIFICATION FAILED:', err);
  process.exit(1);
});
