// Tema bawaan Blogs CMS. Kontrak tema: core/src/contracts/theme.js
import { layout } from './layout.js';
import { home } from './templates/home.js';
import { archive, notFound, page } from './templates/pages.js';
import { post } from './templates/post.js';

export default {
  layout,
  templates: { home, post, page, archive, notFound },
};
