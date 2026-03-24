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
    const state: Record<string, string> = {};
    for (const group of template.fieldGroups) {
      for (const field of group.fields) {
        state[field.key] = '';
      }
    }
    return state;
  }, [template]);

  const [values, dispatch] = useReducer(formReducer, initialState);

  // Compute derived fields when trigger-values change
  const dob = values['date_of_birth'];
  const start = values['rental_start_datetime'];
  const end = values['rental_end_datetime'];

  useEffect(() => {
    const derived = computeDerivedFields(values);
    if (Object.keys(derived).length > 0) {
      dispatch({ type: 'BULK_SET', values: derived });
    }
    // Only re-run when the specific trigger fields change, not the whole values object
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dob, start, end]);

  const updateField = useCallback((key: string, value: string) => {
    dispatch({ type: 'FIELD_CHANGE', key, value });
  }, []);

  return { values, updateField };
}
