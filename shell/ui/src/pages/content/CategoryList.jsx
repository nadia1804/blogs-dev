import { useData } from '../../app/data.jsx';
import { PastelTag } from '../../components/fields.jsx';
import { ListPage } from '../../components/ListPage.jsx';
import { formatDateTime } from '../../lib/format.js';
import { useCollection } from '../../lib/useCollection.js';
import { NotFound } from '../Placeholder.jsx';

export function CategoryList({ params, path }) {
  const { postTypes } = useData();
  const type = postTypes.find((item) => item.id === params.type);
  const endpoint = type ? `/categories/${type.id}` : null;
  const collection = useCollection(endpoint);
  if (!type) return <NotFound />;

  const nameById = Object.fromEntries(collection.items.map((item) => [item.id, item.name]));

  return (
    <ListPage
      title={`Kategori ${type.label}`}
      description="Kategori hanya berlaku untuk post type ini."
      collection={collection}
      endpoint={endpoint}
      rowTo={(item) => `${path}/${item.id}`}
      add={{ label: 'Kategori baru', to: `${path}/new` }}
      nameOf={(item) => item.name}
      emptyText="Belum ada kategori."
      columns={[
        { header: 'Nama', cell: (item) => <PastelTag color={item.color}>{item.name}</PastelTag> },
        { header: 'Slug', cell: (item) => <span className="text-base-content/70">{item.slug}</span> },
        { header: 'Induk', cell: (item) => nameById[item.parentId] ?? '–' },
        { header: 'Diperbarui', cell: (item) => formatDateTime(item.updatedAt), className: 'whitespace-nowrap' },
      ]}
    />
  );
}
