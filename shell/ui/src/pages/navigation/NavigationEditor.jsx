import { useState } from 'react';
import { Plus } from 'lucide-react';
import { slugify } from '@blogs/core/slug';
import { Field, TextField } from '../../components/fields.jsx';
import { FormPage } from '../../components/FormPage.jsx';
import { useDocForm } from '../../lib/useDocForm.js';
import * as model from './nav-model.js';
import { NavItemRow } from './NavItemRow.jsx';

const DEFAULTS = { id: '', label: '', items: [] };

// Di layar, item berupa daftar datar bertingkat; saat disimpan menjadi pohon.
const fromDoc = (doc) => ({ ...doc, items: model.flatten(doc.items) });
const toPayload = (doc) => ({ ...doc, items: model.toTree(doc.items) });

function validate(doc) {
  const bad = doc.items.findIndex((item) => !item.label.trim() || !model.isComplete(item.target));
  return bad < 0 ? null : { _: `Item ke-${bad + 1} belum lengkap. Isi label dan pilih tujuannya.` };
}

// Penyusun satu menu situs: urutkan dengan seret atau tombol panah,
// satu tingkat submenu, dan ikon per item.
export function NavigationEditor({ params, path }) {
  const form = useDocForm({
    endpoint: '/navigation',
    id: params.id,
    path,
    listPath: '/navigation',
    defaults: DEFAULTS,
    titleOf: (doc) => doc.label,
    fromDoc,
    toPayload,
    validate,
  });
  const { doc, set, errors } = form;
  const [idTouched, setIdTouched] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [dragIndex, setDragIndex] = useState(null);
  const [dropAt, setDropAt] = useState(null); // posisi sisip 0..items.length

  const setItems = (items) => set({ items });
  const endDrag = () => {
    setDragIndex(null);
    setDropAt(null);
  };

  const actions = doc && {
    toggle: (id) => setExpanded((current) => (current === id ? null : id)),
    update: (index, patch) => setItems(model.update(doc.items, index, patch)),
    moveBy: (index, direction) => setItems(model.moveBy(doc.items, index, direction)),
    setDepth: (index, depth) => setItems(model.setDepth(doc.items, index, depth)),
    remove: (index) => setItems(model.remove(doc.items, index)),
    dragStart: setDragIndex,
    dragEnd: endDrag,
    dragOver(index, event) {
      if (dragIndex === null) return;
      event.preventDefault();
      const box = event.currentTarget.getBoundingClientRect();
      setDropAt(event.clientY < box.top + box.height / 2 ? index : index + 1);
    },
    drop(event) {
      event.preventDefault();
      if (dragIndex !== null && dropAt !== null) setItems(model.move(doc.items, dragIndex, dropAt));
      endDrag();
    },
  };

  const addItem = () => {
    const item = model.newItem();
    setItems([...doc.items, item]);
    setExpanded(item.id);
  };

  // Garis penanda: di atas baris tujuan, atau di bawah baris terakhir.
  const dropMark = (index) => {
    if (dragIndex === null || dropAt === null) return null;
    if (dropAt === index) return 'before';
    return dropAt === doc.items.length && index === doc.items.length - 1 ? 'after' : null;
  };

  return (
    <FormPage title={form.isNew ? 'Menu baru' : `Menu ${doc?.label ?? ''}`} form={form}>
      {doc && (
        <>
          <TextField
            label="Nama menu"
            value={doc.label}
            error={errors.label}
            autoFocus={form.isNew}
            onChange={(label) => set({ label, ...(form.isNew && !idTouched ? { id: slugify(label) } : {}) })}
          />
          {form.isNew && (
            <TextField
              label="ID"
              value={doc.id}
              error={errors.id}
              hint="Dipakai tema untuk memanggil menu ini. Tidak bisa diubah setelah dibuat."
              onChange={(id) => {
                setIdTouched(true);
                set({ id });
              }}
            />
          )}

          <Field label="Item menu" hint="Seret pegangan di kiri untuk mengurutkan. Submenu hanya satu tingkat.">
            {doc.items.length === 0 ? (
              <p className="rounded-field border border-dashed border-base-300 p-6 text-center text-sm text-base-content/60">
                Menu ini belum punya item.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {doc.items.map((item, index) => (
                  <NavItemRow
                    key={item.id}
                    item={item}
                    index={index}
                    total={doc.items.length}
                    expanded={expanded === item.id}
                    dragging={dragIndex === index}
                    drop={dropMark(index)}
                    actions={actions}
                  />
                ))}
              </ul>
            )}
            <button type="button" className="btn btn-sm mt-1 self-start" onClick={addItem}>
              <Plus className="size-4" /> Tambah item
            </button>
          </Field>
        </>
      )}
    </FormPage>
  );
}
