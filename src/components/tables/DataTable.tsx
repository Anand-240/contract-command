import { useState, type ReactNode } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Pagination } from '@/components/ui';
import { TableSkeleton } from '@/components/ui';
import { cn } from '@/utils';

export interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T, unknown>[];
  loading?: boolean;
  /** Rendered when there are no rows after filtering. */
  empty?: ReactNode;
  /** Row click target. Keyboard users reach the same record through the id link in the first column. */
  rowHref?: (row: T) => string;
  pageSize?: number;
  initialSort?: SortingState;
  className?: string;
}

export function DataTable<T>({
  data,
  columns,
  loading,
  empty,
  rowHref,
  pageSize = 10,
  initialSort = [],
  className,
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>(initialSort);
  const [page, setPage] = useState(1);
  const navigate = useNavigate();

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: (updater) => {
      setSorting(updater);
      setPage(1);
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const rows = table.getRowModel().rows;
  const visiblePage = Math.min(page, Math.max(1, Math.ceil(rows.length / pageSize)));
  const start = (visiblePage - 1) * pageSize;
  const visible = rows.slice(start, start + pageSize);

  if (loading) return <TableSkeleton rows={pageSize > 6 ? 6 : pageSize} columns={columns.length} />;
  if (rows.length === 0) return <>{empty}</>;

  return (
    <div className={className}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead className="sticky top-0 z-10 bg-surface-muted">
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {group.headers.map((header) => {
                  const sortable = header.column.getCanSort();
                  const direction = header.column.getIsSorted();
                  return (
                    <th
                      key={header.id}
                      scope="col"
                      aria-sort={direction === 'asc' ? 'ascending' : direction === 'desc' ? 'descending' : 'none'}
                      className="border-b border-line px-4 py-2.5 text-[11.5px] font-semibold uppercase tracking-wide text-ink-faint whitespace-nowrap"
                    >
                      {sortable ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="inline-flex items-center gap-1 transition-colors duration-150 hover:text-ink"
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {direction === 'asc' ? (
                            <ArrowUp size={12} aria-hidden />
                          ) : direction === 'desc' ? (
                            <ArrowDown size={12} aria-hidden />
                          ) : (
                            <ChevronsUpDown size={12} className="text-line-strong" aria-hidden />
                          )}
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr
                key={row.id}
                onClick={rowHref ? () => navigate(rowHref(row.original)) : undefined}
                className={cn(
                  'border-b border-line last:border-b-0 transition-colors duration-150',
                  rowHref && 'cursor-pointer hover:bg-surface-muted',
                )}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3 align-middle text-[13.5px] text-ink-muted">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > pageSize ? (
        <Pagination page={visiblePage} pageSize={pageSize} total={rows.length} onPageChange={setPage} />
      ) : (
        <div className="border-t border-line px-4 py-2.5 text-[12.5px] text-ink-faint tabular">
          {rows.length} {rows.length === 1 ? 'record' : 'records'}
        </div>
      )}
    </div>
  );
}
