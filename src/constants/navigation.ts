import {
  LayoutDashboard,
  ClipboardList,
  FileText,
  ShoppingCart,
  Truck,
  Building2,
  Gauge,
  Receipt,
  Banknote,
  CheckSquare,
  ScrollText,
  BarChart3,
  type LucideIcon,
} from 'lucide-react';
import type { Role } from '@/types';

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  /** Roles that see the item. Undefined means every role. */
  roles?: Role[];
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [{ label: 'Dashboard', to: '/app/dashboard', icon: LayoutDashboard }],
  },
  {
    label: 'Acquisition',
    items: [
      { label: 'Procurement Plans', to: '/app/procurement', icon: ClipboardList, roles: ['admin', 'procurement_officer', 'approver', 'auditor'] },
      { label: 'Contracts', to: '/app/contracts', icon: FileText, roles: ['admin', 'procurement_officer', 'approver', 'auditor'] },
      { label: 'Purchase Orders', to: '/app/purchase-orders', icon: ShoppingCart, roles: ['admin', 'procurement_officer', 'vendor_manager', 'auditor'] },
      { label: 'Deliveries', to: '/app/deliveries', icon: Truck, roles: ['admin', 'procurement_officer', 'vendor_manager', 'auditor'] },
    ],
  },
  {
    label: 'Vendors',
    items: [
      { label: 'Vendors', to: '/app/vendors', icon: Building2, roles: ['admin', 'procurement_officer', 'vendor_manager', 'auditor'] },
      { label: 'Evaluations', to: '/app/evaluations', icon: Gauge, roles: ['admin', 'vendor_manager', 'auditor'] },
    ],
  },
  {
    label: 'Finance',
    items: [
      { label: 'Invoices', to: '/app/invoices', icon: Receipt, roles: ['admin', 'procurement_officer', 'approver', 'auditor'] },
      { label: 'Approvals', to: '/app/approvals', icon: CheckSquare, roles: ['admin', 'approver'] },
      { label: 'Payments', to: '/app/payments', icon: Banknote, roles: ['admin', 'approver', 'auditor'] },
    ],
  },
  {
    label: 'Governance',
    items: [
      { label: 'Audit Logs', to: '/app/audit', icon: ScrollText, roles: ['admin', 'auditor'] },
      { label: 'Reports', to: '/app/reports', icon: BarChart3, roles: ['admin', 'auditor'] },
    ],
  },
];

/** Route to breadcrumb and title metadata. Longest match wins. */
export const ROUTE_META: { match: RegExp; title: string; trail: { label: string; to?: string }[] }[] = [
  { match: /^\/app\/dashboard$/, title: 'Dashboard', trail: [{ label: 'Dashboard' }] },

  { match: /^\/app\/procurement$/, title: 'Procurement Plans', trail: [{ label: 'Procurement Plans' }] },
  { match: /^\/app\/procurement\/new$/, title: 'New Procurement Plan', trail: [{ label: 'Procurement Plans', to: '/app/procurement' }, { label: 'New plan' }] },
  { match: /^\/app\/procurement\/[^/]+$/, title: 'Procurement Plan', trail: [{ label: 'Procurement Plans', to: '/app/procurement' }, { label: 'Plan detail' }] },

  { match: /^\/app\/contracts$/, title: 'Contracts', trail: [{ label: 'Contracts' }] },
  { match: /^\/app\/contracts\/new$/, title: 'New Contract', trail: [{ label: 'Contracts', to: '/app/contracts' }, { label: 'New contract' }] },
  { match: /^\/app\/contracts\/[^/]+\/amend$/, title: 'Contract Amendment', trail: [{ label: 'Contracts', to: '/app/contracts' }, { label: 'Amendment' }] },
  { match: /^\/app\/contracts\/[^/]+$/, title: 'Contract', trail: [{ label: 'Contracts', to: '/app/contracts' }, { label: 'Contract detail' }] },

  { match: /^\/app\/purchase-orders$/, title: 'Purchase Orders', trail: [{ label: 'Purchase Orders' }] },
  { match: /^\/app\/purchase-orders\/new$/, title: 'New Purchase Order', trail: [{ label: 'Purchase Orders', to: '/app/purchase-orders' }, { label: 'New order' }] },
  { match: /^\/app\/purchase-orders\/[^/]+$/, title: 'Purchase Order', trail: [{ label: 'Purchase Orders', to: '/app/purchase-orders' }, { label: 'Order detail' }] },

  { match: /^\/app\/deliveries$/, title: 'Deliveries', trail: [{ label: 'Deliveries' }] },
  { match: /^\/app\/deliveries\/[^/]+$/, title: 'Delivery Confirmation', trail: [{ label: 'Deliveries', to: '/app/deliveries' }, { label: 'Confirmation' }] },

  { match: /^\/app\/vendors$/, title: 'Vendors', trail: [{ label: 'Vendors' }] },
  { match: /^\/app\/vendors\/[^/]+\/evaluate$/, title: 'Vendor Evaluation', trail: [{ label: 'Vendors', to: '/app/vendors' }, { label: 'Evaluation' }] },
  { match: /^\/app\/vendors\/[^/]+$/, title: 'Vendor Profile', trail: [{ label: 'Vendors', to: '/app/vendors' }, { label: 'Profile' }] },
  { match: /^\/app\/evaluations$/, title: 'Vendor Evaluations', trail: [{ label: 'Evaluations' }] },

  { match: /^\/app\/invoices$/, title: 'Invoices', trail: [{ label: 'Invoices' }] },
  { match: /^\/app\/invoices\/[^/]+\/match$/, title: 'Three Way Match', trail: [{ label: 'Invoices', to: '/app/invoices' }, { label: 'Match' }] },
  { match: /^\/app\/invoices\/[^/]+$/, title: 'Invoice', trail: [{ label: 'Invoices', to: '/app/invoices' }, { label: 'Invoice detail' }] },

  { match: /^\/app\/approvals$/, title: 'Approval Queue', trail: [{ label: 'Approvals' }] },

  { match: /^\/app\/payments$/, title: 'Payments', trail: [{ label: 'Payments' }] },
  { match: /^\/app\/payments\/[^/]+$/, title: 'Payment', trail: [{ label: 'Payments', to: '/app/payments' }, { label: 'Payment detail' }] },

  { match: /^\/app\/audit$/, title: 'Audit Log', trail: [{ label: 'Audit Log' }] },
  { match: /^\/app\/reports$/, title: 'Reports', trail: [{ label: 'Reports' }] },
  { match: /^\/app\/settings$/, title: 'Settings', trail: [{ label: 'Settings' }] },
];

export function routeMeta(pathname: string) {
  return (
    ROUTE_META.find((entry) => entry.match.test(pathname)) ?? {
      title: 'ContractCommand',
      trail: [{ label: 'ContractCommand' }],
    }
  );
}
