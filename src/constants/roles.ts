import type { Role } from '@/types';

export const ROLE_LABEL: Record<Role, string> = {
  admin: 'Administrator',
  procurement_officer: 'Procurement Officer',
  approver: 'Approver',
  vendor_manager: 'Vendor Manager',
  auditor: 'Auditor',
};

export const ROLE_SUMMARY: Record<Role, string> = {
  admin: 'Manages all platform workflows',
  procurement_officer: 'Creates plans, contracts and purchase orders',
  approver: 'Clears plans, contracts, invoices and payments',
  vendor_manager: 'Maintains vendor records, compliance and evaluations',
  auditor: 'Read-only access to records, audit trail and reports',
};

/** Every gated action in the UI. Buttons check these instead of the role directly. */
export type Permission =
  | 'plan.create'
  | 'plan.submit'
  | 'contract.create'
  | 'contract.amend'
  | 'contract.submit'
  | 'po.create'
  | 'delivery.record'
  | 'invoice.create'
  | 'invoice.match'
  | 'invoice.return'
  | 'approve.plan'
  | 'approve.contract'
  | 'approve.invoice'
  | 'approve.payment'
  | 'vendor.manage'
  | 'vendor.evaluate'
  | 'payment.release'
  | 'settings.manage';

const MATRIX: Record<Role, Permission[]> = {
  admin: ['plan.create', 'plan.submit', 'contract.create', 'contract.amend', 'contract.submit', 'po.create', 'delivery.record', 'invoice.create', 'invoice.match', 'invoice.return', 'approve.plan', 'approve.contract', 'approve.invoice', 'approve.payment', 'vendor.manage', 'vendor.evaluate', 'payment.release', 'settings.manage'],
  procurement_officer: [
    'vendor.manage',
    'plan.create',
    'plan.submit',
    'contract.create',
    'contract.amend',
    'contract.submit',
    'po.create',
    'delivery.record',
    'invoice.create',
    'invoice.match',
  ],
  approver: [
    'approve.plan',
    'approve.contract',
    'approve.invoice',
    'approve.payment',
    'payment.release',
    'invoice.return',
  ],
  vendor_manager: ['vendor.manage', 'vendor.evaluate', 'delivery.record'],
  auditor: [],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return MATRIX[role].includes(permission);
}

export function permissionsFor(role: Role): Permission[] {
  return MATRIX[role];
}
