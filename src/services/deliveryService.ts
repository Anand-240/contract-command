import type { Delivery, DeliveryLine } from '@/types';
import { request } from './apiClient';
export interface DeliveryFilters { search?: string; status?: string; inspectionStatus?: string; poId?: string }
export const deliveryService = {
  list: (params: DeliveryFilters = {}) => request<Delivery[]>({ method: 'GET', path: '/deliveries/', params }),
  get: (id: string) => request<Delivery>({ method: 'GET', path: `/deliveries/${id}/` }),
  forPurchaseOrder: (poId: string) => request<Delivery | null>({ method: 'GET', path: `/purchase-orders/${poId}/delivery/` }),
  record: (id: string, body: { deliveryDate: string; reference: string; receivedBy: string; inspectionStatus: Delivery['inspectionStatus']; notes: string; lines: Pick<DeliveryLine, 'itemId' | 'delivered' | 'accepted' | 'rejected' | 'remarks'>[] }) => request<Delivery>({ method: 'PATCH', path: `/deliveries/${id}/`, body }),
};
