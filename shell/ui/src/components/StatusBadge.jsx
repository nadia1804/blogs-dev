const STATUS = {
  draft: { label: 'Draft', className: 'badge-ghost' },
  scheduled: { label: 'Terjadwal', className: 'badge-info badge-soft' },
  published: { label: 'Terbit', className: 'badge-success badge-soft' },
};

export function StatusBadge({ status }) {
  const { label, className } = STATUS[status] ?? STATUS.draft;
  return <span className={`badge badge-sm ${className}`}>{label}</span>;
}
