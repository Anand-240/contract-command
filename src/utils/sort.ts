/** Case-insensitive comparator used by list filters before the table takes over. */
export function byField<T>(items: T[], field: keyof T, direction: 'asc' | 'desc' = 'asc'): T[] {
  return [...items].sort((a, b) => {
    const left = a[field];
    const right = b[field];
    if (typeof left === 'number' && typeof right === 'number') {
      return direction === 'asc' ? left - right : right - left;
    }
    const result = String(left).localeCompare(String(right), undefined, { sensitivity: 'base' });
    return direction === 'asc' ? result : -result;
  });
}

export function matchesSearch(haystacks: (string | number | null | undefined)[], needle: string): boolean {
  if (!needle.trim()) return true;
  const term = needle.trim().toLowerCase();
  return haystacks.some((value) => String(value ?? '').toLowerCase().includes(term));
}
