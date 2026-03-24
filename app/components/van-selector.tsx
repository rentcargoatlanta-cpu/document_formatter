'use client';

import { useCallback } from 'react';
import type { CargoVan } from '@/lib/cargo-vans/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface VanSelectorProps {
  vans: CargoVan[];
  isLoading: boolean;
  error: string | null;
  selectedVanId: string;
  onVanSelect: (vanId: string, fieldValues: Record<string, string>) => void;
}

function formatVanLabel(van: CargoVan): string {
  return `${van.year} ${van.make} ${van.model} \u2014 ${van.color}`;
}

export function VanSelector({
  vans,
  isLoading,
  error,
  selectedVanId,
  onVanSelect,
}: VanSelectorProps) {
  const handleValueChange = useCallback(
    (value: string | null) => {
      if (!value) return;
      const van = vans.find((v) => v.id === value);
      if (van) {
        onVanSelect(van.id, {
          make: van.make,
          model: van.model,
          year: String(van.year),
          color: van.color,
        });
      }
    },
    [vans, onVanSelect],
  );

  const isDisabled = isLoading || error !== null;

  const placeholder = isLoading
    ? 'Loading vans...'
    : error !== null
      ? 'Failed to load vans'
      : 'Select a cargo van...';

  return (
    <div className="mb-4">
      <label className="flex flex-col items-start gap-2 md:gap-1.5">
        <span className="text-base font-medium text-foreground/70">
          Cargo Van
        </span>
        <Select
          value={selectedVanId || undefined}
          onValueChange={handleValueChange}
          disabled={isDisabled}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {vans.map((van) => (
              <SelectItem key={van.id} value={van.id}>
                {formatVanLabel(van)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>
      {error && (
        <p className="mt-1.5 text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
