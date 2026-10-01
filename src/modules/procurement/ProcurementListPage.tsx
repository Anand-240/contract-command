import { downloadCsv } from '@/utils/exportCsv';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Download, Eye, Plus, Send } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/tables/DataTable';
import { CodeCell, DateCell, MoneyCell, TitleCell } from '@/components/tables/cells';
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
import { DEPARTMENTS, PLAN_STATUS, PRIORITY, optionsFrom, statusMeta } from '@/constants';
import { useAsync, useDebounced, useSession } from '@/hooks';
import { procurementService } from '@/services';
import type { ProcurementPlan } from '@/types';

export function ProcurementListPage() {
  const { can } = useSession();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [department, setDepartment] = useState('');
  const [priority, setPriority] = useState('');
  const debounced = useDebounced(search);

  const { data, loading, error, refetch } = useAsync(
    () => procurementService.list({ search: debounced, status, department, priority }),
    [debounced, status, department, priority],
  );

  const activeFilters = [status, department, priority].filter(Boolean).length;

  const columns = useMemo<ColumnDef<ProcurementPlan, unknown>[]>(
    () => [
      {
        accessorKey: 'code',
        header: 'Plan ID',
        cell: ({ row }) => <CodeCell code={row.original.code} to={`/app/procurement/${row.original.id}`} />,
      },
      {
        accessorKey: 'title',
        header: 'Title',
        cell: ({ row }) => <TitleCell title={row.original.title} subtitle={row.original.category} />,
      },
      { accessorKey: 'department', header: 'Department' },
      {
        accessorKey: 'estimatedBudget',
        header: 'Estimated budget',
        cell: ({ row }) => <MoneyCell value={row.original.estimatedBudget} currency={row.original.currency} />,
      },
      {
        accessorKey: 'requiredDate',
        header: 'Required by',
        cell: ({ row }) => <DateCell value={row.original.requiredDate} />,
      },
      {
        accessorKey: 'status',
        header: 'Approval status',
        cell: ({ row }) => <StatusBadge meta={statusMeta(PLAN_STATUS, row.original.status)} size="sm" />,
      },
      { accessorKey: 'owner', header: 'Owner' },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Dropdown
              label={`Actions for ${row.original.code}`}
              items={[
                { label: 'View plan', icon: Eye, to: `/app/procurement/${row.original.id}` },
                ...(can('plan.submit') && row.original.status === 'draft' ? [{ label: 'Open to submit', icon: Send, to: `/app/procurement/${row.original.id}` }] : []),
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
        title="Procurement Plans"
        description="Annual acquisition cases from statement of case through to acceptance of necessity and conversion to contract."
        actions={
          <>
            <Button variant="secondary" icon={Download} disabled={!data?.length} onClick={() => downloadCsv(data ?? [], 'procurement-plans.csv')}>
              Export CSV
            </Button>
            {can('plan.create') ? (
              <Link to="/app/procurement/new">
                <Button variant="primary" icon={Plus}>
                  New procurement plan
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
            setDepartment('');
            setPriority('');
          }}
        >
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by plan id, title or owner"
            className="w-full sm:w-72"
          />
          <Select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            options={optionsFrom(PLAN_STATUS)}
            placeholder="All statuses"
            aria-label="Filter by status"
            className="w-44"
          />
          <Select
            value={department}
            onChange={(event) => setDepartment(event.target.value)}
            options={DEPARTMENTS.map((value) => ({ value, label: value }))}
            placeholder="All departments"
            aria-label="Filter by department"
            className="w-48"
          />
          <Select
            value={priority}
            onChange={(event) => setPriority(event.target.value)}
            options={optionsFrom(PRIORITY)}
            placeholder="Any priority"
            aria-label="Filter by priority"
            className="w-36"
          />
        </FilterBar>

        {error ? (
          <ErrorState onRetry={refetch} />
        ) : (
          <DataTable
            data={data ?? []}
            columns={columns}
            loading={loading}
            rowHref={(row) => `/app/procurement/${row.id}`}
            initialSort={[{ id: 'requiredDate', desc: false }]}
            empty={
              <EmptyState
                icon={ClipboardList}
                title={activeFilters || search ? 'No plans match these filters' : 'No procurement plans yet'}
                description={
                  activeFilters || search
                    ? 'Adjust or clear the filters to widen the search.'
                    : 'Create your first procurement plan to begin the acquisition process.'
                }
                action={
                  can('plan.create') ? (
                    <Link to="/app/procurement/new">
                      <Button variant="primary" icon={Plus}>
                        Create procurement plan
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
