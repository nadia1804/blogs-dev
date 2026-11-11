import { File, FileText, House, Menu, Palette, Plug, Settings, Tags, Users } from 'lucide-react';
import { AuthorForm } from '../pages/content/AuthorForm.jsx';
import { AuthorList } from '../pages/content/AuthorList.jsx';
import { CategoryForm } from '../pages/content/CategoryForm.jsx';
import { CategoryList } from '../pages/content/CategoryList.jsx';
import { DocList } from '../pages/content/DocList.jsx';
import { DocEditor } from '../pages/editor/DocEditor.jsx';
import { PluginList } from '../pages/extensions/PluginList.jsx';
import { PluginSettings } from '../pages/extensions/PluginSettings.jsx';
import { ThemeList } from '../pages/extensions/ThemeList.jsx';
import { ThemeSettings } from '../pages/extensions/ThemeSettings.jsx';
import { Home } from '../pages/Home.jsx';
import { BackupSettings } from '../pages/settings/BackupSettings.jsx';
import { CachingSettings } from '../pages/settings/CachingSettings.jsx';
import { PublishSettings } from '../pages/settings/PublishSettings.jsx';
import { ImageSettings } from '../pages/settings/ImageSettings.jsx';
import { PostTypeForm } from '../pages/settings/PostTypeForm.jsx';
import { SeoGlobal } from '../pages/settings/SeoGlobal.jsx';
import { SiteIdentity } from '../pages/settings/SiteIdentity.jsx';
import { WatcherSettings } from '../pages/settings/WatcherSettings.jsx';
import { PostTypeList } from '../pages/settings/PostTypeList.jsx';
import { NavigationEditor } from '../pages/navigation/NavigationEditor.jsx';
import { NavigationList } from '../pages/navigation/NavigationList.jsx';
import { NotFound } from '../pages/Placeholder.jsx';
import { PostTypeChooser } from '../pages/PostTypeChooser.jsx';
import { Appearance } from '../pages/settings/Appearance.jsx';
import { SettingsIndex } from '../pages/settings/SettingsIndex.jsx';

// Panel 1: isi sidebar, dikelompokkan dengan pemisah.
export const NAV_GROUPS = [
  [{ to: '/', label: 'Home', icon: House }],
  [
    { to: '/posts', label: 'Post', icon: FileText },
    { to: '/pages', label: 'Page', icon: File },
    { to: '/authors', label: 'Authors', icon: Users },
    { to: '/categories', label: 'Category', icon: Tags },
    { to: '/navigation', label: 'Navigation', icon: Menu },
  ],
  [
    { to: '/themes', label: 'Themes', icon: Palette },
    { to: '/plugins', label: 'Plugin', icon: Plug },
  ],
  [{ to: '/settings', label: 'Settings', icon: Settings }],
];

const typeLabel = (params, { postTypes }) =>
  postTypes.find((type) => type.id === params.type)?.label ?? params.type;


// Panel 3: setiap rute adalah satu layer workspace.
//   title: string | (params, data) => string   -> teks breadcrumb
export const routes = [
  { pattern: '/', title: 'Home', icon: House, component: Home },

  { pattern: '/posts', title: 'Post', icon: FileText, component: PostTypeChooser, props: { base: '/posts', heading: 'Post' } },
  { pattern: '/posts/:type', title: typeLabel, component: DocList, props: { kind: 'posts' } },
  { pattern: '/posts/:type/:id', title: 'Editor', component: DocEditor, props: { kind: 'posts' }, fullBleed: true },

  { pattern: '/pages', title: 'Page', icon: File, component: DocList, props: { kind: 'pages' } },
  { pattern: '/pages/:id', title: 'Editor', component: DocEditor, props: { kind: 'pages' }, fullBleed: true },

  { pattern: '/authors', title: 'Authors', icon: Users, component: AuthorList },
  { pattern: '/authors/:id', title: 'Author', component: AuthorForm },

  { pattern: '/categories', title: 'Category', icon: Tags, component: PostTypeChooser, props: { base: '/categories', heading: 'Category' } },
  { pattern: '/categories/:type', title: typeLabel, component: CategoryList },
  { pattern: '/categories/:type/:id', title: 'Kategori', component: CategoryForm },

  { pattern: '/navigation', title: 'Navigation', icon: Menu, component: NavigationList },
  { pattern: '/navigation/:id', title: 'Menu', component: NavigationEditor },

  { pattern: '/themes', title: 'Themes', icon: Palette, component: ThemeList },
  { pattern: '/themes/:id', title: 'Pengaturan', component: ThemeSettings },
  { pattern: '/plugins', title: 'Plugin', icon: Plug, component: PluginList },
  { pattern: '/plugins/:id', title: 'Pengaturan', component: PluginSettings },

  { pattern: '/settings', title: 'Settings', icon: Settings, component: SettingsIndex },
  { pattern: '/settings/site', title: 'Identitas situs', component: SiteIdentity },
  { pattern: '/settings/seo', title: 'SEO global', component: SeoGlobal },
  { pattern: '/settings/images', title: 'Gambar', component: ImageSettings },
  { pattern: '/settings/watcher', title: 'Watcher', component: WatcherSettings },
  { pattern: '/settings/caching', title: 'Caching', component: CachingSettings },
  { pattern: '/settings/publish', title: 'Publish', component: PublishSettings },
  { pattern: '/settings/backup', title: 'Backup dan restore', component: BackupSettings },
  { pattern: '/settings/appearance', title: 'Tampilan', component: Appearance },
  { pattern: '/settings/post-types', title: 'Post type', component: PostTypeList },
  { pattern: '/settings/post-types/:id', title: 'Post type', component: PostTypeForm },
];

export const notFoundRoute = { pattern: '*', title: 'Tidak ditemukan', component: NotFound };

// `overrides` = judul yang dipasang layer lewat useLayerTitle().
export const layerTitle = (layer, data, overrides = {}) =>
  overrides[layer.path] ??
  (typeof layer.route.title === 'function' ? layer.route.title(layer.params, data) : layer.route.title);
