'use client';

import { useState, useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import type { FieldGroup } from '@/lib/documents/types';
import { FormField } from '@/app/components/form-field';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';


interface FieldGroupCardProps {
  group: FieldGroup;
  values: Record<string, string>;
  onFieldChange: (key: string, value: string) => void;
  headerContent?: React.ReactNode;
}

export function FieldGroupCard({
  group,
  values,
  onFieldChange,
  headerContent,
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
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CardHeader className="p-0">
          <CollapsibleTrigger
            className="flex w-full items-center justify-between px-3 md:px-4 py-3.5 md:py-3 text-left transition-colors hover:bg-muted/50"
          >
            <span className="text-lg font-semibold">{group.name}</span>
            <span className="flex items-center gap-2">
              <Badge variant="secondary" className="tabular-nums">
                {filledCount}/{totalCount}
              </Badge>
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
              />
            </span>
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="flex flex-col gap-4 md:gap-3 border-t border-border px-3 md:px-4 py-4 md:py-3">
            {headerContent}
            {group.fields.map((field) => (
              <FormField
                key={field.key}
                field={field}
                value={values[field.key] ?? ''}
                onChange={onFieldChange}
              />
            ))}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
