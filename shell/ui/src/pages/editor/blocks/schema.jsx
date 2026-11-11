import { BlockNoteSchema, defaultBlockSpecs, insertOrUpdateBlockForSlashMenu } from '@blocknote/core';
import { en } from '@blocknote/core/locales';
import { BookA, CircleHelp, Info, ListChecks, ListOrdered, SquarePlay } from 'lucide-react';
import { EmbedVideo, Quiz } from './form-blocks.jsx';
import { Callout, Faq, HowtoStep, Term } from './text-blocks.jsx';

// Skema editor: semua block bawaan BlockNote + block content schema.
export const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    faq: Faq(),
    howtoStep: HowtoStep(),
    quiz: Quiz(),
    term: Term(),
    callout: Callout(),
    embedVideo: EmbedVideo(),
  },
});

const GROUP = 'Content schema';

const ITEMS = [
  { type: 'faq', title: 'FAQ', subtext: 'Pertanyaan dan jawabannya', aliases: ['faq', 'tanya', 'pertanyaan'], icon: CircleHelp },
  { type: 'howtoStep', title: 'Langkah', subtext: 'Satu langkah dalam panduan', aliases: ['langkah', 'howto', 'step', 'cara'], icon: ListOrdered },
  { type: 'quiz', title: 'Soal latihan', subtext: 'Pilihan ganda dengan kunci jawaban', aliases: ['soal', 'kuis', 'quiz', 'latihan'], icon: ListChecks },
  { type: 'term', title: 'Istilah', subtext: 'Istilah glosarium dan definisinya', aliases: ['istilah', 'glosarium', 'definisi'], icon: BookA },
  { type: 'callout', title: 'Catatan', subtext: 'Kotak info, tips, atau perhatian', aliases: ['catatan', 'info', 'tips', 'callout'], icon: Info },
  { type: 'embedVideo', title: 'Video (tautan)', subtext: 'Video YouTube atau tautan video lain', aliases: ['video', 'youtube'], icon: SquarePlay },
];

// Item menu "/" untuk block content schema.
export const schemaSlashItems = (editor) =>
  ITEMS.map(({ type, icon: Icon, ...item }) => ({
    ...item,
    group: GROUP,
    icon: <Icon size={18} />,
    onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type }),
  }));

// BlockNote belum punya terjemahan Indonesia; teks yang paling sering
// terlihat diterjemahkan di sini.
export const dictionary = {
  ...en,
  placeholders: {
    ...en.placeholders,
    default: "Tulis sesuatu, atau ketik '/' untuk memilih block",
    emptyDocument: "Mulai menulis, atau ketik '/' untuk memilih block",
    heading: 'Judul bagian',
  },
};
