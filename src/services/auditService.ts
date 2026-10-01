import type { AuditEntry } from '@/types';
import { request } from './apiClient';
export interface AuditFilters { search?: string; user?: string; role?: string; entityType?: string; action?: string; from?: string; to?: string; entityId?: string }
export const auditService = {
  list: (params: AuditFilters = {}) => request<AuditEntry[]>({ method: 'GET', path: '/audit-log/', params }),
  forEntity: (entityId: string) => request<AuditEntry[]>({ method: 'GET', path: '/audit-log/', params: { entityId } }),
  facets: () => request<{ users: string[]; roles: string[]; actions: string[] }>({ method: 'GET', path: '/audit-log/facets/' }),
};
