'use client';

import { useState, useEffect } from 'react';
import type { CargoVan } from '@/lib/cargo-vans/types';

export function useCargoVans() {
  const [vans, setVans] = useState<CargoVan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchVans() {
      try {
        const res = await fetch('/api/cargo-vans');
        if (!res.ok) {
          const body = await res.json();
          throw new Error(body.error || 'Failed to fetch vans');
        }
        const data: CargoVan[] = await res.json();
        if (!cancelled) {
          setVans(data);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to fetch vans');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchVans();
    return () => {
      cancelled = true;
    };
  }, []);

  return { vans, isLoading, error };
}
