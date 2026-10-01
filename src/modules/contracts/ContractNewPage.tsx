import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { Save, Send } from 'lucide-react';
import { DocumentUploader, FormActions, FormSection, PageHeader } from '@/components/common';
import { Button, DateInput, Field, Input, Select, Textarea } from '@/components/ui';
import { CATEGORIES, DEPARTMENTS } from '@/constants';
import { vendorService } from '@/services/vendorService';
import { procurementService } from '@/services/procurementService';
import { useAsync as useVendorAsync } from '@/hooks/useAsync';
import { formatMoney } from '@/utils';
import { contractService } from '@/services/contractService';

const schema = z
  .object({
    title: z.string().min(6, 'Give the contract a descriptive title'),
    vendorId: z.string().min(1, 'Select the awarded vendor'),
    planId: z.string().min(1, 'Select an approved procurement plan'),
    value: z.coerce.number().positive('Enter the concluded contract value'),
    startDate: z.string().min(1, 'Select the start date'),
    endDate: z.string().min(1, 'Select the end date'),
    department: z.string().min(1, 'Select the department'),
    category: z.string().min(1, 'Select the category'),
    scope: z.string().min(20, 'Record the scope of supply in at least 20 characters'),
    paymentTerms: z.string().min(5, 'Record the payment terms'),
    deliveryTerms: z.string().min(5, 'Record the delivery terms'),
    performanceGuarantee: z.string().optional(),
    liquidatedDamages: z.string().optional(),
  })
  .refine((values) => values.endDate > values.startDate, {
    path: ['endDate'],
    message: 'The end date must fall after the start date',
  });

type FormValues = z.infer<typeof schema>;

export function ContractNewPage() {
  const { data: vendorRows } = useVendorAsync(() => vendorService.list(), []);
  const vendors = vendorRows ?? [];
  const { data: planRows } = useVendorAsync(() => procurementService.list(), []);
  const procurementPlans = planRows ?? [];
  const navigate = useNavigate();
  const [saving, setSaving] = useState<'draft' | 'review' | null>(null);
  const [serverError, setServerError] = useState('');
  const [files, setFiles] = useState<File[]>([]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { value: 0 } });

  const value = watch('value');

  const save = (mode: 'draft' | 'review') =>
    handleSubmit(async (values) => {
      setSaving(mode); setServerError('');
      try {
        const contract = await contractService.create({ ...values, currency: 'INR' });
        for (const file of files) await contractService.uploadDocument(contract.id, file);
        if (mode === 'review') await contractService.transition(contract.id, 'under_review');
        navigate(`/app/contracts/${contract.id}`);
      } catch (error) { setServerError(error instanceof Error ? error.message : 'Could not save contract.'); setSaving(null); }
    });

  return (
    <div className="space-y-5">
      <PageHeader
        title="New Contract"
        description="Record a concluded agreement. Once placed on record the contract can only be changed through an amendment."
      />

      <form className="panel" noValidate>
        <FormSection title="Parties and reference" description="The vendor, the originating case and what the agreement covers.">
          <Field label="Contract title" htmlFor="title" error={errors.title?.message} required className="sm:col-span-2">
            <Input id="title" placeholder="Aircraft Component Supply Agreement" invalid={!!errors.title} {...register('title')} />
          </Field>

          <Field label="Vendor" htmlFor="vendorId" error={errors.vendorId?.message} required>
            <Select
              id="vendorId"
              options={vendors.filter((v) => v.active).map((v) => ({ value: v.id, label: v.name }))}
              placeholder="Select vendor"
              invalid={!!errors.vendorId}
              {...register('vendorId')}
            />
          </Field>

          <Field label="Originating plan" htmlFor="planId" hint="Links the contract to its acceptance of necessity.">
            <Select
              id="planId"
              options={procurementPlans
                .filter((plan) => plan.status === 'approved')
                .map((plan) => ({ value: plan.id, label: `${plan.code} ${plan.title}` }))}
              placeholder="Select approved plan"
              {...register('planId')}
            />
          </Field>

          <Field label="Department" htmlFor="department" error={errors.department?.message} required>
            <Select
              id="department"
              options={DEPARTMENTS.map((value) => ({ value, label: value }))}
              placeholder="Select department"
              invalid={!!errors.department}
              {...register('department')}
            />
          </Field>

          <Field label="Category" htmlFor="category" error={errors.category?.message} required>
            <Select
              id="category"
              options={CATEGORIES.map((value) => ({ value, label: value }))}
              placeholder="Select category"
              invalid={!!errors.category}
              {...register('category')}
            />
          </Field>

          <Field
            label="Scope of supply"
            htmlFor="scope"
            error={errors.scope?.message}
            required
            className="sm:col-span-2"
          >
            <Textarea id="scope" rows={4} invalid={!!errors.scope} {...register('scope')} />
          </Field>
        </FormSection>

        <FormSection title="Value and period" description="The concluded value and the period of the agreement.">
          <Field
            label="Contract value"
            htmlFor="value"
            error={errors.value?.message}
            hint={value > 0 ? formatMoney(Number(value)) : 'Value excluding taxes.'}
            required
          >
            <Input id="value" type="number" min={0} step={1000} prefix="INR" invalid={!!errors.value} {...register('value')} />
          </Field>

          <Field label="Start date" htmlFor="startDate" error={errors.startDate?.message} required>
            <DateInput id="startDate" invalid={!!errors.startDate} {...register('startDate')} />
          </Field>

          <Field label="End date" htmlFor="endDate" error={errors.endDate?.message} required>
            <DateInput id="endDate" invalid={!!errors.endDate} {...register('endDate')} />
          </Field>
        </FormSection>

        <FormSection title="Terms" description="The clauses that govern payment, delivery and default.">
          <Field label="Payment terms" htmlFor="paymentTerms" error={errors.paymentTerms?.message} required>
            <Textarea id="paymentTerms" rows={2} invalid={!!errors.paymentTerms} {...register('paymentTerms')} />
          </Field>

          <Field label="Delivery terms" htmlFor="deliveryTerms" error={errors.deliveryTerms?.message} required>
            <Textarea id="deliveryTerms" rows={2} invalid={!!errors.deliveryTerms} {...register('deliveryTerms')} />
          </Field>

          <Field label="Performance guarantee" htmlFor="performanceGuarantee">
            <Textarea id="performanceGuarantee" rows={2} {...register('performanceGuarantee')} />
          </Field>

          <Field label="Liquidated damages" htmlFor="liquidatedDamages">
            <Textarea id="liquidatedDamages" rows={2} {...register('liquidatedDamages')} />
          </Field>
        </FormSection>

        <FormSection title="Documents" description="The signed agreement and any guarantee on record.">
          <div className="sm:col-span-2">
            <DocumentUploader onFiles={(selected) => setFiles((current) => [...current, ...selected])} />
          </div>
        </FormSection>

        {serverError ? <p role="alert" className="px-5 text-critical">{serverError}</p> : null}
        <FormActions>
          <Button variant="ghost" type="button" onClick={() => navigate('/app/contracts')}>
            Cancel
          </Button>
          <Button variant="secondary" type="button" icon={Save} loading={saving === 'draft'} onClick={save('draft')}>
            Save draft
          </Button>
          <Button variant="primary" type="button" icon={Send} loading={saving === 'review'} onClick={save('review')}>
            Submit for review
          </Button>
        </FormActions>
      </form>
    </div>
  );
}
