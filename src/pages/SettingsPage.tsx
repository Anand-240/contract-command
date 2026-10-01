import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/common';
import { Avatar, Panel } from '@/components/ui';
import { ROLE_LABEL, ROLE_SUMMARY, ROLE_WORKSPACES } from '@/constants';
import { useSession } from '@/hooks';

export function SettingsPage() {
  const { user, role } = useSession();
  const workspace = ROLE_WORKSPACES[role];
  return <div className="space-y-5">
    <PageHeader title="Account and access" description="Your assigned role determines the work available in ContractCommand." />
    <Panel title="Account"><div className="flex items-center gap-4"><Avatar name={user.name} /><div><p className="font-medium text-ink">{user.name}</p><p className="text-[13px] text-ink-muted">{user.email}</p><p className="text-[12px] text-ink-faint">{user.designation} · {user.department}</p></div></div></Panel>
    <Panel title={ROLE_LABEL[role]} description={ROLE_SUMMARY[role]}>
      <p className="text-sm text-ink-muted">{workspace.description}</p>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {workspace.steps.map((step) => <li key={step.to}><Link to={step.to} className="block rounded-md border border-line p-3 hover:border-brand hover:bg-surface-muted"><span className="text-sm font-medium text-brand">{step.label}</span><span className="mt-1 block text-xs text-ink-muted">{step.description}</span></Link></li>)}
      </ul>
    </Panel>
  </div>;
}
