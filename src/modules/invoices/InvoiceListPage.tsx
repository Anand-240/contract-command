import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { Eye, Receipt, Scale, Plus } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/tables/DataTable';
import { CodeCell, DateCell, MoneyCell } from '@/components/tables/cells';
import { PageHeader } from '@/components/common';
import {
  Button,
  Dropdown,
  EmptyState,
  ErrorState,
  FilterBar,
  Panel,
  SearchInput,
  Select,
  StatusBadge,
} from '@/components/ui';
import {
  INVOICE_APPROVAL_STATUS,
  INVOICE_PAYMENT_STATUS,
  MATCH_STATUS,
  optionsFrom,
  statusMeta,
} from '@/constants';
import { useAsync, useDebounced, useLookup, useSession } from '@/hooks';
import { invoiceService } from '@/services';
import { vendorService } from '@/services/vendorService';
import { useAsync as useVendorAsync } from '@/hooks/useAsync';
import type { Invoice } from '@/types';

export function InvoiceListPage() {
  const { data: vendorRows } = useVendorAsync(() => vendorService.list(), []);
  const vendors = vendorRows ?? [];
  const { can } = useSession();
  const { vendorName } = useLookup();
  const [search, setSearch] = useState('');
  const [matchStatus, setMatchStatus] = useState('');
  const [approvalStatus, setApprovalStatus] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [vendorId, setVendorId] = useState('');
  const debounced = useDebounced(search);

  const { data, loading, error, refetch } = useAsync(
    () => invoiceService.list({ search: debounced, matchStatus, approvalStatus, paymentStatus, vendorId }),
    [debounced, matchStatus, approvalStatus, paymentStatus, vendorId],
  );

  const activeFilters = [matchStatus, approvalStatus, paymentStatus, vendorId].filter(Boolean).length;

  const columns = useMemo<ColumnDef<Invoice, unknown>[]>(
    () => [
      {
        accessorKey: 'code',
        header: 'Invoice ID',
        cell: ({ row }) => <CodeCell code={row.original.code} to={`/app/invoices/${row.original.id}`} />,
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
        id: 'amount',
        header: 'Amount',
        accessorFn: (row) => row.amount + row.taxAmount,
        cell: ({ row }) => (
          <MoneyCell value={row.original.amount + row.original.taxAmount} currency={row.original.currency} />
        ),
      },
      {
        accessorKey: 'submittedDate',
        header: 'Submitted',
        cell: ({ row }) => <DateCell value={row.original.submittedDate} />,
      },
      {
        accessorKey: 'matchStatus',
        header: 'Match',
        cell: ({ row }) => <StatusBadge meta={statusMeta(MATCH_STATUS, row.original.matchStatus)} size="sm" />,
      },
      {
        accessorKey: 'approvalStatus',
        header: 'Approval',
        cell: ({ row }) => <StatusBadge meta={statusMeta(INVOICE_APPROVAL_STATUS, row.original.approvalStatus)} size="sm" withDot={false} />,
      },
      {
        accessorKey: 'paymentStatus',
        header: 'Payment',
        cell: ({ row }) => <StatusBadge meta={statusMeta(INVOICE_PAYMENT_STATUS, row.original.paymentStatus)} size="sm" withDot={false} />,
      },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Dropdown
              label={`Actions for ${row.original.code}`}
              items={[
                { label: 'View invoice', icon: Eye, to: `/app/invoices/${row.original.id}` },
                {
                  label: 'Open three way match',
                  icon: Scale,
                  to: `/app/invoices/${row.original.id}/match`,
                },
              ]}
            />
          </div>
        ),
      },
    ],
    [can, vendorName],
  );

  const mismatches = (data ?? []).filter((row) => row.matchStatus === 'mismatch').length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Invoices"
        description="Vendor claims matched against the purchase order and the recorded receipt before any approval is sought."
        actions={can('invoice.create') ? <Link to="/app/invoices/new"><Button variant="primary" icon={Plus}>Record invoice</Button></Link> : null}
      />

      {mismatches > 0 ? (
        <button
          type="button"
          onClick={() => setMatchStatus('mismatch')}
          className="flex w-full items-start gap-2.5 rounded-lg border border-critical-line bg-critical-tint px-4 py-3 text-left transition-colors duration-150 hover:bg-critical-tint/70"
        >
          <div>
            <p className="text-[13px] font-medium text-critical">
              {mismatches} {mismatches === 1 ? 'invoice has' : 'invoices have'} failed the three way match
            </p>
            <p className="mt-0.5 text-[12.5px] text-ink-muted">
              These cannot proceed to approval until the variance is reconciled or the invoice is returned.
            </p>
          </div>
        </button>
      ) : null}

      <Panel flush>
        <FilterBar
          activeCount={activeFilters}
          onReset={() => {
            setMatchStatus('');
            setApprovalStatus('');
            setPaymentStatus('');
            setVendorId('');
          }}
        >
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by invoice, order or vendor reference"
            className="w-full sm:w-72"
          />
          <Select
            value={matchStatus}
            onChange={(event) => setMatchStatus(event.target.value)}
            options={optionsFrom(MATCH_STATUS)}
            placeholder="All match states"
            aria-label="Filter by match status"
            className="w-44"
          />
          <Select
            value={approvalStatus}
            onChange={(event) => setApprovalStatus(event.target.value)}
            options={optionsFrom(INVOICE_APPROVAL_STATUS)}
            placeholder="All approval states"
            aria-label="Filter by approval status"
            className="w-48"
          />
          <Select
            value={paymentStatus}
            onChange={(event) => setPaymentStatus(event.target.value)}
            options={optionsFrom(INVOICE_PAYMENT_STATUS)}
            placeholder="All payment states"
            aria-label="Filter by payment status"
            className="w-44"
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
            rowHref={(row) => `/app/invoices/${row.id}`}
            initialSort={[{ id: 'submittedDate', desc: true }]}
            empty={
              <EmptyState
                icon={Receipt}
                title={activeFilters || search ? 'No invoices match these filters' : 'No invoices submitted'}
                description={
                  activeFilters || search
                    ? 'Adjust or clear the filters to widen the search.'
                    : 'Invoices raised by vendors against purchase orders will appear here for matching.'
                }
              />
            }
          />
        )}
      </Panel>
    </div>
  );
}
