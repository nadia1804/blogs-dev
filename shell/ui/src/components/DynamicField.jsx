import { useRef } from 'react';
import { useData } from '../app/data.jsx';
import { Field, NumberField, SelectField, TextArea, TextField, ToggleField } from './fields.jsx';
import { ImageInput } from './ImageInput.jsx';

// Pilih beberapa post type. Daftar kosong berarti "semua".
function PostTypesField({ label, hint, value, onChange }) {
  const { postTypes } = useData();
  const selected = Array.isArray(value) ? value : [];
  const toggle = (id) => onChange(selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id]);
  return (
    <Field label={label} hint={hint}>
      <ul className="flex flex-wrap gap-x-5 gap-y-2">
        {postTypes.map((type) => (
          <li key={type.id}>
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="checkbox checkbox-sm"
                checked={selected.includes(type.id)}
                onChange={() => toggle(type.id)}
              />
              {type.label}
            </label>
          </li>
        ))}
      </ul>
    </Field>
  );
}

// Teks dengan variabel sisipan. Tombol variabel menyisipkan tokennya di
// posisi kursor.
function TemplateField({ label, hint, value, onChange, variables = [] }) {
  const area = useRef(null);
  const text = value ?? '';

  const insert = (token) => {
    const element = area.current;
    const start = element?.selectionStart ?? text.length;
    const end = element?.selectionEnd ?? text.length;
    onChange(text.slice(0, start) + token + text.slice(end));
    requestAnimationFrame(() => {
      element?.focus();
      element?.setSelectionRange(start + token.length, start + token.length);
    });
  };

  return (
    <Field label={label} hint={hint}>
      <textarea
        ref={area}
        rows={3}
        className="textarea w-full"
        aria-label={label}
        value={text}
        onChange={(event) => onChange(event.target.value)}
      />
      {variables.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-base-content/60">Sisipkan:</span>
          {variables.map((variable) => (
            <button
              key={variable.token}
              type="button"
              className="btn btn-xs"
              title={`Sisipkan ${variable.token}`}
              onClick={() => insert(variable.token)}
            >
              {variable.label} <span className="font-mono font-normal text-base-content/60">{variable.token}</span>
            </button>
          ))}
        </div>
      )}
    </Field>
  );
}

// Satu field form yang dibuat dari definisinya (bukan ditulis tangan).
// Dipakai untuk field content schema, pengaturan plugin, dan pengaturan tema.
// Jenis field: lihat core/src/contracts/fields.js (plus `datetime`).
export function DynamicField({ field, value, onChange }) {
  const common = { label: field.label, hint: field.hint };
  switch (field.type) {
    case 'textarea':
      return <TextArea {...common} value={value} onChange={onChange} />;
    case 'number':
      return (
        <NumberField
          {...common}
          min={field.min ?? 0}
          max={field.max}
          suffix={field.suffix}
          value={value}
          onChange={onChange}
        />
      );
    case 'boolean':
      return <ToggleField {...common} value={Boolean(value)} onChange={onChange} />;
    case 'select': {
      // Pilihan kosong hanya ditawarkan bila field belum punya nilai.
      const options = value ? field.options : [{ value: '', label: 'Pilih…' }, ...field.options];
      return <SelectField {...common} value={value} options={options} onChange={onChange} />;
    }
    case 'list':
      // Satu butir per baris. Baris kosong dibuang oleh pemakainya.
      return (
        <TextArea
          {...common}
          hint={field.hint ? `${field.hint} Satu per baris.` : 'Satu per baris.'}
          value={Array.isArray(value) ? value.join('\n') : ''}
          onChange={(text) => onChange(text.split('\n'))}
        />
      );
    case 'image':
      return (
        <div className="max-w-xs">
          <ImageInput {...common} aspect="aspect-[3/1]" value={value} onChange={onChange} />
        </div>
      );
    case 'postTypes':
      return <PostTypesField {...common} value={value} onChange={onChange} />;
    case 'template':
      return <TemplateField {...common} value={value} variables={field.variables} onChange={onChange} />;
    case 'datetime':
      return (
        <Field {...common}>
          <input
            type="datetime-local"
            className="input w-full"
            aria-label={field.label}
            value={value ?? ''}
            onChange={(event) => onChange(event.target.value)}
          />
        </Field>
      );
    default:
      return <TextField {...common} type={field.type === 'url' ? 'url' : 'text'} value={value} onChange={onChange} />;
  }
}
