import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Check, Scale, TriangleAlert, Undo2 } from 'lucide-react';
import {
  ApprovalTimeline,
  AuditTimeline,
  DetailSection,
  EntityHeader,
  LifecycleProgress,
} from '@/components/common';
import { Button, ConfirmDialog, ErrorState, Panel, Skeleton, StatusBadge, Tabs, Textarea } from '@/components/ui';
import {
  canAccessPath,
  INVOICE_APPROVAL_STATUS,
  INVOICE_PAYMENT_STATUS,
  MATCH_STATUS,
  PAYMENT_STATUS,
  statusMeta,
} from '@/constants';
import { useAsync, useLookup, useSession } from '@/hooks';
import { auditService, invoiceService, paymentService } from '@/services';
import { formatDate, formatMoney } from '@/utils';

export function InvoiceDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [actionError, setActionError] = useState('');
  const { can, role } = useSession();
  const maySeePayments = canAccessPath(role, '/app/payments');
  const { vendorName } = useLookup();
  const [tab, setTab] = useState('details');
  const [remarks, setRemarks] = useState('');
  const [confirm, setConfirm] = useState<'approve' | 'return' | null>(null);
  const [working, setWorking] = useState(false);

  const { data: invoice, loading, error, refetch } = useAsync(() => invoiceService.get(id), [id]);
  const { data: payments } = useAsync(() => maySeePayments ? paymentService.list({ invoiceId: id }) : Promise.resolve([]), [id, maySeePayments]);
  const { data: audit } = useAsync(() => auditService.forEntity(id), [id]);

  if (error) return <ErrorState title="This invoice could not be loaded" onRetry={refetch} />;
  if (loading || !invoice) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-32 w-full rounded-lg" />
        <Skeleton className="h-72 w-full rounded-lg" />
      </div>
    );
  }

  const gross = invoice.amount + invoice.taxAmount;
  const deductions = invoice.deductions.reduce((sum, row) => sum + row.amount, 0);
  const payment = payments?.find((row) => row.invoiceId === invoice.id) ?? null;
  const blocked = invoice.matchStatus !== 'matched';
  const stage = invoice.paymentStatus === 'paid' ? 7 : invoice.approvalStatus === 'approved' ? 6 : blocked ? 5 : 5;

  const tabs = [
    { id: 'details', label: 'Invoice details' },
    { id: 'match', label: 'Three way match', count: invoice.match.checks.length },
    { id: 'approval', label: 'Approval', count: invoice.approvals.length },
    ...(maySeePayments ? [{ id: 'payment', label: 'Payment' }] : []),
    { id: 'audit', label: 'Audit' },
  ];

  const act = async () => {
    if (!confirm) return;
    setWorking(true);
    try {
      if (confirm === 'approve') await invoiceService.approve(invoice.id, remarks || 'Approved for payment.');
      else await invoiceService.returnToVendor(invoice.id, remarks || 'Returned to vendor.');
      setConfirm(null); refetch();
    } catch (cause) { setActionError(cause instanceof Error ? cause.message : 'Invoice action failed.'); }
    finally { setWorking(false); }
  };

  return (
    <div className="space-y-5">
      <EntityHeader
        code={invoice.code}
        title={`Claim from ${vendorName(invoice.vendorId)}`}
        status={statusMeta(MATCH_STATUS, invoice.matchStatus)}
        secondaryStatus={statusMeta(INVOICE_APPROVAL_STATUS, invoice.approvalStatus)}
        facts={[
          {
            label: 'Vendor',
            value: (
              <Link to={`/app/vendors/${invoice.vendorId}`} className="text-brand hover:underline">
                {vendorName(invoice.vendorId)}
              </Link>
            ),
          },
          {
            label: 'Purchase order',
            value: (
              <Link to={`/app/purchase-orders/${invoice.poId}`} className="text-brand hover:underline">
                {invoice.poId}
              </Link>
            ),
          },
          { label: 'Invoice amount', value: formatMoney(gross, invoice.currency), mono: true },
          { label: 'Submitted', value: formatDate(invoice.submittedDate), mono: true },
          { label: 'Due', value: formatDate(invoice.dueDate), mono: true },
          { label: 'Payment', value: <StatusBadge meta={statusMeta(INVOICE_PAYMENT_STATUS, invoice.paymentStatus)} size="sm" /> },
        ]}
        actions={
          <>
            <Link to={`/app/invoices/${invoice.id}/match`}>
              <Button variant="secondary" icon={Scale}>
                Open match
              </Button>
            </Link>
            {invoice.matchStatus === 'mismatch' && can('invoice.match') ? <Link to={`/app/invoices/${invoice.id}/correct`}><Button variant="secondary">Correct claim</Button></Link> : null}
            {invoice.approvalStatus === 'approved' && !payment && can('approve.payment') ? <Button variant="primary" onClick={async () => { try { const row = await paymentService.create(invoice.id, gross); navigate(`/app/payments/${row.id}`); } catch (cause) { setActionError(cause instanceof Error ? cause.message : 'Payment failed.'); } }}>Create payment</Button> : null}
            {can('invoice.return') && invoice.approvalStatus === 'pending' ? (
              <Button variant="danger" icon={Undo2} onClick={() => setConfirm('return')}>
                Return
              </Button>
            ) : null}
            {can('approve.invoice') && invoice.approvalStatus === 'pending' ? (
              <Button variant="primary" icon={Check} disabled={blocked} onClick={() => setConfirm('approve')}>
                Approve
              </Button>
            ) : null}
          </>
        }
      />

      {actionError ? <p role="alert" className="text-critical">{actionError}</p> : null}
      {blocked && invoice.matchStatus === 'mismatch' ? (
        <div className="flex flex-wrap items-start justify-between gap-4 rounded-lg border border-critical-line bg-critical-tint px-4 py-3">
          <div className="flex items-start gap-2.5">
            <TriangleAlert size={16} className="mt-0.5 shrink-0 text-critical" aria-hidden />
            <div>
              <p className="text-[13px] font-medium text-critical">This invoice cannot be approved</p>
              <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-muted">
                The three way match failed. Reconcile the variance with the vendor, or return the
                claim for correction, before approval is sought.
              </p>
            </div>
          </div>
          <Link to={`/app/invoices/${invoice.id}/match`}>
            <Button variant="secondary" size="sm">
              Review the variance
            </Button>
          </Link>
        </div>
      ) : null}

      <Panel title="Case position" description="Where this claim stands in the procurement lifecycle">
        <LifecycleProgress current={stage} blockedAt={blocked ? 5 : undefined} />
      </Panel>

      <Panel flush>
        <Tabs items={tabs} active={tab} onChange={setTab} className="px-2" />

        <div className="p-5">
          {tab === 'details' ? (
            <div className="space-y-6">
              <DetailSection
                title="Claim"
                columns={3}
                rows={[
                  { label: 'Vendor invoice number', value: invoice.vendorInvoiceNumber, mono: true },
                  { label: 'Contract', value: <Link to={`/app/contracts/${invoice.contractId}`} className="text-brand hover:underline">{invoice.contractId}</Link> },
                  { label: 'Submitted on', value: formatDate(invoice.submittedDate) },
                  { label: 'Net amount', value: formatMoney(invoice.amount, invoice.currency), mono: true },
                  { label: 'Tax', value: formatMoney(invoice.taxAmount, invoice.currency), mono: true },
                  { label: 'Gross claim', value: formatMoney(gross, invoice.currency), mono: true },
                ]}
              />

              <div className="overflow-x-auto rounded-md border border-line">
                <table className="w-full text-left">
                  <thead className="bg-surface-muted">
                    <tr>
                      {['Item', 'Quantity', 'Unit', 'Unit price', 'Line total'].map((head, index) => (
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
                    {invoice.lines.map((line) => (
                      <tr key={line.itemId} className="border-t border-line">
                        <td className="px-4 py-2.5 text-[13.5px] text-ink">{line.name}</td>
                        <td className="px-4 py-2.5 text-right text-[13.5px] tabular">{line.quantity}</td>
                        <td className="px-4 py-2.5 text-right text-[13.5px]">{line.unit}</td>
                        <td className="px-4 py-2.5 text-right text-[13.5px] tabular">
                          {formatMoney(line.unitPrice, invoice.currency)}
                        </td>
                        <td className="px-4 py-2.5 text-right text-[13.5px] font-medium text-ink tabular">
                          {formatMoney(line.total, invoice.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {invoice.deductions.length > 0 ? (
                <div>
                  <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-ink-faint">
                    Deductions and recoveries
                  </h3>
                  <ul className="divide-y divide-line rounded-md border border-line">
                    {invoice.deductions.map((deduction) => (
                      <li key={deduction.label} className="flex items-start justify-between gap-4 px-4 py-3">
                        <div className="min-w-0">
                          <p className="text-[13.5px] text-ink">{deduction.label}</p>
                          <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-muted">{deduction.reason}</p>
                        </div>
                        <span className="text-[13.5px] font-medium text-critical tabular">
                          {formatMoney(-deduction.amount, invoice.currency)}
                        </span>
                      </li>
                    ))}
                    <li className="flex items-center justify-between gap-4 bg-surface-muted px-4 py-2.5">
                      <span className="text-[13px] font-medium text-ink">Payable after deductions</span>
                      <span className="text-[14px] font-semibold text-ink tabular">
                        {formatMoney(gross - deductions, invoice.currency)}
                      </span>
                    </li>
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}

          {tab === 'match' ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <StatusBadge meta={statusMeta(MATCH_STATUS, invoice.match.status)} />
                <Link to={`/app/invoices/${invoice.id}/match`}>
                  <Button size="sm" variant="secondary" icon={Scale}>
                    Open full comparison
                  </Button>
                </Link>
              </div>
              <ul className="divide-y divide-line rounded-md border border-line">
                {invoice.match.checks.map((check) => (
                  <li key={check.id} className="flex flex-wrap items-center gap-4 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[13.5px] text-ink">{check.label}</p>
                      {check.note ? <p className="mt-0.5 text-[12px] text-ink-muted">{check.note}</p> : null}
                    </div>
                    <span className="text-[12.5px] text-ink-muted tabular">
                      Order {check.unit === 'currency' ? formatMoney(check.po, invoice.currency) : check.po}
                    </span>
                    <span className="text-[12.5px] text-ink tabular">
                      Claim {check.unit === 'currency' ? formatMoney(check.invoice, invoice.currency) : check.invoice}
                    </span>
                    <StatusBadge
                      meta={check.passed ? { label: 'Passed', tone: 'positive' } : { label: 'Failed', tone: 'critical' }}
                      size="sm"
                      withDot={false}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {tab === 'approval' ? (
            <div className="space-y-5">
              <ApprovalTimeline events={invoice.approvals} />
              {can('approve.invoice') && invoice.approvalStatus === 'pending' ? (
                <div className="rounded-md border border-line p-4">
                  <label htmlFor="approvalRemarks" className="field-label">
                    Remarks
                  </label>
                  <Textarea
                    id="approvalRemarks"
                    rows={3}
                    value={remarks}
                    onChange={(event) => setRemarks(event.target.value)}
                    placeholder="Recorded with your decision and retained in the audit trail."
                  />
                  <div className="mt-3 flex flex-wrap justify-end gap-2">
                    <Button variant="danger" icon={Undo2} onClick={() => setConfirm('return')}>
                      Return to vendor
                    </Button>
                    <Button variant="primary" icon={Check} disabled={blocked} onClick={() => setConfirm('approve')}>
                      Approve invoice
                    </Button>
                  </div>
                  {actionError ? <p role="alert" className="text-critical">{actionError}</p> : null}
      {blocked && invoice.matchStatus === 'mismatch' ? (
                    <p className="mt-2 text-right text-[12px] text-critical">
                      Approval is unavailable while the match is failing.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {tab === 'payment' ? (
            payment ? (
              <DetailSection
                columns={3}
                rows={[
                  { label: 'Payment', value: <Link to={`/app/payments/${payment.id}`} className="text-brand hover:underline">{payment.code}</Link> },
                  { label: 'Status', value: <StatusBadge meta={statusMeta(PAYMENT_STATUS, payment.status)} size="sm" /> },
                  { label: 'Net payable', value: formatMoney(payment.netAmount, payment.currency), mono: true },
                  { label: 'Approved on', value: formatDate(payment.approvedDate) },
                  { label: 'Paid on', value: formatDate(payment.paymentDate) },
                  { label: 'Reference', value: payment.reference, mono: true },
                ]}
              />
            ) : (
              <p className="text-[13px] text-ink-faint">
                No payment has been raised against this invoice. A payment is created once the invoice
                is approved.
              </p>
            )
          ) : null}

          {tab === 'audit' ? <AuditTimeline entries={audit ?? []} /> : null}
        </div>
      </Panel>

      <ConfirmDialog
        open={confirm !== null}
        title={confirm === 'approve' ? 'Approve invoice' : 'Return invoice to vendor'}
        description={
          confirm === 'approve'
            ? `${invoice.code} will be cleared for payment of ${formatMoney(gross - deductions, invoice.currency)}.`
            : `${invoice.code} will be returned to ${vendorName(invoice.vendorId)} with your remarks.`
        }
        confirmLabel={confirm === 'approve' ? 'Approve' : 'Return invoice'}
        tone={confirm === 'approve' ? 'default' : 'danger'}
        loading={working}
        onConfirm={act}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
