import { useId } from 'react';
import { Check } from 'lucide-react';
import { useData } from '../app/data.jsx';

// Pembungkus field: label di atas, petunjuk atau pesan error di bawah.
export function Field({ label, hint, error, children, htmlFor }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="text-sm font-medium">{label}</label>
      {children}
      {error ? (
        <p className="text-xs text-error" role="alert">{error}</p>
      ) : (
        hint && <p className="text-xs text-base-content/60">{hint}</p>
      )}
    </div>
  );
}

export function TextField({ label, hint, error, value, onChange, prefix, ...props }) {
  const id = useId();
  const input = (
    <input
      id={id}
      type="text"
      value={value ?? ''}
      onChange={(event) => onChange(event.target.value)}
      aria-invalid={Boolean(error)}
      className={prefix ? 'grow' : `input w-full ${error ? 'input-error' : ''}`}
      {...props}
    />
  );
  return (
    <Field label={label} hint={hint} error={error} htmlFor={id}>
      {prefix ? (
        <label className={`input w-full ${error ? 'input-error' : ''}`}>
          <span className="text-base-content/50">{prefix}</span>
          {input}
        </label>
      ) : (
        input
      )}
    </Field>
  );
}

export function TextArea({ label, hint, error, value, onChange, rows = 3, ...props }) {
  const id = useId();
  return (
    <Field label={label} hint={hint} error={error} htmlFor={id}>
      <textarea
        id={id}
        rows={rows}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        className={`textarea w-full ${error ? 'textarea-error' : ''}`}
        {...props}
      />
    </Field>
  );
}

// Angka bulat. Kotak kosong diteruskan sebagai '' supaya bisa diketik ulang;
// server yang menolak nilai kosong saat disimpan.
export function NumberField({ label, hint, error, value, onChange, suffix, ...props }) {
  const id = useId();
  return (
    <Field label={label} hint={hint} error={error} htmlFor={id}>
      <label className={`input w-full ${error ? 'input-error' : ''}`}>
        <input
          id={id}
          type="number"
          className="grow"
          value={value ?? ''}
          aria-invalid={Boolean(error)}
          onChange={(event) => onChange(event.target.value === '' ? '' : Number(event.target.value))}
          {...props}
        />
        {suffix && <span className="text-base-content/50">{suffix}</span>}
      </label>
    </Field>
  );
}

// Penggeser nilai dengan angka di sampingnya.
export function RangeField({ label, hint, error, value, onChange, min = 1, max = 100, disabled }) {
  const id = useId();
  return (
    <Field label={label} hint={hint} error={error} htmlFor={id}>
      <div className="flex items-center gap-3">
        <input
          id={id}
          type="range"
          className="range range-primary range-sm flex-1"
          min={min}
          max={max}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        <span className="w-8 text-right text-sm font-medium tabular-nums">{value}</span>
      </div>
    </Field>
  );
}

// Sakelar hidup/mati dengan keterangan.
export function ToggleField({ label, hint, value, onChange }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4">
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {hint && <span className="block text-xs text-base-content/60">{hint}</span>}
      </span>
      <input
        type="checkbox"
        className="toggle toggle-primary toggle-sm mt-0.5 shrink-0"
        checked={value}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}

// options: [{ value, label, group? }]
export function SelectField({ label, hint, error, value, onChange, options }) {
  const id = useId();
  const groups = Map.groupBy(options, (option) => option.group ?? '');
  const render = (option) => <option key={option.value} value={option.value}>{option.label}</option>;
  return (
    <Field label={label} hint={hint} error={error} htmlFor={id}>
      <select
        id={id}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
        className={`select w-full ${error ? 'select-error' : ''}`}
      >
        {[...groups].map(([group, items]) =>
          group ? <optgroup key={group} label={group}>{items.map(render)}</optgroup> : items.map(render),
        )}
      </select>
    </Field>
  );
}

// Pemilih warna pastel. `multiple` = boleh lebih dari satu (minimal satu).
export function PastelPicker({ label, hint, error, value, onChange, multiple = false }) {
  const { pastels } = useData();
  const selected = multiple ? value ?? [] : [value];

  const toggle = (key) => {
    if (!multiple) return onChange(key);
    if (!selected.includes(key)) return onChange([...selected, key]);
    if (selected.length > 1) onChange(selected.filter((item) => item !== key));
  };

  return (
    <Field label={label} hint={hint} error={error}>
      <div className="flex flex-wrap gap-2">
        {Object.entries(pastels).map(([key, pastel]) => {
          const active = selected.includes(key);
          return (
            <button
              key={key}
              type="button"
              aria-pressed={active}
              onClick={() => toggle(key)}
              style={{ backgroundColor: pastel.bg, color: pastel.text }}
              className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${
                active ? 'border-current' : 'border-transparent opacity-70 hover:opacity-100'
              }`}
            >
              {active && <Check className="size-3" />}
              {pastel.label}
            </button>
          );
        })}
      </div>
    </Field>
  );
}

// Tag berwarna pastel, mis. nama kategori di daftar.
export function PastelTag({ color, children }) {
  const { pastels } = useData();
  const pastel = pastels[color] ?? { bg: '#eee', text: '#333' };
  return (
    <span
      style={{ backgroundColor: pastel.bg, color: pastel.text }}
      className="inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold"
    >
      {children}
    </span>
  );
}
