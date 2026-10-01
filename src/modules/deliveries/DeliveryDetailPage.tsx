import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Save, TriangleAlert } from 'lucide-react';
import { EntityHeader, FormActions, LifecycleProgress } from '@/components/common';
import {
  Button,
  DateInput,
  ErrorState,
  Field,
  Input,
  Panel,
  Select,
  Skeleton,
  Textarea,
} from '@/components/ui';
import { DELIVERY_STATUS, INSPECTION_STATUS, optionsFrom, statusMeta } from '@/constants';
import { useAsync, useLookup, useSession } from '@/hooks';
import { deliveryService, purchaseOrderService } from '@/services';
import { cn, formatDate } from '@/utils';
import type { InspectionStatus } from '@/types';

interface LineDraft {
  itemId: string;
  name: string;
  unit: string;
  ordered: number;
  delivered: number;
  accepted: number;
  rejected: number;
  remarks: string;
}

export function DeliveryDetailPage() {
  const { id = '' } = useParams();
  const { can } = useSession();
  const { vendorName } = useLookup();
  const [lines, setLines] = useState<LineDraft[]>([]);
  const [meta, setMeta] = useState({ deliveryDate: '', reference: '', receivedBy: '', notes: '' });
  const [inspection, setInspection] = useState<InspectionStatus>('pending');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const { data: delivery, loading, error, refetch } = useAsync(() => deliveryService.get(id), [id]);
  const { data: order } = useAsync(
    () => (delivery ? purchaseOrderService.get(delivery.poId) : Promise.resolve(null)),
    [delivery?.poId],
  );

  useEffect(() => {
    if (!delivery) return;
    setLines(delivery.lines.map((line) => ({ ...line })));
    setMeta({
      deliveryDate: delivery.deliveryDate,
      reference: delivery.reference,
      receivedBy: delivery.receivedBy,
      notes: delivery.notes,
    });
    setInspection(delivery.inspectionStatus);
  }, [delivery]);

  if (error) return <ErrorState title="This delivery could not be loaded" onRetry={refetch} />;
  if (loading || !delivery) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-32 w-full rounded-lg" />
        <Skeleton className="h-72 w-full rounded-lg" />
      </div>
    );
  }

  const editable = can('delivery.record');
  const setLine = (itemId: string, patch: Partial<LineDraft>) =>
    setLines((current) => current.map((line) => (line.itemId === itemId ? { ...line, ...patch } : line)));

  const problems = lines.filter(
    (line) => line.accepted + line.rejected > line.delivered || line.delivered > line.ordered,
  );

  const save = async () => {
    setSaving(true);
    setSaveError('');
    try { await deliveryService.record(delivery.id, {
      ...meta,
      inspectionStatus: inspection,
      lines: lines.map(({ itemId, delivered, accepted, rejected, remarks }) => ({
        itemId,
        delivered,
        accepted,
        rejected,
        remarks,
      })),
    });
    refetch();
    } catch (cause) { setSaveError(cause instanceof Error ? cause.message : 'Delivery could not be saved.'); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      {saveError ? <p role="alert" className="text-critical">{saveError}</p> : null}
      <EntityHeader
        code={delivery.code}
        title={`Receipt against ${delivery.poId}`}
        status={statusMeta(DELIVERY_STATUS, delivery.status)}
        secondaryStatus={statusMeta(INSPECTION_STATUS, delivery.inspectionStatus)}
        facts={[
          {
            label: 'Purchase order',
            value: (
              <Link to={`/app/purchase-orders/${delivery.poId}`} className="text-brand hover:underline">
                {delivery.poId}
              </Link>
            ),
          },
          {
            label: 'Vendor',
            value: (
              <Link to={`/app/vendors/${delivery.vendorId}`} className="text-brand hover:underline">
                {vendorName(delivery.vendorId)}
              </Link>
            ),
          },
          { label: 'Delivery date', value: formatDate(delivery.deliveryDate), mono: true },
          { label: 'Vendor reference', value: delivery.reference, mono: true },
          { label: 'Received by', value: delivery.receivedBy },
          {
            label: 'Expected by',
            value: order ? formatDate(order.expectedDelivery) : 'Loading',
            mono: true,
          },
        ]}
      />

      <Panel title="Case position" description="Where this consignment stands in the procurement lifecycle">
        <LifecycleProgress current={3} />
      </Panel>

      <Panel
        title="Receipt and inspection"
        description="Record what arrived, what passed inspection and what was rejected. The invoice is matched against the accepted quantity."
        flush
      >
        {problems.length > 0 ? (
          <div className="flex items-start gap-2.5 border-b border-critical-line bg-critical-tint px-4 py-3">
            <TriangleAlert size={15} className="mt-0.5 shrink-0 text-critical" aria-hidden />
            <p className="text-[12.5px] leading-relaxed text-ink-muted">
              Accepted and rejected quantities cannot exceed what was delivered, and delivery cannot
              exceed the ordered quantity. Correct{' '}
              {problems.map((line) => line.name).join(', ')} before saving.
            </p>
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <table className="w-full min-w-3xl text-left">
            <thead className="bg-surface-muted">
              <tr>
                {['Item', 'Ordered', 'Delivered', 'Accepted', 'Rejected', 'Remarks'].map((head, index) => (
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
              {lines.map((line) => (
                <tr key={line.itemId} className="border-t border-line align-top">
                  <td className="px-4 py-3">
                    <p className="text-[13.5px] text-ink">{line.name}</p>
                    <p className="text-[11.5px] text-ink-faint">Unit of issue: {line.unit}</p>
                  </td>
                  <td className="px-4 py-3 text-right text-[13.5px] tabular text-ink-muted">{line.ordered}</td>
                  {(['delivered', 'accepted', 'rejected'] as const).map((key) => (
                    <td key={key} className="w-28 px-2 py-2.5">
                      <Input
                        type="number"
                        min={0}
                        max={line.ordered}
                        value={line[key]}
                        disabled={!editable}
                        aria-label={`${line.name} ${key}`}
                        className="text-right tabular"
                        onChange={(event) => setLine(line.itemId, { [key]: Number(event.target.value) })}
                      />
                    </td>
                  ))}
                  <td className="px-4 py-2.5">
                    <Input
                      value={line.remarks}
                      disabled={!editable}
                      placeholder="Inspection note"
                      aria-label={`${line.name} remarks`}
                      onChange={(event) => setLine(line.itemId, { remarks: event.target.value })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid gap-4 border-t border-line px-4 py-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Delivery date" htmlFor="deliveryDate">
            <DateInput
              id="deliveryDate"
              value={meta.deliveryDate}
              disabled={!editable}
              onChange={(event) => setMeta((current) => ({ ...current, deliveryDate: event.target.value }))}
            />
          </Field>

          <Field label="Delivery reference" htmlFor="reference" hint="The vendor challan or despatch note number.">
            <Input
              id="reference"
              value={meta.reference}
              disabled={!editable}
              onChange={(event) => setMeta((current) => ({ ...current, reference: event.target.value }))}
            />
          </Field>

          <Field label="Received by" htmlFor="receivedBy">
            <Input
              id="receivedBy"
              value={meta.receivedBy}
              disabled={!editable}
              onChange={(event) => setMeta((current) => ({ ...current, receivedBy: event.target.value }))}
            />
          </Field>

          <Field label="Inspection status" htmlFor="inspection">
            <Select
              id="inspection"
              value={inspection}
              disabled={!editable}
              options={optionsFrom(INSPECTION_STATUS)}
              onChange={(event) => setInspection(event.target.value as InspectionStatus)}
            />
          </Field>

          <Field label="Notes" htmlFor="notes" className="sm:col-span-2 lg:col-span-4">
            <Textarea
              id="notes"
              rows={2}
              value={meta.notes}
              disabled={!editable}
              placeholder="Concessions, observations or correspondence references"
              onChange={(event) => setMeta((current) => ({ ...current, notes: event.target.value }))}
            />
          </Field>
        </div>

        {editable ? (
          <FormActions>
            <Button variant="ghost" onClick={() => refetch()}>
              Discard changes
            </Button>
            <Button variant="primary" icon={Save} loading={saving} disabled={problems.length > 0} onClick={save}>
              Save delivery record
            </Button>
          </FormActions>
        ) : (
          <p className="border-t border-line px-4 py-3 text-[12.5px] text-ink-faint">
            Your role has read access to this record. Recording a receipt requires the procurement or
            vendor management role.
          </p>
        )}
      </Panel>
    </div>
  );
}
