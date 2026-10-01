import type { Tone } from '@/types';

export interface StatusMeta {
  label: string;
  tone: Tone;
}

type Dict = Record<string, StatusMeta>;

export const PLAN_STATUS: Dict = {
  draft: { label: 'Draft', tone: 'neutral' },
  pending_approval: { label: 'Pending approval', tone: 'caution' },
  approved: { label: 'Approved', tone: 'positive' },
  rejected: { label: 'Rejected', tone: 'critical' },
  converted: { label: 'Converted to contract', tone: 'info' },
};

export const CONTRACT_STATUS: Dict = {
  draft: { label: 'Draft', tone: 'neutral' },
  under_review: { label: 'Under review', tone: 'caution' },
  approved: { label: 'Approved', tone: 'info' },
  rejected: { label: 'Rejected', tone: 'critical' },
  active: { label: 'Active', tone: 'positive' },
  amended: { label: 'Amended', tone: 'info' },
  closed: { label: 'Closed', tone: 'neutral' },
  terminated: { label: 'Terminated', tone: 'critical' },
};

export const COMPLIANCE_STATUS: Dict = {
  compliant: { label: 'Compliant', tone: 'positive' },
  review_required: { label: 'Review required', tone: 'caution' },
  expired: { label: 'Documents expired', tone: 'critical' },
  suspended: { label: 'Suspended', tone: 'critical' },
};

export const CERTIFICATION_STATUS: Dict = {
  valid: { label: 'Valid', tone: 'positive' },
  expiring: { label: 'Expiring', tone: 'caution' },
  expired: { label: 'Expired', tone: 'critical' },
};

export const DOCUMENT_STATUS: Dict = {
  verified: { label: 'Verified', tone: 'positive' },
  pending: { label: 'Pending', tone: 'caution' },
  expired: { label: 'Expired', tone: 'critical' },
};

export const DELIVERY_STATUS: Dict = {
  awaiting_delivery: { label: 'Awaiting delivery', tone: 'neutral' },
  partially_delivered: { label: 'Partially delivered', tone: 'caution' },
  delivered: { label: 'Delivered', tone: 'positive' },
  rejected: { label: 'Rejected', tone: 'critical' },
};

export const PO_INVOICE_STATUS: Dict = {
  not_invoiced: { label: 'Not invoiced', tone: 'neutral' },
  partially_invoiced: { label: 'Partially invoiced', tone: 'caution' },
  invoiced: { label: 'Invoiced', tone: 'info' },
};

export const INSPECTION_STATUS: Dict = {
  pending: { label: 'Inspection pending', tone: 'neutral' },
  passed: { label: 'Passed', tone: 'positive' },
  passed_with_observations: { label: 'Passed with observations', tone: 'caution' },
  failed: { label: 'Failed', tone: 'critical' },
};

export const MATCH_STATUS: Dict = {
  matched: { label: 'Matched', tone: 'positive' },
  mismatch: { label: 'Mismatch', tone: 'critical' },
  awaiting_review: { label: 'Awaiting review', tone: 'caution' },
};

export const INVOICE_APPROVAL_STATUS: Dict = {
  pending: { label: 'Pending', tone: 'caution' },
  approved: { label: 'Approved', tone: 'positive' },
  rejected: { label: 'Rejected', tone: 'critical' },
  returned: { label: 'Returned to vendor', tone: 'caution' },
};

export const INVOICE_PAYMENT_STATUS: Dict = {
  unpaid: { label: 'Unpaid', tone: 'neutral' },
  scheduled: { label: 'Scheduled', tone: 'info' },
  paid: { label: 'Paid', tone: 'positive' },
};

export const PAYMENT_STATUS: Dict = {
  awaiting_approval: { label: 'Awaiting approval', tone: 'caution' },
  approved: { label: 'Approved', tone: 'info' },
  processing: { label: 'Processing', tone: 'info' },
  paid: { label: 'Paid', tone: 'positive' },
  failed: { label: 'Failed', tone: 'critical' },
};

export const PRIORITY: Dict = {
  low: { label: 'Low', tone: 'neutral' },
  medium: { label: 'Medium', tone: 'info' },
  high: { label: 'High', tone: 'caution' },
  critical: { label: 'Critical', tone: 'critical' },
};

export const AMENDMENT_TYPE: Dict = {
  value_revision: { label: 'Value revision', tone: 'info' },
  timeline_extension: { label: 'Timeline extension', tone: 'info' },
  scope_change: { label: 'Scope change', tone: 'caution' },
  terms_revision: { label: 'Terms revision', tone: 'neutral' },
};

export const APPROVAL_DECISION: Dict = {
  approved: { label: 'Approved', tone: 'positive' },
  rejected: { label: 'Rejected', tone: 'critical' },
  returned: { label: 'Returned', tone: 'caution' },
  submitted: { label: 'Submitted', tone: 'info' },
  pending: { label: 'Pending', tone: 'neutral' },
};

export const ENTITY_LABEL: Record<string, string> = {
  procurement_plan: 'Procurement plan',
  contract: 'Contract',
  purchase_order: 'Purchase order',
  invoice: 'Invoice',
  payment: 'Payment',
  vendor: 'Vendor',
  amendment: 'Amendment',
  delivery: 'Delivery',
  vendor_evaluation: 'Vendor evaluation',
  user: 'User',
};

const FALLBACK: StatusMeta = { label: 'Unknown', tone: 'neutral' };

export function statusMeta(dict: Dict, key: string | null | undefined): StatusMeta {
  if (!key) return FALLBACK;
  return dict[key] ?? { label: key.replace(/_/g, ' '), tone: 'neutral' };
}

export function optionsFrom(dict: Dict): { value: string; label: string }[] {
  return Object.entries(dict).map(([value, meta]) => ({ value, label: meta.label }));
}
