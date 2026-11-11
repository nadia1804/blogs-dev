import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderBlocks } from '../src/builder/render-blocks.js';
import { buildSchema, CONTENT_SCHEMAS, extract, missingFor, SCHEMA_TYPES } from '../src/schema-types/index.js';
import { youtubeId } from '../src/schema-types/extract.js';
import { analyzeSeo } from '../src/seo/analysis.js';

const text = (value) => [{ type: 'text', text: value, styles: {} }];
const block = (type, props, content) => ({ id: type + Math.random(), type, props, content, children: [] });

const CONTENT = [
  block('faq', { question: 'Apa itu pecahan?' }, text('Bagian dari keseluruhan.')),
  block('faq', { question: '' }, text('Tanpa pertanyaan, diabaikan.')),
  block('howtoStep', { title: 'Siapkan kertas' }, text('Ambil selembar kertas.')),
  block('howtoStep', { title: '' }, text('Lipat menjadi dua.')),
  block('quiz', { question: '1/2 + 1/2 = ?', options: '["1","2","1/4"]', answer: 0, explanation: 'Dua setengah menjadi satu.' }),
  block('quiz', { question: 'Soal rusak', options: '["cuma satu"]', answer: 0, explanation: '' }),
  block('term', { term: 'Pembilang' }, text('Angka di atas garis pecahan.')),
  block('callout', { variant: 'tip' }, text('Latihan <rutin>.')),
  block('embedVideo', { url: 'https://youtu.be/dQw4w9WgXcQ', title: 'Video pecahan' }),
];

const env = {
  settings: { site: { title: 'Blogs', language: 'id' }, seo: { organizationName: '' } },
  abs: (path) => `https://contoh.com${path}`,
};
const meta = { description: 'Deskripsi.', canonical: 'https://contoh.com/pelajaran/pecahan/', image: 'https://contoh.com/media/a.png' };
const doc = (type, data = {}, content = CONTENT) => ({
  title: 'Mengenal Pecahan',
  date: '2026-01-05T00:00:00.000Z',
  updatedAt: '2026-01-06T00:00:00.000Z',
  authors: [{ name: 'Bu Rina', path: '/author/bu-rina/' }],
  content,
  schema: { type, data },
});
const build = (type, data, content) => buildSchema({ doc: doc(type, data, content), meta, env, fallback: 'BlogPosting' });

