'use client';

import { useReducer, useEffect, useCallback, useMemo } from 'react';
import type { DocumentTemplate } from '@/lib/documents/types';
import { computeDerivedFields } from '@/lib/documents/computed-fields';

type FormAction =
  | { type: 'FIELD_CHANGE'; key: string; value: string }
  | { type: 'BULK_SET'; values: Record<string, string> };

function formReducer(
  state: Record<string, string>,
  action: FormAction,
): Record<string, string> {
  switch (action.type) {
    case 'FIELD_CHANGE': {
      if (state[action.key] === action.value) return state;
      return { ...state, [action.key]: action.value };
    }
    case 'BULK_SET': {
      let changed = false;
      for (const [k, v] of Object.entries(action.values)) {
        if (state[k] !== v) {
          changed = true;
          break;
        }
      }
      if (!changed) return state;
      return { ...state, ...action.values };
    }
    default:
      return state;
  }
}

export function useDocumentFormState(template: DocumentTemplate) {
  const initialState = useMemo(() => {
    const now = new Date();
    const todayUtc = [
      now.getUTCFullYear(),
      String(now.getUTCMonth() + 1).padStart(2, '0'),
      String(now.getUTCDate()).padStart(2, '0'),
    ].join('-');

    const autoDateKeys = new Set(['date_today']);
    // All date fields in hidden groups (e.g. signatures) also default to today
    for (const group of template.fieldGroups) {
      if (group.hidden) {
        for (const field of group.fields) {
          if (field.type === 'date') {
            autoDateKeys.add(field.key);
          }
        }
      }
    }

    const state: Record<string, string> = {};
    for (const group of template.fieldGroups) {
      for (const field of group.fields) {
        if (autoDateKeys.has(field.key)) {
          state[field.key] = todayUtc;
        } else if (field.key === 'overage_cost') {
          state[field.key] = '0.65';
        } else if (field.key === 'miles_package') {
          state[field.key] = 'New Pricing Package';
        } else {
          state[field.key] = '';
        }
      }
    }
    return state;
  }, [template]);

  const [values, dispatch] = useReducer(formReducer, initialState);

  // Compute derived fields when trigger-values change
  const dob = values['date_of_birth'];
  const start = values['rental_start_datetime'];
  const end = values['rental_end_datetime'];
  const fullName = values['full_name'];
  const pickupPrice = values['pickup_price'];
  const dropoffPrice = values['dropoff_price'];
  const eTotal1 = values['e_total_1'];
  const eTotal2 = values['e_total_2'];
  const eTotal3 = values['e_total_3'];
  const eTotal4 = values['e_total_4'];
  const eTotal5 = values['e_total_5'];
  const rentersFullname = values['renters_fullname'];
  const additionalDriverFullname = values['additional_driver_fullname'];
  const originalReturnDate = values['original_return_date'];
  const extendedReturnDate = values['extended_return_date'];
  const extensionDays = values['extension_days'];
  const extensionDailyRate = values['extension_daily_rate'];
  const customerFullname = values['customer_fullname'];
  const rentalNumber = values['rental_number'];

  useEffect(() => {
    const derived = computeDerivedFields(values);
    if (Object.keys(derived).length > 0) {
      dispatch({ type: 'BULK_SET', values: derived });
    }
    // Only re-run when the specific trigger fields change, not the whole values object
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dob, start, end, fullName, pickupPrice, dropoffPrice, eTotal1, eTotal2, eTotal3, eTotal4, eTotal5, rentersFullname, additionalDriverFullname, originalReturnDate, extendedReturnDate, extensionDays, extensionDailyRate, customerFullname, rentalNumber]);

  const updateField = useCallback((key: string, value: string) => {
    dispatch({ type: 'FIELD_CHANGE', key, value });
  }, []);

  const bulkUpdateFields = useCallback(
    (fieldValues: Record<string, string>) => {
      dispatch({ type: 'BULK_SET', values: fieldValues });
    },
    [],
  );

  return { values, updateField, bulkUpdateFields };
}
