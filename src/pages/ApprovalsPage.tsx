import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, CheckSquare, MessageSquare, TriangleAlert, X } from 'lucide-react';
import { PageHeader } from '@/components/common';
import {
  Button,
  Drawer,
  EmptyState,
  ErrorState,
  FilterBar,
  Panel,
  SearchInput,
  Select,
  Skeleton,
  StatusBadge,
  Textarea,
} from '@/components/ui';
import { ENTITY_LABEL, PRIORITY, statusMeta } from '@/constants';
import { useAsync, useDebounced, useSession } from '@/hooks';
import { approvalService, type ApprovalDecision } from '@/services';
import { formatDate, formatMoney } from '@/utils';
import type { ApprovalTask, EntityType } from '@/types';

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

const ENTITY_OPTIONS = Object.entries(ENTITY_LABEL).map(([value, label]) => ({ value, label }));

export function ApprovalsPage() {
  const { can } = useSession();
  const [search, setSearch] = useState('');
  const [entityType, setEntityType] = useState('');
  const [priority, setPriority] = useState('');
  const [selected, setSelected] = useState<ApprovalTask | null>(null);
  const [remarks, setRemarks] = useState('');
  const [working, setWorking] = useState<ApprovalDecision | null>(null);
  const [decisionError, setDecisionError] = useState('');
  const debounced = useDebounced(search);

  const { data, loading, error, refetch } = useAsync(
    () => approvalService.list({ search: debounced, entityType, priority }),
    [debounced, entityType, priority],
  );

  const activeFilters = [entityType, priority].filter(Boolean).length;
  const mayApprove = can('approve.contract') || can('approve.invoice') || can('approve.plan') || can('approve.payment');

  const decide = async (decision: ApprovalDecision) => {
    if (!selected) return;
    setWorking(decision);
    try {
      await approvalService.decide(selected.id, decision, remarks);
      setSelected(null); setRemarks(''); refetch();
    } catch (cause) { setDecisionError(cause instanceof Error ? cause.message : 'Decision failed.'); }
    finally { setWorking(null); }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Approval Queue"
        description="Cases awaiting a decision from you, with the full context needed before recording one."
      />

      {decisionError ? <p role="alert" className="text-critical">{decisionError}</p> : null}
      {!mayApprove ? (
        <div className="rounded-lg border border-line bg-surface-muted px-4 py-3">
          <p className="text-[13px] text-ink-muted">
            Your role can view this queue but cannot record a decision. Approval requires the approver role.
          </p>
        </div>
      ) : null}

      <Panel flush>
        <FilterBar
          activeCount={activeFilters}
          onReset={() => {
            setEntityType('');
            setPriority('');
          }}
        >
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by reference or submitter"
            className="w-full sm:w-64"
          />
          <Select
            value={entityType}
            onChange={(event) => setEntityType(event.target.value)}
            options={ENTITY_OPTIONS}
            placeholder="All record types"
            aria-label="Filter by record type"
            className="w-48"
          />
          <Select
            value={priority}
            onChange={(event) => setPriority(event.target.value)}
            options={Object.entries(PRIORITY).map(([value, meta]) => ({ value, label: meta.label }))}
            placeholder="Any priority"
            aria-label="Filter by priority"
            className="w-40"
          />
        </FilterBar>

        {error ? (
          <ErrorState onRetry={refetch} />
        ) : loading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-20 w-full" />
            ))}
          </div>
        ) : !data || data.length === 0 ? (
          <EmptyState
            icon={CheckSquare}
            title={activeFilters || search ? 'No cases match these filters' : 'Nothing awaits your decision'}
            description={
              activeFilters || search
                ? 'Adjust or clear the filters to widen the search.'
                : 'Cases routed to you for approval will appear here with their due date and priority.'
            }
          />
        ) : (
          <ul className="divide-y divide-line">
            {data.map((task) => {
              return (
                <li key={task.id} className="px-4 py-3.5 transition-colors duration-150 hover:bg-surface-muted">
                  <div className="flex flex-wrap items-start gap-x-5 gap-y-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          to={ROUTE_FOR[task.entityType](task.entityId)}
                          className="code text-[13px] font-medium text-ink hover:text-brand hover:underline"
                        >
                          {task.entityCode}
                        </Link>
                        <span className="text-[11.5px] text-ink-faint">{ENTITY_LABEL[task.entityType]}</span>
                        <StatusBadge meta={statusMeta(PRIORITY, task.priority)} size="sm" withDot={false} />
                      </div>

                      <p className="mt-1 text-[13.5px] text-ink-muted">{task.title}</p>

                      <p className="mt-1 text-[12px] text-ink-faint">
                        Submitted by {task.submittedBy} on {formatDate(task.submittedOn)} · {task.department}
                      </p>

                      {task.flag ? (
                        <p className="mt-1.5 flex items-center gap-1.5 text-[12px] text-critical">
                          <TriangleAlert size={12} aria-hidden />
                          {task.flag}
                        </p>
                      ) : null}
                    </div>

                    <div className="text-right">
                      {task.amount !== null ? (
                        <p className="text-[14px] font-semibold text-ink tabular">
                          {formatMoney(task.amount, task.currency)}
                        </p>
                      ) : null}
                      <p className="mt-0.5 text-[11.5px] text-ink-faint">
                        Stage {task.stageIndex} of {task.stageCount} · {task.stage}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setSelected(task);
                          setRemarks('');
                        }}
                      >
                        Review
                      </Button>
                      {mayApprove ? (
                        <Button
                          size="sm"
                          variant="primary"
                          icon={Check}
                          onClick={() => {
                            setSelected(task);
                            setRemarks('');
                          }}
                        >
                          Decide
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <Drawer
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected ? `${selected.entityCode}` : ''}
        description={selected ? ENTITY_LABEL[selected.entityType] : ''}
        width="max-w-lg"
        footer={
          mayApprove ? (
            <div className="flex flex-wrap justify-end gap-2">
              {selected?.entityType !== 'payment' && selected?.entityType !== 'amendment' ? <Button
                variant="secondary"
                icon={MessageSquare}
                loading={working === 'request_changes'}
                onClick={() => decide('request_changes')}
              >
                Request changes
              </Button> : null}
              {selected?.entityType !== 'payment' ? <Button variant="danger" icon={X} loading={working === 'reject'} onClick={() => decide('reject')}>
                Reject
              </Button> : null}
              <Button variant="primary" icon={Check} loading={working === 'approve'} disabled={selected?.entityType === 'invoice' && selected.matchStatus !== 'matched'} onClick={() => decide('approve')}>
                Approve
              </Button>
            </div>
          ) : (
            <p className="text-[12.5px] text-ink-faint">Your role cannot record a decision on this case.</p>
          )
        }
      >
        {selected ? (
          <div className="space-y-5 p-4">
            <div>
              <h3 className="text-[14px] font-medium text-ink">{selected.title}</h3>
              <Link
                to={ROUTE_FOR[selected.entityType](selected.entityId)}
                className="mt-1 inline-block text-[12.5px] text-brand hover:underline"
              >
                Open the full record
              </Link>
            </div>

            <dl className="grid grid-cols-2 gap-x-6 gap-y-3.5">
              {[
                { label: 'Submitted by', value: selected.submittedBy },
                { label: 'Submitted on', value: formatDate(selected.submittedOn) },
                { label: 'Department', value: selected.department },
                { label: 'Vendor', value: selected.vendor || 'Not assigned at this stage' },
                {
                  label: 'Amount',
                  value: selected.amount !== null ? formatMoney(selected.amount, selected.currency) : 'Not financial',
                },
                { label: 'Current stage', value: `${selected.stage}, ${selected.stageIndex} of ${selected.stageCount}` },
              ].map((row) => (
                <div key={row.label}>
                  <dt className="text-[11.5px] text-ink-faint">{row.label}</dt>
                  <dd className="mt-0.5 text-[13px] text-ink">{row.value}</dd>
                </div>
              ))}
            </dl>

            {selected.summary ? <div><p className="text-[11.5px] text-ink-faint">Supporting context</p><p className="mt-1 text-[13px] text-ink">{selected.summary}</p></div> : null}
            {selected.matchStatus ? <p className="text-[13px] text-ink">Three way match: <strong>{selected.matchStatus.replace(/_/g, ' ')}</strong></p> : null}
            {selected.changes.length ? <div><p className="text-[11.5px] text-ink-faint">Proposed changes</p><ul className="mt-1 space-y-1 text-[13px]">{selected.changes.map((change) => <li key={change.field}>{change.field}: {change.previous} → {change.updated}</li>)}</ul></div> : null}
            <p className="text-[12.5px] text-ink-muted">Supporting documents: {selected.supportingDocuments}. Open the full record to inspect evidence before deciding.</p>
            {selected.previousDecisions.length ? <div><p className="text-[11.5px] text-ink-faint">Previous decisions</p><ul className="mt-1 space-y-1 text-[13px]">{selected.previousDecisions.map((entry, index) => <li key={`${entry}-${index}`}>{entry}</li>)}</ul></div> : null}

            {selected.flag ? (
              <div className="flex items-start gap-2.5 rounded-md border border-critical-line bg-critical-tint px-3.5 py-3">
                <TriangleAlert size={15} className="mt-0.5 shrink-0 text-critical" aria-hidden />
                <div>
                  <p className="text-[12.5px] font-medium text-critical">Issue flagged on this case</p>
                  <p className="mt-0.5 text-[12.5px] text-ink-muted">{selected.flag}</p>
                </div>
              </div>
            ) : null}

            <div>
              <label htmlFor="decisionRemarks" className="field-label">
                Remarks
              </label>
              <Textarea
                id="decisionRemarks"
                rows={4}
                value={remarks}
                onChange={(event) => setRemarks(event.target.value)}
                placeholder="Your remarks are recorded against the case and cannot be edited afterwards."
              />
              <p className="field-hint">
                A rejection or a request for changes returns the case to {selected.submittedBy}.
              </p>
            </div>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
