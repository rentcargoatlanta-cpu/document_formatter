import type { DocumentTemplate } from '@/lib/documents/types';

export const commercialUseTemplate: DocumentTemplate = {
  id: 'commercial-use',
  name: 'Commercial Use Agreement',
  templatePath: 'public/documents/commercial_use.pdf',
  fieldGroups: [
    {
      id: 'agreement_info',
      name: 'Agreement Info',
      fields: [
        { key: 'date_today', label: "Today's date", type: 'date' },
      ],
    },
    {
      id: 'signatures',
      name: 'Signatures',
      hidden: true,
      fields: [
        { key: 'customer_sign', label: 'Customer signature', type: 'text' },
        { key: 'customer_date', label: 'Customer signed date', type: 'date' },
        { key: 'owner_name_date', label: 'Owner signed date', type: 'date' },
      ],
    },
  ],
};
