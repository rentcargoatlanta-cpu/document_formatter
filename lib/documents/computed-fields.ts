/**
 * Calculate age from a date-of-birth string (YYYY-MM-DD format).
 * Returns the age as a string, or empty string if invalid.
 */
export function calculateAge(dob: string): string {
  if (!dob) return '';

  const birthDate = new Date(dob + 'T00:00:00');
  if (isNaN(birthDate.getTime())) return '';

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  if (age < 0) return '';

  return String(age);
}

/**
 * Calculate total days between two date strings (YYYY-MM-DD).
 * Returns the difference in days as a string, or empty string if invalid.
 */
export function calculateTotalDays(start: string, end: string): string {
  if (!start || !end) return '';

  const startDate = new Date(start + 'T00:00:00');
  const endDate = new Date(end + 'T00:00:00');

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return '';

  const diffMs = endDate.getTime() - startDate.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return '';

  return String(diffDays);
}

/**
 * Master function: given current form values, returns all computed field values.
 * Keys in the returned object match field keys in the template.
 * Only includes keys where the computed value is non-empty.
 */
export function computeDerivedFields(values: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};

  const age = calculateAge(values['date_of_birth'] ?? '');
  if (age) {
    result['customer_age'] = age;
  }

  const totalDays = calculateTotalDays(
    values['rental_start_datetime'] ?? '',
    values['rental_end_datetime'] ?? '',
  );
  if (totalDays) {
    result['total_days'] = totalDays;
  }

  // total_cost_p_day and total_r_cost: placeholder for future computation

  return result;
}
