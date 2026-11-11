import { createReactBlockSpec } from '@blocknote/react';
import { BookA, CircleHelp, Info, ListOrdered } from 'lucide-react';
import { Frame, PropInput, stopEditorKeys } from './parts.jsx';

// Block content schema yang berisi teks: satu field properti + isi teks kaya.
// Nama jenis dan properti harus sama dengan yang dibaca core
// (schema-types/extract.js dan builder/render-blocks.js).

export const Faq = createReactBlockSpec(
  { type: 'faq', propSchema: { question: { default: '' } }, content: 'inline' },
  {
    render: ({ block, editor, contentRef }) => (
      <Frame icon={CircleHelp} label="FAQ">
        <PropInput editor={editor} block={block} name="question" placeholder="Pertanyaan" strong />
        <div className="schema-block-body" data-placeholder="Jawaban" ref={contentRef} />
      </Frame>
    ),
  },
);

export const HowtoStep = createReactBlockSpec(
  { type: 'howtoStep', propSchema: { title: { default: '' } }, content: 'inline' },
  {
    render: ({ block, editor, contentRef }) => (
      <Frame icon={ListOrdered} label="Langkah">
        <PropInput editor={editor} block={block} name="title" placeholder="Judul langkah (opsional)" strong />
        <div className="schema-block-body" data-placeholder="Penjelasan langkah" ref={contentRef} />
      </Frame>
    ),
  },
);

export const Term = createReactBlockSpec(
  { type: 'term', propSchema: { term: { default: '' } }, content: 'inline' },
  {
    render: ({ block, editor, contentRef }) => (
      <Frame icon={BookA} label="Istilah">
        <PropInput editor={editor} block={block} name="term" placeholder="Istilah" strong />
        <div className="schema-block-body" data-placeholder="Definisi" ref={contentRef} />
      </Frame>
    ),
  },
);

const VARIANTS = [
  { value: 'info', label: 'Info' },
  { value: 'tip', label: 'Tips' },
  { value: 'warning', label: 'Perhatian' },
];

export const Callout = createReactBlockSpec(
  { type: 'callout', propSchema: { variant: { default: 'info', values: ['info', 'tip', 'warning'] } }, content: 'inline' },
  {
    render: ({ block, editor, contentRef }) => (
      <Frame
        icon={Info}
        label="Catatan"
        tone={`schema-block-${block.props.variant}`}
        actions={
          <select
            className="select select-xs w-auto"
            aria-label="Jenis catatan"
            value={block.props.variant}
            onChange={(event) => editor.updateBlock(block, { props: { variant: event.target.value } })}
            {...stopEditorKeys}
          >
            {VARIANTS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        }
      >
        <div className="schema-block-body" data-placeholder="Isi catatan" ref={contentRef} />
      </Frame>
    ),
  },
);
