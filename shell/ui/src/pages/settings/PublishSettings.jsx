import { useEffect, useState } from 'react';
import { CircleCheck, ExternalLink, Hammer, KeyRound, Rocket, TriangleAlert } from 'lucide-react';
import { Field, SelectField, TextField } from '../../components/fields.jsx';
import { FormPage } from '../../components/FormPage.jsx';
import { api } from '../../lib/api.js';
import { useSettingsForm } from '../../lib/useSettingsForm.js';

const TARGETS = {
  netlify: {
    label: 'Netlify',
    secret: 'netlifyToken',
    idLabel: 'ID situs (Site ID)',
    idHint: 'Di Netlify: Site configuration > General > Site details > Site ID.',
    tokenHint: 'Di Netlify: User settings > Applications > Personal access tokens.',
  },
  vercel: {
    label: 'Vercel',
    secret: 'vercelToken',
    idLabel: 'Nama proyek',
    idHint: 'Nama proyek di Vercel. Proyek dibuat otomatis bila belum ada.',
    tokenHint: 'Di Vercel: Account Settings > Tokens.',
  },
};

// 'manual' = versi sederhana: shell hanya membangun situs, Anda yang mengunggah.
const TARGET_OPTIONS = [
  { value: 'none', label: 'Belum dipilih' },
  { value: 'manual', label: 'Sederhana: bangun saja, unggah sendiri' },
  { value: 'netlify', label: 'Netlify (unggah otomatis)' },
  { value: 'vercel', label: 'Vercel (unggah otomatis)' },
];

// Berkas aturan header yang selalu ikut di folder dist.
const HEADER_FILES = [
  { file: '_headers', host: 'Netlify dan Cloudflare Pages' },
  { file: 'vercel.json', host: 'Vercel' },
  { file: '.htaccess', host: 'hosting Apache atau cPanel' },
];

