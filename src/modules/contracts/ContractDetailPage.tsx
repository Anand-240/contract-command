import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Ban, CheckCircle2, GitBranch, Send, ShoppingCart, XCircle } from 'lucide-react';
import {
  ApprovalTimeline,
  AuditTimeline,
  DetailSection,
  DocumentList,
  EntityHeader,
  LifecycleProgress,
} from '@/components/common';
import {
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Panel,
  Skeleton,
  StatusBadge,
  Tabs,
} from '@/components/ui';
import { AMENDMENT_TYPE, CONTRACT_STATUS, DELIVERY_STATUS, statusMeta } from '@/constants';
import { useAsync, useLookup, useSession } from '@/hooks';
import { auditService, contractService, purchaseOrderService } from '@/services';
import { daysUntil, formatDate, formatMoney } from '@/utils';
import type { ContractStatus } from '@/types';

export function ContractDetailPage() {
  const { id = '' } = useParams();
  const { can } = useSession();
  const { vendorName } = useLookup();
  const [tab, setTab] = useState('overview');
  const [pending, setPending] = useState<{ status: ContractStatus; label: string; tone: 'default' | 'danger' } | null>(null);
  const [working, setWorking] = useState(false);
  const [actionError, setActionError] = useState('');

  const { data: contract, loading, error, refetch } = useAsync(() => contractService.get(id), [id]);
  const { data: orders } = useAsync(() => purchaseOrderService.list({ contractId: id }), [id]);
  const { data: audit } = useAsync(() => auditService.forEntity(id), [id]);

  if (error) return <ErrorState title="This contract could not be loaded" onRetry={refetch} />;
  if (loading || !contract) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-32 w-full rounded-lg" />
        <Skeleton className="h-72 w-full rounded-lg" />
      </div>
    );
  }

  const live = ['active', 'amended'].includes(contract.status);
  const daysRemaining = daysUntil(contract.endDate);

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'documents', label: 'Documents', count: contract.documents.length },
    { id: 'amendments', label: 'Amendments', count: contract.amendments.length },
    { id: 'orders', label: 'Purchase orders', count: orders?.length ?? 0 },
    { id: 'approvals', label: 'Approvals', count: contract.approvals.length },
    { id: 'audit', label: 'Audit trail' },
  ];

  const confirm = async () => {
    if (!pending) return;
    setWorking(true);
    setActionError('');
    try { await contractService.transition(contract.id, pending.status); setPending(null); refetch(); }
    catch (cause) { setActionError(cause instanceof Error ? cause.message : 'Contract action failed.'); }
    finally { setWorking(false); }
  };

  return (
    <div className="space-y-5">
      {actionError ? <p role="alert" className="text-critical">{actionError}</p> : null}
      <EntityHeader
        code={contract.code}
        title={contract.title}
        status={statusMeta(CONTRACT_STATUS, contract.status)}
        facts={[
          {
            label: 'Vendor',
            value: (
              <Link to={`/app/vendors/${contract.vendorId}`} className="text-brand hover:underline">
                {vendorName(contract.vendorId)}
              </Link>
            ),
          },
          { label: 'Contract value', value: formatMoney(contract.value, contract.currency), mono: true },
          { label: 'Start date', value: formatDate(contract.startDate), mono: true },
          { label: 'End date', value: formatDate(contract.endDate), mono: true },
          { label: 'Version', value: contract.version, mono: true },
          { label: 'Owner', value: contract.owner },
        ]}
        actions={
          <>
            {can('contract.submit') && contract.status === 'draft' ? (
              <>
                <Button
                  variant="primary"
                  icon={Send}
                  onClick={() => setPending({ status: 'under_review', label: 'Submit for review', tone: 'default' })}
                >
                  Submit for review
                </Button>
              </>
            ) : null}

            {can('approve.contract') && contract.status === 'under_review' ? (
              <>
                <Button
                  variant="secondary"
                  icon={XCircle}
                  onClick={() => setPending({ status: 'draft', label: 'Return to drafting', tone: 'default' })}
                >
                  Return
                </Button>
                <Button
                  variant="danger"
                  icon={XCircle}
                  onClick={() => setPending({ status: 'rejected', label: 'Reject contract', tone: 'danger' })}
                >
                  Reject
                </Button>
                <Button
                  variant="primary"
                  icon={CheckCircle2}
                  onClick={() => setPending({ status: 'approved', label: 'Approve contract', tone: 'default' })}
                >
                  Approve
                </Button>
              </>
            ) : null}

            {can('contract.submit') && contract.status === 'approved' ? <Button variant="primary" onClick={() => setPending({ status: 'active', label: 'Activate contract', tone: 'default' })}>Activate contract</Button> : null}

            {can('contract.amend') && live ? (
              <Link to={`/app/contracts/${contract.id}/amend`}>
                <Button variant="secondary" icon={GitBranch}>
                  Amend
                </Button>
              </Link>
            ) : null}

            {can('approve.contract') && live ? (
              <>
                <Button
                  variant="secondary"
                  onClick={() => setPending({ status: 'closed', label: 'Close contract', tone: 'default' })}
                >
                  Close
                </Button>
                <Button
                  variant="danger"
                  icon={Ban}
                  onClick={() => setPending({ status: 'terminated', label: 'Terminate contract', tone: 'danger' })}
                >
                  Terminate
                </Button>
              </>
            ) : null}
          </>
        }
      />

      {live && daysRemaining <= 90 ? (
        <div className="flex items-start gap-2.5 rounded-lg border border-caution-line bg-caution-tint px-4 py-3">
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-caution">
              This contract ends in {daysRemaining} days, on {formatDate(contract.endDate)}
            </p>
            <p className="mt-0.5 text-[12.5px] text-ink-muted">
              Raise a follow on case or an extension amendment before the end date so supply is not interrupted.
            </p>
          </div>
        </div>
      ) : null}

      <Panel title="Case position" description="Where this contract stands in the procurement lifecycle">
        <LifecycleProgress current={contract.status === 'draft' || contract.status === 'under_review' ? 1 : 2} />
      </Panel>

      <Panel flush>
        <Tabs items={tabs} active={tab} onChange={setTab} className="px-2" />

        <div className="p-5">
          {tab === 'overview' ? (
            <div className="space-y-6">
              <DetailSection title="Scope" rows={[{ label: 'Contract scope', value: contract.scope, wide: true }]} />
              <DetailSection
                title="Commercial terms"
                rows={[
                  { label: 'Payment terms', value: contract.paymentTerms },
                  { label: 'Delivery terms', value: contract.deliveryTerms },
                  { label: 'Performance guarantee', value: contract.performanceGuarantee },
                  { label: 'Liquidated damages', value: contract.liquidatedDamages },
                ]}
              />
              <DetailSection
                title="Administration"
                columns={3}
                rows={[
                  { label: 'Department', value: contract.department },
                  { label: 'Category', value: contract.category },
                  { label: 'Concluded on', value: formatDate(contract.createdAt) },
                  {
                    label: 'Originating plan',
                    value: contract.planId ? (
                      <Link to={`/app/procurement/${contract.planId}`} className="text-brand hover:underline">
                        {contract.planId}
                      </Link>
                    ) : (
                      <span className="text-ink-faint">Raised without a plan reference</span>
                    ),
                  },
                ]}
              />
            </div>
          ) : null}

          {tab === 'documents' ? <DocumentList documents={contract.documents} /> : null}

          {tab === 'amendments' ? (
            contract.amendments.length === 0 ? (
              <EmptyState
                icon={GitBranch}
                title="No amendments raised"
                description="When a clause, value or timeline changes, the revision is recorded here and the previous version is preserved."
              />
            ) : (
              <ol className="relative space-y-4">
                {[...contract.amendments].reverse().map((amendment) => (
                  <li key={amendment.id} className="rounded-md border border-line">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface-muted px-4 py-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="code text-[12.5px] font-semibold text-ink">Version {amendment.version}</span>
                        <StatusBadge meta={statusMeta(AMENDMENT_TYPE, amendment.type)} size="sm" withDot={false} />
                        {amendment.status === 'pending_approval' ? (
                          <StatusBadge meta={{ label: 'Pending approval', tone: 'caution' }} size="sm" />
                        ) : null}
                      </div>
                      <span className="text-[12px] text-ink-faint">
                        Effective {formatDate(amendment.effectiveDate)}
                      </span>
                    </div>

                    <div className="px-4 py-3">
                      <p className="text-[13.5px] font-medium text-ink">{amendment.summary}</p>
                      <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">{amendment.description}</p>
                      {amendment.reason ? (
                        <p className="mt-2 border-l-2 border-line pl-2.5 text-[12.5px] leading-relaxed text-ink-muted">
                          <span className="text-ink-faint">Reason: </span>
                          {amendment.reason}
                        </p>
                      ) : null}

                      {amendment.changes.length > 0 ? (
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          {amendment.changes.map((change) => (
                            <div key={change.field} className="rounded border border-line bg-surface-muted px-3 py-2">
                              <p className="text-[11.5px] text-ink-faint">{change.field}</p>
                              <div className="mt-1 flex items-baseline gap-2">
                                <span className="code text-[12.5px] text-ink-muted line-through">{change.previous}</span>
                                <span className="text-ink-faint" aria-label="changed to">
                                  to
                                </span>
                                <span className="code text-[12.5px] font-medium text-ink">{change.updated}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}

                      {amendment.documents?.length ? <div className="mt-3"><DocumentList documents={amendment.documents} /></div> : null}

                      {can('approve.contract') && amendment.status === 'pending_approval' ? <div className="mt-3 flex gap-2"><Button size="sm" variant="primary" onClick={async () => { try { await contractService.decideAmendment(contract.id, amendment.id, 'approve'); refetch(); } catch (cause) { window.alert(cause instanceof Error ? cause.message : 'Decision failed.'); } }}>Approve amendment</Button><Button size="sm" variant="danger" onClick={async () => { try { await contractService.decideAmendment(contract.id, amendment.id, 'reject'); refetch(); } catch (cause) { window.alert(cause instanceof Error ? cause.message : 'Decision failed.'); } }}>Reject</Button></div> : null}

                      <p className="mt-3 text-[12px] text-ink-faint">
                        Requested by {amendment.requestedBy}
                        {amendment.approver ? ` · Approved by ${amendment.approver}` : ''}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )
          ) : null}

          {tab === 'orders' ? (
            !orders || orders.length === 0 ? (
              <EmptyState
                icon={ShoppingCart}
                title="No purchase orders raised"
                description="Orders placed against this contract will be listed here with their delivery and invoice state."
              />
            ) : (
              <div className="overflow-x-auto rounded-md border border-line">
                <table className="w-full text-left">
                  <thead className="bg-surface-muted">
                    <tr>
                      {['Order', 'Order date', 'Expected delivery', 'Value', 'Delivery', 'Invoice'].map((head) => (
                        <th
                          key={head}
                          scope="col"
                          className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-ink-faint"
                        >
                          {head}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={order.id} className="border-t border-line hover:bg-surface-muted">
                        <td className="px-4 py-2.5">
                          <Link to={`/app/purchase-orders/${order.id}`} className="code text-[12.5px] font-medium text-ink hover:text-brand">
                            {order.code}
                          </Link>
                        </td>
                        <td className="px-4 py-2.5 text-[13px] tabular">{formatDate(order.orderDate)}</td>
                        <td className="px-4 py-2.5 text-[13px] tabular">{formatDate(order.expectedDelivery)}</td>
                        <td className="px-4 py-2.5 text-[13px] font-medium text-ink tabular">
                          {formatMoney(order.total, order.currency)}
                        </td>
                        <td className="px-4 py-2.5">
                          <StatusBadge meta={statusMeta(DELIVERY_STATUS, order.deliveryStatus)} size="sm" />
                        </td>
                        <td className="px-4 py-2.5 text-[12.5px] text-ink-muted">
                          {order.invoiceStatus.replace(/_/g, ' ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : null}

          {tab === 'approvals' ? <ApprovalTimeline events={contract.approvals} /> : null}
          {tab === 'audit' ? <AuditTimeline entries={audit ?? []} /> : null}
        </div>
      </Panel>

      <ConfirmDialog
        open={pending !== null}
        title={pending?.label ?? ''}
        description={`This action is recorded against ${contract.code} in the audit trail, with your name and the current timestamp.`}
        confirmLabel={pending?.label}
        tone={pending?.tone}
        loading={working}
        onConfirm={confirm}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}
