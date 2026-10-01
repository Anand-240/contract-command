import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, History, Send } from 'lucide-react';
import { DocumentUploader, FormActions, FormSection, PageHeader } from '@/components/common';
import { Button, DateInput, ErrorState, Field, Input, Panel, Select, Skeleton, Textarea } from '@/components/ui';
import { AMENDMENT_TYPE, optionsFrom } from '@/constants';
import { useAsync, useSession } from '@/hooks';
import { contractService } from '@/services';
import { formatDate, formatMoney } from '@/utils';

const schema = z.object({
  type: z.enum(['value_revision', 'timeline_extension', 'scope_change', 'terms_revision']),
  summary: z.string().min(6, 'Summarise the amendment in at least 6 characters'),
  description: z.string().min(20, 'Describe the change in at least 20 characters'),
  reason: z.string().min(20, 'Record the justification in at least 20 characters'),
  effectiveDate: z.string().min(1, 'Select the date the amendment takes effect'),
  revisedValue: z.coerce.number().optional(),
  revisedEndDate: z.string().optional(),
  revisedScope: z.string().optional(),
  revisedPaymentTerms: z.string().optional(),
  revisedDeliveryTerms: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function ContractAmendPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { user } = useSession();
  const [saving, setSaving] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [serverError, setServerError] = useState('');

  const { data: contract, loading, error, refetch } = useAsync(() => contractService.get(id), [id]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'value_revision' },
  });

  const type = watch('type');
  const revisedValue = watch('revisedValue');
  const revisedEndDate = watch('revisedEndDate');

  if (error) return <ErrorState title="This contract could not be loaded" onRetry={refetch} />;
  if (loading || !contract) return <Skeleton className="h-96 w-full rounded-lg" />;

  const [major, minor] = contract.version.split('.').map(Number);
  const nextVersion = `${major}.${(minor ?? 0) + 1}`;

  const onSubmit = handleSubmit(async (values) => {
    setSaving(true);
    const changes = [];
    if (values.type === 'value_revision' && values.revisedValue && values.revisedValue !== contract.value) {
      changes.push({
        field: 'value',
        previous: String(contract.value),
        updated: String(values.revisedValue),
      });
    }
    if (values.type === 'timeline_extension' && values.revisedEndDate && values.revisedEndDate !== contract.endDate) {
      changes.push({
        field: 'endDate',
        previous: contract.endDate,
        updated: values.revisedEndDate,
      });
    }
    if (values.type === 'scope_change' && values.revisedScope?.trim() && values.revisedScope !== contract.scope) {
      changes.push({ field: 'scope', previous: contract.scope, updated: values.revisedScope.trim() });
    }
    if (values.type === 'terms_revision') {
      if (values.revisedPaymentTerms?.trim() && values.revisedPaymentTerms !== contract.paymentTerms) changes.push({ field: 'paymentTerms', previous: contract.paymentTerms, updated: values.revisedPaymentTerms.trim() });
      if (values.revisedDeliveryTerms?.trim() && values.revisedDeliveryTerms !== contract.deliveryTerms) changes.push({ field: 'deliveryTerms', previous: contract.deliveryTerms, updated: values.revisedDeliveryTerms.trim() });
    }
    if (!changes.length) { setServerError('Enter at least one revised value that differs from the current contract.'); setSaving(false); return; }

    try {
    const updated = await contractService.createAmendment(contract.id, {
      type: values.type,
      summary: values.summary,
      description: values.description,
      reason: values.reason,
      effectiveDate: values.effectiveDate,
      changes,
    });
    const amendment = updated.amendments.find((row) => row.status === 'pending_approval' && row.version === nextVersion);
    if (!amendment) throw new Error('Amendment was created but could not be located for document upload.');
    for (const file of files) await contractService.uploadAmendmentDocument(amendment.id, file);
    navigate(`/app/contracts/${contract.id}`);
    } catch (cause) { setServerError(cause instanceof Error ? cause.message : 'Could not raise amendment.'); setSaving(false); }
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Raise Contract Amendment"
        description={`Amending ${contract.code}. The current version stays on record unchanged and the amendment is issued as version ${nextVersion}.`}
      />

      <Panel className="border-brand-line bg-brand-tint">
        <div className="flex items-start gap-2.5">
          <History size={16} className="mt-0.5 shrink-0 text-brand" aria-hidden />
          <div>
            <p className="text-[13px] font-medium text-ink">Historical data is preserved</p>
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-muted">
              Version {contract.version} remains readable in full, including its values, dates and
              documents. The amendment is applied from its effective date forward, and both versions
              stay linked to the same contract record.
            </p>
          </div>
        </div>
      </Panel>

      <form className="panel" noValidate>
        <FormSection title="Amendment" description="What is changing, and the authority for the change.">
          <Field label="Current version" htmlFor="currentVersion">
            <Input id="currentVersion" value={contract.version} readOnly disabled />
          </Field>

          <Field label="Amendment issued as" htmlFor="nextVersion" hint="Assigned automatically on submission.">
            <Input id="nextVersion" value={nextVersion} readOnly disabled />
          </Field>

          <Field label="Amendment type" htmlFor="type" error={errors.type?.message} required>
            <Select id="type" options={optionsFrom(AMENDMENT_TYPE)} invalid={!!errors.type} {...register('type')} />
          </Field>

          <Field label="Effective date" htmlFor="effectiveDate" error={errors.effectiveDate?.message} required>
            <DateInput id="effectiveDate" invalid={!!errors.effectiveDate} {...register('effectiveDate')} />
          </Field>

          <Field label="Summary" htmlFor="summary" error={errors.summary?.message} required className="sm:col-span-2">
            <Input id="summary" placeholder="Delivery timeline updated" invalid={!!errors.summary} {...register('summary')} />
          </Field>

          <Field
            label="Change description"
            htmlFor="description"
            error={errors.description?.message}
            hint="State precisely which clause, schedule or value is altered."
            required
            className="sm:col-span-2"
          >
            <Textarea id="description" rows={4} invalid={!!errors.description} {...register('description')} />
          </Field>

          <Field
            label="Reason"
            htmlFor="reason"
            error={errors.reason?.message}
            hint="The justification recorded for audit. Reference any correspondence or inspection report."
            required
            className="sm:col-span-2"
          >
            <Textarea id="reason" rows={3} invalid={!!errors.reason} {...register('reason')} />
          </Field>
        </FormSection>

        <FormSection title="Revised particulars" description="Only the fields this amendment changes need a value.">
          <Field
            label="Revised contract value"
            htmlFor="revisedValue"
            hint={`Current value ${formatMoney(contract.value, contract.currency)}`}
          >
            <Input
              id="revisedValue"
              type="number"
              min={0}
              step={1000}
              prefix={contract.currency}
              disabled={type !== 'value_revision'}
              {...register('revisedValue')}
            />
          </Field>

          <Field label="Revised end date" htmlFor="revisedEndDate" hint={`Current end date ${formatDate(contract.endDate)}`}>
            <DateInput id="revisedEndDate" disabled={type !== 'timeline_extension'} {...register('revisedEndDate')} />
          </Field>
          {type === 'scope_change' ? <Field label="Revised scope" htmlFor="revisedScope" className="sm:col-span-2"><Textarea id="revisedScope" rows={4} {...register('revisedScope')} /></Field> : null}
          {type === 'terms_revision' ? <>
            <Field label="Revised payment terms" htmlFor="revisedPaymentTerms" className="sm:col-span-2"><Textarea id="revisedPaymentTerms" rows={3} {...register('revisedPaymentTerms')} /></Field>
            <Field label="Revised delivery terms" htmlFor="revisedDeliveryTerms" className="sm:col-span-2"><Textarea id="revisedDeliveryTerms" rows={3} {...register('revisedDeliveryTerms')} /></Field>
          </> : null}
        </FormSection>

        {/* Comparison: what the record says now against what it will say. */}
        {(revisedValue && Number(revisedValue) !== contract.value) || (revisedEndDate && revisedEndDate !== contract.endDate) ? (
          <div className="border-b border-line px-5 py-6">
            <h2 className="text-[13.5px] font-semibold text-ink">Comparison</h2>
            <p className="mt-1 text-[12.5px] text-ink-faint">
              Both columns remain retrievable after the amendment is approved.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_1fr]">
              <div className="rounded-md border border-line bg-surface-muted px-4 py-3">
                <p className="text-[11.5px] uppercase tracking-wide text-ink-faint">
                  Version {contract.version}, current
                </p>
                {revisedValue && Number(revisedValue) !== contract.value ? (
                  <p className="mt-2 text-[17px] font-semibold text-ink-muted tabular">
                    {formatMoney(contract.value, contract.currency)}
                  </p>
                ) : null}
                {revisedEndDate && revisedEndDate !== contract.endDate ? (
                  <p className="mt-2 text-[15px] font-medium text-ink-muted tabular">{formatDate(contract.endDate)}</p>
                ) : null}
              </div>

              <div className="hidden items-center justify-center sm:flex">
                <ArrowRight size={16} className="text-ink-faint" aria-hidden />
              </div>

              <div className="rounded-md border border-brand-line bg-brand-tint px-4 py-3">
                <p className="text-[11.5px] uppercase tracking-wide text-brand">Version {nextVersion}, proposed</p>
                {revisedValue && Number(revisedValue) !== contract.value ? (
                  <p className="mt-2 text-[17px] font-semibold text-ink tabular">
                    {formatMoney(Number(revisedValue), contract.currency)}
                  </p>
                ) : null}
                {revisedEndDate && revisedEndDate !== contract.endDate ? (
                  <p className="mt-2 text-[15px] font-medium text-ink tabular">{formatDate(revisedEndDate)}</p>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        <FormSection title="Supporting documents" description="Correspondence or reports that establish the justification.">
          <div className="sm:col-span-2">
            <DocumentUploader onFiles={(selected) => setFiles((current) => [...current, ...selected])} />
          </div>
        </FormSection>

        <FormSection title="Approval" description="Submitted amendments enter the Approver's decision queue.">
          <Field label="Requested by" htmlFor="requestedBy">
            <Input id="requestedBy" value={user.name} readOnly disabled />
          </Field>
        </FormSection>

        {serverError ? <p role="alert" className="px-5 text-critical">{serverError}</p> : null}
        <FormActions>
          <Button variant="ghost" type="button" onClick={() => navigate(`/app/contracts/${contract.id}`)}>
            Cancel
          </Button>
          <Button variant="primary" type="button" icon={Send} loading={saving} onClick={onSubmit}>
            Submit amendment
          </Button>
        </FormActions>
      </form>
    </div>
  );
}
