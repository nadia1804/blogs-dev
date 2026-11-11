import { extract, youtubeId } from './extract.js';

// CONTENT SCHEMA
// ==============
// Setiap jenis schema didefinisikan satu kali di sini:
//   id, label, group   identitas dan pengelompokan di shell
//   fields             field yang diisi admin; shell membuat form-nya otomatis
//   needsBlock         block editor yang harus ada di konten (mis. 'faq')
//   build(c)           menyusun JSON-LD
//
// Jenis field: text | textarea | number | url | datetime | boolean
//              | select (options) | list (satu butir per baris)
//
// `c` untuk build():
//   doc    dokumen (post atau page)        data   isi field schema
//   meta   judul, deskripsi, canonical, gambar
//   found  hasil extract() dari block konten
//   env    { settings, abs }               base   properti umum (lihat common())

const CONTEXT = 'https://schema.org';
const compact = (object) =>
  Object.fromEntries(
    Object.entries(object).filter(([, value]) => value !== undefined && value !== null && value !== '' && !(Array.isArray(value) && !value.length)),
  );
const minutes = (value) => (Number(value) > 0 ? `PT${Math.round(Number(value))}M` : undefined);
const hours = (value) => (Number(value) > 0 ? `PT${Number(value)}H` : undefined);
const list = (value) => (Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : []);

const offer = (data) =>
  data.price === undefined || data.price === ''
    ? undefined
    : { '@type': 'Offer', price: Number(data.price) || 0, priceCurrency: data.currency || 'IDR', category: Number(data.price) ? 'Paid' : 'Free' };

function organization(c) {
  const { site, seo } = c.env.settings;
  const logo = c.env.media?.(site.logo);
  return compact({
    '@type': 'Organization',
    name: seo.organizationName || site.title,
    logo: logo ? { '@type': 'ImageObject', url: logo } : undefined,
  });
}

// Properti yang dimiliki hampir semua jenis.
function common(c) {
  const authors = (c.doc.authors ?? []).map((author) => ({ '@type': 'Person', name: author.name, url: c.env.abs(author.path) }));
  return compact({
    name: c.doc.title,
    description: c.meta.description,
    image: c.meta.image ? [c.meta.image] : undefined,
    url: c.meta.canonical,
    inLanguage: c.env.settings.site.language,
    datePublished: c.doc.date,
    dateModified: c.doc.updatedAt,
    author: authors,
    publisher: organization(c),
  });
}

const article = (type) => (c) => ({
  '@type': type,
  ...c.base,
  headline: c.doc.title.slice(0, 110),
  mainEntityOfPage: c.meta.canonical,
});

function event(type) {
  return (c) => {
    const { data } = c;
    const online = data.mode === 'online';
    const place = compact({ '@type': 'Place', name: data.locationName, address: data.address });
    const virtual = data.onlineUrl ? { '@type': 'VirtualLocation', url: data.onlineUrl } : undefined;
    return compact({
      '@type': type,
      name: c.base.name,
      description: c.base.description,
      image: c.base.image,
      url: c.base.url,
      startDate: data.startDate,
      endDate: data.endDate,
      eventStatus: `${CONTEXT}/EventScheduled`,
      eventAttendanceMode: `${CONTEXT}/${{ online: 'Online', mixed: 'Mixed' }[data.mode] ?? 'Offline'}EventAttendanceMode`,
      location: online ? virtual : data.mode === 'mixed' ? [place, virtual].filter(Boolean) : place,
      organizer: compact({ '@type': 'Organization', name: data.organizer || organization(c).name }),
      teaches: type === 'EducationEvent' ? list(data.teaches) : undefined,
      educationalLevel: type === 'EducationEvent' ? data.educationalLevel : undefined,
    });
  };
}

function video(c, extra = {}) {
  const url = c.data.videoUrl || c.found.videos[0]?.url;
  const id = youtubeId(url);
  return compact({
    name: c.base.name,
    description: c.base.description,
    thumbnailUrl: c.base.image ?? (id ? [`https://i.ytimg.com/vi/${id}/hqdefault.jpg`] : undefined),
    uploadDate: c.doc.date,
    duration: minutes(c.data.minutes),
    embedUrl: id ? `https://www.youtube.com/embed/${id}` : undefined,
    contentUrl: id ? undefined : url,
    publisher: c.base.publisher,
    ...extra,
  });
}

