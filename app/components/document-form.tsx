'use client';

import { useEffect, useState, useCallback } from 'react';
import type { DocumentTemplate } from '@/lib/documents/types';
import { useDocumentFormState } from '@/app/hooks/use-form-state';
import { useDebouncedPdfGeneration } from '@/app/hooks/use-debounced-pdf';
import { useCargoVans } from '@/app/hooks/use-cargo-vans';
import { FieldGroupCard } from '@/app/components/field-group-card';
import { VanSelector } from '@/app/components/van-selector';

interface DocumentFormProps {
  template: DocumentTemplate;
  onPdfGenerated: (base64: string) => void;
  onGeneratingChange?: (isGenerating: boolean) => void;
}

export function DocumentForm({
  template,
  onPdfGenerated,
  onGeneratingChange,
}: DocumentFormProps) {
  const { values, updateField, bulkUpdateFields } =
    useDocumentFormState(template);
  const { isPending, error } = useDebouncedPdfGeneration(
    template.id,
    values,
    onPdfGenerated,
  );

  const [selectedVanId, setSelectedVanId] = useState('');
  const { vans, isLoading: vansLoading, error: vansError } = useCargoVans();

  const handleVanSelect = useCallback(
    (vanId: string, fieldValues: Record<string, string>) => {
      setSelectedVanId(vanId);
      bulkUpdateFields(fieldValues);
    },
    [bulkUpdateFields],
  );

  // Sync isPending status to parent
  useEffect(() => {
    onGeneratingChange?.(isPending);
  }, [isPending, onGeneratingChange]);

  const visibleGroups = template.fieldGroups.filter((g) => !g.hidden);

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="flex flex-col gap-4 p-3 md:p-4 pb-5 md:pb-6">
        {visibleGroups.map((group) => (
          <FieldGroupCard
            key={group.id}
            group={group}
            values={values}
            onFieldChange={updateField}
            headerContent={
              group.id === 'vehicle' ? (
                <VanSelector
                  vans={vans}
                  isLoading={vansLoading}
                  error={vansError}
                  selectedVanId={selectedVanId}
                  onVanSelect={handleVanSelect}
                />
              ) : undefined
            }
          />
        ))}
      </div>

      {error && (
        <div className="px-4 pb-4">
          <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-base text-destructive">
            {error}
          </p>
        </div>
      )}
    </div>
  );
}