test('extract: hanya block yang lengkap yang diambil', () => {
  const found = extract(CONTENT);
  assert.deepEqual(found.faqs, [{ question: 'Apa itu pecahan?', answer: 'Bagian dari keseluruhan.' }]);
  assert.equal(found.steps.length, 2);
  assert.equal(found.questions.length, 1, 'soal dengan satu pilihan diabaikan');
  assert.deepEqual(found.terms, [{ name: 'Pembilang', description: 'Angka di atas garis pecahan.' }]);
  assert.equal(found.videos[0].title, 'Video pecahan');
  assert.equal(youtubeId('https://www.youtube.com/watch?t=3&v=dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  assert.equal(youtubeId('https://contoh.com/video.mp4'), null);
});

test('JSON-LD dari block: FAQ, HowTo, Quiz, glosarium, video', () => {
  const faq = build('FAQPage').jsonLd;
  assert.equal(faq['@type'], 'FAQPage');
  assert.equal(faq.mainEntity[0].acceptedAnswer.text, 'Bagian dari keseluruhan.');

  const howto = build('HowTo', { minutes: 15, supplies: ['Kertas', ' '] }).jsonLd;
  assert.equal(howto.totalTime, 'PT15M');
  assert.deepEqual(howto.supply, [{ '@type': 'HowToSupply', name: 'Kertas' }]);
  assert.deepEqual(howto.step.map((step) => step.name), ['Siapkan kertas', 'Langkah 2']);

  const quiz = build('Quiz', { about: 'Matematika' }).jsonLd.hasPart[0];
  assert.equal(quiz.acceptedAnswer.text, '1');
  assert.equal(quiz.acceptedAnswer.answerExplanation.text, 'Dua setengah menjadi satu.');
  assert.deepEqual(quiz.suggestedAnswer.map((answer) => answer.text), ['2', '1/4']);

  assert.equal(build('DefinedTermSet').jsonLd.hasDefinedTerm[0].name, 'Pembilang');
  const video = build('LearningVideo', { educationalLevel: 'SD' }).jsonLd;
  assert.deepEqual(video['@type'], ['VideoObject', 'LearningResource']);
  assert.equal(video.embedUrl, 'https://www.youtube.com/embed/dQw4w9WgXcQ');
});

test('JSON-LD dari field: kursus, game, buku, acara', () => {
  const course = build('Course', { educationalLevel: 'SD kelas 4', hours: 10, price: 0 }).jsonLd;
  assert.equal(course.provider.name, 'Blogs');
  assert.equal(course.hasCourseInstance.courseWorkload, 'PT10H');
  assert.equal(course.offers.category, 'Free');

  const game = build('VideoGame', { platforms: ['Web', 'Android'], playMode: 'SinglePlayer' }).jsonLd;
  assert.deepEqual(game.gamePlatform, ['Web', 'Android']);
  assert.equal(game.playMode, 'https://schema.org/SinglePlayer');
  assert.equal('offers' in game, false, 'harga kosong tidak dicantumkan');

  assert.equal(build('Book', {}).jsonLd.potentialAction.target.urlTemplate, meta.canonical);
  const event = build('EducationEvent', { startDate: '2026-02-01T09:00', mode: 'online', onlineUrl: 'https://meet.contoh.com' }).jsonLd;
  assert.equal(event.location['@type'], 'VirtualLocation');
  assert.match(event.eventAttendanceMode, /OnlineEventAttendanceMode$/);
});

test('schema belum lengkap: jatuh ke Article dengan peringatan', () => {
  assert.equal(build('auto').jsonLd['@type'], 'BlogPosting', 'auto mengikuti default post type');
  const result = build('FAQPage', {}, []);
  assert.equal(result.jsonLd['@type'], 'Article');
  assert.match(result.warning, /minimal satu block FAQ/);
  assert.deepEqual(missingFor('Event', {}, extract([])), ['field "Mulai"']);
  assert.deepEqual(missingFor('Course', {}, extract([])), []);
  assert.equal(build('TidakAda').jsonLd['@type'], 'Article');
});

test('setiap schema menghasilkan JSON-LD yang sah dan terdaftar untuk shell', () => {
  assert.equal(CONTENT_SCHEMAS.length, SCHEMA_TYPES.length);
  assert.equal('build' in CONTENT_SCHEMAS[0], false);
  const full = { question: 'T?', answer: 'J.', startDate: '2026-02-01T09:00', solverUrl: 'https://s.contoh.com' };
  for (const type of SCHEMA_TYPES) {
    const { jsonLd, warning } = build(type.id, full);
    assert.equal(warning, null, type.id);
    assert.equal(jsonLd['@context'], 'https://schema.org');
    assert.ok(jsonLd['@type'], type.id);
    assert.doesNotThrow(() => JSON.stringify(jsonLd));
  }
});

test('perender block schema: HTML yang cocok dan aman', () => {
  const out = String(renderBlocks(CONTENT, { image: (src) => ({ src }) }));
  assert.match(out, /<details class="faq"><summary>Apa itu pecahan\?<\/summary>/);
  assert.match(out, /<ol class="howto"><li><strong class="howto-title">Siapkan kertas<\/strong>.*<\/li><li><div>Lipat menjadi dua\.<\/div><\/li><\/ol>/);
  assert.match(out, /<ol class="quiz-options" type="A"><li>1<\/li><li>2<\/li><li>1\/4<\/li><\/ol>/);
  assert.match(out, /<strong>Jawaban: A\.<\/strong> 1/);
  assert.match(out, /<dl class="glossary"><div><dt>Pembilang<\/dt><dd>Angka di atas garis pecahan\.<\/dd><\/div><\/dl>/);
  assert.match(out, /<aside class="callout callout-tip">Latihan &lt;rutin&gt;\.<\/aside>/);
  assert.match(out, /<a class="video-embed" href="https:\/\/youtu\.be\/dQw4w9WgXcQ"/);
  assert.doesNotMatch(out, /Soal rusak/);
});

test('analisis SEO: menilai judul, deskripsi, kata kunci, dan isi', () => {
  const base = {
    title: 'Cara Mudah Belajar Pecahan untuk Anak SD',
    slug: 'belajar-pecahan',
    excerpt: 'Panduan belajar pecahan langkah demi langkah untuk anak sekolah dasar, lengkap dengan contoh soal.',
    cover: null,
    seo: { title: '', description: '', focusKeyword: 'belajar pecahan' },
    content: [block('paragraph', {}, text('Belajar pecahan itu mudah. '.repeat(120)))],
  };
  const good = analyzeSeo(base);
  const byId = Object.fromEntries(good.checks.map((check) => [check.id, check.status]));
  assert.equal(byId.title, 'good');
  assert.equal(byId['keyword-title'], 'good');
  assert.equal(byId['keyword-slug'], 'good');
  assert.equal(byId['keyword-body'], 'good');
  assert.equal(byId.length, 'good');
  assert.equal(byId.headings, 'warn', 'tulisan panjang tanpa subjudul');
  assert.equal(byId.links, 'warn');

  const empty = analyzeSeo({ ...base, title: '', excerpt: '', seo: { title: '', description: '', focusKeyword: '' }, content: [] });
  assert.ok(empty.score < good.score);
  assert.equal(empty.checks.find((check) => check.id === 'title').status, 'bad');
  assert.equal(empty.checks.find((check) => check.id === 'keyword').status, 'warn');
});
