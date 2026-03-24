import type { DocumentTemplate } from '@/lib/documents/types';

export { rentalAgreementTemplate } from '@/lib/documents/rental-agreement';
export { additionalDriverTemplate } from '@/lib/documents/additional-driver';
export { commercialUseTemplate } from '@/lib/documents/commercial-use';
export { lateReturnTemplate } from '@/lib/documents/late-return';
export { rentalExtensionTemplate } from '@/lib/documents/rental-extension';

import { rentalAgreementTemplate } from '@/lib/documents/rental-agreement';
import { additionalDriverTemplate } from '@/lib/documents/additional-driver';
import { commercialUseTemplate } from '@/lib/documents/commercial-use';
import { lateReturnTemplate } from '@/lib/documents/late-return';
import { rentalExtensionTemplate } from '@/lib/documents/rental-extension';

export const allTemplates: DocumentTemplate[] = [
  rentalAgreementTemplate,
  additionalDriverTemplate,
  commercialUseTemplate,
  lateReturnTemplate,
  rentalExtensionTemplate,
];

export function getTemplateById(id: string): DocumentTemplate | undefined {
  return allTemplates.find((template) => template.id === id);
}
