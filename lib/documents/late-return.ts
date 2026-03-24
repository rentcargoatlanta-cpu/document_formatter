import type { DocumentTemplate } from '@/lib/documents/types';

export const lateReturnTemplate: DocumentTemplate = {
  id: 'late-return',
  name: 'Late Return Policy',
  templatePath: 'public/documents/late_return.pdf',
  fieldGroups: [
    {
      id: 'agreement_info',
      name: 'Agreement Info',
      fields: [
        { key: 'date_today', label: "Today's date", type: 'date' },
        { key: 'renter_fullname', label: "Renter's full name", type: 'text' },
      ],
    },
    {
      id: 'signatures',
      name: 'Signatures',
      hidden: true,
      fields: [
        { key: 'renter_signature', label: 'Renter signature', type: 'text' },
        { key: 'renter_date', label: 'Renter signed date', type: 'date' },
        { key: 'representative_date', label: 'Representative signed date', type: 'date' },
      ],
    },
  ],
};
