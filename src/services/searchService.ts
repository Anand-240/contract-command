import { request } from './apiClient';
export interface SearchHit { group: string; code: string; title: string; to: string }
export const searchService = { query: (q: string) => request<SearchHit[]>({ method: 'GET', path: '/search/', params: { q } }) };
