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

const WEEKDAY_RATE = 99;
const WEEKEND_RATE = 119;

/**
 * Calculate rental pricing breakdown based on dates.
 * Mon–Thu = $99/day, Fri–Sun = $119/day.
 */
function calculatePricing(start: string, end: string): {
  weekdays: number;
  weekendDays: number;
  totalCost: number;
} {
  if (!start || !end) return { weekdays: 0, weekendDays: 0, totalCost: 0 };

  const startDate = new Date(start + 'T00:00:00');
  const endDate = new Date(end + 'T00:00:00');

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return { weekdays: 0, weekendDays: 0, totalCost: 0 };
  }

  let weekdays = 0;
  let weekendDays = 0;
  const current = new Date(startDate);

  while (current < endDate) {
    const day = current.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    if (day >= 1 && day <= 4) {
      // Mon–Thu
      weekdays++;
    } else {
      // Fri, Sat, Sun
      weekendDays++;
    }
    current.setDate(current.getDate() + 1);
  }

  const totalCost = weekdays * WEEKDAY_RATE + weekendDays * WEEKEND_RATE;
  return { weekdays, weekendDays, totalCost };
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

  const start = values['rental_start_datetime'] ?? '';
  const end = values['rental_end_datetime'] ?? '';

  const totalDays = calculateTotalDays(start, end);
  if (totalDays) {
    result['total_days'] = totalDays;
  }

  const pricing = calculatePricing(start, end);
  if (pricing.weekdays > 0 || pricing.weekendDays > 0) {
    // Total rental cost
    result['total_r_cost'] = `$${pricing.totalCost.toFixed(2)}`;

    // Average cost per day
    const days = pricing.weekdays + pricing.weekendDays;
    if (days > 0) {
      result['total_cost_p_day'] = `$${(pricing.totalCost / days).toFixed(2)}`;
    }
  }

  return result;
}
