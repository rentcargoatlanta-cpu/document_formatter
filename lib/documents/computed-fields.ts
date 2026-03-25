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

/** Extract the YYYY-MM-DD portion from a date or datetime-local string. */
function extractDate(value: string): string {
  return value.slice(0, 10);
}

/**
 * Calculate total days between two date strings (YYYY-MM-DD or YYYY-MM-DDTHH:MM).
 * Returns the difference in days as a string, or empty string if invalid.
 */
export function calculateTotalDays(start: string, end: string): string {
  if (!start || !end) return '';

  const startDate = new Date(extractDate(start) + 'T00:00:00');
  const endDate = new Date(extractDate(end) + 'T00:00:00');

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

  const startDate = new Date(extractDate(start) + 'T00:00:00');
  const endDate = new Date(extractDate(end) + 'T00:00:00');

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

  // Mirror full_name to the signature printed name field
  const fullName = values['full_name'] ?? '';
  if (fullName) {
    result['customer_fullname'] = fullName;
  }

  // Additional driver document: mirror names to signature printed name fields
  const rentersFullname = values['renters_fullname'] ?? '';
  if (rentersFullname) {
    result['renters_fullname_signature'] = rentersFullname;
  }
  const additionalDriverFullname = values['additional_driver_fullname'] ?? '';
  if (additionalDriverFullname) {
    result['additional_driver_full_name'] = additionalDriverFullname;
  }

  const start = values['rental_start_datetime'] ?? '';
  const end = values['rental_end_datetime'] ?? '';

  const totalDays = calculateTotalDays(start, end);
  if (totalDays) {
    result['total_days'] = totalDays;
    // 100 free miles per rental day
    result['free_miles'] = String(parseInt(totalDays) * 100);
  }

  const pricing = calculatePricing(start, end);
  if (pricing.weekdays > 0 || pricing.weekendDays > 0) {
    // Line 1: Weekdays
    if (pricing.weekdays > 0) {
      result['r_description_1'] = 'New Pricing Structure (Weekdays)';
      result['r_rate_1'] = 'Daily';
      result['r_days_1'] = String(pricing.weekdays);
      result['r_cost_per_day_1'] = WEEKDAY_RATE.toFixed(2);
      result['r_total_1'] = (pricing.weekdays * WEEKDAY_RATE).toFixed(2);
    }

    // Line 2: Weekends
    if (pricing.weekendDays > 0) {
      result['r_description_2'] = 'New Pricing Structure (Weekends)';
      result['r_rate_2'] = 'Daily';
      result['r_days_2'] = String(pricing.weekendDays);
      result['r_cost_per_day_2'] = WEEKEND_RATE.toFixed(2);
      result['r_total_2'] = (pricing.weekendDays * WEEKEND_RATE).toFixed(2);
    }

    // Calculate subtotal: rental + pickup + dropoff + equipment extras
    const pickupCharge = parseFloat(values['pickup_price'] ?? '') || 0;
    const dropoffCharge = parseFloat(values['dropoff_price'] ?? '') || 0;

    let equipmentTotal = 0;
    for (let i = 1; i <= 5; i++) {
      equipmentTotal += parseFloat(values[`e_total_${i}`] ?? '') || 0;
    }

    const subtotal = pricing.totalCost + pickupCharge + dropoffCharge + equipmentTotal;

    // Taxes on full subtotal
    const salesTax = subtotal * 0.089;
    const exciseTax = subtotal * 0.03;
    result['sales_tax'] = salesTax.toFixed(2);
    result['excise_tax'] = exciseTax.toFixed(2);

    // Totals (no $ prefix — the PDF template already has $ labels)
    const grandTotal = subtotal + salesTax + exciseTax;
    result['total_r_cost'] = grandTotal.toFixed(2);

    const days = pricing.weekdays + pricing.weekendDays;
    if (days > 0) {
      result['total_cost_p_day'] = (grandTotal / days).toFixed(2);
    }
  }

  // --- Rental Extension computed fields ---
  const origReturn = values['original_return_date'] ?? '';
  const extReturn = values['extended_return_date'] ?? '';
  const extDays = calculateTotalDays(origReturn, extReturn);
  if (extDays) {
    result['extension_days'] = extDays;
  }

  const extPricing = calculatePricing(origReturn, extReturn);
  const extensionDays = extPricing.weekdays + extPricing.weekendDays;
  if (extensionDays > 0) {
    const avgRate = extPricing.totalCost / extensionDays;
    result['extension_daily_rate'] = avgRate.toFixed(2);

    const extSubtotal = extPricing.totalCost;
    const extSalesTax = extSubtotal * 0.089;
    const extExciseTax = extSubtotal * 0.03;
    const extTotal = extSubtotal + extSalesTax + extExciseTax;

    result['extension_subtotal'] = extSubtotal.toFixed(2);
    result['extension_sales_tax'] = extSalesTax.toFixed(2);
    result['extension_excise_tax'] = extExciseTax.toFixed(2);
    result['extension_total'] = extTotal.toFixed(2);
  }

  // Mirror fields to hidden signature section
  const custFullname = values['customer_fullname'] ?? '';
  if (custFullname) {
    result['renter_fullname'] = custFullname;
  }
  const rentalNumber = values['rental_number'] ?? '';
  if (rentalNumber) {
    result['rental_number_reference'] = rentalNumber;
  }

  return result;
}
