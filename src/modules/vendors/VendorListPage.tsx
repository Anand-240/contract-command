import { useMemo, useState } from 'react';
import { Building2, Eye, Gauge, ShieldCheck, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/tables/DataTable';
import { CodeCell, DateCell } from '@/components/tables/cells';
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
import { CATEGORIES, COMPLIANCE_STATUS, optionsFrom, statusMeta } from '@/constants';
import { useAsync, useDebounced, useSession } from '@/hooks';
import { vendorService } from '@/services';
import { cn } from '@/utils';
import type { Vendor } from '@/types';

const RATING_BANDS = [
  { value: '85', label: 'Rated 85 and above' },
  { value: '70', label: 'Rated 70 and above' },
  { value: '55', label: 'Rated 55 and above' },
];

function certificationState(vendor: Vendor) {
  if (vendor.certifications.some((cert) => cert.status === 'expired')) {
    return { label: 'Certification lapsed', tone: 'critical' as const };
  }
  if (vendor.certifications.some((cert) => cert.status === 'expiring')) {
    return { label: 'Renewal due', tone: 'caution' as const };
  }
  return { label: 'Current', tone: 'positive' as const };
}

export function VendorListPage() {
  const { can } = useSession();
  const [search, setSearch] = useState('');
  const [complianceStatus, setCompliance] = useState('');
  const [category, setCategory] = useState('');
  const [minRating, setMinRating] = useState('');
  const [active, setActive] = useState('');
  const debounced = useDebounced(search);

  const { data, loading, error, refetch } = useAsync(
    () =>
      vendorService.list({
        search: debounced,
        complianceStatus,
        category,
        minRating: minRating ? Number(minRating) : undefined,
        active: (active || undefined) as 'true' | 'false' | undefined,
      }),
    [debounced, complianceStatus, category, minRating, active],
  );

  const activeFilters = [complianceStatus, category, minRating, active].filter(Boolean).length;

  const columns = useMemo<ColumnDef<Vendor, unknown>[]>(
    () => [
      {
        accessorKey: 'code',
        header: 'Vendor ID',
        cell: ({ row }) => <CodeCell code={row.original.code} to={`/app/vendors/${row.original.id}`} />,
      },
      {
        accessorKey: 'name',
        header: 'Vendor name',
        cell: ({ row }) => (
          <div className="min-w-0 max-w-xs">
            <p className="truncate text-[13.5px] text-ink">{row.original.name}</p>
            <p className="truncate text-[12px] text-ink-faint">{row.original.categories.join(', ')}</p>
          </div>
        ),
      },
      {
        accessorKey: 'complianceStatus',
        header: 'Compliance',
        cell: ({ row }) => <StatusBadge meta={statusMeta(COMPLIANCE_STATUS, row.original.complianceStatus)} size="sm" />,
      },
      {
        accessorKey: 'rating',
        header: 'Rating',
        cell: ({ row }) => (
          <span
            className={cn(
              'tabular text-[13.5px] font-medium',
              row.original.rating >= 85 ? 'text-positive' : row.original.rating >= 70 ? 'text-ink' : 'text-caution',
            )}
          >
            {row.original.rating}
            <span className="text-[11.5px] font-normal text-ink-faint">/100</span>
          </span>
        ),
      },
      {
        accessorKey: 'activeContracts',
        header: 'Active contracts',
        cell: ({ row }) => <span className="tabular">{row.original.activeContracts}</span>,
      },
      {
        id: 'certification',
        header: 'Certification',
        accessorFn: (row) => certificationState(row).label,
        cell: ({ row }) => <StatusBadge meta={certificationState(row.original)} size="sm" withDot={false} />,
      },
      {
        accessorKey: 'lastEvaluated',
        header: 'Last evaluated',
        cell: ({ row }) => <DateCell value={row.original.lastEvaluated} />,
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
                { label: 'View profile', icon: Eye, to: `/app/vendors/${row.original.id}` },
                ...(can('vendor.evaluate') ? [{ label: 'Record evaluation', icon: Gauge, to: `/app/vendors/${row.original.id}/evaluate` }] : []),
                ...(can('vendor.manage') ? [{ label: 'Review compliance', icon: ShieldCheck, to: `/app/vendors/${row.original.id}/edit` }] : []),
              ]}
            />
          </div>
        ),
      },
    ],
    [can],
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Vendors"
        description="Registered suppliers with their compliance standing, certification currency and performance rating."
        actions={can('vendor.manage') ? <Link to="/app/vendors/new"><Button variant="primary" icon={Plus}>Register vendor</Button></Link> : null}
      />

      <Panel flush>
        <FilterBar
          activeCount={activeFilters}
          onReset={() => {
            setCompliance('');
            setCategory('');
            setMinRating('');
            setActive('');
          }}
        >
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by vendor id or name"
            className="w-full sm:w-64"
          />
          <Select
            value={complianceStatus}
            onChange={(event) => setCompliance(event.target.value)}
            options={optionsFrom(COMPLIANCE_STATUS)}
            placeholder="All compliance states"
            aria-label="Filter by compliance"
            className="w-48"
          />
          <Select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            options={CATEGORIES.map((value) => ({ value, label: value }))}
            placeholder="All categories"
            aria-label="Filter by category"
            className="w-48"
          />
          <Select
            value={minRating}
            onChange={(event) => setMinRating(event.target.value)}
            options={RATING_BANDS}
            placeholder="Any rating"
            aria-label="Filter by rating"
            className="w-44"
          />
          <Select
            value={active}
            onChange={(event) => setActive(event.target.value)}
            options={[
              { value: 'true', label: 'Active only' },
              { value: 'false', label: 'Inactive only' },
            ]}
            placeholder="Active and inactive"
            aria-label="Filter by registration state"
            className="w-44"
          />
        </FilterBar>

        {error ? (
          <ErrorState onRetry={refetch} />
        ) : (
          <DataTable
            data={data ?? []}
            columns={columns}
            loading={loading}
            rowHref={(row) => `/app/vendors/${row.id}`}
            initialSort={[{ id: 'rating', desc: true }]}
            empty={
              <EmptyState
                icon={Building2}
                title={activeFilters || search ? 'No vendors match these filters' : 'No vendors registered'}
                description={
                  activeFilters || search
                    ? 'Adjust or clear the filters to widen the search.'
                    : 'Register a supplier to hold its compliance documents and performance record.'
                }
              />
            }
          />
        )}
      </Panel>
    </div>
  );
}
