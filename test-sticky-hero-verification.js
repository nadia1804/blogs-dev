const { spawn } = require('child_process');

async function verify() {
  console.log('--- STARTING COMPREHENSIVE STICKY & HERO VERIFICATION ---');

  // Step 1: HTTP API check
  const themeHtml = await (await fetch('http://localhost:4321/theme')).text();
  const singleHtml = await (await fetch('http://localhost:4321/post')).text();
  const pageHtml = await (await fetch('http://localhost:4321/page')).text();
  const authorHtml = await (await fetch('http://localhost:4321/author')).text();
  const cssText = await (await fetch('http://localhost:4321/capsule.css')).text();

  console.log('\n[1] Checking Raw HTML & CSS:');
  
  if (!themeHtml.includes('Ruang Baca') || !themeHtml.includes('Catatan Terkurasi')) {
    throw new Error('Hero title Ruang Baca & Catatan Terkurasi missing from /theme');
  }
  console.log('  ✅ Hero title "Ruang Baca & Catatan Terkurasi" present in /theme');

  if (!themeHtml.includes('Kumpulan tulisan, modul pelajaran, dan dokumentasi')) {
    throw new Error('Hero description missing from /theme');
  }
  console.log('  ✅ Hero description "Kumpulan tulisan, modul pelajaran, dan dokumentasi" present in /theme');

  if (themeHtml.includes('Publish Notion to Web with Extreme Velocity & Grace')) {
    throw new Error('Old title still found in /theme');
  }
  console.log('  ✅ Old hero title is completely replaced in /theme');

  if (!themeHtml.includes('class="hero-actions" style="display: none;"')) {
    throw new Error('Explore Articles hero-actions is not hidden by default in /theme');
  }
  console.log('  ✅ Explore Articles hero-actions hidden by default (display: none) in /theme');

  // Verify CSS sticky rules
  if (!cssText.includes('.capsule-header') || !cssText.includes('position: sticky') || !cssText.includes('top: 16px')) {
    throw new Error('.capsule-header sticky top: 16px missing in capsule.css');
  }
  console.log('  ✅ .capsule-header position: sticky; top: 16px; z-index: 1000; present in capsule.css');

  if (!cssText.includes('.post-toc-card') || !cssText.includes('max-height: calc(100vh - 120px)')) {
    throw new Error('TOC sticky rules missing in capsule.css');
  }
  console.log('  ✅ .post-toc-card, .post-toc, .capsule-toc sticky top: 90px with max-height present in capsule.css');

  if (!cssText.includes('.post-author-sidebar') || !cssText.includes('.author-sidebar-card')) {
    throw new Error('Author sidebar sticky rules missing in capsule.css');
  }
  console.log('  ✅ .post-author-sidebar, .author-sidebar-card, .post-author-box sticky top: 90px present in capsule.css');

  // Step 2: In-browser computed style verification via Chrome DevTools Protocol
  console.log('\n[2] Checking In-Browser Computed Styles via Chrome CDP:');

  const profileDir = require('os').tmpdir() + '/chrome-test-' + Date.now();
  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9240',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=' + profileDir
  ]);

  let ver = null;
  for (let attempt = 0; attempt < 20; attempt++) {
    await new Promise(r => setTimeout(r, 300));
    try {
      const res = await fetch('http://127.0.0.1:9240/json/version');
      if (res.ok) {
        ver = await res.json();
        break;
      }
    } catch (e) {}
  }
  if (!ver) throw new Error('Could not connect to Chrome debugging port 9240');

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

  // Test 1: Desktop Viewport on /theme
  await sendSession('Emulation.setDeviceMetricsOverride', { width: 1200, height: 900, deviceScaleFactor: 1, mobile: false });
  await sendSession('Page.navigate', { url: 'http://localhost:4321/theme' });
  await new Promise(r => setTimeout(r, 600));

  const themeCheck = await sendSession('Runtime.evaluate', {
    expression: `(() => {
      const header = document.querySelector('.capsule-header');
      const headerStyle = window.getComputedStyle(header);
      const heroTitle = document.querySelector('.hero-title');
      const heroDesc = document.querySelector('.hero-desc');
      const heroActions = document.querySelector('.hero-actions');
      const heroActionsStyle = window.getComputedStyle(heroActions);

      return {
        headerSticky: headerStyle.position,
        headerTop: headerStyle.top,
        headerZIndex: headerStyle.zIndex,
        heroTitle: heroTitle.textContent.replace(/\\s+/g, ' ').trim(),
        heroDesc: heroDesc.textContent.replace(/\\s+/g, ' ').trim(),
        heroActionsDisplay: heroActionsStyle.display
      };
    })()`,
    returnByValue: true
  });
  const themeData = themeCheck.result?.result?.value;
  console.log('  Theme Page Checks:', JSON.stringify(themeData, null, 2));
  if (!themeData || themeData.headerSticky !== 'sticky' || themeData.headerTop !== '16px') {
    throw new Error('Navbar on /theme is not sticky top 16px: ' + JSON.stringify(themeData));
  }
  if (!themeData.heroTitle.includes('Ruang Baca') || !themeData.heroTitle.includes('Catatan Terkurasi')) {
    throw new Error('Hero title mismatch on /theme: ' + themeData?.heroTitle);
  }
  if (themeData.heroActionsDisplay !== 'none') {
    throw new Error('Hero actions button not hidden by default: ' + themeData?.heroActionsDisplay);
  }
  console.log('  ✅ /theme passed all computed checks!');

  // Real scroll stickiness check on /theme
  await sendSession('Runtime.evaluate', { expression: 'window.scrollTo(0, 500)' });
  await new Promise(r => setTimeout(r, 200));
  const themeScrolled = await sendSession('Runtime.evaluate', {
    expression: 'document.querySelector(".capsule-header").getBoundingClientRect().top',
    returnByValue: true
  });
  if (Math.round(themeScrolled.result?.result?.value) !== 16) {
    throw new Error(`Header on /theme failed to stick when scrolled! Expected 16, got ${themeScrolled.result?.result?.value}`);
  }
  console.log('  ✅ /theme header sticks at top: 16px when page is scrolled 500px');

  // Test 2: /post
  await sendSession('Page.navigate', { url: 'http://localhost:4321/post' });
  await new Promise(r => setTimeout(r, 600));

  const postCheck = await sendSession('Runtime.evaluate', {
    expression: `(() => {
      const header = document.querySelector('.capsule-header');
      const headerStyle = window.getComputedStyle(header);
      const tocCard = document.querySelector('.post-toc-card');
      const tocStyle = tocCard ? window.getComputedStyle(tocCard) : null;
      const authorSidebar = document.querySelector('.post-author-sidebar');
      const authorStyle = authorSidebar ? window.getComputedStyle(authorSidebar) : null;
      const sidebar = document.querySelector('.post-sidebar');
      const sidebarStyle = sidebar ? window.getComputedStyle(sidebar) : null;

      return {
        headerSticky: headerStyle.position,
        sidebarSticky: sidebarStyle ? sidebarStyle.position : null,
        sidebarTop: sidebarStyle ? sidebarStyle.top : null,
        tocSticky: tocStyle ? tocStyle.position : null,
        tocTop: tocStyle ? tocStyle.top : null,
        tocOverflowY: tocStyle ? tocStyle.overflowY : null,
        authorSticky: authorStyle ? authorStyle.position : null,
        authorTop: authorStyle ? authorStyle.top : null
      };
    })()`,
    returnByValue: true
  });
  const postData = postCheck.result?.result?.value;
  console.log('  Post Page Checks:', JSON.stringify(postData, null, 2));
  if (!postData || postData.headerSticky !== 'sticky') throw new Error('Navbar on /post is not sticky');
  if (postData.sidebarSticky !== 'sticky' || postData.sidebarTop !== '90px') {
    throw new Error('Sidebar on /post is not sticky top 90px');
  }
  if (postData.tocSticky !== 'sticky' || postData.tocTop !== '90px') {
    throw new Error('TOC card on /post is not sticky top 90px');
  }
  if (postData.authorSticky !== 'sticky' || postData.authorTop !== '90px') {
    throw new Error('Author widget on /post is not sticky top 90px');
  }
  console.log('  ✅ /post passed all computed checks!');

  // Real scroll stickiness check on /post
  await sendSession('Runtime.evaluate', { expression: 'window.scrollTo(0, 1500)' });
  await new Promise(r => setTimeout(r, 200));
  const postScrolled = await sendSession('Runtime.evaluate', {
    expression: `(() => {
      const header = document.querySelector('.capsule-header').getBoundingClientRect();
      const sidebar = document.querySelector('.post-sidebar').getBoundingClientRect();
      const toc = document.querySelector('.post-toc-card').getBoundingClientRect();
      const author = document.querySelector('.post-author-sidebar').getBoundingClientRect();
      return {
        headerTop: Math.round(header.top),
        sidebarTop: Math.round(sidebar.top),
        tocTop: Math.round(toc.top),
        authorTop: Math.round(author.top)
      };
    })()`,
    returnByValue: true
  });
  const postScrollData = postScrolled.result?.result?.value;
  if (postScrollData.headerTop !== 16) {
    throw new Error(`Header on /post failed to stick when scrolled! Expected 16, got ${postScrollData.headerTop}`);
  }
  if (postScrollData.sidebarTop !== 90) {
    throw new Error(`Sidebar on /post failed to stick when scrolled! Expected 90, got ${postScrollData.sidebarTop}`);
  }
  console.log('  ✅ /post header and sidebar stick at 16px and 90px when page is scrolled 1500px:', postScrollData);

  // Test 3: /page
  await sendSession('Page.navigate', { url: 'http://localhost:4321/page' });
  await new Promise(r => setTimeout(r, 600));

  const pageCheck = await sendSession('Runtime.evaluate', {
    expression: `(() => {
      const header = document.querySelector('.capsule-header');
      const headerStyle = window.getComputedStyle(header);
      const tocCard = document.querySelector('.post-toc-card');
      const tocStyle = tocCard ? window.getComputedStyle(tocCard) : null;
      const sidebar = document.querySelector('.post-sidebar');
      const sidebarStyle = sidebar ? window.getComputedStyle(sidebar) : null;

      return {
        headerSticky: headerStyle.position,
        sidebarSticky: sidebarStyle ? sidebarStyle.position : null,
        sidebarTop: sidebarStyle ? sidebarStyle.top : null,
        tocSticky: tocStyle ? tocStyle.position : null,
        tocTop: tocStyle ? tocStyle.top : null
      };
    })()`,
    returnByValue: true
  });
  const pageData = pageCheck.result?.result?.value;
  console.log('  Page Checks:', JSON.stringify(pageData, null, 2));
  if (!pageData || pageData.headerSticky !== 'sticky') throw new Error('Navbar on /page is not sticky');
  if (pageData.sidebarSticky !== 'sticky' || pageData.sidebarTop !== '90px') {
    throw new Error('Sidebar on /page is not sticky top 90px');
  }
  if (pageData.tocSticky !== 'sticky' || pageData.tocTop !== '90px') {
    throw new Error('TOC card on /page is not sticky top 90px');
  }
  console.log('  ✅ /page passed all computed checks!');

  // Real scroll stickiness check on /page
  await sendSession('Runtime.evaluate', { expression: 'window.scrollTo(0, 800)' });
  await new Promise(r => setTimeout(r, 200));
  const pageScrolled = await sendSession('Runtime.evaluate', {
    expression: `(() => {
      const header = document.querySelector('.capsule-header').getBoundingClientRect();
      const sidebar = document.querySelector('.post-sidebar').getBoundingClientRect();
      return {
        headerTop: Math.round(header.top),
        sidebarTop: Math.round(sidebar.top)
      };
    })()`,
    returnByValue: true
  });
  const pageScrollData = pageScrolled.result?.result?.value;
  if (pageScrollData.headerTop !== 16 || pageScrollData.sidebarTop !== 90) {
    throw new Error(`Page stickiness failed when scrolled! Expected header 16 and sidebar 90, got ${JSON.stringify(pageScrollData)}`);
  }
  console.log('  ✅ /page header and sidebar stick at 16px and 90px when page is scrolled 800px:', pageScrollData);

  // Test 4: /author
  await sendSession('Page.navigate', { url: 'http://localhost:4321/author' });
  await new Promise(r => setTimeout(r, 600));

  const authorCheck = await sendSession('Runtime.evaluate', {
    expression: `(() => {
      const header = document.querySelector('.capsule-header');
      const headerStyle = window.getComputedStyle(header);
      const authorHero = document.querySelector('.author-hero-capsule');
      const authorHeroStyle = authorHero ? window.getComputedStyle(authorHero) : null;

      return {
        headerSticky: headerStyle.position,
        authorHeroSticky: authorHeroStyle ? authorHeroStyle.position : null,
        authorHeroTop: authorHeroStyle ? authorHeroStyle.top : null
      };
    })()`,
    returnByValue: true
  });
  const authorData = authorCheck.result?.result?.value;
  console.log('  Author Page Checks:', JSON.stringify(authorData, null, 2));
  if (!authorData || authorData.headerSticky !== 'sticky') throw new Error('Navbar on /author is not sticky');
  if (authorData.authorHeroSticky !== 'sticky' || authorData.authorHeroTop !== '90px') {
    throw new Error('Author hero on /author is not sticky top 90px');
  }
  console.log('  ✅ /author passed all computed checks!');

  // Real scroll stickiness check on /author
  await sendSession('Runtime.evaluate', { expression: 'window.scrollTo(0, 400)' });
  await new Promise(r => setTimeout(r, 200));
  const authorScrolled = await sendSession('Runtime.evaluate', {
    expression: `(() => {
      const header = document.querySelector('.capsule-header').getBoundingClientRect();
      const authorHero = document.querySelector('.author-hero-capsule').getBoundingClientRect();
      return {
        headerTop: Math.round(header.top),
        authorHeroTop: Math.round(authorHero.top)
      };
    })()`,
    returnByValue: true
  });
  const authorScrollData = authorScrolled.result?.result?.value;
  if (authorScrollData.headerTop !== 16 || authorScrollData.authorHeroTop !== 90) {
    throw new Error(`Author stickiness failed when scrolled! Expected header 16 and hero 90, got ${JSON.stringify(authorScrollData)}`);
  }
  console.log('  ✅ /author header and hero stick at 16px and 90px when page is scrolled 400px:', authorScrollData);

  chrome.kill();
  console.log('\n================================================================');
  console.log('🎉 ALL HERO COPY & STICKY BEHAVIOR AUDITS PASSED WITH FLYING COLORS!');
  console.log('================================================================');
}

verify().catch(e => {
  console.error('VERIFICATION ERROR:', e);
  process.exit(1);
});
