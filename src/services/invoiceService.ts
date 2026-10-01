import type { Invoice } from '@/types';
import { request } from './apiClient';
export interface InvoiceFilters { search?: string; matchStatus?: string; approvalStatus?: string; paymentStatus?: string; vendorId?: string; poId?: string }
export const invoiceService = {
  list: (params: InvoiceFilters = {}) => request<Invoice[]>({ method: 'GET', path: '/invoices/', params }),
  get: (id: string) => request<Invoice>({ method: 'GET', path: `/invoices/${id}/` }),
  create: (body: Partial<Invoice>) => request<Invoice>({ method: 'POST', path: '/invoices/', body }),
  correct: (id: string, body: Pick<Invoice, 'lines' | 'taxAmount'>) => request<Invoice>({ method: 'PATCH', path: `/invoices/${id}/`, body }),
  match: (id: string) => request<Invoice>({ method: 'POST', path: `/invoices/${id}/match/` }),
  approve: (id: string, remarks: string) => request<Invoice>({ method: 'POST', path: `/invoices/${id}/approve/`, body: { remarks } }),
  returnToVendor: (id: string, remarks: string) => request<Invoice>({ method: 'POST', path: `/invoices/${id}/return/`, body: { remarks } }),
};
