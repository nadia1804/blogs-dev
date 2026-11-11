import { ListPage } from '../../components/ListPage.jsx';
import { formatDateTime } from '../../lib/format.js';
import { useCollection } from '../../lib/useCollection.js';

// Menu bawaan dipakai tema default, jadi tidak bisa dihapus.
const BUILT_IN = new Set(['header', 'footer']);

export function NavigationList({ path }) {
  const collection = useCollection('/navigation');

  return (
    <ListPage
      title="Navigation"
      description="Menu situs. Tema memilih menu mana yang ditampilkan, misalnya header dan footer."
      collection={collection}
      endpoint="/navigation"
      rowTo={(item) => `${path}/${item.id}`}
      add={{ label: 'Menu baru', to: `${path}/new` }}
      nameOf={(item) => item.title}
      canDelete={(item) => !BUILT_IN.has(item.id)}
      emptyText="Belum ada menu."
      columns={[
        {
          header: 'Nama',
          cell: (item) => (
            <span className="inline-flex items-center gap-2">
              {item.title}
              {BUILT_IN.has(item.id) && <span className="badge badge-ghost badge-xs">Bawaan</span>}
            </span>
          ),
        },
        { header: 'ID', cell: (item) => <span className="text-base-content/70">{item.id}</span> },
        { header: 'Diperbarui', cell: (item) => formatDateTime(item.updatedAt), className: 'whitespace-nowrap' },
      ]}
    />
  );
}
