import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = process.cwd();
const CONTENT_DIR = path.join(ROOT_DIR, 'content');
const THEME_JSON = path.join(ROOT_DIR, 'src', 'themes', 'fruition-capsule', 'theme.json');

function readJsonSafe(filePath, fallback = null) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch (e) {
    console.error(`Error reading JSON from ${filePath}:`, e);
  }
  return fallback;
}

export function getSiteSettings() {
  return readJsonSafe(path.join(CONTENT_DIR, 'settings', 'site.json'), {}) || {};
}

export function getThemeConfig() {
  return readJsonSafe(THEME_JSON, {}) || {};
}

export function getAllFruits() {
  const fruitsDir = path.join(CONTENT_DIR, 'fruits');
  if (!fs.existsSync(fruitsDir)) return [];
  return fs.readdirSync(fruitsDir)
    .filter(f => f.endsWith('.json'))
    .map(f => readJsonSafe(path.join(fruitsDir, f)))
    .filter(Boolean);
}

export function getCollectionItems(collectionName) {
  const dir = path.join(CONTENT_DIR, collectionName);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .map(f => readJsonSafe(path.join(dir, f)))
    .filter(item => item && item.published !== false)
    .sort((a, b) => new Date(b.date || b.createdTime || 0) - new Date(a.date || a.createdTime || 0));
}

export function getAllAuthors() {
  const dir = path.join(CONTENT_DIR, 'authors');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .map(f => readJsonSafe(path.join(dir, f)))
    .filter(item => item && (item.name || item.title))
    .map(item => ({
      id: item.id,
      name: item.name || item.title,
      slug: item.slug || 'author',
      role: item.role || item.category || 'Writer',
      bio: item.bio || item.description || 'Penulis & Kontributor',
      avatarUrl: item.avatarUrl || '/src/themes/fruition-capsule/assets/avatar-dev.svg',
      socials: item.socials || {}
    }));
}

export function getPluginConfig(pluginId, fallback = { enabled: false, settings: {} }) {
  const pluginFile = path.join(CONTENT_DIR, 'plugins', `${pluginId}.json`);
  return readJsonSafe(pluginFile, fallback) || fallback;
}

export function getAllPlugins() {
  const pluginsDir = path.join(CONTENT_DIR, 'plugins');
  if (!fs.existsSync(pluginsDir)) return [];
  return fs.readdirSync(pluginsDir)
    .filter(f => f.endsWith('.json'))
    .map(f => readJsonSafe(path.join(pluginsDir, f)))
    .filter(Boolean);
}

export function isPluginEnabled(pluginId) {
  const conf = getPluginConfig(pluginId);
  return Boolean(conf && conf.enabled);
}

export function getAllPostsAcrossAllFruits() {
  const fruits = getAllFruits().filter(f => f.showOnIndex !== false && (f.postType || f.id) !== 'page' && (f.postType || f.id) !== 'authors');
  const allPosts = [];

  for (const fruit of fruits) {
    const postType = fruit.postType || fruit.id;
    const targetColl = fruit.targetCollection || postType;
    const items = getCollectionItems(targetColl);
    for (const item of items) {
      allPosts.push({
        ...item,
        fruitId: fruit.id,
        fruitName: fruit.name || fruit.id,
        fruitRoute: `/${postType}`,
        fruitType: postType,
        fallbackColor: (fruit.settings && fruit.settings.fallbackColor) ? fruit.settings.fallbackColor.toLowerCase().replace('pastel ', '') : 'blossom'
      });
    }
  }

  return allPosts.sort((a, b) => new Date(b.date || b.createdTime || 0) - new Date(a.date || a.createdTime || 0));
}
