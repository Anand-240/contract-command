import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/common';
import { Button, Field, Input, Panel, Select } from '@/components/ui';
import { useAsync } from '@/hooks';
import { vendorService } from '@/services/vendorService';

export function VendorNewPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { data: existing } = useAsync(() => id ? vendorService.get(id) : Promise.resolve(null), [id]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', registrationNumber: '', email: '', phone: '', address: '', complianceStatus: 'review_required', certificationName: '', certificationIssuer: '', certificationReference: '', certificationExpiry: '' });
  useEffect(() => { if (existing) setForm((current) => ({ ...current, name: existing.name, registrationNumber: existing.registrationNumber, email: existing.email, phone: existing.phone, address: existing.address, complianceStatus: existing.complianceStatus })); }, [existing]);
  const update = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setError('');
    try {
      const certifications = form.certificationName ? [{ id: crypto.randomUUID(), name: form.certificationName, issuer: form.certificationIssuer, reference: form.certificationReference, issuedOn: new Date().toISOString().slice(0, 10), expiresOn: form.certificationExpiry, status: 'valid' as const }] : [];
      const payload = { name: form.name, registrationNumber: form.registrationNumber, email: form.email, phone: form.phone, address: form.address, complianceStatus: form.complianceStatus as 'compliant' | 'review_required', certifications: [...(existing?.certifications ?? []), ...certifications], categories: existing?.categories ?? [], complianceDocuments: existing?.complianceDocuments ?? [], active: existing?.active ?? true };
      const vendor = id ? await vendorService.update(id, payload) : await vendorService.create(payload);
      navigate(`/app/vendors/${vendor.id}`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not create vendor.'); setSaving(false); }
  };
  return <div className="space-y-5"><PageHeader title={id ? "Update Vendor" : "Register Vendor"} description="Record supplier identity, compliance, and certification before award." />
    <Panel><form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <Field label="Vendor name" htmlFor="vendor-name" required><Input id="vendor-name" value={form.name} onChange={update('name')} required /></Field>
      <Field label="Registration number" htmlFor="vendor-reg" required><Input id="vendor-reg" value={form.registrationNumber} onChange={update('registrationNumber')} required /></Field>
      <Field label="Official email" htmlFor="vendor-email" required><Input id="vendor-email" type="email" value={form.email} onChange={update('email')} required /></Field>
      <Field label="Phone" htmlFor="vendor-phone"><Input id="vendor-phone" value={form.phone} onChange={update('phone')} /></Field>
      <Field label="Address" htmlFor="vendor-address"><Input id="vendor-address" value={form.address} onChange={update('address')} /></Field>
      <Field label="Compliance" htmlFor="vendor-compliance"><Select id="vendor-compliance" value={form.complianceStatus} onChange={update('complianceStatus')} options={[{ value: 'review_required', label: 'Review required' }, { value: 'compliant', label: 'Compliant' }]} /></Field>
      <div className="sm:col-span-2 border-t border-line pt-4 text-[13px] font-semibold">Certification</div>
      <Field label="Certificate name" htmlFor="cert-name"><Input id="cert-name" value={form.certificationName} onChange={update('certificationName')} placeholder="AS9100" /></Field>
      <Field label="Issuer" htmlFor="cert-issuer"><Input id="cert-issuer" value={form.certificationIssuer} onChange={update('certificationIssuer')} /></Field>
      <Field label="Reference" htmlFor="cert-ref"><Input id="cert-ref" value={form.certificationReference} onChange={update('certificationReference')} /></Field>
      <Field label="Expires on" htmlFor="cert-expiry"><Input id="cert-expiry" type="date" value={form.certificationExpiry} onChange={update('certificationExpiry')} /></Field>
      {error ? <p role="alert" className="sm:col-span-2 text-critical">{error}</p> : null}
      <div className="flex gap-2 sm:col-span-2"><Button type="submit" variant="primary" loading={saving}>{id ? "Save vendor" : "Register vendor"}</Button><Button type="button" variant="ghost" onClick={() => navigate('/app/vendors')}>Cancel</Button></div>
    </form></Panel></div>;
}
