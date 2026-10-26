import fs from 'node:fs/promises';
import path from 'node:path';

export class ThemeManager {
  constructor(baseDir = process.cwd()) {
    this.baseDir = baseDir;
    this.themesDir = path.join(this.baseDir, 'themes');
    this.activeThemeFile = path.join(this.themesDir, '.active');
  }

  async ensureThemesDirectory() {
    await fs.mkdir(this.themesDir, { recursive: true });
    await this.ensureCapsuleTheme();
    await this.cleanOtherThemes();
  }

  async cleanOtherThemes() {
    try {
      const entries = await fs.readdir(this.themesDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && entry.name !== 'capsule') {
          await fs.rm(path.join(this.themesDir, entry.name), { recursive: true, force: true });
        }
      }
    } catch {}
  }

  async ensureCapsuleTheme() {
    const capsuleFolder = path.join(this.themesDir, 'capsule');
    await fs.mkdir(capsuleFolder, { recursive: true });
    const themeJsonPath = path.join(capsuleFolder, 'theme.json');
    const themeCssPath = path.join(capsuleFolder, 'style.css');

    try {
      await fs.access(themeJsonPath);
    } catch {
      const capsuleMeta = {
        id: 'capsule',
        name: 'Capsule',
        description: 'Desain modern berbentuk kapsul (pill) yang aerodinamis, elegan, dan estetik dengan badge pil melengkung, floating capsule header, dan typography berkelas.',
        author: 'Fruition Mini',
        version: '1.0.0',
        previewColor: '#f8fafc',
        accentColor: '#059669',
        settings: {
          primaryColor: '#059669',
          fontFamily: 'Plus Jakarta Sans',
          maxWidth: '780px',
          pillRadius: '999px',
          showAuthorCard: true
        }
      };
      await fs.writeFile(themeJsonPath, JSON.stringify(capsuleMeta, null, 2), 'utf8');
    }

    try {
      await fs.access(themeCssPath);
    } catch {
      const capsuleCss = `
/* =========================================================
   TEMA CAPSULE - 100% TERPISAH DARI CORE
   Desain Aerodinamis Berbentuk Kapsul (Pill Design System)
   ========================================================= */

:root {
  --capsule-radius: 999px;
  --card-radius: 24px;
  --primary: #059669;
  --primary-hover: #047857;
  --primary-subtle: #ecfdf5;
  --primary-border: #a7f3d0;
  --bg: #f8fafc;
  --surface: #ffffff;
  --border: #e2e8f0;
  --text: #0f172a;
  --text-muted: #475569;
  --text-dim: #94a3b8;
  --font-sans: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
}

body {
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-sans);
  line-height: 1.7;
  padding: 40px 20px 100px 20px;
}

/* CONTAINER */
.fruition-article-wrapper,
.author-profile-wrapper {
  max-width: 780px;
  margin: 0 auto;
}

/* FLOATING CAPSULE HEADER */
.notion-post-header {
  margin-bottom: 40px;
  padding-bottom: 28px;
  border-bottom: 1px solid var(--border);
}

.capsule-top-pillbar {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--capsule-radius);
  padding: 4px 14px 4px 6px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.03);
  margin-bottom: 20px;
}

.capsule-badge-category {
  background: var(--primary);
  color: #ffffff;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 4px 12px;
  border-radius: var(--capsule-radius);
}

.capsule-read-time {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
}

.notion-main-title {
  font-size: 38px;
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.25;
  color: var(--text);
  margin-bottom: 20px;
}

/* CAPSULE METADATA BAR */
.notion-meta-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.notion-author-header-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #ffffff;
  border: 1px solid var(--border);
  border-radius: var(--capsule-radius);
  padding: 4px 14px 4px 5px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.02);
}

.notion-header-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
}

.notion-header-author-name {
  font-size: 12px;
  font-weight: 700;
  color: var(--text);
}

.notion-header-role {
  font-size: 10px;
  font-weight: 700;
  background: var(--primary-subtle);
  color: var(--primary);
  padding: 1px 8px;
  border-radius: var(--capsule-radius);
  border: 1px solid var(--primary-border);
}

.capsule-date-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #ffffff;
  border: 1px solid var(--border);
  border-radius: var(--capsule-radius);
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
}

/* CONTENT BLOCKS CAPSULE STYLING */
.notion-p {
  font-size: 17px;
  color: #1e293b;
  margin: 16px 0;
  line-height: 1.75;
}

.notion-h1 {
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -0.02em;
  margin: 36px 0 16px 0;
  color: var(--text);
}

.notion-h2 {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.01em;
  margin: 28px 0 12px 0;
  color: var(--text);
}

.notion-h3 {
  font-size: 18px;
  font-weight: 700;
  margin: 22px 0 10px 0;
  color: var(--text);
}

/* CAPSULE CALLOUT */
.notion-callout {
  background: #ffffff;
  border: 1px solid var(--border);
  border-radius: var(--card-radius);
  padding: 18px 22px;
  margin: 24px 0;
  display: flex;
  align-items: flex-start;
  gap: 14px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.02);
}

.notion-callout-icon {
  font-size: 20px;
  width: 38px;
  height: 38px;
  border-radius: var(--capsule-radius);
  background: var(--primary-subtle);
  border: 1px solid var(--primary-border);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* CAPSULE CODE BLOCK */
.notion-code-block {
  background: #0f172a;
  color: #f8fafc;
  border-radius: var(--card-radius);
  margin: 24px 0;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}

.notion-code-header {
  background: #1e293b;
  padding: 10px 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.notion-code-lang {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: #94a3b8;
  background: #0f172a;
  padding: 2px 10px;
  border-radius: var(--capsule-radius);
}

.notion-code-pre {
  padding: 20px 22px;
  overflow-x: auto;
  font-family: var(--font-mono);
  font-size: 14px;
  line-height: 1.6;
}

/* CAPSULE LISTS */
.notion-bullet-item, .notion-numbered-item {
  display: flex;
  align-items: flex-start;
  margin: 8px 0;
  font-size: 16px;
}
.notion-bullet {
  width: 22px;
  color: var(--primary);
  font-size: 16px;
  line-height: 1.6;
}
.notion-number {
  width: 24px;
  font-weight: 700;
  color: var(--primary);
}
.notion-list-content {
  flex: 1;
}

/* CAPSULE AUTHOR FOOTER PROFILE */
.notion-author-card {
  margin-top: 50px;
  padding: 24px 28px;
  background: #ffffff;
  border: 1px solid var(--border);
  border-radius: var(--card-radius);
  display: flex;
  align-items: center;
  gap: 20px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.03);
}

.author-card-avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--primary-border);
  flex-shrink: 0;
}

.author-card-info h3 {
  font-size: 16px;
  font-weight: 800;
  color: var(--text);
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.author-card-bio {
  font-size: 13px;
  color: var(--text-muted);
  line-height: 1.5;
}

/* AUTHOR PROFILE HERO (CAPSULE DESIGN) */
.author-profile-hero {
  background: #ffffff;
  border: 1px solid var(--border);
  border-radius: var(--card-radius);
  padding: 32px;
  margin-bottom: 36px;
  display: flex;
  align-items: center;
  gap: 24px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.03);
}
.hero-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid var(--primary-border);
  flex-shrink: 0;
}
.hero-name {
  font-size: 24px;
  font-weight: 800;
  color: var(--text);
}
.hero-role-badge {
  font-size: 11px;
  font-weight: 700;
  background: var(--primary-subtle);
  color: var(--primary);
  border: 1px solid var(--primary-border);
  padding: 3px 12px;
  border-radius: var(--capsule-radius);
  display: inline-block;
  margin-top: 4px;
  margin-bottom: 8px;
}
.hero-bio {
  font-size: 14px;
  color: var(--text-muted);
}
.post-card {
  background: #ffffff;
  border: 1px solid var(--border);
  border-radius: var(--card-radius);
  padding: 22px 26px;
  margin-bottom: 16px;
  text-decoration: none;
  color: inherit;
  display: block;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0,0,0,0.02);
}
.post-card:hover {
  border-color: var(--primary);
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(5, 150, 105, 0.08);
}
.post-category-tag {
  background: var(--primary-subtle);
  color: var(--primary);
  border: 1px solid var(--primary-border);
  padding: 2px 10px;
  border-radius: var(--capsule-radius);
  font-size: 11px;
  font-weight: 700;
}
      `.trim();
      await fs.writeFile(themeCssPath, capsuleCss, 'utf8');
    }

    try {
      await fs.access(this.activeThemeFile);
    } catch {
      await fs.writeFile(this.activeThemeFile, 'capsule', 'utf8');
    }
  }

  async getActiveThemeId() {
    await this.ensureThemesDirectory();
    try {
      const id = await fs.readFile(this.activeThemeFile, 'utf8');
      return (id || 'capsule').trim();
    } catch {
      return 'capsule';
    }
  }

  async setActiveTheme(themeId) {
    await this.ensureThemesDirectory();
    const folder = path.join(this.themesDir, themeId);
    await fs.access(folder);
    await fs.writeFile(this.activeThemeFile, themeId, 'utf8');
    return themeId;
  }

  async listThemes() {
    await this.ensureThemesDirectory();
    const activeId = await this.getActiveThemeId();
    const entries = await fs.readdir(this.themesDir, { withFileTypes: true });
    const themes = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const themeJsonPath = path.join(this.themesDir, entry.name, 'theme.json');
        try {
          const content = await fs.readFile(themeJsonPath, 'utf8');
          const meta = JSON.parse(content);
          themes.push({
            ...meta,
            isActive: meta.id === activeId
          });
        } catch {
          // Folder non-tema dilewati
        }
      }
    }
    return themes;
  }

  async getTheme(themeId) {
    await this.ensureThemesDirectory();
    const folder = path.join(this.themesDir, themeId);
    const metaPath = path.join(folder, 'theme.json');
    const cssPath = path.join(folder, 'style.css');

    const meta = JSON.parse(await fs.readFile(metaPath, 'utf8'));
    let css = '';
    try {
      css = await fs.readFile(cssPath, 'utf8');
    } catch {
      css = '';
    }

    return {
      ...meta,
      css,
      isActive: meta.id === (await this.getActiveThemeId())
    };
  }

  async updateThemeSettings(themeId, newSettings = {}) {
    await this.ensureThemesDirectory();
    const folder = path.join(this.themesDir, themeId);
    const metaPath = path.join(folder, 'theme.json');
    const meta = JSON.parse(await fs.readFile(metaPath, 'utf8'));

    meta.settings = {
      ...(meta.settings || {}),
      ...newSettings
    };

    if (newSettings.primaryColor) {
      meta.accentColor = newSettings.primaryColor;
    }

    await fs.writeFile(metaPath, JSON.stringify(meta, null, 2), 'utf8');
    return meta;
  }
}
