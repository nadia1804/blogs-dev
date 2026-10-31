const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const CONTENT_DIR = path.join(ROOT_DIR, 'content');
const NOTION_ASSETS_DIR = path.join(ROOT_DIR, 'src', 'themes', 'fruition-capsule', 'assets', 'notion');

if (!fs.existsSync(NOTION_ASSETS_DIR)) {
  fs.mkdirSync(NOTION_ASSETS_DIR, { recursive: true });
}

const PASTEL_PALETTE = [
  'pastel-blossom',
  'pastel-mint',
  'pastel-periwinkle',
  'pastel-peach',
  'pastel-lilac'
];

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>'"]/g, tag => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[tag] || tag));
}

function slugify(str) {
  return String(str || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-') || 'untitled';
}

function formatDateID(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return isoStr;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

async function downloadMediaFile(url, targetFilename) {
  if (!url) return '';
  try {
    const safeName = targetFilename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const destPath = path.join(NOTION_ASSETS_DIR, safeName);
    const publicUrl = `/assets/notion/${safeName}`;

    const res = await fetch(url);
    if (!res.ok) return url;
    const arrayBuffer = await res.arrayBuffer();
    fs.writeFileSync(destPath, Buffer.from(arrayBuffer));
    return publicUrl;
  } catch (err) {
    console.warn('[Notion Media Download Fallback]:', err.message);
    return url;
  }
}

// Ringan & Aman: Syntax Highlighter untuk Code Block Notion
function highlightCodeSyntax(rawCode, lang = '') {
  let escaped = escapeHtml(rawCode);
  const l = (lang || '').toLowerCase();

  // Deteksi otomatis jika di Notion dilabeli javascript padahal isinya HTML atau CSS
  const trimmed = rawCode.trim();
  const isHtmlContent = trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<html') || trimmed.startsWith('<article') || trimmed.startsWith('<div');
  const isCssContent = !isHtmlContent && (trimmed.startsWith('/*') || trimmed.startsWith(':root') || trimmed.startsWith('.article')) && trimmed.includes('{') && trimmed.includes(':');

  if (isHtmlContent || l === 'html' || l === 'xml') {
    // HTML Comments
    escaped = escaped.replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span class="tok-comment">$1</span>');
    // HTML Tags & Attributes
    escaped = escaped.replace(/(&lt;\/?[a-zA-Z0-9-]+)([\s\S]*?)(\/?&gt;)/g, (m, tagStart, attrs, tagEnd) => {
      const coloredAttrs = attrs.replace(/([a-zA-Z-:]+)=(&quot;.*?&quot;|&#39;.*?&#39;)/g, '<span class="tok-attr">$1</span>=<span class="tok-str">$2</span>');
      return `<span class="tok-tag">${tagStart}</span>${coloredAttrs}<span class="tok-tag">${tagEnd}</span>`;
    });
    return { html: escaped, detectedLang: 'HTML' };
  }

  if (isCssContent || l === 'css' || l === 'scss') {
    // Tokenize comments & strings first to avoid collisions
    const tokens = [];
    const saveToken = (cls, text) => {
      const id = `@@TOK_${tokens.length}@@`;
      tokens.push(`<span class="${cls}">${text}</span>`);
      return id;
    };
    escaped = escaped.replace(/(\/\*[\s\S]*?\*\/)/g, m => saveToken('tok-comment', m));
    escaped = escaped.replace(/(&quot;.*?&quot;|&#39;.*?&#39;)/g, m => saveToken('tok-str', m));
    escaped = escaped.replace(/(--[a-zA-Z0-9-]+|\b[a-zA-Z-]+)(?=\s*:)/g, '<span class="tok-attr">$1</span>');
    escaped = escaped.replace(/(#[0-9a-fA-F]{3,8}\b|\b\d+(?:\.\d+)?(?:px|rem|em|vh|vw|%|deg|ms|s)\b)/g, '<span class="tok-num">$1</span>');
    escaped = escaped.replace(/@@TOK_(\d+)@@/g, (_, idx) => tokens[Number(idx)]);
    return { html: escaped, detectedLang: 'CSS' };
  }

  // Default JS / TS / General Code
  const tokens = [];
  const saveToken = (cls, text) => {
    const id = `@@TOK_${tokens.length}@@`;
    tokens.push(`<span class="${cls}">${text}</span>`);
    return id;
  };
  escaped = escaped.replace(/(\/\*[\s\S]*?\*\/|\/\/.*$)/gm, m => saveToken('tok-comment', m));
  escaped = escaped.replace(/(&quot;.*?&quot;|&#39;.*?&#39;|`[\s\S]*?`)/g, m => saveToken('tok-str', m));
  escaped = escaped.replace(/\b(const|let|var|function|return|if|else|for|while|switch|case|break|continue|new|class|import|from|export|default|async|await|try|catch|true|false|null|undefined)\b/g, '<span class="tok-kw">$1</span>');
  escaped = escaped.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="tok-num">$1</span>');
  escaped = escaped.replace(/@@TOK_(\d+)@@/g, (_, idx) => tokens[Number(idx)]);

  const displayLang = (l === 'plain text' || !l) ? 'Plain Text' : (l === 'javascript' ? 'JavaScript' : l.toUpperCase());
  return { html: escaped, detectedLang: displayLang };
}

function renderRichText(richTextArr = []) {
  if (!Array.isArray(richTextArr)) return '';
  return richTextArr.map(rt => {
    // Handle Notion Inline Equation
    if (rt.type === 'equation' || rt.equation) {
      const expr = rt.equation?.expression || rt.plain_text || '';
      return `<span class="notion-inline-equation" title="Math Equation">${escapeHtml(expr)}</span>`;
    }

    let content = escapeHtml(rt.plain_text || rt.text?.content || '');
    content = content.replace(/\n/g, '<br/>');
    const ann = rt.annotations || {};

    if (ann.code) content = `<code class="notion-inline-code">${content}</code>`;
    if (ann.bold) content = `<strong>${content}</strong>`;
    if (ann.italic) content = `<em>${content}</em>`;
    if (ann.strikethrough) content = `<del>${content}</del>`;
    if (ann.underline) content = `<u>${content}</u>`;

    // Handle Notion Text Color & Background Highlight (Stabilo)
    if (ann.color && ann.color !== 'default') {
      content = `<span class="notion-color-${escapeHtml(ann.color)}">${content}</span>`;
    }

    const href = rt.href || rt.text?.link?.url;
    if (href) {
      const isExt = href.startsWith('http');
      content = `<a href="${escapeHtml(href)}" class="notion-link"${isExt ? ' target="_blank" rel="noopener"' : ''}>${content}</a>`;
    }
    return content;
  }).join('');
}

function extractPlainText(richTextArr = []) {
  if (!Array.isArray(richTextArr)) return '';
  return richTextArr.map(rt => rt.plain_text || rt.text?.content || '').join('');
}

async function fetchBlocksRecursive(blockId, token, depth = 0) {
  if (depth > 4) return [];
  const cleanId = blockId.replace(/-/g, '').trim();
  let allBlocks = [];
  let cursor = undefined;
  let hasMore = true;

  while (hasMore) {
    const url = `https://api.notion.com/v1/blocks/${cleanId}/children?page_size=100` + (cursor ? `&start_cursor=${cursor}` : '');
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Notion-Version': '2022-06-28'
      }
    });
    if (!res.ok) break;
    const data = await res.json();
    const results = data.results || [];
    for (const blk of results) {
      if (blk.has_children) {
        blk.children = await fetchBlocksRecursive(blk.id, token, depth + 1);
      }
      allBlocks.push(blk);
    }
    hasMore = !!data.has_more;
    cursor = data.next_cursor;
  }
  return allBlocks;
}

async function localizeBlockMedia(blocks, slugPrefix) {
  let imgCounter = 1;
  let fileCounter = 1;
  let embedCounter = 1;

  async function walk(list) {
    for (const blk of list) {
      // 1. Image Blocks
      if (blk.type === 'image' && blk.image) {
        const rawUrl = blk.image.file?.url || blk.image.external?.url || '';
        if (rawUrl && rawUrl.includes('amazonaws.com')) {
          const extMatch = rawUrl.split('?')[0].match(/\.(png|jpg|jpeg|webp|gif|svg)$/i);
          const ext = extMatch ? extMatch[1].toLowerCase() : 'png';
          blk.image.localUrl = await downloadMediaFile(rawUrl, `${slugPrefix}-block-${imgCounter++}.${ext}`);
        } else {
          blk.image.localUrl = rawUrl;
        }
      }

      // 2. File / Attachment Blocks
      if (blk.type === 'file' && blk.file) {
        const rawUrl = blk.file.file?.url || blk.file.external?.url || '';
        const origName = blk.file.name || rawUrl.split('?')[0].split('/').pop() || `attachment-${fileCounter++}.pdf`;
        if (rawUrl && rawUrl.includes('amazonaws.com')) {
          blk.file.localUrl = await downloadMediaFile(rawUrl, `${slugPrefix}-${origName}`);
        } else {
          blk.file.localUrl = rawUrl;
        }
        blk.file.cleanName = decodeURIComponent(origName);
      }

      // 3. Embed Blocks (e.g. Notion S3 uploaded index.html demo)
      if (blk.type === 'embed' && blk.embed) {
        const rawUrl = blk.embed.url || '';
        if (rawUrl && rawUrl.includes('amazonaws.com')) {
          const filePart = decodeURIComponent(rawUrl.split('?')[0].split('/').pop() || `embed-${embedCounter++}.html`);
          blk.embed.localUrl = await downloadMediaFile(rawUrl, `${slugPrefix}-embed-${filePart}`);
          blk.embed.cleanName = filePart;
        } else {
          blk.embed.localUrl = rawUrl;
          blk.embed.cleanName = rawUrl;
        }
      }

      if (blk.children && blk.children.length > 0) {
        await walk(blk.children);
      }
    }
  }
  await walk(blocks);
}

function convertBlocksToHtmlAndToc(blocks = []) {
  const toc = [];
  let totalWords = 0;

  function countWords(str) {
    const words = String(str || '').trim().split(/\s+/).filter(Boolean);
    totalWords += words.length;
  }

  // First pass: collect all headings so inline table_of_contents block can use them
  function collectHeadings(list) {
    for (const blk of list) {
      if (!blk || !blk.type) continue;
      if (/^heading_[1-4]$/.test(blk.type)) {
        const level = parseInt(blk.type.replace('heading_', ''), 10) || 2;
        const plain = extractPlainText(blk[blk.type]?.rich_text || []);
        const hid = slugify(plain) + '-' + blk.id.slice(0, 4);
        blk._headingId = hid;
        if (level <= 3 && plain.trim()) {
          toc.push({ id: hid, text: plain.trim(), level });
        }
      }
      if (blk.children?.length) collectHeadings(blk.children);
    }
  }
  collectHeadings(blocks);

  function renderList(listBlocks) {
    let html = '';
    let i = 0;
    while (i < listBlocks.length) {
      const blk = listBlocks[i];
      const type = blk.type;

      // Group consecutive bulleted_list_item
      if (type === 'bulleted_list_item') {
        html += '<ul class="notion-bulleted-list">\n';
        while (i < listBlocks.length && listBlocks[i].type === 'bulleted_list_item') {
          const item = listBlocks[i];
          const data = item.bulleted_list_item || {};
          const rt = data.rich_text || [];
          countWords(extractPlainText(rt));
          const colorCls = (data.color && data.color !== 'default') ? ` notion-color-${escapeHtml(data.color)}` : '';
          const childrenHtml = item.children?.length ? '\n' + renderList(item.children) : '';
          html += `  <li class="notion-list-item${colorCls}">${renderRichText(rt)}${childrenHtml}</li>\n`;
          i++;
        }
        html += '</ul>\n';
        continue;
      }

      // Group consecutive numbered_list_item
      if (type === 'numbered_list_item') {
        html += '<ol class="notion-numbered-list">\n';
        while (i < listBlocks.length && listBlocks[i].type === 'numbered_list_item') {
          const item = listBlocks[i];
          const data = item.numbered_list_item || {};
          const rt = data.rich_text || [];
          countWords(extractPlainText(rt));
          const colorCls = (data.color && data.color !== 'default') ? ` notion-color-${escapeHtml(data.color)}` : '';
          const childrenHtml = item.children?.length ? '\n' + renderList(item.children) : '';
          html += `  <li class="notion-list-item${colorCls}">${renderRichText(rt)}${childrenHtml}</li>\n`;
          i++;
        }
        html += '</ol>\n';
        continue;
      }

      html += renderSingleBlock(blk) + '\n';
      i++;
    }
    return html;
  }

  function renderSingleBlock(blk) {
    if (!blk || !blk.type) return '';
    const t = blk.type;
    const data = blk[t] || {};
    const blockColorCls = (data.color && data.color !== 'default') ? ` notion-color-${escapeHtml(data.color)}` : '';

    switch (t) {
      case 'paragraph': {
        const plain = extractPlainText(data.rich_text);
        countWords(plain);
        if (!plain.trim() && (!data.rich_text || data.rich_text.length === 0)) {
          return `<div class="notion-blank-line" aria-hidden="true"></div>`;
        }
        return `<p class="notion-paragraph${blockColorCls}">${renderRichText(data.rich_text)}</p>`;
      }

      case 'heading_1':
      case 'heading_2':
      case 'heading_3':
      case 'heading_4': {
        const level = parseInt(t.replace('heading_', ''), 10) || 2;
        const plain = extractPlainText(data.rich_text);
        countWords(plain);
        const hid = blk._headingId || (slugify(plain) + '-' + blk.id.slice(0, 4));
        const tag = `h${Math.min(level, 4)}`;
        return `<${tag} id="${hid}" class="notion-h${level}${blockColorCls}">${renderRichText(data.rich_text)}</${tag}>`;
      }

      case 'quote': {
        const plain = extractPlainText(data.rich_text);
        countWords(plain);
        const childHtml = blk.children?.length ? `<div class="notion-quote-children">${renderList(blk.children)}</div>` : '';
        return `<blockquote class="notion-quote${blockColorCls}">
          <div class="notion-quote-text">${renderRichText(data.rich_text)}</div>
          ${childHtml}
        </blockquote>`;
      }

      case 'callout': {
        const icon = data.icon?.emoji || '💡';
        const plain = extractPlainText(data.rich_text);
        countWords(plain);
        const childHtml = blk.children?.length ? `<div class="notion-callout-children">${renderList(blk.children)}</div>` : '';
        return `<div class="notion-callout post-callout${blockColorCls}">
          <span class="notion-callout-icon post-callout-icon">${escapeHtml(icon)}</span>
          <div class="notion-callout-content">
            <div class="notion-callout-title">${renderRichText(data.rich_text)}</div>
            ${childHtml}
          </div>
        </div>`;
      }

      case 'code': {
        const rawLang = data.language || 'plain text';
        const codeText = extractPlainText(data.rich_text);
        countWords(codeText);
        const { html: highlightedHtml, detectedLang } = highlightCodeSyntax(codeText, rawLang);
        const label = (rawLang && rawLang !== 'plain text' && rawLang !== 'javascript')
          ? rawLang
          : detectedLang;
        const captionHtml = data.caption?.length
          ? `<div class="notion-code-caption">${renderRichText(data.caption)}</div>`
          : '';

        return `<div class="notion-code-block">
          <div class="notion-code-header">
            <span class="notion-code-lang">
              <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor" style="opacity:0.65;">
                <path d="M4.72 3.22a.75.75 0 0 1 1.06 1.06L2.06 8l3.72 3.72a.75.75 0 1 1-1.06 1.06L.47 8.53a.75.75 0 0 1 0-1.06l4.25-4.25Zm6.56 0a.75.75 0 1 0-1.06 1.06L13.94 8l-3.72 3.72a.75.75 0 1 0 1.06 1.06l4.25-4.25a.75.75 0 0 0 0-1.06l-4.25-4.25Z"/>
              </svg>
              <span>${escapeHtml(label)}</span>
            </span>
            <div class="notion-code-actions">
              <button type="button" class="notion-code-btn" onclick="const pre=this.closest('.notion-code-block').querySelector('.notion-code-pre'); pre.classList.toggle('is-wrapped'); this.classList.toggle('active');" title="Toggle Wrap Code">
                <span>Wrap</span>
              </button>
              <button type="button" class="notion-code-btn" onclick="const code=this.closest('.notion-code-block').querySelector('code').innerText; navigator.clipboard.writeText(code); const s=this.querySelector('span'); const old=s.textContent; s.textContent='Copied!'; setTimeout(()=>s.textContent=old, 1600);" title="Copy code to clipboard">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                <span>Copy</span>
              </button>
            </div>
          </div>
          <pre class="notion-code-pre" data-lang="${escapeHtml(label)}"><code class="language-${escapeHtml(rawLang)}">${highlightedHtml}</code></pre>
          ${captionHtml}
        </div>`;
      }

      case 'divider':
        return '<hr class="notion-divider" />';

      case 'image': {
        const src = data.localUrl || data.file?.url || data.external?.url || '';
        const cap = extractPlainText(data.caption || []);
        if (!src) return '';
        return `<figure class="notion-image-figure">
          <img src="${escapeHtml(src)}" alt="${escapeHtml(cap || 'Article illustration')}" loading="lazy" />
          ${cap ? `<figcaption class="notion-asset-caption">${renderRichText(data.caption)}</figcaption>` : ''}
        </figure>`;
      }

      case 'video': {
        const url = data.external?.url || data.file?.url || '';
        if (!url) return '';
        const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
        if (ytMatch) {
          return `<div class="notion-video-embed">
            <iframe src="https://www.youtube.com/embed/${ytMatch[1]}" allowfullscreen loading="lazy"></iframe>
          </div>`;
        }
        return `<video controls src="${escapeHtml(url)}" class="notion-video-player"></video>`;
      }

      case 'embed': {
        const src = data.localUrl || data.url || '';
        const displayLabel = data.cleanName || (src.length > 65 ? src.slice(0, 62) + '...' : src);
        if (!src) return '';
        return `<div class="notion-embed-card">
          <iframe src="${escapeHtml(src)}" class="notion-embed-iframe" loading="lazy"></iframe>
          <div class="notion-embed-footer">
            <span class="notion-embed-label">⚡ Interactive Embed Preview</span>
            <a href="${escapeHtml(src)}" target="_blank" rel="noopener" class="notion-embed-open">↗ Buka Layar Penuh (${escapeHtml(displayLabel)})</a>
          </div>
        </div>`;
      }

      case 'bookmark': {
        const url = data.url || '';
        const cap = renderRichText(data.caption || []);
        let domain = url;
        try { domain = new URL(url).hostname; } catch (e) {}
        return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener" class="notion-bookmark-card">
          <div class="notion-bookmark-content">
            <div class="notion-bookmark-title">${escapeHtml(domain)}</div>
            <div class="notion-bookmark-url">${escapeHtml(url)}</div>
            ${cap ? `<div class="notion-bookmark-caption">${cap}</div>` : ''}
          </div>
          <div class="notion-bookmark-icon">🔖</div>
        </a>`;
      }

      case 'file': {
        const url = data.localUrl || data.file?.url || data.external?.url || '';
        const name = data.cleanName || data.name || 'Download Attachment';
        return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener" class="notion-file-block" download>
          <span class="notion-file-icon">📎</span>
          <span class="notion-file-name">${escapeHtml(name)}</span>
          <span class="notion-file-badge">Download</span>
        </a>`;
      }

      case 'table': {
        const rows = blk.children || [];
        if (!rows.length) return '';
        const hasColHeader = !!data.has_column_header;
        const hasRowHeader = !!data.has_row_header;
        let tableHtml = '<div class="notion-table-wrapper"><table class="notion-table">';
        rows.forEach((rowBlk, rIdx) => {
          const cells = rowBlk.table_row?.cells || [];
          const isHeadRow = hasColHeader && rIdx === 0;
          tableHtml += `<tr class="${isHeadRow ? 'notion-table-header-row' : 'notion-table-row'}">`;
          cells.forEach((cellRt, cIdx) => {
            countWords(extractPlainText(cellRt));
            const isHeadCell = isHeadRow || (hasRowHeader && cIdx === 0);
            const cellTag = isHeadCell ? 'th' : 'td';
            tableHtml += `<${cellTag} class="notion-table-cell">${renderRichText(cellRt)}</${cellTag}>`;
          });
          tableHtml += '</tr>';
        });
        tableHtml += '</table></div>';
        return tableHtml;
      }

      case 'toggle': {
        const summary = renderRichText(data.rich_text || []);
        countWords(extractPlainText(data.rich_text || []));
        const body = blk.children?.length ? renderList(blk.children) : '';
        return `<details class="notion-toggle${blockColorCls}">
          <summary class="notion-toggle-summary">${summary}</summary>
          <div class="notion-toggle-body">${body}</div>
        </details>`;
      }

      case 'column_list': {
        const cols = blk.children || [];
        if (!cols.length) return '';
        const colHtml = cols.map(colBlk => {
          const inner = colBlk.children?.length ? renderList(colBlk.children) : '';
          return `<div class="notion-column">${inner}</div>`;
        }).join('');
        return `<div class="notion-column-list">${colHtml}</div>`;
      }

      case 'to_do': {
        const checked = !!data.checked;
        return `<div class="notion-todo-item${checked ? ' is-checked' : ''}">
          <input type="checkbox" ${checked ? 'checked' : ''} disabled />
          <span>${renderRichText(data.rich_text)}</span>
        </div>`;
      }

      case 'equation': {
        const expr = data.expression || '';
        return `<div class="notion-block-equation">${escapeHtml(expr)}</div>`;
      }

      case 'table_of_contents': {
        if (!toc.length) return '';
        const itemsHtml = toc.map(item => `
          <a href="#${escapeHtml(item.id)}" class="notion-inline-toc-item" style="padding-left: ${(item.level - 1) * 16}px;">
            <span class="notion-inline-toc-text">${escapeHtml(item.text)}</span>
          </a>
        `).join('');
        return `<nav class="notion-inline-toc" aria-label="Inline Table of Contents">${itemsHtml}</nav>`;
      }

      default:
        return '';
    }
  }

  const contentHtml = renderList(blocks);
  const readingMinutes = Math.max(1, Math.ceil(totalWords / 180));
  return {
    contentHtml,
    toc,
    readingTime: `${readingMinutes} min read`,
    wordCount: totalWords
  };
}

function extractPageMetadata(page, idx = 0, postType = 'read') {
  const props = page.properties || {};

  let title = '';
  for (const k of Object.keys(props)) {
    if (props[k]?.type === 'title' && props[k].title?.length) {
      title = extractPlainText(props[k].title);
      break;
    }
  }
  if (!title) title = `Untitled ${idx + 1}`;

  const slugProp = props.Slug || props.slug;
  let slug = '';
  if (slugProp?.rich_text?.length) {
    slug = extractPlainText(slugProp.rich_text).trim();
  }
  if (!slug) slug = slugify(title);

  const descProp = props.Meta_description || props['Meta description'] || props.Summary || props.Bio || props.tp;
  const description = descProp?.rich_text?.length ? extractPlainText(descProp.rich_text).trim() : '';

  let category = '';
  if (props.Category?.select?.name) {
    category = props.Category.select.name;
  } else if (props.mapel?.multi_select?.[0]?.name) {
    category = props.mapel.multi_select[0].name;
  } else if (props.Role?.multi_select?.[0]?.name) {
    category = props.Role.multi_select[0].name;
  }

  let tags = [];
  if (props.Tags?.multi_select) {
    tags = props.Tags.multi_select.map(t => t.name);
  } else if (props.kelas?.multi_select) {
    tags = props.kelas.multi_select.map(t => t.name);
  }

  const dateRaw = props.Date?.date?.start || page.created_time || new Date().toISOString();
  const published = props.Published?.type === 'checkbox' ? props.Published.checkbox : true;

  const fileProp = props.OG || props.Cover || props.Pic;
  let rawCoverUrl = '';
  let rawCoverName = '';
  if (fileProp?.files?.[0]) {
    const fObj = fileProp.files[0];
    rawCoverUrl = fObj.file?.url || fObj.external?.url || '';
    rawCoverName = fObj.name || `${slug}-cover.png`;
  } else if (page.cover) {
    rawCoverUrl = page.cover.file?.url || page.cover.external?.url || '';
    rawCoverName = `${slug}-cover.png`;
  }

  const authorRelationIds = (props.Authors?.relation || []).map(r => r.id);
  const fallbackPastel = PASTEL_PALETTE[idx % PASTEL_PALETTE.length];

  return {
    id: page.id,
    title,
    slug,
    postType,
    published,
    date: dateRaw,
    formattedDate: formatDateID(dateRaw),
    category: category || 'General',
    tags,
    description,
    rawCoverUrl,
    rawCoverName,
    authorRelationIds,
    fallbackPastel
  };
}

const authorCache = new Map();
async function resolveAuthor(authorPageId, token) {
  if (!authorPageId) return null;
  if (authorCache.has(authorPageId)) return authorCache.get(authorPageId);

  const authorsDir = path.join(CONTENT_DIR, 'authors');
  if (!fs.existsSync(authorsDir)) fs.mkdirSync(authorsDir, { recursive: true });

  if (token) {
    try {
      const cleanId = authorPageId.replace(/-/g, '').trim();
      const res = await fetch(`https://api.notion.com/v1/pages/${cleanId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Notion-Version': '2022-06-28'
        }
      });
      if (res.ok) {
        const page = await res.json();
        const meta = extractPageMetadata(page, 0, 'authors');
        let avatarUrl = '/src/themes/fruition-capsule/assets/avatar-dev.svg';
        if (meta.rawCoverUrl) {
          const extMatch = (meta.rawCoverName || '').match(/\.(png|jpg|jpeg|webp|gif|svg)$/i);
          const ext = extMatch ? extMatch[1].toLowerCase() : 'webp';
          avatarUrl = await downloadMediaFile(meta.rawCoverUrl, `author-${meta.slug}.${ext}`);
        }
        const authorObj = {
          id: page.id,
          name: meta.title,
          title: meta.title,
          slug: meta.slug,
          role: meta.category || 'Writer',
          bio: meta.description || 'Penulis & Kontributor Ruang Baca',
          avatar: avatarUrl,
          published: true
        };
        fs.writeFileSync(path.join(authorsDir, `${meta.slug}.json`), JSON.stringify(authorObj, null, 2), 'utf-8');
        authorCache.set(authorPageId, authorObj);
        return authorObj;
      }
    } catch (e) {
      console.warn('[Resolve Author Warning]:', e.message);
    }
  }
  return null;
}

async function syncFullFruitDatabase(fruitConfig, token) {
  const cleanDbId = (fruitConfig.databaseId || '').replace(/-/g, '').trim();
  if (!cleanDbId || !token) {
    throw new Error('Database ID atau Token Notion kosong.');
  }

  const qRes = await fetch(`https://api.notion.com/v1/databases/${cleanDbId}/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ page_size: 100 })
  });

  if (!qRes.ok) {
    const errText = await qRes.text();
    throw new Error(`Notion query error (${qRes.status}): ${errText}`);
  }

  const qData = await qRes.json();
  const results = qData.results || [];
  const targetColl = fruitConfig.targetCollection || fruitConfig.postType || fruitConfig.id || 'read';
  const postType = fruitConfig.postType || targetColl;
  const collDir = path.join(CONTENT_DIR, targetColl);
  if (!fs.existsSync(collDir)) fs.mkdirSync(collDir, { recursive: true });

  fs.readdirSync(collDir).filter(f => f.endsWith('.json')).forEach(f => {
    try { fs.unlinkSync(path.join(collDir, f)); } catch (e) {}
  });

  if (targetColl === 'authors' || postType === 'authors') {
    const firstProps = results[0]?.properties || {};
    if (firstProps.Authors?.type === 'relation') {
      const relIds = new Set();
      results.forEach(p => {
        (p.properties?.Authors?.relation || []).forEach(r => relIds.add(r.id));
      });
      let count = 0;
      for (const aId of relIds) {
        authorCache.delete(aId);
        const resolved = await resolveAuthor(aId, token);
        if (resolved) count++;
      }
      return { syncedCount: count, mediaCount: count };
    }

    let authorCount = 0;
    for (let i = 0; i < results.length; i++) {
      const page = results[i];
      const meta = extractPageMetadata(page, i, 'authors');
      let avatarUrl = '/assets/notion/author-deddy-hidayat.webp';
      if (meta.rawCoverUrl) {
        const extMatch = (meta.rawCoverName || '').match(/\.(png|jpg|jpeg|webp|gif|svg)$/i);
        const ext = extMatch ? extMatch[1].toLowerCase() : 'webp';
        avatarUrl = await downloadMediaFile(meta.rawCoverUrl, `author-${meta.slug}.${ext}`);
      }
      const authorObj = {
        id: page.id,
        name: meta.title,
        title: meta.title,
        slug: meta.slug,
        role: meta.category || 'Writer',
        bio: meta.description || 'Penulis & Kontributor Ruang Baca',
        avatar: avatarUrl,
        published: true
      };
      fs.writeFileSync(path.join(collDir, `${meta.slug}.json`), JSON.stringify(authorObj, null, 2), 'utf-8');
      authorCount++;
    }
    return { syncedCount: authorCount, mediaCount: authorCount };
  }

  let mediaDownloaded = 0;

  for (let i = 0; i < results.length; i++) {
    const page = results[i];
    const meta = extractPageMetadata(page, i, postType);

    let coverImage = '';
    if (meta.rawCoverUrl) {
      const extMatch = (meta.rawCoverName || '').match(/\.(png|jpg|jpeg|webp|gif|svg)$/i);
      const ext = extMatch ? extMatch[1].toLowerCase() : 'png';
      coverImage = await downloadMediaFile(meta.rawCoverUrl, `${postType}-${meta.slug}-cover.${ext}`);
      mediaDownloaded++;
    }

    let author = {
      name: 'Deddy Hidayat',
      slug: 'deddy-hidayat',
      role: 'Educator',
      bio: 'Cats lover',
      avatar: '/assets/notion/author-deddy-hidayat.webp'
    };
    if (meta.authorRelationIds.length > 0) {
      const resolved = await resolveAuthor(meta.authorRelationIds[0], token);
      if (resolved) author = resolved;
    }

    const blocks = await fetchBlocksRecursive(page.id, token);
    await localizeBlockMedia(blocks, `${postType}-${meta.slug}`);
    const rendered = convertBlocksToHtmlAndToc(blocks);

    const itemPayload = {
      id: page.id,
      title: meta.title,
      slug: meta.slug,
      postType,
      published: meta.published,
      createdTime: page.created_time,
      lastEditedTime: page.last_edited_time,
      date: meta.date,
      formattedDate: meta.formattedDate,
      category: meta.category,
      tags: meta.tags,
      description: meta.description,
      coverImage,
      fallbackPastel: meta.fallbackPastel,
      author,
      readingTime: rendered.readingTime,
      wordCount: rendered.wordCount,
      toc: rendered.toc,
      contentHtml: rendered.contentHtml,
      properties: page.properties
    };

    fs.writeFileSync(path.join(collDir, `${meta.slug}.json`), JSON.stringify(itemPayload, null, 2), 'utf-8');
  }

  return {
    syncedCount: results.length,
    mediaCount: Math.max(results.length, mediaDownloaded)
  };
}

module.exports = {
  syncFullFruitDatabase,
  resolveAuthor,
  fetchBlocksRecursive,
  convertBlocksToHtmlAndToc,
  extractPageMetadata,
  formatDateID,
  escapeHtml,
  slugify
};
