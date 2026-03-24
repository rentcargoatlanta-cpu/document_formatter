'use server';

import { fillPdfTemplate } from '@/lib/pdf/fill-template';
import { getTemplateById } from '@/lib/documents/index';

export async function generateFilledPdf(
  templateId: string,
  values: Record<string, string>,
): Promise<string> {
  const template = getTemplateById(templateId);
  if (!template) {
    throw new Error('Unknown template');
  }

  const pdfBytes = await fillPdfTemplate(template.templatePath, values);
  return Buffer.from(pdfBytes).toString('base64');
}
