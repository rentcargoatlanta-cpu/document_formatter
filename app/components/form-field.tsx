'use client';

import { memo, useCallback } from 'react';
import type { DocumentField } from '@/lib/documents/types';

interface FormFieldProps {
  field: DocumentField;
  value: string;
  onChange: (key: string, value: string) => void;
}

function inputTypeFor(field: DocumentField): string {
  switch (field.type) {
    case 'currency':
    case 'number':
      return 'number';
    case 'date':
      return 'date';
    case 'email':
      return 'email';
    case 'tel':
      return 'tel';
    default:
      return 'text';
  }
}

function inputStepFor(field: DocumentField): string | undefined {
  if (field.type === 'currency') return '0.01';
  if (field.type === 'number') return '1';
  return undefined;
}

function FormFieldInner({ field, value, onChange }: FormFieldProps) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(field.key, e.target.value);
    },
    [field.key, onChange],
  );

  const isComputed = field.computed === true;

  return (
    <label className="flex flex-col gap-1">
      <span
        className={`flex items-center gap-1.5 text-xs font-medium text-foreground/70 ${
          isComputed ? 'italic' : ''
        }`}
      >
        {field.label}
        {isComputed && (
          <span className="rounded bg-foreground/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-foreground/50">
            Auto
          </span>
        )}
      </span>
      <input
        type={inputTypeFor(field)}
        value={value}
        onChange={handleChange}
        placeholder={field.placeholder}
        step={inputStepFor(field)}
        readOnly={isComputed}
        className={`w-full rounded-md border px-3 py-1.5 text-sm transition-shadow
          ${
            isComputed
              ? 'cursor-default border-black/10 bg-foreground/5 text-foreground/60 dark:border-white/10'
              : 'border-black/15 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 dark:border-white/15'
          }
        `}
      />
    </label>
  );
}

export const FormField = memo(FormFieldInner);
