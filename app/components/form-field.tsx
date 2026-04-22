'use client';

import { memo, useCallback } from 'react';
import type { DocumentField } from '@/lib/documents/types';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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
    case 'datetime':
      return 'datetime-local';
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

function inputModeFor(
  field: DocumentField,
): React.HTMLAttributes<HTMLInputElement>['inputMode'] | undefined {
  if (field.digitsOnly) return 'numeric';
  switch (field.type) {
    case 'currency':
      return 'decimal';
    case 'number':
      return 'numeric';
    case 'email':
      return 'email';
    case 'tel':
      return 'tel';
    default:
      return undefined;
  }
}

function autoCompleteFor(field: DocumentField): string | undefined {
  if (field.digitsOnly) return 'off';
  if (field.computed) return 'off';
  switch (field.type) {
    case 'email':
      return 'email';
    case 'tel':
      return 'tel';
    default:
      return undefined;
  }
}

function FormFieldInner({ field, value, onChange }: FormFieldProps) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      let next = e.target.value;
      if (field.digitsOnly) next = next.replace(/\D/g, '');
      if (field.maxLength !== undefined) next = next.slice(0, field.maxLength);
      onChange(field.key, next);
    },
    [field.key, field.digitsOnly, field.maxLength, onChange],
  );

  const isComputed = field.computed === true;

  return (
    <Label className="flex flex-col items-start gap-2 md:gap-1.5">
      <span
        className={cn(
          'flex items-center gap-1.5 text-base font-medium text-foreground/70',
          isComputed && 'italic',
        )}
      >
        {field.label}
        {isComputed && (
          <Badge
            variant="outline"
            className="px-1.5 py-0 text-sm font-semibold uppercase tracking-wide"
          >
            Auto
          </Badge>
        )}
      </span>
      {isComputed ? (
        <Tooltip>
          <TooltipTrigger>
            <Input
              type={inputTypeFor(field)}
              value={value}
              onChange={handleChange}
              placeholder={field.placeholder}
              step={inputStepFor(field)}
              readOnly
              className="cursor-default bg-muted/50 text-muted-foreground"
            />
          </TooltipTrigger>
          <TooltipContent>Automatically calculated</TooltipContent>
        </Tooltip>
      ) : (
        <Input
          type={inputTypeFor(field)}
          value={value}
          onChange={handleChange}
          placeholder={field.placeholder}
          step={inputStepFor(field)}
          maxLength={field.maxLength}
          inputMode={inputModeFor(field)}
          pattern={field.digitsOnly ? '[0-9]*' : undefined}
          autoComplete={autoCompleteFor(field)}
        />
      )}
    </Label>
  );
}

export const FormField = memo(FormFieldInner);
