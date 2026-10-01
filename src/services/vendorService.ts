import type { Vendor, VendorEvaluation } from '@/types';
import { request } from './apiClient';
import { uploadDocument } from './documentService';
export interface VendorFilters { search?: string; complianceStatus?: string; category?: string; minRating?: number; active?: 'true' | 'false' }
export const vendorService = {
  uploadDocument: (id: string, file: File) => uploadDocument('vendors', id, file),
  list: (params: VendorFilters = {}) => request<Vendor[]>({ method: 'GET', path: '/vendors/', params }),
  get: (id: string) => request<Vendor>({ method: 'GET', path: `/vendors/${id}/` }),
  create: (body: Partial<Vendor>) => request<Vendor>({ method: 'POST', path: '/vendors/', body }),
  update: (id: string, body: Partial<Vendor>) => request<Vendor>({ method: 'PATCH', path: `/vendors/${id}/`, body }),
  evaluations: (vendorId: string) => request<VendorEvaluation[]>({ method: 'GET', path: `/vendors/${vendorId}/evaluations/` }),
  allEvaluations: () => request<VendorEvaluation[]>({ method: 'GET', path: '/vendor-evaluations/' }),
  createEvaluation: (vendorId: string, body: Omit<VendorEvaluation, 'id' | 'vendorId'>) => request<VendorEvaluation>({ method: 'POST', path: `/vendors/${vendorId}/evaluations/`, body }),
};
