/**
 * Block Transformer: Notion Block === Fruition Block
 * Mengubah blok Notion menjadi Fruition AST dan merender HTML dengan style yang 100% persis dengan Notion.
 */

export class BlockTransformer {
  /**
   * Render Rich Text Array ke HTML dengan anotasi (bold, italic, code, link, color)
   */
  static renderRichText(richTextArray = []) {
    if (!Array.isArray(richTextArray) || richTextArray.length === 0) return '';

    return richTextArray.map(token => {
      let text = this.escapeHtml(token.plain_text || token.text?.content || '');
      const ann = token.annotations || {};

      if (ann.code) text = `<code>${text}</code>`;
      if (ann.bold) text = `<strong>${text}</strong>`;
      if (ann.italic) text = `<em>${text}</em>`;
      if (ann.strikethrough) text = `<del>${text}</del>`;
      if (ann.underline) text = `<u>${text}</u>`;
      if (ann.color && ann.color !== 'default') {
        text = `<span class="notion-color-${ann.color}">${text}</span>`;
      }

      if (token.href || token.text?.link?.url) {
        const url = token.href || token.text.link.url;
        text = `<a href="${this.escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${text}</a>`;
      }

      return text;
    }).join('');
  }

  static escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Render single block dan nested children-nya ke HTML bergaya Notion
   */
  static renderBlock(block) {
    if (!block || !block.type) return '';
    const type = block.type;
    const data = block[type] || {};
    const textHtml = this.renderRichText(data.rich_text || []);
    
    // Render nested children jika ada
    let childrenHtml = '';
    if (Array.isArray(block.children) && block.children.length > 0) {
      childrenHtml = `<div class="notion-nested-children">${block.children.map(c => this.renderBlock(c)).join('')}</div>`;
    }

    switch (type) {
      case 'paragraph':
        if (!textHtml) return '<div class="notion-blank-block"></div>';
        return `<p class="notion-p">${textHtml}</p>${childrenHtml}`;

      case 'heading_1':
        return `<h1 class="notion-h1">${textHtml}</h1>${childrenHtml}`;

      case 'heading_2':
        return `<h2 class="notion-h2">${textHtml}</h2>${childrenHtml}`;

      case 'heading_3':
        return `<h3 class="notion-h3">${textHtml}</h3>${childrenHtml}`;

      case 'bulleted_list_item':
        return `<div class="notion-bullet-item"><span class="notion-bullet">•</span><div class="notion-list-content">${textHtml}${childrenHtml}</div></div>`;

      case 'numbered_list_item':
        return `<div class="notion-numbered-item"><span class="notion-number">1.</span><div class="notion-list-content">${textHtml}${childrenHtml}</div></div>`;

      case 'to_do': {
        const checked = data.checked ? 'checked' : '';
        const checkedClass = data.checked ? 'notion-to-do-checked' : '';
        return `<div class="notion-to-do-item ${checkedClass}"><input type="checkbox" disabled ${checked} class="notion-checkbox" /><div class="notion-to-do-text">${textHtml}${childrenHtml}</div></div>`;
      }

      case 'toggle':
        return `<details class="notion-toggle"><summary class="notion-toggle-summary">${textHtml}</summary><div class="notion-toggle-content">${childrenHtml}</div></details>`;

      case 'code': {
        const lang = data.language || 'plaintext';
        return `<div class="notion-code-block"><div class="notion-code-lang">${lang}</div><pre><code class="language-${lang}">${textHtml}</code></pre></div>${childrenHtml}`;
      }

      case 'quote':
        return `<blockquote class="notion-quote">${textHtml}${childrenHtml}</blockquote>`;

      case 'callout': {
        const icon = data.icon?.emoji || '💡';
        return `<div class="notion-callout"><div class="notion-callout-icon">${icon}</div><div class="notion-callout-text">${textHtml}${childrenHtml}</div></div>`;
      }

      case 'divider':
        return `<hr class="notion-divider" />`;

      case 'image': {
        const imgUrl = data.file?.url || data.external?.url || '';
        const caption = this.renderRichText(data.caption || []);
        if (!imgUrl) return '';
        return `<figure class="notion-image-figure"><img src="${this.escapeHtml(imgUrl)}" alt="Notion Image" class="notion-img" />${caption ? `<figcaption class="notion-caption">${caption}</figcaption>` : ''}</figure>${childrenHtml}`;
      }

      default:
        if (textHtml) return `<div class="notion-block-${type}">${textHtml}</div>${childrenHtml}`;
        return childrenHtml;
    }
  }

