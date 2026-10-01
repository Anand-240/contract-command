import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { PageHeader, MetricCard, MetricRow, ActivityTimeline } from '@/components/common';
import { ContractStatusChart, SpendChart } from '@/components/charts';
import { Button, ErrorState, Panel, Skeleton } from '@/components/ui';
import { canAccessPath, ROLE_LABEL, ROLE_WORKSPACES } from '@/constants';
import { useAsync, useSession } from '@/hooks';
import { dashboardService } from '@/services';
import { formatMoneyShort } from '@/utils';
import type { AuditEntry, EntityType, Role } from '@/types';

const ROUTE_FOR: Record<EntityType, (id: string) => string> = {
  procurement_plan: (id) => `/app/procurement/${id}`,
  contract: (id) => `/app/contracts/${id}`,
  purchase_order: (id) => `/app/purchase-orders/${id}`,
  invoice: (id) => `/app/invoices/${id}`,
  payment: (id) => `/app/payments/${id}`,
  vendor: (id) => `/app/vendors/${id}`,
  amendment: (id) => `/app/contracts/${id}`,
  delivery: (id) => `/app/deliveries/${id}`,
  vendor_evaluation: () => '/app/evaluations',
  user: () => '/app/settings',
};

function activityLink(entry: AuditEntry, role: Role) {
  if (entry.entityType === 'amendment') return canAccessPath(role, '/app/audit') ? '/app/audit' : '/app/dashboard';
  const path = (ROUTE_FOR[entry.entityType] ?? (() => '/app/dashboard'))(entry.entityId);
  return canAccessPath(role, path) ? path : '/app/dashboard';
}

export function DashboardPage() {
  const { user, role } = useSession();
  const { data, loading, error, refetch } = useAsync(() => dashboardService.load(), []);
  const workspace = ROLE_WORKSPACES[role];
  const metrics = data?.metrics;
  const isGovernance = role === 'admin' || role === 'auditor';
  const isDecision = role === 'admin' || role === 'approver';
  const isAcquisition = role === 'admin' || role === 'procurement_officer';
  const isVendor = role === 'vendor_manager';

  if (error) return <ErrorState onRetry={refetch} />;

  return <div className="space-y-5">
    <PageHeader
      title={`${ROLE_LABEL[role]} workspace`}
      description={`${user.name}: ${workspace.description}`}
      actions={<Link to={workspace.steps[0].to}><Button variant="primary" iconRight={ArrowRight}>{workspace.steps[0].label}</Button></Link>}
    />

    {loading || !metrics ? (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-24" />)}</div>
    ) : (
      <MetricRow>
        {isAcquisition || isGovernance ? <MetricCard label="Active contracts" value={String(metrics.activeContracts)} note="Approved agreements in force" to="/app/contracts" /> : null}
        {isAcquisition || isGovernance ? <MetricCard label="Procurement budget" value={formatMoneyShort(metrics.procurementBudget)} note="Across open procurement cases" to="/app/procurement" /> : null}
        {isDecision ? <MetricCard label="Decisions pending" value={String(metrics.pendingApprovals)} note="Cases requiring approval" to="/app/approvals" /> : null}
        {isAcquisition || isDecision || isGovernance ? <MetricCard label="Invoices outstanding" value={String(metrics.outstandingInvoices)} note={formatMoneyShort(metrics.outstandingInvoiceValue)} to="/app/invoices" /> : null}
        {isAcquisition || isVendor || isGovernance ? <MetricCard label="Deliveries open" value={String(metrics.pendingDeliveries)} note="Awaiting complete acceptance" to="/app/deliveries" /> : null}
        {isVendor || isGovernance ? <MetricCard label="Vendors under review" value={String(metrics.vendorsUnderReview)} note={`${metrics.vendorCount} registered vendors`} to="/app/vendors" /> : null}
        {isVendor ? <MetricCard label="Evaluations recorded" value={String(metrics.evaluationsCount)} note="Supplier performance history" to="/app/evaluations" /> : null}
        {isDecision ? <MetricCard label="Payments awaiting release" value={String(metrics.pendingPayments)} note="Approved invoices in payment workflow" to="/app/payments" /> : null}
      </MetricRow>
    )}

    <Panel title={workspace.title} description="Open the next area in your assigned workflow.">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {workspace.steps.map((step, index) => <Link key={step.to} to={step.to} className="group rounded-md border border-line p-3 transition-colors hover:border-brand hover:bg-surface-muted">
          <div className="flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded bg-brand-tint text-xs font-semibold text-brand">{index + 1}</span><span className="text-sm font-semibold text-ink group-hover:text-brand">{step.label}</span></div>
          <p className="mt-1 pl-8 text-xs text-ink-muted">{step.description}</p>
        </Link>)}
      </div>
    </Panel>

    {isDecision ? <Panel title="Pending decisions" description="Live cases awaiting an authorized decision." action={<Link to="/app/approvals" className="text-sm text-brand hover:underline">Open queue</Link>}>
      {loading || !data ? <Skeleton className="h-32" /> : data.pendingActions.length ? <ul className="divide-y divide-line">
        {data.pendingActions.map((task) => <li key={task.id}><Link to={(ROUTE_FOR[task.entityType] ?? (() => '/app/approvals'))(task.entityId)} className="flex items-center justify-between gap-3 py-2.5 text-sm hover:text-brand"><span><span className="font-medium">{task.entityCode}</span><span className="ml-2 text-ink-muted">{task.title}</span></span><ArrowRight size={15} /></Link></li>)}
      </ul> : <p className="text-sm text-ink-muted">No decisions are waiting.</p>}
    </Panel> : null}

    {isAcquisition || isGovernance ? <div className="grid gap-5 xl:grid-cols-2">
      <Panel title="Contract status" description="Current agreements by lifecycle stage.">{loading || !data ? <Skeleton className="h-56" /> : <ContractStatusChart data={data.contractStatus} />}</Panel>
      <Panel title="Procurement spend" description="Planned, committed and paid value by department.">{loading || !data ? <Skeleton className="h-56" /> : <SpendChart data={data.spend} />}</Panel>
    </div> : null}

    {isVendor || isGovernance ? <Panel title="Recent activity" description="Recorded events relevant to this workspace." action={isGovernance ? <Link to="/app/audit" className="text-sm text-brand hover:underline">Audit log</Link> : undefined}>
      {loading || !data ? <Skeleton className="h-32" /> : data.activity.length ? <ActivityTimeline entries={data.activity} linkFor={(entry) => activityLink(entry, role)} /> : <p className="text-sm text-ink-muted">No recent activity.</p>}
    </Panel> : null}
  </div>;
}
