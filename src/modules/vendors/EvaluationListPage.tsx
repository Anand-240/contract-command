import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Gauge } from 'lucide-react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/tables/DataTable';
import { CodeCell, DateCell } from '@/components/tables/cells';
import { PageHeader } from '@/components/common';
import { EmptyState, ErrorState, Panel } from '@/components/ui';
import { useAsync, useLookup } from '@/hooks';
import { vendorService } from '@/services';
import { cn } from '@/utils';
import type { VendorEvaluation } from '@/types';

function Score({ value }: { value: number }) {
  return (
    <span className={cn('tabular', value >= 85 ? 'text-positive' : value >= 70 ? 'text-ink' : 'text-caution')}>
      {value}
    </span>
  );
}

export function EvaluationListPage() {
  const { vendorName } = useLookup();
  const { data, loading, error, refetch } = useAsync(() => vendorService.allEvaluations(), []);

  const columns = useMemo<ColumnDef<VendorEvaluation, unknown>[]>(
    () => [
      {
        accessorKey: 'id',
        header: 'Evaluation',
        cell: ({ row }) => <CodeCell code={row.original.id} to={`/app/vendors/${row.original.vendorId}`} />,
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
          >
            {vendorName(row.original.vendorId)}
          </Link>
        ),
      },
      { accessorKey: 'period', header: 'Period' },
      { id: 'delivery', header: 'Delivery', accessorFn: (row) => row.scores.delivery, cell: ({ row }) => <Score value={row.original.scores.delivery} /> },
      { id: 'compliance', header: 'Compliance', accessorFn: (row) => row.scores.compliance, cell: ({ row }) => <Score value={row.original.scores.compliance} /> },
      { id: 'cost', header: 'Cost', accessorFn: (row) => row.scores.cost, cell: ({ row }) => <Score value={row.original.scores.cost} /> },
      { id: 'quality', header: 'Quality', accessorFn: (row) => row.scores.quality, cell: ({ row }) => <Score value={row.original.scores.quality} /> },
      {
        accessorKey: 'overall',
        header: 'Overall',
        cell: ({ row }) => <span className="text-[14px] font-semibold text-ink tabular">{row.original.overall}</span>,
      },
      { accessorKey: 'evaluator', header: 'Evaluator' },
      { accessorKey: 'evaluatedOn', header: 'Recorded', cell: ({ row }) => <DateCell value={row.original.evaluatedOn} /> },
    ],
    [vendorName],
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Vendor Evaluations"
        description="Quarterly scorecards across the supplier base. The overall rating carries into award decisions."
      />

      <Panel flush>
        {error ? (
          <ErrorState onRetry={refetch} />
        ) : (
          <DataTable
            data={data ?? []}
            columns={columns}
            loading={loading}
            rowHref={(row) => `/app/vendors/${row.vendorId}`}
            initialSort={[{ id: 'evaluatedOn', desc: true }]}
            empty={
              <EmptyState
                icon={Gauge}
                title="No evaluations recorded"
                description="Record an evaluation from a vendor profile to begin building the performance history."
              />
            }
          />
        )}
      </Panel>
    </div>
  );
}
