'use client';

import { useEffect, useRef, useTransition, useState, useCallback } from 'react';
import { generateFilledPdf } from '@/app/actions/generate-pdf';

/**
 * Debounces PDF generation: waits for the user to stop typing, then calls
 * the server action. Uses a request counter to discard stale results.
 */
export function useDebouncedPdfGeneration(
  templateId: string,
  values: Record<string, string>,
  onPdfGenerated: (base64: string) => void,
  delay = 500,
): { isPending: boolean; error: string | null } {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestCounterRef = useRef(0);

  // Stable reference so the effect doesn't re-fire when the callback identity changes
  const onPdfGeneratedRef = useRef(onPdfGenerated);
  useEffect(() => {
    onPdfGeneratedRef.current = onPdfGenerated;
  }, [onPdfGenerated]);

  const hasNonEmptyValue = useCallback(
    (vals: Record<string, string>): boolean =>
      Object.values(vals).some((v) => v.trim() !== ''),
    [],
  );

  useEffect(() => {
    // Skip when all values are empty
    if (!hasNonEmptyValue(values)) return;

    // Clear any previously scheduled generation
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      const currentRequest = ++requestCounterRef.current;
      setError(null);

      startTransition(async () => {
        try {
          const base64 = await generateFilledPdf(templateId, values);

          // Only apply result if this is still the latest request
          if (currentRequest === requestCounterRef.current) {
            onPdfGeneratedRef.current(base64);
          }
        } catch (err: unknown) {
          if (currentRequest === requestCounterRef.current) {
            const message =
              err instanceof Error ? err.message : 'Failed to generate PDF';
            setError(message);
          }
        }
      });
    }, delay);

    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [templateId, values, delay, hasNonEmptyValue]);

  return { isPending, error };
}
