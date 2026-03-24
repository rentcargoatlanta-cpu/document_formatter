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
        />
      )}
    </Label>
  );
}

export const FormField = memo(FormFieldInner);
