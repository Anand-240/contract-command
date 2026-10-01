import { downloadCsv } from '@/utils/exportCsv';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, Eye, FileText, GitBranch, Plus } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/tables/DataTable';
import { CodeCell, MoneyCell, TitleCell } from '@/components/tables/cells';
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
import { CONTRACT_STATUS, optionsFrom, statusMeta } from '@/constants';
import { useAsync, useDebounced, useLookup, useSession } from '@/hooks';
import { contractService } from '@/services';
import { vendorService } from '@/services/vendorService';
import { useAsync as useVendorAsync } from '@/hooks/useAsync';
import { cn, daysUntil, formatDate } from '@/utils';
import type { Contract } from '@/types';

const VALUE_BANDS = [
  { value: '10000000', label: 'Above 1 Cr' },
  { value: '50000000', label: 'Above 5 Cr' },
  { value: '100000000', label: 'Above 10 Cr' },
];

const EXPIRY_BANDS = [
  { value: '30', label: 'Within 30 days' },
  { value: '90', label: 'Within 90 days' },
  { value: '180', label: 'Within 180 days' },
];

export function ContractListPage() {
  const { data: vendorRows } = useVendorAsync(() => vendorService.list(), []);
  const vendors = vendorRows ?? [];
  const { can } = useSession();
  const { vendorName } = useLookup();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [minValue, setMinValue] = useState('');
  const [expiring, setExpiring] = useState('');
  const debounced = useDebounced(search);

  const { data, loading, error, refetch } = useAsync(
    () =>
      contractService.list({
        search: debounced,
        status,
        vendorId,
        minValue: minValue ? Number(minValue) : undefined,
        expiringWithinDays: expiring ? Number(expiring) : undefined,
      }),
    [debounced, status, vendorId, minValue, expiring],
  );

  const activeFilters = [status, vendorId, minValue, expiring].filter(Boolean).length;

  const columns = useMemo<ColumnDef<Contract, unknown>[]>(
    () => [
      {
        accessorKey: 'code',
        header: 'Contract ID',
        cell: ({ row }) => (
          <div className="whitespace-nowrap">
            <CodeCell code={row.original.code} to={`/app/contracts/${row.original.id}`} />
            {/* Version sits with the identifier rather than taking a column of its own. */}
            <p className="code text-[11px] text-ink-faint">Version {row.original.version}</p>
          </div>
        ),
      },
      {
        accessorKey: 'title',
        header: 'Contract title',
        cell: ({ row }) => <TitleCell title={row.original.title} subtitle={row.original.category} />,
      },
      {
        id: 'vendor',
        header: 'Vendor',
        accessorFn: (row) => vendorName(row.vendorId),
        cell: ({ row }) => (
          <Link
            to={`/app/vendors/${row.original.vendorId}`}
            className="block max-w-44 truncate text-[13.5px] hover:text-brand hover:underline"
            onClick={(event) => event.stopPropagation()}
            title={vendorName(row.original.vendorId)}
          >
            {vendorName(row.original.vendorId)}
          </Link>
        ),
      },
      {
        accessorKey: 'value',
        header: 'Value',
        cell: ({ row }) => <MoneyCell value={row.original.value} currency={row.original.currency} />,
      },
      {
        // Start and end read as one fact, so they share a column and the table
        // stays within the viewport without a horizontal scroll.
        accessorKey: 'endDate',
        header: 'Period',
        cell: ({ row }) => {
          const days = daysUntil(row.original.endDate);
          const live = ['active', 'amended'].includes(row.original.status);
          return (
            <div className="whitespace-nowrap">
              <p className="tabular text-[13px] text-ink">
                {formatDate(row.original.startDate)}
                <span className="px-1 text-ink-faint">to</span>
                {formatDate(row.original.endDate)}
              </p>
              {live && days >= 0 && days <= 90 ? (
                <p className={cn('text-[11.5px]', days <= 30 ? 'text-caution' : 'text-ink-faint')}>
                  {days} days remaining
                </p>
              ) : null}
            </div>
          );
        },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge meta={statusMeta(CONTRACT_STATUS, row.original.status)} size="sm" />,
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
                { label: 'View contract', icon: Eye, to: `/app/contracts/${row.original.id}` },
                ...(can('contract.amend') && ['active', 'amended'].includes(row.original.status) ? [{ label: 'Raise amendment', icon: GitBranch, to: `/app/contracts/${row.original.id}/amend` }] : []),
              ]}
            />
          </div>
        ),
      },
    ],
    [can, vendorName],
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Contracts"
        description="Concluded agreements with their amendment history, guarantees and linked purchase orders."
        actions={
          <>
            <Button variant="secondary" icon={Download} disabled={!data?.length} onClick={() => downloadCsv(data ?? [], 'contracts.csv')}>
              Export CSV
            </Button>
            {can('contract.create') ? (
              <Link to="/app/contracts/new">
                <Button variant="primary" icon={Plus}>
                  New contract
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
            setStatus('');
            setVendorId('');
            setMinValue('');
            setExpiring('');
          }}
        >
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by contract id or title"
            className="w-full sm:w-64"
          />
          <Select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            options={optionsFrom(CONTRACT_STATUS)}
            placeholder="All statuses"
            aria-label="Filter by status"
            className="w-40"
          />
          <Select
            value={vendorId}
            onChange={(event) => setVendorId(event.target.value)}
            options={vendors.map((vendor) => ({ value: vendor.id, label: vendor.name }))}
            placeholder="All vendors"
            aria-label="Filter by vendor"
            className="w-56"
          />
          <Select
            value={minValue}
            onChange={(event) => setMinValue(event.target.value)}
            options={VALUE_BANDS}
            placeholder="Any value"
            aria-label="Filter by contract value"
            className="w-36"
          />
          <Select
            value={expiring}
            onChange={(event) => setExpiring(event.target.value)}
            options={EXPIRY_BANDS}
            placeholder="Any expiry"
            aria-label="Filter by expiry"
            className="w-40"
          />
        </FilterBar>

        {error ? (
          <ErrorState onRetry={refetch} />
        ) : (
          <DataTable
            data={data ?? []}
            columns={columns}
            loading={loading}
            rowHref={(row) => `/app/contracts/${row.id}`}
            initialSort={[{ id: 'endDate', desc: false }]}
            empty={
              <EmptyState
                icon={FileText}
                title={activeFilters || search ? 'No contracts match these filters' : 'No contracts on record'}
                description={
                  activeFilters || search
                    ? 'Adjust or clear the filters to widen the search.'
                    : 'Conclude a procurement case to place the first contract on record.'
                }
              />
            }
          />
        )}
      </Panel>
    </div>
  );
}
