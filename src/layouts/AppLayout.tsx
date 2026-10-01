import { useState } from 'react';
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { useSession } from '@/hooks';
import { canAccessPath, ROLE_LABEL } from '@/constants';

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { signedIn, role } = useSession();
  const { pathname } = useLocation();

  if (!signedIn) return <Navigate to="/login" replace />;

  return (
    <div className="flex min-h-screen bg-canvas">
      <aside className="sticky top-0 hidden h-screen shrink-0 lg:block">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((value) => !value)} />
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink/25" onClick={() => setMobileOpen(false)} aria-hidden />
          <div className="absolute inset-y-0 left-0 w-60">
            <Sidebar collapsed={false} onToggle={() => setMobileOpen(false)} onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <Header onOpenNav={() => setMobileOpen(true)} />
        <main className="flex-1 px-4 py-5 sm:px-6 sm:py-6">
          {canAccessPath(role, pathname) ? <Outlet /> : (
            <section className="mx-auto max-w-xl rounded-lg border border-line bg-surface p-6">
              <h2 className="text-lg font-semibold text-ink">This area is outside your role</h2>
              <p className="mt-2 text-sm text-ink-muted">Your {ROLE_LABEL[role]} account has a focused workspace. Choose a section from the navigation to continue.</p>
              <Link to="/app/dashboard" className="mt-4 inline-block text-sm font-medium text-brand hover:underline">Return to dashboard</Link>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
