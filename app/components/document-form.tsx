'use client';

import { useEffect } from 'react';
import type { DocumentTemplate } from '@/lib/documents/types';
import { useDocumentFormState } from '@/app/hooks/use-form-state';
import { useDebouncedPdfGeneration } from '@/app/hooks/use-debounced-pdf';
import { FieldGroupCard } from '@/app/components/field-group-card';

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
  const { values, updateField } = useDocumentFormState(template);
  const { isPending, error } = useDebouncedPdfGeneration(
    values,
    onPdfGenerated,
  );

  // Sync isPending status to parent
  useEffect(() => {
    onGeneratingChange?.(isPending);
  }, [isPending, onGeneratingChange]);

  const visibleGroups = template.fieldGroups.filter((g) => !g.hidden);

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="flex flex-col gap-3 p-4">
        {visibleGroups.map((group) => (
          <FieldGroupCard
            key={group.id}
            group={group}
            values={values}
            onFieldChange={updateField}
          />
        ))}
      </div>

      {error && (
        <div className="px-4 pb-4">
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-400">
            {error}
          </p>
        </div>
      )}
    </div>
  );
}
