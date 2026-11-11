import { ListPage } from '../../components/ListPage.jsx';
import { formatDateTime } from '../../lib/format.js';
import { useCollection } from '../../lib/useCollection.js';

export function AuthorList({ path }) {
  const collection = useCollection('/authors');

  return (
    <ListPage
      title="Authors"
      description="Author berlaku lintas post type."
      collection={collection}
      endpoint="/authors"
      rowTo={(item) => `${path}/${item.id}`}
      add={{ label: 'Author baru', to: `${path}/new` }}
      nameOf={(item) => item.title}
      emptyText="Belum ada author."
      columns={[
        { header: 'Nama', cell: (item) => item.title },
        { header: 'Slug', cell: (item) => <span className="text-base-content/70">{item.slug}</span> },
        { header: 'Diperbarui', cell: (item) => formatDateTime(item.updatedAt), className: 'whitespace-nowrap' },
      ]}
    />
  );
}
