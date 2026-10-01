import { downloadCsv } from '@/utils/exportCsv';
import { useMemo, useState } from 'react';
import { Banknote, Download } from 'lucide-react';
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
import { PAYMENT_STATUS, optionsFrom, statusMeta } from '@/constants';
import { useAsync, useDebounced, useLookup } from '@/hooks';
import { paymentService } from '@/services';
import { vendorService } from '@/services/vendorService';
import { useAsync as useVendorAsync } from '@/hooks/useAsync';
import type { Payment } from '@/types';

export function PaymentListPage() {
  const { data: vendorRows } = useVendorAsync(() => vendorService.list(), []);
  const vendors = vendorRows ?? [];
  const { vendorName } = useLookup();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [vendorId, setVendorId] = useState('');
  const debounced = useDebounced(search);

  const { data, loading, error, refetch } = useAsync(
    () => paymentService.list({ search: debounced, status, vendorId }),
    [debounced, status, vendorId],
  );

  const activeFilters = [status, vendorId].filter(Boolean).length;

  const columns = useMemo<ColumnDef<Payment, unknown>[]>(
    () => [
      {
        accessorKey: 'code',
        header: 'Payment ID',
        cell: ({ row }) => <CodeCell code={row.original.code} to={`/app/payments/${row.original.id}`} />,
      },
      {
        accessorKey: 'invoiceId',
        header: 'Invoice',
        cell: ({ row }) => <CodeCell code={row.original.invoiceId} to={`/app/invoices/${row.original.invoiceId}`} muted />,
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
        accessorKey: 'netAmount',
        header: 'Amount',
        cell: ({ row }) => (
          <div className="text-right sm:text-left">
            <MoneyCell value={row.original.netAmount} currency={row.original.currency} />
            {row.original.deductions > 0 ? (
              <p className="text-[11.5px] text-ink-faint tabular">
                after deductions of {row.original.deductions.toLocaleString('en-IN')}
              </p>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: 'approvedDate',
        header: 'Approved',
        cell: ({ row }) => <DateCell value={row.original.approvedDate} />,
      },
      {
        accessorKey: 'paymentDate',
        header: 'Paid',
        cell: ({ row }) => <DateCell value={row.original.paymentDate} />,
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge meta={statusMeta(PAYMENT_STATUS, row.original.status)} size="sm" />,
      },
      {
        accessorKey: 'reference',
        header: 'Reference',
        cell: ({ row }) => <span className="code text-[12px] text-ink-muted">{row.original.reference}</span>,
      },
    ],
    [vendorName],
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Payments"
        description="Releases against approved invoices, with the banking reference recorded for reconciliation."
        actions={
          <Button variant="secondary" icon={Download} disabled={!data?.length} onClick={() => downloadCsv(data ?? [], 'payments.csv')}>
            Export CSV
          </Button>
        }
      />

      <Panel flush>
        <FilterBar
          activeCount={activeFilters}
          onReset={() => {
            setStatus('');
            setVendorId('');
          }}
        >
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by payment, invoice or reference"
            className="w-full sm:w-72"
          />
          <Select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            options={optionsFrom(PAYMENT_STATUS)}
            placeholder="All statuses"
            aria-label="Filter by payment status"
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
            rowHref={(row) => `/app/payments/${row.id}`}
            initialSort={[{ id: 'approvedDate', desc: true }]}
            empty={
              <EmptyState
                icon={Banknote}
                title={activeFilters || search ? 'No payments match these filters' : 'No payments raised'}
                description={
                  activeFilters || search
                    ? 'Adjust or clear the filters to widen the search.'
                    : 'Payments are created once an invoice clears the three way match and is approved.'
                }
              />
            }
          />
        )}
      </Panel>
    </div>
  );
}
