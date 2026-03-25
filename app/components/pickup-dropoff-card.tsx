'use client';

import { useState, useCallback } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface PickupDropoffCardProps {
  values: Record<string, string>;
  onFieldChange: (key: string, value: string) => void;
}

interface RowConfig {
  label: string;
  locationKey: string;
  milesKey: string;
  chargeKey: string;
}

const ROWS: RowConfig[] = [
  {
    label: 'Pickup',
    locationKey: 'pickup_service',
    milesKey: 'pickup_miles',
    chargeKey: 'pickup_price',
  },
  {
    label: 'Drop-off',
    locationKey: 'dropoff_service',
    milesKey: 'dropoff_miles',
    chargeKey: 'dropoff_price',
  },
];

export function PickupDropoffCard({
  values,
  onFieldChange,
}: PickupDropoffCardProps) {
  const [isOpen, setIsOpen] = useState(true);

  const handleChange = useCallback(
    (key: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
      onFieldChange(key, e.target.value);
    },
    [onFieldChange],
  );

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CardHeader className="p-0">
          <CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-3.5 text-left transition-colors hover:bg-muted/50 md:px-4 md:py-3">
            <span className="text-lg font-semibold">
              Pickup &amp; Drop-off
            </span>
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            />
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="flex flex-col gap-4 border-t border-border px-3 py-4 md:gap-3 md:px-4 md:py-3">
            {ROWS.map((row) => (
              <div key={row.label} className="flex flex-col gap-2">
                <span className="text-base font-medium text-foreground/70">
                  {row.label}
                </span>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <Label className="flex flex-col items-start gap-1.5">
                    <span className="text-sm text-muted-foreground">
                      Location
                    </span>
                    <Input
                      type="text"
                      value={values[row.locationKey] ?? ''}
                      onChange={handleChange(row.locationKey)}
                      placeholder="Enter location"
                    />
                  </Label>
                  <Label className="flex flex-col items-start gap-1.5">
                    <span className="text-sm text-muted-foreground">Miles</span>
                    <Input
                      type="number"
                      value={values[row.milesKey] ?? ''}
                      onChange={handleChange(row.milesKey)}
                      placeholder="0"
                      step="1"
                    />
                  </Label>
                  <Label className="flex flex-col items-start gap-1.5">
                    <span className="text-sm text-muted-foreground">
                      Charge
                    </span>
                    <Input
                      type="number"
                      value={values[row.chargeKey] ?? ''}
                      onChange={handleChange(row.chargeKey)}
                      placeholder="0.00"
                      step="0.01"
                    />
                  </Label>
                </div>
              </div>
            ))}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
