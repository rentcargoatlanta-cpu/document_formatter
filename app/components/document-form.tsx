'use client';

import { useEffect, useState, useCallback } from 'react';
import type { DocumentTemplate } from '@/lib/documents/types';
import { useDocumentFormState } from '@/app/hooks/use-form-state';
import { useDebouncedPdfGeneration } from '@/app/hooks/use-debounced-pdf';
import { useCargoVans } from '@/app/hooks/use-cargo-vans';
import {
  EQUIPMENT_ITEMS,
  calculateEquipmentCharge,
} from '@/lib/documents/equipment-items';
import { FieldGroupCard } from '@/app/components/field-group-card';
import { VanSelector } from '@/app/components/van-selector';
import { EquipmentRentals } from '@/app/components/equipment-rentals';
import { Card, CardContent } from '@/components/ui/card';

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

  // Equipment rentals
  const [selectedEquipment, setSelectedEquipment] = useState<Set<string>>(
    new Set(),
  );

  const rentalDays = parseInt(values['total_days'] || '0') || 0;

  const handleEquipmentChange = useCallback(
    (ids: Set<string>) => {
      setSelectedEquipment(ids);

      // Map selected equipment to extras fields (e_description_1..5, e_total_1..5, etc.)
      const fields: Record<string, string> = {};
      const selected = EQUIPMENT_ITEMS.filter((item) => ids.has(item.id));

      for (let i = 1; i <= 5; i++) {
        const item = selected[i - 1];
        if (item) {
          const charge = calculateEquipmentCharge(item, rentalDays);
          fields[`e_description_${i}`] = item.name;
          fields[`e_days_${i}`] = String(rentalDays);
          fields[`e_cost_per_day_${i}`] =
            item.flatRate !== null
              ? item.flatRate.toFixed(2)
              : item.perDay.toFixed(2);
          fields[`e_total_${i}`] = charge.toFixed(2);
        } else {
          fields[`e_description_${i}`] = '';
          fields[`e_days_${i}`] = '';
          fields[`e_cost_per_day_${i}`] = '';
          fields[`e_total_${i}`] = '';
        }
      }

      bulkUpdateFields(fields);
    },
    [rentalDays, bulkUpdateFields],
  );

  // Recalculate equipment charges when rental days change
  useEffect(() => {
    if (selectedEquipment.size === 0) return;

    const fields: Record<string, string> = {};
    const selected = EQUIPMENT_ITEMS.filter((item) =>
      selectedEquipment.has(item.id),
    );

    for (let i = 1; i <= 5; i++) {
      const item = selected[i - 1];
      if (item) {
        const charge = calculateEquipmentCharge(item, rentalDays);
        fields[`e_description_${i}`] = item.name;
        fields[`e_days_${i}`] = String(rentalDays);
        fields[`e_cost_per_day_${i}`] =
          item.flatRate !== null
            ? item.flatRate.toFixed(2)
            : item.perDay.toFixed(2);
        fields[`e_total_${i}`] = charge.toFixed(2);
      } else {
        fields[`e_description_${i}`] = '';
        fields[`e_days_${i}`] = '';
        fields[`e_cost_per_day_${i}`] = '';
        fields[`e_total_${i}`] = '';
      }
    }

    bulkUpdateFields(fields);
  }, [rentalDays, selectedEquipment, bulkUpdateFields]);

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

        {/* Equipment Rentals (only for rental-agreement) */}
        {template.id === 'rental-agreement' && (
          <Card>
            <CardContent className="p-3 md:p-4">
              <EquipmentRentals
                selectedIds={selectedEquipment}
                onSelectionChange={handleEquipmentChange}
                rentalDays={rentalDays}
              />
            </CardContent>
          </Card>
        )}
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
