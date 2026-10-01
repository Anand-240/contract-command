import type { Amendment, Contract, ContractStatus } from '@/types';
import { request } from './apiClient';
import { uploadDocument } from './documentService';
export interface ContractFilters { search?: string; status?: string; vendorId?: string; minValue?: number; expiringWithinDays?: number }
export const contractService = {
  list: (params: ContractFilters = {}) => request<Contract[]>({ method: 'GET', path: '/contracts/', params }),
  get: (id: string) => request<Contract>({ method: 'GET', path: `/contracts/${id}/` }),
  create: (body: Partial<Contract>) => request<Contract>({ method: 'POST', path: '/contracts/', body }),
  update: (id: string, body: Partial<Contract>) => request<Contract>({ method: 'PATCH', path: `/contracts/${id}/`, body }),
  transition: (id: string, status: ContractStatus) => request<Contract>({ method: 'POST', path: `/contracts/${id}/transition/`, body: { status } }),
  createAmendment: (id: string, body: Omit<Amendment, 'id' | 'version' | 'createdAt' | 'status' | 'documents' | 'requestedBy' | 'approver'>) => request<Contract>({ method: 'POST', path: `/contracts/${id}/amendments/`, body }),
  decideAmendment: (id: string, amendmentId: string, decision: 'approve' | 'reject') => request<Contract>({ method: 'POST', path: `/contracts/${id}/amendments/${amendmentId}/decide/`, body: { decision } }),
  uploadDocument: (id: string, file: File) => uploadDocument('contracts', id, file),
  uploadAmendmentDocument: (id: string, file: File) => uploadDocument('amendments', id, file),
};
