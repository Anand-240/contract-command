import type { POItem, PurchaseOrder } from '@/types';
import { request } from './apiClient';
export interface POFilters { search?: string; deliveryStatus?: string; invoiceStatus?: string; vendorId?: string; contractId?: string }
export const purchaseOrderService = {
  list: (params: POFilters = {}) => request<PurchaseOrder[]>({ method: 'GET', path: '/purchase-orders/', params }),
  get: (id: string) => request<PurchaseOrder>({ method: 'GET', path: `/purchase-orders/${id}/` }),
  create: (body: { contractId: string; vendorId: string; orderDate: string; expectedDelivery: string; deliveryLocation: string; notes: string; items: Omit<POItem, 'id' | 'total'>[]; owner: string }) => request<PurchaseOrder>({ method: 'POST', path: '/purchase-orders/', body }),
};
