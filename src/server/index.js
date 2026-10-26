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
    }

    .theme-nav-list-title {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-dim);
      padding: 6px 8px 4px 8px;
      margin-top: 6px;
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
            <button type="button" class="btn-top-action" onclick="openLivePreviewModal()">
              <span>👁️</span>
              <span>Preview</span>
            </button>
            ${fruits.length > 0 ? `
              <a href="/?fruit=${encodeURIComponent(fruits[0].name)}" class="btn-top-action btn-top-primary">
                <span>🍉</span>
                <span>Kembali ke Workspace</span>
              </a>
            ` : ''}
          ` : (activeFruit ? `
            <!-- Tombol 1: Preview (Khusus Melihat Tampilan Tema / Hasil Compile) -->
            <button type="button" class="btn-top-action" onclick="openLivePreviewModal()">
              <span>👁️</span>
              <span>Preview</span>
            </button>

            <!-- Tombol 2: Theme setting (Daftar Tema & Pengaturan) -->
            <a href="/?view=themes" class="btn-top-action">
              <span>🎨</span>
              <span>Theme setting</span>
            </a>

            <!-- Tombol 3: Tarik Data Notion (Primary Action) -->
            <form action="/api/sync-fruit" method="POST" style="margin: 0;">
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
            </div>

            <!-- Pengaturan Tema dalam Bentuk List -->
            <div class="theme-nav-list-section">
              <div class="theme-nav-list-title">PENGATURAN TEMA</div>

              <button type="button" class="theme-setting-nav-btn active" id="nav-btn-colors" onclick="switchThemeSettingSection('colors', this)">
                <div class="nav-btn-content">
                  <span class="nav-btn-icon">🎨</span>
                  <span>Warna & Latar Belakang</span>
                </div>
                <span class="nav-chevron">›</span>
              </button>

              <button type="button" class="theme-setting-nav-btn" id="nav-btn-typography" onclick="switchThemeSettingSection('typography', this)">
                <div class="nav-btn-content">
                  <span class="nav-btn-icon">🔤</span>
                  <span>Tipografi & Ukuran Teks</span>
                </div>
                <span class="nav-chevron">›</span>
              </button>

              <button type="button" class="theme-setting-nav-btn" id="nav-btn-capsule" onclick="switchThemeSettingSection('capsule', this)">
                <div class="nav-btn-content">
                  <span class="nav-btn-icon">💊</span>
                  <span>Desain Kapsul & Radius</span>
                </div>
                <span class="nav-chevron">›</span>
              </button>

              <button type="button" class="theme-setting-nav-btn" id="nav-btn-layout" onclick="switchThemeSettingSection('layout', this)">
                <div class="nav-btn-content">
                  <span class="nav-btn-icon">📐</span>
                  <span>Tata Letak & Lebar Konten</span>
                </div>
                <span class="nav-chevron">›</span>
              </button>

              <button type="button" class="theme-setting-nav-btn" id="nav-btn-components" onclick="switchThemeSettingSection('components', this)">
                <div class="nav-btn-content">
                  <span class="nav-btn-icon">🧩</span>
                  <span>Komponen Halaman</span>
                </div>
                <span class="nav-chevron">›</span>
              </button>

              <button type="button" class="theme-setting-nav-btn" id="nav-btn-css" onclick="switchThemeSettingSection('css', this)">
                <div class="nav-btn-content">
                  <span class="nav-btn-icon">📁</span>
                  <span>File CSS Mandiri</span>
                </div>
                <span class="nav-chevron">›</span>
              </button>

              <button type="button" class="theme-setting-nav-btn" id="nav-btn-all" onclick="switchThemeSettingSection('all', this)" style="margin-top: 6px; border-top: 1px dashed var(--border-subtle); padding-top: 10px;">
                <div class="nav-btn-content">
                  <span class="nav-btn-icon">📋</span>
                  <span>Tampilkan Semua Pengaturan</span>
                </div>
                <span class="nav-chevron">›</span>
              </button>
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
              <div style="display: flex; gap: 8px; align-items: center;">
                <button type="button" class="btn-top-action" onclick="openLivePreviewModal()">
                  <span>👁️</span>
                  <span>Preview</span>
                </button>
                <button type="submit" form="form-theme-settings" class="btn-top-action btn-top-primary">
                  <span>💾</span>
                  <span>Simpan Pengaturan</span>
                </button>
              </div>
            </div>

            <div class="panel3-body">
              <div id="panel3-status-banner">
                <div class="status-banner-active">
                  <span style="font-size: 18px;">🟢</span>
                  <div>
                    <div style="font-weight: 700; font-size: 13px; color: #065f46;">Tema Aktif Utama: Capsule Design</div>
                    <div style="font-size: 11px; color: #047857;">Pilih opsi pengaturan dari list di sebelah kiri untuk menyesuaikan tampilan di workspace ini.</div>
                  </div>
                </div>
              </div>

              <!-- Form Multi-Pengaturan Tema -->
              <form action="/api/save-theme-settings" method="POST" id="form-theme-settings">
                <input type="hidden" name="themeId" id="panel3-form-themeId" value="${currentSelectedTheme?.id || 'capsule'}" />

                <!-- Section 1: Warna & Latar -->
                <div class="theme-setting-section-card" id="section-colors">
                  <div class="section-card-title">
                    <span>🎨</span>
                    <span>1. Skema Warna & Latar Belakang</span>
                  </div>
                  <div class="section-card-desc">Atur warna aksen utama dan palet latar belakang artikel.</div>

                  <div class="grid-2">
                    <div class="form-group">
                      <label class="form-label">Warna Utama (Primary / Accent Color)</label>
                      <div style="display: flex; gap: 8px; align-items: center;">
                        <input type="color" name="primaryColor" id="input-color-picker" value="${currentSelectedTheme?.settings?.primaryColor || currentSelectedTheme?.accentColor || '#059669'}" style="width: 44px; height: 38px; border: 1px solid var(--border); border-radius: 8px; cursor: pointer; padding: 2px; background: #ffffff;" oninput="document.getElementById('input-color-hex').value = this.value;" />
                        <input type="text" id="input-color-hex" name="primaryColorHex" class="form-control" value="${currentSelectedTheme?.settings?.primaryColor || currentSelectedTheme?.accentColor || '#059669'}" style="flex: 1;" oninput="document.getElementById('input-color-picker').value = this.value;" />
                      </div>
                    </div>

                    <div class="form-group">
                      <label class="form-label">Warna Latar Konten (Background)</label>
                      <select name="bgColor" id="panel3-bgColor" class="form-control">
                        <option value="#f8fafc" ${currentSelectedTheme?.settings?.bgColor === '#f8fafc' || !currentSelectedTheme?.settings?.bgColor ? 'selected' : ''}>#f8fafc (Clean Light / Standar)</option>
                        <option value="#ffffff" ${currentSelectedTheme?.settings?.bgColor === '#ffffff' ? 'selected' : ''}>#ffffff (Pure White)</option>
                        <option value="#f1f5f9" ${currentSelectedTheme?.settings?.bgColor === '#f1f5f9' ? 'selected' : ''}>#f1f5f9 (Soft Neutral Gray)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <!-- Section 2: Tipografi -->
                <div class="theme-setting-section-card" id="section-typography" style="display: none;">
                  <div class="section-card-title">
                    <span>🔤</span>
                    <span>2. Tipografi & Ukuran Teks</span>
                  </div>
                  <div class="section-card-desc">Sesuaikan keluarga font dan ukuran teks konten untuk kenyamanan membaca.</div>

                  <div class="grid-2">
                    <div class="form-group">
                      <label class="form-label">Font Family Utama</label>
                      <select name="fontFamily" id="panel3-fontFamily" class="form-control">
                        <option value="Plus Jakarta Sans" ${currentSelectedTheme?.settings?.fontFamily === 'Plus Jakarta Sans' ? 'selected' : ''}>Plus Jakarta Sans (Modern Sans)</option>
                        <option value="Inter" ${currentSelectedTheme?.settings?.fontFamily === 'Inter' ? 'selected' : ''}>Inter (Clean Sans)</option>
                        <option value="Georgia" ${currentSelectedTheme?.settings?.fontFamily === 'Georgia' ? 'selected' : ''}>Georgia (Editorial Serif)</option>
                        <option value="JetBrains Mono" ${currentSelectedTheme?.settings?.fontFamily === 'JetBrains Mono' ? 'selected' : ''}>JetBrains Mono (Monospace)</option>
                      </select>
                    </div>

                    <div class="form-group">
                      <label class="form-label">Ukuran Teks Body Artikel</label>
                      <select name="fontSize" id="panel3-fontSize" class="form-control">
                        <option value="16px" ${currentSelectedTheme?.settings?.fontSize === '16px' ? 'selected' : ''}>16px (Standar)</option>
                        <option value="17px" ${currentSelectedTheme?.settings?.fontSize === '17px' || !currentSelectedTheme?.settings?.fontSize ? 'selected' : ''}>17px (Kenyamanan Baca Optimal)</option>
                        <option value="18px" ${currentSelectedTheme?.settings?.fontSize === '18px' ? 'selected' : ''}>18px (Besar & Lega)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <!-- Section 3: Desain Kapsul -->
                <div class="theme-setting-section-card" id="section-capsule" style="display: none;">
                  <div class="section-card-title">
                    <span>💊</span>
                    <span>3. Sistem Desain Kapsul (Pill Design)</span>
                  </div>
                  <div class="section-card-desc">Atur tingkat kebulatan kapsul (border radius) pada tombol, badge, dan sudut kartu.</div>

                  <div class="grid-2">
                    <div class="form-group">
                      <label class="form-label">Kebulatan Kapsul (Pill Radius)</label>
                      <select name="pillRadius" id="panel3-pillRadius" class="form-control">
                        <option value="999px" ${currentSelectedTheme?.settings?.pillRadius === '999px' || !currentSelectedTheme?.settings?.pillRadius ? 'selected' : ''}>999px (Desain Kapsul Penuh / Pill)</option>
                        <option value="24px" ${currentSelectedTheme?.settings?.pillRadius === '24px' ? 'selected' : ''}>24px (Soft Rounded Capsule)</option>
                        <option value="12px" ${currentSelectedTheme?.settings?.pillRadius === '12px' ? 'selected' : ''}>12px (Subtle Rounded)</option>
                      </select>
                    </div>

                    <div class="form-group">
                      <label class="form-label">Sudut Lengkung Kartu (Card Radius)</label>
                      <select name="cardRadius" id="panel3-cardRadius" class="form-control">
                        <option value="24px" ${currentSelectedTheme?.settings?.cardRadius === '24px' || !currentSelectedTheme?.settings?.cardRadius ? 'selected' : ''}>24px (Standar Kapsul)</option>
                        <option value="16px" ${currentSelectedTheme?.settings?.cardRadius === '16px' ? 'selected' : ''}>16px (Medium Rounded)</option>
                        <option value="10px" ${currentSelectedTheme?.settings?.cardRadius === '10px' ? 'selected' : ''}>10px (Subtle Rounded)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <!-- Section 4: Layout -->
                <div class="theme-setting-section-card" id="section-layout" style="display: none;">
                  <div class="section-card-title">
                    <span>📐</span>
                    <span>4. Tata Letak & Lebar Konten</span>
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

                <!-- Section 5: Komponen & Toggles -->
                <div class="theme-setting-section-card" id="section-components" style="display: none;">
                  <div class="section-card-title">
                    <span>🧩</span>
                    <span>5. Komponen Halaman</span>
                  </div>
                  <div class="section-card-desc">Aktifkan atau nonaktifkan elemen pelengkap seperti kartu penulis dan floating pill bar.</div>

                  <div class="grid-2">
                    <div class="form-group" style="padding: 14px 16px; background: #ffffff; border: 1px solid var(--border); border-radius: var(--radius-sm); margin: 0;">
                      <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: 13px; font-weight: 600;">
                        <input type="checkbox" name="showAuthorCard" id="panel3-showAuthorCard" value="true" ${currentSelectedTheme?.settings?.showAuthorCard !== false ? 'checked' : ''} style="width: 16px; height: 16px; accent-color: var(--primary);" />
                        <span>Tampilkan Kartu Profil Penulis di Bawah Artikel</span>
                      </label>
                    </div>

                    <div class="form-group" style="padding: 14px 16px; background: #ffffff; border: 1px solid var(--border); border-radius: var(--radius-sm); margin: 0;">
                      <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: 13px; font-weight: 600;">
                        <input type="checkbox" name="showPillBar" id="panel3-showPillBar" value="true" ${currentSelectedTheme?.settings?.showPillBar !== false ? 'checked' : ''} style="width: 16px; height: 16px; accent-color: var(--primary);" />
                        <span>Tampilkan Floating Pill Bar Kategori di Atas Judul</span>
                      </label>
                    </div>
                  </div>
                </div>

                <!-- Section 6: Info Isolasi CSS -->
                <div class="theme-setting-section-card" id="section-css" style="display: none;">
                  <div class="section-card-title">
                    <span>📁</span>
                    <span>6. File CSS Mandiri (Terpisah dari Core)</span>
                  </div>
                  <div class="section-card-desc">Informasi penyimpanan file styling tema Capsule.</div>

                  <div class="css-isolation-box">
                    <div style="font-weight: 700; color: var(--text); margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
                      <span>📂</span>
                      <span>CSS Tema Terpisah dari Core</span>
                    </div>
                    <div style="color: var(--text-muted); font-size: 13px; line-height: 1.6;">
                      Seluruh style visual tema disimpan di <code id="panel3-css-path">themes/${currentSelectedTheme?.id || 'capsule'}/style.css</code>. Core SSG tidak memuat CSS ini secara langsung, menjaga isolasi kode yang bersih. Anda dapat menambahkan custom CSS langsung ke file tersebut.
                    </div>
                  </div>
                </div>

                <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--border); display: flex; justify-content: flex-end;">
                  <button type="submit" class="btn-top-action btn-top-primary" style="height: 44px; padding: 0 24px; font-size: 14px;">
                    <span>💾</span>
                    <span>Simpan Pengaturan Tema</span>
                  </button>
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

    // Modal Live Preview Logic
    let currentPreviewFruit = '${activeFruit ? encodeURIComponent(activeFruit.name) : (fruits[0] ? encodeURIComponent(fruits[0].name) : "")}';
    let currentPreviewPageId = '${firstItemId}';

    function openLivePreviewModal() {
      const modal = document.getElementById('live-preview-modal');
      if (modal) modal.classList.add('open');
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
    }

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
      if (tabId === 'all') {
        cards.forEach(c => c.style.display = 'block');
      } else {
        cards.forEach(c => {
          if (c.id === 'section-' + tabId) {
            c.style.display = 'block';
          } else {
            c.style.display = 'none';
          }
        });
      }
      try { sessionStorage.setItem('active_theme_setting_tab', tabId); } catch(e) {}
    }

    document.addEventListener('DOMContentLoaded', () => {
      try {
        const savedTab = sessionStorage.getItem('active_theme_setting_tab');
        if (savedTab) {
          const btn = document.getElementById('nav-btn-' + savedTab);
          if (btn) switchThemeSettingSection(savedTab, btn);
        }
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
        const settings = {
          primaryColor: params.get('primaryColor') || params.get('primaryColorHex'),
          bgColor: params.get('bgColor') || '#f8fafc',
          fontFamily: params.get('fontFamily') || 'Plus Jakarta Sans',
          fontSize: params.get('fontSize') || '17px',
          maxWidth: params.get('maxWidth') || '780px',
          pillRadius: params.get('pillRadius') || '999px',
          cardRadius: params.get('cardRadius') || '24px',
          showAuthorCard: params.get('showAuthorCard') === 'true',
          showPillBar: params.get('showPillBar') === 'true'
        };
        await themeManager.updateThemeSettings(themeId, settings);
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

  // Endpoint: Preview single compiled HTML with Active Theme
  if (url.pathname === '/preview') {
    const fruitName = url.searchParams.get('fruit');
    const pageId = url.searchParams.get('pageId');

    if (fruitName && pageId) {
      try {
        const fruit = await manager.loadFruit(fruitName);
        const htmlPath = path.join(fruit.path, 'dist', `${pageId}.html`);
        let content = await fs.readFile(htmlPath, 'utf8');

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
        `;

        if (content.includes('</head>')) {
          content = content.replace('</head>', `${themeCss}\n</head>`);
        } else {
          content = themeCss + content;
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

server.listen(PORT, () => {
  console.log(`[Fruition Mini] Web Shell UI running at http://localhost:${PORT}`);
});
