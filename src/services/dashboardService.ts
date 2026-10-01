import type { ApprovalTask, AuditEntry, Contract } from '@/types';
import { request } from './apiClient';
export interface DashboardMetrics {
  activeContracts: number;
  activeContractsDelta: string;
  totalContractValue: number;
  procurementBudget: number;
  committedAmount: number;
  actualSpend: number;
  pendingApprovals: number;
  pendingApprovalsOverdue: number;
  outstandingInvoices: number;
  outstandingInvoiceValue: number;
  vendorsUnderReview: number;
  vendorCount: number;
  evaluationsCount: number;
  pendingDeliveries: number;
  pendingPayments: number;
}

export interface SpendBand {
  label: string;
  planned: number;
  committed: number;
  actual: number;
}

export interface DashboardData {
  metrics: DashboardMetrics;
  contractStatus: { status: string; label: string; count: number; value: number }[];
  spend: SpendBand[];
  spendTotals: { planned: number; committed: number; actual: number; remaining: number };
  pendingActions: ApprovalTask[];
  expiringContracts: (Contract & { daysRemaining: number })[];
  activity: AuditEntry[];
}

export const dashboardService = { load: () => request<DashboardData>({ method: 'GET', path: '/dashboard/' }) };
