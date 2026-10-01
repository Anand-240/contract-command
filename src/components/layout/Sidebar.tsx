import { Link, NavLink, useNavigate } from 'react-router-dom';
import { ChevronsLeft, ChevronsRight, LogOut, UserRound } from 'lucide-react';
import { Logo } from './Logo';
import { NAV_GROUPS, ROLE_LABEL } from '@/constants';
import { useSession } from '@/hooks';
import { Avatar, Dropdown, Tooltip } from '@/components/ui';
import { cn } from '@/utils';

export interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  /** Mobile drawer closes after navigation. */
  onNavigate?: () => void;
}

export function Sidebar({ collapsed, onToggle, onNavigate }: SidebarProps) {
  const { user, role, signOut } = useSession();
  const navigate = useNavigate();
  const groups = NAV_GROUPS.map((group) => ({ ...group, items: group.items.filter((item) => !item.roles || item.roles.includes(role)) })).filter((group) => group.items.length > 0);

  return (
    <div className={cn('flex h-full flex-col border-r border-line bg-surface', collapsed ? 'w-16' : 'w-60')}>
      <div className={cn('flex h-14 items-center border-b border-line', collapsed ? 'justify-center px-2' : 'px-4')}>
        <Link to="/" onClick={onNavigate} aria-label="ContractCommand home" className="rounded focus:outline-none focus:ring-2 focus:ring-brand-tint">
          <Logo showWordmark={!collapsed} />
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3" aria-label="Sections">
        {groups.map((group) => (
          <div key={group.label} className="mb-4 last:mb-0">
            {!collapsed ? (
              <p className="px-2 pb-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-ink-faint">
                {group.label}
              </p>
            ) : (
              <div className="mx-2 mb-2 border-t border-line" aria-hidden />
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const link = (
                  <NavLink
                    to={item.to}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] transition-colors duration-150',
                        collapsed && 'justify-center px-0',
                        isActive
                          ? 'bg-brand-tint font-medium text-brand'
                          : 'text-ink-muted hover:bg-surface-muted hover:text-ink',
                      )
                    }
                  >
                    <item.icon size={16} className="shrink-0" aria-hidden />
                    {!collapsed ? <span className="truncate">{item.label}</span> : null}
                    {collapsed ? <span className="sr-only">{item.label}</span> : null}
                  </NavLink>
                );

                return (
                  <li key={item.to}>
                    {collapsed ? (
                      <Tooltip label={item.label} side="bottom" className="w-full">
                        {link}
                      </Tooltip>
                    ) : (
                      link
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-line p-2">
        <div className={cn('flex items-center gap-2.5 rounded-md px-1.5 py-1.5', collapsed && 'justify-center px-0')}>
          <Avatar name={user.name} size="sm" />
          {!collapsed ? (
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12.5px] font-medium text-ink">{user.name}</p>
              <p className="truncate text-[11.5px] text-ink-faint">{ROLE_LABEL[role]}</p>
            </div>
          ) : null}
          {!collapsed ? (
            <Dropdown
              label="Account menu"
              items={[
                { label: 'Profile', icon: UserRound, to: '/app/settings' },
                { label: 'Sign out', icon: LogOut, tone: 'danger', separatorBefore: true, onSelect: () => { signOut(); navigate('/login'); } },
              ]}
            />
          ) : null}
        </div>

        <button
          type="button"
          onClick={onToggle}
          className={cn(
            'mt-1 hidden w-full items-center gap-2 rounded-md px-2 py-1.5 text-[12.5px] text-ink-faint',
            'transition-colors duration-150 hover:bg-surface-muted hover:text-ink lg:flex',
            collapsed && 'justify-center px-0',
          )}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronsRight size={15} aria-hidden /> : <ChevronsLeft size={15} aria-hidden />}
          {!collapsed ? 'Collapse' : null}
        </button>
      </div>
    </div>
  );
}
