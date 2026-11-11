// Analisis SEO satu dokumen. Murni (tanpa API Node), dipakai panel properti
// di editor. Mengembalikan daftar pemeriksaan dan skor 0-100.
//
//   status: 'good' | 'warn' | 'bad'

const TITLE = { min: 30, max: 60 };
const DESCRIPTION = { min: 70, max: 160 };
const WORDS = { thin: 100, short: 300 };
const SLUG_MAX = 75;

const normalize = (text) => String(text ?? '').toLowerCase().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();

// Kumpulkan teks, heading, gambar, dan tautan dari konten.
function scan(blocks) {
  const info = { text: [], firstParagraph: '', headings: 0, images: 0, imagesWithoutAlt: 0, links: 0 };
  const inline = (content) => {
    if (!Array.isArray(content)) return '';
    return content
      .map((node) => {
        if (node.type === 'link') {
          info.links += 1;
          return inline(node.content);
        }
        return node.type === 'text' ? node.text : '';
      })
      .join('');
  };
  const walk = (list) => {
    for (const block of list ?? []) {
      const text = inline(block.content).trim();
      if (block.type === 'heading') info.headings += 1;
      if (block.type === 'image' && block.props?.url) {
        info.images += 1;
        if (!block.props.caption?.trim()) info.imagesWithoutAlt += 1;
      }
      if (block.type === 'paragraph' && text && !info.firstParagraph) info.firstParagraph = text;
      for (const key of ['question', 'title', 'term']) if (block.props?.[key]) info.text.push(block.props[key]);
      if (text) info.text.push(text);
      walk(block.children);
    }
  };
  walk(blocks);
  return { ...info, text: info.text.join(' ') };
}

const lengthCheck = (id, label, value, { min, max }) => {
  const length = value.length;
  if (!length) return { id, label, status: 'bad', detail: 'Masih kosong.' };
  if (length < min) return { id, label, status: 'warn', detail: `${length} karakter. Idealnya ${min} sampai ${max}.` };
  if (length > max) return { id, label, status: 'warn', detail: `${length} karakter, akan terpotong di hasil pencarian. Idealnya paling banyak ${max}.` };
  return { id, label, status: 'good', detail: `${length} karakter.` };
};

export function analyzeSeo(doc) {
  const content = scan(doc.content);
  const title = doc.seo.title || doc.title || '';
  const description = doc.seo.description || doc.excerpt || '';
  const words = content.text ? content.text.split(/\s+/).length : 0;
  const keyword = normalize(doc.seo.focusKeyword);
  const checks = [];

  checks.push(lengthCheck('title', 'Panjang judul', title, TITLE));
  checks.push(
    description
      ? lengthCheck('description', 'Panjang deskripsi', description, DESCRIPTION)
      : { id: 'description', label: 'Deskripsi', status: 'bad', detail: 'Isi excerpt atau deskripsi SEO. Tanpa itu, deskripsi diambil dari awal tulisan.' },
  );

  if (!keyword) {
    checks.push({ id: 'keyword', label: 'Kata kunci fokus', status: 'warn', detail: 'Belum diisi, jadi pemakaian kata kunci tidak bisa diperiksa.' });
  } else {
    const has = (text) => normalize(text).includes(keyword);
    const occurrences = normalize(content.text).split(keyword).length - 1;
    const place = (id, label, found, missing) =>
      checks.push({ id, label, status: found ? 'good' : 'warn', detail: found ? 'Ada.' : missing });
    place('keyword-title', 'Kata kunci di judul', has(title), 'Masukkan kata kunci ke judul.');
    place('keyword-description', 'Kata kunci di deskripsi', has(description), 'Masukkan kata kunci ke deskripsi.');
    place('keyword-slug', 'Kata kunci di slug', has(doc.slug), 'Pakai kata kunci di alamat (slug).');
    place('keyword-intro', 'Kata kunci di paragraf pertama', has(content.firstParagraph), 'Sebut kata kunci di paragraf pembuka.');
    checks.push({
      id: 'keyword-body',
      label: 'Kata kunci di isi',
      status: occurrences >= 2 ? 'good' : occurrences === 1 ? 'warn' : 'bad',
      detail: occurrences ? `Muncul ${occurrences} kali.` : 'Belum muncul di isi tulisan.',
    });
  }

  checks.push({
    id: 'length',
    label: 'Panjang tulisan',
    status: words >= WORDS.short ? 'good' : words >= WORDS.thin ? 'warn' : 'bad',
    detail: words >= WORDS.short ? `${words} kata.` : `${words} kata. Tulisan di atas ${WORDS.short} kata lebih mudah mendapat peringkat.`,
  });
  if (words >= WORDS.short) {
    checks.push({
      id: 'headings',
      label: 'Subjudul',
      status: content.headings ? 'good' : 'warn',
      detail: content.headings ? `${content.headings} subjudul.` : 'Pecah tulisan panjang dengan subjudul.',
    });
  }
  if (doc.cover?.src) {
    checks.push({
      id: 'cover-alt',
      label: 'Teks alt gambar cover',
      status: doc.cover.alt?.trim() ? 'good' : 'warn',
      detail: doc.cover.alt?.trim() ? 'Ada.' : 'Isi teks alt gambar cover.',
    });
  }
  if (content.images) {
    checks.push({
      id: 'image-alt',
      label: 'Keterangan gambar di isi',
      status: content.imagesWithoutAlt ? 'warn' : 'good',
      detail: content.imagesWithoutAlt
        ? `${content.imagesWithoutAlt} dari ${content.images} gambar tanpa keterangan (dipakai sebagai teks alt).`
        : 'Semua gambar punya keterangan.',
    });
  }
  checks.push({
    id: 'links',
    label: 'Tautan',
    status: content.links ? 'good' : 'warn',
    detail: content.links ? `${content.links} tautan.` : 'Tambahkan tautan ke tulisan lain atau sumber rujukan.',
  });
  checks.push({
    id: 'slug',
    label: 'Panjang slug',
    status: doc.slug.length <= SLUG_MAX ? 'good' : 'warn',
    detail: doc.slug.length <= SLUG_MAX ? `${doc.slug.length} karakter.` : `${doc.slug.length} karakter. Persingkat alamatnya.`,
  });

  const points = { good: 1, warn: 0.5, bad: 0 };
  const score = Math.round((checks.reduce((sum, check) => sum + points[check.status], 0) / checks.length) * 100);
  return { score, checks };
}
