import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Receipt, Truck } from 'lucide-react';
import { AuditTimeline, DetailSection, EntityHeader, LifecycleProgress } from '@/components/common';
import { Button, EmptyState, ErrorState, Panel, Skeleton, StatusBadge, Tabs } from '@/components/ui';
import {
  canAccessPath,
  DELIVERY_STATUS,
  INSPECTION_STATUS,
  INVOICE_APPROVAL_STATUS,
  MATCH_STATUS,
  PO_INVOICE_STATUS,
  statusMeta,
} from '@/constants';
import { useAsync, useLookup, useSession } from '@/hooks';
import { auditService, deliveryService, invoiceService, purchaseOrderService } from '@/services';
import { formatDate, formatMoney } from '@/utils';

export function PurchaseOrderDetailPage() {
  const { id = '' } = useParams();
  const { can, role } = useSession();
  const maySeeInvoices = canAccessPath(role, '/app/invoices');
  const { vendorName } = useLookup();
  const [tab, setTab] = useState('overview');

  const { data: order, loading, error, refetch } = useAsync(() => purchaseOrderService.get(id), [id]);
  const { data: delivery } = useAsync(() => deliveryService.forPurchaseOrder(id), [id]);
  const { data: invoices } = useAsync(() => maySeeInvoices ? invoiceService.list({ poId: id }) : Promise.resolve([]), [id, maySeeInvoices]);
  const { data: audit } = useAsync(() => auditService.forEntity(id), [id]);

  if (error) return <ErrorState title="This purchase order could not be loaded" onRetry={refetch} />;
  if (loading || !order) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-32 w-full rounded-lg" />
        <Skeleton className="h-72 w-full rounded-lg" />
      </div>
    );
  }

  const stage = order.invoiceStatus !== 'not_invoiced' ? 4 : order.deliveryStatus === 'delivered' ? 3 : 2;

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'items', label: 'Items', count: order.items.length },
    { id: 'delivery', label: 'Delivery' },
    ...(maySeeInvoices ? [{ id: 'invoice', label: 'Invoice', count: invoices?.length ?? 0 }] : []),
    { id: 'audit', label: 'Audit' },
  ];

  return (
    <div className="space-y-5">
      <EntityHeader
        code={order.code}
        title={`Order against ${order.contractId}`}
        status={statusMeta(DELIVERY_STATUS, order.deliveryStatus)}
        secondaryStatus={statusMeta(PO_INVOICE_STATUS, order.invoiceStatus)}
        facts={[
          {
            label: 'Contract',
            value: (
              <Link to={`/app/contracts/${order.contractId}`} className="text-brand hover:underline">
                {order.contractId}
              </Link>
            ),
          },
          {
            label: 'Vendor',
            value: (
              <Link to={`/app/vendors/${order.vendorId}`} className="text-brand hover:underline">
                {vendorName(order.vendorId)}
              </Link>
            ),
          },
          { label: 'Order total', value: formatMoney(order.total, order.currency), mono: true },
          { label: 'Order date', value: formatDate(order.orderDate), mono: true },
          { label: 'Expected delivery', value: formatDate(order.expectedDelivery), mono: true },
          { label: 'Raised by', value: order.owner },
        ]}
        actions={
          <div className="flex gap-2">
          {can('invoice.create') && order.deliveryStatus === 'delivered' ? <Link to="/app/invoices/new"><Button variant="primary">Record invoice</Button></Link> : null}
          {can('delivery.record') && order.deliveryStatus !== 'delivered' ? (
            <Link to={delivery ? `/app/deliveries/${delivery.id}` : '/app/deliveries'}>
              <Button variant="primary" icon={Truck}>
                Record delivery
              </Button>
            </Link>
          ) : null}
          </div>
        }
      />

      <Panel title="Case position" description="Where this order stands in the procurement lifecycle">
        <LifecycleProgress current={stage} />
      </Panel>

      <Panel flush>
        <Tabs items={tabs} active={tab} onChange={setTab} className="px-2" />

        <div className="p-5">
          {tab === 'overview' ? (
            <div className="space-y-6">
              <DetailSection
                title="Order"
                rows={[
                  { label: 'Delivery location', value: order.deliveryLocation, wide: true },
                  { label: 'Subtotal', value: formatMoney(order.subtotal, order.currency), mono: true },
                  { label: 'Tax', value: formatMoney(order.taxTotal, order.currency), mono: true },
                  { label: 'Order total', value: formatMoney(order.total, order.currency), mono: true },
                  { label: 'Line items', value: String(order.items.length) },
                ]}
              />
              {order.notes ? (
                <div className="rounded-md border border-line bg-surface-muted px-4 py-3">
                  <p className="text-[12px] font-medium text-ink-faint">Note on the order</p>
                  <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">{order.notes}</p>
                </div>
              ) : null}
            </div>
          ) : null}

          {tab === 'items' ? (
            <div className="overflow-x-auto rounded-md border border-line">
              <table className="w-full text-left">
                <thead className="bg-surface-muted">
                  <tr>
                    {['Item', 'Quantity', 'Unit', 'Unit price', 'Tax', 'Line total'].map((head, index) => (
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
                  {order.items.map((item) => (
                    <tr key={item.id} className="border-t border-line">
                      <td className="px-4 py-2.5">
                        <p className="text-[13.5px] text-ink">{item.name}</p>
                        <p className="text-[12px] text-ink-faint">{item.description}</p>
                      </td>
                      <td className="px-4 py-2.5 text-right text-[13.5px] tabular">{item.quantity}</td>
                      <td className="px-4 py-2.5 text-right text-[13.5px]">{item.unit}</td>
                      <td className="px-4 py-2.5 text-right text-[13.5px] tabular">
                        {formatMoney(item.unitPrice, order.currency)}
                      </td>
                      <td className="px-4 py-2.5 text-right text-[13.5px] tabular">{item.taxRate}%</td>
                      <td className="px-4 py-2.5 text-right text-[13.5px] font-medium text-ink tabular">
                        {formatMoney(item.total, order.currency)}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t border-line bg-surface-muted">
                    <td colSpan={5} className="px-4 py-2.5 text-right text-[12.5px] font-medium text-ink-muted">
                      Order total including tax
                    </td>
                    <td className="px-4 py-2.5 text-right text-[13.5px] font-semibold text-ink tabular">
                      {formatMoney(order.total, order.currency)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : null}

          {tab === 'delivery' ? (
            !delivery ? (
              <EmptyState
                icon={Truck}
                title="No delivery recorded"
                description="When the consignment is received, record the quantities delivered, accepted and rejected against this order."
                action={
                  can('delivery.record') ? (
                    <Link to="/app/deliveries">
                      <Button variant="primary">Record delivery</Button>
                    </Link>
                  ) : null
                }
              />
            ) : (
              <div className="space-y-5">
                <DetailSection
                  columns={3}
                  rows={[
                    {
                      label: 'Delivery note',
                      value: (
                        <Link to={`/app/deliveries/${delivery.id}`} className="text-brand hover:underline">
                          {delivery.code}
                        </Link>
                      ),
                    },
                    { label: 'Delivery date', value: formatDate(delivery.deliveryDate) },
                    { label: 'Vendor reference', value: delivery.reference, mono: true },
                    { label: 'Received by', value: delivery.receivedBy },
                    { label: 'Inspection', value: <StatusBadge meta={statusMeta(INSPECTION_STATUS, delivery.inspectionStatus)} size="sm" /> },
                    { label: 'Status', value: <StatusBadge meta={statusMeta(DELIVERY_STATUS, delivery.status)} size="sm" /> },
                  ]}
                />
                <div className="overflow-x-auto rounded-md border border-line">
                  <table className="w-full text-left">
                    <thead className="bg-surface-muted">
                      <tr>
                        {['Item', 'Ordered', 'Delivered', 'Accepted', 'Rejected'].map((head, index) => (
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
                      {delivery.lines.map((line) => (
                        <tr key={line.itemId} className="border-t border-line">
                          <td className="px-4 py-2.5 text-[13.5px] text-ink">{line.name}</td>
                          <td className="px-4 py-2.5 text-right text-[13.5px] tabular">{line.ordered}</td>
                          <td className="px-4 py-2.5 text-right text-[13.5px] tabular">{line.delivered}</td>
                          <td className="px-4 py-2.5 text-right text-[13.5px] tabular">{line.accepted}</td>
                          <td className="px-4 py-2.5 text-right text-[13.5px] tabular">{line.rejected}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          ) : null}

          {tab === 'invoice' ? (
            !invoices || invoices.length === 0 ? (
              <EmptyState
                icon={Receipt}
                title="No invoice submitted"
                description="Invoices raised by the vendor against this order will be listed here with their match and approval state."
              />
            ) : (
              <ul className="divide-y divide-line">
                {invoices.map((invoice) => (
                  <li key={invoice.id} className="flex flex-wrap items-center gap-4 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <Link to={`/app/invoices/${invoice.id}`} className="code text-[13px] font-medium text-ink hover:text-brand">
                        {invoice.code}
                      </Link>
                      <p className="mt-0.5 text-[12px] text-ink-faint">
                        Vendor reference {invoice.vendorInvoiceNumber} · Submitted {formatDate(invoice.submittedDate)}
                      </p>
                    </div>
                    <span className="text-[13.5px] font-medium text-ink tabular">
                      {formatMoney(invoice.amount + invoice.taxAmount, invoice.currency)}
                    </span>
                    <StatusBadge meta={statusMeta(MATCH_STATUS, invoice.matchStatus)} size="sm" />
                    <StatusBadge meta={statusMeta(INVOICE_APPROVAL_STATUS, invoice.approvalStatus)} size="sm" withDot={false} />
                  </li>
                ))}
              </ul>
            )
          ) : null}

          {tab === 'audit' ? <AuditTimeline entries={audit ?? []} /> : null}
        </div>
      </Panel>
    </div>
  );
}
