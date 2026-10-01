import type { ProcurementPlan } from '@/types';
import { request } from './apiClient';
import { uploadDocument } from './documentService';
export interface PlanFilters { search?: string; status?: string; department?: string; priority?: string }
export const procurementService = {
  uploadDocument: (id: string, file: File) => uploadDocument('procurement-plans', id, file),
  list: (params: PlanFilters = {}) => request<ProcurementPlan[]>({ method: 'GET', path: '/procurement-plans/', params }),
  get: (id: string) => request<ProcurementPlan>({ method: 'GET', path: `/procurement-plans/${id}/` }),
  create: (body: Partial<ProcurementPlan>) => request<ProcurementPlan>({ method: 'POST', path: '/procurement-plans/', body }),
  update: (id: string, body: Partial<ProcurementPlan>) => request<ProcurementPlan>({ method: 'PATCH', path: `/procurement-plans/${id}/`, body }),
  submit: (id: string) => request<ProcurementPlan>({ method: 'POST', path: `/procurement-plans/${id}/submit/` }),
};