const LEVEL = { key: 'educationalLevel', label: 'Jenjang', type: 'text', hint: 'Misalnya SD kelas 4, SMP, atau Umum.' };
const VIDEO_FIELDS = [
  { key: 'videoUrl', label: 'Alamat video', type: 'url', hint: 'Kosong = memakai block Video pertama di konten.' },
  { key: 'minutes', label: 'Durasi (menit)', type: 'number' },
];
const EVENT_FIELDS = [
  { key: 'startDate', label: 'Mulai', type: 'datetime', required: true },
  { key: 'endDate', label: 'Selesai', type: 'datetime' },
  {
    key: 'mode',
    label: 'Bentuk acara',
    type: 'select',
    options: [
      { value: 'offline', label: 'Tatap muka' },
      { value: 'online', label: 'Daring' },
      { value: 'mixed', label: 'Campuran' },
    ],
  },
  { key: 'locationName', label: 'Nama tempat', type: 'text' },
  { key: 'address', label: 'Alamat', type: 'text' },
  { key: 'onlineUrl', label: 'Tautan daring', type: 'url' },
  { key: 'organizer', label: 'Penyelenggara', type: 'text', hint: 'Kosong = nama organisasi situs.' },
];
const PRICE_FIELDS = [
  { key: 'price', label: 'Harga', type: 'number', hint: 'Isi 0 untuk gratis. Kosong = tidak dicantumkan.' },
];

