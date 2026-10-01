import { useCallback, useEffect, useRef, useState } from 'react';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Runs an async service call and exposes the four states every page needs:
 * loading, error, empty and populated.
 */
export function useAsync<T>(factory: () => Promise<T>, deps: unknown[] = []): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [nonce, setNonce] = useState(0);
  const latest = useRef(0);

  // The factory identity changes on every render, so the caller's deps drive the effect.
  const run = useRef(factory);
  run.current = factory;

  useEffect(() => {
    const ticket = ++latest.current;
    let active = true;
    setLoading(true);
    setError(null);

    run
      .current()
      .then((result) => {
        if (!active || ticket !== latest.current) return;
        setData(result);
      })
      .catch((err: unknown) => {
        if (!active || ticket !== latest.current) return;
        setError(err instanceof Error ? err : new Error('Request failed'));
      })
      .finally(() => {
        if (!active || ticket !== latest.current) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  const refetch = useCallback(() => setNonce((value) => value + 1), []);

  return { data, loading, error, refetch };
}
