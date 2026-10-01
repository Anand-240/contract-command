import type { Notification } from '@/types';
import { request } from './apiClient';
export const notificationService = {
  list: () => request<Notification[]>({ method: 'GET', path: '/notifications/' }),
  markRead: (id: string) => request<Notification[]>({ method: 'POST', path: `/notifications/${id}/read/` }),
  markAllRead: () => request<Notification[]>({ method: 'POST', path: '/notifications/read-all/' }),
};
