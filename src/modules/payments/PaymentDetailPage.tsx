import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Check, TriangleAlert } from 'lucide-react';
import { AuditTimeline, DetailSection, EntityHeader, LifecycleProgress } from '@/components/common';
import { Button, ConfirmDialog, ErrorState, Panel, Skeleton, StatusBadge } from '@/components/ui';
import { PAYMENT_STATUS, statusMeta } from '@/constants';
import { useAsync, useLookup, useSession } from '@/hooks';
import { auditService, paymentService } from '@/services';
import { formatDate, formatMoney } from '@/utils';

export function PaymentDetailPage() {
  const { id = '' } = useParams();
  const { can } = useSession();
  const { vendorName } = useLookup();
  const [confirm, setConfirm] = useState(false);
  const [working, setWorking] = useState(false);
  const [reference, setReference] = useState('');
  const [actionError, setActionError] = useState('');

  const { data: payment, loading, error, refetch } = useAsync(() => paymentService.get(id), [id]);
  const { data: audit } = useAsync(() => auditService.forEntity(id), [id]);

  if (error) return <ErrorState title="This payment could not be loaded" onRetry={refetch} />;
  if (loading || !payment) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-32 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  const approve = async () => {
    setWorking(true);
    try { await paymentService.approve(payment.id); setConfirm(false); refetch(); }
    catch (cause) { setActionError(cause instanceof Error ? cause.message : 'Payment approval failed.'); }
    finally { setWorking(false); }
  };

  const progress = async (status: 'processing' | 'paid') => {
    try { await paymentService.transition(payment.id, status, reference); refetch(); }
    catch (cause) { setActionError(cause instanceof Error ? cause.message : 'Payment update failed.'); }
  };

  const stage = payment.status === 'paid' ? 8 : payment.status === 'awaiting_approval' ? 6 : 7;

  return (
    <div className="space-y-5">
      <EntityHeader
        code={payment.code}
        title={`Release to ${vendorName(payment.vendorId)}`}
        status={statusMeta(PAYMENT_STATUS, payment.status)}
        facts={[
          {
            label: 'Invoice',
            value: (
              <Link to={`/app/invoices/${payment.invoiceId}`} className="text-brand hover:underline">
                {payment.invoiceId}
              </Link>
            ),
          },
          {
            label: 'Purchase order',
            value: (
              <Link to={`/app/purchase-orders/${payment.poId}`} className="text-brand hover:underline">
                {payment.poId}
              </Link>
            ),
          },
          {
            label: 'Contract',
            value: (
              <Link to={`/app/contracts/${payment.contractId}`} className="text-brand hover:underline">
                {payment.contractId}
              </Link>
            ),
          },
          { label: 'Net payable', value: formatMoney(payment.netAmount, payment.currency), mono: true },
          { label: 'Approved on', value: formatDate(payment.approvedDate), mono: true },
          { label: 'Paid on', value: formatDate(payment.paymentDate), mono: true },
        ]}
        actions={
          can('payment.release') ? <div className="flex flex-wrap gap-2">
            {payment.status === 'awaiting_approval' ? <Button variant="primary" icon={Check} onClick={() => setConfirm(true)}>Approve release</Button> : null}
            {payment.status === 'approved' ? <Button variant="primary" onClick={() => progress('processing')}>Begin processing</Button> : null}
            {payment.status === 'processing' ? <><input aria-label="Bank reference" placeholder="Bank reference" value={reference} onChange={(event) => setReference(event.target.value)} className="rounded-md border border-line px-3 py-1" /><Button variant="primary" onClick={() => progress('paid')}>Mark paid</Button></> : null}
          </div> : null
        }
      />

      {actionError ? <p role="alert" className="text-critical">{actionError}</p> : null}
      {payment.status === 'failed' && payment.failureReason ? (
        <div className="flex items-start gap-2.5 rounded-lg border border-critical-line bg-critical-tint px-4 py-3">
          <TriangleAlert size={16} className="mt-0.5 shrink-0 text-critical" aria-hidden />
          <div>
            <p className="text-[13px] font-medium text-critical">The release failed at the bank</p>
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-muted">{payment.failureReason}</p>
          </div>
        </div>
      ) : null}

      <Panel title="Case position" description="Where this release stands in the procurement lifecycle">
        <LifecycleProgress current={stage} />
      </Panel>

      <div className="grid gap-5 xl:grid-cols-[1.3fr_1fr]">
        <Panel title="Payment particulars">
          <DetailSection
            rows={[
              { label: 'Gross amount', value: formatMoney(payment.amount, payment.currency), mono: true },
              { label: 'Deductions', value: formatMoney(payment.deductions, payment.currency), mono: true },
              { label: 'Net payable', value: formatMoney(payment.netAmount, payment.currency), mono: true },
              { label: 'Status', value: <StatusBadge meta={statusMeta(PAYMENT_STATUS, payment.status)} size="sm" /> },
              { label: 'Payment method', value: payment.method },
              { label: 'Beneficiary account', value: payment.bankAccount, mono: true },
              { label: 'Payment reference', value: payment.reference, mono: true },
              { label: 'Vendor', value: vendorName(payment.vendorId) },
            ]}
          />
        </Panel>

        <Panel title="Linked audit history" flush>
          <div className="p-4">
            <AuditTimeline entries={audit ?? []} />
          </div>
        </Panel>
      </div>

      <ConfirmDialog
        open={confirm}
        title="Approve payment release"
        description={`${formatMoney(payment.netAmount, payment.currency)} will be cleared for release to ${vendorName(payment.vendorId)}. The decision is recorded against ${payment.code}.`}
        confirmLabel="Approve release"
        loading={working}
        onConfirm={approve}
        onCancel={() => setConfirm(false)}
      />
    </div>
  );
}
