import { api } from './apiClient';
export async function uploadDocument(entity: 'vendors' | 'procurement-plans' | 'contracts' | 'amendments', id: string, file: File): Promise<void> {
  const data = new FormData(); data.append('file', file);
  await api.post(`/${entity}/${id}/documents/`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
}
export async function downloadDocument(id: string, filename: string): Promise<void> {
  const response = await api.get(`/documents/${id}/download/`, { responseType: 'blob' });
  const url = URL.createObjectURL(response.data);
  const link = document.createElement('a'); link.href = url; link.download = filename; link.click();
  URL.revokeObjectURL(url);
}