// Penjelasan mode sederhana: apa yang dihasilkan dan apa yang harus dilakukan.
function ManualGuide({ outDir }) {
  return (
    <div className="rounded-field border border-base-300 p-4 text-sm">
      <p className="font-semibold">Cara pakai</p>
      <ol className="mt-2 list-decimal space-y-1 pl-5 text-base-content/80">
        <li>Tekan "Bangun situs". Hasilnya masuk ke folder <strong>dist</strong>{outDir ? <> (<span className="break-all font-mono text-xs">{outDir}</span>)</> : null}.</li>
        <li>Unggah seluruh isi folder itu ke host Anda, lewat seret-lepas di dasbor host, FTP, atau Git.</li>
      </ol>
      <p className="mt-3 font-semibold">Aturan header sudah disertakan</p>
      <ul className="mt-2 space-y-1 text-base-content/80">
        {HEADER_FILES.map((item) => (
          <li key={item.file}>
            <span className="font-mono text-xs">{item.file}</span> untuk {item.host}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-base-content/60">
        Isinya aturan cache jangka panjang untuk gambar olahan dan aset. Host hanya membaca berkas yang dikenalnya, jadi
        ketiganya aman diunggah bersamaan.
      </p>
    </div>
  );
}

// Token akses host. Disimpan terpisah dari pengaturan, hanya di komputer
// ini, dan tidak pernah dikirim balik ke browser: yang tampil hanya
// keterangan "sudah tersimpan".
function TokenField({ target, stored, onStored }) {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const save = async (token) => {
    setBusy(true);
    setError(null);
    try {
      onStored(await api.put('/publish/secrets', { [target.secret]: token }));
      setValue('');
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Field label={`Token ${target.label}`} hint={target.tokenHint} error={error}>
      {stored && (
        <p className="flex items-center gap-1.5 text-sm text-success">
          <CircleCheck className="size-4" /> Token sudah tersimpan di komputer ini.
        </p>
      )}
      <div className="flex gap-2">
        <label className="input flex-1">
          <KeyRound className="size-4 text-base-content/50" />
          <input
            type="password"
            className="grow"
            autoComplete="off"
            aria-label={`Token ${target.label}`}
            placeholder={stored ? 'Tempel token baru untuk mengganti' : 'Tempel token di sini'}
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
        </label>
        <button type="button" className="btn" disabled={busy || !value.trim()} onClick={() => save(value)}>
          Simpan token
        </button>
        {stored && (
          <button type="button" className="btn btn-ghost text-error" disabled={busy} onClick={() => save('')}>
            Hapus
          </button>
        )}
      </div>
    </Field>
  );
}

// Hasil build atau deploy terakhir.
function Result({ result }) {
  if (!result) return null;
  if (result.error) {
    return (
      <div role="alert" className="alert alert-error alert-soft items-start text-sm">
        <TriangleAlert className="size-4 shrink-0" />
        <span className="whitespace-pre-wrap">{result.error}</span>
      </div>
    );
  }
  const { build, deploy, target } = result;
  return (
    <div role="status" className="alert alert-success alert-soft items-start text-sm">
      <CircleCheck className="size-4 shrink-0" />
      <div className="min-w-0">
        <p className="font-semibold">
          {deploy ? `Terpublikasi ke ${target}.` : 'Situs selesai dibangun ke folder dist.'}
        </p>
        <p>
          {build.pages} halaman dalam {(build.ms / 1000).toFixed(1)} detik
          {deploy ? `, ${deploy.uploaded} dari ${deploy.total} berkas diunggah.` : '.'}
        </p>
        {deploy?.url && (
          <a href={deploy.url} target="_blank" rel="noopener noreferrer" className="link inline-flex items-center gap-1 break-all">
            {deploy.url} <ExternalLink className="size-3.5 shrink-0" />
          </a>
        )}
        {build.warnings.length > 0 && (
          <ul className="mt-2 list-disc pl-4 text-warning-content/80">
            {build.warnings.map((warning) => <li key={warning}>{warning}</li>)}
          </ul>
        )}
      </div>
    </div>
  );
}

export function PublishSettings() {
  const form = useSettingsForm();
  const { publish, site } = form.values;
  const setPublish = (patch) => form.setIn('publish', patch);
  const target = TARGETS[publish.target];
  const manual = publish.target === 'manual';

  const [secrets, setSecrets] = useState({});
  const [running, setRunning] = useState(null); // 'build' | 'deploy'
  const [result, setResult] = useState(null);

  useEffect(() => {
    api.get('/publish/secrets').then(setSecrets, () => {});
  }, []);

  const run = async (kind) => {
    setRunning(kind);
    setResult(null);
    try {
      const data = await api.post(`/publish/${kind}`);
      setResult(kind === 'build' ? { build: data } : data);
    } catch (failure) {
      setResult({ error: failure.message });
    } finally {
      setRunning(null);
    }
  };

  const stored = target ? Boolean(secrets[target.secret]) : false;
  const blockers = [
    !target && 'pilih target publish',
    target && !publish.siteId.trim() && `isi ${target.idLabel.toLowerCase()}`,
    target && !stored && 'simpan token',
    form.dirty && 'simpan perubahan di halaman ini',
  ].filter(Boolean);

  return (
    <FormPage title="Publish" form={form}>
      <p className="text-sm text-base-content/70">
        Publish membangun situs versi produksi, lalu mengunggahnya ke host pilihan Anda. Hanya post dan page berstatus
        Terbit yang ikut.
      </p>
      {!site.url && (
        <div role="status" className="alert alert-warning alert-soft text-sm">
          <TriangleAlert className="size-4 shrink-0" />
          <span>
            Alamat situs belum diisi di Settings &gt; Identitas situs. Tanpa itu, canonical, sitemap, feed, dan data
            terstruktur tidak dibuat.
          </span>
        </div>
      )}

      <SelectField
        label="Publish ke"
        value={manual || publish.target in TARGETS ? publish.target : 'none'}
        options={TARGET_OPTIONS}
        onChange={(value) => setPublish({ target: value })}
      />
      {target && (
        <>
          <TextField
            label={target.idLabel}
            value={publish.siteId}
            hint={target.idHint}
            onChange={(siteId) => setPublish({ siteId: siteId.trim() })}
          />
          {publish.target === 'vercel' && (
            <TextField
              label="ID tim (opsional)"
              value={publish.teamId}
              hint="Hanya untuk proyek milik tim di Vercel. Kosongkan untuk akun pribadi."
              onChange={(teamId) => setPublish({ teamId: teamId.trim() })}
            />
          )}
          <TokenField target={target} stored={stored} onStored={setSecrets} />
        </>
      )}

      {manual && <ManualGuide outDir={result?.build?.outDir} />}

      <div className="flex flex-wrap items-center gap-2 border-t border-base-300 pt-4">
        <button type="button" className={`btn ${manual ? 'btn-primary' : ''}`} disabled={Boolean(running)} onClick={() => run('build')}>
          {running === 'build' ? <span className="loading loading-spinner loading-xs" /> : <Hammer className="size-4" />}
          {manual ? 'Bangun situs' : 'Bangun saja'}
        </button>
        {!manual && (
          <>
            <button
              type="button"
              className="btn btn-primary"
              disabled={Boolean(running) || blockers.length > 0}
              onClick={() => run('deploy')}
            >
              {running === 'deploy' ? <span className="loading loading-spinner loading-xs" /> : <Rocket className="size-4" />}
              Publish sekarang
            </button>
            {blockers.length > 0 && (
              <span className="text-xs text-base-content/60">Sebelum publish: {blockers.join(', ')}.</span>
            )}
          </>
        )}
      </div>
      <Result result={result} />
    </FormPage>
  );
}
