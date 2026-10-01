import axios, { AxiosError } from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';
const TOKEN_KEY = 'cc.token';

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
export interface RequestSpec {
  method: HttpMethod;
  path: string;
  params?: object;
  body?: unknown;
}

export class ApiError extends Error {
  constructor(message: string, public status = 500, public errors?: unknown) {
    super(message);
    this.name = 'ApiError';
  }
}

export const api = axios.create({ baseURL: API_BASE_URL, headers: { 'Content-Type': 'application/json' }, timeout: 15000 });
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Token ${token}`;
  return config;
});
api.interceptors.response.use((response) => response, (error: AxiosError) => {
  const status = error.response?.status ?? 0;
  const data = error.response?.data as { message?: string; detail?: string; errors?: unknown } | undefined;
  if (status === 401) {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem('cc.user');
    window.dispatchEvent(new Event('cc:unauthorized'));
  }
  const details = data?.errors ?? data;
  const fieldMessage = data && typeof data === 'object'
    ? Object.values(data).flat().filter((item): item is string => typeof item === 'string').join(' ')
    : '';
  const message = data?.message ?? data?.detail ?? fieldMessage ?? (status === 0 ? 'Cannot reach the server.' : `Request failed (${status}).`);
  return Promise.reject(new ApiError(message, status, details));
});

export function setAuthToken(token: string | null) {
  if (token) sessionStorage.setItem(TOKEN_KEY, token);
  else sessionStorage.removeItem(TOKEN_KEY);
}
export function getAuthToken() { return sessionStorage.getItem(TOKEN_KEY); }

export async function request<T>(spec: RequestSpec, _resolve?: () => T): Promise<T> {
  const response = await api.request<T>({ method: spec.method, url: spec.path, params: spec.params, data: spec.body });
  return response.data;
}

export function notFound(entity: string, id: string): never {
  throw new ApiError(`${entity} ${id} was not found`, 404);
}
export function paginate<T>(rows: T[], page = 1, pageSize = 10) {
  const start = (page - 1) * pageSize;
  return { results: rows.slice(start, start + pageSize), count: rows.length, page, pageSize };
}
