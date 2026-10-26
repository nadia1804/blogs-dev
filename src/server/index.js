import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { FruitManager } from '../core/fruitManager.js';
import { ThemeManager } from '../core/themeManager.js';
import { CORE_POST_PROPERTIES, CORE_PAGE_PROPERTIES, CORE_AUTHOR_PROPERTIES } from '../core/schema.js';

const PORT = 3000;
const manager = new FruitManager();
const themeManager = new ThemeManager();

// Render HTML: Modern, Light, Simple & Intuitive Sticky 2-Panel Shell
const renderShellHtml = (options) => {
  const {
    fruits = [],
    activeFruit = null,
    isCreating = false,
    authorsList = [],
    allPosts = [],
    view = 'fruit', // 'fruit' or 'themes'
    themes = [],
    activeTheme = null,
    selectedTheme = null
  } = options;

  const currentSelectedTheme = selectedTheme || activeTheme || themes[0];
  const targetType = activeFruit?.config?.targetType || 'post';
  const isAuthor = targetType === 'authors';
  const isPage = targetType === 'page';
  const items = activeFruit?.items || [];
  const discoveredProps = activeFruit?.config?.mapping?.discovered || [];
  const mappedCols = activeFruit?.config?.mapping?.columns || {};
  const firstItemId = items[0]?.id || '';

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Fruition Mini • Headless Notion SSG</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <script src="/assets/lucide.min.js"></script>
  <style>
    :root {
      --bg: #f8fafc;
      --surface: #ffffff;
      --surface-subtle: #f1f5f9;
      --surface-hover: #f8fafc;
      --border: #e2e8f0;
      --border-subtle: #edf2f7;
      --border-focus: #10b981;
      --primary: #059669;
      --primary-hover: #047857;
      --primary-subtle: #ecfdf5;
      --primary-border: #a7f3d0;
      --accent: #2563eb;
      --accent-subtle: #eff6ff;
      --text: #0f172a;
      --text-muted: #475569;
      --text-dim: #94a3b8;
      --sidebar-width: 280px;
      --radius: 12px;
      --radius-sm: 8px;
      --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.04);
      --shadow: 0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06);
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.5;
      height: 100vh;
      display: flex;
      overflow: hidden;
      -webkit-font-smoothing: antialiased;
    }

    /* STICKY 2-PANEL LAYOUT */
    .shell-container {
      display: flex;
      width: 100vw;
      height: 100vh;
    }

    /* =========================================================
       PANEL 1 (KIRI): SIDEBAR
       ========================================================= */
    .panel-left-sidebar {
      width: var(--sidebar-width);
      min-width: var(--sidebar-width);
      background: var(--surface);
      border-right: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      height: 100vh;
      position: sticky;
      top: 0;
      z-index: 20;
    }

    .brand-section {
      padding: 18px 20px;
      border-bottom: 1px solid var(--border-subtle);
    }
    .brand-box {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 14px;
    }
    .brand-icon {
      font-size: 22px;
      width: 38px;
      height: 38px;
      border-radius: 10px;
      background: linear-gradient(135deg, #ecfdf5, #d1fae5);
      border: 1px solid var(--primary-border);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: var(--shadow-sm);
    }
    .brand-title {
      font-size: 16px;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: var(--text);
      line-height: 1.2;
    }
    .brand-badge {
      font-size: 10px;
      font-weight: 700;
      color: var(--primary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    /* + Add Fruit Button */
    .btn-add-fruit {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      padding: 9px 14px;
      background: var(--primary);
      color: #ffffff;
      border-radius: var(--radius-sm);
      font-size: 13px;
      font-weight: 700;
      text-decoration: none;
      box-shadow: 0 1px 2px rgba(5, 150, 105, 0.2);
      transition: all 0.15s ease;
    }
    .btn-add-fruit:hover {
      background: var(--primary-hover);
      transform: translateY(-1px);
    }

    /* List Fruit Menu (Draggable Sort) */
    .list-fruit-menu {
      flex: 1;
      overflow-y: auto;
      padding: 14px 12px;
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    .menu-header-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 4px 8px 8px 8px;
    }
    .menu-header-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-dim);
    }
    .menu-drag-hint {
      font-size: 10px;
      color: var(--text-dim);
    }

    .fruit-menu-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 7px 10px;
      border-radius: var(--radius-sm);
      border: 1px solid transparent;
      background: #ffffff;
      text-decoration: none;
      color: inherit;
      transition: all 0.15s ease;
      cursor: pointer;
      user-select: none;
    }
    .fruit-menu-item:hover {
      background: var(--surface-subtle);
      border-color: var(--border-subtle);
    }
    .fruit-menu-item.active {
      background: var(--primary-subtle);
      border-color: var(--primary-border);
    }
    .fruit-menu-item.dragging {
      opacity: 0.4;
      background: #e2e8f0;
      border: 1px dashed #94a3b8;
    }

    .drag-handle {
      color: var(--text-dim);
      font-size: 14px;
      cursor: grab;
      padding: 2px 4px;
      margin-right: 4px;
      line-height: 1;
      opacity: 0.5;
      transition: opacity 0.15s;
    }
    .fruit-menu-item:hover .drag-handle {
      opacity: 1;
    }
    .drag-handle:active {
      cursor: grabbing;
    }

    .fruit-item-info {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
      flex: 1;
    }
    .fruit-item-icon {
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 26px;
      height: 26px;
      border-radius: 6px;
      background: var(--surface-subtle);
      border: 1px solid var(--border);
      flex-shrink: 0;
    }
    .fruit-menu-item.active .fruit-item-icon {
      background: #ffffff;
      border-color: var(--primary-border);
    }
    .fruit-item-name {
      font-size: 13px;
      font-weight: 700;
      color: var(--text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .fruit-item-meta {
      font-size: 11px;
      color: var(--text-dim);
    }
    .badge-target {
      font-size: 10px;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 999px;
      background: var(--surface-subtle);
      border: 1px solid var(--border);
      color: var(--text-muted);
      flex-shrink: 0;
      margin-right: 4px;
    }
    .fruit-menu-item.active .badge-target {
      background: #ffffff;
      color: var(--primary);
      border-color: var(--primary-border);
    }

    .btn-del-mini {
      background: transparent;
      border: none;
      font-size: 12px;
      cursor: pointer;
      opacity: 0.2;
      padding: 4px;
      border-radius: 4px;
      transition: all 0.15s;
    }
    .fruit-menu-item:hover .btn-del-mini {
      opacity: 0.8;
    }
    .btn-del-mini:hover { opacity: 1; background: #fee2e2; color: #dc2626; }

    /* Bottom sticky menu */
    .bottom-menu-section {
      padding: 12px 14px;
      border-top: 1px solid var(--border-subtle);
      background: var(--surface);
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .bottom-item {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 12px;
      font-weight: 700;
      color: var(--text-muted);
      text-decoration: none;
      cursor: pointer;
      padding: 8px 10px;
      border-radius: 6px;
      transition: all 0.12s;
    }
    .bottom-item:hover { background: var(--surface-subtle); color: var(--text); }
    .bottom-item.active { background: var(--primary-subtle); color: var(--primary); font-weight: 800; }

    /* =========================================================
       PANEL 2 (KANAN): WORKSPACE AREA
       ========================================================= */
    .panel-right-workspace {
      flex: 1;
      height: 100vh;
      overflow-y: auto;
      background: var(--bg);
      display: flex;
      flex-direction: column;
    }

    /* STICKY TOP MENU (ROOMY & ELEGAN) */
    .sticky-top-bar {
      position: sticky;
      top: 0;
      z-index: 30;
      background: rgba(255, 255, 255, 0.94);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--border);
      min-height: 70px;
      height: 70px;
      padding: 0 36px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 1px 3px rgba(0,0,0,0.02);
    }
    .top-bar-left {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
    }
    .top-bar-title {
      font-size: 18px;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: var(--text);
      display: flex;
      align-items: center;
      gap: 8px;
      white-space: nowrap;
    }
    .tag-notion-db {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 700;
      background: #ecfdf5;
      color: #065f46;
      border: 1px solid #a7f3d0;
      padding: 4px 10px;
      border-radius: 999px;
      white-space: nowrap;
    }
    .tag-notion-db .pulse-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
    }

    .top-bar-right {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-shrink: 0;
    }

    /* UNIFIED ACTION BUTTON SYSTEM (Konsisten & Rapi) */
    .btn-top-action {
      height: 38px;
      padding: 0 16px;
      border-radius: var(--radius-sm);
      font-size: 13px;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      gap: 7px;
      text-decoration: none;
      cursor: pointer;
      border: 1px solid var(--border);
      background: #ffffff;
      color: var(--text);
      transition: all 0.15s ease;
      white-space: nowrap;
      box-shadow: var(--shadow-sm);
    }
    .btn-top-action:hover {
      background: var(--surface-subtle);
      border-color: #cbd5e1;
      transform: translateY(-1px);
    }
    .btn-top-primary {
      background: var(--primary);
      color: #ffffff;
      border-color: var(--primary);
      box-shadow: 0 1px 3px rgba(5, 150, 105, 0.25);
    }
    .btn-top-primary:hover {
      background: var(--primary-hover);
      border-color: var(--primary-hover);
      color: #ffffff;
    }

    /* Workspace Content Body */
    .ws-body {
      padding: 28px 36px 60px 36px;
      flex: 1;
    }
    .ws-inner {
      max-width: 1040px;
      margin: 0 auto;
    }

    /* Modern Tabs Bar */
    .tabs-nav {
      display: flex;
      gap: 6px;
      border-bottom: 1px solid var(--border);
      margin-bottom: 22px;
      background: transparent;
    }
    .tab-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 9px 16px;
      font-size: 13px;
      font-weight: 700;
      color: var(--text-muted);
      border: none;
      background: transparent;
      cursor: pointer;
      position: relative;
      border-radius: 6px 6px 0 0;
      transition: all 0.15s;
    }
    .tab-btn:hover {
      color: var(--text);
      background: rgba(0,0,0,0.02);
    }
    .tab-btn.active {
      color: var(--primary);
    }
    .tab-btn.active::after {
      content: '';
      position: absolute;
      bottom: -1px;
      left: 0;
      right: 0;
      height: 2px;
      background: var(--primary);
      border-radius: 2px 2px 0 0;
    }
    .tab-badge {
      font-size: 10px;
      font-weight: 700;
      padding: 1px 6px;
      border-radius: 999px;
      background: var(--surface-subtle);
      color: var(--text-muted);
    }
    .tab-btn.active .tab-badge {
      background: var(--primary-subtle);
      color: var(--primary);
    }

    /* Cards */
    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 22px;
      margin-bottom: 20px;
      box-shadow: var(--shadow-sm);
    }
    .card-title {
      font-size: 15px;
      font-weight: 700;
      color: var(--text);
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .card-desc {
      font-size: 12px;
      color: var(--text-muted);
      margin-bottom: 16px;
      line-height: 1.5;
    }

    /* Stats Overview Row */
    .stats-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 14px;
      margin-bottom: 20px;
    }
    .stat-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 12px 16px;
      box-shadow: var(--shadow-sm);
    }
    .stat-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-dim);
      margin-bottom: 3px;
    }
    .stat-value {
      font-size: 17px;
      font-weight: 800;
      color: var(--text);
      display: flex;
      align-items: center;
      gap: 6px;
    }

    /* =========================================================
       3-PANEL THEME WORKSPACE LAYOUT
       ========================================================= */
    .themes-workspace-layout {
      display: flex;
      flex: 1;
      height: calc(100vh - 70px);
      overflow: hidden;
      position: relative;
    }

    .themes-middle-panel {
      width: 320px;
      min-width: 320px;
      max-width: 320px;
      background: var(--surface);
      border-right: 1px solid var(--border);
      overflow-y: auto;
      padding: 22px 18px 60px 18px;
      height: 100%;
      flex-shrink: 0;
    }

    .theme-panel-right {
      flex: 1;
      min-width: 0;
      background: var(--bg);
      height: 100%;
      display: flex;
      flex-direction: column;
      overflow-y: auto;
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .theme-panel-right.closed {
      display: none;
    }

    .panel3-header {
      padding: 18px 36px;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: rgba(255, 255, 255, 0.9);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      position: sticky;
      top: 0;
      z-index: 10;
      flex-shrink: 0;
    }
    .panel3-title {
      font-size: 16px;
      font-weight: 800;
      letter-spacing: -0.01em;
      color: var(--text);
    }
    .panel3-subtitle {
      font-size: 11px;
      color: var(--text-dim);
      margin-top: 2px;
    }
    .btn-close-panel3 {
      display: none; /* panel pengaturan sekarang adalah main area yang luas */
    }
    .btn-close-panel3:hover {
      background: #fee2e2;
      border-color: #fca5a5;
      color: #dc2626;
    }

    .settings-group-header {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      margin-top: 14px;
      margin-bottom: 8px;
      padding-bottom: 5px;
      border-bottom: 1px solid var(--border-subtle);
      display: flex;
      align-items: center;
      gap: 6px;
    }

    /* =========================================================
       SETTINGS NAVIGATION LIST DI PANEL 2 (DAFTAR TEMA)
       ========================================================= */
    .theme-capsule-item-box {
      background: #ffffff;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      overflow: hidden;
      margin-bottom: 16px;
      box-shadow: var(--shadow-sm);
    }
    .theme-capsule-header-row {
      padding: 10px 12px;
      background: #ffffff;
      border-bottom: 1px solid var(--border-subtle);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .theme-nav-list-section {
      display: flex;
      flex-direction: column;
      gap: 3px;
      padding: 8px;
    }

    .theme-nav-list-title {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-dim);
      padding: 4px 8px 4px 8px;
    }

    .theme-setting-nav-btn {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      padding: 9px 12px;
      border-radius: var(--radius-sm);
      background: transparent;
      border: 1px solid transparent;
      color: var(--text);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      text-align: left;
      transition: all 0.15s ease;
      font-family: inherit;
    }

    .theme-setting-nav-btn:hover {
      background: var(--surface-subtle);
      border-color: var(--border-subtle);
      color: var(--text);
    }

    .theme-setting-nav-btn.active {
      background: var(--primary-subtle);
      border-color: var(--primary-border);
      color: var(--primary);
      font-weight: 700;
    }

    .nav-btn-content {
      display: flex;
      align-items: center;
      gap: 9px;
    }

    .nav-btn-icon {
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border-radius: 6px;
      background: #ffffff;
      border: 1px solid var(--border);
      flex-shrink: 0;
    }

    .theme-setting-nav-btn.active .nav-btn-icon {
      border-color: var(--primary-border);
    }

    .nav-chevron {
      font-size: 12px;
      color: var(--text-dim);
    }
    .theme-setting-nav-btn.active .nav-chevron {
      color: var(--primary);
      font-weight: 800;
    }

    .theme-setting-section-card {
      background: #ffffff;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 24px 26px;
      margin-bottom: 20px;
      box-shadow: var(--shadow-sm);
    }

    .section-card-title {
      font-size: 15px;
      font-weight: 800;
      color: var(--text);
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .section-card-desc {
      font-size: 12px;
      color: var(--text-muted);
      margin-bottom: 18px;
    }

    .panel3-body {
      padding: 28px 36px 60px 36px;
      overflow-y: auto;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 18px;
      max-width: 900px;
      width: 100%;
      margin: 0 auto;
    }

    .theme-capsule-badge {
      background: #ffffff;
      border: 1px solid var(--border);
      padding: 4px 12px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.03);
    }

    .theme-name-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 4px;
    }
    .theme-name-link {
      font-size: 16px;
      font-weight: 800;
      color: var(--text);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: color 0.15s;
    }
    .theme-name-link:hover {
      color: var(--primary);
    }
    .pill-open-hint {
      font-size: 10px;
      font-weight: 700;
      background: var(--surface-subtle);
      border: 1px solid var(--border);
      color: var(--text-dim);
      padding: 2px 8px;
      border-radius: 999px;
    }

    .status-banner-active {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 14px;
      background: #ecfdf5;
      border: 1px solid #a7f3d0;
      border-radius: var(--radius-sm);
    }
    .status-banner-inactive {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 12px 14px;
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: var(--radius-sm);
    }

    .css-isolation-box {
      background: #f8fafc;
      border: 1px dashed var(--border);
      border-radius: var(--radius-sm);
      padding: 12px 14px;
      margin-top: 4px;
    }

    /* Theme Cards Grid */
    .themes-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 18px;
      margin-bottom: 24px;
    }
    .theme-card {
      background: #ffffff;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: var(--shadow-sm);
      transition: all 0.2s ease;
      cursor: pointer;
    }
    .theme-card:hover {
      border-color: var(--primary);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(5, 150, 105, 0.08);
    }
    .theme-card.active-theme {
      border-color: var(--primary);
    }
    .theme-card.selected-theme {
      border: 2px solid var(--primary);
      box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.15);
    }
    .theme-preview-banner {
      height: 90px;
      padding: 14px 16px;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      border-bottom: 1px solid var(--border);
      position: relative;
    }
    .theme-card-body {
      padding: 16px;
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .theme-desc {
      font-size: 12px;
      color: var(--text-muted);
      line-height: 1.5;
      margin-bottom: 14px;
      flex: 1;
    }
    .theme-card-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-top: 1px solid var(--border-subtle);
      padding-top: 12px;
      gap: 8px;
    }
    .badge-active-theme {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 11px;
      font-weight: 700;
      color: var(--primary);
      background: var(--primary-subtle);
      border: 1px solid var(--primary-border);
      padding: 3px 8px;
      border-radius: 999px;
    }

    /* Forms & Controls */
    .form-group { margin-bottom: 16px; }
    .form-label { display: block; font-size: 12px; font-weight: 700; color: var(--text); margin-bottom: 6px; }
    .form-control {
      width: 100%;
      padding: 9px 12px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--border);
      background: #ffffff;
      color: var(--text);
      font-size: 13px;
      font-family: inherit;
      transition: all 0.15s ease;
    }
    .form-control:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.1); }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .btn-save {
      height: 38px;
      padding: 0 20px;
      background: var(--primary);
      color: #ffffff;
      border: none;
      border-radius: var(--radius-sm);
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .btn-save:hover { background: var(--primary-hover); }

    /* Mapping Grid Cards */
    .mapping-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 14px;
      margin-bottom: 20px;
    }
    .mapping-box {
      background: #ffffff;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      transition: border-color 0.15s;
    }
    .mapping-box:hover {
      border-color: #cbd5e1;
    }
    .mapping-box-label {
      font-size: 12px;
      font-weight: 700;
      color: var(--text);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .badge-core {
      font-size: 10px;
      font-weight: 700;
      background: var(--primary-subtle);
      color: var(--primary);
      padding: 2px 7px;
      border-radius: 999px;
      border: 1px solid var(--primary-border);
    }
    .badge-auto {
      font-size: 10px;
      font-weight: 600;
      background: var(--surface-subtle);
      color: var(--text-muted);
      padding: 2px 7px;
      border-radius: 999px;
    }

    /* Clean Data Table */
    .table-container {
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      overflow: hidden;
      background: #ffffff;
    }
    table { width: 100%; border-collapse: collapse; text-align: left; }
    th {
      background: var(--surface-subtle);
      padding: 10px 14px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      border-bottom: 1px solid var(--border);
    }
    td { padding: 12px 14px; font-size: 13px; border-bottom: 1px solid var(--border-subtle); vertical-align: middle; }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: var(--surface-hover); }

    .tag-prop-type {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      background: var(--surface-subtle);
      padding: 2px 6px;
      border-radius: 4px;
      color: var(--accent);
      border: 1px solid var(--border);
    }
    .tag-required {
      font-size: 11px;
      font-weight: 700;
      color: var(--primary);
      background: var(--primary-subtle);
      border: 1px solid var(--primary-border);
      padding: 2px 8px;
      border-radius: 999px;
    }
    .tag-custom {
      font-size: 11px;
      font-weight: 600;
      color: #b45309;
      background: #fef3c7;
      border: 1px solid #fde68a;
      padding: 2px 8px;
      border-radius: 999px;
    }

    /* Buttons */
    .btn-view-html {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 12px;
      font-weight: 700;
      padding: 6px 12px;
      border-radius: 6px;
      background: #ffffff;
      border: 1px solid var(--border);
      color: var(--text);
      text-decoration: none;
      cursor: pointer;
      transition: all 0.15s;
    }
    .btn-view-html:hover { background: var(--surface-subtle); border-color: #cbd5e1; color: var(--primary); }

    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 999px;
    }
    .status-published {
      background: #ecfdf5;
      color: #065f46;
      border: 1px solid #a7f3d0;
    }
    .status-draft {
      background: var(--surface-subtle);
      color: var(--text-dim);
      border: 1px solid var(--border);
    }

    /* Target Category Buttons */
    .btn-target-cat {
      flex: 1;
      padding: 12px 14px;
      border: 2px solid var(--border);
      border-radius: var(--radius-sm);
      background: #ffffff;
      font-weight: 700;
      font-size: 13px;
      cursor: pointer;
      text-align: center;
      transition: all 0.15s;
      color: var(--text-muted);
    }
    .btn-target-cat:hover {
      border-color: #cbd5e1;
      background: var(--surface-subtle);
      color: var(--text);
    }
    .btn-target-cat.active {
      border-color: var(--primary);
      background: var(--primary-subtle);
      color: var(--primary);
    }

    /* Empty state */
    .empty-state {
      padding: 48px 20px;
      text-align: center;
      background: var(--surface);
      border: 2px dashed var(--border);
      border-radius: var(--radius);
    }

    /* Search bar */
    .search-filter-box {
      margin-bottom: 14px;
      display: flex;
      gap: 10px;
    }
    .search-input {
      flex: 1;
      padding: 8px 12px;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      font-size: 13px;
      font-family: inherit;
    }

    /* =========================================================
       LIVE PREVIEW MODAL (RESPONSIVE IFRAME)
       ========================================================= */
    .preview-modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(15, 23, 42, 0.65);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      z-index: 1000;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .preview-modal-backdrop.open {
      display: flex;
    }
    .preview-modal-dialog {
      background: #ffffff;
      border-radius: 16px;
      width: 100%;
      max-width: 1200px;
      height: 90vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      overflow: hidden;
      border: 1px solid var(--border);
    }
    .preview-modal-header {
      padding: 12px 20px;
      background: var(--surface-subtle);
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }
    .preview-controls-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .preview-controls-center {
      display: flex;
      align-items: center;
      background: #ffffff;
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 2px;
      gap: 2px;
    }
    .btn-device {
      border: none;
      background: transparent;
      padding: 6px 12px;
      font-size: 12px;
      font-weight: 700;
      color: var(--text-muted);
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 5px;
      transition: all 0.15s;
    }
    .btn-device.active {
      background: var(--surface-subtle);
      color: var(--text);
      box-shadow: var(--shadow-sm);
    }
    .preview-controls-right {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .btn-close-modal {
      border: none;
      background: #ffffff;
      border: 1px solid var(--border);
      color: var(--text-muted);
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .btn-close-modal:hover { background: #fee2e2; color: #dc2626; }

    .preview-modal-body {
      flex: 1;
      background: #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      overflow: hidden;
    }
    .iframe-device-container {
      background: #ffffff;
      height: 100%;
      width: 100%;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 10px 25px rgba(0,0,0,0.1);
      transition: width 0.25s ease;
      display: flex;
    }
    .iframe-device-container.device-tablet {
      width: 768px;
    }
    .iframe-device-container.device-mobile {
      width: 380px;
      border-radius: 24px;
      border: 8px solid #334155;
    }
    #preview-iframe {
      width: 100%;
      height: 100%;
      border: none;
      background: #ffffff;
    }

    /* Toggle Switch On/Off UI */
    .toggle-switch {
      position: relative;
      display: inline-block;
      width: 42px;
      height: 24px;
      flex-shrink: 0;
      margin: 0;
      vertical-align: middle;
    }
    .toggle-switch input {
      opacity: 0;
      width: 0;
      height: 0;
      position: absolute;
    }
    .toggle-slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: #cbd5e1;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      border-radius: 24px;
    }
    .toggle-slider:before {
      position: absolute;
      content: "";
      height: 18px;
      width: 18px;
      left: 3px;
      bottom: 3px;
      background-color: #ffffff;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      border-radius: 50%;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
    }
    .toggle-switch input:checked + .toggle-slider {
      background-color: var(--primary, #0f172a);
    }
    .toggle-switch input:focus-visible + .toggle-slider {
      box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.2);
    }
    .toggle-switch input:checked + .toggle-slider:before {
      transform: translateX(18px);
    }

    /* Small size toggle switch untuk baris item tabel */
    .toggle-switch-sm {
      width: 32px;
      height: 18px;
    }
    .toggle-switch-sm .toggle-slider {
      border-radius: 18px;
    }
    .toggle-switch-sm .toggle-slider:before {
      height: 12px;
      width: 12px;
      left: 3px;
      bottom: 3px;
    }
    .toggle-switch-sm input:checked + .toggle-slider:before {
      transform: translateX(14px);
    }
  </style>
</head>
<body>

  <div class="shell-container">

    <!-- =========================================================
         PANEL 1 (KIRI): SIDEBAR
         ========================================================= -->
    <aside class="panel-left-sidebar">
      <div class="brand-section">
        <div class="brand-box">
          <div class="brand-icon">🍉</div>
          <div>
            <div class="brand-title">Fruition Mini</div>
            <div class="brand-badge">Headless Notion SSG</div>
          </div>
        </div>

        <!-- + Add Fruit Button -->
        <a href="/?mode=create" class="btn-add-fruit">
          <span>+</span> Tambah Fruit Baru
        </a>
      </div>

      <!-- List Fruit Menu (Draggable Sort) -->
      <div class="list-fruit-menu" id="fruit-draggable-container">
        <div class="menu-header-bar">
          <span class="menu-header-label">Daftar Fruit (${fruits.length})</span>
          <span class="menu-drag-hint">⠿ Drag to sort</span>
        </div>

        ${fruits.length === 0 ? '<div style="font-size: 12px; color: var(--text-dim); padding: 12px 8px;">Belum ada Fruit. Klik "+ Tambah Fruit Baru".</div>' : ''}

        ${fruits.map((f) => {
          const isActive = view !== 'themes' && !isCreating && activeFruit?.name === f.name;
          const target = f.config?.targetType || 'post';
          const icon = target === 'authors' ? '👤' : (target === 'page' ? '📄' : '📝');

          return `
            <div class="fruit-menu-item ${isActive ? 'active' : ''}" draggable="true" data-fruit-name="${f.name}">
              <span class="drag-handle" title="Tahan dan geser untuk mengurutkan">⋮⋮</span>
              <a href="/?fruit=${encodeURIComponent(f.name)}" style="text-decoration: none; color: inherit; flex: 1; display: flex; align-items: center; justify-content: space-between; overflow: hidden; margin-right: 4px;">
                <div class="fruit-item-info">
                  <span class="fruit-item-icon">${icon}</span>
                  <div>
                    <div class="fruit-item-name">${f.name}</div>
                    <div class="fruit-item-meta">${f.itemsCount} baris</div>
                  </div>
                </div>
                <span class="badge-target">${target}</span>
              </a>
              <form action="/api/delete-fruit" method="POST" style="margin: 0;" onsubmit="return confirm('Hapus fruit \\'${f.name}\\' dari lokal?');">
                <input type="hidden" name="fruitName" value="${f.name}" />
                <button type="submit" class="btn-del-mini" title="Hapus Fruit">🗑️</button>

                

              </form>
            </div>
          `;
        }).join('')}
      </div>

      <!-- Bottom Sticky Section: Theme setting & Setting -->
      <div class="bottom-menu-section">
        <a href="/?view=themes" class="bottom-item ${view === 'themes' ? 'active' : ''}">
          <span>🎨</span>
          <span>Theme setting</span>
        </a>
        <div class="bottom-item" onclick="alert('Fruition Mini v0.2.0 • Headless Notion SSG')">
          <span>⚙️</span>
          <span>Setting</span>
        </div>
      </div>
    </aside>

    <!-- =========================================================
         PANEL 2 (KANAN): WORKSPACE AREA
         ========================================================= -->
    <main class="panel-right-workspace">

      <!-- STICKY TOP MENU (ROOMY, TIDAK SEMPIT, BUTTON UNIFORM) -->
      <header class="sticky-top-bar">
        <div class="top-bar-left">
          ${view === 'themes' ? `
            <div class="top-bar-title">
              <span>🎨 Theme setting (Daftar & Pengaturan Tema)</span>
            </div>
          ` : (activeFruit ? `
            <div class="top-bar-title">
              <span>🍉 ${activeFruit.name}</span>
              <span class="badge-target" style="background: var(--primary-subtle); color: var(--primary); font-size: 11px;">target: ${targetType}</span>
            </div>
            ${activeFruit.config?.notion?.databaseTitle ? `
              <span class="tag-notion-db">
                <span class="pulse-dot"></span>
                <span>Notion: "${activeFruit.config.notion.databaseTitle}"</span>
              </span>
            ` : ''}
          ` : `
            <div class="top-bar-title">
              <span>+ Tambah Fruit Baru</span>
            </div>
          `)}
        </div>

        <div class="top-bar-right">
          ${view === 'themes' ? `
            <button type="button" class="btn-top-action" onclick="openLivePreviewModal()" title="Shortcut: Ctrl + Space (Tekan lagi untuk kembali)">
              <span>👁️</span>
              <span>Preview</span>
              <kbd style="font-size: 10px; font-weight: 700; padding: 1px 5px; border-radius: 4px; background: var(--surface-subtle); border: 1px solid var(--border); color: var(--text-dim); font-family: 'JetBrains Mono', monospace;">Ctrl+Space</kbd>
            </button>
            <button type="submit" form="form-theme-settings" class="btn-top-action btn-top-primary" title="Shortcut: Ctrl + S">
              <span>💾</span>
              <span>Simpan</span>
              <kbd style="font-size: 10px; font-weight: 700; padding: 1px 5px; border-radius: 4px; background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.35); color: #ffffff; font-family: 'JetBrains Mono', monospace;">Ctrl+S</kbd>
            </button>
            <a href="/index.html" target="_blank" class="btn-top-action" style="text-decoration: none;" title="Buka file index.html di tab baru browser">
              <span>🌐</span>
              <span>Buka index.html</span>
            </a>
            <form action="/api/sync-all-fruits" method="POST" style="margin: 0;" onsubmit="const b = this.querySelector('button'); if(b){ b.disabled = true; b.innerHTML = '<span>⏳</span><span>Menarik Semua Data...</span>'; }">
              <input type="hidden" name="returnTo" value="/?view=themes&theme=${encodeURIComponent(currentSelectedTheme?.id || 'capsule')}" />
              <button type="submit" class="btn-top-action" title="Tarik seluruh data dari semua database Fruit secara sekaligus">
                <span>🔄</span>
                <span>Tarik Data Semua</span>
              </button>
            </form>
          ` : (activeFruit ? `
            <!-- Tombol 1: Preview (Khusus Melihat Tampilan Tema / Hasil Compile) -->
            <button type="button" class="btn-top-action" onclick="openLivePreviewModal()" title="Shortcut: Ctrl + Space (Tekan lagi untuk kembali)">
              <span>👁️</span>
              <span>Preview</span>
              <kbd style="font-size: 10px; font-weight: 700; padding: 1px 5px; border-radius: 4px; background: var(--surface-subtle); border: 1px solid var(--border); color: var(--text-dim); font-family: 'JetBrains Mono', monospace;">Ctrl+Space</kbd>
            </button>

            <!-- Tombol 2: Simpan (Shortcut Ctrl + S) -->
            <button type="button" class="btn-top-action" onclick="triggerShortcutSave()" title="Shortcut: Ctrl + S">
              <span>💾</span>
              <span>Simpan</span>
              <kbd style="font-size: 10px; font-weight: 700; padding: 1px 5px; border-radius: 4px; background: var(--surface-subtle); border: 1px solid var(--border); color: var(--text-dim); font-family: 'JetBrains Mono', monospace;">Ctrl+S</kbd>
            </button>

            <!-- Tombol 3: Tarik Data Semua (Menarik semua data fruit sekaligus) -->
            <form action="/api/sync-all-fruits" method="POST" style="margin: 0;" onsubmit="const b = this.querySelector('button'); if(b){ b.disabled = true; b.innerHTML = '<span>⏳</span><span>Menarik Semua Data...</span>'; }">
              <input type="hidden" name="returnTo" value="/?fruit=${encodeURIComponent(activeFruit.name)}" />
              <button type="submit" class="btn-top-action" title="Tarik seluruh data dari semua database Fruit secara sekaligus">
                <span>🔄</span>
                <span>Tarik Data Semua</span>
              </button>
            </form>

            <!-- Tombol 4: Tarik Data Notion (Fruit Aktif) -->
            <form action="/api/sync-fruit" method="POST" style="margin: 0;" onsubmit="const b = this.querySelector('button'); if(b){ b.disabled = true; b.innerHTML = '<span>⏳</span><span>Menarik Data...</span>'; }">
              <input type="hidden" name="fruitName" value="${activeFruit.name}" />
              <button type="submit" class="btn-top-action btn-top-primary">
                <span>⚡</span>
                <span>Tarik Data Notion</span>
              </button>
            </form>
          ` : '')}
        </div>
      </header>

      <!-- WORKSPACE BODY -->
      ${view === 'themes' ? `
        <!-- 3-PANEL THEME WORKSPACE -->
        <div class="themes-workspace-layout">
          <!-- PANEL 2: DAFTAR TEMA TERPASANG & LIST PENGATURAN -->
          <div class="themes-middle-panel">
            <div style="margin-bottom: 14px;">
              <div style="font-size: 13px; font-weight: 800; color: var(--text); display: flex; align-items: center; justify-content: space-between; margin-bottom: 2px;">
                <span>📦 Daftar Tema Terpasang</span>
                <span class="badge-target" style="background: var(--primary-subtle); color: var(--primary); font-size: 10px;">1 Tema Aktif</span>
              </div>
            </div>

            <!-- Item: Capsule Design -->
            <div class="theme-capsule-item-box">
              <div class="theme-capsule-header-row">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="font-size: 16px;">💊</span>
                  <div>
                    <div style="font-size: 13px; font-weight: 800; color: var(--text);">Capsule Design</div>
                    <div style="font-size: 10px; color: var(--text-dim);"><code>themes/capsule/</code> • v1.0.0</div>
                  </div>
                </div>
                <span class="badge-active-theme" style="font-size: 10px; padding: 2px 7px;">✓ Aktif</span>
              </div>

              <!-- Pengaturan Tema dalam Bentuk List (di dalam kontainer Capsule Design) -->
              <div class="theme-nav-list-section">
                <div class="theme-nav-list-title">PENGATURAN TEMA</div>

                <button type="button" class="theme-setting-nav-btn active" id="nav-btn-layout" onclick="switchThemeSettingSection('layout', this)">
                  <div class="nav-btn-content">
                    <span class="nav-btn-icon">📐</span>
                    <span>1. Tata Letak & Lebar Konten</span>
                  </div>
                  <span class="nav-chevron">›</span>
                </button>

                <button type="button" class="theme-setting-nav-btn" id="nav-btn-navigation" onclick="switchThemeSettingSection('navigation', this)">
                  <div class="nav-btn-content">
                    <span class="nav-btn-icon">🧭</span>
                    <span>2. Pengaturan & Manajemen Navigasi</span>
                  </div>
                  <span class="nav-chevron">›</span>
                </button>

                <button type="button" class="theme-setting-nav-btn" id="nav-btn-hero" onclick="switchThemeSettingSection('hero', this)">
                  <div class="nav-btn-content">
                    <span class="nav-btn-icon">✨</span>
                    <span>3. Hero (Header Beranda)</span>
                  </div>
                  <span class="nav-chevron">›</span>
                </button>

                <button type="button" class="theme-setting-nav-btn" id="nav-btn-postcard" onclick="switchThemeSettingSection('postcard', this)">
                  <div class="nav-btn-content">
                    <span class="nav-btn-icon">🃏</span>
                    <span>4. Desain Kartu Artikel (Post Card)</span>
                  </div>
                  <span class="nav-chevron">›</span>
                </button>
              </div>
            </div>
          </div>

          <!-- WORKSPACE DI SEBELAH KANAN -->
          <main class="theme-panel-right" id="theme-settings-panel">
            <div class="panel3-header">
              <div style="min-width: 0;">
                <div class="panel3-title" id="panel3-title">
                  <span>Capsule Design • Workspace Pengaturan Tema</span>
                </div>
                <div class="panel3-subtitle" id="panel3-subtitle">
                  Konfigurasi tersimpan di <code>themes/${currentSelectedTheme?.id || 'capsule'}/theme.json</code> • File CSS mandiri di <code>themes/${currentSelectedTheme?.id || 'capsule'}/style.css</code>
                </div>
              </div>
            </div>

            <div class="panel3-body">

              <!-- Form Multi-Pengaturan Tema -->
              <form action="/api/save-theme-settings" method="POST" id="form-theme-settings">
                <input type="hidden" name="themeId" id="panel3-form-themeId" value="${currentSelectedTheme?.id || 'capsule'}" />

                <!-- Simpan nilai pengaturan lain yang belum diubah -->
                <div style="display: none !important;">
                  <input type="hidden" name="primaryColor" id="input-color-picker" value="${currentSelectedTheme?.settings?.primaryColor || currentSelectedTheme?.accentColor || '#059669'}" />
                  <input type="hidden" name="bgColor" id="panel3-bgColor" value="${currentSelectedTheme?.settings?.bgColor || '#f8fafc'}" />
                  <input type="hidden" name="fontFamily" id="panel3-fontFamily" value="${currentSelectedTheme?.settings?.fontFamily || 'Plus Jakarta Sans'}" />
                  <input type="hidden" name="fontSize" id="panel3-fontSize" value="${currentSelectedTheme?.settings?.fontSize || '17px'}" />
                  <input type="hidden" name="pillRadius" id="panel3-pillRadius" value="${currentSelectedTheme?.settings?.pillRadius || '999px'}" />
                  <input type="hidden" name="cardRadius" id="panel3-cardRadius" value="${currentSelectedTheme?.settings?.cardRadius || '24px'}" />
                  <input type="hidden" name="showAuthorCard" id="panel3-showAuthorCard" value="${currentSelectedTheme?.settings?.showAuthorCard !== false ? 'true' : 'false'}" />
                  <input type="hidden" name="showPillBar" id="panel3-showPillBar" value="${currentSelectedTheme?.settings?.showPillBar !== false ? 'true' : 'false'}" />
                </div>

                <!-- Section 1: Tata Letak & Lebar Konten (Terisolasi) -->
                <div class="theme-setting-section-card" id="section-layout">
                  <div class="section-card-title">
                    <span>📐</span>
                    <span>1. Tata Letak & Lebar Konten</span>
                  </div>
                  <div class="section-card-desc">Tentukan lebar maksimal container artikel dan kerapatan tinggi baris.</div>

                  <div class="grid-2">
                    <div class="form-group">
                      <label class="form-label">Lebar Maksimal Konten (Max Width)</label>
                      <select name="maxWidth" id="panel3-maxWidth" class="form-control">
                        <option value="720px" ${currentSelectedTheme?.settings?.maxWidth === '720px' ? 'selected' : ''}>720px (Compact)</option>
                        <option value="780px" ${currentSelectedTheme?.settings?.maxWidth === '780px' || !currentSelectedTheme?.settings?.maxWidth ? 'selected' : ''}>780px (Optimal Capsule)</option>
                        <option value="840px" ${currentSelectedTheme?.settings?.maxWidth === '840px' ? 'selected' : ''}>840px (Wide)</option>
                      </select>
                    </div>

                    <div class="form-group">
                      <label class="form-label">Kerapatan Paragraf (Line Height)</label>
                      <select name="lineHeight" class="form-control">
                        <option value="1.75">1.75 (Lega & Nyaman)</option>
                        <option value="1.6">1.6 (Standar)</option>
                        <option value="1.85">1.85 (Sangat Lega)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <!-- Section 2: Pengaturan & Manajemen Navigasi (Terisolasi) -->
                <div class="theme-setting-section-card" id="section-navigation" style="display: none;">
                  <div class="section-card-title">
                    <span>🧭</span>
                    <span>2. Pengaturan & Manajemen Navigasi</span>
                  </div>
                  <div class="section-card-desc">Atur tampilan bar navigasi atas serta kelola daftar link menu navigasi website Anda.</div>

                  <!-- Sub-bagian A: Pengaturan Tampilan Navigasi -->
                  <div style="background: var(--surface-subtle); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 16px; margin-bottom: 20px;">
                    <div style="font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); margin-bottom: 12px;">
                      ⚙️ Pengaturan Bar Navigasi
                    </div>

                    <div class="grid-2" style="margin-bottom: 14px;">
                      <div class="form-group" style="padding: 12px 14px; background: #ffffff; border: 1px solid var(--border); border-radius: var(--radius-sm); margin: 0; display: flex; align-items: center; justify-content: space-between; gap: 12px;">
                        <div>
                          <div style="font-size: 13px; font-weight: 700; color: var(--text-main);">Tampilkan Header Navigasi</div>
                          <div style="font-size: 11px; color: var(--text-dim); margin-top: 2px;">Aktifkan atau nonaktifkan navbar situs.</div>
                        </div>
                        <label class="toggle-switch" title="Toggle On/Off Tampilkan Header Navigasi">
                          <input type="checkbox" name="showNavbar" id="panel3-showNavbar" value="true" ${currentSelectedTheme?.settings?.showNavbar !== false ? 'checked' : ''} onchange="renderNavMiniPreview()" />
                          <span class="toggle-slider"></span>
                        </label>
                      </div>

                      <div class="form-group" style="padding: 12px 14px; background: #ffffff; border: 1px solid var(--border); border-radius: var(--radius-sm); margin: 0; display: flex; align-items: center; justify-content: space-between; gap: 12px;">
                        <div>
                          <div style="font-size: 13px; font-weight: 700; color: var(--text-main);">Sticky & Blur Transparan</div>
                          <div style="font-size: 11px; color: var(--text-dim); margin-top: 2px;">Navbar tetap melayang saat halaman di-scroll.</div>
                        </div>
                        <label class="toggle-switch" title="Toggle On/Off Sticky & Blur">
                          <input type="checkbox" name="navSticky" id="panel3-navSticky" value="true" ${currentSelectedTheme?.settings?.navSticky !== false ? 'checked' : ''} onchange="renderNavMiniPreview()" />
                          <span class="toggle-slider"></span>
                        </label>
                      </div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1.4fr 1fr; gap: 16px; align-items: start;">
                      <!-- Identitas Brand & Upload Logo -->
                      <div class="form-group" style="margin-bottom: 0;">
                        <label class="form-label" style="display: flex; justify-content: space-between; align-items: center;">
                          <span>Identitas Brand (Logo & Nama Website)</span>
                          <span style="font-size: 11px; font-weight: normal; color: var(--text-dim);">Dukungan: Gambar (PNG/SVG/JPG/WebP) atau Inisial</span>
                        </label>

                        <div style="display: flex; gap: 12px; align-items: center; background: #ffffff; padding: 10px 12px; border: 1px solid var(--border); border-radius: var(--radius-sm);">
                          <!-- Box Pratinjau Logo -->
                          <div id="brand-logo-preview-box" style="width: 44px; height: 44px; border-radius: 8px; border: 1px dashed var(--border); display: flex; align-items: center; justify-content: center; background: var(--surface-subtle); flex-shrink: 0; overflow: hidden;">
                            ${currentSelectedTheme?.settings?.navBrandLogoImage ?
                              `<img id="brand-logo-img-preview" src="${currentSelectedTheme.settings.navBrandLogoImage}" style="width: 100%; height: 100%; object-fit: contain;" />` :
                              `<span id="brand-logo-text-preview" style="font-size: 16px; font-weight: 800; color: var(--primary);">${currentSelectedTheme?.settings?.navBrandLogo || 'B'}</span>`
                            }
                          </div>

                          <div style="flex: 1; display: flex; flex-direction: column; gap: 6px;">
                            <div style="display: flex; gap: 8px;">
                              <input type="text" name="navBrandText" id="panel3-navBrandText" class="form-control" value="${currentSelectedTheme?.settings?.navBrandText || 'blogs'}" placeholder="Nama Website (misal: blogs)" style="flex: 1; font-weight: 700; padding: 6px 10px; font-size: 13px;" oninput="renderNavMiniPreview()" />
                              <input type="text" name="navBrandLogo" id="panel3-navBrandLogo" class="form-control" value="${currentSelectedTheme?.settings?.navBrandLogo || 'B'}" placeholder="Inisial (B)" style="width: 80px; text-align: center; font-weight: 800; padding: 6px 8px; font-size: 13px;" oninput="updateBrandLogoText(this.value)" title="Inisial atau teks alternatif logo" />
                            </div>

                            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                              <input type="hidden" name="navBrandLogoImage" id="panel3-navBrandLogoImage" value="${currentSelectedTheme?.settings?.navBrandLogoImage || ''}" />
                              <input type="file" id="brand-logo-file-input" accept="image/png, image/jpeg, image/svg+xml, image/webp, image/gif" style="display: none;" onchange="handleBrandLogoUpload(event)" />
                              
                              <button type="button" class="btn btn-secondary" onclick="document.getElementById('brand-logo-file-input').click()" style="padding: 4px 10px; font-size: 11px; font-weight: 600; display: inline-flex; align-items: center; gap: 5px;">
                                <span>📤 Unggah Logo</span>
                              </button>
                              
                              <button type="button" id="btn-remove-brand-logo" onclick="removeBrandLogoImage()" class="btn btn-secondary" style="padding: 4px 8px; font-size: 11px; color: #dc2626; border-color: #fecaca; background: #fff5f5; display: ${currentSelectedTheme?.settings?.navBrandLogoImage ? 'inline-flex' : 'none'}; align-items: center; gap: 4px;" title="Hapus gambar & kembali ke teks inisial">
                                <span>🗑️ Hapus Gambar</span>
                              </button>
                              
                              <span style="font-size: 11px; color: var(--text-dim);" id="brand-logo-status-text">
                                ${currentSelectedTheme?.settings?.navBrandLogoImage ? 'Logo gambar aktif' : 'Gunakan inisial teks'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <!-- Gaya Desain Navigasi -->
                      <div class="form-group" style="margin-bottom: 0;">
                        <label class="form-label">Gaya Desain Navigasi</label>
                        <select name="navStyle" id="panel3-navStyle" class="form-control" style="padding: 9px 12px;" onchange="renderNavMiniPreview()">
                          <option value="capsule-floating" ${currentSelectedTheme?.settings?.navStyle === 'capsule-floating' || !currentSelectedTheme?.settings?.navStyle ? 'selected' : ''}>Floating Capsule Pill (Kapsul Melayang)</option>
                          <option value="full-bar" ${currentSelectedTheme?.settings?.navStyle === 'full-bar' ? 'selected' : ''}>Full Width Header Bar</option>
                          <option value="minimal" ${currentSelectedTheme?.settings?.navStyle === 'minimal' ? 'selected' : ''}>Minimalis Tanpa Border</option>
                        </select>
                        <div style="font-size: 11px; color: var(--text-dim); margin-top: 6px;">Pilih format container bar navigasi website.</div>
                      </div>
                    </div>
                  </div>

                  <!-- Pratinjau Langsung Bar Navigasi -->
                  <div style="margin-bottom: 20px;">
                    <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-dim); margin-bottom: 8px;">
                      👁️ Pratinjau Tampilan Navigasi
                    </div>
                    <div id="nav-mini-preview-box" style="background: #f1f5f9; border: 1px dashed var(--border); border-radius: var(--radius-sm); padding: 16px; display: flex; justify-content: center; align-items: center;">
                    </div>
                  </div>

                  <!-- Sub-bagian B: Daftar & Pengaturan Menu Navigasi -->
                  <div>
                    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                      <div>
                        <div style="font-size: 13px; font-weight: 800; color: var(--text);">📋 Daftar Menu Navigasi</div>
                        <div style="font-size: 11px; color: var(--text-muted);">Tambah, ubah label/tautan, atur urutan (↑/↓), atau hapus menu navigasi.</div>
                      </div>
                      <button type="button" class="btn-top-action btn-top-primary" style="height: 34px; padding: 0 12px; font-size: 12px;" onclick="addNavItem()">
                        <span>+</span>
                        <span>Tambah Menu</span>
                      </button>
                    </div>

                    <input type="hidden" name="navItemsJson" id="input-nav-items-json" value="" />

                    <div id="nav-items-editor-list" style="display: flex; flex-direction: column; gap: 8px;">
                    </div>
                  </div>
                </div>

                <!-- Section 3: Hero (Header Beranda) (Terisolasi) -->
                <div class="theme-setting-section-card" id="section-hero" style="display: none;">
                  <div class="section-card-title">
                    <span>✨</span>
                    <span>3. Bagian Hero (Header Beranda)</span>
                  </div>
                  <div class="section-card-desc">Atur headline sambutan, subjudul, badge kapsul, dan tombol aksi pada halaman beranda (index.html).</div>

                  <!-- Toggle Section Hero -->
                  <div class="form-group" style="padding: 14px 16px; background: #ffffff; border: 1px solid var(--border); border-radius: var(--radius-sm); margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; gap: 12px;">
                    <div>
                      <div style="font-size: 13px; font-weight: 700; color: var(--text-main);">Tampilkan Bagian Hero di Beranda</div>
                      <div style="font-size: 11px; color: var(--text-dim); margin-top: 2px;">Aktifkan banner sambutan besar di atas daftar artikel beranda.</div>
                    </div>
                    <label class="toggle-switch" title="Toggle On/Off Bagian Hero">
                      <input type="checkbox" name="showHero" id="panel3-showHero" value="true" ${currentSelectedTheme?.settings?.showHero !== false ? 'checked' : ''} onchange="renderHeroMiniPreview()" />
                      <span class="toggle-slider"></span>
                    </label>
                  </div>

                  <div style="background: var(--surface-subtle); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 18px; margin-bottom: 20px;">
                    <div style="font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); margin-bottom: 14px;">
                      📝 Teks & Tipografi Hero
                    </div>

                    <div class="grid-2" style="margin-bottom: 14px;">
                      <div class="form-group" style="margin-bottom: 0;">
                        <label class="form-label">Teks Badge Kapsul (Pill Tagline)</label>
                        <input type="text" name="heroBadge" id="panel3-heroBadge" class="form-control" value="${currentSelectedTheme?.settings?.heroBadge || '✨ Selamat Datang di Blogs'}" placeholder="misal: ✨ Selamat Datang" oninput="renderHeroMiniPreview()" />
                      </div>

                      <div class="form-group" style="margin-bottom: 0;">
                        <label class="form-label">Perataan Konten (Alignment)</label>
                        <select name="heroAlign" id="panel3-heroAlign" class="form-control" onchange="renderHeroMiniPreview()">
                          <option value="center" ${currentSelectedTheme?.settings?.heroAlign === 'center' || !currentSelectedTheme?.settings?.heroAlign ? 'selected' : ''}>Rata Tengah (Center - Rekomendasi)</option>
                          <option value="left" ${currentSelectedTheme?.settings?.heroAlign === 'left' ? 'selected' : ''}>Rata Kiri (Modern Editorial)</option>
                        </select>
                      </div>
                    </div>

                    <div class="form-group" style="margin-bottom: 14px;">
                      <label class="form-label">Judul Utama (Headline)</label>
                      <input type="text" name="heroTitle" id="panel3-heroTitle" class="form-control" value="${currentSelectedTheme?.settings?.heroTitle || 'Catatan, Cerita & Wawasan Terkurasi'}" placeholder="Judul besar beranda..." style="font-weight: 800; font-size: 15px;" oninput="renderHeroMiniPreview()" />
                    </div>

                    <div class="form-group" style="margin-bottom: 0;">
                      <label class="form-label">Subjudul / Deskripsi Pendek</label>
                      <textarea name="heroSubtitle" id="panel3-heroSubtitle" class="form-control" rows="2" style="resize: vertical; font-size: 13px;" oninput="renderHeroMiniPreview()">${currentSelectedTheme?.settings?.heroSubtitle || 'Eksplorasi artikel mendalam seputar teknologi, tutorial, dan catatan penulis pilihan.'}</textarea>
                    </div>
                  </div>

                  <!-- Tombol Call To Action -->
                  <div style="background: var(--surface-subtle); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 18px; margin-bottom: 20px;">
                    <div style="font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); margin-bottom: 14px;">
                      🔘 Tombol Aksi (Call To Action Buttons)
                    </div>

                    <div class="grid-2" style="margin-bottom: 14px;">
                      <div class="form-group" style="margin-bottom: 0;">
                        <label class="form-label">Tombol Utama: Label Teks</label>
                        <input type="text" name="heroCtaText" id="panel3-heroCtaText" class="form-control" value="${currentSelectedTheme?.settings?.heroCtaText || 'Mulai Membaca 🚀'}" placeholder="misal: Mulai Membaca 🚀" oninput="renderHeroMiniPreview()" />
                      </div>
                      <div class="form-group" style="margin-bottom: 0;">
                        <label class="form-label">Tombol Utama: URL Target</label>
                        <input type="text" name="heroCtaUrl" id="panel3-heroCtaUrl" class="form-control" value="${currentSelectedTheme?.settings?.heroCtaUrl || '#posts'}" placeholder="misal: #posts atau /read" oninput="renderHeroMiniPreview()" />
                      </div>
                    </div>

                    <div class="grid-2">
                      <div class="form-group" style="margin-bottom: 0;">
                        <label class="form-label">Tombol Kedua: Label Teks (Opsional)</label>
                        <input type="text" name="heroSecondaryCtaText" id="panel3-heroSecondaryCtaText" class="form-control" value="${currentSelectedTheme?.settings?.heroSecondaryCtaText || 'Tentang Kami'}" placeholder="misal: Tentang Kami" oninput="renderHeroMiniPreview()" />
                      </div>
                      <div class="form-group" style="margin-bottom: 0;">
                        <label class="form-label">Tombol Kedua: URL Target</label>
                        <input type="text" name="heroSecondaryCtaUrl" id="panel3-heroSecondaryCtaUrl" class="form-control" value="${currentSelectedTheme?.settings?.heroSecondaryCtaUrl || '/page'}" placeholder="misal: /page" oninput="renderHeroMiniPreview()" />
                      </div>
                    </div>
                  </div>

                  <!-- Pratinjau Mini Hero -->
                  <div>
                    <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-dim); margin-bottom: 8px;">
                      👁️ Pratinjau Tampilan Hero
                    </div>
                    <div id="hero-mini-preview-box" style="background: #ffffff; border: 1px dashed var(--border); border-radius: var(--radius-sm); padding: 32px 20px; text-align: center;">
                    </div>
                  </div>
                </div>

                <!-- Section 4: Desain Kartu Artikel (Post Card) (Terisolasi) -->
                <div class="theme-setting-section-card" id="section-postcard" style="display: none;">
                  <div class="section-card-title">
                    <span>🃏</span>
                    <span>4. Desain Kartu Artikel (Post Card)</span>
                  </div>
                  <div class="section-card-desc">Atur tampilan grid kartu artikel, thumbnail cover, sudut lengkungan, dan metadata postingan pada beranda.</div>

                  <!-- Grid Layout & Radius -->
                  <div style="background: var(--surface-subtle); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 18px; margin-bottom: 20px;">
                    <div style="font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); margin-bottom: 14px;">
                      📐 Format Grid & Bentuk Kapsul
                    </div>

                    <div class="grid-3" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px;">
                      <div class="form-group" style="margin-bottom: 0;">
                        <label class="form-label">Gaya Layout Grid</label>
                        <select name="postCardLayout" id="panel3-postCardLayout" class="form-control" onchange="renderPostCardMiniPreview()">
                          <option value="grid-3" ${currentSelectedTheme?.settings?.postCardLayout === 'grid-3' || !currentSelectedTheme?.settings?.postCardLayout ? 'selected' : ''}>3 Kolom (Modern Grid)</option>
                          <option value="grid-2" ${currentSelectedTheme?.settings?.postCardLayout === 'grid-2' ? 'selected' : ''}>2 Kolom (Lebar)</option>
                          <option value="list" ${currentSelectedTheme?.settings?.postCardLayout === 'list' ? 'selected' : ''}>List Vertikal (Editorial)</option>
                        </select>
                      </div>

                      <div class="form-group" style="margin-bottom: 0;">
                        <label class="form-label">Lengkungan Sudut Kartu</label>
                        <select name="postCardRadius" id="panel3-postCardRadius" class="form-control" onchange="renderPostCardMiniPreview()">
                          <option value="16px" ${currentSelectedTheme?.settings?.postCardRadius === '16px' ? 'selected' : ''}>16px (Standard Rounded)</option>
                          <option value="20px" ${currentSelectedTheme?.settings?.postCardRadius === '20px' || !currentSelectedTheme?.settings?.postCardRadius ? 'selected' : ''}>20px (Capsule Medium)</option>
                          <option value="24px" ${currentSelectedTheme?.settings?.postCardRadius === '24px' ? 'selected' : ''}>24px (Pill Aerodynamic)</option>
                        </select>
                      </div>

                      <div class="form-group" style="margin-bottom: 0;">
                        <label class="form-label">Sumber Artikel Beranda</label>
                        <select name="postCardFruitSource" id="panel3-postCardFruitSource" class="form-control">
                          <option value="all" ${currentSelectedTheme?.settings?.postCardFruitSource === 'all' || !currentSelectedTheme?.settings?.postCardFruitSource ? 'selected' : ''}>Semua Fruit Artikel</option>
                          ${fruits.filter(f => f.config?.targetType === 'post').map(f => `<option value="${f.name}" ${currentSelectedTheme?.settings?.postCardFruitSource === f.name ? 'selected' : ''}>Fruit: ${f.name}</option>`).join('')}
                        </select>
                      </div>
                    </div>
                  </div>

                  <!-- Toggles Komponen Kartu -->
                  <div style="background: var(--surface-subtle); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 18px; margin-bottom: 20px;">
                    <div style="font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); margin-bottom: 14px;">
                      👁️ Elemen & Metadata yang Ditampilkan
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                      <div class="form-group" style="padding: 12px 14px; background: #ffffff; border: 1px solid var(--border); border-radius: var(--radius-sm); margin: 0; display: flex; align-items: center; justify-content: space-between; gap: 10px;">
                        <div>
                          <div style="font-size: 13px; font-weight: 700; color: var(--text-main);">Gambar Cover / Thumbnail</div>
                          <div style="font-size: 11px; color: var(--text-dim); margin-top: 1px;">Tampilkan foto Open Graph di bagian atas kartu.</div>
                        </div>
                        <label class="toggle-switch">
                          <input type="checkbox" name="showCardCover" id="panel3-showCardCover" value="true" ${currentSelectedTheme?.settings?.showCardCover !== false ? 'checked' : ''} onchange="renderPostCardMiniPreview()" />
                          <span class="toggle-slider"></span>
                        </label>
                      </div>

                      <div class="form-group" style="padding: 12px 14px; background: #ffffff; border: 1px solid var(--border); border-radius: var(--radius-sm); margin: 0; display: flex; align-items: center; justify-content: space-between; gap: 10px;">
                        <div>
                          <div style="font-size: 13px; font-weight: 700; color: var(--text-main);">Badge Kategori Kapsul</div>
                          <div style="font-size: 11px; color: var(--text-dim); margin-top: 1px;">Label pil kategori di atas judul artikel.</div>
                        </div>
                        <label class="toggle-switch">
                          <input type="checkbox" name="showCardCategory" id="panel3-showCardCategory" value="true" ${currentSelectedTheme?.settings?.showCardCategory !== false ? 'checked' : ''} onchange="renderPostCardMiniPreview()" />
                          <span class="toggle-slider"></span>
                        </label>
                      </div>

                      <div class="form-group" style="padding: 12px 14px; background: #ffffff; border: 1px solid var(--border); border-radius: var(--radius-sm); margin: 0; display: flex; align-items: center; justify-content: space-between; gap: 10px;">
                        <div>
                          <div style="font-size: 13px; font-weight: 700; color: var(--text-main);">Tanggal Publikasi</div>
                          <div style="font-size: 11px; color: var(--text-dim); margin-top: 1px;">Tampilkan tanggal rilis artikel di footer kartu.</div>
                        </div>
                        <label class="toggle-switch">
                          <input type="checkbox" name="showCardDate" id="panel3-showCardDate" value="true" ${currentSelectedTheme?.settings?.showCardDate !== false ? 'checked' : ''} onchange="renderPostCardMiniPreview()" />
                          <span class="toggle-slider"></span>
                        </label>
                      </div>

                      <div class="form-group" style="padding: 12px 14px; background: #ffffff; border: 1px solid var(--border); border-radius: var(--radius-sm); margin: 0; display: flex; align-items: center; justify-content: space-between; gap: 10px;">
                        <div>
                          <div style="font-size: 13px; font-weight: 700; color: var(--text-main);">Info Penulis (Author)</div>
                          <div style="font-size: 11px; color: var(--text-dim); margin-top: 1px;">Tampilkan avatar dan nama penulis artikel.</div>
                        </div>
                        <label class="toggle-switch">
                          <input type="checkbox" name="showCardAuthor" id="panel3-showCardAuthor" value="true" ${currentSelectedTheme?.settings?.showCardAuthor !== false ? 'checked' : ''} onchange="renderPostCardMiniPreview()" />
                          <span class="toggle-slider"></span>
                        </label>
                      </div>

                      <div class="form-group" style="grid-column: 1 / -1; padding: 12px 14px; background: #ffffff; border: 1px solid var(--border); border-radius: var(--radius-sm); margin: 0; display: flex; align-items: center; justify-content: space-between; gap: 10px;">
                        <div>
                          <div style="font-size: 13px; font-weight: 700; color: var(--text-main);">Ringkasan Artikel (Excerpt)</div>
                          <div style="font-size: 11px; color: var(--text-dim); margin-top: 1px;">Tampilkan cuplikan deskripsi artikel maksimal 3 baris.</div>
                        </div>
                        <label class="toggle-switch">
                          <input type="checkbox" name="showCardExcerpt" id="panel3-showCardExcerpt" value="true" ${currentSelectedTheme?.settings?.showCardExcerpt !== false ? 'checked' : ''} onchange="renderPostCardMiniPreview()" />
                          <span class="toggle-slider"></span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <!-- Pratinjau Mini Post Card -->
                  <div>
                    <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-dim); margin-bottom: 8px;">
                      👁️ Pratinjau Contoh Kartu Artikel
                    </div>
                    <div id="postcard-mini-preview-box" style="background: var(--surface-subtle); border: 1px dashed var(--border); border-radius: var(--radius-sm); padding: 24px; display: flex; justify-content: center;">
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </main>
        </div>
      ` : `
        <div class="ws-body">
          <div class="ws-inner">
            ${(isCreating || !activeFruit ? `
            <!-- CREATE FRUIT FORM (HUBUNGKAN NOTION DATABASE) -->
            <div class="card" style="margin-top: 10px;">
              <div class="card-title" style="font-size: 18px; margin-bottom: 6px;">
                <span>+ Hubungkan Database Notion Baru</span>
              </div>
              <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 20px;">
                1 Fruit mewakili 1 Database Notion (post_type, authors, atau page). Satu database menampung banyak baris konten.
              </p>

              <form action="/api/create-fruit" method="POST">
                <div class="form-group">
                  <label class="form-label">Nama Fruit (Folder Workspace)</label>
                  <input type="text" name="name" class="form-control" placeholder="misal: read, pelajaran, authors, atau page" required />
                </div>

                <div class="form-group">
                  <label class="form-label">Target Mapping Fruit</label>

                  <!-- Level 1: 3 Kategori Utama -->
                  <div style="display: flex; gap: 8px; margin-bottom: 12px;">
                    <button type="button" class="btn-target-cat active" id="create_cat_post" onclick="switchTargetCategory('post_type', 'create_')">
                      📝 read (post_type)
                    </button>
                    <button type="button" class="btn-target-cat" id="create_cat_authors" onclick="switchTargetCategory('authors', 'create_')">
                      👤 authors
                    </button>
                    <button type="button" class="btn-target-cat" id="create_cat_page" onclick="switchTargetCategory('page', 'create_')">
                      📄 page
                    </button>
                  </div>

                  <!-- Level 2: List yang sudah tersedia ATAU Buat Baru -->
                  <div style="background: var(--surface-subtle); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 16px;">
                    <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--text-dim); margin-bottom: 10px;">
                      Pilih dari List yang Tersedia atau Buat Baru:
                    </div>

                    <div style="display: flex; flex-direction: column; gap: 12px;">
                      <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                        <input type="radio" id="create_radio_existing" name="create_targetMode" value="existing" checked onchange="toggleMappingMode('existing', 'create_')" />
                        <span style="font-size: 13px; font-weight: 600;">List yang sudah tersedia:</span>
                        <select id="create_select_existing" class="form-control" style="width: auto; min-width: 200px; padding: 6px 12px; font-size: 13px;" onchange="updateRealTargetFromSelect('create_')">
                          <option value="read">read (post_type)</option>
                          <option value="blog">blog</option>
                          <option value="post">post</option>
                          <option value="pelajaran">pelajaran</option>
                        </select>
                      </label>

                      <label id="create_wrap_new" style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                        <input type="radio" id="create_radio_new" name="create_targetMode" value="new" onchange="toggleMappingMode('new', 'create_')" />
                        <span style="font-size: 13px; font-weight: 600;">Atau Buat Baru:</span>
                        <input type="text" id="create_input_new" class="form-control" style="width: 320px; padding: 6px 12px; font-size: 13px;" placeholder="Ketik nama post_type baru (misal: news, tutorial)" oninput="updateRealTargetFromInput('create_')" disabled />
                      </label>

                      <div id="create_hint_info" style="font-size: 11px; color: var(--text-muted); margin-left: 24px;">
                        Post type berisi banyak artikel (misal: read, blog, pelajaran).
                      </div>
                    </div>

                    <input type="hidden" id="create_real_target_type" name="targetType" value="read" />
                  </div>
                </div>

                <div class="grid-2">
                  <div class="form-group">
                    <label class="form-label">Notion API Key (Secret)</label>
                    <input type="password" name="apiKey" class="form-control" value="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" placeholder="ntn_xxxxxx" required />
                  </div>
                  <div class="form-group">
                    <label class="form-label">Database ID di Notion</label>
                    <input type="text" name="databaseId" class="form-control" placeholder="32 digit ID database" required />
                  </div>
                </div>

                <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 10px;">
                  ${fruits.length > 0 ? `<a href="/?fruit=${encodeURIComponent(fruits[0].name)}" style="padding: 10px 18px; text-decoration: none; font-size: 13px; color: var(--text-muted);">Batal</a>` : ''}
                  <button type="submit" class="btn-save">🍉 Hubungkan Database Notion</button>
                </div>
              </form>
            </div>

          ` : `
            <!-- ACTIVE FRUIT WORKSPACE WITH TABS -->

            <!-- Quick Stats Row -->
            <div class="stats-row">
              <div class="stat-card">
                <div class="stat-label">Total Konten</div>
                <div class="stat-value">${items.length} <span>baris</span></div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Tipe Target</div>
                <div class="stat-value" style="font-size: 15px;">${targetType}</div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Terakhir Ditarik</div>
                <div class="stat-value" style="font-size: 13px; font-weight: 600;">
                  ${activeFruit.config?.lastSyncAt ? new Date(activeFruit.config.lastSyncAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB' : 'Belum pernah'}
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Status Sinkronisasi</div>
                <div class="stat-value" style="font-size: 14px; color: var(--primary);">🟢 Siap / Aktif</div>
              </div>
            </div>

            <!-- Modern Tabs Bar -->
            <div class="tabs-nav">
              <button type="button" class="tab-btn active" id="tab-btn-content" onclick="switchWsTab('content')">
                <span>📄 Konten Ditarik</span>
                <span class="tab-badge">${items.length}</span>
              </button>
              <button type="button" class="tab-btn" id="tab-btn-mapping" onclick="switchWsTab('mapping')">
                <span>⚡ Pemetaan Kolom (Schema)</span>
              </button>
              <button type="button" class="tab-btn" id="tab-btn-settings" onclick="switchWsTab('settings')">
                <span>🔑 Pengaturan Notion</span>
              </button>
            </div>

            <!-- TAB 1: KONTEN DITARIK -->
            <div id="tab-pane-content" class="tab-pane">
              <div class="card">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
                  <div class="card-title" style="margin: 0;">
                    <span>📋 Daftar Konten (${items.length} Baris Ditarik)</span>
                  </div>
                  <span style="font-size: 12px; color: var(--text-dim);">Tersimpan lokal di <code>fruits/${activeFruit.name}/dist/</code></span>
                </div>

                <!-- Quick Search -->
                <div class="search-filter-box">
                  <input type="text" id="content-search-input" class="search-input" placeholder="🔍 Cari konten berdasarkan judul..." oninput="filterContentTable()" />
                </div>

                ${items.length === 0 ? `
                  <div class="empty-state">
                    <div style="font-size: 36px; margin-bottom: 8px;">📭</div>
                    <div style="font-size: 14px; font-weight: 700; margin-bottom: 4px;">Belum Ada Data yang Ditarik</div>
                    <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 16px;">
                      Klik tombol <strong>"⚡ Tarik Data Notion"</strong> di kanan atas untuk menarik seluruh baris database & blok konten dari Notion.
                    </p>
                  </div>
                ` : `
                  <div class="table-container">
                    <table id="content-table">
                      <thead>
                        <tr>
                          ${isAuthor ? `
                            <th>Nama Penulis</th>
                            <th>Bio</th>
                            <th>Role</th>
                            <th>Foto</th>
                            <th>Artikel Ditulis</th>
                            <th style="text-align: right;">Aksi</th>
                          ` : (isPage ? `
                            <th>Judul Halaman</th>
                            <th>URL Slug</th>
                            <th>Tanggal</th>
                            <th>Status</th>
                            <th style="text-align: right;">Aksi</th>
                          ` : `
                            <th>Judul Post</th>
                            <th>URL Slug</th>
                            <th>Tanggal</th>
                            <th>Penulis</th>
                            <th>Status</th>
                            <th style="text-align: right;">Aksi</th>
                          `)}
                        </tr>
                      </thead>
                      <tbody>
                        ${items.map(row => {
                          const core = manager.resolveItemCoreFields(row, mappedCols);

                          if (isAuthor) {
                            const authorPosts = allPosts.filter(post => {
                              const authorIds = post.properties?.Authors?.value || post.properties?.[mappedCols.authors]?.value || [];
                              return Array.isArray(authorIds) && authorIds.includes(row.id);
                            });

                            return `
                              <tr class="content-row">
                                <td>
                                  <strong class="row-title">${core.title}</strong>
                                  <div style="font-size: 11px; color: var(--text-dim); margin-top: 1px;">ID: ${row.id.slice(0, 8)}...</div>
                                </td>
                                <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${core.bio || '-'}</td>
                                <td>${Array.isArray(core.role) ? core.role.join(', ') : (core.role || '-')}</td>
                                <td>${core.pic ? `<img src="${core.pic}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; border: 1px solid var(--border);" />` : '-'}</td>
                                <td>
                                  <span style="font-weight: 700; color: var(--primary);">📚 ${authorPosts.length} artikel</span>
                                </td>
                                <td style="text-align: right;">
                                  <div style="display: inline-flex; gap: 6px; align-items: center;">
                                    <button type="button" class="btn-view-html" onclick="openLivePreviewModalWithItem('${row.id}')">
                                      👁️ Preview
                                    </button>
                                    <form action="/api/delete-item" method="POST" style="margin: 0;" onsubmit="return confirm('Hapus baris ini dari cache lokal?');">
                                      <input type="hidden" name="fruitName" value="${activeFruit.name}" />
                                      <input type="hidden" name="itemId" value="${row.id}" />
                                      <button type="submit" class="btn-del-mini" title="Hapus dari cache lokal">🗑️</button>
                                    </form>
                                  </div>
                                </td>
                              </tr>
                            `;
                          } else if (isPage) {
                            return `
                              <tr class="content-row">
                                <td>
                                  <strong class="row-title">${core.title}</strong>
                                  <div style="font-size: 11px; color: var(--text-dim); margin-top: 1px;">ID: ${row.id.slice(0, 8)}...</div>
                                </td>
                                <td><code style="font-size: 12px; background: var(--surface-subtle); padding: 2px 6px; border-radius: 4px;">${core.slug || '-'}</code></td>
                                <td>${core.date || '-'}</td>
                                <td>
                                  <span class="status-pill ${core.published ? 'status-published' : 'status-draft'}">
                                    ${core.published ? '● Published' : '○ Draft'}
                                  </span>
                                </td>
                                <td style="text-align: right;">
                                  <div style="display: inline-flex; gap: 6px; align-items: center;">
                                    <button type="button" class="btn-view-html" onclick="openLivePreviewModalWithItem('${row.id}')">
                                      👁️ Preview
                                    </button>
                                    <form action="/api/delete-item" method="POST" style="margin: 0;" onsubmit="return confirm('Hapus baris ini dari cache lokal?');">
                                      <input type="hidden" name="fruitName" value="${activeFruit.name}" />
                                      <input type="hidden" name="itemId" value="${row.id}" />
                                      <button type="submit" class="btn-del-mini" title="Hapus dari cache lokal">🗑️</button>
                                    </form>
                                  </div>
                                </td>
                              </tr>
                            `;
                          } else {
                            const authorRel = core.authors || [];
                            const authorPills = authorRel.map(aId => {
                              const match = authorsList.find(a => a.id === aId);
                              if (match) {
                                return `
                                  <div style="display: flex; align-items: center; gap: 8px;">
                                    ${match.pic ? `<img src="${match.pic}" style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover; border: 1px solid var(--border);" />` : '<span style="font-size: 14px;">👤</span>'}
                                    <div>
                                      <div style="font-weight: 700; color: var(--text); line-height: 1.1; font-size: 12px;">${match.name}</div>
                                    </div>
                                  </div>
                                `;
                              }
                              return `<span style="font-size: 11px; color: var(--text-dim);">${aId.slice(0, 8)}...</span>`;
                            }).join('') || '<span style="color: var(--text-dim);">-</span>';

                            return `
                              <tr class="content-row">
                                <td>
                                  <strong class="row-title">${core.title}</strong>
                                  <div style="font-size: 11px; color: var(--text-dim); margin-top: 1px;">ID: ${row.id.slice(0, 8)}...</div>
                                </td>
                                <td><code style="font-size: 12px; background: var(--surface-subtle); padding: 2px 6px; border-radius: 4px;">${core.slug || '-'}</code></td>
                                <td>${core.date || '-'}</td>
                                <td>${authorPills}</td>
                                <td>
                                  <span class="status-pill ${core.published ? 'status-published' : 'status-draft'}">
                                    ${core.published ? '● Published' : '○ Draft'}
                                  </span>
                                </td>
                                <td style="text-align: right;">
                                  <div style="display: inline-flex; gap: 6px; align-items: center;">
                                    <button type="button" class="btn-view-html" onclick="openLivePreviewModalWithItem('${row.id}')">
                                      👁️ Preview
                                    </button>
                                    <form action="/api/delete-item" method="POST" style="margin: 0;" onsubmit="return confirm('Hapus baris ini dari cache lokal?');">
                                      <input type="hidden" name="fruitName" value="${activeFruit.name}" />
                                      <input type="hidden" name="itemId" value="${row.id}" />
                                      <button type="submit" class="btn-del-mini" title="Hapus dari cache lokal">🗑️</button>
                                    </form>
                                  </div>
                                </td>
                              </tr>
                            `;
                          }
                        }).join('')}
                      </tbody>
                    </table>
                  </div>
                `}
              </div>
            </div>

            <!-- TAB 2: PEMETAAN KOLOM (SCHEMA & MAPPING) -->
            <div id="tab-pane-mapping" class="tab-pane" style="display: none;">
              <div class="card">
                <div class="card-title">
                  <span>⚡ Skema & Pemetaan Kolom Notion</span>
                  <span class="badge-core">Smart Column Mapper</span>
                </div>
                <div class="card-desc">
                  Fruition Mini otomatis mendeteksi kolom Notion Anda. Jika nama kolom di Notion berbeda (misal: <code>Nama</code> alih-alih <code>Title</code>), Anda dapat melakukan intervensi manual dengan memilih kolom yang tepat di bawah ini.
                </div>

                <form action="/api/save-mapping" method="POST">
                  <input type="hidden" name="fruitName" value="${activeFruit.name}" />

                  <div class="mapping-grid">
                    <!-- 1. TITLE / NAME -->
                    <div class="mapping-box">
                      <div class="mapping-box-label">
                        <span>1. Judul Utama (Title / Name)</span>
                        <span class="badge-core">Wajib Core</span>
                      </div>
                      <select name="title" class="form-control" style="font-weight: 600;">
                        ${discoveredProps.map(d => {
                          const isSel = (mappedCols.title || '').toLowerCase() === d.key.toLowerCase() || (!mappedCols.title && d.type === 'title');
                          return `<option value="${d.key}" ${isSel ? 'selected' : ''}>${d.key} (${d.type}) ${d.type === 'title' ? '★ Auto Title' : ''}</option>`;
                        }).join('')}
                      </select>
                      <div style="font-size: 11px; color: var(--text-dim);">Kolom Notion yang menjadi judul artikel atau halaman.</div>
                    </div>

                    <!-- 2. SLUG -->
                    <div class="mapping-box">
                      <div class="mapping-box-label">
                        <span>2. URL Slug (Permalink)</span>
                        <span class="badge-core">Wajib Core</span>
                      </div>
                      <select name="slug" class="form-control">
                        <option value="_auto_slug_" ${(!mappedCols.slug || mappedCols.slug === '_auto_slug_') ? 'selected' : ''}>✨ [Otomatis Generate dari Judul (slugify)]</option>
                        ${discoveredProps.filter(d => ['rich_text', 'title', 'select'].includes(d.type)).map(d => {
                          const isSel = mappedCols.slug === d.key;
                          return `<option value="${d.key}" ${isSel ? 'selected' : ''}>Gunakan kolom: ${d.key} (${d.type})</option>`;
                        }).join('')}
                      </select>
                      <div style="font-size: 11px; color: var(--text-dim);">Jika tidak ada kolom slug di Notion, sistem otomatis membuat dari judul.</div>
                    </div>

                    ${!isAuthor ? `
                      <!-- 3. AUTHORS RELATION -->
                      <div class="mapping-box">
                        <div class="mapping-box-label">
                          <span>3. Penulis (Authors Relation)</span>
                          <span class="badge-auto">Relation</span>
                        </div>
                        <select name="authors" class="form-control">
                          <option value="_none_" ${(!mappedCols.authors || mappedCols.authors === '_none_') ? 'selected' : ''}>— Tanpa Relasi Penulis —</option>
                          ${discoveredProps.filter(d => d.type === 'relation' || /author/i.test(d.key)).map(d => {
                            const isSel = (mappedCols.authors || '').toLowerCase() === d.key.toLowerCase();
                            return `<option value="${d.key}" ${isSel ? 'selected' : ''}>${d.key} (relation)</option>`;
                          }).join('')}
                        </select>
                        <div style="font-size: 11px; color: var(--text-dim);">Menghubungkan artikel ini ke database penulis (Authors).</div>
                      </div>

                      <!-- 4. DATE -->
                      <div class="mapping-box">
                        <div class="mapping-box-label">
                          <span>4. Tanggal Publikasi (Date)</span>
                          <span class="badge-auto">Date</span>
                        </div>
                        <select name="date" class="form-control">
                          <option value="_auto_created_" ${(!mappedCols.date || mappedCols.date === '_auto_created_') ? 'selected' : ''}>✨ [Waktu Buat Halaman Notion]</option>
                          ${discoveredProps.filter(d => d.type === 'date').map(d => {
                            const isSel = (mappedCols.date || '').toLowerCase() === d.key.toLowerCase();
                            return `<option value="${d.key}" ${isSel ? 'selected' : ''}>${d.key} (date)</option>`;
                          }).join('')}
                        </select>
                        <div style="font-size: 11px; color: var(--text-dim);">Untuk pengurutan dan tampilan tanggal artikel.</div>
                      </div>

                      <!-- 5. STATUS PUBLISHED -->
                      <div class="mapping-box">
                        <div class="mapping-box-label">
                          <span>5. Status Publikasi (Published)</span>
                          <span class="badge-auto">Status</span>
                        </div>
                        <select name="published" class="form-control">
                          <option value="_always_published_" ${(!mappedCols.published || mappedCols.published === '_always_published_') ? 'selected' : ''}>✨ [Selalu Publikasikan Semua Baris]</option>
                          ${discoveredProps.filter(d => ['checkbox', 'select'].includes(d.type)).map(d => {
                            const isSel = (mappedCols.published || '').toLowerCase() === d.key.toLowerCase();
                            return `<option value="${d.key}" ${isSel ? 'selected' : ''}>Gunakan kolom: ${d.key} (${d.type})</option>`;
                          }).join('')}
                        </select>
                        <div style="font-size: 11px; color: var(--text-dim);">Jika Notion tidak memiliki kolom status, semua baris otomatis terbit.</div>
                      </div>

                      <!-- 6. META DESCRIPTION -->
                      <div class="mapping-box">
                        <div class="mapping-box-label">
                          <span>6. Meta Description (SEO Ringkasan)</span>
                          <span class="badge-auto">SEO</span>
                        </div>
                        <select name="meta_description" class="form-control">
                          <option value="_none_" ${(!mappedCols.meta_description || mappedCols.meta_description === '_none_') ? 'selected' : ''}>— Kosongkan —</option>
                          ${discoveredProps.filter(d => ['rich_text'].includes(d.type)).map(d => {
                            const isSel = (mappedCols.meta_description || '').toLowerCase() === d.key.toLowerCase();
                            return `<option value="${d.key}" ${isSel ? 'selected' : ''}>${d.key} (rich_text)</option>`;
                          }).join('')}
                        </select>
                        <div style="font-size: 11px; color: var(--text-dim);">Ringkasan untuk kartu artikel dan meta tags SEO.</div>
                      </div>
                    ` : `
                      <!-- AUTHORS SPECIFIC FIELDS -->
                      <div class="mapping-box">
                        <div class="mapping-box-label">
                          <span>Bio Penulis</span>
                          <span class="badge-auto">Bio</span>
                        </div>
                        <select name="bio" class="form-control">
                          <option value="_none_" ${(!mappedCols.bio || mappedCols.bio === '_none_') ? 'selected' : ''}>— Kosongkan —</option>
                          ${discoveredProps.filter(d => ['rich_text'].includes(d.type)).map(d => {
                            const isSel = (mappedCols.bio || '').toLowerCase() === d.key.toLowerCase();
                            return `<option value="${d.key}" ${isSel ? 'selected' : ''}>${d.key} (rich_text)</option>`;
                          }).join('')}
                        </select>
                      </div>

                      <div class="mapping-box">
                        <div class="mapping-box-label">
                          <span>Role / Keahlian</span>
                          <span class="badge-auto">Role</span>
                        </div>
                        <select name="role" class="form-control">
                          <option value="_none_" ${(!mappedCols.role || mappedCols.role === '_none_') ? 'selected' : ''}>— Kosongkan —</option>
                          ${discoveredProps.filter(d => ['multi_select', 'select', 'rich_text'].includes(d.type)).map(d => {
                            const isSel = (mappedCols.role || '').toLowerCase() === d.key.toLowerCase();
                            return `<option value="${d.key}" ${isSel ? 'selected' : ''}>${d.key} (${d.type})</option>`;
                          }).join('')}
                        </select>
                      </div>

                      <div class="mapping-box">
                        <div class="mapping-box-label">
                          <span>Foto Profil (Pic)</span>
                          <span class="badge-auto">Avatar</span>
                        </div>
                        <select name="pic" class="form-control">
                          <option value="_none_" ${(!mappedCols.pic || mappedCols.pic === '_none_') ? 'selected' : ''}>— Kosongkan —</option>
                          ${discoveredProps.filter(d => ['files'].includes(d.type)).map(d => {
                            const isSel = (mappedCols.pic || '').toLowerCase() === d.key.toLowerCase();
                            return `<option value="${d.key}" ${isSel ? 'selected' : ''}>${d.key} (files)</option>`;
                          }).join('')}
                        </select>
                      </div>
                    `}

                    <!-- 7. COVER / THUMBNAIL (OG) -->
                    <div class="mapping-box">
                      <div class="mapping-box-label">
                        <span>${isAuthor ? 'Media Tambahan' : '7. Cover / Thumbnail (OG)'}</span>
                        <span class="badge-auto">Media</span>
                      </div>
                      <select name="og" class="form-control">
                        <option value="_none_" ${(!mappedCols.og || mappedCols.og === '_none_') ? 'selected' : ''}>— Tidak Ada Gambar Cover —</option>
                        ${discoveredProps.filter(d => ['files'].includes(d.type)).map(d => {
                          const isSel = (mappedCols.og || '').toLowerCase() === d.key.toLowerCase();
                          return `<option value="${d.key}" ${isSel ? 'selected' : ''}>${d.key} (files)</option>`;
                        }).join('')}
                      </select>
                      <div style="font-size: 11px; color: var(--text-dim);">Gambar thumbnail untuk kartu artikel dan media sosial.</div>
                    </div>
                  </div>

                  <div style="display: flex; justify-content: flex-end; align-items: center; gap: 12px; margin-top: 10px;">
                    <button type="submit" class="btn-save">💾 Simpan & Terapkan Pemetaan Kolom</button>
                  </div>
                </form>
              </div>

              <!-- Discovered Properties Raw Table -->
              <div class="card">
                <div class="card-title">
                  <span>📋 Seluruh Kolom di Database Notion "${activeFruit.config?.notion?.databaseTitle || activeFruit.name}"</span>
                </div>
                <div class="card-desc">Semua kolom yang berhasil dideteksi dari database Notion parent:</div>

                <div class="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Nama Kolom Notion</th>
                        <th>Tipe Data</th>
                        <th>Status Pemetaan</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${discoveredProps.map(d => {
                        const mappedToKey = Object.keys(mappedCols).find(k => (mappedCols[k] || '').toLowerCase() === d.key.toLowerCase());
                        const isTitle = d.type === 'title';

                        return `
                          <tr>
                            <td><strong>${d.key}</strong></td>
                            <td><span class="tag-prop-type">${d.type}</span></td>
                            <td>
                              ${isTitle ? '<span class="tag-required">★ Judul Utama (Title)</span>' : (mappedToKey ? `<span class="tag-required">Dipetakan ke: ${mappedToKey}</span>` : '<span class="tag-custom">Custom Property Notion</span>')}
                            </td>
                          </tr>
                        `;
                      }).join('')}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <!-- TAB 3: PENGATURAN NOTION -->
            <div id="tab-pane-settings" class="tab-pane" style="display: none;">
              <div class="card">
                <div class="card-title">
                  <span>🔑 Kredensial Database Notion</span>
                </div>
                <div class="card-desc">Ubah kredensial API Key atau Database ID untuk Fruit ini.</div>

                <form action="/api/save-config" method="POST">
                  <input type="hidden" name="fruitName" value="${activeFruit.name}" />

                  <div class="grid-2">
                    <div class="form-group">
                      <label class="form-label">Notion API Key</label>
                      <input type="password" name="apiKey" class="form-control" value="${activeFruit.config?.notion?.apiKey || ''}" required />
                    </div>
                    <div class="form-group">
                      <label class="form-label">Notion Database ID</label>
                      <input type="text" name="databaseId" class="form-control" value="${activeFruit.config?.notion?.databaseId || ''}" required />
                    </div>
                  </div>

                  <div class="form-group">
                    <label class="form-label">Target Mapping Fruit</label>

                    <!-- Level 1: 3 Kategori Utama -->
                    <div style="display: flex; gap: 8px; margin-bottom: 12px;">
                      <button type="button" class="btn-target-cat ${(!isAuthor && !isPage) ? 'active' : ''}" id="edit_cat_post" onclick="switchTargetCategory('post_type', 'edit_')">
                        📝 read (post_type)
                      </button>
                      <button type="button" class="btn-target-cat ${isAuthor ? 'active' : ''}" id="edit_cat_authors" onclick="switchTargetCategory('authors', 'edit_')">
                        👤 authors
                      </button>
                      <button type="button" class="btn-target-cat ${isPage ? 'active' : ''}" id="edit_cat_page" onclick="switchTargetCategory('page', 'edit_')">
                        📄 page
                      </button>
                    </div>

                    <!-- Level 2: List yang sudah tersedia ATAU Buat Baru -->
                    <div style="background: var(--surface-subtle); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 16px;">
                      <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--text-dim); margin-bottom: 10px;">
                        Pilih dari List yang Tersedia atau Buat Baru:
                      </div>

                      <div style="display: flex; flex-direction: column; gap: 12px;">
                        <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                          <input type="radio" id="edit_radio_existing" name="edit_targetMode" value="existing" checked onchange="toggleMappingMode('existing', 'edit_')" />
                          <span style="font-size: 13px; font-weight: 600;">List yang sudah tersedia:</span>
                          <select id="edit_select_existing" class="form-control" style="width: auto; min-width: 200px; padding: 6px 12px; font-size: 13px;" onchange="updateRealTargetFromSelect('edit_')">
                            ${isAuthor ? `
                              <option value="authors" selected>authors (database penulis)</option>
                            ` : (isPage ? `
                              <option value="page" selected>page (database seluruh static pages)</option>
                            ` : `
                              <option value="read" ${targetType === 'read' ? 'selected' : ''}>read (post_type)</option>
                              <option value="post" ${targetType === 'post' ? 'selected' : ''}>post</option>
                              <option value="blog" ${targetType === 'blog' ? 'selected' : ''}>blog</option>
                              ${targetType !== 'read' && targetType !== 'post' && targetType !== 'blog' ? `<option value="${targetType}" selected>${targetType} (post_type)</option>` : ''}
                            `)}
                          </select>
                        </label>

                        <label id="edit_wrap_new" style="display: flex; align-items: center; gap: 10px; cursor: pointer; ${isAuthor || isPage ? 'display: none;' : ''}">
                          <input type="radio" id="edit_radio_new" name="edit_targetMode" value="new" onchange="toggleMappingMode('new', 'edit_')" ${isAuthor || isPage ? 'disabled' : ''} />
                          <span style="font-size: 13px; font-weight: 600;">Atau Buat Baru:</span>
                          <input type="text" id="edit_input_new" class="form-control" style="width: 320px; padding: 6px 12px; font-size: 13px;" placeholder="Ketik nama post_type baru (misal: pelajaran, tutorial, news)" oninput="updateRealTargetFromInput('edit_')" disabled />
                        </label>

                        <div id="edit_hint_info" style="font-size: 11px; color: var(--text-muted); margin-left: 24px;">
                          ${isAuthor ? 'Authors hanya 1 jenis database tunggal.' : (isPage ? 'Database Page menampung banyak baris halaman (about, contact, dll.).' : 'Post type berisi banyak artikel (misal: read, blog, pelajaran).')}
                        </div>
                      </div>

                      <input type="hidden" id="edit_real_target_type" name="targetType" value="${targetType}" />
                    </div>
                  </div>

                  <button type="submit" class="btn-save">Simpan Perubahan Kredensial</button>
                </form>
              </div>

              <!-- Danger Zone -->
              <div class="card" style="border-color: #fecaca; background: #fff5f5;">
                <div class="card-title" style="color: #b91c1c;">
                  <span>⚠️ Danger Zone</span>
                </div>
                <div class="card-desc" style="color: #991b1b;">Menghapus fruit ini akan menghapus folder lokal <code>fruits/${activeFruit.name}</code> beserta file cache dan static HTML-nya.</div>

                <form action="/api/delete-fruit" method="POST" onsubmit="return confirm('Apakah Anda yakin ingin menghapus fruit \\'${activeFruit.name}\\' beserta seluruh file lokalnya?');">
                  <input type="hidden" name="fruitName" value="${activeFruit.name}" />
                  <button type="submit" style="padding: 9px 18px; background: #dc2626; color: #ffffff; border: none; border-radius: var(--radius-sm); font-size: 13px; font-weight: 700; cursor: pointer;">
                    🗑️ Hapus Fruit "${activeFruit.name}"
                  </button>
                </form>
              </div>
            </div>
          `)}

          </div>
        </div>
      `}
    </main>

  </div>

  <!-- =========================================================
       LIVE THEME PREVIEW MODAL (KHUSUS PREVIEW HASIL TEMA)
       ========================================================= -->
  <div class="preview-modal-backdrop" id="live-preview-modal" onclick="if(event.target === this) closeLivePreviewModal()">
    <div class="preview-modal-dialog">
      <!-- Modal Header Toolbar -->
      <div class="preview-modal-header">
        <div class="preview-controls-left">
          <span style="font-size: 15px; font-weight: 800; color: var(--text); display: flex; align-items: center; gap: 6px;">
            <span>👁️</span>
            <span>Live Preview Website</span>
          </span>

          <!-- Article selector -->
          ${items.length > 0 ? `
            <select id="modal-article-select" class="form-control" style="width: auto; max-width: 260px; padding: 5px 10px; font-size: 12px; font-weight: 600;" onchange="changeModalArticle(this.value)">
              ${items.map(it => {
                const c = manager.resolveItemCoreFields(it, mappedCols);
                return `<option value="${it.id}">${c.title}</option>`;
              }).join('')}
            </select>
          ` : ''}
        </div>

        <!-- Center: Device view switcher -->
        <div class="preview-controls-center">
          <button type="button" class="btn-device active" id="btn-device-desktop" onclick="switchPreviewDevice('desktop')">
            <span>🖥️</span> Desktop
          </button>
          <button type="button" class="btn-device" id="btn-device-tablet" onclick="switchPreviewDevice('tablet')">
            <span>💻</span> Tablet
          </button>
          <button type="button" class="btn-device" id="btn-device-mobile" onclick="switchPreviewDevice('mobile')">
            <span>📱</span> Mobile
          </button>
        </div>

        <!-- Right: Actions & close -->
        <div class="preview-controls-right">
          <button type="button" class="btn-view-html" onclick="openActivePreviewInNewTab()" style="padding: 6px 12px; font-size: 12px;">
            <span>↗</span> Tab Baru
          </button>

          <button type="button" class="btn-close-modal" onclick="closeLivePreviewModal()" title="Tutup Preview">
            ✕
          </button>
        </div>
      </div>

      <!-- Modal Body (Iframe) -->
      <div class="preview-modal-body">
        <div class="iframe-device-container" id="iframe-device-container">
          <iframe id="preview-iframe" src="about:blank"></iframe>
        </div>
      </div>
    </div>
  </div>

  <script>
    // Tab switcher
    function switchWsTab(tabId) {
      const panes = document.querySelectorAll('.tab-pane');
      panes.forEach(p => p.style.display = 'none');

      const btns = document.querySelectorAll('.tab-btn');
      btns.forEach(b => b.classList.remove('active'));

      const targetPane = document.getElementById('tab-pane-' + tabId);
      const targetBtn = document.getElementById('tab-btn-' + tabId);

      if (targetPane) targetPane.style.display = 'block';
      if (targetBtn) targetBtn.classList.add('active');

      try { sessionStorage.setItem('active_ws_tab', tabId); } catch(e) {}
    }

    // Restore last active tab if present
    document.addEventListener('DOMContentLoaded', () => {
      try {
        const saved = sessionStorage.getItem('active_ws_tab');
        if (saved && document.getElementById('tab-pane-' + saved)) {
          switchWsTab(saved);
        }
      } catch(e) {}
      initDraggableFruits();
    });

    // Content table live search filter
    function filterContentTable() {
      const input = document.getElementById('content-search-input');
      const filter = input.value.toLowerCase();
      const rows = document.querySelectorAll('.content-row');

      rows.forEach(row => {
        const titleEl = row.querySelector('.row-title');
        const text = titleEl ? titleEl.textContent.toLowerCase() : '';
        if (text.includes(filter)) {
          row.style.display = '';
        } else {
          row.style.display = 'none';
        }
      });
    }

    // Modal Live Preview Logic & Previous State Tracking
    let currentPreviewFruit = '${activeFruit ? encodeURIComponent(activeFruit.name) : (fruits[0] ? encodeURIComponent(fruits[0].name) : "")}';
    let currentPreviewPageId = '${firstItemId}';
    let previousWorkspaceState = null;

    function openLivePreviewModal() {
      const modal = document.getElementById('live-preview-modal');
      if (!modal) return;

      // Simpan state sebelumnya (elemen fokus & posisi scroll workspace) sebelum masuk ke Preview
      const wsPanel = document.querySelector('.panel-right-workspace');
      const themePanel = document.getElementById('theme-settings-panel');
      previousWorkspaceState = {
        activeElement: document.activeElement,
        wsScrollTop: wsPanel ? wsPanel.scrollTop : 0,
        themeScrollTop: themePanel ? themePanel.scrollTop : 0
      };

      modal.classList.add('open');
      updateIframeSrc();
    }

    function openLivePreviewModalWithItem(pageId) {
      currentPreviewPageId = pageId;
      const artSel = document.getElementById('modal-article-select');
      if (artSel) artSel.value = pageId;
      openLivePreviewModal();
    }

    function closeLivePreviewModal() {
      const modal = document.getElementById('live-preview-modal');
      if (modal) modal.classList.remove('open');
      const iframe = document.getElementById('preview-iframe');
      if (iframe) iframe.src = 'about:blank';

      // Kembalikan ke state sebelumnya (scroll & fokus)
      if (previousWorkspaceState) {
        const wsPanel = document.querySelector('.panel-right-workspace');
        const themePanel = document.getElementById('theme-settings-panel');
        if (wsPanel) wsPanel.scrollTop = previousWorkspaceState.wsScrollTop || 0;
        if (themePanel) themePanel.scrollTop = previousWorkspaceState.themeScrollTop || 0;
        if (previousWorkspaceState.activeElement && typeof previousWorkspaceState.activeElement.focus === 'function') {
          try { previousWorkspaceState.activeElement.focus(); } catch(e) {}
        }
      }
    }

    function togglePreviewAndBack() {
      const modal = document.getElementById('live-preview-modal');
      if (modal && modal.classList.contains('open')) {
        closeLivePreviewModal();
      } else {
        openLivePreviewModal();
      }
    }

    function triggerShortcutSave() {
      // 1. Jika di halaman pengaturan tema
      const themeForm = document.getElementById('form-theme-settings');
      if (themeForm) {
        if (typeof themeForm.requestSubmit === 'function') {
          themeForm.requestSubmit();
        } else {
          themeForm.submit();
        }
        return;
      }

      // 2. Jika di halaman tambah fruit baru
      const createForm = document.querySelector('form[action="/api/create-fruit"]');
      if (createForm) {
        if (typeof createForm.requestSubmit === 'function') {
          createForm.requestSubmit();
        } else {
          createForm.submit();
        }
        return;
      }

      // 3. Jika di tab pemetaan kolom (mapping)
      const mappingPane = document.getElementById('tab-pane-mapping');
      if (mappingPane && mappingPane.style.display !== 'none') {
        const mapForm = mappingPane.querySelector('form[action="/api/save-mapping"]');
        if (mapForm) {
          if (typeof mapForm.requestSubmit === 'function') mapForm.requestSubmit();
          else mapForm.submit();
          return;
        }
      }

      // 4. Jika di tab pengaturan Notion (settings)
      const settingsPane = document.getElementById('tab-pane-settings');
      if (settingsPane && settingsPane.style.display !== 'none') {
        const cfgForm = settingsPane.querySelector('form[action="/api/save-config"]');
        if (cfgForm) {
          if (typeof cfgForm.requestSubmit === 'function') cfgForm.requestSubmit();
          else cfgForm.submit();
          return;
        }
      }

      // Fallback: jika ada form save-mapping di halaman
      const fallbackMapForm = document.querySelector('form[action="/api/save-mapping"]');
      if (fallbackMapForm) {
        if (typeof fallbackMapForm.requestSubmit === 'function') fallbackMapForm.requestSubmit();
        else fallbackMapForm.submit();
      }
    }

    // Global Keyboard Shortcuts:
    // - Ctrl + S     = Save pengaturan aktif
    // - Ctrl + Space = Buka Preview / Kembali (Back) ke state sebelumnya
    document.addEventListener('keydown', (e) => {
      const isCtrl = e.ctrlKey || e.metaKey;

      // Ctrl + S = Save
      if (isCtrl && !e.shiftKey && !e.altKey && (e.key === 's' || e.key === 'S' || e.code === 'KeyS')) {
        e.preventDefault();
        triggerShortcutSave();
        return;
      }

      // Ctrl + Space = Preview / Back ke state sebelumnya
      if (isCtrl && !e.shiftKey && !e.altKey && (e.code === 'Space' || e.key === ' ')) {
        e.preventDefault();
        togglePreviewAndBack();
        return;
      }
    });

    // Terima event shortcut dari dalam iframe Live Preview
    window.addEventListener('message', (e) => {
      if (!e.data || e.data.type !== 'FRUITION_SHORTCUT') return;
      if (e.data.action === 'toggle-preview') {
        togglePreviewAndBack();
      } else if (e.data.action === 'save') {
        triggerShortcutSave();
      }
    });

    function changeModalArticle(pageId) {
      currentPreviewPageId = pageId;
      updateIframeSrc();
    }

    function updateIframeSrc() {
      if (!currentPreviewFruit || !currentPreviewPageId) return;
      const iframe = document.getElementById('preview-iframe');
      if (iframe) {
        iframe.src = '/preview?fruit=' + currentPreviewFruit + '&pageId=' + currentPreviewPageId;
      }
    }

    function switchPreviewDevice(device) {
      const container = document.getElementById('iframe-device-container');
      const btnDesk = document.getElementById('btn-device-desktop');
      const btnTab = document.getElementById('btn-device-tablet');
      const btnMob = document.getElementById('btn-device-mobile');

      btnDesk.classList.remove('active');
      btnTab.classList.remove('active');
      btnMob.classList.remove('active');

      container.classList.remove('device-tablet', 'device-mobile');

      if (device === 'tablet') {
        container.classList.add('device-tablet');
        btnTab.classList.add('active');
      } else if (device === 'mobile') {
        container.classList.add('device-mobile');
        btnMob.classList.add('active');
      } else {
        btnDesk.classList.add('active');
      }
    }

    function openActivePreviewInNewTab() {
      if (!currentPreviewFruit || !currentPreviewPageId) return;
      window.open('/preview?fruit=' + currentPreviewFruit + '&pageId=' + currentPreviewPageId, '_blank');
    }

    // =========================================================
    // DRAG AND DROP SORT UNTUK DAFTAR FRUIT
    // =========================================================
    function initDraggableFruits() {
      const container = document.getElementById('fruit-draggable-container');
      if (!container) return;

      let draggedItem = null;

      container.addEventListener('dragstart', (e) => {
        const item = e.target.closest('.fruit-menu-item');
        if (!item) return;
        draggedItem = item;
        item.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', item.dataset.fruitName);
      });

      container.addEventListener('dragend', () => {
        if (draggedItem) {
          draggedItem.classList.remove('dragging');
          draggedItem = null;
        }
        document.querySelectorAll('.fruit-menu-item').forEach(el => el.classList.remove('drag-over'));
      });

      container.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const target = e.target.closest('.fruit-menu-item');
        if (!target || target === draggedItem) return;

        const bounding = target.getBoundingClientRect();
        const offset = bounding.y + (bounding.height / 2);

        if (e.clientY - offset > 0) {
          target.style.borderBottom = '2px solid var(--primary)';
          target.style.borderTop = '';
        } else {
          target.style.borderTop = '2px solid var(--primary)';
          target.style.borderBottom = '';
        }
      });

      container.addEventListener('dragleave', (e) => {
        const target = e.target.closest('.fruit-menu-item');
        if (target) {
          target.style.borderTop = '';
          target.style.borderBottom = '';
        }
      });

      container.addEventListener('drop', async (e) => {
        e.preventDefault();
        const target = e.target.closest('.fruit-menu-item');
        if (!target || !draggedItem || target === draggedItem) return;

        target.style.borderTop = '';
        target.style.borderBottom = '';

        const bounding = target.getBoundingClientRect();
        const offset = bounding.y + (bounding.height / 2);

        if (e.clientY - offset > 0) {
          target.after(draggedItem);
        } else {
          target.before(draggedItem);
        }

        // Simpan urutan baru ke server & local
        const order = Array.from(container.querySelectorAll('.fruit-menu-item')).map(el => el.dataset.fruitName).filter(Boolean);
        try {
          await fetch('/api/reorder-fruits', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order })
          });
        } catch(err) {
          console.error('Error saving fruit order:', err);
        }
      });
    }

    function switchTargetCategory(cat, prefix) {
      const btnPost = document.getElementById(prefix + 'cat_post');
      const btnAuth = document.getElementById(prefix + 'cat_authors');
      const btnPage = document.getElementById(prefix + 'cat_page');
      const select = document.getElementById(prefix + 'select_existing');
      const inputNew = document.getElementById(prefix + 'input_new');
      const radioExisting = document.getElementById(prefix + 'radio_existing');
      const radioNew = document.getElementById(prefix + 'radio_new');
      const wrapNew = document.getElementById(prefix + 'wrap_new');
      const hint = document.getElementById(prefix + 'hint_info');

      if (btnPost) btnPost.classList.remove('active');
      if (btnAuth) btnAuth.classList.remove('active');
      if (btnPage) btnPage.classList.remove('active');

      if (select) select.innerHTML = '';

      if (cat === 'post_type') {
        if (btnPost) btnPost.classList.add('active');
        if (select) {
          select.innerHTML = '<option value="read">read (post_type)</option><option value="blog">blog</option><option value="post">post</option><option value="pelajaran">pelajaran</option>';
        }
        if (wrapNew) wrapNew.style.display = 'flex';
        if (radioNew) radioNew.disabled = false;
        if (inputNew) inputNew.placeholder = 'Ketik nama post_type baru (misal: pelajaran, tutorial, news)';
        if (hint) hint.innerText = 'Post type berisi banyak artikel (misal: read, blog, pelajaran).';
      } else if (cat === 'authors') {
        if (btnAuth) btnAuth.classList.add('active');
        if (select) {
          select.innerHTML = '<option value="authors">authors (database penulis)</option>';
        }
        if (wrapNew) wrapNew.style.display = 'none';
        if (radioExisting) radioExisting.checked = true;
        if (radioNew) radioNew.disabled = true;
        toggleMappingMode('existing', prefix);
        if (hint) hint.innerText = 'Authors hanya 1 jenis database tunggal yang menampung seluruh profil penulis.';
      } else if (cat === 'page') {
        if (btnPage) btnPage.classList.add('active');
        if (select) {
          select.innerHTML = '<option value="page">page (database seluruh static pages)</option>';
        }
        if (wrapNew) wrapNew.style.display = 'none';
        if (radioExisting) radioExisting.checked = true;
        if (radioNew) radioNew.disabled = true;
        toggleMappingMode('existing', prefix);
        if (hint) hint.innerText = 'Database Page menampung banyak baris halaman (about, contact, dll.). Fruit akan menarik seluruh baris tersebut.';
      }

      updateRealTargetFromSelect(prefix);
    }

    function toggleMappingMode(mode, prefix) {
      const select = document.getElementById(prefix + 'select_existing');
      const inputNew = document.getElementById(prefix + 'input_new');

      if (mode === 'existing') {
        if (select) select.disabled = false;
        if (inputNew) inputNew.disabled = true;
        updateRealTargetFromSelect(prefix);
      } else {
        if (select) select.disabled = true;
        if (inputNew) {
          inputNew.disabled = false;
          inputNew.focus();
        }
        updateRealTargetFromInput(prefix);
      }
    }

    function updateRealTargetFromSelect(prefix) {
      const select = document.getElementById(prefix + 'select_existing');
      const real = document.getElementById(prefix + 'real_target_type');
      if (select && real) real.value = select.value;
    }

    function updateRealTargetFromInput(prefix) {
      const inputNew = document.getElementById(prefix + 'input_new');
      const real = document.getElementById(prefix + 'real_target_type');
      if (inputNew && real) real.value = inputNew.value || 'custom';
    }

    // =========================================================
    // THEME MANAGEMENT (3-PANEL INTERACTION)
    // =========================================================
    const themesData = ${JSON.stringify(themes)};

    function selectTheme(themeId) {
      const panel = document.getElementById('theme-settings-panel');
      if (panel) {
        panel.classList.remove('closed');
      }

      // Highlight selected card
      document.querySelectorAll('.theme-card').forEach(card => card.classList.remove('selected-theme'));
      const card = document.getElementById('theme-card-' + themeId);
      if (card) card.classList.add('selected-theme');

      // Find theme data
      const theme = themesData.find(t => t.id === themeId);
      if (!theme) return;

      // Update Panel 3 UI
      const titleEl = document.getElementById('panel3-title');
      if (titleEl) titleEl.innerHTML = '<span>⚙️ Pengaturan: ' + theme.name + '</span>';

      const subEl = document.getElementById('panel3-subtitle');
      if (subEl) subEl.innerHTML = 'Folder: <code>themes/' + theme.id + '/</code>';

      const formThemeId = document.getElementById('panel3-form-themeId');
      if (formThemeId) formThemeId.value = theme.id;

      const cssPathEl = document.getElementById('panel3-css-path');
      if (cssPathEl) cssPathEl.innerText = 'themes/' + theme.id + '/style.css';

      const settings = theme.settings || {};
      const primaryColor = settings.primaryColor || theme.accentColor || '#059669';

      const colPick = document.getElementById('input-color-picker');
      if (colPick) colPick.value = primaryColor;

      const colHex = document.getElementById('input-color-hex');
      if (colHex) colHex.value = primaryColor;

      const bgCol = document.getElementById('panel3-bgColor');
      if (bgCol) bgCol.value = settings.bgColor || '#f8fafc';

      const fontFam = document.getElementById('panel3-fontFamily');
      if (fontFam) fontFam.value = settings.fontFamily || 'Plus Jakarta Sans';

      const fontSz = document.getElementById('panel3-fontSize');
      if (fontSz) fontSz.value = settings.fontSize || '17px';

      const pillRad = document.getElementById('panel3-pillRadius');
      if (pillRad) pillRad.value = settings.pillRadius || '999px';

      const cardRad = document.getElementById('panel3-cardRadius');
      if (cardRad) cardRad.value = settings.cardRadius || '24px';

      const maxW = document.getElementById('panel3-maxWidth');
      if (maxW) maxW.value = settings.maxWidth || '780px';

      const authorCard = document.getElementById('panel3-showAuthorCard');
      if (authorCard) authorCard.checked = settings.showAuthorCard !== false;

      const pillBar = document.getElementById('panel3-showPillBar');
      if (pillBar) pillBar.checked = settings.showPillBar !== false;

      // Update status banner
      const banner = document.getElementById('panel3-status-banner');
      if (banner) {
        if (theme.isActive) {
          banner.innerHTML = '<div class="status-banner-active">' +
            '<span style="font-size: 16px;">🟢</span>' +
            '<div>' +
              '<div style="font-weight: 700; font-size: 12px; color: #065f46;">Tema Sedang Digunakan</div>' +
              '<div style="font-size: 11px; color: #047857;">Tema ini aktif untuk render & preview halaman.</div>' +
            '</div>' +
          '</div>';
        } else {
          banner.innerHTML = '<div class="status-banner-inactive">' +
            '<div>' +
              '<div style="font-weight: 700; font-size: 12px; color: var(--text);">Tema Belum Aktif</div>' +
              '<div style="font-size: 11px; color: var(--text-dim);">Aktifkan untuk menerapkan tema ini ke website.</div>' +
            '</div>' +
            '<form action="/api/set-active-theme" method="POST" style="margin: 0;">' +
              '<input type="hidden" name="themeId" value="' + theme.id + '" />' +
              '<button type="submit" class="btn-top-action btn-top-primary" style="height: 30px; padding: 0 10px; font-size: 11px;">' +
                '✓ Aktifkan' +
              '</button>' +
            '</form>' +
          '</div>';
        }
      }

      // Update URL without reload
      try {
        const newUrl = new URL(window.location);
        newUrl.searchParams.set('view', 'themes');
        newUrl.searchParams.set('theme', themeId);
        window.history.replaceState({}, '', newUrl);
      } catch(e) {}
    }

    function switchThemeSettingSection(tabId, el) {
      document.querySelectorAll('.theme-setting-nav-btn').forEach(btn => btn.classList.remove('active'));
      if (el) el.classList.add('active');

      const cards = document.querySelectorAll('.theme-setting-section-card');
      cards.forEach(c => {
        if (c.id === 'section-' + tabId) {
          c.style.display = 'block';
        } else {
          c.style.display = 'none';
        }
      });
      try { sessionStorage.setItem('active_theme_setting_tab', tabId); } catch(e) {}
    }

    // =========================================================
    // NAVIGATION MENU EDITOR & LIVE MINI PREVIEW
    // =========================================================
    const defaultNavItems = [
      { label: 'Home', url: '/', enabled: true },
      { label: 'Read', url: '/read', enabled: true },
      { label: 'Pelajaran', url: '/pelajaran', enabled: true },
      { label: 'Authors', url: '/authors', enabled: true },
      { label: 'About', url: '/page', enabled: true }
    ];

    let navItemsState = ${JSON.stringify(
      Array.isArray(currentSelectedTheme?.settings?.navItems) && currentSelectedTheme.settings.navItems.length > 0
        ? currentSelectedTheme.settings.navItems
        : [
            { label: 'Home', url: '/', enabled: true },
            { label: 'Read', url: '/read', enabled: true },
            { label: 'Pelajaran', url: '/pelajaran', enabled: true },
            { label: 'Authors', url: '/authors', enabled: true },
            { label: 'About', url: '/page', enabled: true }
          ]
    )};

    const availableFruitTargets = ${JSON.stringify(
      fruits.map(f => ({ name: f.name, url: '/' + f.name, targetType: f.config?.targetType || 'post' }))
    )};

    
    const LUCIDE_NAV_ICONS = [
      { val: '', label: '🚫 Tanpa Ikon' },
      { val: 'home', label: '🏠 home' },
      { val: 'book-open', label: '📖 book-open' },
      { val: 'book', label: '📚 book' },
      { val: 'graduation-cap', label: '🎓 graduation-cap' },
      { val: 'users', label: '👥 users' },
      { val: 'user', label: '👤 user' },
      { val: 'file-text', label: '📄 file-text' },
      { val: 'newspaper', label: '📰 newspaper' },
      { val: 'compass', label: '🧭 compass' },
      { val: 'sparkles', label: '✨ sparkles' },
      { val: 'feather', label: '🪶 feather' },
      { val: 'pen-tool', label: '✒️ pen-tool' },
      { val: 'lightbulb', label: '💡 lightbulb' },
      { val: 'layers', label: '📑 layers' },
      { val: 'tag', label: '🏷️ tag' },
      { val: 'bookmark', label: '🔖 bookmark' },
      { val: 'folder', label: '📁 folder' },
      { val: 'info', label: 'ℹ️ info' },
      { val: 'help-circle', label: '❓ help-circle' },
      { val: 'mail', label: '✉️ mail' },
      { val: 'heart', label: '❤️ heart' },
      { val: 'star', label: '⭐ star' },
      { val: 'search', label: '🔍 search' },
      { val: 'coffee', label: '☕ coffee' },
      { val: 'code', label: '💻 code' },
      { val: 'terminal', label: '⌨️ terminal' },
      { val: 'rocket', label: '🚀 rocket' },
      { val: 'zap', label: '⚡ zap' },
      { val: 'flame', label: '🔥 flame' },
      { val: 'globe', label: '🌐 globe' },
      { val: 'link', label: '🔗 link' },
      { val: 'external-link', label: '↗️ external-link' },
      { val: 'rss', label: '📡 rss' }
    ];

    function updateNavItemIcon(idx, val) {
      if (!navItemsState[idx]) return;
      if (val === '__custom__') {
        const customIcon = prompt('Ketik nama icon Lucide (misal: "rocket", "shield", "database", "camera", "music"):', navItemsState[idx].icon || '');
        if (customIcon !== null) {
          navItemsState[idx].icon = customIcon.trim().toLowerCase();
        }
      } else {
        navItemsState[idx].icon = val;
      }
      syncNavItemsHiddenInput();
      renderNavItemsEditor();
      renderNavMiniPreview();
      renderHeroMiniPreview();
      renderPostCardMiniPreview();
    }

    function escapeAttr(str) {
      return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    }

    function syncNavItemsHiddenInput() {
      const hidden = document.getElementById('input-nav-items-json');
      if (hidden) {
        hidden.value = JSON.stringify(navItemsState);
      }
      renderNavMiniPreview();
    }

    
    function handleBrandLogoUpload(event) {
      const file = event.target.files && event.target.files[0];
      if (!file) return;

      if (file.type === 'image/svg+xml') {
        const reader = new FileReader();
        reader.onload = function(e) {
          applyBrandLogoData(e.target.result, 'SVG Logo');
        };
        reader.readAsDataURL(file);
        return;
      }

      const reader = new FileReader();
      reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
          let w = img.width;
          let h = img.height;
          const maxW = 360;
          const maxH = 120;
          if (w > maxW || h > maxH) {
            const ratio = Math.min(maxW / w, maxH / h);
            w = Math.round(w * ratio);
            h = Math.round(h * ratio);
          }
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          const outData = canvas.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.92);
          applyBrandLogoData(outData, 'Logo (' + w + 'x' + h + 'px)');
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }

    function applyBrandLogoData(dataUrl, desc) {
      const hiddenInput = document.getElementById('panel3-navBrandLogoImage');
      if (hiddenInput) hiddenInput.value = dataUrl;

      const previewBox = document.getElementById('brand-logo-preview-box');
      if (previewBox) {
        previewBox.innerHTML = '<img id="brand-logo-img-preview" src="' + dataUrl + '" style="width: 100%; height: 100%; object-fit: contain;" />';
      }

      const removeBtn = document.getElementById('btn-remove-brand-logo');
      if (removeBtn) removeBtn.style.display = 'inline-flex';

      const statusText = document.getElementById('brand-logo-status-text');
      if (statusText) statusText.innerText = desc || 'Logo gambar aktif';

      renderNavMiniPreview();
    }

    function removeBrandLogoImage() {
      const hiddenInput = document.getElementById('panel3-navBrandLogoImage');
      if (hiddenInput) hiddenInput.value = '';

      const fileInput = document.getElementById('brand-logo-file-input');
      if (fileInput) fileInput.value = '';

      const textVal = document.getElementById('panel3-navBrandLogo')?.value || 'B';
      const previewBox = document.getElementById('brand-logo-preview-box');
      if (previewBox) {
        previewBox.innerHTML = '<span id="brand-logo-text-preview" style="font-size: 16px; font-weight: 800; color: var(--primary);">' + escapeAttr(textVal) + '</span>';
      }

      const removeBtn = document.getElementById('btn-remove-brand-logo');
      if (removeBtn) removeBtn.style.display = 'none';

      const statusText = document.getElementById('brand-logo-status-text');
      if (statusText) statusText.innerText = 'Gunakan inisial teks';

      renderNavMiniPreview();
    }

    function updateBrandLogoText(val) {
      const logoImg = document.getElementById('panel3-navBrandLogoImage')?.value;
      if (!logoImg) {
        const textPreview = document.getElementById('brand-logo-text-preview');
        if (textPreview) {
          textPreview.innerText = val || 'B';
        }
      }
      renderNavMiniPreview();
    }

    
    function renderHeroMiniPreview() {
      const box = document.getElementById('hero-mini-preview-box');
      if (!box) return;

      const showHero = document.getElementById('panel3-showHero')?.checked !== false;
      if (!showHero) {
        box.innerHTML = '<div style="font-size: 12px; color: var(--text-dim); font-style: italic;">Bagian Hero dinonaktifkan (tidak ditampilkan di halaman beranda).</div>';
        return;
      }

      const badge = document.getElementById('panel3-heroBadge')?.value || '✨ Selamat Datang di Blogs';
      const align = document.getElementById('panel3-heroAlign')?.value || 'center';
      const title = document.getElementById('panel3-heroTitle')?.value || 'Catatan, Cerita & Wawasan Terkurasi';
      const subtitle = document.getElementById('panel3-heroSubtitle')?.value || '';
      const ctaText = document.getElementById('panel3-heroCtaText')?.value || '';
      const secText = document.getElementById('panel3-heroSecondaryCtaText')?.value || '';
      const primaryColor = document.getElementById('input-color-picker')?.value || '#059669';

      box.innerHTML =
        '<div style="max-width: 680px; margin: 0 auto; text-align: ' + align + ';">' +
          (badge ? '<span style="display: inline-block; font-size: 11px; font-weight: 700; color: ' + primaryColor + '; background: ' + primaryColor + '15; padding: 4px 12px; border-radius: 999px; margin-bottom: 12px;">' + escapeAttr(badge) + '</span>' : '') +
          '<h3 style="font-size: 24px; font-weight: 800; line-height: 1.25; margin: 0 0 10px 0; color: #0f172a;">' + escapeAttr(title) + '</h3>' +
          (subtitle ? '<p style="font-size: 13px; line-height: 1.6; color: #64748b; margin: 0 0 16px 0;">' + escapeAttr(subtitle) + '</p>' : '') +
          '<div style="display: flex; gap: 8px; justify-content: ' + (align === 'center' ? 'center' : 'flex-start') + '; flex-wrap: wrap;">' +
            (ctaText ? '<span style="font-size: 12px; font-weight: 700; background: ' + primaryColor + '; color: #ffffff; padding: 8px 18px; border-radius: 999px;">' + escapeAttr(ctaText) + '</span>' : '') +
            (secText ? '<span style="font-size: 12px; font-weight: 700; background: #ffffff; border: 1px solid #cbd5e1; color: #334155; padding: 8px 16px; border-radius: 999px;">' + escapeAttr(secText) + '</span>' : '') +
          '</div>' +
        '</div>';
    }

    function renderPostCardMiniPreview() {
      const box = document.getElementById('postcard-mini-preview-box');
      if (!box) return;

      const radius = document.getElementById('panel3-postCardRadius')?.value || '20px';
      const showCover = document.getElementById('panel3-showCardCover')?.checked !== false;
      const showCat = document.getElementById('panel3-showCardCategory')?.checked !== false;
      const showDate = document.getElementById('panel3-showCardDate')?.checked !== false;
      const showAuthor = document.getElementById('panel3-showCardAuthor')?.checked !== false;
      const showExcerpt = document.getElementById('panel3-showCardExcerpt')?.checked !== false;
      const primaryColor = document.getElementById('input-color-picker')?.value || '#059669';

      box.innerHTML =
        '<div style="width: 100%; max-width: 360px; background: #ffffff; border: 1px solid var(--border); border-radius: ' + radius + '; overflow: hidden; box-shadow: 0 4px 14px rgba(0,0,0,0.04);">' +
          (showCover ? '<div style="height: 150px; background: linear-gradient(135deg, ' + primaryColor + '20, #e2e8f0); display: flex; align-items: center; justify-content: center; font-size: 28px;">🖼️</div>' : '') +
          '<div style="padding: 16px;">' +
            (showCat ? '<div style="margin-bottom: 8px;"><span style="font-size: 10px; font-weight: 800; text-transform: uppercase; background: ' + primaryColor + '18; color: ' + primaryColor + '; padding: 3px 8px; border-radius: 999px;">TEKNOLOGI</span></div>' : '') +
            '<div style="font-size: 15px; font-weight: 800; color: #0f172a; margin-bottom: 6px; line-height: 1.35;">Cara Menggunakan Notion Sebagai Headless CMS</div>' +
            (showExcerpt ? '<div style="font-size: 12px; color: #64748b; line-height: 1.5; margin-bottom: 12px;">Panduan langkah demi langkah mempublikasikan konten Notion ke website statis yang cepat...</div>' : '') +
            '<div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid #f1f5f9; padding-top: 10px; font-size: 11px; color: #94a3b8;">' +
              (showAuthor ? '<div style="display: flex; align-items: center; gap: 6px;"><span style="width: 18px; height: 18px; border-radius: 999px; background: #e2e8f0; display: inline-flex; align-items: center; justify-content: center; font-size: 9px;">👤</span><span style="font-weight: 600; color: #475569;">Penulis</span></div>' : '<div></div>') +
              (showDate ? '<span>26 Okt 2026</span>' : '') +
            '</div>' +
          '</div>' +
        '</div>';
    }

    function renderNavMiniPreview() {
      const box = document.getElementById('nav-mini-preview-box');
      if (!box) return;

      const showNavbar = document.getElementById('panel3-showNavbar')?.checked !== false;
      if (!showNavbar) {
        box.innerHTML = '<div style="font-size: 12px; color: var(--text-dim); font-style: italic;">Header Navigasi dinonaktifkan (tidak ditampilkan di halaman).</div>';
        return;
      }

      const brandLogoImg = document.getElementById('panel3-navBrandLogoImage')?.value || '';
      const brandLogo = document.getElementById('panel3-navBrandLogo')?.value || 'B';
      const brandText = document.getElementById('panel3-navBrandText')?.value || 'blogs';
      const navStyle = document.getElementById('panel3-navStyle')?.value || 'capsule-floating';
      const primaryColor = document.getElementById('input-color-picker')?.value || '#059669';

      const activeLinks = navItemsState.filter(it => it.enabled !== false);
      const linksHtml = activeLinks.map((it, i) => {
        const isFirst = i === 0;
        const iconHtml = it.icon ? '<i data-lucide="' + escapeAttr(it.icon) + '" style="width: 13px; height: 13px; margin-right: 4px; vertical-align: -2px; display: inline-block;"></i>' : '';
        return '<span style="font-size: 12px; font-weight: ' + (isFirst ? '700' : '600') + '; padding: 5px 12px; border-radius: 999px; display: inline-flex; align-items: center; ' +
          (isFirst ? 'background: ' + primaryColor + '; color: #ffffff;' : 'color: #334155;') + '">' +
          iconHtml +
          '<span>' + escapeAttr(it.label || 'Menu') + '</span>' +
        '</span>';
      }).join('');

      const isPill = navStyle === 'capsule-floating';
      const isMinimal = navStyle === 'minimal';

      box.innerHTML =
        '<div style="width: 100%; max-width: 680px; display: flex; align-items: center; justify-content: space-between; padding: 8px 16px; ' +
        'background: ' + (isMinimal ? 'transparent' : 'rgba(255,255,255,0.92)') + '; ' +
        'border: ' + (isMinimal ? 'none' : '1px solid #e2e8f0') + '; ' +
        'border-radius: ' + (isPill ? '999px' : '10px') + '; ' +
        'box-shadow: ' + (isMinimal ? 'none' : '0 2px 8px rgba(0,0,0,0.04)') + ';">' +
          '<div style="display: flex; align-items: center; gap: 8px;">' +
            (brandLogoImg
              ? '<img src="' + escapeAttr(brandLogoImg) + '" alt="' + escapeAttr(brandText) + '" style="height: 26px; max-width: 90px; object-fit: contain; vertical-align: middle; border-radius: 4px;" />'
              : '<span style="width: 28px; height: 28px; border-radius: 999px; background: ' + primaryColor + '; color: #fff; font-size: 12px; font-weight: 800; display: inline-flex; align-items: center; justify-content: center;">' + escapeAttr(brandLogo) + '</span>') +
            '<span style="font-size: 14px; font-weight: 800; color: #0f172a;">' + escapeAttr(brandText) + '</span>' +
          '</div>' +
          '<div style="display: flex; align-items: center; gap: 4px; flex-wrap: wrap;">' +
            (linksHtml || '<span style="font-size: 11px; color: #94a3b8;">Belum ada menu aktif</span>') +
          '</div>' +
        '</div>';
      setTimeout(function() { if (window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons(); }, 10);
    }

    function renderNavItemsEditor() {
      const container = document.getElementById('nav-items-editor-list');
      if (!container) return;

      const quickOptions = [
        '<option value="">⚡ Pilih Cepat Target...</option>',
        '<option value="/">🏠 Beranda (/)</option>',
        ...availableFruitTargets.map(f => '<option value="' + escapeAttr(f.url) + '">🍉 Fruit: ' + escapeAttr(f.name) + ' (' + escapeAttr(f.url) + ')</option>')
      ].join('');

      if (navItemsState.length === 0) {
        container.innerHTML = '<div style="padding: 18px; text-align: center; background: var(--surface-subtle); border: 1px dashed var(--border); border-radius: var(--radius-sm); font-size: 12px; color: var(--text-dim);">Belum ada item menu navigasi. Klik "+ Tambah Menu" untuk membuat menu baru.</div>';
        syncNavItemsHiddenInput();
        return;
      }

      container.innerHTML = navItemsState.map((item, idx) => {
        return (
          '<div style="display: flex; align-items: center; gap: 8px; padding: 10px 12px; background: #ffffff; border: 1px solid var(--border); border-radius: var(--radius-sm); box-shadow: var(--shadow-sm);">' +
            '<div style="display: flex; flex-direction: column; gap: 2px;">' +
              '<button type="button" onclick="moveNavItem(' + idx + ', -1)" ' + (idx === 0 ? 'disabled' : '') + ' style="border: 1px solid var(--border); background: var(--surface-subtle); border-radius: 4px; font-size: 10px; line-height: 1; padding: 3px 5px; cursor: pointer; opacity: ' + (idx === 0 ? '0.35' : '1') + ';" title="Geser Naik">▲</button>' +
              '<button type="button" onclick="moveNavItem(' + idx + ', 1)" ' + (idx === navItemsState.length - 1 ? 'disabled' : '') + ' style="border: 1px solid var(--border); background: var(--surface-subtle); border-radius: 4px; font-size: 10px; line-height: 1; padding: 3px 5px; cursor: pointer; opacity: ' + (idx === navItemsState.length - 1 ? '0.35' : '1') + ';" title="Geser Turun">▼</button>' +
            '</div>' +

            '<label class="toggle-switch toggle-switch-sm" title="Status Menu (On: Tampilkan / Off: Sembunyikan)">' +
              '<input type="checkbox" ' + (item.enabled !== false ? 'checked' : '') + ' onchange="updateNavItemField(' + idx + ', \\\'enabled\\\', this.checked)" />' +
              '<span class="toggle-slider"></span>' +
            '</label>' +

            '<div style="flex: 1; display: grid; grid-template-columns: 145px 1fr 1.1fr auto; gap: 8px; align-items: center;">' +
              '<!-- Lucide Icon Picker -->' +
              '<div style="display: flex; align-items: center; gap: 5px; background: var(--surface-subtle); border: 1px solid var(--border); border-radius: 6px; padding: 3px 6px;">' +
                '<span style="display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; color: var(--primary); flex-shrink: 0;" title="' + (item.icon ? 'Icon: ' + escapeAttr(item.icon) : 'Tanpa ikon') + '">' +
                  (item.icon ? '<i data-lucide="' + escapeAttr(item.icon) + '" style="width: 16px; height: 16px;"></i>' : '<span style="font-size: 11px; color: #94a3b8;">—</span>') +
                '</span>' +
                '<select class="form-control" style="border: none; background: transparent; font-size: 11px; padding: 3px 2px; font-weight: 600; cursor: pointer; flex: 1;" onchange="updateNavItemIcon(' + idx + ', this.value)">' +
                  LUCIDE_NAV_ICONS.map(function(ic) {
                    return '<option value="' + escapeAttr(ic.val) + '" ' + (item.icon === ic.val ? 'selected' : '') + '>' + escapeAttr(ic.label) + '</option>';
                  }).join('') +
                  (item.icon && !LUCIDE_NAV_ICONS.some(function(ic) { return ic.val === item.icon; }) ? '<option value="' + escapeAttr(item.icon) + '" selected>✨ ' + escapeAttr(item.icon) + '</option>' : '') +
                  '<option value="__custom__">➕ Ketik Icon...</option>' +
                '</select>' +
              '</div>' +

              '<input type="text" class="form-control" value="' + escapeAttr(item.label) + '" placeholder="Label Menu (misal: Home)" oninput="updateNavItemField(' + idx + ', \\\'label\\\', this.value)" style="padding: 7px 10px; font-weight: 700;" />' +
              '<input type="text" class="form-control" id="nav-item-url-' + idx + '" value="' + escapeAttr(item.url) + '" placeholder="URL / Target (misal: /read)" oninput="updateNavItemField(' + idx + ', \\\'url\\\', this.value)" style="padding: 7px 10px; font-family: \\\'JetBrains Mono\\\', monospace; font-size: 12px;" />' +
              '<select class="form-control" style="width: 155px; padding: 7px 8px; font-size: 12px;" onchange="applyQuickTargetToNavItem(' + idx + ', this.value); this.value = \\\'\\\';">' +
                quickOptions +
              '</select>' +
            '</div>' +

            '<button type="button" onclick="removeNavItem(' + idx + ')" style="border: 1px solid #fecaca; background: #fff5f5; color: #dc2626; border-radius: 6px; width: 32px; height: 32px; cursor: pointer; font-size: 13px; display: inline-flex; align-items: center; justify-content: center;" title="Hapus Menu">🗑️</button>' +
          '</div>'
        );
      }).join('');

      syncNavItemsHiddenInput();
      setTimeout(function() { if (window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons(); }, 10);
    }

    function updateNavItemField(idx, field, value) {
      if (!navItemsState[idx]) return;
      navItemsState[idx][field] = value;
      syncNavItemsHiddenInput();
    }

    function applyQuickTargetToNavItem(idx, targetUrl) {
      if (!targetUrl || !navItemsState[idx]) return;
      navItemsState[idx].url = targetUrl;
      const cleanSlug = targetUrl.startsWith('/') ? targetUrl.slice(1).toLowerCase() : targetUrl.toLowerCase();
      
      const iconSuggester = {
        '': 'home',
        'read': 'book-open',
        'pelajaran': 'graduation-cap',
        'authors': 'users',
        'page': 'info'
      };
      if (iconSuggester[cleanSlug] && !navItemsState[idx].icon) {
        navItemsState[idx].icon = iconSuggester[cleanSlug];
      }

      if (!navItemsState[idx].label || navItemsState[idx].label === 'Menu Baru') {
        const cleanName = targetUrl === '/' ? 'Home' : (targetUrl.startsWith('/') ? targetUrl.slice(1) : targetUrl);
        navItemsState[idx].label = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
      }
      renderNavItemsEditor();
    }

    function addNavItem() {
      navItemsState.push({
        label: 'Menu Baru',
        url: '/',
        icon: 'link',
        enabled: true
      });
      renderNavItemsEditor();
    }

    function removeNavItem(idx) {
      navItemsState.splice(idx, 1);
      renderNavItemsEditor();
    }

    function moveNavItem(idx, direction) {
      const targetIdx = idx + direction;
      if (targetIdx < 0 || targetIdx >= navItemsState.length) return;
      const temp = navItemsState[idx];
      navItemsState[idx] = navItemsState[targetIdx];
      navItemsState[targetIdx] = temp;
      renderNavItemsEditor();
    }

    document.addEventListener('DOMContentLoaded', () => {
      try {
        renderNavItemsEditor();
        const savedTab = sessionStorage.getItem('active_theme_setting_tab');
        const activeTab = (savedTab === 'navigation') ? 'navigation' : 'layout';
        const btn = document.getElementById('nav-btn-' + activeTab);
        if (btn) switchThemeSettingSection(activeTab, btn);
      } catch(e) {}
    });

    function closeThemePanel() {
      const panel = document.getElementById('theme-settings-panel');
      if (panel) {
        panel.classList.add('closed');
      }
    }
  </script>

</body>
</html>
`;
};

// Simple HTTP Server
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  // Endpoint: Offline Lucide Icon Library (No Internet Dependency)
  if (url.pathname === '/assets/lucide.min.js' || url.pathname === '/dist/lucide.min.js' || url.pathname === '/lucide.min.js') {
    try {
      const lucideFile = path.join(process.cwd(), 'node_modules', 'lucide', 'dist', 'umd', 'lucide.min.js');
      const data = await fs.readFile(lucideFile);
      res.writeHead(200, {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Cache-Control': 'public, max-age=31536000'
      });
      res.end(data);
      return;
    } catch (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Lucide offline script not found');
      return;
    }
  }

  // Endpoint: Serve Homepage index.html
  if (url.pathname === '/index.html' || url.pathname === '/dist/index.html' || url.pathname === '/home') {
    try {
      let html = '';
      try {
        html = await fs.readFile(path.join(process.cwd(), 'dist', 'index.html'), 'utf8');
      } catch {
        html = await manager.buildHomepageHtml();
      }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
      return;
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Error loading index.html: ' + err.message);
      return;
    }
  }

  // Endpoint: Main Shell UI
  if (url.pathname === '/') {
    const fruitQuery = url.searchParams.get('fruit');
    const mode = url.searchParams.get('mode');
    const view = url.searchParams.get('view') || 'fruit'; // 'fruit' or 'themes'
    const fruits = await manager.listFruits();
    let activeFruit = null;

    // Load themes
    const themes = await themeManager.listThemes();
    const activeThemeId = await themeManager.getActiveThemeId();
    const activeTheme = themes.find(t => t.id === activeThemeId) || themes[0];

    // Load authors & posts for relation resolving (Single Source of Truth)
    const authorsList = await manager.getAllAuthors();
    const allPosts = await manager.getAllPosts();

    if (view === 'themes') {
      const selectedThemeId = url.searchParams.get('theme') || activeThemeId;
      const selectedTheme = themes.find(t => t.id === selectedThemeId) || activeTheme || themes[0];

      let previewFruit = null;
      if (fruits.length > 0) {
        try { previewFruit = await manager.loadFruit(fruits[0].name); } catch {}
      }

      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(renderShellHtml({
        fruits,
        activeFruit: previewFruit,
        isCreating: false,
        authorsList,
        allPosts,
        view: 'themes',
        themes,
        activeTheme,
        selectedTheme
      }));
      return;
    }

    if (mode === 'create') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(renderShellHtml({
        fruits,
        activeFruit: null,
        isCreating: true,
        authorsList,
        allPosts,
        view: 'fruit',
        themes,
        activeTheme
      }));
      return;
    }

    if (fruitQuery) {
      try { activeFruit = await manager.loadFruit(fruitQuery); } catch { activeFruit = null; }
    } else if (fruits.length > 0) {
      try { activeFruit = await manager.loadFruit(fruits[0].name); } catch { activeFruit = null; }
    }

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(renderShellHtml({
      fruits,
      activeFruit,
      isCreating: false,
      authorsList,
      allPosts,
      view: 'fruit',
      themes,
      activeTheme
    }));
    return;
  }

  // Endpoint: Set Active Theme
  if (url.pathname === '/api/set-active-theme' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      const params = new URLSearchParams(body);
      const themeId = params.get('themeId');
      if (themeId) {
        await themeManager.setActiveTheme(themeId);
      }
      res.writeHead(302, { Location: `/?view=themes&theme=${encodeURIComponent(themeId || 'capsule')}` });
      res.end();
    });
    return;
  }

  // Endpoint: Save Theme Settings
  if (url.pathname === '/api/save-theme-settings' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      const params = new URLSearchParams(body);
      const themeId = params.get('themeId');
      if (themeId) {
        let parsedNavItems = [];
        try {
          const rawNav = params.get('navItemsJson');
          if (rawNav) parsedNavItems = JSON.parse(rawNav);
        } catch {}

        const settings = {
          primaryColor: params.get('primaryColor') || params.get('primaryColorHex'),
          bgColor: params.get('bgColor') || '#f8fafc',
          fontFamily: params.get('fontFamily') || 'Plus Jakarta Sans',
          fontSize: params.get('fontSize') || '17px',
          maxWidth: params.get('maxWidth') || '780px',
          pillRadius: params.get('pillRadius') || '999px',
          cardRadius: params.get('cardRadius') || '24px',
          showAuthorCard: params.get('showAuthorCard') === 'true',
          showPillBar: params.get('showPillBar') === 'true',
          showNavbar: params.get('showNavbar') === 'true',
          navSticky: params.get('navSticky') === 'true',
          navBrandLogo: params.get('navBrandLogo') || 'B',
          navBrandLogoImage: params.get('navBrandLogoImage') || '',
          navBrandText: params.get('navBrandText') || 'blogs',
          navStyle: params.get('navStyle') || 'capsule-floating',
          navItems: Array.isArray(parsedNavItems) ? parsedNavItems : [],
          showHero: params.get('showHero') === 'true',
          heroAlign: params.get('heroAlign') || 'center',
          heroBadge: params.get('heroBadge') || '',
          heroTitle: params.get('heroTitle') || 'Catatan, Cerita & Wawasan Terkurasi',
          heroSubtitle: params.get('heroSubtitle') || '',
          heroCtaText: params.get('heroCtaText') || '',
          heroCtaUrl: params.get('heroCtaUrl') || '#posts',
          heroSecondaryCtaText: params.get('heroSecondaryCtaText') || '',
          heroSecondaryCtaUrl: params.get('heroSecondaryCtaUrl') || '/page',
          postCardLayout: params.get('postCardLayout') || 'grid-3',
          postCardRadius: params.get('postCardRadius') || '20px',
          postCardFruitSource: params.get('postCardFruitSource') || 'all',
          showCardCover: params.get('showCardCover') === 'true',
          showCardCategory: params.get('showCardCategory') === 'true',
          showCardDate: params.get('showCardDate') === 'true',
          showCardAuthor: params.get('showCardAuthor') === 'true',
          showCardExcerpt: params.get('showCardExcerpt') === 'true'
        };
        await themeManager.updateThemeSettings(themeId, settings);
        await manager.buildHomepageHtml(settings);
      }
      res.writeHead(302, { Location: `/?view=themes&theme=${encodeURIComponent(themeId || 'capsule')}` });
      res.end();
    });
    return;
  }

  // Endpoint: Reorder fruits via drag and drop
  if (url.pathname === '/api/reorder-fruits' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        let order = [];
        if (req.headers['content-type']?.includes('application/json')) {
          const parsed = JSON.parse(body);
          order = parsed.order || [];
        } else {
          const params = new URLSearchParams(body);
          order = params.getAll('order') || [];
        }
        if (Array.isArray(order) && order.length > 0) {
          await manager.saveFruitOrder(order);
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, order }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // Endpoint: Preview single compiled HTML with Active Theme (or index.html homepage)
  if (url.pathname === '/preview') {
    const fruitName = url.searchParams.get('fruit');
    const pageId = url.searchParams.get('pageId');
    const pageType = url.searchParams.get('page');

    if (pageType === 'home' || (!fruitName && !pageId)) {
      try {
        const activeThemeId = await themeManager.getActiveThemeId();
        const activeThemeData = await themeManager.getTheme(activeThemeId);
        const homeHtml = await manager.buildHomepageHtml(activeThemeData?.settings || {});
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(homeHtml);
        return;
      } catch (homeErr) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Error generating homepage: ' + homeErr.message);
        return;
      }
    }

    if (fruitName && pageId) {
      try {
        const fruit = await manager.loadFruit(fruitName);
        const htmlPath = path.join(fruit.path, 'dist', `${pageId}.html`);
        let content;
        try {
          content = await fs.readFile(htmlPath, 'utf8');
        } catch (readErr) {
          if (readErr.code === 'ENOENT') {
            await manager.rebuildFruitHtml(fruitName);
            content = await fs.readFile(htmlPath, 'utf8');
          } else {
            throw readErr;
          }
        }

        // Ambil style CSS dari tema yang sedang aktif di themes/
        const activeThemeId = await themeManager.getActiveThemeId();
        const activeThemeData = await themeManager.getTheme(activeThemeId);

        let dynamicOverrides = '';
        if (activeThemeData?.settings?.primaryColor) {
          dynamicOverrides += `--primary: ${activeThemeData.settings.primaryColor} !important;\n`;
          dynamicOverrides += `--primary-hover: ${activeThemeData.settings.primaryColor} !important;\n`;
        }
        if (activeThemeData?.settings?.bgColor) {
          dynamicOverrides += `--bg: ${activeThemeData.settings.bgColor} !important;\n`;
        }
        if (activeThemeData?.settings?.maxWidth) {
          dynamicOverrides += `.fruition-article-wrapper, .author-profile-wrapper { max-width: ${activeThemeData.settings.maxWidth} !important; }\n`;
        }
        if (activeThemeData?.settings?.fontFamily) {
          dynamicOverrides += `body { font-family: '${activeThemeData.settings.fontFamily}', sans-serif !important; }\n`;
        }
        if (activeThemeData?.settings?.fontSize) {
          dynamicOverrides += `.notion-p { font-size: ${activeThemeData.settings.fontSize} !important; }\n`;
        }
        if (activeThemeData?.settings?.pillRadius) {
          dynamicOverrides += `--capsule-radius: ${activeThemeData.settings.pillRadius} !important;\n`;
        }
        if (activeThemeData?.settings?.cardRadius) {
          dynamicOverrides += `--card-radius: ${activeThemeData.settings.cardRadius} !important;\n`;
        }
        if (activeThemeData?.settings?.showAuthorCard === false) {
          dynamicOverrides += `.notion-author-card { display: none !important; }\n`;
        }
        if (activeThemeData?.settings?.showPillBar === false) {
          dynamicOverrides += `.capsule-top-pillbar { display: none !important; }\n`;
        }

        const themeCss = `
          <style id="active-theme-styles">
            ${activeThemeData.css || ''}
            ${dynamicOverrides ? `:root { ${dynamicOverrides} }` : ''}
          </style>
          <script src="/assets/lucide.min.js"></script>
          <script>
            document.addEventListener('keydown', function(e) {
              var isCtrl = e.ctrlKey || e.metaKey;
              if (isCtrl && !e.shiftKey && !e.altKey && (e.code === 'Space' || e.key === ' ')) {
                e.preventDefault();
                if (window.parent && window.parent !== window) {
                  window.parent.postMessage({ type: 'FRUITION_SHORTCUT', action: 'toggle-preview' }, '*');
                }
              } else if (isCtrl && !e.shiftKey && !e.altKey && (e.key === 's' || e.key === 'S' || e.code === 'KeyS')) {
                e.preventDefault();
                if (window.parent && window.parent !== window) {
                  window.parent.postMessage({ type: 'FRUITION_SHORTCUT', action: 'save' }, '*');
                }
              }
            });
          </script>
        `;

        if (content.includes('</head>')) {
          content = content.replace('</head>', `${themeCss}\n</head>`);
        } else {
          content = themeCss + content;
        }

        // Inject Capsule Navigation Bar jika showNavbar aktif
        const s = activeThemeData?.settings || {};
        if (s.showNavbar !== false) {
          const allFruits = await manager.listFruits();
          const navItems = Array.isArray(s.navItems) && s.navItems.length > 0
            ? s.navItems.filter(it => it.enabled !== false)
            : [
                { label: 'Home', url: '/', enabled: true },
                { label: 'Read', url: '/read', enabled: true },
                { label: 'Pelajaran', url: '/pelajaran', enabled: true },
                { label: 'Authors', url: '/authors', enabled: true },
                { label: 'About', url: '/page', enabled: true }
              ];

          const navStyle = s.navStyle || 'capsule-floating';
          const isSticky = s.navSticky !== false;
          const brandLogoImg = s.navBrandLogoImage || '';
          const brandLogo = s.navBrandLogo || 'B';
          const brandText = s.navBrandText || 'blogs';
          const brandLogoHtml = brandLogoImg
            ? `<img src="${brandLogoImg}" alt="${brandText}" style="height: 30px; max-width: 120px; object-fit: contain; vertical-align: middle; border-radius: 4px;" />`
            : `<span style="width: 30px; height: 30px; border-radius: 999px; background: var(--primary, #059669); color: #ffffff; font-size: 13px; font-weight: 800; display: inline-flex; align-items: center; justify-content: center;">${brandLogo}</span>`;

          const resolvedLinksHtml = [];
          for (const item of navItems) {
            const rawUrl = (item.url || '/').trim();
            const cleanSlug = rawUrl.replace(/^\//, '').toLowerCase();
            let previewHref = rawUrl;
            let isActiveLink = false;

            if (rawUrl === '/' && fruitName === (allFruits[0]?.name || 'read')) {
              const firstFruit = await manager.loadFruit(allFruits[0]?.name || 'read').catch(() => null);
              if (firstFruit?.items?.[0]?.id) {
                previewHref = `/preview?fruit=${encodeURIComponent(firstFruit.name)}&pageId=${encodeURIComponent(firstFruit.items[0].id)}`;
              }
            } else {
              const matchedFruit = allFruits.find(f => f.name.toLowerCase() === cleanSlug);
              if (matchedFruit) {
                isActiveLink = matchedFruit.name === fruitName;
                const loadedMatch = await manager.loadFruit(matchedFruit.name).catch(() => null);
                if (loadedMatch?.items?.[0]?.id) {
                  previewHref = `/preview?fruit=${encodeURIComponent(matchedFruit.name)}&pageId=${encodeURIComponent(loadedMatch.items[0].id)}`;
                }
              }
            }

            const iconHtml = item.icon
              ? `<i data-lucide="${item.icon}" style="width: 14px; height: 14px; margin-right: 6px; vertical-align: -2px; display: inline-block;"></i>`
              : '';

            resolvedLinksHtml.push(`
              <a href="${previewHref}" style="text-decoration: none; font-size: 13px; font-weight: ${isActiveLink ? '700' : '600'}; padding: 6px 14px; border-radius: var(--capsule-radius, 999px); transition: all 0.15s; display: inline-flex; align-items: center; ${isActiveLink ? 'background: var(--primary, #059669); color: #ffffff;' : 'color: #334155;'}">
                ${iconHtml}
                <span>${item.label || 'Menu'}</span>
              </a>
            `);
          }

          const navHtml = `
            <div class="capsule-theme-navbar-wrap" style="${isSticky ? 'position: sticky; top: 16px; z-index: 50;' : ''} max-width: ${s.maxWidth || '780px'}; margin: 0 auto 32px auto;">
              <nav class="capsule-theme-navbar" style="display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 18px; background: ${navStyle === 'minimal' ? 'transparent' : 'rgba(255, 255, 255, 0.88)'}; ${isSticky && navStyle !== 'minimal' ? 'backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);' : ''} border: ${navStyle === 'minimal' ? 'none' : '1px solid #e2e8f0'}; border-radius: ${navStyle === 'capsule-floating' ? 'var(--capsule-radius, 999px)' : '12px'}; box-shadow: ${navStyle === 'minimal' ? 'none' : '0 4px 16px rgba(0, 0, 0, 0.04)'};">
                <div style="display: flex; align-items: center; gap: 10px;">
                  <span style="width: 30px; height: 30px; border-radius: 999px; background: var(--primary, #059669); color: #ffffff; font-size: 13px; font-weight: 800; display: inline-flex; align-items: center; justify-content: center;">${brandLogo}</span>
                  <span style="font-size: 15px; font-weight: 800; color: #0f172a; letter-spacing: -0.02em;">${brandText}</span>
                </div>
                <div style="display: flex; align-items: center; gap: 4px; flex-wrap: wrap;">
                  ${resolvedLinksHtml.join('')}
                </div>
              </nav>
            </div>
          `;

          if (content.includes('<body>')) {
            content = content.replace('<body>', `<body>\n${navHtml}`);
          }
          if (content.includes('</body>')) {
            content = content.replace('</body>', `<script>if (window.lucide) { lucide.createIcons(); }</script>\n</body>`);
          }
        }

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(content);
        return;
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Error loading HTML: ' + err.message);
        return;
      }
    }
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('Invalid parameters');
    return;
  }

  // Form POST: Create Fruit (Hubungkan Database Notion)
  if (url.pathname === '/api/create-fruit' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      const params = new URLSearchParams(body);
      const name = params.get('name');
      const targetType = params.get('targetType');
      const apiKey = params.get('apiKey');
      const databaseId = params.get('databaseId');

      if (name) {
        await manager.createFruit(name, { targetType, apiKey, databaseId });
        res.writeHead(302, { Location: `/?fruit=${encodeURIComponent(name)}` });
      } else {
        res.writeHead(302, { Location: '/' });
      }
      res.end();
    });
    return;
  }

  // Form POST: Sync Fruit from Notion Database
  if (url.pathname === '/api/sync-fruit' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      const params = new URLSearchParams(body);
      const fruitName = params.get('fruitName');
      if (fruitName) {
        try {
          await manager.syncFruitFromNotion(fruitName);
        } catch (e) {
          console.error('Error syncing:', e.message);
        }
        res.writeHead(302, { Location: `/?fruit=${encodeURIComponent(fruitName)}` });
      } else {
        res.writeHead(302, { Location: '/' });
      }
      res.end();
    });
    return;
  }

  // Form POST: Sync ALL Fruits from Notion Databases at once
  if (url.pathname === '/api/sync-all-fruits' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      const params = new URLSearchParams(body);
      const returnTo = params.get('returnTo') || '/';
      try {
        await manager.syncAllFruitsFromNotion();
      } catch (e) {
        console.error('Error syncing all fruits:', e.message);
      }
      res.writeHead(302, { Location: returnTo });
      res.end();
    });
    return;
  }

  // Form POST: Save Custom Column Mapping (Intervensi Manual User)
  if (url.pathname === '/api/save-mapping' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      const params = new URLSearchParams(body);
      const fruitName = params.get('fruitName');
      if (fruitName) {
        const columns = {
          title: params.get('title'),
          slug: params.get('slug'),
          authors: params.get('authors'),
          date: params.get('date'),
          published: params.get('published'),
          meta_description: params.get('meta_description'),
          og: params.get('og'),
          bio: params.get('bio'),
          role: params.get('role'),
          pic: params.get('pic')
        };
        await manager.updateFruitMapping(fruitName, columns);
        await manager.rebuildFruitHtml(fruitName);
        res.writeHead(302, { Location: `/?fruit=${encodeURIComponent(fruitName)}` });
      } else {
        res.writeHead(302, { Location: '/' });
      }
      res.end();
    });
    return;
  }

  // Form POST: Delete Item row from local cache
  if (url.pathname === '/api/delete-item' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      const params = new URLSearchParams(body);
      const fruitName = params.get('fruitName');
      const itemId = params.get('itemId');
      if (fruitName && itemId) {
        await manager.deleteFruitItem(fruitName, itemId);
        res.writeHead(302, { Location: `/?fruit=${encodeURIComponent(fruitName)}` });
      } else {
        res.writeHead(302, { Location: '/' });
      }
      res.end();
    });
    return;
  }

  // Form POST: Save Config (Kredensial & Target)
  if (url.pathname === '/api/save-config' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      const params = new URLSearchParams(body);
      const fruitName = params.get('fruitName');
      const apiKey = params.get('apiKey');
      const databaseId = params.get('databaseId');
      const targetType = params.get('targetType');

      if (fruitName) {
        await manager.updateFruitConfig(fruitName, {
          targetType,
          notion: { apiKey, databaseId }
        });
        res.writeHead(302, { Location: `/?fruit=${encodeURIComponent(fruitName)}` });
      } else {
        res.writeHead(302, { Location: '/' });
      }
      res.end();
    });
    return;
  }

  // Form POST: Delete Fruit
  if (url.pathname === '/api/delete-fruit' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      const params = new URLSearchParams(body);
      const fruitName = params.get('fruitName');
      if (fruitName) {
        await manager.deleteFruit(fruitName);
      }
      res.writeHead(302, { Location: '/' });
      res.end();
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

server.listen(PORT, async () => {
  try {
    await manager.buildHomepageHtml();
  } catch {}
  console.log(`[Fruition Mini] Web Shell UI running at http://localhost:${PORT}`);
});
