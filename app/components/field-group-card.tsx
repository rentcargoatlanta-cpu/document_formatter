'use client';

import { useState, useMemo } from 'react';
import type { FieldGroup } from '@/lib/documents/types';
import { FormField } from '@/app/components/form-field';

interface FieldGroupCardProps {
  group: FieldGroup;
  values: Record<string, string>;
  onFieldChange: (key: string, value: string) => void;
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
      aria-hidden="true"
    >
      <path
        d="M4 6L8 10L12 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function FieldGroupCard({
  group,
  values,
  onFieldChange,
}: FieldGroupCardProps) {
  const [isOpen, setIsOpen] = useState(true);

  const filledCount = useMemo(() => {
    return group.fields.filter((f) => {
      const val = values[f.key];
      return val !== undefined && val.trim() !== '';
    }).length;
  }, [group.fields, values]);

  const totalCount = group.fields.length;

  return (
    <div className="overflow-hidden rounded-lg border border-black/10 bg-background dark:border-white/10">
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-foreground/[.03]"
      >
        <span className="text-sm font-semibold text-foreground">
          {group.name}
        </span>
        <span className="flex items-center gap-2">
          <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-xs font-medium tabular-nums text-foreground/60">
            {filledCount}/{totalCount}
          </span>
          <ChevronIcon open={isOpen} />
        </span>
      </button>

      {/* Collapsible content */}
      <div
        className="grid transition-[grid-template-rows] duration-200 ease-in-out"
        style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          <div className="flex flex-col gap-3 border-t border-black/5 px-4 py-3 dark:border-white/5">
            {group.fields.map((field) => (
              <FormField
                key={field.key}
                field={field}
                value={values[field.key] ?? ''}
                onChange={onFieldChange}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
