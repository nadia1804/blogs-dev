import { useMemo } from 'react';
import { extract, missingFor } from '@blogs/core/schema-types';
import { Braces, TriangleAlert } from 'lucide-react';
import { useData } from '../../../app/data.jsx';
import { DynamicField } from '../../../components/DynamicField.jsx';
import { SelectField } from '../../../components/fields.jsx';
import { Section } from './Section.jsx';

export const meta = { id: 'schema', title: 'Content schema', icon: Braces };

// Content schema (JSON-LD): pilih jenis, lalu isi field khususnya. Sebagian
// data diambil langsung dari block di konten (FAQ, langkah, soal, istilah).
export function SchemaSection({ doc, set, type }) {
  const { contentSchemas } = useData();
  const fallback = type ? type.defaultSchema : 'WebPage';
  const chosen = doc.schema.type === 'auto' ? fallback : doc.schema.type;
  const definition = contentSchemas.find((schema) => schema.id === chosen);
  const labelOf = (id) => contentSchemas.find((schema) => schema.id === id)?.label ?? id;
  const data = doc.schema.data ?? {};

  const missing = useMemo(() => missingFor(chosen, data, extract(doc.content)), [chosen, data, doc.content]);
  const setData = (key, value) => set({ schema: { ...doc.schema, data: { ...data, [key]: value } } });

  return (
    <Section {...meta}>
      <SelectField
        label="Jenis schema"
        value={doc.schema.type}
        hint="Menentukan data terstruktur yang dibaca mesin pencari."
        options={[
          { value: 'auto', label: `Otomatis: ${labelOf(fallback)}` },
          ...contentSchemas.map((schema) => ({ value: schema.id, label: schema.label, group: schema.group })),
        ]}
        onChange={(schemaType) => set({ schema: { ...doc.schema, type: schemaType } })}
      />

      {missing.length > 0 && (
        <div role="status" className="alert alert-warning alert-soft items-start text-xs">
          <TriangleAlert className="size-4 shrink-0" />
          <div>
            <p className="font-semibold">Belum lengkap untuk {definition?.label}:</p>
            <ul className="list-disc pl-4">{missing.map((item) => <li key={item}>{item}</li>)}</ul>
            <p className="mt-1">Sampai dilengkapi, halaman ini ditulis sebagai {labelOf(type ? 'Article' : 'WebPage')}.</p>
          </div>
        </div>
      )}

      {definition?.fields.map((field) => (
        <DynamicField key={field.key} field={field} value={data[field.key]} onChange={(value) => setData(field.key, value)} />
      ))}
    </Section>
  );
}
