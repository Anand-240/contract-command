import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { Save, Send } from 'lucide-react';
import { FormActions, FormSection, PageHeader } from '@/components/common';
import { Button, DateInput, Field, Input, Select, Textarea } from '@/components/ui';
import { APPROVERS, CATEGORIES, DEPARTMENTS, PRIORITY, optionsFrom } from '@/constants';
import { useSession } from '@/hooks';
import { procurementService } from '@/services';
import { formatMoney } from '@/utils';

const schema = z
  .object({
    title: z.string().min(6, 'Give the plan a descriptive title of at least 6 characters'),
    description: z.string().min(20, 'Describe the requirement in at least 20 characters'),
    department: z.string().min(1, 'Select the indenting department'),
    category: z.string().min(1, 'Select a procurement category'),
    priority: z.enum(['low', 'medium', 'high', 'critical']),
    estimatedBudget: z.coerce.number().positive('Enter the estimated budget'),
    currency: z.enum(['INR', 'USD', 'EUR']),
    budgetReference: z.string().min(3, 'Enter the sanctioned budget head'),
    requiredDate: z.string().min(1, 'Select the date the stores are required by'),
    expectedStart: z.string().min(1, 'Select the expected procurement start date'),
    expectedCompletion: z.string().min(1, 'Select the expected completion date'),
    approver: z.string().optional(),
    comments: z.string().optional(),
  })
  .refine((values) => values.expectedCompletion >= values.expectedStart, {
    path: ['expectedCompletion'],
    message: 'Completion cannot fall before the procurement start date',
  })
  .refine((values) => values.requiredDate >= values.expectedStart, {
    path: ['requiredDate'],
    message: 'The required date cannot fall before the procurement start date',
  });

type FormValues = z.infer<typeof schema>;

export function ProcurementNewPage() {
  const navigate = useNavigate();
  const { user } = useSession();
  const [saving, setSaving] = useState<'draft' | 'submit' | null>(null);
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { priority: 'medium', currency: 'INR', estimatedBudget: 0 },
  });

  const budget = watch('estimatedBudget');

  const save = (mode: 'draft' | 'submit') =>
    handleSubmit(async (values) => {
      setSaving(mode);
      try {
        const plan = await procurementService.create({ ...values, owner: user.name, lineItems: [] });
        if (mode === 'submit') await procurementService.submit(plan.id);
        navigate(`/app/procurement/${plan.id}`);
      } catch (error) { setServerError(error instanceof Error ? error.message : 'Could not save plan.'); setSaving(null); }
    });

  return (
    <div className="space-y-5">
      <PageHeader
        title="New Procurement Plan"
        description="A plan records the requirement, the sanctioned provision and the timeline. On approval it becomes the basis for the contract."
      />

      <form className="panel" noValidate>
        <FormSection
          title="Basic information"
          description="What is being procured, for which department, and how urgently it is needed."
        >
          <Field label="Plan title" htmlFor="title" error={errors.title?.message} required className="sm:col-span-2">
            <Input id="title" placeholder="Aircraft Navigation Components" invalid={!!errors.title} {...register('title')} />
          </Field>

          <Field
            label="Description"
            htmlFor="description"
            error={errors.description?.message}
            hint="State the requirement, the quantity basis and the operational justification."
            required
            className="sm:col-span-2"
          >
            <Textarea id="description" rows={4} invalid={!!errors.description} {...register('description')} />
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

          <Field label="Priority" htmlFor="priority" hint="Drives the position of the case in the approval queue.">
            <Select id="priority" options={optionsFrom(PRIORITY)} {...register('priority')} />
          </Field>
        </FormSection>

        <FormSection
          title="Budget"
          description="The provision against which the case will be committed."
        >
          <Field
            label="Estimated budget"
            htmlFor="estimatedBudget"
            error={errors.estimatedBudget?.message}
            hint={budget > 0 ? formatMoney(Number(budget)) : 'Enter the value excluding taxes.'}
            required
          >
            <Input
              id="estimatedBudget"
              type="number"
              min={0}
              step={1000}
              prefix="INR"
              invalid={!!errors.estimatedBudget}
              {...register('estimatedBudget')}
            />
          </Field>

          <Field label="Currency" htmlFor="currency">
            <Select
              id="currency"
              options={[
                { value: 'INR', label: 'Indian Rupee' },
                { value: 'USD', label: 'US Dollar' },
                { value: 'EUR', label: 'Euro' },
              ]}
              {...register('currency')}
            />
          </Field>

          <Field
            label="Budget reference"
            htmlFor="budgetReference"
            error={errors.budgetReference?.message}
            hint="The sanctioned budget head, for example BH/AV/2026-27/114."
            required
          >
            <Input id="budgetReference" invalid={!!errors.budgetReference} {...register('budgetReference')} />
          </Field>
        </FormSection>

        <FormSection title="Timeline" description="When the stores are needed and the window available to procure them.">
          <Field label="Required date" htmlFor="requiredDate" error={errors.requiredDate?.message} required>
            <DateInput id="requiredDate" invalid={!!errors.requiredDate} {...register('requiredDate')} />
          </Field>

          <Field label="Expected procurement start" htmlFor="expectedStart" error={errors.expectedStart?.message} required>
            <DateInput id="expectedStart" invalid={!!errors.expectedStart} {...register('expectedStart')} />
          </Field>

          <Field label="Expected completion" htmlFor="expectedCompletion" error={errors.expectedCompletion?.message} required>
            <DateInput id="expectedCompletion" invalid={!!errors.expectedCompletion} {...register('expectedCompletion')} />
          </Field>
        </FormSection>

        <FormSection title="Approval" description="Where the case is routed once submitted.">
          <Field label="Approver" htmlFor="approver" hint="Leave blank to route by the default value slab.">
            <Select
              id="approver"
              options={APPROVERS.map((value) => ({ value, label: value }))}
              placeholder="Route automatically"
              {...register('approver')}
            />
          </Field>

          <Field label="Comments for the approver" htmlFor="comments" className="sm:col-span-2">
            <Textarea id="comments" rows={3} {...register('comments')} />
          </Field>
        </FormSection>

        {serverError ? <p role="alert" className="px-5 text-critical">{serverError}</p> : null}
        <FormActions>
          <Button variant="ghost" type="button" onClick={() => navigate('/app/procurement')}>
            Cancel
          </Button>
          <Button variant="secondary" type="button" icon={Save} loading={saving === 'draft'} onClick={save('draft')}>
            Save draft
          </Button>
          <Button variant="primary" type="button" icon={Send} loading={saving === 'submit'} onClick={save('submit')}>
            Submit for approval
          </Button>
        </FormActions>
      </form>
    </div>
  );
}