export const SCHEMA_TYPES = [
  { id: 'Article', label: 'Artikel', group: 'Umum', fields: [], build: article('Article') },
  { id: 'BlogPosting', label: 'Tulisan blog', group: 'Umum', fields: [], build: article('BlogPosting') },
  { id: 'NewsArticle', label: 'Berita', group: 'Umum', fields: [], build: article('NewsArticle') },
  {
    id: 'WebPage',
    label: 'Halaman web',
    group: 'Umum',
    fields: [],
    build: (c) => ({ '@type': 'WebPage', name: c.base.name, description: c.base.description, url: c.base.url, inLanguage: c.base.inLanguage }),
  },
  {
    id: 'FAQPage',
    label: 'Tanya jawab (FAQ)',
    group: 'Umum',
    fields: [],
    needsBlock: 'faq',
    build: (c) => ({
      '@type': 'FAQPage',
      name: c.base.name,
      url: c.base.url,
      mainEntity: c.found.faqs.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: { '@type': 'Answer', text: item.answer },
      })),
    }),
  },
  {
    id: 'HowTo',
    label: 'Panduan langkah (HowTo)',
    group: 'Umum',
    needsBlock: 'howtoStep',
    fields: [
      { key: 'minutes', label: 'Total waktu (menit)', type: 'number' },
      { key: 'supplies', label: 'Bahan', type: 'list' },
      { key: 'tools', label: 'Alat', type: 'list' },
    ],
    build: (c) =>
      compact({
        '@type': 'HowTo',
        name: c.base.name,
        description: c.base.description,
        image: c.base.image,
        totalTime: minutes(c.data.minutes),
        supply: list(c.data.supplies).map((name) => ({ '@type': 'HowToSupply', name })),
        tool: list(c.data.tools).map((name) => ({ '@type': 'HowToTool', name })),
        step: c.found.steps.map((step, index) => ({
          '@type': 'HowToStep',
          position: index + 1,
          name: step.name || `Langkah ${index + 1}`,
          text: step.text,
        })),
      }),
  },
  {
    id: 'QAPage',
    label: 'Satu pertanyaan dan jawabannya',
    group: 'Umum',
    fields: [
      { key: 'question', label: 'Pertanyaan', type: 'text', required: true },
      { key: 'answer', label: 'Jawaban', type: 'textarea', required: true },
    ],
    build: (c) => ({
      '@type': 'QAPage',
      mainEntity: {
        '@type': 'Question',
        name: c.data.question,
        text: c.data.question,
        answerCount: 1,
        acceptedAnswer: compact({ '@type': 'Answer', text: c.data.answer, url: c.base.url }),
      },
    }),
  },
  { id: 'VideoObject', label: 'Video', group: 'Umum', fields: VIDEO_FIELDS, needsVideo: true, build: (c) => ({ '@type': 'VideoObject', ...video(c) }) },
  { id: 'Event', label: 'Acara', group: 'Umum', fields: EVENT_FIELDS, build: event('Event') },

  {
    id: 'Course',
    label: 'Kursus',
    group: 'Pendidikan',
    fields: [
      { key: 'provider', label: 'Penyelenggara', type: 'text', hint: 'Kosong = nama organisasi situs.' },
      LEVEL,
      {
        key: 'courseMode',
        label: 'Cara belajar',
        type: 'select',
        options: [
          { value: 'Online', label: 'Daring' },
          { value: 'Onsite', label: 'Tatap muka' },
          { value: 'Blended', label: 'Campuran' },
        ],
      },
      { key: 'hours', label: 'Beban belajar (jam)', type: 'number' },
      ...PRICE_FIELDS,
    ],
    build: (c) =>
      compact({
        '@type': 'Course',
        name: c.base.name,
        description: c.base.description,
        image: c.base.image,
        url: c.base.url,
        inLanguage: c.base.inLanguage,
        educationalLevel: c.data.educationalLevel,
        provider: compact({ '@type': 'Organization', name: c.data.provider || organization(c).name }),
        hasCourseInstance: compact({
          '@type': 'CourseInstance',
          courseMode: c.data.courseMode || 'Online',
          courseWorkload: hours(c.data.hours),
        }),
        offers: offer(c.data),
      }),
  },
  {
    id: 'LearningResource',
    label: 'Media pembelajaran',
    group: 'Pendidikan',
    fields: [
      {
        key: 'resourceType',
        label: 'Jenis media',
        type: 'select',
        options: ['Modul', 'Video', 'Simulasi', 'Presentasi', 'Lembar kerja', 'Infografik', 'Game edukasi', 'Audio'].map((value) => ({ value, label: value })),
      },
      LEVEL,
      { key: 'about', label: 'Mata pelajaran atau topik', type: 'text' },
      { key: 'teaches', label: 'Tujuan pembelajaran', type: 'list' },
      { key: 'ageRange', label: 'Rentang usia', type: 'text', hint: 'Misalnya 9-11.' },
      { key: 'minutes', label: 'Waktu yang dibutuhkan (menit)', type: 'number' },
      { key: 'free', label: 'Bisa diakses gratis', type: 'boolean' },
    ],
    build: (c) =>
      compact({
        '@type': 'LearningResource',
        ...c.base,
        learningResourceType: c.data.resourceType,
        educationalLevel: c.data.educationalLevel,
        about: c.data.about ? { '@type': 'Thing', name: c.data.about } : undefined,
        teaches: list(c.data.teaches),
        typicalAgeRange: c.data.ageRange,
        timeRequired: minutes(c.data.minutes),
        isAccessibleForFree: c.data.free === undefined ? undefined : Boolean(c.data.free),
      }),
  },
  {
    id: 'Quiz',
    label: 'Kuis / latihan soal',
    group: 'Pendidikan',
    needsBlock: 'quiz',
    fields: [{ key: 'about', label: 'Mata pelajaran atau topik', type: 'text' }, LEVEL],
    build: (c) =>
      compact({
        '@type': 'Quiz',
        name: c.base.name,
        description: c.base.description,
        url: c.base.url,
        about: c.data.about ? { '@type': 'Thing', name: c.data.about } : undefined,
        educationalLevel: c.data.educationalLevel,
        hasPart: c.found.questions.map((item) =>
          compact({
            '@type': 'Question',
            eduQuestionType: 'Multiple choice',
            learningResourceType: 'Practice problem',
            name: item.question,
            text: item.question,
            suggestedAnswer: item.options
              .map((text, position) => ({ '@type': 'Answer', position, text }))
              .filter((option) => option.position !== item.answer),
            acceptedAnswer: compact({
              '@type': 'Answer',
              position: item.answer,
              text: item.options[item.answer],
              answerExplanation: item.explanation ? { '@type': 'Comment', text: item.explanation } : undefined,
            }),
          }),
        ),
      }),
  },
  {
    id: 'MathSolver',
    label: 'Penyelesaian matematika',
    group: 'Pendidikan',
    fields: [
      { key: 'solverUrl', label: 'Alamat penyelesai', type: 'url', required: true, hint: 'Sertakan {math_expression_string} di tempat soal dimasukkan.' },
      { key: 'problemTypes', label: 'Jenis soal', type: 'list', hint: 'Misalnya Polynomial Equation, Derivative.' },
    ],
    build: (c) =>
      compact({
        '@type': ['MathSolver', 'LearningResource'],
        name: c.base.name,
        url: c.base.url,
        inLanguage: c.base.inLanguage,
        learningResourceType: 'Math solver',
        potentialAction: [
          compact({
            '@type': 'SolveMathAction',
            target: c.data.solverUrl,
            'mathExpression-input': 'required name=math_expression_string',
            eduQuestionType: list(c.data.problemTypes),
          }),
        ],
      }),
  },
  {
    id: 'LearningVideo',
    label: 'Video pembelajaran',
    group: 'Pendidikan',
    needsVideo: true,
    fields: [...VIDEO_FIELDS, LEVEL],
    build: (c) => ({
      '@type': ['VideoObject', 'LearningResource'],
      ...video(c, compact({ educationalLevel: c.data.educationalLevel, learningResourceType: 'Concept Overview' })),
    }),
  },
  {
    id: 'EducationEvent',
    label: 'Acara pendidikan',
    group: 'Pendidikan',
    fields: [...EVENT_FIELDS, { key: 'teaches', label: 'Yang dipelajari', type: 'list' }, LEVEL],
    build: event('EducationEvent'),
  },
  {
    id: 'Book',
    label: 'Buku online',
    group: 'Pendidikan',
    fields: [
      { key: 'bookAuthor', label: 'Penulis buku', type: 'text', hint: 'Kosong = author post ini.' },
      { key: 'isbn', label: 'ISBN', type: 'text' },
      { key: 'pages', label: 'Jumlah halaman', type: 'number' },
      { key: 'readUrl', label: 'Alamat baca online', type: 'url', hint: 'Kosong = halaman ini.' },
    ],
    build: (c) =>
      compact({
        '@type': 'Book',
        name: c.base.name,
        description: c.base.description,
        image: c.base.image,
        url: c.base.url,
        inLanguage: c.base.inLanguage,
        author: c.data.bookAuthor ? { '@type': 'Person', name: c.data.bookAuthor } : c.base.author,
        publisher: c.base.publisher,
        isbn: c.data.isbn,
        numberOfPages: Number(c.data.pages) || undefined,
        bookFormat: `${CONTEXT}/EBook`,
        potentialAction: {
          '@type': 'ReadAction',
          target: { '@type': 'EntryPoint', urlTemplate: c.data.readUrl || c.base.url },
        },
      }),
  },
  {
    id: 'DefinedTermSet',
    label: 'Glosarium',
    group: 'Pendidikan',
    fields: [],
    needsBlock: 'term',
    build: (c) => ({
      '@type': 'DefinedTermSet',
      name: c.base.name,
      description: c.base.description,
      url: c.base.url,
      hasDefinedTerm: c.found.terms.map((term) => ({ '@type': 'DefinedTerm', name: term.name, description: term.description })),
    }),
  },

  {
    id: 'VideoGame',
    label: 'Game',
    group: 'Game dan aplikasi',
    fields: [
      { key: 'playUrl', label: 'Alamat bermain', type: 'url', hint: 'Kosong = halaman ini.' },
      { key: 'platforms', label: 'Platform', type: 'list', hint: 'Misalnya Web, Android.' },
      { key: 'genre', label: 'Genre', type: 'text', hint: 'Misalnya Edukasi, Puzzle.' },
      {
        key: 'playMode',
        label: 'Mode bermain',
        type: 'select',
        options: [
          { value: 'SinglePlayer', label: 'Satu pemain' },
          { value: 'MultiPlayer', label: 'Banyak pemain' },
          { value: 'CoOp', label: 'Kerja sama' },
        ],
      },
      ...PRICE_FIELDS,
    ],
    build: (c) =>
      compact({
        '@type': 'VideoGame',
        name: c.base.name,
        description: c.base.description,
        image: c.base.image,
        url: c.data.playUrl || c.base.url,
        inLanguage: c.base.inLanguage,
        author: c.base.author,
        publisher: c.base.publisher,
        applicationCategory: 'Game',
        operatingSystem: list(c.data.platforms).join(', ') || 'Web',
        gamePlatform: list(c.data.platforms),
        genre: c.data.genre,
        playMode: c.data.playMode ? `${CONTEXT}/${c.data.playMode}` : undefined,
        offers: offer(c.data),
      }),
  },
  {
    id: 'SoftwareApplication',
    label: 'Aplikasi',
    group: 'Game dan aplikasi',
    fields: [
      {
        key: 'category',
        label: 'Kategori',
        type: 'select',
        options: [
          { value: 'EducationalApplication', label: 'Pendidikan' },
          { value: 'GameApplication', label: 'Game' },
          { value: 'UtilitiesApplication', label: 'Utilitas' },
          { value: 'WebApplication', label: 'Aplikasi web' },
        ],
      },
      { key: 'os', label: 'Sistem operasi', type: 'text', hint: 'Misalnya Web, Android, Windows.' },
      { key: 'downloadUrl', label: 'Alamat unduh atau buka', type: 'url' },
      ...PRICE_FIELDS,
    ],
    build: (c) =>
      compact({
        '@type': 'SoftwareApplication',
        name: c.base.name,
        description: c.base.description,
        image: c.base.image,
        url: c.base.url,
        applicationCategory: c.data.category || 'EducationalApplication',
        operatingSystem: c.data.os || 'Web',
        downloadUrl: c.data.downloadUrl,
        offers: offer(c.data),
      }),
  },
];

