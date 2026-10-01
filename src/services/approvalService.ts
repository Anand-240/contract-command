import type { ApprovalTask } from '@/types';
import { request } from './apiClient';
export interface ApprovalFilters { search?: string; entityType?: string; priority?: string; department?: string }
export type ApprovalDecision = 'approve' | 'reject' | 'request_changes';
export const approvalService = {
  list: (params: ApprovalFilters = {}) => request<ApprovalTask[]>({ method: 'GET', path: '/approvals/', params }),
  get: (id: string) => request<ApprovalTask>({ method: 'GET', path: `/approvals/${id}/` }),
  decide: (id: string, decision: ApprovalDecision, remarks: string) => request<{ id: string }>({ method: 'POST', path: `/approvals/${id}/decision/`, body: { decision, remarks } }),
};
