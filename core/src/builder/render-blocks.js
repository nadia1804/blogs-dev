import { parseOptions, youtubeId } from '../schema-types/extract.js';
import { escapeHtml, raw } from '../util/html.js';
import { slugify } from '../util/slug.js';

// Merender konten editor (JSON block BlockNote) menjadi HTML dengan perender
// milik kita sendiri, bukan milik editor. Dengan begitu format konten tetap
// milik CMS, keluaran HTML terkendali, dan tema bisa mengganti perender
// block tertentu lewat `overrides`.

const SAFE_HREF = /^(https?:|mailto:|tel:|\/|#)/i;

const attr = (name, value) => (value === undefined || value === null || value === '' ? '' : ` ${name}="${escapeHtml(value)}"`);

function inline(content, ctx) {
  if (typeof content === 'string') return escapeHtml(content);
  if (!Array.isArray(content)) return '';
  return content
    .map((node) => {
      if (node.type === 'link') {
        const href = SAFE_HREF.test(node.href ?? '') ? node.href : '#';
        const external = /^https?:/i.test(href);
        return `<a href="${escapeHtml(href)}"${external ? ' rel="noopener"' : ''}>${inline(node.content, ctx)}</a>`;
      }
      if (node.type !== 'text') return '';
      let out = escapeHtml(node.text).replace(/\n/g, '<br>');
      const styles = node.styles ?? {};
      if (styles.code) out = `<code>${out}</code>`;
      if (styles.bold) out = `<strong>${out}</strong>`;
      if (styles.italic) out = `<em>${out}</em>`;
      if (styles.underline) out = `<u>${out}</u>`;
      if (styles.strike) out = `<s>${out}</s>`;
      return out;
    })
    .join('');
}

const alignment = (props) =>
  ['center', 'right', 'justify'].includes(props?.textAlignment) ? ` style="text-align:${props.textAlignment}"` : '';

const cellContent = (cell, ctx) => inline(Array.isArray(cell) ? cell : cell?.content, ctx);

const renderers = {
  paragraph(block, ctx) {
    const body = inline(block.content, ctx);
    return body ? `<p${alignment(block.props)}>${body}</p>` : '';
  },

  // Judul halaman sudah memakai <h1>, jadi heading konten turun satu tingkat.
  // Tiap heading diberi id, supaya bisa dituju dari daftar isi.
  heading(block, ctx) {
    const level = Math.min((Number(block.props?.level) || 1) + 1, 6);
    return `<h${level}${attr('id', ctx.headingIds.get(block.id))}${alignment(block.props)}>${inline(block.content, ctx)}</h${level}>`;
  },

  quote: (block, ctx) => `<blockquote>${inline(block.content, ctx)}</blockquote>`,

  codeBlock(block, ctx) {
    const language = /^[\w+-]+$/.test(block.props?.language ?? '') ? block.props.language : '';
    return `<pre><code${attr('class', language && `language-${language}`)}>${inline(block.content, ctx)}</code></pre>`;
  },

  divider: () => '<hr>',

  image(block, ctx) {
    const { url, caption, name } = block.props ?? {};
    if (!url) return '';
    const alt = caption || name || '';
    let img;
    if (ctx.picture) {
      // Lebar kolom tulisan sekitar 720px; di layar kecil selebar layar.
      img = ctx.picture(url, { alt, sizes: '(min-width: 768px) 720px, 100vw' });
    } else {
      const image = ctx.image(url);
      img = `<img src="${escapeHtml(image.src)}"${attr('width', image.width)}${attr('height', image.height)} alt="${escapeHtml(alt)}" loading="lazy" decoding="async">`;
    }
    return `<figure>${img}${caption ? `<figcaption>${escapeHtml(caption)}</figcaption>` : ''}</figure>`;
  },

  table(block, ctx) {
    const rows = block.content?.rows ?? [];
    const body = rows
      .map((row) => `<tr>${row.cells.map((cell) => `<td>${cellContent(cell, ctx)}</td>`).join('')}</tr>`)
      .join('');
    return body ? `<div class="table-wrap"><table><tbody>${body}</tbody></table></div>` : '';
  },
};

// --- Block content schema ---------------------------------------------------
// Isinya juga dibaca schema-types/extract.js untuk JSON-LD, jadi teks yang
// tampil dan data terstrukturnya selalu sama.

renderers.faq = (block, ctx) => {
  const question = block.props?.question?.trim();
  const answer = inline(block.content, ctx);
  if (!question && !answer) return '';
  return `<details class="faq"><summary>${escapeHtml(question || 'Pertanyaan')}</summary><div class="faq-answer">${answer}</div></details>`;
};

renderers.quiz = (block) => {
  const { question, explanation } = block.props ?? {};
  const options = parseOptions(block.props?.options).filter((option) => option.trim());
  const answer = Number(block.props?.answer);
  if (!question?.trim() || options.length < 2) return '';
  const items = options.map((option) => `<li>${escapeHtml(option)}</li>`).join('');
  const key = options[answer] === undefined ? '' : `<p><strong>Jawaban: ${String.fromCharCode(65 + answer)}.</strong> ${escapeHtml(options[answer])}</p>`;
  const why = explanation?.trim() ? `<p>${escapeHtml(explanation.trim())}</p>` : '';
  return `<div class="quiz"><p class="quiz-question">${escapeHtml(question.trim())}</p><ol class="quiz-options" type="A">${items}</ol>${
    key ? `<details class="quiz-answer"><summary>Lihat jawaban</summary>${key}${why}</details>` : ''
  }</div>`;
};

renderers.callout = (block, ctx) => {
  const variant = ['info', 'tip', 'warning'].includes(block.props?.variant) ? block.props.variant : 'info';
  const body = inline(block.content, ctx);
  return body ? `<aside class="callout callout-${variant}">${body}</aside>` : '';
};

// Video ditampilkan sebagai tautan bergambar, bukan iframe: halaman tetap
// ringan dan tidak memuat skrip pihak ketiga sampai pengunjung mengekliknya.
renderers.embedVideo = (block) => {
  const url = block.props?.url?.trim();
  if (!url || !/^https?:/i.test(url)) return '';
  const title = block.props?.title?.trim() || 'Tonton video';
  const id = youtubeId(url);
  const thumb = id
    ? `<img src="https://i.ytimg.com/vi/${id}/hqdefault.jpg" width="480" height="360" alt="" loading="lazy" decoding="async">`
    : '';
  return `<a class="video-embed" href="${escapeHtml(url)}" target="_blank" rel="noopener">${thumb}<span class="video-embed-title">▶ ${escapeHtml(title)}</span></a>`;
};

// Block yang berurutan dan sejenis dibungkus satu elemen induk.
const LISTS = {
  bulletListItem: { open: '<ul>', close: '</ul>' },
  numberedListItem: { open: '<ol>', close: '</ol>' },
  checkListItem: { open: '<ul class="checklist">', close: '</ul>' },
  howtoStep: { open: '<ol class="howto">', close: '</ol>' },
  term: { open: '<dl class="glossary">', close: '</dl>' },
};

function listItem(block, ctx) {
  const body = inline(block.content, ctx);
  if (block.type === 'howtoStep') {
    const title = block.props?.title?.trim();
    return `<li>${title ? `<strong class="howto-title">${escapeHtml(title)}</strong>` : ''}<div>${body}</div></li>`;
  }
  if (block.type === 'term') {
    return `<div><dt>${escapeHtml(block.props?.term?.trim() ?? '')}</dt><dd>${body}</dd></div>`;
  }
  const mark =
    block.type === 'checkListItem'
      ? `<input type="checkbox" disabled${block.props?.checked ? ' checked' : ''}> `
      : '';
  return `<li>${mark}${body}${renderList(block.children ?? [], ctx)}</li>`;
}

function renderList(blocks, ctx) {
  let out = '';
  let open = null; // jenis daftar yang sedang terbuka
  const close = () => {
    if (open) out += LISTS[open].close;
    open = null;
  };

  for (const block of blocks) {
    if (LISTS[block.type]) {
      if (open !== block.type) {
        close();
        out += LISTS[block.type].open;
        open = block.type;
      }
      out += listItem(block, ctx);
      continue;
    }
    close();
    const render = ctx.overrides[block.type] ?? renderers[block.type] ?? renderers.paragraph;
    out += render(block, ctx);
    // Block bersarang selain daftar (mis. paragraf yang diindentasi).
    if (block.children?.length) out += `<div class="nested">${renderList(block.children, ctx)}</div>`;
  }
  close();
  return out;
}

// options:
//   image(path)  -> { src, width?, height? }   wajib: cara menerjemahkan path gambar
//   picture(path, { alt, sizes }) -> string    opsional: elemen gambar responsif
//   overrides    -> { [jenisBlock]: (block, ctx) => string }
//   headings     -> hasil headingsOf(), bila konten dirender sepotong-sepotong
export function renderBlocks(blocks, { image, picture, overrides = {}, headings }) {
  const list = Array.isArray(blocks) ? blocks : [];
  const headingIds = new Map((headings ?? headingsOf(list)).map((heading) => [heading.blockId, heading.id]));
  return raw(renderList(list, { image, picture, overrides, headingIds }));
}

const inlineText = (content) =>
  Array.isArray(content) ? content.map((node) => (node.type === 'text' ? node.text : inlineText(node.content))).join('') : '';

// Semua heading di konten, berurutan, masing-masing dengan id unik yang
// dibuat dari teksnya. Dipakai untuk atribut id dan untuk daftar isi.
//   -> [{ blockId, id, text, level }]   level 2 = subjudul utama
export function headingsOf(blocks) {
  const used = new Map();
  const list = [];
  const walk = (items) => {
    for (const block of items ?? []) {
      const text = block.type === 'heading' ? inlineText(block.content).trim() : '';
      if (text) {
        const base = slugify(text) || 'bagian';
        const count = used.get(base) ?? 0;
        used.set(base, count + 1);
        list.push({
          blockId: block.id,
          id: count ? `${base}-${count + 1}` : base,
          text,
          level: Math.min((Number(block.props?.level) || 1) + 1, 6),
        });
      }
      walk(block.children);
    }
  };
  walk(blocks);
  return list;
}

// Render isi tulisan untuk halaman yang punya daftar isi.
//   intro  konten sampai paragraf pertama (bila paragraf itu mendahului
//          heading pertama); tema menaruh daftar isi versi ponsel sesudahnya
//   body   sisa konten
//   toc    heading tingkat 2 dan 3 untuk daftar isi
export function renderArticle(blocks, options) {
  const list = Array.isArray(blocks) ? blocks : [];
  const headings = headingsOf(list);
  const firstHeading = list.findIndex((block) => block.type === 'heading');
  const firstParagraph = list.findIndex((block) => block.type === 'paragraph' && inlineText(block.content).trim());
  const split = firstParagraph >= 0 && (firstHeading < 0 || firstParagraph < firstHeading) ? firstParagraph + 1 : 0;
  return {
    intro: renderBlocks(list.slice(0, split), { ...options, headings }),
    body: renderBlocks(list.slice(split), { ...options, headings }),
    toc: headings.filter((heading) => heading.level <= 3).map(({ id, text, level }) => ({ id, text, level })),
  };
}

// Teks polos dari konten, untuk deskripsi otomatis dan waktu baca.
export function plainText(blocks) {
  const pieces = [];
  const walkInline = (content) => {
    if (!Array.isArray(content)) return;
    for (const node of content) {
      if (node.type === 'text') pieces.push(node.text);
      else walkInline(node.content);
    }
  };
  const walk = (list) => {
    for (const block of list ?? []) {
      walkInline(block.content);
      for (const row of block.content?.rows ?? []) {
        for (const cell of row.cells) walkInline(Array.isArray(cell) ? cell : cell?.content);
      }
      pieces.push(' ');
      walk(block.children);
    }
  };
  walk(blocks);
  return pieces.join('').replace(/\s+/g, ' ').trim();
}
