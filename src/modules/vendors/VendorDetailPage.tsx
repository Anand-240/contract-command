import { downloadDocument } from '@/services/documentService';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Gauge, TriangleAlert, Pencil } from 'lucide-react';
import { DetailSection, DocumentUploader, EntityHeader, ScoreBar } from '@/components/common';
import { Button, EmptyState, ErrorState, Panel, Skeleton, StatusBadge, Tabs } from '@/components/ui';
import {
  CERTIFICATION_STATUS,
  COMPLIANCE_STATUS,
  CONTRACT_STATUS,
  DOCUMENT_STATUS,
  statusMeta,
} from '@/constants';
import { useAsync, useSession } from '@/hooks';
import { contractService, vendorService } from '@/services';
import { daysUntil, formatDate, formatMoney, formatMoneyShort } from '@/utils';

export function VendorDetailPage() {
  const { id = '' } = useParams();
  const { can } = useSession();
  const [tab, setTab] = useState('overview');
  const [uploadError, setUploadError] = useState('');

  const { data: vendor, loading, error, refetch } = useAsync(() => vendorService.get(id), [id]);
  const { data: evaluations } = useAsync(() => vendorService.evaluations(id), [id]);
  const { data: contracts } = useAsync(() => contractService.list({ vendorId: id }), [id]);

  if (error) return <ErrorState title="This vendor could not be loaded" onRetry={refetch} />;
  if (loading || !vendor) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-32 w-full rounded-lg" />
        <Skeleton className="h-72 w-full rounded-lg" />
      </div>
    );
  }

  const latest = evaluations?.[0];
  const lapsed = vendor.certifications.filter((cert) => cert.status === 'expired');

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'compliance', label: 'Compliance', count: vendor.complianceDocuments.length },
    { id: 'certifications', label: 'Certifications', count: vendor.certifications.length },
    { id: 'contracts', label: 'Contracts', count: contracts?.length ?? 0 },
    { id: 'performance', label: 'Performance', count: evaluations?.length ?? 0 },
  ];

  return (
    <div className="space-y-5">
      <EntityHeader
        code={vendor.code}
        title={vendor.name}
        status={statusMeta(COMPLIANCE_STATUS, vendor.complianceStatus)}
        secondaryStatus={vendor.active ? { label: 'Registered', tone: 'neutral' } : { label: 'Inactive', tone: 'critical' }}
        facts={[
          { label: 'Rating', value: `${vendor.rating} / 100`, mono: true },
          { label: 'Active contracts', value: String(vendor.activeContracts), mono: true },
          { label: 'Awarded value', value: formatMoneyShort(vendor.totalAwardedValue), mono: true },
          { label: 'Last evaluated', value: formatDate(vendor.lastEvaluated), mono: true },
          { label: 'Onboarded', value: formatDate(vendor.onboardedOn), mono: true },
          { label: 'Categories', value: vendor.categories.join(', ') },
        ]}
        actions={
          <div className="flex gap-2">
          {can('vendor.manage') ? <Link to={`/app/vendors/${vendor.id}/edit`}><Button variant="secondary" icon={Pencil}>Edit compliance</Button></Link> : null}
          {can('vendor.evaluate') ? (
            <Link to={`/app/vendors/${vendor.id}/evaluate`}>
              <Button variant="primary" icon={Gauge}>
                Record evaluation
              </Button>
            </Link>
          ) : null}
          </div>
        }
      />

      {lapsed.length > 0 ? (
        <div className="flex items-start gap-2.5 rounded-lg border border-critical-line bg-critical-tint px-4 py-3">
          <TriangleAlert size={16} className="mt-0.5 shrink-0 text-critical" aria-hidden />
          <div>
            <p className="text-[13px] font-medium text-critical">
              {lapsed.length === 1 ? 'A certification has lapsed' : `${lapsed.length} certifications have lapsed`}
            </p>
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-muted">
              {lapsed.map((cert) => `${cert.name} expired on ${formatDate(cert.expiresOn)}`).join('. ')}. New awards to
              this vendor should be held until recertification is on record.
            </p>
          </div>
        </div>
      ) : null}

      <Panel flush>
        <Tabs items={tabs} active={tab} onChange={setTab} className="px-2" />

        <div className="p-5">
          {tab === 'overview' ? (
            <div className="space-y-6">
              <DetailSection
                title="Registration"
                columns={3}
                rows={[
                  { label: 'Registered name', value: vendor.name },
                  { label: 'Registration number', value: vendor.registrationNumber, mono: true },
                  { label: 'GSTIN', value: vendor.gstin, mono: true },
                  { label: 'MSME registered', value: vendor.msmeRegistered ? 'Yes' : 'No' },
                  { label: 'Registered since', value: formatDate(vendor.onboardedOn) },
                  { label: 'Supply categories', value: vendor.categories.join(', ') },
                ]}
              />
              <DetailSection
                title="Contact"
                columns={3}
                rows={[
                  { label: 'Email', value: vendor.email, mono: true },
                  { label: 'Telephone', value: vendor.phone, mono: true },
                  { label: 'Registered address', value: vendor.address, wide: true },
                ]}
              />
            </div>
          ) : null}

          {tab === 'compliance' ? (
            <div className="space-y-4">
            <ul className="divide-y divide-line">
              {vendor.complianceDocuments.map((doc) => {
                const expiry = doc.expiresOn ? daysUntil(doc.expiresOn) : null;
                return (
                  <li key={doc.id} className="flex flex-wrap items-center gap-4 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-[13.5px] text-ink">{doc.name}</p>
                      <p className="mt-0.5 code text-[11.5px] text-ink-faint">{doc.reference}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[12.5px] text-ink-muted tabular">Submitted {formatDate(doc.submittedOn)}</p>
                      <p className="text-[11.5px] text-ink-faint tabular">
                        {doc.expiresOn
                          ? expiry !== null && expiry < 0
                            ? `Expired ${formatDate(doc.expiresOn)}`
                            : `Valid to ${formatDate(doc.expiresOn)}`
                          : 'No expiry'}
                      </p>
                    </div>
                    <StatusBadge meta={statusMeta(DOCUMENT_STATUS, doc.status)} size="sm" />
                    {can('vendor.manage') && doc.status === 'pending' ? <Button size="sm" variant="secondary" onClick={async () => { try { await vendorService.update(vendor.id, { complianceDocuments: vendor.complianceDocuments.map((item) => item.id === doc.id ? { ...item, status: 'verified' } : item) }); refetch(); } catch (cause) { setUploadError(cause instanceof Error ? cause.message : 'Verification failed.'); } }}>Mark verified</Button> : null}
                    {doc.id.startsWith('DOC-') ? <Button size="sm" variant="secondary" onClick={() => { void downloadDocument(doc.id, doc.name).catch(() => setUploadError('Document download failed.')); }}>Download</Button> : null}
                  </li>
                );
              })}
            </ul>
            {can('vendor.manage') ? <DocumentUploader hint="Upload PDF, DOCX or XLSX evidence up to 25 MB." onFiles={async (files) => { setUploadError(''); try { for (const file of files) await vendorService.uploadDocument(vendor.id, file); refetch(); } catch (cause) { setUploadError(cause instanceof Error ? cause.message : 'Upload failed.'); } }} /> : null}
            {uploadError ? <p role="alert" className="text-critical">{uploadError}</p> : null}
            </div>
          ) : null}

          {tab === 'certifications' ? (
            <ul className="divide-y divide-line">
              {vendor.certifications.map((cert) => (
                <li key={cert.id} className="flex flex-wrap items-center gap-4 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] text-ink">{cert.name}</p>
                    <p className="mt-0.5 text-[12px] text-ink-faint">
                      Issued by {cert.issuer} · <span className="code">{cert.reference}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[12.5px] text-ink-muted tabular">Issued {formatDate(cert.issuedOn)}</p>
                    <p className="text-[11.5px] text-ink-faint tabular">Expires {formatDate(cert.expiresOn)}</p>
                  </div>
                  <StatusBadge meta={statusMeta(CERTIFICATION_STATUS, cert.status)} size="sm" />
                </li>
              ))}
            </ul>
          ) : null}

          {tab === 'contracts' ? (
            !contracts || contracts.length === 0 ? (
              <EmptyState
                title="No contracts awarded"
                description="Agreements concluded with this vendor will be listed here."
              />
            ) : (
              <div className="overflow-x-auto rounded-md border border-line">
                <table className="w-full text-left">
                  <thead className="bg-surface-muted">
                    <tr>
                      {['Contract', 'Title', 'Value', 'Period', 'Status'].map((head) => (
                        <th key={head} scope="col" className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                          {head}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {contracts.map((contract) => (
                      <tr key={contract.id} className="border-t border-line hover:bg-surface-muted">
                        <td className="px-4 py-2.5">
                          <Link to={`/app/contracts/${contract.id}`} className="code text-[12.5px] font-medium text-ink hover:text-brand">
                            {contract.code}
                          </Link>
                        </td>
                        <td className="max-w-xs truncate px-4 py-2.5 text-[13px]">{contract.title}</td>
                        <td className="px-4 py-2.5 text-[13px] font-medium text-ink tabular">
                          {formatMoney(contract.value, contract.currency)}
                        </td>
                        <td className="px-4 py-2.5 text-[12.5px] tabular">
                          {formatDate(contract.startDate)} to {formatDate(contract.endDate)}
                        </td>
                        <td className="px-4 py-2.5">
                          <StatusBadge meta={statusMeta(CONTRACT_STATUS, contract.status)} size="sm" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : null}

          {tab === 'performance' ? (
            !evaluations || evaluations.length === 0 ? (
              <EmptyState
                icon={Gauge}
                title="No evaluations recorded"
                description="Quarterly scorecards for delivery, compliance, cost and quality will appear here."
                action={
                  can('vendor.evaluate') ? (
                    <Link to={`/app/vendors/${vendor.id}/evaluate`}>
                      <Button variant="primary">Record evaluation</Button>
                    </Link>
                  ) : null
                }
              />
            ) : (
              <div className="space-y-6">
                {latest ? (
                  <div className="rounded-md border border-line">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface-muted px-4 py-2.5">
                      <div>
                        <p className="text-[13px] font-medium text-ink">Latest evaluation, {latest.period}</p>
                        <p className="text-[12px] text-ink-faint">
                          Recorded by {latest.evaluator} on {formatDate(latest.evaluatedOn)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[11.5px] text-ink-faint">Overall rating</p>
                        <p className="text-[20px] font-semibold text-ink tabular">{latest.overall}</p>
                      </div>
                    </div>
                    <div className="grid gap-5 p-4 sm:grid-cols-2 lg:grid-cols-4">
                      <ScoreBar label="Delivery timeliness" score={latest.scores.delivery} />
                      <ScoreBar label="Compliance" score={latest.scores.compliance} />
                      <ScoreBar label="Cost competitiveness" score={latest.scores.cost} />
                      <ScoreBar label="Quality" score={latest.scores.quality} />
                    </div>
                    {latest.notes ? (
                      <p className="border-t border-line px-4 py-3 text-[13px] leading-relaxed text-ink-muted">
                        {latest.notes}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                <div>
                  <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-ink-faint">
                    Previous evaluations
                  </h3>
                  <ul className="divide-y divide-line">
                    {evaluations.slice(1).map((evaluation) => (
                      <li key={evaluation.id} className="flex flex-wrap items-center gap-4 py-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] text-ink">{evaluation.period}</p>
                          <p className="text-[12px] text-ink-faint">
                            {evaluation.evaluator} · {formatDate(evaluation.evaluatedOn)}
                          </p>
                        </div>
                        <div className="flex gap-4 text-[12px] text-ink-muted tabular">
                          <span>Delivery {evaluation.scores.delivery}</span>
                          <span>Compliance {evaluation.scores.compliance}</span>
                          <span>Cost {evaluation.scores.cost}</span>
                          <span>Quality {evaluation.scores.quality}</span>
                        </div>
                        <span className="w-12 text-right text-[14px] font-semibold text-ink tabular">
                          {evaluation.overall}
                        </span>
                      </li>
                    ))}
                    {evaluations.length === 1 ? (
                      <li className="py-3 text-[13px] text-ink-faint">No earlier evaluations on record.</li>
                    ) : null}
                  </ul>
                </div>
              </div>
            )
          ) : null}
        </div>
      </Panel>
    </div>
  );
}
