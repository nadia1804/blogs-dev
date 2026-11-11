import { createReactBlockSpec } from '@blocknote/react';
import { parseOptions, youtubeId } from '@blogs/core/schema-types/extract';
import { ListChecks, Plus, SquarePlay, X } from 'lucide-react';
import { Frame, PropInput, stopEditorKeys } from './parts.jsx';

const MAX_OPTIONS = 6;

// Soal pilihan ganda. Pilihan disimpan sebagai string JSON di properti
// `options`, karena properti block hanya menerima teks, angka, atau boolean.
export const Quiz = createReactBlockSpec(
  {
    type: 'quiz',
    propSchema: {
      question: { default: '' },
      options: { default: '["",""]' },
      answer: { default: 0 },
      explanation: { default: '' },
    },
    content: 'none',
  },
  {
    render: ({ block, editor }) => {
      const options = parseOptions(block.props.options);
      const update = (props) => editor.updateBlock(block, { props });
      const setOptions = (next, answer = block.props.answer) =>
        update({ options: JSON.stringify(next), answer: Math.min(answer, next.length - 1) });

      return (
        <Frame icon={ListChecks} label="Soal latihan">
          <PropInput editor={editor} block={block} name="question" placeholder="Pertanyaan" strong />
          <ul className="flex flex-col gap-1.5" contentEditable={false}>
            {options.map((option, index) => (
              <li key={index} className="flex items-center gap-2">
                <input
                  type="radio"
                  className="radio radio-sm radio-primary"
                  name={`jawaban-${block.id}`}
                  aria-label={`Jadikan pilihan ${String.fromCharCode(65 + index)} jawaban benar`}
                  checked={block.props.answer === index}
                  onChange={() => update({ answer: index })}
                />
                <input
                  className="schema-block-input flex-1"
                  value={option}
                  placeholder={`Pilihan ${String.fromCharCode(65 + index)}`}
                  aria-label={`Pilihan ${String.fromCharCode(65 + index)}`}
                  onChange={(event) => setOptions(options.map((item, i) => (i === index ? event.target.value : item)))}
                  {...stopEditorKeys}
                />
                <button
                  type="button"
                  className="btn btn-ghost btn-xs btn-square"
                  aria-label={`Hapus pilihan ${String.fromCharCode(65 + index)}`}
                  disabled={options.length <= 2}
                  onClick={() =>
                    setOptions(
                      options.filter((_, i) => i !== index),
                      block.props.answer > index ? block.props.answer - 1 : block.props.answer,
                    )
                  }
                >
                  <X className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-2" contentEditable={false}>
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              disabled={options.length >= MAX_OPTIONS}
              onClick={() => setOptions([...options, ''])}
            >
              <Plus className="size-3.5" /> Tambah pilihan
            </button>
            <span className="text-xs text-base-content/60">Tandai bulatan di kiri untuk jawaban benar.</span>
          </div>
          <PropInput editor={editor} block={block} name="explanation" placeholder="Pembahasan (opsional)" />
        </Frame>
      );
    },
  },
);

// Video dari tautan (mis. YouTube). Di situs tampil sebagai tautan bergambar.
export const EmbedVideo = createReactBlockSpec(
  { type: 'embedVideo', propSchema: { url: { default: '' }, title: { default: '' } }, content: 'none' },
  {
    render: ({ block, editor }) => {
      const id = youtubeId(block.props.url);
      return (
        <Frame icon={SquarePlay} label="Video">
          <PropInput editor={editor} block={block} name="url" placeholder="Alamat video, mis. https://youtu.be/…" type="url" />
          <PropInput editor={editor} block={block} name="title" placeholder="Judul video" strong />
          {id && (
            <img
              src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`}
              alt=""
              contentEditable={false}
              className="aspect-video w-full max-w-sm rounded-field object-cover"
            />
          )}
        </Frame>
      );
    },
  },
);