const BY_ID = new Map(SCHEMA_TYPES.map((type) => [type.id, type]));

const BLOCK_LABEL = { faq: 'FAQ', howtoStep: 'Langkah', quiz: 'Soal latihan', term: 'Istilah' };
const FOUND_KEY = { faq: 'faqs', howtoStep: 'steps', quiz: 'questions', term: 'terms' };

// Apa saja yang masih kurang agar schema ini sah. Dipakai shell (petunjuk)
// dan builder (peringatan). Daftar kosong = lengkap.
export function missingFor(typeId, data, found) {
  const type = BY_ID.get(typeId);
  if (!type) return [];
  const missing = type.fields
    .filter((field) => field.required && (data?.[field.key] === undefined || String(data[field.key]).trim() === ''))
    .map((field) => `field "${field.label}"`);
  if (type.needsBlock && !found[FOUND_KEY[type.needsBlock]].length) {
    missing.push(`minimal satu block ${BLOCK_LABEL[type.needsBlock]} di konten`);
  }
  if (type.needsVideo && !data?.videoUrl && !found.videos.length) missing.push('alamat video atau block Video di konten');
  return missing;
}

// Daftar untuk shell: tanpa fungsi build.
export const CONTENT_SCHEMAS = SCHEMA_TYPES.map(({ build, ...info }) => info);

export { extract };

// Susun JSON-LD utama sebuah dokumen.
//   doc       post atau page (sudah dilengkapi model situs)
//   fallback  jenis bila pilihan 'auto' (default post type, atau WebPage)
// Mengembalikan { jsonLd, warning }. Schema yang belum lengkap tidak
// dikeluarkan setengah jadi (bisa memicu error di Search Console); sebagai
// gantinya dokumen dideskripsikan dengan jenis `safe`.
export function buildSchema({ doc, meta, env, fallback, safe = 'Article' }) {
  const chosen = doc.schema.type === 'auto' ? fallback : doc.schema.type;
  const found = extract(doc.content);
  const data = doc.schema.data ?? {};
  let type = BY_ID.get(chosen) ?? BY_ID.get(safe);
  let warning = null;

  const missing = missingFor(type.id, data, found);
  if (missing.length) {
    warning = `"${doc.title || 'Tanpa judul'}": schema ${type.label} belum lengkap (${missing.join(', ')}). Sementara ditulis sebagai ${BY_ID.get(safe).label}.`;
    type = BY_ID.get(safe);
  }

  const c = { doc, data, meta, env, found };
  c.base = common(c);
  return { jsonLd: { '@context': CONTEXT, ...type.build(c) }, warning };
}
