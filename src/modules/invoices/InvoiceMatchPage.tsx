import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Check, RefreshCw, Send, Undo2, X } from 'lucide-react';
import { PageHeader } from '@/components/common';
import { Button, ConfirmDialog, ErrorState, Panel, Skeleton, StatusBadge, Textarea } from '@/components/ui';
import { MATCH_STATUS, statusMeta } from '@/constants';
import { useAsync, useLookup, useSession } from '@/hooks';
import { deliveryService, invoiceService, purchaseOrderService } from '@/services';
import { cn, formatDateTime, formatMoney, formatNumber } from '@/utils';
import type { MatchCheck } from '@/types';

/** One column of the comparison. Same shape for order, receipt and claim. */
function SourceColumn({
  label,
  reference,
  to,
  rows,
  emphasis,
}: {
  label: string;
  reference: string;
  to?: string;
  rows: { label: string; value: string }[];
  emphasis?: boolean;
}) {
  return (
    <div className={cn('rounded-md border bg-surface p-4', emphasis ? 'border-brand-line' : 'border-line')}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{label}</p>
      {to ? (
        <Link to={to} className="code mt-0.5 block text-[13px] font-medium text-brand hover:underline">
          {reference}
        </Link>
      ) : (
        <p className="code mt-0.5 text-[13px] font-medium text-ink">{reference}</p>
      )}
      <dl className="mt-3 space-y-2">
        {rows.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-3">
            <dt className="text-[12.5px] text-ink-muted">{row.label}</dt>
            <dd className="text-[13.5px] font-medium text-ink tabular">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function difference(check: MatchCheck): string | null {
  if (check.passed) return null;
  const delta = check.invoice - (check.unit === 'quantity' && check.delivery !== null ? check.delivery : check.po);
  const sign = delta > 0 ? '+' : '';
  return check.unit === 'quantity'
    ? `${sign}${formatNumber(delta)} units`
    : `${sign}${formatMoney(delta)}`;
}

export function InvoiceMatchPage() {
  const { id = '' } = useParams();
  const { can } = useSession();
  const { vendorName } = useLookup();
  const [remarks, setRemarks] = useState('');
  const [rerunning, setRerunning] = useState(false);
  const [confirm, setConfirm] = useState<'return' | 'approve' | null>(null);
  const [working, setWorking] = useState(false);
  const [actionError, setActionError] = useState('');

  const { data: invoice, loading, error, refetch } = useAsync(() => invoiceService.get(id), [id]);
  const { data: order } = useAsync(
    () => (invoice ? purchaseOrderService.get(invoice.poId) : Promise.resolve(null)),
    [invoice?.poId],
  );
  const { data: delivery } = useAsync(
    () => (invoice ? deliveryService.forPurchaseOrder(invoice.poId) : Promise.resolve(null)),
    [invoice?.poId],
  );

  if (error) return <ErrorState title="This invoice could not be loaded" onRetry={refetch} />;
  if (loading || !invoice) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-96 w-full rounded-lg" />
      </div>
    );
  }

  const failed = invoice.match.checks.filter((check) => !check.passed);
  const matched = invoice.match.status === 'matched';
  const pendingReview = invoice.match.status === 'awaiting_review';

  const rerun = async () => {
    setRerunning(true);
    setActionError('');
    try { await invoiceService.match(invoice.id); refetch(); }
    catch (cause) { setActionError(cause instanceof Error ? cause.message : 'Match failed.'); }
    finally { setRerunning(false); }
  };

  const act = async () => {
    if (!confirm) return;
    setWorking(true);
    setActionError('');
    try {
      if (confirm === 'return') await invoiceService.returnToVendor(invoice.id, remarks || 'Returned after match failure.');
      else await invoiceService.approve(invoice.id, remarks || 'Match verified. Cleared for approval.');
      setConfirm(null); refetch();
    } catch (cause) { setActionError(cause instanceof Error ? cause.message : 'Invoice action failed.'); }
    finally { setWorking(false); }
  };

  const acceptedTotal = delivery?.lines.reduce((sum, line) => sum + line.accepted, 0) ?? 0;
  const deliveredTotal = delivery?.lines.reduce((sum, line) => sum + line.delivered, 0) ?? 0;

  return (
    <div className="space-y-5">
      {actionError ? <p role="alert" className="text-critical">{actionError}</p> : null}
      <PageHeader
        title="Three Way Match"
        description={`Comparing purchase order, recorded receipt and vendor claim for ${invoice.code}.`}
        actions={
          <Link to={`/app/invoices/${invoice.id}`}>
            <Button variant="ghost" icon={ArrowLeft}>
              Back to invoice
            </Button>
          </Link>
        }
      />

      {/* Result. Stated in words first, with the reason, so the outcome does not rest on colour. */}
      <div
        className={cn(
          'rounded-lg border px-5 py-4',
          matched ? 'border-positive-line bg-positive-tint' : pendingReview ? 'border-caution-line bg-caution-tint' : 'border-critical-line bg-critical-tint',
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full',
                  matched ? 'bg-positive text-ink-invert' : pendingReview ? 'bg-caution text-ink-invert' : 'bg-critical text-ink-invert',
                )}
                aria-hidden
              >
                {matched ? <Check size={14} /> : <X size={14} />}
              </span>
              <h2
                className={cn(
                  'text-[16px] font-semibold',
                  matched ? 'text-positive' : pendingReview ? 'text-caution' : 'text-critical',
                )}
              >
                {matched ? 'Match successful' : pendingReview ? 'Match held for review' : 'Match failed'}
              </h2>
            </div>
            <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-ink-muted">
              {matched
                ? 'The order, the recorded receipt and the vendor claim agree on quantity, rate and value. The invoice can be sent for approval.'
                : pendingReview
                  ? 'The figures agree, but a manual assessment is outstanding before the invoice can proceed.'
                  : `${failed.length} of ${invoice.match.checks.length} checks did not pass. The invoice cannot proceed to approval until the variance is reconciled or the claim is corrected.`}
            </p>
            <p className="mt-2 text-[11.5px] text-ink-faint">
              Last run {formatDateTime(invoice.match.runOn)}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {can('invoice.match') ? <Button variant="secondary" icon={RefreshCw} loading={rerunning} onClick={rerun}>
              Re-run validation
            </Button> : null}
            {can('invoice.return') ? (
              <Button variant="danger" icon={Undo2} onClick={() => setConfirm('return')}>
                Return invoice
              </Button>
            ) : null}
            {can('approve.invoice') && invoice.approvalStatus === 'pending' ? (
              <Button variant="primary" icon={Send} disabled={!matched} onClick={() => setConfirm('approve')}>
                Approve invoice
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Sources */}
      <div className="grid gap-4 lg:grid-cols-3">
        <SourceColumn
          label="Purchase order"
          reference={invoice.poId}
          to={`/app/purchase-orders/${invoice.poId}`}
          rows={
            order
              ? [
                  { label: 'Line items', value: String(order.items.length) },
                  { label: 'Quantity ordered', value: formatNumber(order.items.reduce((sum, item) => sum + item.quantity, 0)) },
                  { label: 'Net value', value: formatMoney(order.subtotal, order.currency) },
                  { label: 'Total with tax', value: formatMoney(order.total, order.currency) },
                ]
              : [{ label: 'Loading', value: '' }]
          }
        />

        <SourceColumn
          label="Delivery"
          reference={delivery?.code ?? 'No receipt recorded'}
          to={delivery ? `/app/deliveries/${delivery.id}` : undefined}
          rows={
            delivery
              ? [
                  { label: 'Quantity delivered', value: formatNumber(deliveredTotal) },
                  { label: 'Quantity accepted', value: formatNumber(acceptedTotal) },
                  { label: 'Quantity rejected', value: formatNumber(delivery.lines.reduce((sum, line) => sum + line.rejected, 0)) },
                  { label: 'Inspection', value: delivery.inspectionStatus.replace(/_/g, ' ') },
                ]
              : [{ label: 'Receipt', value: 'Not recorded' }]
          }
        />

        <SourceColumn
          emphasis
          label="Invoice"
          reference={invoice.code}
          rows={[
            { label: 'Quantity claimed', value: formatNumber(invoice.lines.reduce((sum, line) => sum + line.quantity, 0)) },
            { label: 'Net value', value: formatMoney(invoice.amount, invoice.currency) },
            { label: 'Tax', value: formatMoney(invoice.taxAmount, invoice.currency) },
            { label: 'Total claimed', value: formatMoney(invoice.amount + invoice.taxAmount, invoice.currency) },
          ]}
        />
      </div>

      {/* Check by check */}
      <Panel
        title="Validation checks"
        description="Each check compares the same quantity or value across the three records."
        flush
        action={<StatusBadge meta={statusMeta(MATCH_STATUS, invoice.match.status)} />}
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-3xl text-left">
            <thead className="bg-surface-muted">
              <tr>
                {['Check', 'Order', 'Receipt', 'Invoice', 'Variance', 'Result'].map((head, index) => (
                  <th
                    key={head}
                    scope="col"
                    className={cn(
                      'px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-ink-faint',
                      index >= 1 && index <= 4 && 'text-right',
                    )}
                  >
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoice.match.checks.map((check) => {
                const format = (value: number) =>
                  check.unit === 'quantity' ? formatNumber(value) : formatMoney(value, invoice.currency);
                const delta = difference(check);

                return (
                  <tr key={check.id} className={cn('border-t border-line', !check.passed && 'bg-critical-tint/40')}>
                    <td className="px-4 py-3">
                      <p className="text-[13.5px] text-ink">{check.label}</p>
                      {check.note ? <p className="mt-0.5 text-[12px] text-ink-muted">{check.note}</p> : null}
                    </td>
                    <td className="px-4 py-3 text-right text-[13.5px] tabular">{format(check.po)}</td>
                    <td className="px-4 py-3 text-right text-[13.5px] tabular text-ink-muted">
                      {check.delivery === null ? <span className="text-ink-faint">Not applicable</span> : format(check.delivery)}
                    </td>
                    <td
                      className={cn(
                        'px-4 py-3 text-right text-[13.5px] tabular',
                        check.passed ? '' : 'font-semibold text-critical',
                      )}
                    >
                      {format(check.invoice)}
                    </td>
                    <td className="px-4 py-3 text-right text-[13.5px] tabular">
                      {delta ? <span className="font-medium text-critical">{delta}</span> : <span className="text-ink-faint">None</span>}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        meta={check.passed ? { label: 'Passed', tone: 'positive' } : { label: 'Failed', tone: 'critical' }}
                        size="sm"
                        withDot={false}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      {!matched ? (
        <Panel
          title="Remarks"
          description="Recorded against the invoice and visible to the approver and the vendor."
        >
          <Textarea
            rows={3}
            value={remarks}
            onChange={(event) => setRemarks(event.target.value)}
            placeholder={`Invoice quantity ${failed[0]?.invoice ?? ''} against an accepted quantity of ${failed[0]?.po ?? ''}. Vendor to raise a corrected claim.`}
            aria-label="Remarks on the match result"
          />
        </Panel>
      ) : null}

      <ConfirmDialog
        open={confirm !== null}
        title={confirm === 'return' ? 'Return invoice to vendor' : 'Send invoice for approval'}
        description={
          confirm === 'return'
            ? `${invoice.code} will be returned to ${vendorName(invoice.vendorId)} with your remarks, and the action is written to the audit trail.`
            : `${invoice.code} will move to the approval queue for financial concurrence.`
        }
        confirmLabel={confirm === 'return' ? 'Return invoice' : 'Send for approval'}
        tone={confirm === 'return' ? 'danger' : 'default'}
        loading={working}
        onConfirm={act}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
