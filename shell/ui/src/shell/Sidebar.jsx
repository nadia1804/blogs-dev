import { Feather, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { NAV_GROUPS } from '../app/routes.js';
import { Link, usePathname } from '../lib/router.jsx';

const isActive = (pathname, to) => (to === '/' ? pathname === '/' : pathname === to || pathname.startsWith(`${to}/`));

// Satu item sidebar. Saat dilipat, item menjadi kotak 1x1 (size-10) dengan
// ikon di tengah; saat terbuka, baris setinggi kotak yang sama.
const itemClass = (collapsed, active) =>
  `flex h-10 items-center gap-3 rounded-field text-sm transition-colors hover:bg-base-content/10 ${
    collapsed ? 'w-10 justify-center' : 'px-2.5'
  } ${active ? 'bg-base-content/10 font-semibold' : 'text-base-content/80'}`;

// Panel 1: sidebar. Saat dilipat hanya ikon yang tampil, dengan tooltip.
export function Sidebar({ collapsed, onToggle }) {
  const pathname = usePathname();
  const ToggleIcon = collapsed ? PanelLeftOpen : PanelLeftClose;
  const tip = (label) => (collapsed ? { 'data-tip': label, className: 'tooltip tooltip-right' } : {});

  return (
    <aside
      className={`relative z-20 flex shrink-0 flex-col border-r border-base-300 bg-base-100 transition-[width] duration-200 ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Identitas shell sendiri. Logo situs hanya dipakai tema (front end). */}
      <Link
        to="/"
        aria-label="Blogs CMS"
        className={`flex h-14 shrink-0 items-center gap-2 border-b border-base-300 px-3 ${collapsed ? 'justify-center' : ''}`}
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-field bg-primary text-primary-content">
          <Feather className="size-5" />
        </span>
        {!collapsed && <span className="truncate font-semibold">Blogs CMS</span>}
      </Link>

      <nav className={`flex-1 p-2 ${collapsed ? '' : 'overflow-y-auto'}`} aria-label="Menu utama">
        {NAV_GROUPS.map((group, index) => (
          <ul
            key={index}
            className={`flex flex-col gap-1 ${collapsed ? 'items-center' : ''} ${
              index ? 'mt-2 border-t border-base-300 pt-2' : ''
            }`}
          >
            {group.map(({ to, label, icon: Icon }) => (
              <li key={to} {...tip(label)}>
                <Link
                  to={to}
                  aria-label={label}
                  aria-current={isActive(pathname, to) ? 'page' : undefined}
                  className={itemClass(collapsed, isActive(pathname, to))}
                >
                  <Icon className="size-5 shrink-0" />
                  {!collapsed && <span className="truncate">{label}</span>}
                </Link>
              </li>
            ))}
          </ul>
        ))}
      </nav>

      <div className={`flex border-t border-base-300 p-2 ${collapsed ? 'justify-center' : ''}`}>
        <div {...tip('Buka sidebar')} className={collapsed ? 'tooltip tooltip-right' : 'w-full'}>
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={!collapsed}
            aria-label={collapsed ? 'Buka sidebar' : 'Lipat sidebar'}
            className={`${itemClass(collapsed, false)} cursor-pointer ${collapsed ? '' : 'w-full'}`}
          >
            <ToggleIcon className="size-5 shrink-0" />
            {!collapsed && <span>Lipat</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}
