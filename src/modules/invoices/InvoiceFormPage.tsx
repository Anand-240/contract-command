import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/common';
import { Button, Field, Input, Panel, Select } from '@/components/ui';
import { useAsync, useSession } from '@/hooks';
import { invoiceService, purchaseOrderService } from '@/services';
import type { InvoiceLine } from '@/types';

export function InvoiceFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { can } = useSession();
  const { data: orders } = useAsync(() => purchaseOrderService.list(), []);
  const { data: existing } = useAsync(() => id ? invoiceService.get(id) : Promise.resolve(null), [id]);
  const [poId, setPoId] = useState('');
  const [number, setNumber] = useState('');
  const [submittedDate, setSubmittedDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState('');
  const [taxAmount, setTaxAmount] = useState(0);
  const [lines, setLines] = useState<InvoiceLine[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const order = orders?.find((row) => row.id === poId);
  useEffect(() => {
    if (!existing) return;
    setPoId(existing.poId); setNumber(existing.vendorInvoiceNumber); setSubmittedDate(existing.submittedDate); setDueDate(existing.dueDate); setTaxAmount(existing.taxAmount); setLines(existing.lines);
  }, [existing]);
  useEffect(() => {
    if (!order || existing) return;
    setLines(order.items.map((item) => ({ itemId: item.id, name: item.name, quantity: item.quantity, unit: item.unit, unitPrice: item.unitPrice, total: item.quantity * item.unitPrice })));
    setTaxAmount(order.items.reduce((total, item) => total + Math.round(item.quantity * item.unitPrice * item.taxRate) / 100, 0));
  }, [order, existing]);
  const changeLine = (index: number, key: 'quantity' | 'unitPrice', value: number) => setLines((current) => {
    const next = current.map((line, i) => i === index ? { ...line, [key]: value, total: (key === 'quantity' ? value : line.quantity) * (key === 'unitPrice' ? value : line.unitPrice) } : line);
    if (order) setTaxAmount(next.reduce((total, line) => {
      const rate = order.items.find((item) => item.id === line.itemId)?.taxRate ?? 0;
      return total + Math.round(line.quantity * line.unitPrice * rate) / 100;
    }, 0));
    return next;
  });
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setError('');
    try {
      if (id) await invoiceService.correct(id, { lines, taxAmount });
      else {
        const created = await invoiceService.create({ poId, vendorInvoiceNumber: number, submittedDate, dueDate, taxAmount, lines });
        navigate(`/app/invoices/${created.id}/match`); return;
      }
      navigate(`/app/invoices/${id}/match`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save invoice.'); setSaving(false); }
  };
  if (!can('invoice.create')) return <Panel title="Permission denied">Your role cannot record or correct invoices.</Panel>;
  return <div className="space-y-5"><PageHeader title={id ? 'Correct Invoice' : 'Record Invoice'} description="Enter the vendor claim against an order. The server calculates line totals and checks the delivery during matching." />
    <Panel><form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <Field label="Purchase order" htmlFor="invoice-po" required><Select id="invoice-po" value={poId} onChange={(event) => setPoId(event.target.value)} disabled={!!id} options={(orders ?? []).map((po) => ({ value: po.id, label: `${po.code} · ${po.deliveryLocation}` }))} placeholder="Select purchase order" /></Field>
      <Field label="Vendor invoice number" htmlFor="invoice-number" required><Input id="invoice-number" value={number} onChange={(event) => setNumber(event.target.value)} disabled={!!id} required /></Field>
      <Field label="Submitted on" htmlFor="invoice-date" required><Input id="invoice-date" type="date" value={submittedDate} onChange={(event) => setSubmittedDate(event.target.value)} disabled={!!id} required /></Field>
      <Field label="Due date" htmlFor="invoice-due" required><Input id="invoice-due" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} disabled={!!id} required /></Field>
      <div className="sm:col-span-2 border-t border-line pt-4 text-[13px] font-semibold">Claimed items</div>
      {lines.map((line, index) => <div key={line.itemId} className="grid gap-3 rounded-md border border-line p-3 sm:col-span-2 sm:grid-cols-3">
        <p className="text-[13px] font-medium">{line.name}</p>
        <Field label="Quantity" htmlFor={`invoice-qty-${index}`}><Input id={`invoice-qty-${index}`} type="number" min="0.01" step="0.01" value={line.quantity} onChange={(event) => changeLine(index, 'quantity', Number(event.target.value))} /></Field>
        <Field label="Unit price" htmlFor={`invoice-price-${index}`}><Input id={`invoice-price-${index}`} type="number" min="0" step="0.01" value={line.unitPrice} onChange={(event) => changeLine(index, 'unitPrice', Number(event.target.value))} /></Field>
      </div>)}
      <Field label="Tax amount" htmlFor="invoice-tax"><Input id="invoice-tax" type="number" min="0" step="0.01" value={taxAmount} onChange={(event) => setTaxAmount(Number(event.target.value))} /></Field>
      <p className="self-end text-[13px]">Claimed total: {(lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0) + taxAmount).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</p>
      {error ? <p role="alert" className="sm:col-span-2 text-critical">{error}</p> : null}
      <div className="flex gap-2 sm:col-span-2"><Button type="submit" variant="primary" loading={saving}>{id ? 'Save correction' : 'Record invoice'}</Button><Button type="button" variant="ghost" onClick={() => navigate('/app/invoices')}>Cancel</Button></div>
    </form></Panel></div>;
}
