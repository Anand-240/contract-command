import { Menu, UserRound, LogOut } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { GlobalSearch } from './GlobalSearch';
import { NotificationPanel } from './NotificationPanel';
import { Avatar, Breadcrumb, Dropdown } from '@/components/ui';
import { canAccessPath, ROLE_LABEL, ROLE_SUMMARY, routeMeta } from '@/constants';
import { useSession } from '@/hooks';

export function Header({ onOpenNav }: { onOpenNav: () => void }) {
  const { pathname } = useLocation();
  const { user, role, signOut } = useSession();
  const navigate = useNavigate();
  const meta = routeMeta(pathname);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface">
      <div className="flex h-14 items-center gap-3 px-4">
        <button
          type="button"
          onClick={onOpenNav}
          aria-label="Open navigation"
          className="-ml-1 inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-muted transition-colors duration-150 hover:bg-surface-muted hover:text-ink lg:hidden"
        >
          <Menu size={17} aria-hidden />
        </button>

        <div className="min-w-0 flex-1">
          <Breadcrumb items={meta.trail.map((item) => 'to' in item && item.to && !canAccessPath(role, item.to) ? { ...item, to: undefined } : item)} />
          <h1 className="truncate text-[15px] font-semibold leading-tight text-ink">{meta.title}</h1>
        </div>

        <div className="hidden flex-1 justify-center md:flex">
          <GlobalSearch />
        </div>

        <div className="flex items-center gap-1">
          {role === 'approver' || role === 'admin' ? <NotificationPanel /> : null}
          <Dropdown
            label="Account"
            trigger={<Avatar name={user.name} size="sm" />}
            items={[
              { label: `${user.name} · ${ROLE_LABEL[role]}`, disabled: true },
              { label: ROLE_SUMMARY[role], disabled: true },
              { label: 'Profile and settings', icon: UserRound, to: '/app/settings', separatorBefore: true },
              { label: 'Sign out', icon: LogOut, tone: 'danger', onSelect: () => { signOut(); navigate('/login'); } },
            ]}
          />
        </div>
      </div>

      <div className="border-t border-line px-4 py-2 md:hidden">
        <GlobalSearch />
      </div>
    </header>
  );
}
