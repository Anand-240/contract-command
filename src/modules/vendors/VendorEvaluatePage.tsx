import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save } from 'lucide-react';
import { FormActions, FormSection, PageHeader, ScoreBar } from '@/components/common';
import { Button, ErrorState, Field, Input, Panel, Select, Skeleton, Textarea } from '@/components/ui';
import { useAsync, useSession } from '@/hooks';
import { vendorService } from '@/services';
import { formatDate } from '@/utils';

const CRITERIA = [
  { key: 'delivery', label: 'Delivery timeliness', help: 'Adherence to contracted delivery dates across the period.' },
  { key: 'compliance', label: 'Compliance', help: 'Currency of certifications, licences and statutory filings.' },
  { key: 'cost', label: 'Cost competitiveness', help: 'Rates against the last purchase price and peer quotations.' },
  { key: 'quality', label: 'Quality', help: 'Acceptance at first presentation and rejection rate.' },
] as const;

type Key = (typeof CRITERIA)[number]['key'];

const PERIODS = ['Q1 FY2026-27', 'Q2 FY2026-27', 'Q3 FY2026-27', 'Q4 FY2026-27'];

export function VendorEvaluatePage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { user } = useSession();
  const [scores, setScores] = useState<Record<Key, number>>({ delivery: 80, compliance: 80, cost: 80, quality: 80 });
  const [period, setPeriod] = useState(PERIODS[1]!);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const { data: vendor, loading, error, refetch } = useAsync(() => vendorService.get(id), [id]);
  const { data: history } = useAsync(() => vendorService.evaluations(id), [id]);

  if (error) return <ErrorState title="This vendor could not be loaded" onRetry={refetch} />;
  if (loading || !vendor) return <Skeleton className="h-96 w-full rounded-lg" />;

  const overall = Math.round((scores.delivery * 0.3 + scores.compliance * 0.3 + scores.quality * 0.25 + scores.cost * 0.15) * 100) / 100;

  const submit = async () => {
    setSaving(true);
    setSaveError('');
    try { await vendorService.createEvaluation(vendor.id, {
      period,
      evaluatedOn: new Date().toISOString().slice(0, 10),
      evaluator: user.name,
      scores,
      overall,
      notes,
    });
    navigate(`/app/vendors/${vendor.id}`);
    } catch (cause) { setSaveError(cause instanceof Error ? cause.message : 'Evaluation failed.'); setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Vendor Evaluation"
        description={`Scorecard for ${vendor.name}. The overall rating carries into award decisions and is visible on the vendor record.`}
      />

      {saveError ? <p role="alert" className="text-critical">{saveError}</p> : null}
      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <form className="panel" noValidate onSubmit={(event) => event.preventDefault()}>
          <FormSection title="Period" description="The quarter this assessment covers.">
            <Field label="Evaluation period" htmlFor="period">
              <Select
                id="period"
                value={period}
                onChange={(event) => setPeriod(event.target.value)}
                options={PERIODS.map((value) => ({ value, label: value }))}
              />
            </Field>

            <Field label="Evaluator" htmlFor="evaluator">
              <Input id="evaluator" value={user.name} readOnly disabled />
            </Field>
          </FormSection>

          <section className="border-b border-line px-5 py-6">
            <h2 className="text-[13.5px] font-semibold text-ink">Scoring</h2>
            <p className="mt-1 text-[12.5px] text-ink-faint">
              Each criterion is scored out of 100. Weighted score: delivery 30%, compliance 30%, quality 25%, cost 15%.
            </p>

            <div className="mt-5 space-y-5">
              {CRITERIA.map((criterion) => (
                <div key={criterion.key} className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div>
                    <label htmlFor={criterion.key} className="text-[13.5px] font-medium text-ink">
                      {criterion.label}
                    </label>
                    <p className="mt-0.5 text-[12px] text-ink-faint">{criterion.help}</p>
                    <input
                      id={criterion.key}
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={scores[criterion.key]}
                      onChange={(event) =>
                        setScores((current) => ({ ...current, [criterion.key]: Number(event.target.value) }))
                      }
                      className="mt-2.5 w-full accent-[var(--color-brand)]"
                      aria-describedby={`${criterion.key}-value`}
                    />
                  </div>
                  <div className="sm:w-24">
                    <Input
                      id={`${criterion.key}-value`}
                      type="number"
                      min={0}
                      max={100}
                      value={scores[criterion.key]}
                      onChange={(event) =>
                        setScores((current) => ({
                          ...current,
                          [criterion.key]: Math.max(0, Math.min(100, Number(event.target.value))),
                        }))
                      }
                      aria-label={`${criterion.label} score`}
                      className="text-right tabular"
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <FormSection title="Evaluator notes" description="The reasoning behind the scores, for the record.">
            <Field
              label="Notes"
              htmlFor="notes"
              hint="Reference specific consignments, inspection reports or correspondence."
              className="sm:col-span-2"
            >
              <Textarea id="notes" rows={4} value={notes} onChange={(event) => setNotes(event.target.value)} />
            </Field>
          </FormSection>

          <FormActions>
            <Button variant="ghost" type="button" onClick={() => navigate(`/app/vendors/${vendor.id}`)}>
              Cancel
            </Button>
            <Button variant="primary" type="button" icon={Save} loading={saving} onClick={submit}>
              Record evaluation
            </Button>
          </FormActions>
        </form>

        <div className="space-y-5">
          <Panel title="Calculated rating" description="Updates as the scores are set">
            <div className="flex items-baseline gap-2">
              <span className="text-[34px] font-semibold leading-none text-ink tabular">{overall}</span>
              <span className="text-[13px] text-ink-faint">out of 100</span>
            </div>
            <div className="mt-5 space-y-4">
              {CRITERIA.map((criterion) => (
                <ScoreBar key={criterion.key} label={criterion.label} score={scores[criterion.key]} band={false} />
              ))}
            </div>
          </Panel>

          <Panel title="Previous evaluations" flush>
            {!history || history.length === 0 ? (
              <p className="px-4 py-4 text-[13px] text-ink-faint">No earlier evaluations on record.</p>
            ) : (
              <ul className="divide-y divide-line">
                {history.map((evaluation) => (
                  <li key={evaluation.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <div className="min-w-0">
                      <p className="text-[13px] text-ink">{evaluation.period}</p>
                      <p className="text-[11.5px] text-ink-faint">{formatDate(evaluation.evaluatedOn)}</p>
                    </div>
                    <span className="text-[14px] font-semibold text-ink tabular">{evaluation.overall}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
