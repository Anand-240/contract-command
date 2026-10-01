import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FileText, Send } from 'lucide-react';
import {
  ApprovalTimeline,
  AuditTimeline,
  DetailSection,
  DocumentList,
  DocumentUploader,
  EntityHeader,
  LifecycleProgress,
} from '@/components/common';
import { Button, ErrorState, Panel, Skeleton, StatusBadge, Tabs } from '@/components/ui';
import { PLAN_STATUS, PRIORITY, statusMeta } from '@/constants';
import { useAsync, useSession } from '@/hooks';
import { auditService, procurementService } from '@/services';
import { formatDate, formatMoney } from '@/utils';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'budget', label: 'Budget' },
  { id: 'approvals', label: 'Approval history' },
  { id: 'documents', label: 'Documents' },
  { id: 'audit', label: 'Audit trail' },
];

export function ProcurementDetailPage() {
  const { id = '' } = useParams();
  const { can } = useSession();
  const [tab, setTab] = useState('overview');
  const [actionError, setActionError] = useState('');
  const [uploadError, setUploadError] = useState('');

  const { data: plan, loading, error, refetch } = useAsync(() => procurementService.get(id), [id]);
  const { data: audit } = useAsync(() => auditService.forEntity(id), [id]);

  if (error) return <ErrorState title="This procurement plan could not be loaded" onRetry={refetch} />;
  if (loading || !plan) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-32 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  const lineTotal = plan.lineItems.reduce((sum, item) => sum + item.quantity * item.estimatedUnitCost, 0);
  const stage = plan.status === 'converted' ? 1 : 0;

  return (
    <div className="space-y-5">
      <EntityHeader
        code={plan.code}
        title={plan.title}
        status={statusMeta(PLAN_STATUS, plan.status)}
        secondaryStatus={statusMeta(PRIORITY, plan.priority)}
        facts={[
          { label: 'Owner', value: plan.owner },
          { label: 'Department', value: plan.department },
          { label: 'Estimated budget', value: formatMoney(plan.estimatedBudget, plan.currency), mono: true },
          { label: 'Required by', value: formatDate(plan.requiredDate), mono: true },
          { label: 'Budget head', value: plan.budgetReference, mono: true },
          {
            label: 'Linked contract',
            value: plan.linkedContractId ? (
              <Link to={`/app/contracts/${plan.linkedContractId}`} className="text-brand hover:underline">
                {plan.linkedContractId}
              </Link>
            ) : (
              <span className="text-ink-faint">Not yet awarded</span>
            ),
          },
        ]}
        actions={
          <>
            {can('plan.submit') && plan.status === 'draft' ? (
              <Button variant="primary" icon={Send} onClick={async () => { try { await procurementService.submit(plan.id); refetch(); } catch (error) { setActionError(error instanceof Error ? error.message : 'Submission failed.'); } }}>
                Submit for approval
              </Button>
            ) : null}
            {plan.status === 'approved' && can('contract.create') ? (
              <Link to="/app/contracts/new">
                <Button variant="primary" icon={FileText}>
                  Raise contract
                </Button>
              </Link>
            ) : null}
          </>
        }
      />

      {actionError ? <p role="alert" className="text-critical">{actionError}</p> : null}
      <Panel title="Case position" description="Where this acquisition stands in the procurement lifecycle">
        <LifecycleProgress current={stage} />
      </Panel>

      <Panel flush>
        <Tabs items={TABS} active={tab} onChange={setTab} className="px-2" />

        <div className="p-5">
          {tab === 'overview' ? (
            <div className="space-y-6">
              <DetailSection
                rows={[
                  { label: 'Description', value: plan.description, wide: true },
                  { label: 'Category', value: plan.category },
                  { label: 'Priority', value: <StatusBadge meta={statusMeta(PRIORITY, plan.priority)} size="sm" /> },
                  { label: 'Expected procurement start', value: formatDate(plan.expectedStart) },
                  { label: 'Expected completion', value: formatDate(plan.expectedCompletion) },
                  { label: 'Raised on', value: formatDate(plan.createdAt) },
                  { label: 'Last updated', value: formatDate(plan.updatedAt) },
                ]}
              />

              {plan.comments ? (
                <div className="rounded-md border border-line bg-surface-muted px-4 py-3">
                  <p className="text-[12px] font-medium text-ink-faint">Note recorded with the case</p>
                  <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">{plan.comments}</p>
                </div>
              ) : null}
            </div>
          ) : null}

          {tab === 'budget' ? (
            <div className="space-y-5">
              <DetailSection
                columns={3}
                rows={[
                  { label: 'Estimated budget', value: formatMoney(plan.estimatedBudget, plan.currency), mono: true },
                  { label: 'Budget head', value: plan.budgetReference, mono: true },
                  { label: 'Currency', value: plan.currency },
                ]}
              />

              {plan.lineItems.length > 0 ? (
                <div className="overflow-x-auto rounded-md border border-line">
                  <table className="w-full text-left">
                    <thead className="bg-surface-muted">
                      <tr>
                        {['Item', 'Quantity', 'Unit', 'Estimated unit cost', 'Line value'].map((head, index) => (
                          <th
                            key={head}
                            scope="col"
                            className={`px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-ink-faint ${
                              index > 0 ? 'text-right' : ''
                            }`}
                          >
                            {head}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {plan.lineItems.map((item) => (
                        <tr key={item.id} className="border-t border-line">
                          <td className="px-4 py-2.5 text-[13.5px] text-ink">{item.description}</td>
                          <td className="px-4 py-2.5 text-right text-[13.5px] tabular">{item.quantity}</td>
                          <td className="px-4 py-2.5 text-right text-[13.5px]">{item.unit}</td>
                          <td className="px-4 py-2.5 text-right text-[13.5px] tabular">
                            {formatMoney(item.estimatedUnitCost, plan.currency)}
                          </td>
                          <td className="px-4 py-2.5 text-right text-[13.5px] font-medium text-ink tabular">
                            {formatMoney(item.quantity * item.estimatedUnitCost, plan.currency)}
                          </td>
                        </tr>
                      ))}
                      <tr className="border-t border-line bg-surface-muted">
                        <td colSpan={4} className="px-4 py-2.5 text-right text-[12.5px] font-medium text-ink-muted">
                          Estimated total
                        </td>
                        <td className="px-4 py-2.5 text-right text-[13.5px] font-semibold text-ink tabular">
                          {formatMoney(lineTotal, plan.currency)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-[13px] text-ink-faint">No line items have been added to this plan.</p>
              )}
            </div>
          ) : null}

          {tab === 'approvals' ? <ApprovalTimeline events={plan.approvals} /> : null}
          {tab === 'documents' ? <div className="space-y-4"><DocumentList documents={plan.documents} />{can('plan.create') ? <DocumentUploader onFiles={async (files) => { setUploadError(''); try { for (const file of files) await procurementService.uploadDocument(plan.id, file); refetch(); } catch (cause) { setUploadError(cause instanceof Error ? cause.message : 'Upload failed.'); } }} /> : null}{uploadError ? <p role="alert" className="text-critical">{uploadError}</p> : null}</div> : null}
          {tab === 'audit' ? <AuditTimeline entries={audit ?? []} /> : null}
        </div>
      </Panel>
    </div>
  );
}
