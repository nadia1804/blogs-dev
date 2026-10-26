import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { ThemeManager } from '../src/core/themeManager.js';

test('ThemeManager manages capsule theme and settings', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fruition-themes-test-'));

  try {
    const tm = new ThemeManager(tmpDir);
    await tm.ensureThemesDirectory();

    // Verify themes directory structure
    const themes = await tm.listThemes();
    assert.strictEqual(themes.length, 1);
    assert.strictEqual(themes[0].id, 'capsule');
    assert.strictEqual(themes[0].isActive, true);

    // Verify getTheme loads CSS and JSON
    const capsule = await tm.getTheme('capsule');
    assert.strictEqual(capsule.name, 'Capsule');
    assert.ok(capsule.css.includes('TEMA CAPSULE'));
    assert.ok(capsule.css.includes('--capsule-radius'));

    // Verify updating settings
    await tm.updateThemeSettings('capsule', {
      primaryColor: '#2563eb',
      pillRadius: '24px',
      maxWidth: '840px'
    });

    const updated = await tm.getTheme('capsule');
    assert.strictEqual(updated.settings.primaryColor, '#2563eb');
    assert.strictEqual(updated.settings.pillRadius, '24px');
    assert.strictEqual(updated.settings.maxWidth, '840px');
    assert.strictEqual(updated.accentColor, '#2563eb');
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
});
