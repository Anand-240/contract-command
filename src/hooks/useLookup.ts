import { useMemo } from 'react';
import { useAsync } from './useAsync';
import { vendorService } from '@/services/vendorService';

export function useLookup() {
  const { data: vendors } = useAsync(() => vendorService.list(), []);
  return useMemo(() => ({
    vendorName: (id: string) => vendors?.find((row) => row.id === id)?.name ?? id,
    vendor: (id: string) => vendors?.find((row) => row.id === id) ?? null,
  }), [vendors]);
}