  /**
   * Render seluruh daftar block menjadi dokumen HTML lengkap dengan Notion CSS styling
   */
  static renderDocumentHtml(title, metadata = {}, blocks = [], authors = []) {
    const blocksHtml = blocks.map(b => this.renderBlock(b)).join('\n');
    
    // Resolve full author profiles if relation provided
    const matchedAuthors = [];
    if (Array.isArray(metadata.authors)) {
      for (const aId of metadata.authors) {
        const found = authors.find(a => a.id === aId);
        if (found) {
          matchedAuthors.push(found);
        } else {
          matchedAuthors.push({ id: aId, name: 'Penulis', bio: '', role: '', pic: '' });
        }
      }
    }

    const authorHeaderDisplay = matchedAuthors.length > 0 ? matchedAuthors.map(a => `
      <a href="/preview?fruit=authors&pageId=${encodeURIComponent(a.id)}" class="notion-author-header-pill" title="Buka Profil Penulis" style="text-decoration: none; color: inherit;">
        ${a.pic ? `<img src="${this.escapeHtml(a.pic)}" class="notion-header-avatar" />` : '<span style="font-size: 14px;">👤</span>'}
        <span><strong>${this.escapeHtml(a.name)}</strong></span>
        ${a.role ? `<span class="notion-header-role">${this.escapeHtml(a.role)}</span>` : ''}
      </a>
    `).join('') : '';

    const authorFooterBoxes = matchedAuthors.length > 0 ? `
      <div class="notion-author-box-section">
        <div class="notion-author-box-label">Tentang Penulis</div>
        ${matchedAuthors.map(a => `
          <div class="notion-author-card">
            ${a.pic ? `<img src="${this.escapeHtml(a.pic)}" alt="${this.escapeHtml(a.name)}" class="notion-author-box-avatar" />` : `<div class="notion-avatar-fallback">✍️</div>`}
            <div class="notion-author-box-details">
              <div class="notion-author-box-name">
                <a href="/preview?fruit=authors&pageId=${encodeURIComponent(a.id)}" style="color: inherit; text-decoration: none;">${this.escapeHtml(a.name)}</a>
                ${a.role ? `<span class="notion-author-box-role">${this.escapeHtml(a.role)}</span>` : ''}
              </div>
              ${a.bio ? `<div class="notion-author-box-bio">${this.escapeHtml(a.bio)}</div>` : ''}
              <div style="margin-top: 10px;">
                <a href="/preview?fruit=authors&pageId=${encodeURIComponent(a.id)}" style="font-size: 12px; font-weight: 700; color: #059669; text-decoration: none;">Lihat Halaman Profil & Semua Tulisan ➔</a>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    ` : '';

    return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(title)} • Fruition Mini</title>
  <meta name="description" content="${this.escapeHtml(metadata.meta_description || '')}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --font-sans: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      --font-mono: 'JetBrains Mono', monospace;
      --bg: #ffffff;
      --text: #111827;
      --text-muted: #6b7280;
      --border: #e5e7eb;
      --primary: #059669;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--font-sans);
      background: var(--bg);
      color: var(--text);
      line-height: 1.7;
      padding: 40px 20px 80px 20px;
    }
    .fruition-article-wrapper {
      max-width: 760px;
      margin: 0 auto;
    }
    .notion-post-header {
      margin-bottom: 36px;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--border);
    }
    .notion-main-title {
      font-size: 38px;
      font-weight: 800;
      letter-spacing: -0.03em;
      line-height: 1.25;
      margin-bottom: 16px;
      color: #0f172a;
    }
    .notion-meta-bar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 16px;
      font-size: 13px;
      color: var(--text-muted);
    }
    .notion-badge-cat {
      background: #eff6ff;
      color: #2563eb;
      padding: 3px 10px;
      border-radius: 999px;
      font-weight: 600;
    }
    .notion-author-header-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: #f8fafc;
      border: 1px solid var(--border);
      padding: 3px 10px;
      border-radius: 999px;
    }
    .notion-header-avatar {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      object-fit: cover;
    }
    .notion-header-role {
      font-size: 11px;
      background: #e2e8f0;
      padding: 1px 6px;
      border-radius: 4px;
      color: #475569;
    }
    .notion-p {
      font-size: 17px;
      margin: 12px 0;
      color: #1f2937;
    }
    .notion-blank-block { height: 16px; }
    .notion-h1 { font-size: 30px; font-weight: 800; margin: 36px 0 16px 0; letter-spacing: -0.02em; }
    .notion-h2 { font-size: 24px; font-weight: 700; margin: 28px 0 12px 0; letter-spacing: -0.01em; }
    .notion-h3 { font-size: 20px; font-weight: 600; margin: 22px 0 10px 0; }
    .notion-bullet-item, .notion-numbered-item { display: flex; align-items: flex-start; margin: 6px 0; font-size: 16px; }
    .notion-bullet { width: 24px; font-size: 18px; line-height: 1.5; color: #4b5563; }
    .notion-number { width: 24px; font-weight: 600; font-size: 15px; color: #4b5563; }
    .notion-list-content { flex: 1; }
    .notion-nested-children { margin-left: 24px; border-left: 2px solid #f3f4f6; padding-left: 12px; }
    .notion-code-block { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin: 20px 0; position: relative; overflow: hidden; }
    .notion-code-lang { font-family: var(--font-mono); font-size: 11px; text-transform: uppercase; padding: 6px 12px; background: #edf2f7; color: #64748b; border-bottom: 1px solid #e2e8f0; font-weight: 600; }
    .notion-code-block pre { padding: 16px; overflow-x: auto; font-family: var(--font-mono); font-size: 14px; line-height: 1.6; color: #0f172a; }
    .notion-callout { display: flex; gap: 14px; background: #f1f5f9; border-radius: 8px; padding: 16px 20px; margin: 20px 0; align-items: flex-start; font-size: 16px; }
    .notion-callout-icon { font-size: 22px; line-height: 1.2; }
    .notion-quote { border-left: 3px solid #111827; padding-left: 16px; margin: 20px 0; font-style: italic; color: #374151; font-size: 17px; }
    .notion-image-figure { margin: 28px 0; text-align: center; }
    .notion-img { max-width: 100%; border-radius: 8px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
    .notion-caption { font-size: 13px; color: var(--text-muted); margin-top: 8px; }
    .notion-divider { border: none; border-top: 1px solid var(--border); margin: 32px 0; }
    code { font-family: var(--font-mono); background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 85%; color: #dc2626; }
    a { color: #2563eb; text-decoration: underline; }

    /* AUTHOR CARD PROFILE BOX */
    .notion-author-box-section {
      margin-top: 50px;
      padding-top: 30px;
      border-top: 1px solid var(--border);
    }
    .notion-author-box-label {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      margin-bottom: 14px;
    }
    .notion-author-card {
      display: flex;
      align-items: center;
      gap: 18px;
      background: #f8fafc;
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 18px 22px;
    }
    .notion-author-box-avatar {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid #ffffff;
      box-shadow: 0 2px 4px rgba(0,0,0,0.08);
    }
    .notion-avatar-fallback {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
    }
    .notion-author-box-name {
      font-size: 17px;
      font-weight: 700;
      color: #0f172a;
    }
    .notion-author-box-role {
      font-size: 11px;
      font-weight: 600;
      background: #ecfdf5;
      color: #059669;
      border: 1px solid #a7f3d0;
      padding: 2px 8px;
      border-radius: 4px;
      margin-left: 8px;
    }
    .notion-author-box-bio {
      font-size: 14px;
      color: #475569;
      margin-top: 4px;
    }

    footer {
      margin-top: 50px;
      padding-top: 24px;
      border-top: 1px solid var(--border);
      font-size: 12px;
      color: var(--text-muted);
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="fruition-article-wrapper">
    <header class="notion-post-header">
      <h1 class="notion-main-title">${this.escapeHtml(title)}</h1>
      <div class="notion-meta-bar">
        ${metadata.date ? `<span>📅 ${metadata.date}</span>` : ''}
        ${metadata.category ? `<span class="notion-badge-cat">${metadata.category}</span>` : ''}
        ${authorHeaderDisplay}
      </div>
    </header>

    <main class="notion-content">
      ${blocksHtml || '<p class="notion-p"><em>Belum ada blok konten.</em></p>'}
    </main>

    ${authorFooterBoxes}

    <footer>
      Dihasilkan secara statis oleh <strong>Fruition Mini</strong> (Headless Notion SSG)
    </footer>
  </div>
</body>
</html>`;
  }

