import { useState } from 'react';
import { Field, NumberField, RangeField, ToggleField } from '../../components/fields.jsx';
import { FormPage } from '../../components/FormPage.jsx';
import { useSettingsForm } from '../../lib/useSettingsForm.js';

// Daftar lebar dipisah koma. Teksnya disimpan lokal supaya bebas diketik,
// lalu dirapikan menjadi angka unik berurutan saat field ditinggalkan.
function BreakpointsField({ value, error, onChange }) {
  const [text, setText] = useState(value.join(', '));
  const commit = () => {
    const widths = [...new Set(text.split(/[\s,]+/).map(Number).filter((n) => Number.isInteger(n) && n > 0))].sort(
      (a, b) => a - b,
    );
    setText(widths.join(', '));
    onChange(widths);
  };
  return (
    <Field
      label="Breakpoint lebar gambar"
      error={error}
      hint="Lebar dalam piksel, dipisah koma. Tiap gambar dibuat dalam semua ukuran ini (yang tidak melebihi aslinya)."
    >
      <input
        className={`input w-full ${error ? 'input-error' : ''}`}
        aria-label="Breakpoint lebar gambar"
        value={text}
        onChange={(event) => setText(event.target.value)}
        onBlur={commit}
      />
    </Field>
  );
}

// Pengaturan pengolahan gambar. Diterapkan builder saat situs dibangun,
// bukan saat gambar diunggah.
export function ImageSettings() {
  const form = useSettingsForm();
  const { images } = form.values;
  const setImages = (patch) => form.setIn('images', patch);
  const error = (key) => form.errors[`images.${key}`];
  const breakpointsError = Object.entries(form.errors).find(([key]) => key.startsWith('images.breakpoints'))?.[1];

  return (
    <FormPage title="Gambar" form={form}>
      <p className="text-sm text-base-content/70">
        Gambar asli disimpan apa adanya. Saat situs dibangun, tiap gambar diubah ke WebP dalam beberapa ukuran sesuai
        pengaturan ini. Mengubah pengaturan membuat semua gambar diolah ulang pada build berikutnya.
      </p>
      <RangeField
        label="Kualitas WebP"
        value={images.webpQuality}
        error={error('webpQuality')}
        hint="Lebih tinggi = lebih tajam tapi berkas lebih besar. 75 sampai 82 biasanya seimbang."
        onChange={(webpQuality) => setImages({ webpQuality })}
      />
      <ToggleField
        label="Buat juga versi AVIF"
        hint="Berkas lebih kecil dari WebP, tapi build lebih lama."
        value={images.avif}
        onChange={(avif) => setImages({ avif })}
      />
      {images.avif && (
        <RangeField
          label="Kualitas AVIF"
          value={images.avifQuality}
          error={error('avifQuality')}
          hint="AVIF tetap tajam di angka yang lebih rendah. 50 sampai 60 biasanya cukup."
          onChange={(avifQuality) => setImages({ avifQuality })}
        />
      )}
      <BreakpointsField
        value={images.breakpoints}
        error={breakpointsError}
        onChange={(breakpoints) => setImages({ breakpoints })}
      />
      <NumberField
        label="Lebar maksimum"
        suffix="px"
        min={320}
        max={3840}
        value={images.maxWidth}
        error={error('maxWidth')}
        hint="Gambar yang lebih lebar dari ini dikecilkan."
        onChange={(maxWidth) => setImages({ maxWidth })}
      />
    </FormPage>
  );
}
