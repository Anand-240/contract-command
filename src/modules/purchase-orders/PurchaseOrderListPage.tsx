import { downloadCsv } from '@/utils/exportCsv';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, Plus, ShoppingCart } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/tables/DataTable';
import { CodeCell, DateCell, MoneyCell } from '@/components/tables/cells';
import { PageHeader } from '@/components/common';
import {
  Button,
  EmptyState,
  ErrorState,
  FilterBar,
  Panel,
  SearchInput,
  Select,
  StatusBadge,
} from '@/components/ui';
import { DELIVERY_STATUS, PO_INVOICE_STATUS, optionsFrom, statusMeta } from '@/constants';
import { useAsync, useDebounced, useLookup, useSession } from '@/hooks';
import { purchaseOrderService } from '@/services';
import { vendorService } from '@/services/vendorService';
import { useAsync as useVendorAsync } from '@/hooks/useAsync';
import type { PurchaseOrder } from '@/types';

export function PurchaseOrderListPage() {
  const { data: vendorRows } = useVendorAsync(() => vendorService.list(), []);
  const vendors = vendorRows ?? [];
  const { can } = useSession();
  const { vendorName } = useLookup();
  const [search, setSearch] = useState('');
  const [deliveryStatus, setDeliveryStatus] = useState('');
  const [invoiceStatus, setInvoiceStatus] = useState('');
  const [vendorId, setVendorId] = useState('');
  const debounced = useDebounced(search);

  const { data, loading, error, refetch } = useAsync(
    () => purchaseOrderService.list({ search: debounced, deliveryStatus, invoiceStatus, vendorId }),
    [debounced, deliveryStatus, invoiceStatus, vendorId],
  );

  const activeFilters = [deliveryStatus, invoiceStatus, vendorId].filter(Boolean).length;

  const columns = useMemo<ColumnDef<PurchaseOrder, unknown>[]>(
    () => [
      {
        accessorKey: 'code',
        header: 'PO number',
        cell: ({ row }) => <CodeCell code={row.original.code} to={`/app/purchase-orders/${row.original.id}`} />,
      },
      {
        accessorKey: 'contractId',
        header: 'Contract',
        cell: ({ row }) => (
          <Link
            to={`/app/contracts/${row.original.contractId}`}
            className="code text-[12.5px] hover:text-brand hover:underline"
            onClick={(event) => event.stopPropagation()}
          >
            {row.original.contractId}
          </Link>
        ),
      },
      {
        id: 'vendor',
        header: 'Vendor',
        accessorFn: (row) => vendorName(row.vendorId),
        cell: ({ row }) => <span className="block max-w-44 truncate text-[13.5px]" title={vendorName(row.original.vendorId)}>
            {vendorName(row.original.vendorId)}
          </span>,
      },
      { accessorKey: 'orderDate', header: 'Order date', cell: ({ row }) => <DateCell value={row.original.orderDate} /> },
      {
        accessorKey: 'expectedDelivery',
        header: 'Expected delivery',
        cell: ({ row }) => <DateCell value={row.original.expectedDelivery} />,
      },
      {
        accessorKey: 'total',
        header: 'Total value',
        cell: ({ row }) => <MoneyCell value={row.original.total} currency={row.original.currency} />,
      },
      {
        accessorKey: 'deliveryStatus',
        header: 'Delivery',
        cell: ({ row }) => <StatusBadge meta={statusMeta(DELIVERY_STATUS, row.original.deliveryStatus)} size="sm" />,
      },
      {
        accessorKey: 'invoiceStatus',
        header: 'Invoice',
        cell: ({ row }) => <StatusBadge meta={statusMeta(PO_INVOICE_STATUS, row.original.invoiceStatus)} size="sm" withDot={false} />,
      },
    ],
    [vendorName],
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Purchase Orders"
        description="Orders placed against concluded contracts, with their delivery and billing position."
        actions={
          <>
            <Button variant="secondary" icon={Download} disabled={!data?.length} onClick={() => downloadCsv(data ?? [], 'purchase-orders.csv')}>
              Export CSV
            </Button>
            {can('po.create') ? (
              <Link to="/app/purchase-orders/new">
                <Button variant="primary" icon={Plus}>
                  New purchase order
                </Button>
              </Link>
            ) : null}
          </>
        }
      />

      <Panel flush>
        <FilterBar
          activeCount={activeFilters}
          onReset={() => {
            setDeliveryStatus('');
            setInvoiceStatus('');
            setVendorId('');
          }}
        >
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by order or contract"
            className="w-full sm:w-64"
          />
          <Select
            value={deliveryStatus}
            onChange={(event) => setDeliveryStatus(event.target.value)}
            options={optionsFrom(DELIVERY_STATUS)}
            placeholder="All delivery states"
            aria-label="Filter by delivery status"
            className="w-48"
          />
          <Select
            value={invoiceStatus}
            onChange={(event) => setInvoiceStatus(event.target.value)}
            options={optionsFrom(PO_INVOICE_STATUS)}
            placeholder="All invoice states"
            aria-label="Filter by invoice status"
            className="w-48"
          />
          <Select
            value={vendorId}
            onChange={(event) => setVendorId(event.target.value)}
            options={vendors.map((vendor) => ({ value: vendor.id, label: vendor.name }))}
            placeholder="All vendors"
            aria-label="Filter by vendor"
            className="w-56"
          />
        </FilterBar>

        {error ? (
          <ErrorState onRetry={refetch} />
        ) : (
          <DataTable
            data={data ?? []}
            columns={columns}
            loading={loading}
            rowHref={(row) => `/app/purchase-orders/${row.id}`}
            initialSort={[{ id: 'orderDate', desc: true }]}
            empty={
              <EmptyState
                icon={ShoppingCart}
                title={activeFilters || search ? 'No orders match these filters' : 'No purchase orders raised'}
                description={
                  activeFilters || search
                    ? 'Adjust or clear the filters to widen the search.'
                    : 'Raise an order against an active contract to begin the supply cycle.'
                }
                action={
                  can('po.create') ? (
                    <Link to="/app/purchase-orders/new">
                      <Button variant="primary" icon={Plus}>
                        Create purchase order
                      </Button>
                    </Link>
                  ) : null
                }
              />
            }
          />
        )}
      </Panel>
    </div>
  );
}
