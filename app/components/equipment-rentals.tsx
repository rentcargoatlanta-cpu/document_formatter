'use client';

import { useCallback } from 'react';
import { EQUIPMENT_ITEMS } from '@/lib/documents/equipment-items';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';

interface EquipmentRentalsProps {
  selectedIds: Set<string>;
  onSelectionChange: (selectedIds: Set<string>) => void;
  rentalDays: number;
}

export function EquipmentRentals({
  selectedIds,
  onSelectionChange,
}: EquipmentRentalsProps) {
  const toggleItem = useCallback(
    (id: string) => {
      const next = new Set(selectedIds);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      onSelectionChange(next);
    },
    [selectedIds, onSelectionChange],
  );

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h3 className="text-lg font-semibold">⚙ Equipment Rentals</h3>
        <p className="text-sm text-muted-foreground">
          Select equipment for this reservation. Equipment added here is
          considered part of the original rental.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {EQUIPMENT_ITEMS.map((item) => {
          const isChecked = selectedIds.has(item.id);
          const dailyPrice = item.perDay > 0 ? item.perDay : item.flatRate ?? 0;

          return (
            <Card
              key={item.id}
              className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                isChecked ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => toggleItem(item.id)}
            >
              <CardContent className="flex items-start gap-3 py-0">
                <div className="pt-0.5">
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={() => toggleItem(item.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="font-semibold leading-snug">
                    {item.name}
                  </span>
                  <p className="text-sm text-muted-foreground">
                    {item.description}
                  </p>
                  <p className="text-sm font-medium">
                    Daily: ${dailyPrice.toFixed(2)}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
