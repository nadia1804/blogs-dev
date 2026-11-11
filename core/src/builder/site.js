import { plainText } from './render-blocks.js';

export const PAGE_SIZE = 12; // post per halaman arsip
export const HOME_POSTS = 13; // 1 besar + 1 sedang + sisanya kecil

// Struktur alamat situs:
//   /                              beranda
//   /{type}/                       arsip post type      (+ /page/N/)
//   /{type}/{slug}/                post
//   /{type}/kategori/{slug}/       arsip kategori       (+ /page/N/)
//   /author/{slug}/                arsip author         (+ /page/N/)
//   /{slug}/                       page
//   /404.html
const WORDS_PER_MINUTE = 200;

const byDateDesc = (a, b) => (a.date < b.date ? 1 : -1);

// Bagi daftar post menjadi halaman-halaman arsip.
function paginate(posts, basePath) {
  const total = Math.max(1, Math.ceil(posts.length / PAGE_SIZE));
  const pathOf = (page) => (page === 1 ? basePath : `${basePath}page/${page}/`);
  return Array.from({ length: total }, (_, index) => {
    const page = index + 1;
    return {
      path: pathOf(page),
      posts: posts.slice(index * PAGE_SIZE, page * PAGE_SIZE),
      pagination: {
        page,
        total,
        count: posts.length, // jumlah seluruh post di arsip ini
        prev: page > 1 ? pathOf(page - 1) : null,
        next: page < total ? pathOf(page + 1) : null,
        pages: Array.from({ length: total }, (_, i) => ({ page: i + 1, path: pathOf(i + 1) })),
      },
    };
  });
}

// Susun model situs dari konten mentah: lengkapi tiap dokumen dengan path
// dan relasinya, lalu daftarkan semua rute (halaman) yang akan dibuat.
export function createSite(content) {
  const { settings, postTypes, pages, authors } = content;
  const warnings = [];

  const types = postTypes.map((type) => ({ ...type, path: `/${type.id}/` }));
  const typeById = new Map(types.map((type) => [type.id, type]));

  const categories = content.categories.map((category) => ({
    ...category,
    path: `/${category.postType}/kategori/${category.slug}/`,
  }));
  const categoryById = new Map(categories.map((category) => [category.id, category]));

  const authorList = authors.map((author) => ({ ...author, path: `/author/${author.slug}/` }));
  const authorById = new Map(authorList.map((author) => [author.id, author]));

  const posts = content.posts
    .filter((post) => typeById.has(post.type))
    .map((post) => {
      const text = plainText(post.content);
      return {
        ...post,
        path: `/${post.type}/${post.slug}/`,
        date: post.publishedAt ?? post.scheduledAt ?? post.updatedAt,
        postType: typeById.get(post.type),
        categories: post.categoryIds.map((id) => categoryById.get(id)).filter(Boolean),
        authors: post.authorIds.map((id) => authorById.get(id)).filter(Boolean),
        text,
        readingMinutes: Math.max(1, Math.round(text.split(' ').length / WORDS_PER_MINUTE)),
      };
    })
    .sort(byDateDesc);
  const postById = new Map(posts.map((post) => [post.id, post]));

  const pageList = pages.map((page) => ({ ...page, path: `/${page.slug}/`, text: plainText(page.content) }));
  const pageById = new Map(pageList.map((page) => [page.id, page]));

  // --- Rute -----------------------------------------------------------------
  const routes = [];
  const taken = new Map();
  const add = (route) => {
    if (taken.has(route.path)) {
      warnings.push(`Alamat ${route.path} dipakai dua kali (${taken.get(route.path)} dan ${route.label}). Yang kedua dilewati.`);
      return;
    }
    taken.set(route.path, route.label);
    routes.push(route);
  };

  add({ kind: 'home', path: '/', label: 'beranda', posts: posts.slice(0, HOME_POSTS) });

  const addArchive = (subject, kindOf, heading, description, list, breadcrumb) => {
    for (const chunk of paginate(list, subject.path)) {
      add({
        kind: 'archive',
        path: chunk.path,
        label: `arsip ${heading}`,
        archive: { kindOf, subject, heading, description },
        posts: chunk.posts,
        pagination: chunk.pagination,
        breadcrumb,
      });
    }
  };

  for (const type of types) {
    const list = posts.filter((post) => post.type === type.id);
    addArchive(type, 'postType', type.labelPlural || type.label, '', list, [{ label: type.label, path: type.path }]);
  }
  for (const post of posts) {
    add({
      kind: 'post',
      path: post.path,
      label: `post "${post.title}"`,
      post,
      related: posts.filter((other) => other.id !== post.id && other.type === post.type).slice(0, 3),
      breadcrumb: [
        { label: post.postType.label, path: post.postType.path },
        { label: post.title, path: post.path },
      ],
    });
  }
  for (const category of categories) {
    const type = typeById.get(category.postType);
    if (!type) continue;
    const list = posts.filter((post) => post.categoryIds.includes(category.id));
    addArchive(category, 'category', category.name, category.description, list, [
      { label: type.label, path: type.path },
      { label: category.name, path: category.path },
    ]);
  }
  for (const author of authorList) {
    const list = posts.filter((post) => post.authorIds.includes(author.id));
    addArchive(author, 'author', author.name, author.bio, list, [{ label: author.name, path: author.path }]);
  }
  for (const page of pageList) {
    add({ kind: 'page', path: page.path, label: `page "${page.title}"`, page, breadcrumb: [{ label: page.title, path: page.path }] });
  }
  add({ kind: 'notFound', path: '/404.html', label: 'halaman 404' });

  // --- Menu -------------------------------------------------------------------
  // Tujuan disimpan sebagai ID; di sini diterjemahkan ke alamat. Item yang
  // kontennya sudah tidak ada (atau belum terbit) tidak ditampilkan.
  const resolveTarget = (target) => {
    switch (target.kind) {
      case 'home':
        return { path: '/' };
      case 'url':
        return target.url.startsWith('/') ? { path: target.url, newTab: target.newTab } : { href: target.url, newTab: target.newTab };
      case 'postType':
        return typeById.has(target.postType) ? { path: typeById.get(target.postType).path } : null;
      case 'post':
        return postById.has(target.id) ? { path: postById.get(target.id).path } : null;
      case 'category':
        return categoryById.has(target.id) ? { path: categoryById.get(target.id).path } : null;
      case 'page':
        return pageById.has(target.id) ? { path: pageById.get(target.id).path } : null;
      default:
        return null;
    }
  };
  const resolveItem = (item) => {
    const destination = resolveTarget(item.target);
    if (!destination) return null;
    return {
      label: item.label,
      icon: item.icon,
      newTab: false,
      ...destination,
      children: (item.children ?? []).map(resolveItem).filter(Boolean),
    };
  };
  const menus = Object.fromEntries(content.menus.map((menu) => [menu.id, menu.items.map(resolveItem).filter(Boolean)]));

  return { settings, types, categories, authors: authorList, posts, pages: pageList, menus, routes, warnings, postById, pageById };
}
