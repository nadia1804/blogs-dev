import { FileText } from 'lucide-react';
import { AppIcon } from '../../components/AppIcon.jsx';
import { useData } from '../../app/data.jsx';
import { PastelTag } from '../../components/fields.jsx';
import { ListPage } from '../../components/ListPage.jsx';
import { useCollection } from '../../lib/useCollection.js';

const IconFallback = () => <FileText className="size-4" />;

export function PostTypeList({ path }) {
  const data = useData();
  const collection = useCollection('/post-types');
  const schemaLabel = Object.fromEntries(data.contentSchemas.map((schema) => [schema.id, schema.label]));

  return (
    <ListPage
      title="Post type"
      description="Jenis post, misalnya blog, pelajaran, atau game. Tiap post type punya post dan kategori sendiri."
      collection={collection}
      endpoint="/post-types"
      rowTo={(item) => `${path}/${item.id}`}
      add={{ label: 'Post type baru', to: `${path}/new` }}
      nameOf={(item) => item.label}
      canDelete={(item) => !item.system}
      onDeleted={data.reload}
      emptyText="Belum ada post type."
      columns={[
        {
          header: 'Label',
          cell: (item) => (
            <span className="inline-flex items-center gap-2">
              <AppIcon name={item.icon} className="size-4" fallback={IconFallback} />
              {item.label}
              {item.system && <span className="badge badge-ghost badge-xs">Bawaan</span>}
            </span>
          ),
        },
        { header: 'ID', cell: (item) => <span className="text-base-content/70">{item.id}</span> },
        {
          header: 'Warna kartu tanpa gambar',
          cell: (item) => (
            <span className="flex flex-wrap gap-1">
              {item.fallbackColors.map((color) => <PastelTag key={color} color={color}>{data.pastels[color]?.label}</PastelTag>)}
            </span>
          ),
        },
        { header: 'Schema default', cell: (item) => schemaLabel[item.defaultSchema] ?? item.defaultSchema ?? '–' },
      ]}
    />
  );
}
