export interface EquipmentItem {
  id: string;
  name: string;
  description: string;
  /** Per-day rate in dollars. 0 if flat rate only. */
  perDay: number;
  /** Max charge cap. null if flat rate. */
  maxCharge: number | null;
  /** Flat one-time charge. null if per-day pricing. */
  flatRate: number | null;
}

export const EQUIPMENT_ITEMS: EquipmentItem[] = [
  {
    id: 'blankets',
    name: 'Moving Blanket Bundle (6)',
    description:
      'Bundle of 6 padded moving blankets ideal for protecting furniture and delicate items during transport.',
    perDay: 0,
    maxCharge: null,
    flatRate: 15,
  },
  {
    id: 'sofa_cover',
    name: 'Sofa Cover',
    description:
      'Durable sofa cover designed to protect your couch from dirt, dust, and moisture during moving.',
    perDay: 8,
    maxCharge: 24,
    flatRate: null,
  },
  {
    id: 'mattress_cover',
    name: 'Mattress Cover',
    description:
      'Protective plastic mattress cover to keep your mattress clean and dust-free during transport.',
    perDay: 8,
    maxCharge: 24,
    flatRate: null,
  },
  {
    id: 'ratchet_straps',
    name: 'Ratchet Straps Kit (4)',
    description:
      'Set of 4 heavy-duty ratchet straps ideal for securing loads during transport.',
    perDay: 10,
    maxCharge: 30,
    flatRate: null,
  },
  {
    id: 'hand_truck',
    name: 'Hand Truck',
    description:
      'Durable hand truck perfect for transporting heavy or bulky items.',
    perDay: 10,
    maxCharge: 30,
    flatRate: null,
  },
  {
    id: 'furniture_dolly',
    name: 'Furniture Dolly',
    description:
      'Sturdy 4-wheel dolly ideal for moving heavy furniture and boxes with ease.',
    perDay: 6,
    maxCharge: 18,
    flatRate: null,
  },
];

/** Calculate the charge for an equipment item given rental days. */
export function calculateEquipmentCharge(
  item: EquipmentItem,
  days: number,
): number {
  if (item.flatRate !== null) return item.flatRate;
  const total = item.perDay * days;
  return item.maxCharge !== null ? Math.min(total, item.maxCharge) : total;
}

/** Format the price display string for an item. */
export function formatEquipmentPrice(item: EquipmentItem): string {
  if (item.flatRate !== null) return `$${item.flatRate}`;
  if (item.maxCharge !== null)
    return `$${item.perDay}/day (max $${item.maxCharge})`;
  return `$${item.perDay}/day`;
}
