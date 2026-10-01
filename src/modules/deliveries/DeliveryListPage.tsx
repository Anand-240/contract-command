import { useMemo, useState } from 'react';
import { Truck } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/tables/DataTable';
import { CodeCell, DateCell } from '@/components/tables/cells';
import { PageHeader } from '@/components/common';
import {
  EmptyState,
  ErrorState,
  FilterBar,
  Panel,
  SearchInput,
  Select,
  StatusBadge,
} from '@/components/ui';
import { DELIVERY_STATUS, INSPECTION_STATUS, optionsFrom, statusMeta } from '@/constants';
import { useAsync, useDebounced, useLookup } from '@/hooks';
import { deliveryService } from '@/services';
import type { Delivery } from '@/types';

export function DeliveryListPage() {
  const { vendorName } = useLookup();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [inspectionStatus, setInspection] = useState('');
  const debounced = useDebounced(search);

  const { data, loading, error, refetch } = useAsync(
    () => deliveryService.list({ search: debounced, status, inspectionStatus }),
    [debounced, status, inspectionStatus],
  );

  const activeFilters = [status, inspectionStatus].filter(Boolean).length;

  const columns = useMemo<ColumnDef<Delivery, unknown>[]>(
    () => [
      {
        accessorKey: 'code',
        header: 'Delivery note',
        cell: ({ row }) => <CodeCell code={row.original.code} to={`/app/deliveries/${row.original.id}`} />,
      },
      {
        accessorKey: 'poId',
        header: 'Purchase order',
        cell: ({ row }) => <CodeCell code={row.original.poId} to={`/app/purchase-orders/${row.original.poId}`} muted />,
      },
      {
        id: 'vendor',
        header: 'Vendor',
        accessorFn: (row) => vendorName(row.vendorId),
        cell: ({ row }) => <span className="block max-w-44 truncate text-[13.5px]" title={vendorName(row.original.vendorId)}>
            {vendorName(row.original.vendorId)}
          </span>,
      },
      {
        accessorKey: 'deliveryDate',
        header: 'Delivery date',
        cell: ({ row }) => <DateCell value={row.original.deliveryDate} />,
      },
      {
        accessorKey: 'reference',
        header: 'Vendor reference',
        cell: ({ row }) => <span className="code text-[12.5px]">{row.original.reference}</span>,
      },
      { accessorKey: 'receivedBy', header: 'Received by' },
      {
        id: 'quantities',
        header: 'Accepted',
        enableSorting: false,
        cell: ({ row }) => {
          const ordered = row.original.lines.reduce((sum, line) => sum + line.ordered, 0);
          const accepted = row.original.lines.reduce((sum, line) => sum + line.accepted, 0);
          return (
            <span className="tabular text-[13px]">
              {accepted} <span className="text-ink-faint">of {ordered}</span>
            </span>
          );
        },
      },
      {
        accessorKey: 'inspectionStatus',
        header: 'Inspection',
        cell: ({ row }) => <StatusBadge meta={statusMeta(INSPECTION_STATUS, row.original.inspectionStatus)} size="sm" />,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge meta={statusMeta(DELIVERY_STATUS, row.original.status)} size="sm" />,
      },
    ],
    [vendorName],
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Deliveries"
        description="Consignments received against purchase orders, with the quantities accepted at inspection."
      />

      <Panel flush>
        <FilterBar
          activeCount={activeFilters}
          onReset={() => {
            setStatus('');
            setInspection('');
          }}
        >
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by delivery note or order"
            className="w-full sm:w-64"
          />
          <Select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            options={optionsFrom(DELIVERY_STATUS)}
            placeholder="All delivery states"
            aria-label="Filter by delivery status"
            className="w-48"
          />
          <Select
            value={inspectionStatus}
            onChange={(event) => setInspection(event.target.value)}
            options={optionsFrom(INSPECTION_STATUS)}
            placeholder="All inspection states"
            aria-label="Filter by inspection status"
            className="w-52"
          />
        </FilterBar>

        {error ? (
          <ErrorState onRetry={refetch} />
        ) : (
          <DataTable
            data={data ?? []}
            columns={columns}
            loading={loading}
            rowHref={(row) => `/app/deliveries/${row.id}`}
            initialSort={[{ id: 'deliveryDate', desc: true }]}
            empty={
              <EmptyState
                icon={Truck}
                title={activeFilters || search ? 'No deliveries match these filters' : 'No deliveries recorded'}
                description={
                  activeFilters || search
                    ? 'Adjust or clear the filters to widen the search.'
                    : 'Record a consignment against a purchase order to open the receipt and inspection record.'
                }
              />
            }
          />
        )}
      </Panel>
    </div>
  );
}
