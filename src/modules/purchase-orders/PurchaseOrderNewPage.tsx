import { useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { Plus, Send, Trash2 } from 'lucide-react';
import { FormActions, FormSection, PageHeader } from '@/components/common';
import { Button, DateInput, Field, Input, Select, Textarea } from '@/components/ui';
import { TAX_RATES, UNITS } from '@/constants';
import { vendorService } from '@/services/vendorService';
import { contractService } from '@/services/contractService';
import { useAsync as useVendorAsync } from '@/hooks/useAsync';
import { useSession } from '@/hooks';
import { purchaseOrderService } from '@/services';
import { formatMoney } from '@/utils';

const itemSchema = z.object({
  name: z.string().min(2, 'Name the item'),
  description: z.string().optional(),
  quantity: z.coerce.number().positive('Quantity must be more than zero'),
  unit: z.string().min(1, 'Select a unit'),
  unitPrice: z.coerce.number().positive('Enter the contracted rate'),
  taxRate: z.coerce.number().min(0).max(28),
});

const schema = z
  .object({
    contractId: z.string().min(1, 'Select the parent contract'),
    orderDate: z.string().min(1, 'Select the order date'),
    expectedDelivery: z.string().min(1, 'Select the expected delivery date'),
    deliveryLocation: z.string().min(5, 'Record the consignee address'),
    notes: z.string().optional(),
    items: z.array(itemSchema).min(1, 'Add at least one line item'),
  })
  .refine((values) => values.expectedDelivery >= values.orderDate, {
    path: ['expectedDelivery'],
    message: 'Delivery cannot be expected before the order date',
  });

type FormValues = z.infer<typeof schema>;

const EMPTY_ITEM = { name: '', description: '', quantity: 1, unit: 'Nos', unitPrice: 0, taxRate: 18 };

export function PurchaseOrderNewPage() {
  const { data: vendorRows } = useVendorAsync(() => vendorService.list(), []);
  const vendors = vendorRows ?? [];
  const { data: contractRows } = useVendorAsync(() => contractService.list(), []);
  const contracts = contractRows ?? [];
  const navigate = useNavigate();
  const { user } = useSession();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { items: [EMPTY_ITEM] },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const items = watch('items');
  const contractId = watch('contractId');
  const contract = contracts.find((row) => row.id === contractId);
  const vendor = vendors.find((row) => row.id === contract?.vendorId);

  const lines = (items ?? []).map((item) => {
    const net = (Number(item?.quantity) || 0) * (Number(item?.unitPrice) || 0);
    const tax = (net * (Number(item?.taxRate) || 0)) / 100;
    return { net, tax, gross: net + tax };
  });
  const subtotal = lines.reduce((sum, line) => sum + line.net, 0);
  const taxTotal = lines.reduce((sum, line) => sum + line.tax, 0);

  const onSubmit = handleSubmit(async (values) => {
    if (!contract) return;
    setSaving(true);
    setSaveError('');
    try { const order = await purchaseOrderService.create({
      contractId: values.contractId,
      vendorId: contract.vendorId,
      orderDate: values.orderDate,
      expectedDelivery: values.expectedDelivery,
      deliveryLocation: values.deliveryLocation,
      notes: values.notes ?? '',
      owner: user.name,
      items: values.items.map((item) => ({
        name: item.name,
        description: item.description ?? '',
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unitPrice,
        taxRate: item.taxRate,
      })),
    });
    navigate(`/app/purchase-orders/${order.id}`);
    } catch (cause) { setSaveError(cause instanceof Error ? cause.message : 'Purchase order failed.'); setSaving(false); }
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="New Purchase Order"
        description="An order draws on an active contract. Rates must match the contracted rates, since the invoice is matched against both."
      />

      <form className="panel" noValidate>
        <FormSection title="General information" description="The contract the order draws on and where the stores are to be delivered.">
          <Field label="Contract" htmlFor="contractId" error={errors.contractId?.message} required>
            <Select
              id="contractId"
              options={contracts
                .filter((row) => ['active', 'amended'].includes(row.status))
                .map((row) => ({ value: row.id, label: `${row.code} ${row.title}` }))}
              placeholder="Select contract"
              invalid={!!errors.contractId}
              {...register('contractId')}
            />
          </Field>

          <Field label="Vendor" htmlFor="vendor" hint="Taken from the parent contract.">
            <Input id="vendor" value={vendor?.name ?? 'Select a contract first'} readOnly disabled />
          </Field>

          <Field label="Order date" htmlFor="orderDate" error={errors.orderDate?.message} required>
            <DateInput id="orderDate" invalid={!!errors.orderDate} {...register('orderDate')} />
          </Field>

          <Field label="Expected delivery" htmlFor="expectedDelivery" error={errors.expectedDelivery?.message} required>
            <DateInput id="expectedDelivery" invalid={!!errors.expectedDelivery} {...register('expectedDelivery')} />
          </Field>

          <Field
            label="Delivery location"
            htmlFor="deliveryLocation"
            error={errors.deliveryLocation?.message}
            required
            className="sm:col-span-2"
          >
            <Input
              id="deliveryLocation"
              placeholder="Consignee Stores, Avionics Depot, Bengaluru"
              invalid={!!errors.deliveryLocation}
              {...register('deliveryLocation')}
            />
          </Field>

          <Field label="Notes" htmlFor="notes" className="sm:col-span-2">
            <Textarea id="notes" rows={2} {...register('notes')} />
          </Field>
        </FormSection>

        <section className="border-b border-line px-5 py-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-[13.5px] font-semibold text-ink">Items</h2>
              <p className="mt-1 text-[12.5px] text-ink-faint">
                Line totals and tax are calculated as values are entered.
              </p>
            </div>
            <Button type="button" size="sm" variant="secondary" icon={Plus} onClick={() => append(EMPTY_ITEM)}>
              Add item
            </Button>
          </div>

          {errors.items?.message ? <p className="field-error">{errors.items.message}</p> : null}

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-3xl border-collapse text-left">
              <thead>
                <tr className="border-b border-line">
                  {['Item', 'Quantity', 'Unit', 'Unit price', 'Tax', 'Line total', ''].map((head, index) => (
                    <th
                      key={head || index}
                      scope="col"
                      className={`pb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-faint ${
                        index >= 1 && index <= 5 ? 'px-2 text-right' : index === 0 ? 'pr-2' : ''
                      }`}
                    >
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fields.map((field, index) => (
                  <tr key={field.id} className="border-b border-line align-top">
                    <td className="py-2.5 pr-2">
                      <Input
                        placeholder="Interface harness, MIL-DTL-38999"
                        aria-label={`Item ${index + 1} name`}
                        invalid={!!errors.items?.[index]?.name}
                        {...register(`items.${index}.name` as const)}
                      />
                      <Input
                        className="mt-1.5"
                        placeholder="Specification or drawing reference"
                        aria-label={`Item ${index + 1} description`}
                        {...register(`items.${index}.description` as const)}
                      />
                      {errors.items?.[index]?.name ? (
                        <p className="field-error">{errors.items[index]?.name?.message}</p>
                      ) : null}
                    </td>
                    <td className="w-24 px-2 py-2.5">
                      <Input
                        type="number"
                        min={1}
                        className="text-right tabular"
                        aria-label={`Item ${index + 1} quantity`}
                        invalid={!!errors.items?.[index]?.quantity}
                        {...register(`items.${index}.quantity` as const)}
                      />
                    </td>
                    <td className="w-24 px-2 py-2.5">
                      <Select
                        options={UNITS.map((value) => ({ value, label: value }))}
                        aria-label={`Item ${index + 1} unit`}
                        {...register(`items.${index}.unit` as const)}
                      />
                    </td>
                    <td className="w-36 px-2 py-2.5">
                      <Input
                        type="number"
                        min={0}
                        step={100}
                        className="text-right tabular"
                        aria-label={`Item ${index + 1} unit price`}
                        invalid={!!errors.items?.[index]?.unitPrice}
                        {...register(`items.${index}.unitPrice` as const)}
                      />
                    </td>
                    <td className="w-24 px-2 py-2.5">
                      <Select
                        options={TAX_RATES.map((value) => ({ value: String(value), label: `${value}%` }))}
                        aria-label={`Item ${index + 1} tax rate`}
                        {...register(`items.${index}.taxRate` as const)}
                      />
                    </td>
                    <td className="w-36 px-2 py-2.5 text-right">
                      <p className="pt-2 text-[13.5px] font-medium text-ink tabular">
                        {formatMoney(lines[index]?.gross ?? 0)}
                      </p>
                      <p className="text-[11px] text-ink-faint tabular">
                        {formatMoney(lines[index]?.net ?? 0)} plus tax
                      </p>
                    </td>
                    <td className="py-2.5 pl-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        icon={Trash2}
                        aria-label={`Remove item ${index + 1}`}
                        disabled={fields.length === 1}
                        onClick={() => remove(index)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <dl className="ml-auto mt-4 w-full max-w-xs space-y-1.5">
            <div className="flex justify-between text-[13px]">
              <dt className="text-ink-muted">Subtotal</dt>
              <dd className="text-ink tabular">{formatMoney(subtotal)}</dd>
            </div>
            <div className="flex justify-between text-[13px]">
              <dt className="text-ink-muted">Tax</dt>
              <dd className="text-ink tabular">{formatMoney(taxTotal)}</dd>
            </div>
            <div className="flex justify-between border-t border-line pt-1.5 text-[14px] font-semibold">
              <dt className="text-ink">Order total</dt>
              <dd className="text-ink tabular">{formatMoney(subtotal + taxTotal)}</dd>
            </div>
          </dl>
        </section>

        {saveError ? <p role="alert" className="px-5 text-critical">{saveError}</p> : null}
        <FormActions>
          <Button variant="ghost" type="button" onClick={() => navigate('/app/purchase-orders')}>
            Cancel
          </Button>
          <Button variant="primary" type="button" icon={Send} loading={saving} onClick={onSubmit}>
            Raise purchase order
          </Button>
        </FormActions>
      </form>
    </div>
  );
}
