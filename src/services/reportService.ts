import { request } from './apiClient';
export interface ReportRow { reference: string; name: string; status: string; value: number; date: string }
export interface ReportData { rows: ReportRow[]; count: number; total: number }
export interface ReportFilters { report: string; department?: string; vendorId?: string; from?: string; to?: string }
export const reportService = { load(filters: ReportFilters): Promise<ReportData> { return request({ method: 'GET', path: '/reports/', params: filters }); } };