  /**
   * Render Halaman Profil Khusus Author beserta daftar postingan-postingannya
   */
  static renderAuthorProfilePageHtml(author, posts = []) {
    const name = author.name || 'Author';
    const role = author.role || '';
    const bio = author.bio || 'Penulis di platform Fruition Mini.';
    const pic = author.pic || '';

    return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Profil Penulis: ${this.escapeHtml(name)} • Fruition Mini</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #f8fafc;
      --surface: #ffffff;
      --border: #e2e8f0;
      --text: #0f172a;
      --text-muted: #64748b;
      --primary: #059669;
      --primary-subtle: #ecfdf5;
      --primary-border: #a7f3d0;
      --accent: #2563eb;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
      padding: 40px 20px 80px 20px;
    }
    .profile-container {
      max-width: 820px;
      margin: 0 auto;
    }
    /* AUTHOR HERO CARD */
    .author-hero-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 36px 32px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
      display: flex;
      align-items: center;
      gap: 28px;
      margin-bottom: 36px;
    }
    .hero-avatar {
      width: 104px;
      height: 104px;
      border-radius: 50%;
      object-fit: cover;
      border: 3px solid #ffffff;
      box-shadow: 0 4px 10px rgba(0,0,0,0.1);
    }
    .hero-avatar-fallback {
      width: 104px;
      height: 104px;
      border-radius: 50%;
      background: #e2e8f0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 42px;
    }
    .hero-info { flex: 1; }
    .hero-name-row {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 6px;
    }
    .hero-name {
      font-size: 28px;
      font-weight: 800;
      color: var(--text);
      letter-spacing: -0.02em;
    }
    .hero-role-badge {
      font-size: 12px;
      font-weight: 700;
      background: var(--primary-subtle);
      color: var(--primary);
      border: 1px solid var(--primary-border);
      padding: 3px 10px;
      border-radius: 999px;
    }
    .hero-bio {
      font-size: 15px;
      color: var(--text-muted);
      margin-bottom: 14px;
      max-width: 540px;
    }
    .hero-stats {
      font-size: 12px;
      font-weight: 600;
      color: var(--text-muted);
      display: flex;
      gap: 16px;
    }

    /* POSTS SECTION */
    .section-title {
      font-size: 18px;
      font-weight: 800;
      color: var(--text);
      margin-bottom: 18px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .posts-grid {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .post-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 22px 26px;
      text-decoration: none;
      color: inherit;
      transition: all 0.2s ease;
      display: block;
      box-shadow: 0 1px 2px rgba(0,0,0,0.03);
    }
    .post-card:hover {
      border-color: var(--primary);
      box-shadow: 0 4px 12px rgba(5, 150, 105, 0.08);
      transform: translateY(-1px);
    }
    .post-card-meta {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 12px;
      color: var(--text-muted);
      margin-bottom: 8px;
    }
    .post-category-tag {
      font-size: 11px;
      font-weight: 700;
      background: #eff6ff;
      color: var(--accent);
      padding: 2px 8px;
      border-radius: 4px;
    }
    .post-card-title {
      font-size: 18px;
      font-weight: 700;
      color: var(--text);
      margin-bottom: 6px;
      line-height: 1.35;
    }
    .post-card-desc {
      font-size: 14px;
      color: var(--text-muted);
      line-height: 1.6;
    }
    .post-card-readmore {
      margin-top: 12px;
      font-size: 12px;
      font-weight: 700;
      color: var(--primary);
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .empty-posts {
      padding: 40px;
      text-align: center;
      background: var(--surface);
      border: 2px dashed var(--border);
      border-radius: 12px;
      color: var(--text-muted);
    }

    footer {
      margin-top: 60px;
      text-align: center;
      font-size: 12px;
      color: var(--text-muted);
      border-top: 1px solid var(--border);
      padding-top: 24px;
    }
  </style>
</head>
<body>
  <div class="profile-container">

    <!-- HERO AUTHOR PROFILE -->
    <div class="author-hero-card">
      ${pic ? `<img src="${this.escapeHtml(pic)}" alt="${this.escapeHtml(name)}" class="hero-avatar" />` : '<div class="hero-avatar-fallback">✍️</div>'}
      <div class="hero-info">
        <div class="hero-name-row">
          <h1 class="hero-name">${this.escapeHtml(name)}</h1>
          ${role ? `<span class="hero-role-badge">${this.escapeHtml(role)}</span>` : ''}
        </div>
        <p class="hero-bio">${this.escapeHtml(bio)}</p>
        <div class="hero-stats">
          <span>📚 Total Artikel Ditulis: <strong>${posts.length}</strong></span>
          <span>● Status: Terverifikasi di Notion</span>
        </div>
      </div>
    </div>

    <!-- POSTS BY THIS AUTHOR -->
    <div class="section-title">
      <span>📝 Tulisan & Artikel oleh ${this.escapeHtml(name)}</span>
    </div>

    ${posts.length === 0 ? `
      <div class="empty-posts">
        <div style="font-size: 32px; margin-bottom: 6px;">📭</div>
        <p>Belum ada artikel yang ditautkan ke penulis ini.</p>
      </div>
    ` : `
      <div class="posts-grid">
        ${posts.map(post => {
          const p = post.properties || {};
          const title = p.Title?.value || 'Untitled Post';
          const slug = p.Slug?.value || post.id;
          const date = p.Date?.value || '';
          const category = p.Category?.value || '';
          const desc = p.Meta_description?.value || '';
          const fruitSource = post.fruitName || 'read';

          return `
            <a href="/preview?fruit=${encodeURIComponent(fruitSource)}&pageId=${encodeURIComponent(post.id)}" class="post-card">
              <div class="post-card-meta">
                ${category ? `<span class="post-category-tag">${this.escapeHtml(category)}</span>` : ''}
                ${date ? `<span>📅 ${this.escapeHtml(date)}</span>` : ''}
                <span>slug: <code>${this.escapeHtml(slug)}</code></span>
              </div>
              <div class="post-card-title">${this.escapeHtml(title)}</div>
              ${desc ? `<div class="post-card-desc">${this.escapeHtml(desc)}</div>` : ''}
              <div class="post-card-readmore">Baca Selengkapnya ➔</div>
            </a>
          `;
        }).join('')}
      </div>
    `}

    <footer>
      Halaman Penulis • Dihasilkan secara statis oleh <strong>Fruition Mini</strong>
    </footer>
  </div>
</body>
</html>`;
  }
}
