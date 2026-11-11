// Lampu watcher di panel 2.
const STATES = {
  idle: { lamp: 'bg-success', label: 'Siap', hint: 'Tidak ada dokumen yang sedang dibuka' },
  saved: { lamp: 'bg-success', label: 'Tersimpan', hint: 'Semua perubahan tersimpan' },
  drafted: {
    lamp: 'bg-success',
    label: 'Draft tersimpan',
    hint: 'Perubahan aman di draft otomatis. Tekan Save untuk menyimpannya ke dokumen.',
  },
  dirty: { lamp: 'bg-warning', label: 'Belum tersimpan', hint: 'Ada perubahan yang belum tersimpan' },
  saving: { lamp: 'bg-info animate-pulse', label: 'Menyimpan…', hint: 'Sedang menyimpan' },
  error: { lamp: 'bg-error', label: 'Gagal menyimpan', hint: 'Klik untuk coba lagi' },
};

export function Watcher({ status, onRetry }) {
  const state = STATES[status] ?? STATES.idle;
  const retry = status === 'error' && onRetry;
  const Tag = retry ? 'button' : 'div';

  return (
    <div className="tooltip tooltip-bottom" data-tip={state.hint}>
      <Tag
        {...(retry ? { type: 'button', onClick: onRetry } : {})}
        role="status"
        className={`flex items-center gap-2 rounded-field px-2 py-1 text-sm ${retry ? 'cursor-pointer hover:bg-base-200' : ''}`}
      >
        <span className={`size-2.5 rounded-full ${state.lamp}`} />
        <span className="hidden text-base-content/70 md:inline">{state.label}</span>
      </Tag>
    </div>
  );
}
