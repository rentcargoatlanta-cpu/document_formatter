'use server';

import { fillPdfTemplate } from '@/lib/pdf/fill-template';
import { rentalAgreementTemplate } from '@/lib/documents/rental-agreement';

export async function generateFilledPdf(
  values: Record<string, string>,
): Promise<string> {
  const pdfBytes = await fillPdfTemplate(
    rentalAgreementTemplate.templatePath,
    values,
  );

  return Buffer.from(pdfBytes).toString('base64');
}
