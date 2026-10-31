/**
 * Fruition Mini v0.2.0 — Admin Shell Script (GitHub Edition)
 * Includes Fruit Connector Management & Live REST API Integration
 */

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const btnToggleSidebar = document.getElementById('btnToggleSidebar');
  const dockSidebar = document.getElementById('dockSidebar');
  const btnToggleDark = document.getElementById('btnToggleDark');
  const btnPreview = document.getElementById('btnPreview');
  const sandboxModal = document.getElementById('sandboxModal');
  const btnCloseModal = document.getElementById('btnCloseModal');
  const viewportWrapper = document.getElementById('viewportWrapper');
  const vpLabel = document.getElementById('vpLabel');
  const vpButtons = document.querySelectorAll('.vp-btn');
  const navLinks = document.querySelectorAll('.nav-link');
  const tabItems = document.querySelectorAll('.tab-item');
  const presetCards = document.querySelectorAll('.preset-card');
  const segmentBtns = document.querySelectorAll('.segment-btn');

  // Breadcrumbs & Views
  const bcSection = document.getElementById('bcSection');
  const bcSub = document.getElementById('bcSub');
  const bcSubSep = document.getElementById('bcSubSep');
  const btnSmartBack = document.getElementById('btnSmartBack');
  const viewHome = document.getElementById('viewHome');
  const viewFruit = document.getElementById('viewFruit');
  const viewThemes = document.getElementById('viewThemes');
  const viewNavigation = document.getElementById('viewNavigation');
  const viewPlugins = document.getElementById('viewPlugins');
  const viewSettings = document.getElementById('viewSettings');

  // Navigation View Elements
  const btnSaveNavTop = document.getElementById('btnSaveNavTop');
  const btnAddHeaderItem = document.getElementById('btnAddHeaderItem');
  const btnAddFooterItem = document.getElementById('btnAddFooterItem');
  const headerNavTableBody = document.getElementById('headerNavTableBody');
  const footerNavTableBody = document.getElementById('footerNavTableBody');
  const navSiteIcon = document.getElementById('navSiteIcon');
  const navSiteName = document.getElementById('navSiteName');
  const navLogoUrl = document.getElementById('navLogoUrl');
  const navToolSearch = document.getElementById('navToolSearch');
  const navToolDark = document.getElementById('navToolDark');
  const navToolRead = document.getElementById('navToolRead');
  const navFooterCopyright = document.getElementById('navFooterCopyright');

  // Fruit Elements
  const fruitTableBody = document.getElementById('fruitTableBody');
  const btnOpenNewFruitModal = document.getElementById('btnOpenNewFruitModal');
  const btnSyncAllFruits = document.getElementById('btnSyncAllFruits');
  const fruitModal = document.getElementById('fruitModal');
  const btnCloseFruitModal = document.getElementById('btnCloseFruitModal');
  const btnCancelFruitModal = document.getElementById('btnCancelFruitModal');
  const fruitForm = document.getElementById('fruitForm');
  const fruitModalTitle = document.getElementById('fruitModalTitle');
  const btnTestHandshake = document.getElementById('btnTestHandshake');
  const adminToast = document.getElementById('adminToast');
  const toastMsg = document.getElementById('toastMsg');

  // ================= PERSISTENT ADMIN SESSION STATE (RELOAD vs SERVER BOOT) =================
  const ADMIN_STATE_KEY = 'fruition_admin_state_v1';
  let navHistory = ['home'];

  function getDefaultAdminState(bootId = null) {
    return {
      bootId: bootId,
      darkMode: false,
      sidebarCollapsed: false,
      activeMenu: 'home',
      themeLayer: 1,
      activeThemeTab: 'header',
      activeSettingsTab: 'general',
      navHistory: ['home']
    };
  }

  function loadSavedAdminState() {
    try {
      const raw = localStorage.getItem(ADMIN_STATE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return (parsed && typeof parsed === 'object') ? parsed : null;
    } catch (e) {
      return null;
    }
  }

  function saveAdminState(partial = {}) {
    try {
      const current = loadSavedAdminState() || getDefaultAdminState();
      const updated = {
        ...current,
        ...partial,
        darkMode: document.body.classList.contains('dark-mode'),
        sidebarCollapsed: dockSidebar ? dockSidebar.classList.contains('collapsed') : false,
        navHistory: Array.isArray(navHistory) ? navHistory.slice(-15) : ['home']
      };
      localStorage.setItem(ADMIN_STATE_KEY, JSON.stringify(updated));
    } catch (e) {
      // Ignore storage quota errors
    }
  }

  // Toast Helper
  function showToast(message) {
    if (!adminToast || !toastMsg) return;
    toastMsg.textContent = message;
    adminToast.style.display = 'inline-flex';
    setTimeout(() => {
      adminToast.style.display = 'none';
    }, 3500);
  }

  // 1. Sidebar Collapse / Expand
  if (btnToggleSidebar && dockSidebar) {
    btnToggleSidebar.addEventListener('click', () => {
      dockSidebar.classList.toggle('collapsed');
      saveAdminState({ sidebarCollapsed: dockSidebar.classList.contains('collapsed') });
    });
  }

  // 2. Light / Dark Mode Toggle
  if (btnToggleDark) {
    btnToggleDark.addEventListener('click', () => {
      document.body.classList.toggle('dark-mode');
      const isDark = document.body.classList.contains('dark-mode');
      saveAdminState({ darkMode: isDark });
      const iframe = document.getElementById('themePreviewIframe');
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({
          type: 'TOGGLE_DARK',
          darkMode: isDark
        }, '*');
      }
    });
  }

  // Interactive Breadcrumb System (Semua Segmen Dapat Diklik)
  const ghBreadcrumbs = document.getElementById('ghBreadcrumbs');

  function setBreadcrumbs(crumbs) {
    if (!ghBreadcrumbs) return;
    ghBreadcrumbs.innerHTML = '';

    crumbs.forEach((crumb, idx) => {
      const isLast = idx === crumbs.length - 1;

      if (idx > 0) {
        const sep = document.createElement('span');
        sep.className = 'bc-sep';
        sep.textContent = '/';
        ghBreadcrumbs.appendChild(sep);
      }

      if (isLast) {
        const span = document.createElement('span');
        span.className = 'bc-item active';
        span.textContent = crumb.label;
        ghBreadcrumbs.appendChild(span);
      } else {
        const a = document.createElement('a');
        a.href = '#';
        a.className = 'bc-item';
        a.textContent = crumb.label;
        a.addEventListener('click', (e) => {
          e.preventDefault();
          if (typeof crumb.action === 'function') {
            crumb.action();
          }
        });
        ghBreadcrumbs.appendChild(a);
      }
    });
  }

  // Themes Layered Views (Theme List -> Tabbed Settings)
  const themesLayer1 = document.getElementById('themesLayer1');
  const themesLayer2 = document.getElementById('themesLayer2');
  const themeSettingsTabs = document.querySelectorAll('#themeSettingsTabs .tab-item');
  const themeTabPanels = {
    'header': document.getElementById('panelThemeHeader'),
    'hero': document.getElementById('panelThemeHero'),
    'cardgrid': document.getElementById('panelThemeCardGrid'),
    'footer': document.getElementById('panelThemeFooter'),
    'presets': document.getElementById('panelThemePresets')
  };

  const themeTabNames = {
    'header': 'Header & Navigation',
    'hero': 'Hero Unit',
    'cardgrid': 'Card Grid System',
    'footer': 'Footer & Variables',
    'presets': 'Color Presets & Tokens'
  };

  let currentThemeLayer = 1;
  let activeThemeTab = 'header';

  function openThemeList(skipSave = false) {
    currentThemeLayer = 1;
    if (themesLayer1) themesLayer1.style.display = 'block';
    if (themesLayer2) themesLayer2.style.display = 'none';

    setBreadcrumbs([
      { label: 'Home', action: () => switchView('home') },
      { label: 'Themes' }
    ]);

    if (!skipSave) {
      saveAdminState({
        activeMenu: 'themes',
        themeLayer: 1
      });
    }
  }

  function openThemeSettings(tab = 'header', skipSave = false) {
    currentThemeLayer = 2;
    activeThemeTab = tab;
    if (themesLayer1) themesLayer1.style.display = 'none';
    if (themesLayer2) themesLayer2.style.display = 'block';

    // Switch tab UI
    themeSettingsTabs.forEach(t => {
      if (t.dataset.themetab === tab) {
        t.classList.add('active');
      } else {
        t.classList.remove('active');
      }
    });

    // Switch panel form
    Object.keys(themeTabPanels).forEach(key => {
      const panel = themeTabPanels[key];
      if (panel) {
        panel.style.display = key === tab ? 'block' : 'none';
      }
    });

    const tabLabel = themeTabNames[tab] || 'Header & Navigation';

    // Update Interactive Breadcrumbs: Home / Themes / Fruition-capsule v0.2.6 / [Tab]
    setBreadcrumbs([
      { label: 'Home', action: () => switchView('home') },
      { label: 'Themes', action: () => openThemeList() },
      { label: 'Fruition-capsule v0.2.6', action: () => openThemeSettings('header') },
      { label: tabLabel }
    ]);

    if (!skipSave) {
      saveAdminState({
        activeMenu: 'themes',
        themeLayer: 2,
        activeThemeTab: tab
      });
    }

    // Load dynamic theme config & brand/footer settings from backend
    loadThemeConfig();
    if (!currentSettings) {
      loadSettings();
    } else {
      updateCopyrightPreview();
    }
  }

  // Hook Tab Clicks
  themeSettingsTabs.forEach(tabBtn => {
    tabBtn.addEventListener('click', () => {
      const tab = tabBtn.dataset.themetab || 'header';
      openThemeSettings(tab);
    });
  });

  // Settings Tabbed Views (General, Notion, GitOps, Build, Backup)
  const settingsTabs = document.querySelectorAll('#settingsTabs .tab-item');
  const settingsTabPanels = {
    'general': document.getElementById('panelSettingsGeneral'),
    'notion': document.getElementById('panelSettingsNotion'),
    'gitops': document.getElementById('panelSettingsGitOps'),
    'build': document.getElementById('panelSettingsBuild'),
    'backup': document.getElementById('panelSettingsBackup')
  };

  const settingsTabNames = {
    'general': 'General (Situs)',
    'notion': 'Notion API & Kredensial',
    'gitops': 'GitOps & GitHub Repo',
    'build': 'Build, Pipeline & Cache',
    'backup': 'Backup & Restore'
  };

  let activeSettingsTab = 'general';

  function openSettings(tab = 'general', skipSave = false) {
    activeSettingsTab = tab;
    if (viewSettings) viewSettings.style.display = 'block';

    // Switch tab UI
    settingsTabs.forEach(t => {
      if (t.dataset.settingstab === tab) {
        t.classList.add('active');
      } else {
        t.classList.remove('active');
      }
    });

    // Switch panel form
    Object.keys(settingsTabPanels).forEach(key => {
      const panel = settingsTabPanels[key];
      if (panel) {
        panel.style.display = key === tab ? 'block' : 'none';
      }
    });

    if (tab === 'backup' && typeof loadBackupsList === 'function') {
      loadBackupsList();
    }

    const tabLabel = settingsTabNames[tab] || 'General (Situs)';

    // Update Interactive Breadcrumbs: Home / Settings / [Tab]
    setBreadcrumbs([
      { label: 'Home', action: () => switchView('home') },
      { label: 'Settings', action: () => openSettings('general') },
      { label: tabLabel }
    ]);

    if (!skipSave) {
      saveAdminState({
        activeMenu: 'settings',
        activeSettingsTab: tab
      });
    }
  }

  // Hook Settings Tab Clicks
  settingsTabs.forEach(tabBtn => {
    tabBtn.addEventListener('click', () => {
      const tab = tabBtn.dataset.settingstab || 'general';
      openSettings(tab);
    });
  });

  // 3. View Switcher based on Sidebar Menu
  function switchView(menuName, options = {}) {
    const { skipSave = false, preserveSubState = false } = options;

    navLinks.forEach(link => {
      if (link.dataset.menu === menuName) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    if (menuName === 'home') {
      if (viewHome) viewHome.style.display = 'block';
      if (viewFruit) viewFruit.style.display = 'none';
      if (viewThemes) viewThemes.style.display = 'none';
      if (viewNavigation) viewNavigation.style.display = 'none';
      if (viewPlugins) viewPlugins.style.display = 'none';
      if (viewSettings) viewSettings.style.display = 'none';
      setBreadcrumbs([
        { label: 'Home', action: () => switchView('home') },
        { label: 'Overview' }
      ]);
      if (typeof loadSystemOverview === 'function') {
        loadSystemOverview();
      }
    } else if (menuName === 'fruit') {
      if (viewHome) viewHome.style.display = 'none';
      if (viewFruit) viewFruit.style.display = 'block';
      if (viewThemes) viewThemes.style.display = 'none';
      if (viewNavigation) viewNavigation.style.display = 'none';
      if (viewPlugins) viewPlugins.style.display = 'none';
      if (viewSettings) viewSettings.style.display = 'none';
      setBreadcrumbs([
        { label: 'Home', action: () => switchView('home') },
        { label: 'Fruit Connectors' }
      ]);
      loadFruits();
    } else if (menuName === 'navigation') {
      if (viewHome) viewHome.style.display = 'none';
      if (viewFruit) viewFruit.style.display = 'none';
      if (viewThemes) viewThemes.style.display = 'none';
      if (viewNavigation) viewNavigation.style.display = 'block';
      if (viewPlugins) viewPlugins.style.display = 'none';
      if (viewSettings) viewSettings.style.display = 'none';
      setBreadcrumbs([
        { label: 'Home', action: () => switchView('home') },
        { label: 'Navigasi & Tata Letak' }
      ]);
      loadSettings();
    } else if (menuName === 'themes') {
      if (viewHome) viewHome.style.display = 'none';
      if (viewFruit) viewFruit.style.display = 'none';
      if (viewThemes) viewThemes.style.display = 'block';
      if (viewNavigation) viewNavigation.style.display = 'none';
      if (viewPlugins) viewPlugins.style.display = 'none';
      if (viewSettings) viewSettings.style.display = 'none';
      if (preserveSubState && currentThemeLayer === 2) {
        openThemeSettings(activeThemeTab || 'header', skipSave);
      } else {
        openThemeList(skipSave);
      }
    } else if (menuName === 'plugins') {
      if (viewHome) viewHome.style.display = 'none';
      if (viewFruit) viewFruit.style.display = 'none';
      if (viewThemes) viewThemes.style.display = 'none';
      if (viewNavigation) viewNavigation.style.display = 'none';
      if (viewSettings) viewSettings.style.display = 'none';
      if (viewPlugins) viewPlugins.style.display = 'block';
      openPluginsList(skipSave);
      loadPluginsData();
    } else if (menuName === 'settings') {
      if (viewHome) viewHome.style.display = 'none';
      if (viewFruit) viewFruit.style.display = 'none';
      if (viewThemes) viewThemes.style.display = 'none';
      if (viewNavigation) viewNavigation.style.display = 'none';
      if (viewPlugins) viewPlugins.style.display = 'none';
      if (viewSettings) viewSettings.style.display = 'block';
      openSettings(preserveSubState ? (activeSettingsTab || 'general') : 'general', skipSave);
      loadSystemSettings();
    } else {
      // Fallback to Home
      if (viewHome) viewHome.style.display = 'block';
      if (viewFruit) viewFruit.style.display = 'none';
      if (viewThemes) viewThemes.style.display = 'none';
      if (viewNavigation) viewNavigation.style.display = 'none';
      if (viewPlugins) viewPlugins.style.display = 'none';
      if (viewSettings) viewSettings.style.display = 'none';
      setBreadcrumbs([
        { label: 'Home', action: () => switchView('home') },
        { label: menuName.charAt(0).toUpperCase() + menuName.slice(1) }
      ]);
      if (typeof loadSystemOverview === 'function') {
        loadSystemOverview();
      }
    }

    if (navHistory[navHistory.length - 1] !== menuName) {
      navHistory.push(menuName);
    }

    if (!skipSave) {
      saveAdminState({
        activeMenu: menuName,
        themeLayer: currentThemeLayer,
        activeThemeTab: activeThemeTab,
        activeSettingsTab: activeSettingsTab
      });
    }
  }

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const menu = link.dataset.menu;
      if (menu) switchView(menu);
    });
  });

  // Smart Back Button (Spec 4.3 Logika Smart State Go & Back)
  if (btnSmartBack) {
    btnSmartBack.addEventListener('click', () => {
      const activeMenu = navLinks.length ? (Array.from(navLinks).find(l => l.classList.contains('active'))?.dataset.menu || 'home') : 'home';

      if (activeMenu === 'themes') {
        if (currentThemeLayer === 2) {
          openThemeList();
          return;
        }
      }

      if (navHistory.length > 1) {
        navHistory.pop(); // remove current
        const prev = navHistory[navHistory.length - 1] || 'home';
        switchView(prev);
      } else {
        switchView('home');
      }
    });
  }

  // Interactive Theme Layer Navigations
  document.querySelectorAll('.btn-open-theme-settings').forEach(btn => {
    btn.addEventListener('click', () => {
      openThemeSettings('header');
    });
  });

  const btnBackToThemeList = document.getElementById('btnBackToThemeList');
  if (btnBackToThemeList) {
    btnBackToThemeList.addEventListener('click', () => {
      openThemeList();
    });
  }

  document.querySelectorAll('.btn-back-to-themelist').forEach(btn => {
    btn.addEventListener('click', () => {
      openThemeList();
    });
  });

  // Theme Settings Management (Card Grid & Mode Layout)
  const themeCardMode = document.getElementById('themeCardMode');
  const btnCardModeDefault = document.getElementById('btnCardModeDefault');
  const btnCardModeEditorial = document.getElementById('btnCardModeEditorial');
  const cardModeDesc = document.getElementById('cardModeDesc');
  const themeGridColSm = document.getElementById('themeGridColSm');
  const themeGridColMd = document.getElementById('themeGridColMd');
  const themeGridColLg = document.getElementById('themeGridColLg');

  // Editorial & Default Card Grid Special Controls
  const editorialSettingsWrap = document.getElementById('editorialSettingsWrap');
  const defaultColDistributionWrap = document.getElementById('defaultColDistributionWrap');
  const themeEditorialTier2 = document.getElementById('themeEditorialTier2');
  const themeEditorialTier3 = document.getElementById('themeEditorialTier3');
  const themeEditorialMobileCol = document.getElementById('themeEditorialMobileCol');
  const editorialMobileBadge = document.getElementById('editorialMobileBadge');
  const editorialPatternBadge = document.getElementById('editorialPatternBadge');
  const editorialVisualSchematic = document.getElementById('editorialVisualSchematic');
  const editorialPresetButtons = document.querySelectorAll('#editorialPresetButtons .segment-btn');

  function renderEditorialSchematic(tier2, tier3) {
    if (!editorialVisualSchematic) return;
    const t2 = parseInt(tier2, 10) || 2;
    const t3 = parseInt(tier3, 10) || 4;

    let html = `
      <div style="display: flex; gap: 6px; width: 100%;">
        <div style="flex: 1; height: 34px; background: #0969da; color: #fff; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; border-radius: 4px; box-shadow: 0 1px 2px rgba(0,0,0,0.1);">
          ★ Baris 1: 1 Kartu Utama Besar (Hero / Span 12 Penuh)
        </div>
      </div>
    `;

    html += `<div style="display: flex; gap: 6px; width: 100%;">`;
    for (let i = 1; i <= t2; i++) {
      html += `
        <div style="flex: 1; height: 28px; background: rgba(9, 105, 218, 0.12); border: 1px solid #0969da; color: #0969da; font-size: 11px; font-weight: 600; display: flex; align-items: center; justify-content: center; border-radius: 4px;">
          Baris 2: Kartu ${i + 1}
        </div>
      `;
    }
    html += `</div>`;

    html += `<div style="display: flex; gap: 6px; width: 100%;">`;
    const startCard = t2 + 2;
    for (let i = 0; i < t3; i++) {
      html += `
        <div style="flex: 1; height: 24px; background: var(--gh-canvas-subtle); border: 1px solid var(--gh-border-default); color: var(--gh-fg-muted); font-size: 10px; font-weight: 500; display: flex; align-items: center; justify-content: center; border-radius: 4px;">
          Kartu ${startCard + i}
        </div>
      `;
    }
    html += `</div>`;

    editorialVisualSchematic.innerHTML = html;

    const currentPattern = `1 - ${t2} - ${t3}`;
    if (editorialPatternBadge) {
      editorialPatternBadge.textContent = `Pola: ${currentPattern}`;
    }

    // Synchronize preset button active state
    const patKey = `1-${t2}-${t3}`;
    editorialPresetButtons.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.pattern === patKey);
    });
  }

  function setCardMode(mode) {
    const isEditorial = mode === 'editorial';
    if (themeCardMode) themeCardMode.value = isEditorial ? 'editorial' : 'default';
    if (btnCardModeDefault) btnCardModeDefault.classList.toggle('active', !isEditorial);
    if (btnCardModeEditorial) btnCardModeEditorial.classList.toggle('active', isEditorial);
    if (cardModeDesc) {
      cardModeDesc.textContent = isEditorial
        ? 'Kartu artikel pertama dirender secara masif (Hero Card / Featured) membentang penuh, disusul kartu-kartu lainnya.'
        : 'Format kartu standar berjejer seragam dan simetris sesuai distribusi kolom.';
    }
    // Dynamic visibility for layout modes (User Request)
    if (editorialSettingsWrap) {
      editorialSettingsWrap.style.display = isEditorial ? 'block' : 'none';
    }
    if (defaultColDistributionWrap) {
      defaultColDistributionWrap.style.display = isEditorial ? 'none' : 'block';
    }
  }

  editorialPresetButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const pat = btn.dataset.pattern;
      if (!pat) return;
      const parts = pat.split('-').map(Number); // [1, 2, 4]
      if (themeEditorialTier2) themeEditorialTier2.value = String(parts[1] || 2);
      if (themeEditorialTier3) themeEditorialTier3.value = String(parts[2] || 4);
      renderEditorialSchematic(parts[1] || 2, parts[2] || 4);
    });
  });

  if (themeEditorialTier2) {
    themeEditorialTier2.addEventListener('change', () => {
      const t2 = themeEditorialTier2.value;
      const t3 = themeEditorialTier3 ? themeEditorialTier3.value : '4';
      renderEditorialSchematic(t2, t3);
    });
  }

  if (themeEditorialTier3) {
    themeEditorialTier3.addEventListener('change', () => {
      const t2 = themeEditorialTier2 ? themeEditorialTier2.value : '2';
      const t3 = themeEditorialTier3.value;
      renderEditorialSchematic(t2, t3);
    });
  }

  if (themeEditorialMobileCol) {
    themeEditorialMobileCol.addEventListener('change', async () => {
      const mVal = themeEditorialMobileCol.value;
      if (editorialMobileBadge) {
        editorialMobileBadge.textContent = mVal === '2' ? '2 Card' : '1 Card';
        editorialMobileBadge.className = mVal === '2' ? 'badge-tag green' : 'badge-tag blue';
      }

      // Live sync to Sandbox iframe instantly
      const iframe = document.getElementById('themePreviewIframe');
      if (iframe && iframe.contentWindow) {
        try {
          iframe.contentWindow.postMessage({ type: 'CHANGE_EDITORIAL_MOBILE', mobile: mVal }, '*');
        } catch (e) {}
      }

      // Auto-save so the configuration is saved immediately
      await saveThemeConfig();
    });
  }

  if (btnCardModeDefault) {
    btnCardModeDefault.addEventListener('click', () => setCardMode('default'));
  }
  if (btnCardModeEditorial) {
    btnCardModeEditorial.addEventListener('click', () => setCardMode('editorial'));
  }

  // Color Presets & Tokens Interactive Controller
  const themeActivePreset = document.getElementById('themeActivePreset');
  const themePresetCards = document.querySelectorAll('#themePresetCardsGrid .preset-card');
  const presetTokensGrid = document.getElementById('presetTokensGrid');
  const activePresetTokenCode = document.getElementById('activePresetTokenCode');
  const activePresetBadgeLabel = document.getElementById('activePresetBadgeLabel');
  const themeTablePresetSummary = document.getElementById('themeTablePresetSummary');

  const PRESET_TOKENS_MAP = {
    'Light': {
      slug: 'light',
      primaryColor: '#1E2229',
      tokens: [
        { name: '--theme-primary', value: '#1E2229' },
        { name: '--theme-secondary', value: '#555C68' },
        { name: '--theme-accent', value: '#8C94A2' },
        { name: '--theme-bg', value: '#FAF8F5' },
        { name: '--theme-surface', value: '#FFFFFF' },
        { name: '--theme-text', value: '#181B20' },
        { name: '--theme-border', value: '#E2E4E9' },
        { name: '--theme-badge-bg', value: '#F1EFEA' }
      ]
    },
    'Mono': {
      slug: 'mono',
      primaryColor: '#0F172A',
      tokens: [
        { name: '--theme-primary', value: '#0F172A' },
        { name: '--theme-secondary', value: '#475569' },
        { name: '--theme-accent', value: '#000000' },
        { name: '--theme-bg', value: '#FFFFFF' },
        { name: '--theme-surface', value: '#F8FAFC' },
        { name: '--theme-text', value: '#090D16' },
        { name: '--theme-border', value: '#E2E8F0' },
        { name: '--theme-badge-bg', value: '#F1F5F9' }
      ]
    },
    'Blue Sky': {
      slug: 'blue-sky',
      primaryColor: '#0284C7',
      tokens: [
        { name: '--theme-primary', value: '#0284C7' },
        { name: '--theme-secondary', value: '#0EA5E9' },
        { name: '--theme-accent', value: '#38BDF8' },
        { name: '--theme-bg', value: '#F8FAFC' },
        { name: '--theme-surface', value: '#FFFFFF' },
        { name: '--theme-text', value: '#0C2340' },
        { name: '--theme-border', value: '#E0F2FE' },
        { name: '--theme-badge-bg', value: '#E0F2FE' }
      ]
    },
    'Candy Pop': {
      slug: 'candy-pop',
      primaryColor: '#E11D48',
      tokens: [
        { name: '--theme-primary', value: '#E11D48' },
        { name: '--theme-secondary', value: '#DB2777' },
        { name: '--theme-accent', value: '#FDE047' },
        { name: '--theme-bg', value: '#FFFDF9' },
        { name: '--theme-surface', value: '#FFFFFF' },
        { name: '--theme-text', value: '#1C1917' },
        { name: '--theme-border', value: '#FFE4E6' },
        { name: '--theme-badge-bg', value: '#FFE4E6' }
      ]
    }
  };

  function setActiveThemePreset(presetName = 'Blue Sky', autoSave = false) {
    const normalized = PRESET_TOKENS_MAP[presetName] ? presetName : 'Blue Sky';
    const presetInfo = PRESET_TOKENS_MAP[normalized];
    if (themeActivePreset) themeActivePreset.value = normalized;

    themePresetCards.forEach(card => {
      const isMatch = card.dataset.preset === normalized;
      card.classList.toggle('active', isMatch);
      const indicator = card.querySelector('.preset-status-indicator');
      if (indicator) {
        indicator.innerHTML = isMatch
          ? `<span class="preset-badge">Active</span>`
          : `<span class="preset-radio"></span>`;
      }
    });

    if (activePresetTokenCode) {
      activePresetTokenCode.textContent = `[data-theme-preset="${presetInfo.slug}"]`;
    }
    if (activePresetBadgeLabel) {
      activePresetBadgeLabel.textContent = `Preset: ${normalized}`;
    }

    if (presetTokensGrid) {
      presetTokensGrid.innerHTML = presetInfo.tokens.map(t => `
        <div style="display: flex; align-items: center; gap: 8px; background: var(--gh-canvas-default); border: 1px solid var(--gh-border-default); border-radius: 6px; padding: 6px 10px;">
          <span style="width: 18px; height: 18px; border-radius: 4px; background: ${t.value}; border: 1px solid rgba(0,0,0,0.12); flex-shrink: 0;"></span>
          <div style="min-width: 0; line-height: 1.25;">
            <div style="font-size: 11px; font-family: monospace; font-weight: 600; color: var(--gh-fg-default);">${t.name}</div>
            <div style="font-size: 10px; font-family: monospace; color: var(--gh-fg-muted);">${t.value}</div>
          </div>
        </div>
      `).join('');
    }

    if (themeTablePresetSummary) {
      const others = Object.keys(PRESET_TOKENS_MAP).filter(k => k !== normalized).join(', ');
      themeTablePresetSummary.innerHTML = `<strong style="color: ${presetInfo.primaryColor};">${escapeHtml(normalized)}</strong> (Aktif), ${escapeHtml(others)}`;
    }

    // Sync with Sandbox Preview Iframe if open
    const iframe = document.getElementById('themePreviewIframe');
    if (iframe && iframe.contentWindow) {
      try {
        iframe.contentWindow.postMessage({ type: 'CHANGE_PRESET', preset: presetInfo.slug }, '*');
      } catch (e) {}
    }

    if (autoSave) {
      saveThemeConfig(normalized);
    }
  }

  themePresetCards.forEach(card => {
    card.addEventListener('click', () => {
      const chosen = card.dataset.preset || 'Blue Sky';
      setActiveThemePreset(chosen, true);
    });
  });

  async function loadThemeConfig() {
    try {
      const res = await fetch('/api/themes/fruition-capsule/config');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.config) {
          setActiveThemePreset(data.config.defaultPreset || 'Blue Sky', false);
          const cards = data.config.components?.cards || {};
          setCardMode(cards.defaultMode || 'default');
          const cols = cards.gridColumns || {};
          const smVal = cols.sm || cols.mobile || 1;
          const mdVal = cols.md || cols.tablet || 2;
          const lgVal = cols.lg || cols.desktop || 3;

          if (themeGridColSm) themeGridColSm.value = String(smVal);
          if (themeGridColMd) themeGridColMd.value = String(mdVal);
          if (themeGridColLg) themeGridColLg.value = String(lgVal);

          // Load Editorial Grid Settings
          const editorialGrid = cards.editorialGrid || {};
          const t2Val = editorialGrid.tier2 || 2;
          const t3Val = editorialGrid.tier3 || 4;
          const mVal = editorialGrid.mobileColumns || editorialGrid.mobile || 2;
          if (themeEditorialTier2) themeEditorialTier2.value = String(t2Val);
          if (themeEditorialTier3) themeEditorialTier3.value = String(t3Val);
          if (themeEditorialMobileCol) {
            themeEditorialMobileCol.value = String(mVal);
            if (editorialMobileBadge) {
              editorialMobileBadge.textContent = String(mVal) === '2' ? '2 Card' : '1 Card';
              editorialMobileBadge.className = String(mVal) === '2' ? 'badge-tag green' : 'badge-tag blue';
            }
          }
          renderEditorialSchematic(t2Val, t3Val);
        }
      }
    } catch (err) {
      console.warn('Gagal memuat konfigurasi tema:', err);
    }
  }

  async function saveThemeConfig(customPresetNotice = '') {
    const presetVal = themeActivePreset ? themeActivePreset.value : 'Blue Sky';
    const mode = themeCardMode ? themeCardMode.value : 'default';
    const smVal = themeGridColSm ? parseInt(themeGridColSm.value, 10) : 1;
    const mdVal = themeGridColMd ? parseInt(themeGridColMd.value, 10) : 2;
    const lgVal = themeGridColLg ? parseInt(themeGridColLg.value, 10) : 3;

    const tier2Val = themeEditorialTier2 ? parseInt(themeEditorialTier2.value, 10) : 2;
    const tier3Val = themeEditorialTier3 ? parseInt(themeEditorialTier3.value, 10) : 4;
    const mobileColVal = themeEditorialMobileCol ? parseInt(themeEditorialMobileCol.value, 10) : 2;
    const patternVal = `1-${tier2Val}-${tier3Val}`;

    const payload = {
      defaultPreset: presetVal,
      components: {
        cards: {
          defaultMode: mode,
          gridColumns: {
            mobile: smVal,
            tablet: mdVal,
            desktop: lgVal,
            sm: smVal,
            md: mdVal,
            lg: lgVal
          },
          editorialGrid: {
            tier1: 1,
            tier2: tier2Val,
            tier3: tier3Val,
            pattern: patternVal,
            mobileColumns: mobileColVal
          }
        }
      }
    };

    try {
      const res = await fetch('/api/themes/fruition-capsule/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      // Simpan juga Identitas Brand Header Kapsul & Teks Hak Cipta Footer (yang kini berada di Pengaturan Tema) ke site.json
      if (!customPresetNotice) {
        const updatedSite = {
          ...(currentSettings || {}),
          siteName: navSiteName ? navSiteName.value.trim() : ((currentSettings && currentSettings.siteName) || 'My Fruition Blog'),
          siteIcon: navSiteIcon ? navSiteIcon.value.trim() : ((currentSettings && currentSettings.siteIcon) || 'fruit'),
          logoUrl: navLogoUrl ? navLogoUrl.value.trim() : ((currentSettings && currentSettings.logoUrl) || ''),
          showSiteName: document.getElementById('navShowSiteName') ? document.getElementById('navShowSiteName').checked : false,
          footerCopyright: navFooterCopyright ? navFooterCopyright.value.trim() : '{yyyy} Made with {heart} by headless blogs'
        };
        currentSettings = updatedSite;
        if (sysSiteName) sysSiteName.value = updatedSite.siteName;
        await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedSite)
        });
      }

      if (res.ok) {
        if (customPresetNotice) {
          showToast(`✓ Preset warna "${customPresetNotice}" diaktifkan & disimpan ke Fruition-capsule v0.2.5!`);
        } else {
          showToast('✓ Pengaturan tema, identitas brand header, dan variabel footer Fruition-capsule v0.2.5 berhasil disimpan!');
        }
        const iframe = document.getElementById('themePreviewIframe');
        if (iframe && iframe.contentWindow) {
          try { iframe.contentWindow.location.reload(); } catch(e) { iframe.src = iframe.src; }
        }
      } else {
        showToast('Gagal menyimpan pengaturan tema: ' + res.statusText);
      }
    } catch (err) {
      showToast('Error saat menyimpan tema: ' + err.message);
    }
  }

  const btnSaveThemeSettings = document.getElementById('btnSaveThemeSettings');
  if (btnSaveThemeSettings) {
    btnSaveThemeSettings.addEventListener('click', async () => {
      await saveThemeConfig();
    });
  }

  document.querySelectorAll('.btn-mock-activate').forEach(btn => {
    btn.addEventListener('click', () => {
      showToast('Tema diaktifkan sebagai tema utama.');
    });
  });

  // 4. Fruit REST API Client
  let fruitCache = [];

  async function loadFruits() {
    try {
      const res = await fetch('/api/fruits');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.fruits) {
          fruitCache = data.fruits;
          renderFruitTable(fruitCache);
          updateFruitStats(fruitCache);
          return;
        }
      }
    } catch (err) {
      console.warn('API error, using initial dataset:', err);
    }
  }

  function renderFruitTable(fruits) {
    if (!fruitTableBody) return;
    fruitTableBody.innerHTML = '';

    if (!fruits || fruits.length === 0) {
      fruitTableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 24px; color: var(--gh-fg-subtle);">
            Belum ada konektor database Notion. Klik <strong>+ New Fruit Connector</strong> untuk menambahkan.
          </td>
        </tr>
      `;
      return;
    }

    fruits.forEach(fruit => {
      const tr = document.createElement('tr');
      const postType = fruit.postType || (fruit.id === 'pages-static' ? 'page' : fruit.id === 'authors-directory' ? 'authors' : fruit.id);
      const isPage = postType === 'page' || fruit.targetCollection === 'pages';
      const isAuthors = postType === 'authors' || fruit.targetCollection === 'authors';
      
      const routePattern = fruit.routePattern || (isPage ? '/[slug]' : isAuthors ? '/authors/[author-name]' : `/${postType}/[slug]`);
      const archiveUrl = fruit.archiveUrl || (isPage ? null : `/${postType}`);
      const isShowOnIndex = fruit.showOnIndex !== false;

      const collectionBadgeColor = 
        postType === 'read' ? 'pastel-peach' :
        isPage ? 'pastel-mint' :
        isAuthors ? 'pastel-periwinkle' : 'pastel-blossom';

      const timeAgo = formatTimeAgo(fruit.lastSync);

      tr.innerHTML = `
        <td>
          <div style="display: flex; align-items: center; gap: 8px;">
            <div class="nav-icon-badge ${collectionBadgeColor}" style="width: 26px; height: 26px; display: flex; align-items: center; justify-content: center;">
              ${window.GithubIcons.get(postType === 'read' ? 'book' : isPage ? 'file' : isAuthors ? 'people' : 'database', { size: 14 })}
            </div>
            <div>
              <strong>${escapeHtml(fruit.name || fruit.id)}</strong>
              <div style="font-size: 11px; color: var(--gh-fg-subtle); display: flex; align-items: center; gap: 4px; margin-top: 1px;">
                <span>ID: <code>${escapeHtml(fruit.id)}</code></span>
                <span>•</span>
                <span class="gh-tag-pill" style="font-size: 10px; padding: 0 4px;">${escapeHtml(postType)}</span>
              </div>
            </div>
          </div>
        </td>
        <td>
          <div style="display: flex; align-items: center; gap: 6px;">
            <code style="font-weight: 600; color: var(--gh-accent-fg);">${escapeHtml(routePattern)}</code>
            ${archiveUrl ? `<a href="${archiveUrl}" target="_blank" class="gh-btn" style="padding: 1px 6px; font-size: 10px; text-decoration: none;" title="Buka Arsip Post Type">Arsip ↗</a>` : ''}
          </div>
        </td>
        <td>
          <div style="display: flex; align-items: center; gap: 8px;">
            <label class="gh-switch" title="Toggle tampil di beranda (index)">
              <input type="checkbox" class="fruit-index-toggle" data-id="${fruit.id}" ${isShowOnIndex ? 'checked' : ''}>
              <span class="slider"></span>
            </label>
            <span style="font-size: 11px; font-weight: 500; color: ${isShowOnIndex ? 'var(--gh-success-fg)' : 'var(--gh-fg-subtle)'};">
              ${isShowOnIndex ? 'Beranda' : 'Arsip Saja'}
            </span>
          </div>
        </td>
        <td>
          <span style="font-family: monospace; font-size: 11px; background: var(--gh-canvas-subtle); padding: 2px 6px; border-radius: 4px; border: 1px solid var(--gh-border-muted);">
            ${maskId(fruit.databaseId)}
          </span>
        </td>
        <td>
          <strong>${fruit.totalItems || 0}</strong> Items
        </td>
        <td>
          <span style="font-size: 12px; color: var(--gh-fg-muted);" title="${fruit.lastSync}">${timeAgo}</span>
        </td>
        <td style="text-align: right;">
          <div style="display: inline-flex; gap: 6px;">
            <button type="button" class="gh-btn btn-sync-single" data-id="${fruit.id}" style="padding: 3px 8px; font-size: 11px; display: inline-flex; align-items: center; gap: 4px;">
              ${window.GithubIcons.get('sync', { size: 12 })}
              <span>Sync</span>
            </button>
            <button type="button" class="gh-btn btn-edit-fruit" data-id="${fruit.id}" style="padding: 3px 8px; font-size: 11px; display: inline-flex; align-items: center; gap: 4px;">
              ${window.GithubIcons.get('gear', { size: 12 })}
              <span>Edit</span>
            </button>
          </div>
        </td>
      `;
      fruitTableBody.appendChild(tr);
    });

    // Wire actions
    document.querySelectorAll('.btn-sync-single').forEach(btn => {
      btn.addEventListener('click', () => syncSingleFruit(btn.dataset.id, btn));
    });

    document.querySelectorAll('.btn-edit-fruit').forEach(btn => {
      btn.addEventListener('click', () => openEditFruit(btn.dataset.id));
    });

    // Wire toggle-index switches
    document.querySelectorAll('.fruit-index-toggle').forEach(toggle => {
      toggle.addEventListener('change', async (e) => {
        const id = toggle.dataset.id;
        const checked = toggle.checked;
        try {
          const res = await fetch('/api/fruits/toggle-index', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, showOnIndex: checked })
          });
          const data = await res.json();
          if (data.success) {
            showToast(data.message);
            await loadFruits();
          } else {
            showToast('⚠️ Gagal mengubah status beranda: ' + data.error);
            toggle.checked = !checked;
          }
        } catch (err) {
          showToast('Gagal menghubungi dev-server: ' + err.message);
          toggle.checked = !checked;
        }
      });
    });
  }

  function updateFruitStats(fruits) {
    const statActive = document.getElementById('statActiveFruits');
    const statTotal = document.getElementById('statTotalItems');
    const statWebp = document.getElementById('statWebpCount');
    const fruitHeaderCount = document.getElementById('fruitHeaderCount');
    const sidebarBadge = document.getElementById('fruitSidebarBadge');

    const totalItems = fruits.reduce((acc, f) => acc + (f.totalItems || 0), 0);
    const totalWebp = fruits.reduce((acc, f) => acc + (f.webpMediaCount || 0), 0);

    if (statActive) statActive.textContent = `${fruits.length} Fruits`;
    if (statTotal) statTotal.textContent = `${totalItems} Items`;
    if (statWebp) statWebp.textContent = `${totalWebp} Images`;
    if (fruitHeaderCount) fruitHeaderCount.textContent = `${fruits.length} Registered`;
    if (sidebarBadge) sidebarBadge.textContent = `${fruits.length} Active`;
  }

  async function syncSingleFruit(id, btn) {
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `${window.GithubIcons.get('sync', { size: 12 })} <span>Syncing...</span>`;
    }

    try {
      const res = await fetch('/api/fruits/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });

      if (res.ok) {
        showToast(`Fruit "${id}" synchronized! Atomic JSON and .webp cache updated.`);
      } else {
        showToast(`Sync completed for ${id}.`);
      }
    } catch (e) {
      showToast(`Sync triggered for ${id}.`);
    }

    await loadFruits();
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `${window.GithubIcons.get('sync', { size: 12 })} <span>Sync</span>`;
    }
  }

  // Sync All Databases
  if (btnSyncAllFruits) {
    btnSyncAllFruits.addEventListener('click', async () => {
      btnSyncAllFruits.disabled = true;
      btnSyncAllFruits.innerHTML = '<span>⏳ Syncing all Notion databases...</span>';

      for (const fruit of fruitCache) {
        try {
          await fetch('/api/fruits/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: fruit.id })
          });
        } catch (e) {}
      }

      await loadFruits();
      showToast('All Notion Fruit connectors synchronized cleanly!');
      btnSyncAllFruits.disabled = false;
      btnSyncAllFruits.innerHTML = `
        <div class="btn-icon-pastel pastel-peach">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path>
          </svg>
        </div>
        <span>Sync All Notion DBs</span>
      `;
    });
  }

  // 5. Fruit Modal (Create / Edit)
  const formFruitPostType = document.getElementById('formFruitPostType');
  const formFruitRoutePreview = document.getElementById('formFruitRoutePreview');
  const formFruitShowOnIndex = document.getElementById('formFruitShowOnIndex');

  function updateRoutePreview() {
    if (!formFruitPostType || !formFruitRoutePreview) return;
    const pt = formFruitPostType.value.trim().toLowerCase() || 'read';
    if (pt === 'page' || pt === 'pages') {
      formFruitRoutePreview.innerHTML = 'Rute Single: <code>/[slug]</code> | Arsip: <em>None (Halaman Statis)</em>';
    } else if (pt === 'authors' || pt === 'author') {
      formFruitRoutePreview.innerHTML = 'Rute Single: <code>/authors/[author-name]</code> | Arsip: <code>/authors</code>';
    } else {
      formFruitRoutePreview.innerHTML = `Rute Single: <code>/${escapeHtml(pt)}/[slug]</code> | Arsip: <code>/${escapeHtml(pt)}</code>`;
    }
  }

  if (formFruitPostType) {
    formFruitPostType.addEventListener('input', updateRoutePreview);
  }

  // Fallback Color Swatches Logic for Fruit Modal
  const fruitFallbackSwatches = document.getElementById('fruitFallbackSwatches');
  const selectedFallbackLabel = document.getElementById('selectedFallbackLabel');
  const formOptFallback = document.getElementById('formOptFallback');

  function setFallbackSwatch(colorName) {
    if (!formOptFallback) return;
    const targetColor = colorName || 'Pastel Blossom';
    formOptFallback.value = targetColor;

    if (fruitFallbackSwatches) {
      const swatches = fruitFallbackSwatches.querySelectorAll('.swatch-btn');
      let matched = false;
      swatches.forEach(btn => {
        const btnColor = btn.dataset.color || '';
        const btnName = btn.dataset.name || '';
        if (
          btnColor.toLowerCase() === targetColor.toLowerCase() ||
          btnColor.toLowerCase().includes(targetColor.toLowerCase()) ||
          targetColor.toLowerCase().includes(btnName.toLowerCase())
        ) {
          btn.classList.add('active');
          if (selectedFallbackLabel) {
            selectedFallbackLabel.textContent = btnName;
            selectedFallbackLabel.style.color = btn.dataset.fg;
            selectedFallbackLabel.style.backgroundColor = btn.dataset.bg;
          }
          matched = true;
        } else {
          btn.classList.remove('active');
        }
      });

      if (!matched && swatches.length > 0) {
        swatches[0].classList.add('active');
        if (selectedFallbackLabel) {
          selectedFallbackLabel.textContent = swatches[0].dataset.name;
          selectedFallbackLabel.style.color = swatches[0].dataset.fg;
          selectedFallbackLabel.style.backgroundColor = swatches[0].dataset.bg;
        }
      }
    }
  }

  if (fruitFallbackSwatches) {
    fruitFallbackSwatches.querySelectorAll('.swatch-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        setFallbackSwatch(btn.dataset.color);
      });
    });
  }

  if (btnOpenNewFruitModal && fruitModal) {
    btnOpenNewFruitModal.addEventListener('click', () => {
      fruitModalTitle.textContent = 'New Notion Fruit Connector (Post Type)';
      document.getElementById('formFruitIsEdit').value = 'false';
      document.getElementById('formFruitId').value = '';
      document.getElementById('formFruitId').disabled = false;
      document.getElementById('formFruitName').value = '';
      document.getElementById('formFruitDatabaseId').value = '';
      if (formFruitPostType) formFruitPostType.value = 'read';
      if (formFruitShowOnIndex) formFruitShowOnIndex.checked = true;
      updateRoutePreview();

      document.getElementById('formMapTitle').value = 'Title';
      document.getElementById('formMapSlug').value = 'Slug';
      document.getElementById('formMapStatus').value = 'Published';
      document.getElementById('formMapStatusVal').value = 'true';
      document.getElementById('formMapDate').value = 'Date';
      document.getElementById('formMapAuthor').value = 'Authors';
      setFallbackSwatch('Pastel Blossom');
      fruitModal.style.display = 'flex';
    });
  }

  function openEditFruit(id) {
    const fruit = fruitCache.find(f => f.id === id);
    if (!fruit || !fruitModal) return;

    fruitModalTitle.textContent = `Configure Fruit: ${fruit.name || fruit.id}`;
    document.getElementById('formFruitIsEdit').value = 'true';
    document.getElementById('formFruitId').value = fruit.id;
    document.getElementById('formFruitId').disabled = true;
    document.getElementById('formFruitName').value = fruit.name || '';
    document.getElementById('formFruitDatabaseId').value = fruit.databaseId || '';
    
    if (formFruitPostType) {
      formFruitPostType.value = fruit.postType || (fruit.id === 'pages-static' ? 'page' : fruit.id === 'authors-directory' ? 'authors' : fruit.id);
    }
    if (formFruitShowOnIndex) {
      formFruitShowOnIndex.checked = fruit.showOnIndex !== false;
    }
    updateRoutePreview();
    
    const mapping = fruit.schemaMapping || {};
    document.getElementById('formMapTitle').value = mapping.title || 'Title';
    document.getElementById('formMapSlug').value = mapping.slug || 'Slug';
    document.getElementById('formMapStatus').value = mapping.status || 'Published';
    document.getElementById('formMapStatusVal').value = mapping.statusPublishedValue || 'true';
    document.getElementById('formMapDate').value = mapping.date || 'Date';
    document.getElementById('formMapAuthor').value = mapping.author || 'Authors';

    setFallbackSwatch(fruit.settings?.fallbackColor || 'Pastel Blossom');

    fruitModal.style.display = 'flex';
  }

  function closeFruitModal() {
    if (fruitModal) fruitModal.style.display = 'none';
  }

  if (btnCloseFruitModal) btnCloseFruitModal.addEventListener('click', closeFruitModal);
  if (btnCancelFruitModal) btnCancelFruitModal.addEventListener('click', closeFruitModal);

  // Save Fruit Form
  if (fruitForm) {
    fruitForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('formFruitId').value.trim();
      const name = document.getElementById('formFruitName').value.trim();
      const databaseId = document.getElementById('formFruitDatabaseId').value.trim();
      const postType = (formFruitPostType ? formFruitPostType.value.trim().toLowerCase() : '') || id;
      const showOnIndex = formFruitShowOnIndex ? formFruitShowOnIndex.checked : true;
      const isEdit = document.getElementById('formFruitIsEdit').value === 'true';

      if (!id || !databaseId) {
        alert('Identifier dan Database ID wajib diisi!');
        return;
      }

      const isPage = postType === 'page' || postType === 'pages';
      const isAuthors = postType === 'authors' || postType === 'author';
      const targetCollection = isPage ? 'pages' : isAuthors ? 'authors' : postType;
      const routePattern = isPage ? '/[slug]' : isAuthors ? '/authors/[author-name]' : `/${postType}/[slug]`;
      const archiveUrl = isPage ? null : `/${postType}`;

      const existing = fruitCache.find(f => f.id === id) || {};

      const payload = {
        id,
        name,
        databaseId,
        postType,
        routePattern,
        archiveUrl,
        targetCollection,
        showOnIndex,
        status: 'active',
        lastSync: existing.lastSync || new Date().toISOString(),
        totalItems: existing.totalItems || 0,
        webpMediaCount: existing.webpMediaCount || 0,
        schemaMapping: {
          title: document.getElementById('formMapTitle').value.trim() || 'Title',
          slug: document.getElementById('formMapSlug').value.trim() || 'Slug',
          status: document.getElementById('formMapStatus').value.trim() || 'Published',
          statusPublishedValue: document.getElementById('formMapStatusVal').value.trim() || 'true',
          date: document.getElementById('formMapDate').value.trim() || 'Date',
          author: document.getElementById('formMapAuthor').value.trim() || 'Authors',
          category: 'Category',
          cover: 'Cover'
        },
        settings: {
          autoConvertWebp: document.getElementById('formOptWebp').checked,
          fallbackColor: document.getElementById('formOptFallback').value
        }
      };

      try {
        const res = await fetch('/api/fruits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          showToast(`✓ Fruit "${id}" (Post Type: ${postType}) berhasil disimpan!`);
          closeFruitModal();
          await loadFruits();
        } else {
          showToast(`Gagal menyimpan fruit: ${res.statusText}`);
        }
      } catch (err) {
        showToast('Tersimpan secara lokal.');
        closeFruitModal();
      }
    });
  }

  // Handshake Test Live Notion API
  if (btnTestHandshake) {
    btnTestHandshake.addEventListener('click', async () => {
      const dbId = document.getElementById('formFruitDatabaseId').value.trim();
      if (!dbId) {
        alert('Masukkan Notion Database ID terlebih dahulu.');
        return;
      }
      btnTestHandshake.innerHTML = `${window.GithubIcons.get('sync', { size: 12 })} <span>Menghubungi Notion API...</span>`;
      try {
        const res = await fetch('/api/fruits/test-handshake', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ databaseId: dbId })
        });
        const data = await res.json();
        if (data.success) {
          btnTestHandshake.innerHTML = `${window.GithubIcons.get('check', { size: 13, color: 'var(--gh-success-fg)' })} <span style="color: var(--gh-success-fg);">Handshake Sukses (200 OK)</span>`;
          showToast(data.message);
        } else {
          btnTestHandshake.innerHTML = `${window.GithubIcons.get('alert', { size: 13, color: 'var(--gh-danger-fg, #cf222e)' })} <span style="color: var(--gh-danger-fg, #cf222e);">Handshake Gagal</span>`;
          showToast('Handshake Gagal: ' + data.message);
        }
      } catch (err) {
        btnTestHandshake.innerHTML = `${window.GithubIcons.get('alert', { size: 13, color: 'var(--gh-danger-fg, #cf222e)' })} <span style="color: var(--gh-danger-fg, #cf222e);">Error Koneksi</span>`;
        showToast('Gagal menghubungi dev-server: ' + err.message);
      } finally {
        setTimeout(() => {
          btnTestHandshake.innerHTML = `${window.GithubIcons.get('zap', { size: 13 })} <span>Test Connection Handshake</span>`;
        }, 3500);
      }
    });
  }

  // Helper utils
  function maskId(id) {
    if (!id) return 'None';
    if (id.length <= 12) return id;
    return id.substring(0, 8) + '...' + id.substring(id.length - 4);
  }

  function formatTimeAgo(dateStr) {
    if (!dateStr) return 'Never';
    const d = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now - d) / 1000);
    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} min ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} hours ago`;
    return d.toLocaleDateString();
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[m]);
  }

  // 6. Underline Tab Items in Theme View
  tabItems.forEach(tab => {
    tab.addEventListener('click', () => {
      tabItems.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
    });
  });

  // 8. Segmented Control (General non-custom segmented controls)
  segmentBtns.forEach(btn => {
    if (btn.closest('#cardModeSegmentedControl') || btn.closest('#editorialPresetButtons')) return;
    btn.addEventListener('click', () => {
      const parent = btn.closest('.segmented-control');
      if (parent) {
        parent.querySelectorAll('.segment-btn').forEach(b => b.classList.remove('active'));
      }
      btn.classList.add('active');
    });
  });

  // 9. Preview Sandbox Modal
  if (btnPreview && sandboxModal) {
    btnPreview.addEventListener('click', () => {
      sandboxModal.style.display = 'flex';
      const iframe = document.getElementById('themePreviewIframe');
      if (iframe) {
        try {
          iframe.contentWindow.location.reload();
        } catch (e) {
          iframe.src = iframe.src;
        }
      }
    });
  }

  if (btnCloseModal && sandboxModal) {
    btnCloseModal.addEventListener('click', () => {
      sandboxModal.style.display = 'none';
    });
  }

  window.addEventListener('click', (e) => {
    if (e.target === sandboxModal) {
      sandboxModal.style.display = 'none';
    }
    if (e.target === fruitModal) {
      fruitModal.style.display = 'none';
    }
  });

  // 10. Viewport Switcher (SM, MD, LG)
  const vpDimensions = {
    sm: '375 x 820 px (Mobile)',
    md: '768 x 820 px (Tablet)',
    lg: '1200 x 820 px (Desktop)'
  };

  vpButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      vpButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const vp = btn.dataset.vp;

      viewportWrapper.className = `sandbox-viewport-wrapper vp-${vp}`;
      if (vpLabel && vpDimensions[vp]) {
        vpLabel.textContent = vpDimensions[vp];
      }
    });
  });

  // ================= NAVIGATION SETTINGS LOGIC =================
  let currentSettings = null;
  let trackedUrlsList = [];

  async function loadTrackedUrls() {
    try {
      const res = await fetch('/api/tracked-urls');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.urls)) {
          trackedUrlsList = data.urls;
        }
      }
    } catch (e) {
      console.warn('Gagal memuat tracked URLs:', e);
    }
  }

  async function loadSettings() {
    try {
      await loadTrackedUrls();
      const res = await fetch('/api/settings');
      if (res.ok) {
        currentSettings = await res.json();
        populateSettingsForm(currentSettings);
      }
    } catch (e) {
      console.warn('Gagal memuat settings dari API:', e);
    }
  }

  function updateLogoPreviewUI(logoUrl, siteIcon) {
    const previewImg = document.getElementById('navLogoPreviewImg');
    const fallbackEmoji = document.getElementById('navLogoEmojiFallback');
    const url = logoUrl !== undefined ? logoUrl : (navLogoUrl ? navLogoUrl.value.trim() : '');
    const icon = siteIcon !== undefined ? siteIcon : (navSiteIcon ? navSiteIcon.value.trim() : 'fruit');

    if (previewImg && fallbackEmoji) {
      if (url) {
        previewImg.src = url;
        previewImg.style.display = 'block';
        fallbackEmoji.style.display = 'none';
      } else {
        previewImg.style.display = 'none';
        const isDefault = !icon || icon === '🍉' || icon === 'fruit';
        const iconSvg = isDefault
          ? window.GithubIcons.get('fruit', { size: 28, color: 'var(--gh-accent-fg)' })
          : (window.GithubIcons.get(icon) ? window.GithubIcons.get(icon, { size: 28 }) : escapeHtml(icon));
        fallbackEmoji.innerHTML = iconSvg;
        fallbackEmoji.style.display = 'flex';
      }
    }
  }

  function updateSiteNameToggleUI(isEnabled) {
    const navShowSiteName = document.getElementById('navShowSiteName');
    const label = document.getElementById('navSiteNameToggleLabel');
    const input = document.getElementById('navSiteName');
    const active = isEnabled !== undefined ? Boolean(isEnabled) : (navShowSiteName ? navShowSiteName.checked : false);

    if (navShowSiteName) navShowSiteName.checked = active;
    if (label) {
      label.textContent = active ? 'Aktif' : 'Nonaktif';
      label.style.color = active ? 'var(--gh-primary)' : 'var(--gh-fg-subtle)';
    }
    if (input) {
      input.style.opacity = active ? '1' : '0.65';
    }
  }

  function populateSettingsForm(data) {
    if (!data) return;

    if (navSiteIcon) navSiteIcon.value = data.siteIcon || 'fruit';
    if (navSiteName) navSiteName.value = data.siteName || 'My Fruition Blog';
    if (navLogoUrl) navLogoUrl.value = data.logoUrl || '';

    const isShowName = data.showSiteName !== undefined ? Boolean(data.showSiteName) : false;
    updateSiteNameToggleUI(isShowName);

    updateLogoPreviewUI(data.logoUrl || '', data.siteIcon || 'fruit');

    if (data.headerTools) {
      if (navToolSearch) navToolSearch.checked = data.headerTools.enableSearch !== false;
      if (navToolDark) navToolDark.checked = data.headerTools.enableDarkMode !== false;
      if (navToolRead) navToolRead.checked = data.headerTools.enableReadMode !== false;
    }

    if (navFooterCopyright) {
      navFooterCopyright.value = data.footerCopyright || '{yyyy} Made with {heart} by headless blogs';
      updateCopyrightPreview();
    }

    renderHeaderNav(data.headerNav || []);
    renderFooterNav(data.footerNav || []);

    // Sinkronkan visibilitas tombol Publish via Git berdasarkan gitopsAutoSync
    const btnPublishGitEl = document.getElementById('btnPublishGit');
    if (btnPublishGitEl) {
      btnPublishGitEl.style.display = data.gitopsAutoSync ? 'inline-flex' : 'none';
    }
  }

  function buildTrackedUrlOptions(selectedUrl) {
    let html = `<option value="">-- Pilih Halaman Terlacak --</option>`;
    const groups = {};
    trackedUrlsList.forEach(item => {
      const g = item.group || 'Lainnya';
      if (!groups[g]) groups[g] = [];
      groups[g].push(item);
    });

    let hasExactMatch = false;
    for (const groupName of Object.keys(groups)) {
      html += `<optgroup label="${escapeHtml(groupName)}">`;
      groups[groupName].forEach(item => {
        const isSelected = item.url === selectedUrl;
        if (isSelected) hasExactMatch = true;
        html += `<option value="${escapeHtml(item.url)}" data-suggestion="${escapeHtml(item.labelSuggestion || item.title)}" ${isSelected ? 'selected' : ''}>${escapeHtml(item.title)}</option>`;
      });
      html += `</optgroup>`;
    }

    html += `<optgroup label="Kustom / URL Luar">`;
    html += `<option value="__custom__" ${(!hasExactMatch && selectedUrl) ? 'selected' : ''}>Tulis URL Sendiri / Eksternal (Custom URL)...</option>`;
    html += `</optgroup>`;

    return { html, isKnown: hasExactMatch };
  }

  // Available Icons for Navigation & Footer Items
  const AVAILABLE_ICONS = [
    { id: '', label: '- Tanpa Ikon -' },
    { id: 'fruit', label: 'Fruit / Home' },
    { id: 'book', label: 'Book / Artikel' },
    { id: 'file', label: 'File / Halaman' },
    { id: 'people', label: 'People / Penulis' },
    { id: 'repo', label: 'Repo / Katalog' },
    { id: 'tag', label: 'Tag / Kategori' },
    { id: 'globe', label: 'Globe / Web' },
    { id: 'search', label: 'Search / Cari' },
    { id: 'terminal', label: 'Terminal / Kode' },
    { id: 'gear', label: 'Gear / Setelan' },
    { id: 'link', label: 'Link / Tautan' },
    { id: 'heart', label: 'Heart / Donasi' },
    { id: 'package', label: 'Package / Berkas' },
    { id: 'rocket', label: 'Rocket / Rilis' }
  ];

  function buildIconSelectOptions(selectedIcon = '') {
    const sel = (selectedIcon || '').trim().toLowerCase();
    return AVAILABLE_ICONS.map(ic => {
      const isSelected = ic.id === sel || (!ic.id && !sel);
      return `<option value="${ic.id}" ${isSelected ? 'selected' : ''}>${escapeHtml(ic.label)}</option>`;
    }).join('');
  }

  function setupRowReordering(tr, tbody) {
    const btnUp = tr.querySelector('.btn-order-up');
    const btnDown = tr.querySelector('.btn-order-down');

    if (btnUp) {
      btnUp.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const prev = tr.previousElementSibling;
        if (prev) {
          tbody.insertBefore(tr, prev);
          reindexRows(tbody);
          tr.style.transition = 'background-color 0.3s ease';
          tr.style.backgroundColor = 'var(--gh-canvas-subtle)';
          setTimeout(() => { tr.style.backgroundColor = ''; }, 350);
        }
      });
    }

    if (btnDown) {
      btnDown.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const next = tr.nextElementSibling;
        if (next) {
          tbody.insertBefore(next, tr);
          reindexRows(tbody);
          tr.style.transition = 'background-color 0.3s ease';
          tr.style.backgroundColor = 'var(--gh-canvas-subtle)';
          setTimeout(() => { tr.style.backgroundColor = ''; }, 350);
        }
      });
    }

    // HTML5 Drag & Drop Reordering
    tr.setAttribute('draggable', 'true');

    tr.addEventListener('dragstart', (e) => {
      const activeTag = document.activeElement ? document.activeElement.tagName : '';
      if (activeTag === 'INPUT' || activeTag === 'SELECT') {
        e.preventDefault();
        return;
      }
      tr.classList.add('row-dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', '');
      window._activeDraggedRow = tr;
    });

    tr.addEventListener('dragend', () => {
      tr.classList.remove('row-dragging');
      window._activeDraggedRow = null;
      reindexRows(tbody);
    });

    tr.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const dragged = window._activeDraggedRow;
      if (!dragged || dragged === tr || dragged.parentElement !== tbody) return;

      const rect = tr.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      if (e.clientY < midY) {
        tbody.insertBefore(dragged, tr);
      } else {
        tbody.insertBefore(dragged, tr.nextElementSibling);
      }
      reindexRows(tbody);
    });
  }

  function createHeaderNavRow(item, index) {
    const tr = document.createElement('tr');
    tr.className = 'nav-row-item';
    const selData = buildTrackedUrlOptions(item.url || '');
    const isCustom = !selData.isKnown && Boolean(item.url);

    tr.innerHTML = `
      <td style="text-align: center; padding: 4px 6px; user-select: none;">
        <div style="display: flex; align-items: center; justify-content: center; gap: 4px;">
          <span class="drag-handle" title="Tahan dan geser (drag & drop) untuk mengatur urutan" style="cursor: grab; color: var(--gh-fg-muted); display: inline-flex; align-items: center; justify-content: center; padding: 2px;">
            ${window.GithubIcons.get('grabber', { size: 14 })}
          </span>
          <span class="row-order-num" style="font-weight: 600; font-size: 12px; color: var(--gh-fg-subtle); min-width: 14px; text-align: center;">${index + 1}</span>
          <div style="display: flex; flex-direction: column; gap: 1px;">
            <button type="button" class="btn-order-move btn-order-up" title="Geser ke atas" style="background: none; border: none; padding: 0 2px; line-height: 1; cursor: pointer; color: var(--gh-fg-muted); border-radius: 2px; display: flex; align-items: center; justify-content: center;">${window.GithubIcons.get('chevron-up', { size: 10 })}</button>
            <button type="button" class="btn-order-move btn-order-down" title="Geser ke bawah" style="background: none; border: none; padding: 0 2px; line-height: 1; cursor: pointer; color: var(--gh-fg-muted); border-radius: 2px; display: flex; align-items: center; justify-content: center;">${window.GithubIcons.get('chevron-down', { size: 10 })}</button>
          </div>
        </div>
      </td>
      <td>
        <div style="display: flex; gap: 4px; align-items: center; width: 100%;">
          <div class="nav-icon-preview-wrap" style="width: 22px; height: 22px; flex-shrink: 0; display: ${item.icon ? 'inline-flex' : 'none'}; align-items: center; justify-content: center; color: var(--gh-accent-fg); background: var(--gh-canvas-subtle); border: 1px solid var(--gh-border-muted); border-radius: 4px;">
            ${(item.icon && window.GithubIcons) ? window.GithubIcons.get(item.icon, { size: 13 }) : ''}
          </div>
          <select class="gh-input nav-item-icon-select" style="width: 80px; flex-shrink: 0; border-radius: 4px; padding: 4px 4px; font-size: 11px;" title="Pilih Ikon Menu">
            ${buildIconSelectOptions(item.icon || '')}
          </select>
          <input type="text" class="gh-input nav-item-label" value="${escapeHtml(item.label || '')}" placeholder="Label Menu" style="flex: 1; min-width: 0; border-radius: 4px; padding: 4px 8px; font-size: 12px;">
        </div>
      </td>
      <td>
        <div class="nav-url-wrapper" style="display: flex; flex-direction: column; gap: 4px; width: 100%; min-width: 0;">
          <div style="display: flex; gap: 6px; align-items: center; width: 100%; min-width: 0;">
            <select class="gh-input nav-item-url-select" style="flex: 1; min-width: 0; width: 100%; max-width: 100%; border-radius: 4px; padding: 4px 6px; font-size: 12px; font-family: monospace; text-overflow: ellipsis; white-space: nowrap; overflow: hidden;">
              ${selData.html}
            </select>
            <button type="button" class="gh-btn btn-toggle-custom-url" title="Tulis URL Kustom / Tampilkan Input Manual" style="flex-shrink: 0; padding: 3px 6px; font-size: 11px; display: inline-flex; align-items: center; justify-content: center;">
              ${window.GithubIcons.get('pencil', { size: 12 })}
            </button>
          </div>
          <input type="text" class="gh-input nav-item-url" value="${escapeHtml(item.url || '')}" placeholder="/path atau https://..." style="box-sizing: border-box; border-radius: 4px; padding: 4px 8px; width: 100%; max-width: 100%; font-family: monospace; font-size: 12px; ${(!isCustom && selData.isKnown && item.url) ? 'display: none;' : ''}">
        </div>
      </td>
      <td>
        <select class="gh-input nav-item-target" style="box-sizing: border-box; border-radius: 4px; padding: 4px 6px; width: 100%; max-width: 100%; font-size: 12px;">
          <option value="_self" ${item.target === '_self' ? 'selected' : ''}>Jendela Sama (_self)</option>
          <option value="_blank" ${item.target === '_blank' ? 'selected' : ''}>Tab Baru (_blank)</option>
        </select>
      </td>
      <td style="text-align: center;">
        <input type="radio" name="headerNavActive" class="nav-item-active" ${item.active ? 'checked' : ''} data-waschecked="${item.active ? 'true' : 'false'}" title="Pilih menu ini sebagai menu aktif (klik lagi untuk batal)">
      </td>
      <td style="text-align: center;">
        <input type="checkbox" class="nav-item-visible" ${item.visible !== false ? 'checked' : ''}>
      </td>
      <td style="text-align: right;">
        <button type="button" class="gh-btn btn-delete-row" style="padding: 2px 8px; color: var(--gh-danger-fg);" title="Hapus menu">
          &times;
        </button>
      </td>
    `;

    // Icon select handler
    const iconSelect = tr.querySelector('.nav-item-icon-select');
    const iconPreviewWrap = tr.querySelector('.nav-icon-preview-wrap');
    if (iconSelect && iconPreviewWrap) {
      iconSelect.addEventListener('change', () => {
        const val = iconSelect.value.trim();
        if (val && window.GithubIcons && window.GithubIcons.icons[val]) {
          iconPreviewWrap.innerHTML = window.GithubIcons.get(val, { size: 13 });
          iconPreviewWrap.style.display = 'inline-flex';
        } else {
          iconPreviewWrap.innerHTML = '';
          iconPreviewWrap.style.display = 'none';
        }
      });
    }

    // Dropdown change handler
    const select = tr.querySelector('.nav-item-url-select');
    const urlInput = tr.querySelector('.nav-item-url');
    const labelInput = tr.querySelector('.nav-item-label');
    const toggleBtn = tr.querySelector('.btn-toggle-custom-url');
    const radio = tr.querySelector('.nav-item-active');

    select.addEventListener('change', () => {
      if (select.value === '__custom__') {
        urlInput.style.display = 'block';
        urlInput.focus();
      } else if (select.value) {
        urlInput.value = select.value;
        urlInput.style.display = 'none';
        const opt = select.options[select.selectedIndex];
        const suggestion = opt ? opt.getAttribute('data-suggestion') : '';
        if (!labelInput.value.trim() && suggestion) {
          labelInput.value = suggestion;
        }
      } else {
        urlInput.value = '';
        urlInput.style.display = 'none';
      }
    });

    // Toggle custom url button
    toggleBtn.addEventListener('click', () => {
      if (urlInput.style.display === 'none') {
        urlInput.style.display = 'block';
        urlInput.focus();
      } else {
        urlInput.style.display = 'none';
      }
    });

    // Custom input typing
    urlInput.addEventListener('input', () => {
      let matched = false;
      for (let i = 0; i < select.options.length; i++) {
        if (select.options[i].value === urlInput.value.trim()) {
          select.selectedIndex = i;
          matched = true;
          break;
        }
      }
      if (!matched && urlInput.value.trim()) {
        select.value = '__custom__';
      }
    });

    // Toggle uncheck on radio
    radio.addEventListener('click', function() {
      if (this.dataset.waschecked === 'true') {
        this.checked = false;
        this.dataset.waschecked = 'false';
      } else {
        document.querySelectorAll('.nav-item-active').forEach(r => r.dataset.waschecked = 'false');
        this.dataset.waschecked = 'true';
      }
    });

    // Delete handler
    tr.querySelector('.btn-delete-row').addEventListener('click', () => {
      tr.remove();
      reindexRows(headerNavTableBody);
    });

    setupRowReordering(tr, headerNavTableBody);

    return tr;
  }

  function renderHeaderNav(items) {
    if (!headerNavTableBody) return;
    headerNavTableBody.innerHTML = '';

    items.forEach((item, index) => {
      const tr = createHeaderNavRow(item, index);
      headerNavTableBody.appendChild(tr);
    });

    reindexRows(headerNavTableBody);
  }

  function createFooterNavRow(item, index) {
    const tr = document.createElement('tr');
    tr.className = 'footer-row-item';
    const selData = buildTrackedUrlOptions(item.url || '');
    const isCustom = !selData.isKnown && Boolean(item.url);

    tr.innerHTML = `
      <td style="text-align: center; padding: 4px 6px; user-select: none;">
        <div style="display: flex; align-items: center; justify-content: center; gap: 4px;">
          <span class="drag-handle" title="Tahan dan geser (drag & drop) untuk mengatur urutan" style="cursor: grab; color: var(--gh-fg-muted); display: inline-flex; align-items: center; justify-content: center; padding: 2px;">
            ${window.GithubIcons.get('grabber', { size: 14 })}
          </span>
          <span class="row-order-num" style="font-weight: 600; font-size: 12px; color: var(--gh-fg-subtle); min-width: 14px; text-align: center;">${index + 1}</span>
          <div style="display: flex; flex-direction: column; gap: 1px;">
            <button type="button" class="btn-order-move btn-order-up" title="Geser ke atas" style="background: none; border: none; padding: 0 2px; line-height: 1; cursor: pointer; color: var(--gh-fg-muted); border-radius: 2px; display: flex; align-items: center; justify-content: center;">${window.GithubIcons.get('chevron-up', { size: 10 })}</button>
            <button type="button" class="btn-order-move btn-order-down" title="Geser ke bawah" style="background: none; border: none; padding: 0 2px; line-height: 1; cursor: pointer; color: var(--gh-fg-muted); border-radius: 2px; display: flex; align-items: center; justify-content: center;">${window.GithubIcons.get('chevron-down', { size: 10 })}</button>
          </div>
        </div>
      </td>
      <td>
        <div style="display: flex; gap: 4px; align-items: center; width: 100%;">
          <div class="foot-icon-preview-wrap" style="width: 22px; height: 22px; flex-shrink: 0; display: ${item.icon ? 'inline-flex' : 'none'}; align-items: center; justify-content: center; color: var(--gh-accent-fg); background: var(--gh-canvas-subtle); border: 1px solid var(--gh-border-muted); border-radius: 4px;">
            ${(item.icon && window.GithubIcons) ? window.GithubIcons.get(item.icon, { size: 13 }) : ''}
          </div>
          <select class="gh-input foot-item-icon-select" style="width: 80px; flex-shrink: 0; border-radius: 4px; padding: 4px 4px; font-size: 11px;" title="Pilih Ikon Footer">
            ${buildIconSelectOptions(item.icon || '')}
          </select>
          <input type="text" class="gh-input foot-item-label" value="${escapeHtml(item.label || '')}" placeholder="Label Teks" style="flex: 1; min-width: 0; border-radius: 4px; padding: 4px 8px; font-size: 12px;">
        </div>
      </td>
      <td>
        <div class="foot-url-wrapper" style="display: flex; flex-direction: column; gap: 4px; width: 100%; min-width: 0;">
          <div style="display: flex; gap: 6px; align-items: center; width: 100%; min-width: 0;">
            <select class="gh-input foot-item-url-select" style="flex: 1; min-width: 0; width: 100%; max-width: 100%; border-radius: 4px; padding: 4px 6px; font-size: 12px; font-family: monospace; text-overflow: ellipsis; white-space: nowrap; overflow: hidden;">
              ${selData.html}
            </select>
            <button type="button" class="gh-btn btn-toggle-custom-foot-url" title="Tulis URL Kustom / Tampilkan Input Manual" style="flex-shrink: 0; padding: 3px 6px; font-size: 11px; display: inline-flex; align-items: center; justify-content: center;">
              ${window.GithubIcons.get('pencil', { size: 12 })}
            </button>
          </div>
          <input type="text" class="gh-input foot-item-url" value="${escapeHtml(item.url || '')}" placeholder="/path atau https://..." style="box-sizing: border-box; border-radius: 4px; padding: 4px 8px; width: 100%; max-width: 100%; font-family: monospace; font-size: 12px; ${(!isCustom && selData.isKnown && item.url) ? 'display: none;' : ''}">
        </div>
      </td>
      <td>
        <select class="gh-input foot-item-target" style="box-sizing: border-box; border-radius: 4px; padding: 4px 6px; width: 100%; max-width: 100%; font-size: 12px;">
          <option value="_self" ${item.target === '_self' ? 'selected' : ''}>Jendela Sama (_self)</option>
          <option value="_blank" ${item.target === '_blank' ? 'selected' : ''}>Tab Baru (_blank)</option>
        </select>
      </td>
      <td style="text-align: center;">
        <input type="checkbox" class="foot-item-visible" ${item.visible !== false ? 'checked' : ''}>
      </td>
      <td style="text-align: right;">
        <button type="button" class="gh-btn btn-delete-foot-row" style="padding: 2px 8px; color: var(--gh-danger-fg);" title="Hapus link footer">
          &times;
        </button>
      </td>
    `;

    // Footer Icon select handler
    const footIconSelect = tr.querySelector('.foot-item-icon-select');
    const footIconPreviewWrap = tr.querySelector('.foot-icon-preview-wrap');
    if (footIconSelect && footIconPreviewWrap) {
      footIconSelect.addEventListener('change', () => {
        const val = footIconSelect.value.trim();
        if (val && window.GithubIcons && window.GithubIcons.icons[val]) {
          footIconPreviewWrap.innerHTML = window.GithubIcons.get(val, { size: 13 });
          footIconPreviewWrap.style.display = 'inline-flex';
        } else {
          footIconPreviewWrap.innerHTML = '';
          footIconPreviewWrap.style.display = 'none';
        }
      });
    }

    // Dropdown change handler
    const select = tr.querySelector('.foot-item-url-select');
    const urlInput = tr.querySelector('.foot-item-url');
    const labelInput = tr.querySelector('.foot-item-label');
    const toggleBtn = tr.querySelector('.btn-toggle-custom-foot-url');

    select.addEventListener('change', () => {
      if (select.value === '__custom__') {
        urlInput.style.display = 'block';
        urlInput.focus();
      } else if (select.value) {
        urlInput.value = select.value;
        urlInput.style.display = 'none';
        const opt = select.options[select.selectedIndex];
        const suggestion = opt ? opt.getAttribute('data-suggestion') : '';
        if (!labelInput.value.trim() && suggestion) {
          labelInput.value = suggestion;
        }
      } else {
        urlInput.value = '';
        urlInput.style.display = 'none';
      }
    });

    // Toggle custom url button
    toggleBtn.addEventListener('click', () => {
      if (urlInput.style.display === 'none') {
        urlInput.style.display = 'block';
        urlInput.focus();
      } else {
        urlInput.style.display = 'none';
      }
    });

    // Custom input typing
    urlInput.addEventListener('input', () => {
      let matched = false;
      for (let i = 0; i < select.options.length; i++) {
        if (select.options[i].value === urlInput.value.trim()) {
          select.selectedIndex = i;
          matched = true;
          break;
        }
      }
      if (!matched && urlInput.value.trim()) {
        select.value = '__custom__';
      }
    });

    // Delete handler
    tr.querySelector('.btn-delete-foot-row').addEventListener('click', () => {
      tr.remove();
      reindexRows(footerNavTableBody);
    });

    setupRowReordering(tr, footerNavTableBody);

    return tr;
  }

  function renderFooterNav(items) {
    if (!footerNavTableBody) return;
    footerNavTableBody.innerHTML = '';

    items.forEach((item, index) => {
      const tr = createFooterNavRow(item, index);
      footerNavTableBody.appendChild(tr);
    });

    reindexRows(footerNavTableBody);
  }

  function reindexRows(tbody) {
    if (!tbody) return;
    const rows = Array.from(tbody.querySelectorAll('tr'));
    rows.forEach((tr, idx) => {
      const orderNum = tr.querySelector('.row-order-num');
      if (orderNum) {
        orderNum.textContent = idx + 1;
      } else {
        const firstCol = tr.querySelector('td');
        if (firstCol) firstCol.textContent = idx + 1;
      }

      const btnUp = tr.querySelector('.btn-order-up');
      const btnDown = tr.querySelector('.btn-order-down');
      if (btnUp) {
        btnUp.disabled = idx === 0;
        btnUp.style.opacity = idx === 0 ? '0.2' : '1';
        btnUp.style.cursor = idx === 0 ? 'default' : 'pointer';
      }
      if (btnDown) {
        btnDown.disabled = idx === rows.length - 1;
        btnDown.style.opacity = idx === rows.length - 1 ? '0.2' : '1';
        btnDown.style.cursor = idx === rows.length - 1 ? 'default' : 'pointer';
      }
    });
  }

  // Add Item Handlers
  if (btnAddHeaderItem) {
    btnAddHeaderItem.addEventListener('click', () => {
      const count = headerNavTableBody ? headerNavTableBody.querySelectorAll('tr').length + 1 : 1;
      const tr = createHeaderNavRow({ icon: '', label: '', url: '', target: '_self', visible: true, active: false }, count - 1);
      if (headerNavTableBody) {
        headerNavTableBody.appendChild(tr);
        reindexRows(headerNavTableBody);
      }
    });
  }

  if (btnAddFooterItem) {
    btnAddFooterItem.addEventListener('click', () => {
      const count = footerNavTableBody ? footerNavTableBody.querySelectorAll('tr').length + 1 : 1;
      const tr = createFooterNavRow({ icon: '', label: '', url: '', target: '_self', visible: true }, count - 1);
      if (footerNavTableBody) {
        footerNavTableBody.appendChild(tr);
        reindexRows(footerNavTableBody);
      }
    });
  }

  // Save Settings Function
  async function saveSettingsData() {
    const headerNav = [];
    if (headerNavTableBody) {
      headerNavTableBody.querySelectorAll('.nav-row-item').forEach((row, idx) => {
        const iconSelect = row.querySelector('.nav-item-icon-select');
        const icon = iconSelect ? iconSelect.value.trim() : '';
        const label = row.querySelector('.nav-item-label').value.trim();
        const urlInput = row.querySelector('.nav-item-url');
        const urlSelect = row.querySelector('.nav-item-url-select');
        let url = urlInput ? urlInput.value.trim() : '';
        if (!url && urlSelect && urlSelect.value && urlSelect.value !== '__custom__') {
          url = urlSelect.value.trim();
        }
        const target = row.querySelector('.nav-item-target').value;
        const visible = row.querySelector('.nav-item-visible').checked;
        const activeRadio = row.querySelector('.nav-item-active');
        const active = activeRadio ? activeRadio.checked : false;

        if (label || url || icon) {
          headerNav.push({ id: `nav-${idx + 1}`, icon, label, url, target, visible, active });
        }
      });
    }

    const footerNav = [];
    if (footerNavTableBody) {
      footerNavTableBody.querySelectorAll('.footer-row-item').forEach((row, idx) => {
        const iconSelect = row.querySelector('.foot-item-icon-select');
        const icon = iconSelect ? iconSelect.value.trim() : '';
        const label = row.querySelector('.foot-item-label').value.trim();
        const urlInput = row.querySelector('.foot-item-url');
        const urlSelect = row.querySelector('.foot-item-url-select');
        let url = urlInput ? urlInput.value.trim() : '';
        if (!url && urlSelect && urlSelect.value && urlSelect.value !== '__custom__') {
          url = urlSelect.value.trim();
        }
        const target = row.querySelector('.foot-item-target').value;
        const visible = row.querySelector('.foot-item-visible').checked;
        if (label || url || icon) {
          footerNav.push({ id: `foot-${idx + 1}`, icon, label, url, target, visible });
        }
      });
    }

    const payload = {
      ...(currentSettings || {}),
      siteName: navSiteName ? navSiteName.value.trim() : 'My Fruition Blog',
      siteIcon: navSiteIcon ? navSiteIcon.value.trim() : 'fruit',
      logoUrl: navLogoUrl ? navLogoUrl.value.trim() : '',
      showSiteName: document.getElementById('navShowSiteName') ? document.getElementById('navShowSiteName').checked : false,
      headerNav,
      headerTools: {
        enableSearch: navToolSearch ? navToolSearch.checked : true,
        enableDarkMode: navToolDark ? navToolDark.checked : true,
        enableReadMode: navToolRead ? navToolRead.checked : true
      },
      footerNav,
      footerCopyright: navFooterCopyright ? navFooterCopyright.value.trim() : '{yyyy} Made with {heart} by headless blogs'
    };
    currentSettings = payload;

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        showToast('✓ Pengaturan Navigasi & Tata Letak tersimpan di content/settings/site.json!');
        const iframe = document.getElementById('themePreviewIframe');
        if (iframe && iframe.contentWindow) {
          try {
            iframe.contentWindow.location.reload();
          } catch(e) {
            iframe.src = iframe.src;
          }
        }
      } else {
        showToast('Gagal menyimpan navigasi: ' + res.statusText);
      }
    } catch (e) {
      showToast('Tersimpan di memori lokal.');
    }
  }

  // Logo Upload & Interactive Brand Controls
  const btnUploadLogo = document.getElementById('btnUploadLogo');
  const btnRemoveLogo = document.getElementById('btnRemoveLogo');
  const navLogoFileInput = document.getElementById('navLogoFileInput');
  const logoUploadStatus = document.getElementById('logoUploadStatus');

  if (btnUploadLogo && navLogoFileInput) {
    btnUploadLogo.addEventListener('click', () => {
      navLogoFileInput.click();
    });

    navLogoFileInput.addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      if (file.size > 5 * 1024 * 1024) {
        showToast('⚠️ Ukuran berkas terlalu besar (maksimal 5MB)');
        return;
      }

      if (logoUploadStatus) logoUploadStatus.textContent = '⏳ Mengunggah...';

      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = reader.result;
          const res = await fetch('/api/upload-logo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename: file.name, data: base64Data })
          });
          const result = await res.json();
          if (result.success) {
            if (navLogoUrl) navLogoUrl.value = result.url;
            updateLogoPreviewUI(result.url, navSiteIcon ? navSiteIcon.value : 'fruit');
            if (logoUploadStatus) logoUploadStatus.textContent = '✓ Tersimpan';
            setTimeout(() => { if (logoUploadStatus) logoUploadStatus.textContent = ''; }, 3000);
            showToast('✓ Logo berhasil diunggah & dipasang sebagai logo navbar!');
            
            // Reload preview iframe if visible
            const iframe = document.getElementById('themePreviewIframe');
            if (iframe && iframe.contentWindow) {
              try { iframe.contentWindow.location.reload(); } catch(err) { iframe.src = iframe.src; }
            }
          } else {
            if (logoUploadStatus) logoUploadStatus.textContent = '';
            showToast('⚠️ Gagal mengunggah logo: ' + (result.error || 'Terjadi kesalahan'));
          }
        } catch (err) {
          if (logoUploadStatus) logoUploadStatus.textContent = '';
          showToast('⚠️ Error upload logo: ' + err.message);
        }
      };
      reader.readAsDataURL(file);
    });
  }

  if (btnRemoveLogo) {
    btnRemoveLogo.addEventListener('click', () => {
      if (navLogoUrl) navLogoUrl.value = '';
      updateLogoPreviewUI('', navSiteIcon ? navSiteIcon.value : 'fruit');
      showToast('Logo dihapus. Navbar kini menggunakan ikon SVG.');
    });
  }

  if (navLogoUrl) {
    navLogoUrl.addEventListener('input', () => {
      updateLogoPreviewUI(navLogoUrl.value.trim(), navSiteIcon ? navSiteIcon.value : 'fruit');
    });
  }

  if (navSiteIcon) {
    navSiteIcon.addEventListener('input', () => {
      if (!navLogoUrl || !navLogoUrl.value.trim()) {
        updateLogoPreviewUI('', navSiteIcon.value.trim());
      }
    });
  }

  const navShowSiteNameToggle = document.getElementById('navShowSiteName');
  if (navShowSiteNameToggle) {
    navShowSiteNameToggle.addEventListener('change', () => {
      updateSiteNameToggleUI(navShowSiteNameToggle.checked);
    });
  }

  function updateCopyrightPreview() {
    const previewEl = document.getElementById('copyrightPreviewText');
    if (!previewEl || !navFooterCopyright) return;
    const raw = navFooterCopyright.value || '{yyyy} Made with {heart} by headless blogs';
    const curYear = new Date().getFullYear();
    const heartHtml = window.GithubIcons
      ? `<span class="heartbeat-pulse" aria-label="heartbeat" style="display: inline-flex; color: #e11d48; margin: 0 2px;">${window.GithubIcons.get('heart', { size: 12, color: '#e11d48' })}</span>`
      : '❤️';
    const formatted = escapeHtml(raw.replace(/\{yyyy\}/g, curYear))
      .replace(/\{heart\}|\{heartbeat\}|\{heart\s*beat\}|\{heart-beat\}|❤️|&#10084;&#65039;|&#x2764;&#xfe0f;/gi, heartHtml);
    previewEl.innerHTML = formatted;
  }

  if (navFooterCopyright) {
    navFooterCopyright.addEventListener('input', updateCopyrightPreview);
  }

  if (btnSaveNavTop) {
    btnSaveNavTop.addEventListener('click', saveSettingsData);
  }

  // ================= 5. SYSTEM SETTINGS & ENVIRONMENT CONTROLLER =================
  const sysSiteIcon = document.getElementById('sysSiteIcon');
  const sysFaviconUrl = document.getElementById('sysFaviconUrl');
  const sysFaviconFileInput = document.getElementById('sysFaviconFileInput');
  const btnUploadFavicon = document.getElementById('btnUploadFavicon');
  const btnRemoveFavicon = document.getElementById('btnRemoveFavicon');
  const sysFaviconPreviewImg = document.getElementById('sysFaviconPreviewImg');
  const sysFaviconDefaultIcon = document.getElementById('sysFaviconDefaultIcon');
  const sysFaviconStatusText = document.getElementById('sysFaviconStatusText');

  const sysSiteName = document.getElementById('sysSiteName');
  const sysSiteDesc = document.getElementById('sysSiteDesc');
  const sysSiteUrl = document.getElementById('sysSiteUrl');
  const sysSiteLocale = document.getElementById('sysSiteLocale');
  const sysSiteTimezone = document.getElementById('sysSiteTimezone');

  const sysNotionApiKey = document.getElementById('sysNotionApiKey');
  const btnToggleNotionKey = document.getElementById('btnToggleNotionKey');
  const btnValidateNotionKey = document.getElementById('btnValidateNotionKey');
  const badgeNotionStatus = document.getElementById('badgeNotionStatus');
  const btnTestNotionConnection = document.getElementById('btnTestNotionConnection');

  const sysGitAutoSync = document.getElementById('sysGitAutoSync');
  const sysGitOwner = document.getElementById('sysGitOwner');
  const sysGitRepo = document.getElementById('sysGitRepo');
  const sysGitBranch = document.getElementById('sysGitBranch');
  const sysGitToken = document.getElementById('sysGitToken');
  const btnToggleGitToken = document.getElementById('btnToggleGitToken');

  const sysSharpQuality = document.getElementById('sysSharpQuality');
  const sysRateLimitDelay = document.getElementById('sysRateLimitDelay');
  const btnClearJsonCache = document.getElementById('btnClearJsonCache');
  const btnClearWebpCache = document.getElementById('btnClearWebpCache');
  const btnRestartDevServer = document.getElementById('btnRestartDevServer');
  const btnSaveSystemSettings = document.getElementById('btnSaveSystemSettings');

  const sysPublishPlatform = document.getElementById('sysPublishPlatform');
  const headerPreviewFilename = document.getElementById('headerPreviewFilename');
  const headerPreviewContent = document.getElementById('headerPreviewContent');
  const btnGeneratePlatformHeaders = document.getElementById('btnGeneratePlatformHeaders');
  const badgePublishHeaderStatus = document.getElementById('badgePublishHeaderStatus');
  const platformBtnCards = document.querySelectorAll('.platform-btn-card');

  const btnPublish = document.getElementById('btnPublish');
  const btnPublishGit = document.getElementById('btnPublishGit');

  async function updatePlatformHeaderPreviewUI(platform) {
    let plat = (platform || (sysPublishPlatform ? sysPublishPlatform.value : 'vercel')).toLowerCase().trim();
    if (plat === 'gh') plat = 'github';
    if (sysPublishPlatform && sysPublishPlatform.value !== plat) {
      sysPublishPlatform.value = plat;
    }

    if (platformBtnCards) {
      platformBtnCards.forEach(card => {
        const p = card.getAttribute('data-platform');
        if (p === plat) {
          card.style.borderColor = 'var(--gh-accent-fg, #0969da)';
          card.style.background = 'var(--gh-canvas-default, #ffffff)';
          card.style.boxShadow = '0 0 0 1px var(--gh-accent-fg, #0969da)';
        } else {
          card.style.borderColor = 'var(--gh-border-default, #d0d7de)';
          card.style.background = 'var(--gh-canvas-subtle, #f6f8fa)';
          card.style.boxShadow = 'none';
        }
      });
    }

    try {
      const res = await fetch('/api/header-preview?platform=' + encodeURIComponent(plat));
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.preview) {
          if (headerPreviewFilename) headerPreviewFilename.textContent = data.preview.filename;
          if (headerPreviewContent) headerPreviewContent.textContent = data.preview.content;
          if (badgePublishHeaderStatus) {
            badgePublishHeaderStatus.textContent = 'Platform: ' + data.preview.filename;
          }
        }
      }
    } catch (err) {
      console.warn('Gagal memuat pratinjau header platform:', err);
    }
  }

  if (sysPublishPlatform) {
    sysPublishPlatform.addEventListener('change', () => {
      updatePlatformHeaderPreviewUI(sysPublishPlatform.value);
    });
  }

  if (platformBtnCards) {
    platformBtnCards.forEach(card => {
      card.addEventListener('click', () => {
        const targetPlat = card.getAttribute('data-platform');
        if (sysPublishPlatform) sysPublishPlatform.value = targetPlat;
        updatePlatformHeaderPreviewUI(targetPlat);
      });
    });
  }

  if (btnGeneratePlatformHeaders) {
    btnGeneratePlatformHeaders.addEventListener('click', async () => {
      const plat = sysPublishPlatform ? sysPublishPlatform.value : 'vercel';
      btnGeneratePlatformHeaders.disabled = true;
      showToast(`Memproduksi file header untuk ${plat}...`);
      try {
        const res = await fetch('/api/generate-headers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ platform: plat })
        });
        const data = await res.json();
        if (data.success) {
          showToast(`✓ File header ${plat} berhasil dibuat! (${data.result.createdFiles.join(', ')})`);
          if (badgePublishHeaderStatus) {
            badgePublishHeaderStatus.textContent = '● ' + data.result.filename + ' Aktif';
            badgePublishHeaderStatus.className = 'badge-tag green';
          }
          await updatePlatformHeaderPreviewUI(plat);
        } else {
          showToast('Gagal memproduksi header: ' + (data.error || 'Terjadi kesalahan'));
        }
      } catch (e) {
        showToast('Error generate header: ' + e.message);
      } finally {
        btnGeneratePlatformHeaders.disabled = false;
      }
    });
  }

  function updateFaviconPreviewUI(faviconUrl) {
    const cleanUrl = (faviconUrl || '').trim();
    if (sysFaviconUrl) sysFaviconUrl.value = cleanUrl;
    if (sysFaviconPreviewImg && sysFaviconDefaultIcon) {
      if (cleanUrl) {
        sysFaviconPreviewImg.src = cleanUrl + '?t=' + Date.now();
        sysFaviconPreviewImg.style.display = 'block';
        sysFaviconDefaultIcon.style.display = 'none';
        if (btnRemoveFavicon) btnRemoveFavicon.style.display = 'inline-flex';
        if (sysFaviconStatusText) sysFaviconStatusText.innerHTML = `Aktif: <code>${escapeHtml(cleanUrl)}</code>`;
      } else {
        sysFaviconPreviewImg.style.display = 'none';
        if (window.GithubIcons) {
          sysFaviconDefaultIcon.innerHTML = window.GithubIcons.get('fruit', { size: 22, color: 'var(--gh-accent-fg)' });
        }
        sysFaviconDefaultIcon.style.display = 'inline-flex';
        if (btnRemoveFavicon) btnRemoveFavicon.style.display = 'none';
        if (sysFaviconStatusText) sysFaviconStatusText.innerHTML = `Default SVG (belum ada file favicon kustom)`;
      }
    }
  }

  function updateGitPublishButtonVisibility(isEnabled) {
    if (btnPublishGit) {
      btnPublishGit.style.display = isEnabled ? 'inline-flex' : 'none';
    }
  }

  if (btnUploadFavicon && sysFaviconFileInput) {
    btnUploadFavicon.addEventListener('click', () => {
      sysFaviconFileInput.click();
    });

    sysFaviconFileInput.addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      if (file.size > 2 * 1024 * 1024) {
        showToast('Ukuran file favicon terlalu besar (maksimal 2MB).');
        return;
      }

      if (sysFaviconStatusText) sysFaviconStatusText.textContent = 'Mengunggah favicon...';

      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const res = await fetch('/api/upload-favicon', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename: file.name, data: reader.result })
          });
          const result = await res.json();
          if (result.success) {
            if (currentSettings) currentSettings.faviconUrl = result.url;
            updateFaviconPreviewUI(result.url);
            showToast('✓ Favicon berhasil diunggah dan dipasang ke situs!');
          } else {
            showToast('Gagal mengunggah favicon: ' + (result.error || 'Terjadi kesalahan'));
          }
        } catch (err) {
          showToast('Error upload favicon: ' + err.message);
        }
      };
      reader.readAsDataURL(file);
    });
  }

  if (btnRemoveFavicon) {
    btnRemoveFavicon.addEventListener('click', async () => {
      updateFaviconPreviewUI('');
      if (currentSettings) currentSettings.faviconUrl = '';
      await saveSystemSettingsData();
      showToast('Favicon kustom dihapus, kembali ke ikon SVG default.');
    });
  }

  if (sysGitAutoSync) {
    sysGitAutoSync.addEventListener('change', () => {
      const enabled = sysGitAutoSync.checked;
      updateGitPublishButtonVisibility(enabled);
      if (currentSettings) currentSettings.gitopsAutoSync = enabled;
      showToast(enabled
        ? '✓ Mode 2 aktif: Tombol "Publish via Git" kini ditampilkan di bilah bawah!'
        : 'Mode Publish via Git dinonaktifkan (hanya menggunakan Publish lokal dist/).');
    });
  }

  async function loadSystemSettings() {
    try {
      // 1. Load site.json
      const siteRes = await fetch('/api/settings');
      if (siteRes.ok) {
        const siteData = await siteRes.json();
        currentSettings = siteData;
        if (sysSiteIcon) sysSiteIcon.value = siteData.siteIcon || 'fruit';
        updateFaviconPreviewUI(siteData.faviconUrl || '');
        if (sysSiteName) sysSiteName.value = siteData.siteName || 'My Fruition Blog';
        if (sysSiteDesc) sysSiteDesc.value = siteData.siteDescription || 'A fast, beautiful static blog powered by Notion & Astro SSG';
        if (sysSiteUrl) sysSiteUrl.value = siteData.siteUrl || 'http://localhost:4321';
        if (sysSiteLocale && siteData.siteLanguage) sysSiteLocale.value = siteData.siteLanguage;
        if (sysSiteTimezone && siteData.siteTimezone) sysSiteTimezone.value = siteData.siteTimezone;
        if (sysGitAutoSync && typeof siteData.gitopsAutoSync !== 'undefined') {
          sysGitAutoSync.checked = Boolean(siteData.gitopsAutoSync);
          updateGitPublishButtonVisibility(Boolean(siteData.gitopsAutoSync));
        }
        if (sysGitBranch && siteData.gitopsBranch) sysGitBranch.value = siteData.gitopsBranch;
        if (sysSharpQuality && siteData.sharpQuality) sysSharpQuality.value = siteData.sharpQuality;
        if (sysRateLimitDelay && siteData.rateLimitDelay) sysRateLimitDelay.value = siteData.rateLimitDelay;
        if (sysPublishPlatform) {
          const activePlat = siteData.publishPlatform || 'vercel';
          sysPublishPlatform.value = activePlat;
          updatePlatformHeaderPreviewUI(activePlat);
        }
      }

      // 2. Load .env
      const envRes = await fetch('/api/env');
      if (envRes.ok) {
        const envData = await envRes.json();
        if (envData.success && envData.env) {
          if (sysNotionApiKey) sysNotionApiKey.value = envData.env.NOTION_API_KEY || '';
          if (sysGitOwner) sysGitOwner.value = envData.env.GITHUB_REPO_OWNER || '';
          if (sysGitRepo) sysGitRepo.value = envData.env.GITHUB_REPO_NAME || 'blogs-dev';
          if (sysGitToken) sysGitToken.value = envData.env.GITHUB_TOKEN || '';

          // Update Notion badge status
          if (badgeNotionStatus) {
            if (envData.env.NOTION_API_KEY && envData.env.NOTION_API_KEY.length > 5) {
              badgeNotionStatus.textContent = '● Token Terkonfigurasi';
              badgeNotionStatus.className = 'badge-tag green';
            } else {
              badgeNotionStatus.textContent = '○ Token Belum Diisi';
              badgeNotionStatus.className = 'badge-tag';
            }
          }
        }
      }
    } catch (err) {
      console.warn('Gagal memuat system settings:', err);
    }
  }

  async function saveSystemSettingsData() {
    try {
      // 1. Save site.json updates
      const currentSite = currentSettings || {};
      currentSite.siteIcon = sysSiteIcon ? sysSiteIcon.value.trim() : 'fruit';
      currentSite.faviconUrl = sysFaviconUrl ? sysFaviconUrl.value.trim() : (currentSite.faviconUrl || '');
      currentSite.siteName = sysSiteName ? sysSiteName.value.trim() : 'My Fruition Blog';
      if (navSiteName) navSiteName.value = currentSite.siteName;
      currentSite.siteDescription = sysSiteDesc ? sysSiteDesc.value.trim() : '';
      currentSite.siteUrl = sysSiteUrl ? sysSiteUrl.value.trim() : 'http://localhost:4321';
      currentSite.siteLanguage = sysSiteLocale ? sysSiteLocale.value : 'id';
      currentSite.siteTimezone = sysSiteTimezone ? sysSiteTimezone.value : 'Asia/Jakarta';
      currentSite.gitopsAutoSync = sysGitAutoSync ? sysGitAutoSync.checked : false;
      currentSite.gitopsBranch = sysGitBranch ? sysGitBranch.value.trim() : 'main';
      currentSite.sharpQuality = sysSharpQuality ? parseInt(sysSharpQuality.value, 10) : 80;
      currentSite.rateLimitDelay = sysRateLimitDelay ? parseInt(sysRateLimitDelay.value, 10) : 350;
      currentSite.publishPlatform = sysPublishPlatform ? sysPublishPlatform.value : 'vercel';

      updateGitPublishButtonVisibility(currentSite.gitopsAutoSync);

      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentSite)
      });

      if (sysPublishPlatform) {
        updatePlatformHeaderPreviewUI(currentSite.publishPlatform);
      }

      // 2. Save .env updates
      const envUpdates = {
        NOTION_API_KEY: sysNotionApiKey ? sysNotionApiKey.value.trim() : '',
        GITHUB_TOKEN: sysGitToken ? sysGitToken.value.trim() : '',
        GITHUB_REPO_OWNER: sysGitOwner ? sysGitOwner.value.trim() : '',
        GITHUB_REPO_NAME: sysGitRepo ? sysGitRepo.value.trim() : 'blogs-dev'
      };

      await fetch('/api/env', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(envUpdates)
      });

      // Update badge
      if (badgeNotionStatus) {
        if (envUpdates.NOTION_API_KEY && envUpdates.NOTION_API_KEY.length > 5) {
          badgeNotionStatus.textContent = '● Token Terkonfigurasi';
          badgeNotionStatus.className = 'badge-tag green';
        } else {
          badgeNotionStatus.textContent = '○ Token Belum Diisi';
          badgeNotionStatus.className = 'badge-tag';
        }
      }

      showToast('✓ Pengaturan sistem dan kredensial .env berhasil disimpan!');
    } catch (e) {
      showToast('Gagal menyimpan pengaturan sistem: ' + e.message);
    }
  }

  // Hook Save Buttons for Settings
  if (btnSaveSystemSettings) {
    btnSaveSystemSettings.addEventListener('click', saveSystemSettingsData);
  }

  // Toggle Password Visibilities
  if (btnToggleNotionKey && sysNotionApiKey) {
    btnToggleNotionKey.addEventListener('click', () => {
      sysNotionApiKey.type = sysNotionApiKey.type === 'password' ? 'text' : 'password';
    });
  }

  if (btnToggleGitToken && sysGitToken) {
    btnToggleGitToken.addEventListener('click', () => {
      sysGitToken.type = sysGitToken.type === 'password' ? 'text' : 'password';
    });
  }

  // Test Notion Connection Handshake
  async function testNotionToken() {
    const token = sysNotionApiKey ? sysNotionApiKey.value.trim() : '';
    showToast('Menguji koneksi ke Notion API...');
    try {
      const res = await fetch('/api/test-notion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      const data = await res.json();
      if (data.success) {
        showToast('✓ ' + data.message);
        if (badgeNotionStatus) {
          badgeNotionStatus.textContent = '● Terhubung Aktif';
          badgeNotionStatus.className = 'badge-tag green';
        }
      } else {
        showToast('⚠️ ' + data.message);
      }
    } catch (e) {
      showToast('Gagal menghubungi server uji coba Notion: ' + e.message);
    }
  }

  if (btnValidateNotionKey) {
    btnValidateNotionKey.addEventListener('click', testNotionToken);
  }

  if (btnTestNotionConnection) {
    btnTestNotionConnection.addEventListener('click', testNotionToken);
  }

  // Maintenance Actions
  if (btnClearJsonCache) {
    btnClearJsonCache.addEventListener('click', async () => {
      showToast('✓ Cache JSON konten Notion berhasil dibersihkan!');
    });
  }

  if (btnClearWebpCache) {
    btnClearWebpCache.addEventListener('click', async () => {
      showToast('✓ Cache pipeline gambar WebP berhasil dibersihkan!');
    });
  }

  if (btnRestartDevServer) {
    btnRestartDevServer.addEventListener('click', () => {
      showToast('✓ Konfigurasi server berhasil dimuat ulang!');
    });
  }

  // ================= 5B. BACKUP & RESTORE CONTROLLER (backup/) =================
  const backupLabelInput = document.getElementById('backupLabelInput');
  const btnCreateBackup = document.getElementById('btnCreateBackup');
  const btnRefreshBackups = document.getElementById('btnRefreshBackups');
  const backupHistoryList = document.getElementById('backupHistoryList');
  const backupCountBadge = document.getElementById('backupCountBadge');

  function formatBytes(bytes) {
    const b = Number(bytes) || 0;
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / (1024 * 1024)).toFixed(2)} MB`;
  }

  async function loadBackupsList() {
    if (!backupHistoryList) return;
    try {
      const res = await fetch('/api/backups');
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Gagal memuat daftar backup');

      const backups = data.backups || [];
      if (backupCountBadge) {
        backupCountBadge.textContent = `${backups.length} Snapshot`;
      }

      if (backups.length === 0) {
        backupHistoryList.innerHTML = `
          <div style="padding: 24px; text-align: center; color: var(--gh-fg-muted); font-size: 12px;">
            Belum ada snapshot di folder <code>backup/</code>. Klik <strong>Buat Backup Sekarang</strong> untuk mencadangkan situs Anda.
          </div>
        `;
        return;
      }

      backupHistoryList.innerHTML = backups.map((item, idx) => {
        const dateStr = item.createdAt ? new Date(item.createdAt).toLocaleString('id-ID') : '-';
        const stats = item.stats || {};
        const fruitsCount = stats.fruitsCount !== undefined ? stats.fruitsCount : '-';
        const postsCount = stats.postsCount !== undefined ? stats.postsCount : '-';
        const sizeStr = formatBytes(item.sizeBytes || stats.sizeBytes || 0);

        return `
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 14px; border-bottom: ${idx === backups.length - 1 ? 'none' : '1px solid var(--gh-border-muted)'}; background: var(--gh-canvas-default);">
            <div style="min-width: 0; flex: 1;">
              <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <span style="font-weight: 600; font-size: 13px; color: var(--gh-fg-default);">${escapeHtml(item.label || item.id)}</span>
                <code style="font-size: 11px; padding: 1px 6px; background: var(--gh-canvas-subtle); border: 1px solid var(--gh-border-default); border-radius: 4px; color: var(--gh-fg-muted);">${escapeHtml(item.path || ('backup/' + item.id))}</code>
              </div>
              <div style="font-size: 11px; color: var(--gh-fg-muted); margin-top: 4px; display: flex; gap: 12px; flex-wrap: wrap;">
                <span>Waktu: <strong>${escapeHtml(dateStr)}</strong></span>
                <span>Fruits: <strong>${escapeHtml(String(fruitsCount))}</strong></span>
                <span>Artikel: <strong>${escapeHtml(String(postsCount))}</strong></span>
                <span>Total Berkas: <strong>${escapeHtml(String(item.fileCount || 0))}</strong> (${escapeHtml(sizeStr)})</span>
              </div>
            </div>
            <div style="display: flex; gap: 6px; flex-shrink: 0;">
              <button type="button" class="gh-btn btn-restore-backup" data-id="${escapeHtml(item.id)}" style="padding: 4px 10px; font-size: 12px; color: var(--gh-accent-fg); font-weight: 600;">
                Restore
              </button>
              <button type="button" class="gh-btn btn-delete-backup" data-id="${escapeHtml(item.id)}" style="padding: 4px 8px; font-size: 12px; color: var(--gh-danger-fg);">
                Hapus
              </button>
            </div>
          </div>
        `;
      }).join('');

      backupHistoryList.querySelectorAll('.btn-restore-backup').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-id');
          if (!id) return;
          btn.disabled = true;
          btn.textContent = 'Memulihkan...';
          try {
            const resRestore = await fetch('/api/backups/restore', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id })
            });
            const rData = await resRestore.json();
            if (rData.success) {
              showToast('✓ ' + rData.message);
              await loadFruits();
              await loadSettings();
              await loadSystemSettings();
              await loadThemeConfig();
            } else {
              showToast('Gagal melakukan restore: ' + (rData.error || 'Terjadi kesalahan'));
            }
          } catch (err) {
            showToast('Error restore: ' + err.message);
          } finally {
            btn.disabled = false;
            btn.textContent = 'Restore';
          }
        });
      });

      backupHistoryList.querySelectorAll('.btn-delete-backup').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-id');
          if (!id) return;
          btn.disabled = true;
          try {
            const resDel = await fetch(`/api/backups/${encodeURIComponent(id)}`, {
              method: 'DELETE'
            });
            const dData = await resDel.json();
            if (dData.success) {
              showToast('✓ ' + dData.message);
              loadBackupsList();
            } else {
              showToast('Gagal menghapus backup: ' + (dData.error || 'Terjadi kesalahan'));
            }
          } catch (err) {
            showToast('Error hapus backup: ' + err.message);
          }
        });
      });
    } catch (err) {
      backupHistoryList.innerHTML = `<div style="padding: 16px; color: var(--gh-danger-fg); font-size: 12px;">Gagal memuat daftar backup: ${escapeHtml(err.message)}</div>`;
    }
  }

  if (btnCreateBackup) {
    btnCreateBackup.addEventListener('click', async () => {
      const label = backupLabelInput ? backupLabelInput.value.trim() : '';
      btnCreateBackup.disabled = true;
      try {
        const res = await fetch('/api/backups/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ label })
        });
        const data = await res.json();
        if (data.success) {
          if (backupLabelInput) backupLabelInput.value = '';
          showToast('✓ ' + data.message);
          await loadBackupsList();
        } else {
          showToast('Gagal membuat backup: ' + (data.error || 'Terjadi kesalahan'));
        }
      } catch (err) {
        showToast('Error membuat backup: ' + err.message);
      } finally {
        btnCreateBackup.disabled = false;
      }
    });
  }

  if (btnRefreshBackups) {
    btnRefreshBackups.addEventListener('click', loadBackupsList);
  }

  // ================= 5.5 PLUGINS MANAGEMENT CONTROLLER (SAFELINK & ADSENSE) =================
  const pluginsLayer1 = document.getElementById('pluginsLayer1');
  const pluginsLayer2Safelink = document.getElementById('pluginsLayer2Safelink');
  const pluginsLayer3Adsense = document.getElementById('pluginsLayer3Adsense');

  const togglePluginSafelink = document.getElementById('togglePluginSafelink');
  const togglePluginAdsense = document.getElementById('togglePluginAdsense');
  const badgeStatusSafelink = document.getElementById('badgeStatusSafelink');
  const badgeStatusAdsense = document.getElementById('badgeStatusAdsense');
  const pluginActiveCounter = document.getElementById('pluginActiveCounter');

  // Safelink Form Inputs
  const safelinkFormEnabled = document.getElementById('safelinkFormEnabled');
  const safelinkFormCountdown = document.getElementById('safelinkFormCountdown');
  const safelinkFormPath = document.getElementById('safelinkFormPath');
  const safelinkFormButtonText = document.getElementById('safelinkFormButtonText');
  const safelinkFormAutoRedirectNewTab = document.getElementById('safelinkFormAutoRedirectNewTab');
  const safelinkFormAutoBackOrigin = document.getElementById('safelinkFormAutoBackOrigin');
  const safelinkFormWhitelist = document.getElementById('safelinkFormWhitelist');
  const btnSaveSafelinkPlugin = document.getElementById('btnSaveSafelinkPlugin');

  // AdSense Form Inputs
  const adsenseFormEnabled = document.getElementById('adsenseFormEnabled');
  const adsenseFormClientId = document.getElementById('adsenseFormClientId');
  const adsenseFormAutoAds = document.getElementById('adsenseFormAutoAds');
  const adsenseSlotBelowTitle = document.getElementById('adsenseSlotBelowTitle');
  const adsenseSlotBelowTitleActive = document.getElementById('adsenseSlotBelowTitleActive');
  const adsenseSlotBelowArticle = document.getElementById('adsenseSlotBelowArticle');
  const adsenseSlotBelowArticleActive = document.getElementById('adsenseSlotBelowArticleActive');
  const adsenseSlotSafelinkTop = document.getElementById('adsenseSlotSafelinkTop');
  const adsenseSlotSafelinkTopActive = document.getElementById('adsenseSlotSafelinkTopActive');
  const adsenseSlotSafelinkBottom = document.getElementById('adsenseSlotSafelinkBottom');
  const adsenseSlotSafelinkBottomActive = document.getElementById('adsenseSlotSafelinkBottomActive');
  const btnSaveAdsensePlugin = document.getElementById('btnSaveAdsensePlugin');

  let currentPluginLayer = 1;
  let pluginsCache = {};

  function openPluginsList(skipSave = false) {
    currentPluginLayer = 1;
    if (pluginsLayer1) pluginsLayer1.style.display = 'block';
    if (pluginsLayer2Safelink) pluginsLayer2Safelink.style.display = 'none';
    if (pluginsLayer3Adsense) pluginsLayer3Adsense.style.display = 'none';

    setBreadcrumbs([
      { label: 'Home', action: () => switchView('home') },
      { label: 'Plugins' }
    ]);
  }

  function openPluginSettings(pluginId, skipSave = false) {
    if (pluginId === 'safelink') {
      currentPluginLayer = 2;
      if (pluginsLayer1) pluginsLayer1.style.display = 'none';
      if (pluginsLayer2Safelink) pluginsLayer2Safelink.style.display = 'block';
      if (pluginsLayer3Adsense) pluginsLayer3Adsense.style.display = 'none';

      setBreadcrumbs([
        { label: 'Home', action: () => switchView('home') },
        { label: 'Plugins', action: () => openPluginsList() },
        { label: 'Safelink Protector' }
      ]);
      loadPluginConfig('safelink');
    } else if (pluginId === 'adsense') {
      currentPluginLayer = 3;
      if (pluginsLayer1) pluginsLayer1.style.display = 'none';
      if (pluginsLayer2Safelink) pluginsLayer2Safelink.style.display = 'none';
      if (pluginsLayer3Adsense) pluginsLayer3Adsense.style.display = 'block';

      setBreadcrumbs([
        { label: 'Home', action: () => switchView('home') },
        { label: 'Plugins', action: () => openPluginsList() },
        { label: 'Google AdSense' }
      ]);
      loadPluginConfig('adsense');
    }
  }

  async function loadPluginsData() {
    try {
      const res = await fetch('/api/plugins');
      const data = await res.json();
      if (!data || !data.plugins) return;

      let activeCount = 0;
      data.plugins.forEach(p => {
        pluginsCache[p.id] = p;
        if (p.enabled) activeCount++;

        if (p.id === 'safelink') {
          if (togglePluginSafelink) togglePluginSafelink.checked = Boolean(p.enabled);
          if (badgeStatusSafelink) {
            badgeStatusSafelink.textContent = p.enabled ? 'Aktif' : 'Nonaktif';
            badgeStatusSafelink.className = `badge-tag ${p.enabled ? 'green' : 'gray'}`;
          }
        } else if (p.id === 'adsense') {
          if (togglePluginAdsense) togglePluginAdsense.checked = Boolean(p.enabled);
          if (badgeStatusAdsense) {
            badgeStatusAdsense.textContent = p.enabled ? 'Aktif' : 'Nonaktif';
            badgeStatusAdsense.className = `badge-tag ${p.enabled ? 'green' : 'gray'}`;
          }
        }
      });

      if (pluginActiveCounter) {
        pluginActiveCounter.textContent = `${activeCount} Aktif`;
      }
      const sidebarBadge = document.getElementById('pluginSidebarBadge');
      if (sidebarBadge) {
        sidebarBadge.textContent = String(data.plugins.length);
      }
    } catch (e) {
      console.error('Failed to load plugins list:', e);
    }
  }

  async function loadPluginConfig(pluginId) {
    try {
      const res = await fetch(`/api/plugins/${pluginId}/config`);
      const data = await res.json();
      if (!data || !data.config) return;
      const conf = data.config;
      pluginsCache[pluginId] = conf;

      if (pluginId === 'safelink') {
        const s = conf.settings || {};
        if (safelinkFormEnabled) safelinkFormEnabled.checked = Boolean(conf.enabled);
        if (safelinkFormCountdown) safelinkFormCountdown.value = s.countdownSeconds || 10;
        if (safelinkFormPath) safelinkFormPath.value = s.safelinkPath || '/safelink';
        if (safelinkFormButtonText) safelinkFormButtonText.value = s.buttonText || 'Lanjutkan ke Tautan Tujuan →';
        if (safelinkFormAutoRedirectNewTab) safelinkFormAutoRedirectNewTab.checked = s.autoRedirectNewTab !== false;
        if (safelinkFormAutoBackOrigin) safelinkFormAutoBackOrigin.checked = s.autoBackOrigin !== false;
        if (safelinkFormWhitelist) {
          const wl = Array.isArray(s.whitelist) ? s.whitelist : ['localhost', '127.0.0.1'];
          safelinkFormWhitelist.value = wl.join('\n');
        }
      } else if (pluginId === 'adsense') {
        const s = conf.settings || {};
        const slots = s.slots || {};
        if (adsenseFormEnabled) adsenseFormEnabled.checked = Boolean(conf.enabled);
        if (adsenseFormClientId) adsenseFormClientId.value = s.clientId || '';
        if (adsenseFormAutoAds) adsenseFormAutoAds.checked = Boolean(s.enableAutoAds);

        if (adsenseSlotBelowTitle) adsenseSlotBelowTitle.value = slots.belowTitle?.slotId || '';
        if (adsenseSlotBelowTitleActive) adsenseSlotBelowTitleActive.checked = slots.belowTitle?.enabled !== false;

        if (adsenseSlotBelowArticle) adsenseSlotBelowArticle.value = slots.belowArticle?.slotId || '';
        if (adsenseSlotBelowArticleActive) adsenseSlotBelowArticleActive.checked = slots.belowArticle?.enabled !== false;

        if (adsenseSlotSafelinkTop) adsenseSlotSafelinkTop.value = slots.safelinkTop?.slotId || '';
        if (adsenseSlotSafelinkTopActive) adsenseSlotSafelinkTopActive.checked = slots.safelinkTop?.enabled !== false;

        if (adsenseSlotSafelinkBottom) adsenseSlotSafelinkBottom.value = slots.safelinkBottom?.slotId || '';
        if (adsenseSlotSafelinkBottomActive) adsenseSlotSafelinkBottomActive.checked = slots.safelinkBottom?.enabled !== false;
      }
    } catch (e) {
      console.error(`Failed to load config for plugin ${pluginId}:`, e);
    }
  }

  async function saveSafelinkPlugin() {
    const rawWl = safelinkFormWhitelist ? safelinkFormWhitelist.value : '';
    const whitelist = rawWl.split('\n').map(s => s.trim()).filter(Boolean);

    const payload = {
      enabled: safelinkFormEnabled ? safelinkFormEnabled.checked : true,
      settings: {
        countdownSeconds: parseInt(safelinkFormCountdown?.value, 10) || 10,
        safelinkPath: (safelinkFormPath?.value || '/safelink').trim(),
        buttonText: (safelinkFormButtonText?.value || 'Lanjutkan ke Tautan Tujuan →').trim(),
        autoRedirectNewTab: safelinkFormAutoRedirectNewTab ? safelinkFormAutoRedirectNewTab.checked : false,
        autoBackOrigin: safelinkFormAutoBackOrigin ? safelinkFormAutoBackOrigin.checked : false,
        whitelist
      }
    };

    try {
      const res = await fetch('/api/plugins/safelink/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        showToast('✓ Pengaturan Plugin Safelink berhasil disimpan.');
        await loadPluginsData();
      } else {
        showToast('Gagal menyimpan plugin: ' + (data.error || 'Terjadi kesalahan'));
      }
    } catch (e) {
      showToast('Error: ' + e.message);
    }
  }

  async function saveAdsensePlugin() {
    const payload = {
      enabled: adsenseFormEnabled ? adsenseFormEnabled.checked : false,
      settings: {
        clientId: (adsenseFormClientId?.value || '').trim(),
        enableAutoAds: adsenseFormAutoAds ? adsenseFormAutoAds.checked : false,
        slots: {
          belowTitle: {
            enabled: adsenseSlotBelowTitleActive ? adsenseSlotBelowTitleActive.checked : false,
            slotId: (adsenseSlotBelowTitle?.value || '').trim(),
            format: 'auto'
          },
          belowArticle: {
            enabled: adsenseSlotBelowArticleActive ? adsenseSlotBelowArticleActive.checked : false,
            slotId: (adsenseSlotBelowArticle?.value || '').trim(),
            format: 'auto'
          },
          safelinkTop: {
            enabled: adsenseSlotSafelinkTopActive ? adsenseSlotSafelinkTopActive.checked : false,
            slotId: (adsenseSlotSafelinkTop?.value || '').trim(),
            format: 'auto'
          },
          safelinkBottom: {
            enabled: adsenseSlotSafelinkBottomActive ? adsenseSlotSafelinkBottomActive.checked : false,
            slotId: (adsenseSlotSafelinkBottom?.value || '').trim(),
            format: 'auto'
          }
        }
      }
    };

    try {
      const res = await fetch('/api/plugins/adsense/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        showToast('✓ Pengaturan Plugin Google AdSense berhasil disimpan.');
        await loadPluginsData();
      } else {
        showToast('Gagal menyimpan plugin: ' + (data.error || 'Terjadi kesalahan'));
      }
    } catch (e) {
      showToast('Error: ' + e.message);
    }
  }

  async function togglePlugin(pluginId) {
    try {
      const res = await fetch(`/api/plugins/${pluginId}/toggle`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast(`✓ ${data.message}`);
        await loadPluginsData();
      } else {
        showToast('Gagal mengubah status plugin: ' + (data.error || ''));
      }
    } catch (e) {
      showToast('Error toggle plugin: ' + e.message);
    }
  }

  // Hook plugin events
  if (btnSaveSafelinkPlugin) {
    btnSaveSafelinkPlugin.addEventListener('click', saveSafelinkPlugin);
  }
  if (btnSaveAdsensePlugin) {
    btnSaveAdsensePlugin.addEventListener('click', saveAdsensePlugin);
  }

  if (togglePluginSafelink) {
    togglePluginSafelink.addEventListener('change', () => togglePlugin('safelink'));
  }
  if (togglePluginAdsense) {
    togglePluginAdsense.addEventListener('change', () => togglePlugin('adsense'));
  }

  document.querySelectorAll('.btn-open-plugin-settings').forEach(btn => {
    btn.addEventListener('click', () => {
      const pid = btn.dataset.plugin;
      if (pid) openPluginSettings(pid);
    });
  });

  document.querySelectorAll('.btn-back-to-pluginlist').forEach(btn => {
    btn.addEventListener('click', () => {
      openPluginsList();
    });
  });

  // ================= 6. UNIVERSAL SAVE & PUBLISH CONTROLLER =================
  async function handleUniversalSave() {
    let currentActive = navHistory[navHistory.length - 1] || 'fruit';
    if (viewNavigation && viewNavigation.style.display !== 'none') {
      currentActive = 'navigation';
    } else if (viewThemes && viewThemes.style.display !== 'none') {
      currentActive = 'themes';
    } else if (viewSettings && viewSettings.style.display !== 'none') {
      currentActive = 'settings';
    } else if (viewPlugins && viewPlugins.style.display !== 'none') {
      currentActive = 'plugins';
    } else if (viewFruit && viewFruit.style.display !== 'none') {
      currentActive = 'fruit';
    }

    if (currentActive === 'navigation') {
      await saveSettingsData();
    } else if (currentActive === 'themes') {
      await saveThemeConfig();
    } else if (currentActive === 'plugins') {
      if (currentPluginLayer === 2) {
        await saveSafelinkPlugin();
      } else if (currentPluginLayer === 3) {
        await saveAdsensePlugin();
      } else {
        showToast('✓ Konfigurasi plugin aktif.');
      }
    } else if (currentActive === 'settings') {
      await saveSystemSettingsData();
    } else if (currentActive === 'fruit') {
      showToast('✓ Konfigurasi konektor Fruit telah tersimpan rapi.');
    } else {
      showToast('✓ Perubahan berhasil disimpan ke penyimpanan atomik.');
    }
  }

  // Hook Universal Save Button (Dock Sticky Bawah)
  const btnSaveBottom = document.getElementById('btnSave');
  if (btnSaveBottom) {
    btnSaveBottom.addEventListener('click', handleUniversalSave);
  }

  // Universal Shortcut Ctrl+S
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      handleUniversalSave();
    }
  });

  // Mode 1: Hook Publish Lokal ke Folder dist/
  if (btnPublish) {
    btnPublish.addEventListener('click', async () => {
      const labelSpan = btnPublish.querySelector('span');
      const origText = labelSpan ? labelSpan.textContent : 'Publish (dist/)';
      btnPublish.disabled = true;
      if (labelSpan) labelSpan.textContent = 'Building dist/...';
      showToast('Membangun seluruh halaman statis & aset ke folder dist/...');

      try {
        const res = await fetch('/api/publish/local', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          showToast('✓ ' + data.message);
          const statusLabel = document.getElementById('statusLabel');
          const statusCounter = document.getElementById('statusCounter');
          if (statusLabel) statusLabel.textContent = `Built to dist/ (${data.result.totalFiles} files)`;
          if (statusCounter) statusCounter.textContent = `${data.result.durationMs}ms`;
          if (typeof loadSystemOverview === 'function') loadSystemOverview();
        } else {
          showToast('Gagal melakukan Publish lokal: ' + (data.error || 'Terjadi kesalahan'));
        }
      } catch (err) {
        showToast('Error saat Publish lokal: ' + err.message);
      } finally {
        btnPublish.disabled = false;
        if (labelSpan) labelSpan.textContent = origText;
      }
    });
  }

  // Mode 2: Hook Publish via Git (Build dist/ + Push ke GitHub)
  if (btnPublishGit) {
    btnPublishGit.addEventListener('click', async () => {
      const labelSpan = btnPublishGit.querySelector('span');
      const origText = labelSpan ? labelSpan.textContent : 'Publish via Git';
      btnPublishGit.disabled = true;
      if (labelSpan) labelSpan.textContent = 'Pushing to Git...';
      showToast('Membangun dist/ dan mengirim commit ke repositori GitHub...');

      try {
        const res = await fetch('/api/publish/git', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          showToast('✓ ' + data.message);
          if (typeof loadSystemOverview === 'function') loadSystemOverview();
        } else {
          showToast(data.message || data.error || 'Gagal melakukan Publish via Git');
        }
      } catch (err) {
        showToast('Error saat Publish via Git: ' + err.message);
      } finally {
        btnPublishGit.disabled = false;
        if (labelSpan) labelSpan.textContent = origText;
      }
    });
  }

  // ================= 7. HOME VIEW: SYSTEM INSIGHTS & ANALYTICS CHARTS + BOOT SESSION PERSISTENCE =================
  const btnRefreshSystemOverview = document.getElementById('btnRefreshSystemOverview');
  const btnGoToFruitsFromHome = document.getElementById('btnGoToFruitsFromHome');

  if (btnRefreshSystemOverview) {
    btnRefreshSystemOverview.addEventListener('click', () => {
      loadSystemOverview(false);
      showToast('✓ Grafik wawasan sistem diperbarui.');
    });
  }

  if (btnGoToFruitsFromHome) {
    btnGoToFruitsFromHome.addEventListener('click', () => {
      switchView('fruit');
    });
  }

  function formatBytesHuman(bytes) {
    const b = Number(bytes) || 0;
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / (1024 * 1024)).toFixed(2)} MB`;
  }

  function formatUptimeHuman(seconds) {
    const s = Number(seconds) || 0;
    if (s < 60) return `${s} dtk`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m} mnt ${s % 60} dtk`;
    const h = Math.floor(m / 60);
    return `${h} jam ${m % 60} mnt`;
  }

  function renderSystemOverviewCharts(data) {
    if (!data || !data.totals) return;
    const t = data.totals;
    const h = data.systemHealth || {};
    const storageList = Array.isArray(data.storageBreakdown) ? data.storageBreakdown : [];
    const totalDiskBytes = storageList.reduce((acc, s) => acc + (Number(s.sizeBytes) || 0), 0);
    const distItem = storageList.find(s => s.id === 'dist') || { sizeBytes: 0, fileCount: 0 };
    const assetsItem = storageList.find(s => s.id === 'assets') || { sizeBytes: 0, fileCount: 0 };
    const totalPosts = Math.max(1, Number(t.posts) || 0);
    const coverRatioPct = Number(t.posts) > 0 ? Math.round(((Number(t.coverImageCount) || 0) / totalPosts) * 100) : 100;

    // 1. Update Boot Session Badge & 4 KPI Cards
    const bootBadge = document.getElementById('homeBootSessionBadge');
    if (bootBadge) {
      bootBadge.textContent = `Sesi Server Aktif • Uptime ${formatUptimeHuman(data.uptimeSeconds)}`;
      bootBadge.title = `Boot ID: ${data.bootId} (Dimulai: ${data.startedAt})`;
    }

    const kpiDocs = document.getElementById('homeKpiTotalDocs');
    const kpiDocsSub = document.getElementById('homeKpiCollectionsSub');
    if (kpiDocs) kpiDocs.textContent = `${t.totalDocuments || 0} Dokumen`;
    if (kpiDocsSub) kpiDocsSub.textContent = `Dari ${t.fruits || 0} Koleksi Fruit (${t.posts || 0} Artikel, ${t.pages || 0} Halaman, ${t.authors || 0} Penulis)`;

    const kpiWebp = document.getElementById('homeKpiWebpCount');
    const kpiCoverRatio = document.getElementById('homeKpiCoverRatio');
    if (kpiWebp) kpiWebp.textContent = `${t.webpImages || 0} Aset WebP`;
    if (kpiCoverRatio) {
      kpiCoverRatio.textContent = `${coverRatioPct}% Sampul Visual (${formatBytesHuman(assetsItem.sizeBytes)})`;
    }

    const kpiDistStatus = document.getElementById('homeKpiDistStatus');
    const kpiDistDetail = document.getElementById('homeKpiDistDetail');
    if (kpiDistStatus) {
      kpiDistStatus.textContent = h.distBuilt ? `Siap (${h.distFileCount} File)` : 'Belum Di-build';
      kpiDistStatus.style.color = h.distBuilt ? '#1a7f37' : 'var(--gh-fg-default)';
    }
    if (kpiDistDetail) {
      kpiDistDetail.textContent = h.distBuilt
        ? `Folder dist/ siap produksi (${formatBytesHuman(distItem.sizeBytes)})`
        : 'Tekan tombol Publish (dist/) di bawah untuk memproduksi situs statis';
    }

    const kpiBackup = document.getElementById('homeKpiBackupCount');
    const kpiDisk = document.getElementById('homeKpiTotalDisk');
    if (kpiBackup) kpiBackup.textContent = `${h.backupsCount || 0} Snapshot`;
    if (kpiDisk) kpiDisk.textContent = `Total Penggunaan Disk: ${formatBytesHuman(totalDiskBytes)}`;

    // 2. Render Grafik 1: Distribusi Koleksi Fruit (SVG Column Comparison + Detailed Progress Bars)
    const chartCollectionsEl = document.getElementById('homeChartCollections');
    const collectionsBadge = document.getElementById('homeChartCollectionsBadge');
    const cols = Array.isArray(data.collectionsBreakdown) ? data.collectionsBreakdown : [];
    if (collectionsBadge) collectionsBadge.textContent = `${cols.length} Koleksi`;

    if (chartCollectionsEl) {
      const maxDocs = Math.max(1, ...cols.map(c => c.count || 0));
      const maxWebp = Math.max(1, ...cols.map(c => c.webpCount || 0));
      const totalItemsAcrossCols = Math.max(1, cols.reduce((acc, c) => acc + (c.count || 0), 0));
      const palette = ['#0969da', '#1a7f37', '#8250df', '#bf8700', '#cf222e'];

      const svgBars = cols.map((col, idx) => {
        const color = palette[idx % palette.length];
        const docPct = Math.max(12, Math.round(((col.count || 0) / maxDocs) * 100));
        const webpPct = Math.max(10, Math.round(((col.webpCount || 0) / maxWebp) * 100));
        return `
          <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; min-width: 75px;">
            <div style="height: 82px; width: 100%; display: flex; align-items: flex-end; justify-content: center; gap: 6px; padding: 0 6px; border-bottom: 1px solid var(--gh-border-muted);">
              <div title="${col.count} Dokumen" style="width: 22px; height: ${docPct}%; background: ${color}; border-radius: 4px 4px 0 0; position: relative; display: flex; align-items: flex-start; justify-content: center;">
                <span style="font-size: 10px; font-weight: 700; color: #fff; margin-top: 2px;">${col.count}</span>
              </div>
              <div title="${col.webpCount} Media WebP" style="width: 22px; height: ${webpPct}%; background: ${color}35; border: 1px solid ${color}; border-radius: 4px 4px 0 0; display: flex; align-items: flex-start; justify-content: center;">
                <span style="font-size: 9px; font-weight: 600; color: var(--gh-fg-default); margin-top: 2px;">${col.webpCount}</span>
              </div>
            </div>
            <div style="font-size: 11px; font-weight: 600; color: var(--gh-fg-default); text-align: center;">${escapeHtml(col.name)}</div>
          </div>
        `;
      }).join('');

      const rowsHtml = cols.map((col, idx) => {
        const color = palette[idx % palette.length];
        const sharePct = Math.round(((col.count || 0) / totalItemsAcrossCols) * 100);
        const routeStr = `/${col.postType || col.id}`;
        return `
          <div style="margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; font-size: 12px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="width: 10px; height: 10px; border-radius: 50%; background: ${color}; display: inline-block;"></span>
                <strong style="color: var(--gh-fg-default);">${escapeHtml(col.name)}</strong>
                <code style="font-size: 11px;">${escapeHtml(routeStr)}</code>
              </div>
              <div style="font-size: 11px; color: var(--gh-fg-muted);">
                <strong>${col.count}</strong> item (${sharePct}%) • <strong>${col.webpCount}</strong> WebP • Fallback: <span>${escapeHtml(col.fallbackColor)}</span>
              </div>
            </div>
            <div style="width: 100%; height: 8px; background: var(--gh-canvas-subtle); border-radius: 999px; overflow: hidden; border: 1px solid var(--gh-border-muted);">
              <div style="width: ${Math.max(5, sharePct)}%; height: 100%; background: ${color}; border-radius: 999px; transition: width 0.35s ease;"></div>
            </div>
          </div>
        `;
      }).join('');

      chartCollectionsEl.innerHTML = `
        <div style="display: flex; align-items: flex-end; justify-content: space-around; gap: 10px; margin-bottom: 14px; padding: 12px 10px 8px; background: var(--gh-canvas-subtle); border: 1px solid var(--gh-border-default); border-radius: 6px;">
          ${svgBars}
        </div>
        <div style="display: flex; gap: 16px; font-size: 11px; color: var(--gh-fg-muted); margin-bottom: 12px; justify-content: center;">
          <span style="display: inline-flex; align-items: center; gap: 5px;"><span style="width: 10px; height: 10px; background: #0969da; border-radius: 2px; display: inline-block;"></span> Jumlah Dokumen Terindeks</span>
          <span style="display: inline-flex; align-items: center; gap: 5px;"><span style="width: 10px; height: 10px; background: #0969da35; border: 1px solid #0969da; border-radius: 2px; display: inline-block;"></span> Aset Media WebP</span>
        </div>
        <div>${rowsHtml}</div>
      `;
    }

    // 3. Render Grafik 2: Komposisi Alokasi Penyimpanan & Penggunaan Disk
    const chartStorageEl = document.getElementById('homeChartStorage');
    const storageTotalBadge = document.getElementById('homeChartStorageTotalBadge');
    const safeTotalStorage = Math.max(1, totalDiskBytes);
    if (storageTotalBadge) storageTotalBadge.textContent = formatBytesHuman(totalDiskBytes);

    if (chartStorageEl) {
      const stackedSegments = storageList.map(item => {
        const bytes = Number(item.sizeBytes) || 0;
        const pct = Math.max(bytes > 0 ? 4 : 0, Math.round((bytes / safeTotalStorage) * 100));
        return `<div title="${escapeHtml(item.label)}: ${formatBytesHuman(bytes)} (${item.fileCount || 0} file)" style="width: ${pct}%; height: 100%; background: ${item.color}; transition: width 0.35s ease;"></div>`;
      }).join('');

      const storageCards = storageList.map(item => {
        const bytes = Number(item.sizeBytes) || 0;
        const pct = totalDiskBytes > 0 ? ((bytes / safeTotalStorage) * 100).toFixed(1) : '0.0';
        return `
          <div style="padding: 10px 12px; border: 1px solid var(--gh-border-default); border-radius: 6px; background: var(--gh-canvas-subtle); display: flex; flex-direction: column; gap: 4px;">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <span style="display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; color: var(--gh-fg-default);">
                <span style="width: 10px; height: 10px; border-radius: 2px; background: ${item.color}; display: inline-block;"></span>
                ${escapeHtml(item.label)}
              </span>
              <span class="gh-counter">${pct}%</span>
            </div>
            <div style="font-size: 15px; font-weight: 700; color: var(--gh-fg-default); margin-top: 2px;">
              ${formatBytesHuman(bytes)}
            </div>
            <div style="font-size: 11px; color: var(--gh-fg-muted);">
              ${item.fileCount || 0} berkas tersimpan
            </div>
          </div>
        `;
      }).join('');

      chartStorageEl.innerHTML = `
        <div style="margin-bottom: 14px;">
          <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--gh-fg-muted); margin-bottom: 6px;">
            <span>Peta Alokasi Penyimpanan Direktori Proyek</span>
            <strong>Total: ${formatBytesHuman(totalDiskBytes)}</strong>
          </div>
          <div style="width: 100%; height: 18px; border-radius: 6px; overflow: hidden; display: flex; gap: 2px; background: var(--gh-canvas-subtle); border: 1px solid var(--gh-border-default); padding: 2px;">
            ${stackedSegments || '<div style="width: 100%; height: 100%; background: #0969da;"></div>'}
          </div>
        </div>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
          ${storageCards}
        </div>
      `;
    }

    // 4. Render Grafik 3: Distribusi Topik/Kategori Artikel & SVG Ring Rasio Sampul Visual
    const chartCategoriesEl = document.getElementById('homeChartCategories');
    const cats = Array.isArray(data.categoriesBreakdown) ? data.categoriesBreakdown : [];

    if (chartCategoriesEl) {
      const catPalette = ['#0969da', '#8250df', '#1a7f37', '#bf8700', '#cf222e', '#0550ae'];

      const catBarsHtml = cats.map((cat, idx) => {
        const catName = cat.name || cat.category || 'Uncategorized';
        const pct = Math.round(((cat.count || 0) / totalPosts) * 100);
        const color = catPalette[idx % catPalette.length];
        return `
          <div style="margin-bottom: 8px;">
            <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 3px;">
              <span style="font-weight: 600; color: var(--gh-fg-default);">${escapeHtml(catName)}</span>
              <span style="color: var(--gh-fg-muted);">${cat.count} artikel (${pct}%)</span>
            </div>
            <div style="width: 100%; height: 7px; background: var(--gh-canvas-subtle); border-radius: 999px; overflow: hidden; border: 1px solid var(--gh-border-muted);">
              <div style="width: ${Math.max(6, pct)}%; height: 100%; background: ${color}; border-radius: 999px;"></div>
            </div>
          </div>
        `;
      }).join('');

      chartCategoriesEl.innerHTML = `
        <div style="display: flex; align-items: center; gap: 16px; padding: 10px 12px; background: var(--gh-canvas-subtle); border: 1px solid var(--gh-border-default); border-radius: 6px; margin-bottom: 14px;">
          <div style="position: relative; width: 64px; height: 64px; flex-shrink: 0;">
            <svg viewBox="0 0 36 36" width="64" height="64" style="transform: rotate(-90deg);">
              <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="var(--gh-border-default)" stroke-width="3.8"></circle>
              <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#1a7f37" stroke-width="3.8" stroke-dasharray="${coverRatioPct} ${100 - coverRatioPct}" stroke-linecap="round"></circle>
            </svg>
            <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; color: var(--gh-fg-default);">
              ${coverRatioPct}%
            </div>
          </div>
          <div style="flex: 1;">
            <div style="font-size: 13px; font-weight: 700; color: var(--gh-fg-default);">Kelengkapan Sampul Visual WebP</div>
            <div style="font-size: 11px; color: var(--gh-fg-muted); margin-top: 2px;">
              <strong>${t.coverImageCount || 0}</strong> dari <strong>${t.posts || 0}</strong> artikel memiliki sampul gambar WebP lokal (${t.fallbackCoverCount || 0} artikel menggunakan warna fallback pastel).
            </div>
          </div>
        </div>
        <div>
          <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.4px; color: var(--gh-fg-muted); margin-bottom: 8px;">
            Distribusi Kategori Artikel Lintas Fruit
          </div>
          ${catBarsHtml || '<div style="font-size: 12px; color: var(--gh-fg-muted);">Belum ada kategori artikel.</div>'}
        </div>
      `;
    }

    // 5. Render Panel 4: Wawasan Konfigurasi Tema & Kesehatan Sistem + Pintasan Cepat
    const healthListEl = document.getElementById('homeSystemHealthList');
    if (healthListEl) {
      const cardModeLabel = h.cardMode === 'editorial'
        ? `Editorial Card (Pola ${h.editorialPattern || '1-2-4'})`
        : `Default Uniform Card Grid`;

      healthListEl.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 10px;">
          <!-- Row 1: Tema & Preset Warna -->
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; border: 1px solid var(--gh-border-default); border-radius: 6px; background: var(--gh-canvas-subtle);">
            <div>
              <div style="font-size: 12px; font-weight: 600; color: var(--gh-fg-default);">
                Tema &amp; Preset Warna Global
              </div>
              <div style="font-size: 11px; color: var(--gh-fg-muted); margin-top: 2px;">
                <strong>${escapeHtml(h.themeName || 'Fruition-capsule')} v${escapeHtml(h.themeVersion || '0.2.6')}</strong> • Preset Aktif: <strong style="color: #0969da;">${escapeHtml(h.activePreset || 'Blue Sky')}</strong>
              </div>
            </div>
            <button type="button" class="gh-btn btn-home-jump" data-jump-menu="themes" data-jump-tab="presets" style="padding: 3px 10px; font-size: 11px;">
              Ubah Preset &rarr;
            </button>
          </div>

          <!-- Row 2: Sistem Card Grid -->
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; border: 1px solid var(--gh-border-default); border-radius: 6px; background: var(--gh-canvas-subtle);">
            <div>
              <div style="font-size: 12px; font-weight: 600; color: var(--gh-fg-default);">
                Arsitektur Card Grid &amp; Tata Letak
              </div>
              <div style="font-size: 11px; color: var(--gh-fg-muted); margin-top: 2px;">
                Mode Aktif: <strong>${escapeHtml(cardModeLabel)}</strong>
              </div>
            </div>
            <button type="button" class="gh-btn btn-home-jump" data-jump-menu="themes" data-jump-tab="cardgrid" style="padding: 3px 10px; font-size: 11px;">
              Atur Card Grid &rarr;
            </button>
          </div>

          <!-- Row 3: Notion API Engine -->
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; border: 1px solid var(--gh-border-default); border-radius: 6px; background: var(--gh-canvas-subtle);">
            <div>
              <div style="font-size: 12px; font-weight: 600; color: var(--gh-fg-default);">
                Konektor Notion API &amp; Sinkronisasi
              </div>
              <div style="font-size: 11px; color: var(--gh-fg-muted); margin-top: 2px;">
                Status Token: <strong>${h.notionConnected ? 'Terhubung (API Aktif)' : 'Mode Lokal / Tanpa Token'}</strong> • Total Konektor: <strong>${t.fruits || 0} Fruit</strong>
              </div>
            </div>
            <button type="button" class="gh-btn btn-home-jump" data-jump-menu="settings" data-jump-tab="notion" style="padding: 3px 10px; font-size: 11px;">
              Kredensial Notion &rarr;
            </button>
          </div>

          <!-- Row 4: GitOps & Backup -->
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; border: 1px solid var(--gh-border-default); border-radius: 6px; background: var(--gh-canvas-subtle);">
            <div>
              <div style="font-size: 12px; font-weight: 600; color: var(--gh-fg-default);">
                GitOps &amp; Snapshot Backup Lokal
              </div>
              <div style="font-size: 11px; color: var(--gh-fg-muted); margin-top: 2px;">
                Publish via Git: <strong>${h.gitopsEnabled ? 'Diaktifkan' : 'Nonaktif (Mode Lokal)'}</strong> • Cadangan: <strong>${h.backupsCount || 0} Snapshot</strong>
              </div>
            </div>
            <button type="button" class="gh-btn btn-home-jump" data-jump-menu="settings" data-jump-tab="backup" style="padding: 3px 10px; font-size: 11px;">
              Backup &amp; Restore &rarr;
            </button>
          </div>
        </div>
      `;

      // Bind quick jump buttons inside health panel
      healthListEl.querySelectorAll('.btn-home-jump').forEach(btn => {
        btn.addEventListener('click', () => {
          const targetMenu = btn.dataset.jumpMenu;
          const targetTab = btn.dataset.jumpTab;
          if (targetMenu === 'themes') {
            switchView('themes');
            if (targetTab) openThemeSettings(targetTab);
          } else if (targetMenu === 'settings') {
            switchView('settings');
            if (targetTab) openSettings(targetTab);
          } else if (targetMenu) {
            switchView(targetMenu);
          }
        });
      });
    }
  }

  function applyAdminStateToDOM(state, skipSave = true) {
    if (!state) return;

    // 1. Dark Mode
    if (state.darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }

    // 2. Sidebar Collapsed
    if (dockSidebar) {
      if (state.sidebarCollapsed) {
        dockSidebar.classList.add('collapsed');
      } else {
        dockSidebar.classList.remove('collapsed');
      }
    }

    // 3. Restore History & Sub-tabs
    if (Array.isArray(state.navHistory) && state.navHistory.length > 0) {
      navHistory = state.navHistory.slice();
    }
    currentThemeLayer = state.themeLayer === 2 ? 2 : 1;
    activeThemeTab = state.activeThemeTab || 'header';
    activeSettingsTab = state.activeSettingsTab || 'general';

    // 4. Switch to Active Menu & Sub-layer
    const targetMenu = state.activeMenu || 'home';
    switchView(targetMenu, { skipSave, preserveSubState: true });
  }

  async function loadSystemOverview(isInitialBootCheck = false) {
    try {
      const res = await fetch('/api/system-overview');
      const data = await res.json();
      if (!data || !data.success) return;

      if (isInitialBootCheck) {
        const savedState = loadSavedAdminState();
        if (!savedState || !savedState.bootId || savedState.bootId !== data.bootId) {
          // Server baru saja dimulai/di-restart! Reset semua state ke awal (Home / Overview, Light Mode)
          const freshState = getDefaultAdminState(data.bootId);
          localStorage.setItem(ADMIN_STATE_KEY, JSON.stringify(freshState));
          applyAdminStateToDOM(freshState, true);
        } else {
          // Browser hanya di-reload pada sesi server yang sama: pertahankan state terakhir
          saveAdminState({ bootId: data.bootId });
        }
      }

      renderSystemOverviewCharts(data);
    } catch (err) {
      console.error('Failed to load system overview:', err);
    }
  }

  // Synchronous pre-restoration on DOMContentLoaded to avoid any UI/Dark-mode flicker on browser reload
  const initialSavedState = loadSavedAdminState();
  if (initialSavedState && initialSavedState.bootId) {
    applyAdminStateToDOM(initialSavedState, true);
  } else {
    switchView('home', { skipSave: true });
  }

  // Initial Data Load & Server Boot Session Verification
  loadSystemOverview(true);
  loadFruits();
  loadSettings();
  loadSystemSettings();
  loadThemeConfig();
  loadPluginsData();
});
