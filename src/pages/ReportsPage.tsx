import { useState } from 'react';
import { Download } from 'lucide-react';
import { PageHeader } from '@/components/common';
import { Button, EmptyState, ErrorState, Input, Panel, Select, Skeleton } from '@/components/ui';
import { DEPARTMENTS } from '@/constants';
import { useAsync } from '@/hooks';
import { vendorService } from '@/services/vendorService';
import { reportService } from '@/services/reportService';
import { formatMoney } from '@/utils';

const reports = [
  ['contract-spend', 'Contract spend'], ['budget-utilisation', 'Budget utilisation'], ['vendor-performance', 'Vendor performance'],
  ['invoice-processing', 'Invoice processing'], ['payment-status', 'Payment status'], ['pending-approvals', 'Pending approvals'], ['contract-expiry', 'Contract expiry'],
];
export function ReportsPage() {
  const [report, setReport] = useState(reports[0]![0]);
  const [department, setDepartment] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const { data: vendors } = useAsync(() => vendorService.list(), []);
  const { data, loading, error, refetch } = useAsync(() => reportService.load({ report, department, vendorId, from, to }), [report, department, vendorId, from, to]);
  const exportCsv = () => {
    if (!data) return;
    const csv = [['Reference', 'Name', 'Status', 'Value', 'Date'], ...data.rows.map((row) => [row.reference, row.name, row.status, String(row.value), row.date])].map((row) => row.map((cell) => `"${(/^[\s]*[=+\-@]/.test(cell) ? `'${cell}` : cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = `${report}.csv`; link.click(); URL.revokeObjectURL(url);
  };
  return <div className="space-y-5"><PageHeader title="Reports" description="Live summaries from procurement, supplier, invoice and payment records." actions={<Button variant="secondary" icon={Download} disabled={!data?.rows.length} onClick={exportCsv}>Export CSV</Button>} />
    <Panel><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <Select aria-label="Report" value={report} onChange={(event) => setReport(event.target.value)} options={reports.map(([value, label]) => ({ value, label }))} />
      <Select aria-label="Department" value={department} onChange={(event) => setDepartment(event.target.value)} options={DEPARTMENTS.map((value) => ({ value, label: value }))} placeholder="All departments" />
      <Select aria-label="Vendor" value={vendorId} onChange={(event) => setVendorId(event.target.value)} options={(vendors ?? []).map((row) => ({ value: row.id, label: row.name }))} placeholder="All vendors" />
      <Input aria-label="From date" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
      <Input aria-label="To date" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
    </div></Panel>
    <Panel title={reports.find(([key]) => key === report)?.[1] ?? 'Report'} description={data ? `${data.count} records · total ${formatMoney(data.total)}` : 'Loading current records'}>
      {loading ? <Skeleton className="h-48 w-full" /> : error ? <ErrorState title="Report could not be loaded" onRetry={refetch} /> : !data?.rows.length ? <EmptyState title="No matching records" description="Adjust the filters or complete a workflow to populate this report." /> : <div className="overflow-x-auto"><table className="w-full text-left text-[13px]"><thead><tr className="border-b border-line text-ink-faint"><th className="py-2">Reference</th><th>Name</th><th>Status</th><th className="text-right">Value / score</th><th className="text-right">Date</th></tr></thead><tbody>{data.rows.map((row) => <tr key={row.reference} className="border-b border-line"><td className="py-2 font-mono">{row.reference}</td><td>{row.name}</td><td>{row.status.replace(/_/g, ' ')}</td><td className="text-right tabular">{report === 'vendor-performance' ? row.value.toFixed(1) : formatMoney(row.value)}</td><td className="text-right">{row.date}</td></tr>)}</tbody></table></div>}
    </Panel></div>;
}
