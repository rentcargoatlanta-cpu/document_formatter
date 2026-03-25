'use server';

import { fillPdfTemplate } from '@/lib/pdf/fill-template';
import { getTemplateById } from '@/lib/documents/index';

/** Format a datetime-local string (YYYY-MM-DDTHH:MM) to "YYYY-MM-DD h:MM AM/PM". */
function formatDatetime(value: string): string {
  if (!value || !value.includes('T')) return value;
  const [datePart, timePart] = value.split('T');
  if (!timePart) return datePart;
  const [hourStr, minuteStr] = timePart.split(':');
  let hour = parseInt(hourStr, 10);
  const minute = minuteStr ?? '00';
  const ampm = hour >= 12 ? 'PM' : 'AM';
  if (hour === 0) hour = 12;
  else if (hour > 12) hour -= 12;
  return `${datePart} ${hour}:${minute} ${ampm}`;
}

/** Keys whose values are datetime-local and should be formatted for the PDF. */
const DATETIME_KEYS = [
  'rental_start_datetime',
  'rental_end_datetime',
  'original_return_date',
  'extended_return_date',
];

/** Format a numeric string with two decimal places. Returns original if not a number. */
function formatCurrency(value: string): string {
  if (!value) return value;
  const num = parseFloat(value);
  if (isNaN(num)) return value;
  return num.toFixed(2);
}

/** Apply display transformations to form values before filling the PDF. */
function transformValuesForPdf(values: Record<string, string>): Record<string, string> {
  const out = { ...values };

  // Prefix pickup/dropoff locations with labels
  const pickup = out['pickup_service'];
  if (pickup) {
    out['pickup_service'] = `Pick Up: ${pickup}`;
  }
  const dropoff = out['dropoff_service'];
  if (dropoff) {
    out['dropoff_service'] = `Drop Off: ${dropoff}`;
  }

  // Format pickup/dropoff prices with cents
  if (out['pickup_price']) {
    out['pickup_price'] = formatCurrency(out['pickup_price']);
  }
  if (out['dropoff_price']) {
    out['dropoff_price'] = formatCurrency(out['dropoff_price']);
  }

  // Format datetime-local values for display
  for (const key of DATETIME_KEYS) {
    if (out[key]) {
      out[key] = formatDatetime(out[key]);
    }
  }

  return out;
}

export async function generateFilledPdf(
  templateId: string,
  values: Record<string, string>,
): Promise<string> {
  const template = getTemplateById(templateId);
  if (!template) {
    throw new Error('Unknown template');
  }

  const pdfValues = transformValuesForPdf(values);
  const pdfBytes = await fillPdfTemplate(template.templatePath, pdfValues);
  return Buffer.from(pdfBytes).toString('base64');
}
