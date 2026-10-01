import type { Payment } from '@/types';
import { request } from './apiClient';
export interface PaymentFilters { search?: string; status?: string; vendorId?: string; invoiceId?: string }
export const paymentService = {
  list: (params: PaymentFilters = {}) => request<Payment[]>({ method: 'GET', path: '/payments/', params }),
  get: (id: string) => request<Payment>({ method: 'GET', path: `/payments/${id}/` }),
  create: (invoiceId: string, amount: number) => request<Payment>({ method: 'POST', path: '/payments/', body: { invoiceId, amount, method: 'Bank transfer' } }),
  transition: (id: string, status: Payment['status'], reference = '') => request<Payment>({ method: 'POST', path: `/payments/${id}/transition/`, body: { status, reference } }),
  approve: (id: string) => request<Payment>({ method: 'POST', path: `/payments/${id}/approve/` }),
};
