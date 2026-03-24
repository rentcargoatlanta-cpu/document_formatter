import type { DocumentTemplate } from '@/lib/documents/types';

export const rentalExtensionTemplate: DocumentTemplate = {
  id: 'rental-extension',
  name: 'Rental Extension',
  templatePath: 'public/documents/rental_extension.pdf',
  fieldGroups: [
    {
      id: 'agreement_info',
      name: 'Agreement Info',
      fields: [
        { key: 'rental_number', label: 'Rental number', type: 'text' },
        { key: 'original_agreement_date', label: 'Original agreement date', type: 'date' },
        { key: 'customer_fullname', label: 'Customer full name', type: 'text' },
        { key: 'original_return_date', label: 'Original return date', type: 'date' },
        { key: 'extended_return_date', label: 'Extended return date', type: 'date' },
      ],
    },
    {
      id: 'extension_charges',
      name: 'Extension Charges',
      fields: [
        { key: 'extension_days', label: 'Extension days', type: 'number' },
        { key: 'extension_daily_rate', label: 'Daily rate', type: 'currency' },
        { key: 'extension_subtotal', label: 'Subtotal', type: 'currency', computed: true },
        { key: 'extension_sales_tax', label: 'Sales tax', type: 'currency', computed: true },
        { key: 'extension_excise_tax', label: 'Excise tax', type: 'currency', computed: true },
        { key: 'extension_total', label: 'Total', type: 'currency', computed: true },
      ],
    },
    {
      id: 'signatures',
      name: 'Signatures',
      hidden: true,
      fields: [
        { key: 'rental_number_reference', label: 'Rental number reference', type: 'text' },
        { key: 'renter_fullname', label: 'Renter full name', type: 'text' },
        { key: 'renter_signature', label: 'Renter signature', type: 'text' },
        { key: 'renter_signed_date', label: 'Renter signed date', type: 'date' },
      ],
    },
  ],
};
