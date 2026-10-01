import { downloadCsv } from '@/utils/exportCsv';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, Lock, ScrollText } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/tables/DataTable';
import { PageHeader } from '@/components/common';
import {
  Button,
  DateInput,
  EmptyState,
  ErrorState,
  FilterBar,
  Panel,
  SearchInput,
  Select,
} from '@/components/ui';
import { ENTITY_LABEL } from '@/constants';
import { useAsync, useDebounced } from '@/hooks';
import { auditService } from '@/services';
import { formatDateTime } from '@/utils';
import type { AuditEntry, EntityType } from '@/types';

const ROUTE_FOR: Record<EntityType, (id: string) => string> = {
  procurement_plan: (id) => `/app/procurement/${id}`,
  contract: (id) => `/app/contracts/${id}`,
  purchase_order: (id) => `/app/purchase-orders/${id}`,
  invoice: (id) => `/app/invoices/${id}`,
  payment: (id) => `/app/payments/${id}`,
  vendor: (id) => `/app/vendors/${id}`,
  amendment: (id) => `/app/contracts/${id}`,
  delivery: (id) => `/app/deliveries/${id}`,
  vendor_evaluation: () => '/app/evaluations',
  user: () => '/app/settings',
};

export function AuditLogPage() {
  const [search, setSearch] = useState('');
  const [user, setUser] = useState('');
  const [role, setRole] = useState('');
  const [entityType, setEntityType] = useState('');
  const [action, setAction] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const debounced = useDebounced(search);

  const { data: facets } = useAsync(() => auditService.facets(), []);
  const { data, loading, error, refetch } = useAsync(
    () => auditService.list({ search: debounced, user, role, entityType, action, from, to }),
    [debounced, user, role, entityType, action, from, to],
  );

  const activeFilters = [user, role, entityType, action, from, to].filter(Boolean).length;

  const columns = useMemo<ColumnDef<AuditEntry, unknown>[]>(
    () => [
      {
        accessorKey: 'timestamp',
        header: 'Timestamp',
        cell: ({ row }) => (
          <span className="code whitespace-nowrap text-[12px] text-ink-muted">
            {formatDateTime(row.original.timestamp)}
          </span>
        ),
      },
      {
        accessorKey: 'user',
        header: 'User',
        cell: ({ row }) => <span className="text-[13px] text-ink">{row.original.user}</span>,
      },
      { accessorKey: 'role', header: 'Role' },
      {
        accessorKey: 'action',
        header: 'Action',
        cell: ({ row }) => (
          <div className="min-w-0 max-w-sm">
            <p className="text-[13.5px] text-ink">{row.original.action}</p>
            {row.original.detail ? (
              <p className="mt-0.5 truncate text-[12px] text-ink-faint" title={row.original.detail}>
                {row.original.detail}
              </p>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: 'entityType',
        header: 'Entity',
        cell: ({ row }) => <span className="text-[13px]">{ENTITY_LABEL[row.original.entityType] ?? row.original.entityType}</span>,
      },
      {
        accessorKey: 'entityCode',
        header: 'Entity ID',
        cell: ({ row }) => (
          <Link
            to={(ROUTE_FOR[row.original.entityType] ?? (() => '/app/audit'))(row.original.entityId)}
            className="code text-[12.5px] font-medium text-ink hover:text-brand hover:underline"
          >
            {row.original.entityCode}
          </Link>
        ),
      },
      {
        id: 'transition',
        header: 'State change',
        enableSorting: false,
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-[12.5px]">
            <span className="text-ink-muted">{row.original.previousState ?? 'New record'}</span>
            <span className="px-1.5 text-ink-faint">to</span>
            <span className="font-medium text-ink">{row.original.newState ?? 'Removed'}</span>
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Audit Log"
        description="Append only record of every create, edit and approval across the system."
        actions={
          <Button variant="secondary" icon={Download} disabled={!data?.length} onClick={() => downloadCsv(data ?? [], 'audit-log.csv')}>
            Export CSV for audit
          </Button>
        }
      />

      <div className="flex items-start gap-2.5 rounded-lg border border-line bg-surface-muted px-4 py-3">
        <Lock size={15} className="mt-0.5 shrink-0 text-ink-faint" aria-hidden />
        <p className="text-[12.5px] leading-relaxed text-ink-muted">
          Audit entries are written once and cannot be edited or removed by any role, including
          system administrators. Corrections are recorded as new entries against the same record.
        </p>
      </div>

      <Panel flush>
        <FilterBar
          activeCount={activeFilters}
          onReset={() => {
            setUser('');
            setRole('');
            setEntityType('');
            setAction('');
            setFrom('');
            setTo('');
          }}
        >
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search entries"
            className="w-full sm:w-56"
          />
          <Select
            value={user}
            onChange={(event) => setUser(event.target.value)}
            options={(facets?.users ?? []).map((value) => ({ value, label: value }))}
            placeholder="All users"
            aria-label="Filter by user"
            className="w-48"
          />
          <Select
            value={role}
            onChange={(event) => setRole(event.target.value)}
            options={(facets?.roles ?? []).map((value) => ({ value, label: value }))}
            placeholder="All roles"
            aria-label="Filter by role"
            className="w-44"
          />
          <Select
            value={entityType}
            onChange={(event) => setEntityType(event.target.value)}
            options={Object.entries(ENTITY_LABEL).map(([value, label]) => ({ value, label }))}
            placeholder="All entities"
            aria-label="Filter by entity"
            className="w-44"
          />
          <Select
            value={action}
            onChange={(event) => setAction(event.target.value)}
            options={(facets?.actions ?? []).map((value) => ({ value, label: value }))}
            placeholder="All actions"
            aria-label="Filter by action"
            className="w-52"
          />
          <div className="flex items-center gap-1.5">
            <DateInput
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              aria-label="From date"
              className="w-36"
            />
            <span className="text-[12px] text-ink-faint">to</span>
            <DateInput
              value={to}
              onChange={(event) => setTo(event.target.value)}
              aria-label="To date"
              className="w-36"
            />
          </div>
        </FilterBar>

        {error ? (
          <ErrorState onRetry={refetch} />
        ) : (
          <DataTable
            data={data ?? []}
            columns={columns}
            loading={loading}
            pageSize={15}
            empty={
              <EmptyState
                icon={ScrollText}
                title="No entries match these filters"
                description="Widen the date range or clear the filters to see more of the trail."
              />
            }
          />
        )}
      </Panel>
    </div>
  );
}
