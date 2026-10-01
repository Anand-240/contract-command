import type { Role } from '@/types';

type Step = { label: string; description: string; to: string };
type Workspace = { title: string; description: string; steps: Step[] };

export const ROLE_WORKSPACES: Record<Role, Workspace> = {
  admin: {
    title: 'Platform overview',
    description: 'Monitor every stage of the procurement chain and resolve work across teams.',
    steps: [
      { label: 'Approval queue', description: 'Review pending decisions.', to: '/app/approvals' },
      { label: 'Procurement plans', description: 'Follow cases into contracts.', to: '/app/procurement' },
      { label: 'Audit log', description: 'Inspect recorded changes.', to: '/app/audit' },
    ],
  },
  procurement_officer: {
    title: 'Build the procurement record',
    description: 'Register the supplier, submit the plan, issue the contract and order, then reconcile delivery and invoice.',
    steps: [
      { label: 'Register vendor', description: 'Record compliance and certifications.', to: '/app/vendors/new' },
      { label: 'Create plan', description: 'Define need, budget and timeline.', to: '/app/procurement/new' },
      { label: 'Manage contracts', description: 'Convert approved plans into agreements.', to: '/app/contracts' },
      { label: 'Purchase orders', description: 'Issue orders against active contracts.', to: '/app/purchase-orders' },
      { label: 'Deliveries', description: 'Record accepted quantities.', to: '/app/deliveries' },
      { label: 'Invoices', description: 'Record claims and run three way match.', to: '/app/invoices' },
    ],
  },
  approver: {
    title: 'Decide and release',
    description: 'Review submitted plans and contracts, approve matched invoices, then release payments.',
    steps: [
      { label: 'Approval queue', description: 'Open cases waiting for your decision.', to: '/app/approvals' },
      { label: 'Contracts', description: 'Review agreements and amendments.', to: '/app/contracts' },
      { label: 'Invoices', description: 'Inspect match evidence before approval.', to: '/app/invoices' },
      { label: 'Payments', description: 'Approve and record the bank release.', to: '/app/payments' },
    ],
  },
  vendor_manager: {
    title: 'Qualify suppliers and receipts',
    description: 'Maintain supplier compliance, record evaluations and confirm delivered goods.',
    steps: [
      { label: 'Vendors', description: 'Maintain profiles and certification evidence.', to: '/app/vendors' },
      { label: 'Evaluations', description: 'Score delivery, compliance, quality and cost.', to: '/app/evaluations' },
      { label: 'Deliveries', description: 'Inspect and accept purchase order items.', to: '/app/deliveries' },
    ],
  },
  auditor: {
    title: 'Review the evidence',
    description: 'Read the full chain, export reports and trace every recorded decision without editing records.',
    steps: [
      { label: 'Audit log', description: 'Inspect chronological changes.', to: '/app/audit' },
      { label: 'Reports', description: 'Filter and export financial summaries.', to: '/app/reports' },
      { label: 'Contracts', description: 'Trace agreements to plans and orders.', to: '/app/contracts' },
      { label: 'Payments', description: 'Verify approved invoice settlement.', to: '/app/payments' },
    ],
  },
};

function includes(role: Role, roles: Role[]) {
  return roles.includes(role);
}

export function canAccessPath(role: Role, pathname: string): boolean {
  if (role === 'admin') return true;
  const [, area, id, action] = pathname.split('/').filter(Boolean);
  if (!pathname.startsWith('/app/')) return true;
  if (area === 'dashboard' || area === 'settings') return true;
  if (area === 'procurement') {
    if (id === 'new') return role === 'procurement_officer';
    return includes(role, ['procurement_officer', 'approver', 'auditor']);
  }
  if (area === 'contracts') {
    if (id === 'new' || action === 'amend') return role === 'procurement_officer';
    return id ? includes(role, ['procurement_officer', 'approver', 'vendor_manager', 'auditor']) : includes(role, ['procurement_officer', 'approver', 'auditor']);
  }
  if (area === 'purchase-orders') {
    if (id === 'new') return role === 'procurement_officer';
    return id ? includes(role, ['procurement_officer', 'approver', 'vendor_manager', 'auditor']) : includes(role, ['procurement_officer', 'vendor_manager', 'auditor']);
  }
  if (area === 'deliveries') return id ? includes(role, ['procurement_officer', 'approver', 'vendor_manager', 'auditor']) : includes(role, ['procurement_officer', 'vendor_manager', 'auditor']);
  if (area === 'vendors') {
    if (id === 'new' || action === 'edit') return includes(role, ['procurement_officer', 'vendor_manager']);
    if (action === 'evaluate') return role === 'vendor_manager';
    return id ? includes(role, ['procurement_officer', 'approver', 'vendor_manager', 'auditor']) : includes(role, ['procurement_officer', 'vendor_manager', 'auditor']);
  }
  if (area === 'evaluations') return includes(role, ['vendor_manager', 'auditor']);
  if (area === 'invoices') {
    if (id === 'new' || action === 'correct') return role === 'procurement_officer';
    return includes(role, ['procurement_officer', 'approver', 'auditor']);
  }
  if (area === 'approvals') return role === 'approver';
  if (area === 'payments') return includes(role, ['approver', 'auditor']);
  if (area === 'audit' || area === 'reports') return role === 'auditor';
  return true;
}
