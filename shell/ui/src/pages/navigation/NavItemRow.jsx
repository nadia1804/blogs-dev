import { useRef } from 'react';
import { ArrowDown, ArrowUp, ChevronDown, GripVertical, IndentDecrease, IndentIncrease, Minus, Trash2 } from 'lucide-react';
import { AppIcon } from '../../components/AppIcon.jsx';
import { TextField } from '../../components/fields.jsx';
import { IconPickerField } from '../../components/IconPicker.jsx';
import { isComplete } from './nav-model.js';
import { TargetEditor, kindLabel } from './TargetEditor.jsx';

const NoIcon = () => <Minus className="size-4 text-base-content/30" />;

function RowButton({ label, icon: Icon, onClick, disabled, className = '' }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`btn btn-ghost btn-xs btn-square ${className}`}
    >
      <Icon className="size-4" />
    </button>
  );
}

// Satu baris item menu: pegangan seret, ringkasan, tombol aksi, dan
// (saat dibuka) field label, tujuan, dan ikon.
//
//   drop: 'before' | 'after' | null  -> garis penanda posisi jatuh
export function NavItemRow({ item, index, total, expanded, dragging, drop, actions }) {
  const row = useRef(null);
  const incomplete = !item.label.trim() || !isComplete(item.target);

  return (
    <li
      className={`relative ${item.depth ? 'ml-8' : ''}`}
      onDragOver={(event) => actions.dragOver(index, event)}
      onDrop={actions.drop}
    >
      {drop && (
        <span
          aria-hidden="true"
          className={`absolute inset-x-0 z-[1] h-0.5 rounded-full bg-primary ${drop === 'before' ? '-top-[5px]' : '-bottom-[5px]'}`}
        />
      )}
      <div
        ref={row}
        className={`rounded-field border bg-base-100 ${incomplete ? 'border-warning' : 'border-base-300'} ${
          dragging ? 'opacity-40' : ''
        }`}
      >
        <div className="flex items-center gap-1 p-1.5">
          <button
            type="button"
            draggable
            aria-label="Seret untuk mengurutkan"
            title="Seret untuk mengurutkan"
            className="btn btn-ghost btn-xs btn-square cursor-grab text-base-content/50 active:cursor-grabbing"
            onDragStart={(event) => {
              event.dataTransfer.effectAllowed = 'move';
              event.dataTransfer.setData('text/plain', item.id);
              event.dataTransfer.setDragImage(row.current, 16, 16);
              actions.dragStart(index);
            }}
            onDragEnd={actions.dragEnd}
          >
            <GripVertical className="size-4" />
          </button>

          <button
            type="button"
            aria-expanded={expanded}
            onClick={() => actions.toggle(item.id)}
            className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-field px-1 py-1 text-left text-sm hover:bg-base-content/5"
          >
            <span className="grid size-5 shrink-0 place-items-center">
              {item.icon ? <AppIcon name={item.icon} className="size-4" fallback={NoIcon} /> : <NoIcon />}
            </span>
            <span className={`truncate font-medium ${item.label ? '' : 'text-base-content/40'}`}>
              {item.label || '(Tanpa label)'}
            </span>
            <span className="badge badge-ghost badge-sm shrink-0">{kindLabel(item.target.kind)}</span>
            {incomplete && <span className="shrink-0 text-xs text-warning">Belum lengkap</span>}
            <ChevronDown className={`ml-auto size-4 shrink-0 text-base-content/50 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>

          <RowButton label="Naikkan" icon={ArrowUp} disabled={index === 0} onClick={() => actions.moveBy(index, -1)} />
          <RowButton label="Turunkan" icon={ArrowDown} disabled={index === total - 1} onClick={() => actions.moveBy(index, 1)} />
          {item.depth ? (
            <RowButton label="Jadikan item utama" icon={IndentDecrease} onClick={() => actions.setDepth(index, 0)} />
          ) : (
            <RowButton label="Jadikan submenu" icon={IndentIncrease} disabled={index === 0} onClick={() => actions.setDepth(index, 1)} />
          )}
          <RowButton label="Hapus item" icon={Trash2} className="text-error" onClick={() => actions.remove(index)} />
        </div>

        {expanded && (
          <div className="flex flex-col gap-4 border-t border-base-300 p-3">
            <TextField label="Label" value={item.label} onChange={(label) => actions.update(index, { label })} />
            <TargetEditor
              target={item.target}
              onChange={(target, suggested) =>
                actions.update(index, { target, ...(suggested && !item.label.trim() ? { label: suggested } : {}) })
              }
            />
            <IconPickerField allowEmpty label="Ikon" value={item.icon} onChange={(icon) => actions.update(index, { icon })} />
          </div>
        )}
      </div>
    </li>
  );
}
