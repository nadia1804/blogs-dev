// Pembungkus BlockNote. Dimuat terpisah (lazy) karena ukurannya besar.
import { filterSuggestionItems } from '@blocknote/core';
import { getDefaultReactSlashMenuItems, SuggestionMenuController, useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import '@blocknote/mantine/style.css';
import { imageUrl } from '../../components/ImageInput.jsx';
import { uploadImage } from '../../lib/upload.js';
import { dictionary, schema, schemaSlashItems } from './blocks/schema.jsx';

// `initialContent` hanya dibaca saat komponen dibuat. Untuk mengganti isi dari
// luar, pasang ulang komponen ini dengan `key` yang berbeda.
export default function BlockEditor({ initialContent, onChange, dark }) {
  const editor = useCreateBlockNote({
    schema,
    dictionary,
    initialContent: initialContent?.length ? initialContent : undefined,
    uploadFile: uploadImage, // konten menyimpan path "media/...", bukan URL shell
    resolveFileUrl: async (url) => imageUrl(url),
  });

  return (
    <BlockNoteView
      editor={editor}
      theme={dark ? 'dark' : 'light'}
      slashMenu={false}
      onChange={() => onChange(editor.document)}
    >
      <SuggestionMenuController
        triggerCharacter="/"
        getItems={async (query) =>
          filterSuggestionItems([...getDefaultReactSlashMenuItems(editor), ...schemaSlashItems(editor)], query)
        }
      />
    </BlockNoteView>
  );
}
