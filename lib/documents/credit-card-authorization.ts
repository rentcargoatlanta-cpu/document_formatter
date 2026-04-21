import type { DocumentTemplate } from '@/lib/documents/types';

export const creditCardAuthorizationTemplate: DocumentTemplate = {
  id: 'credit-card-authorization',
  name: 'Credit Card Authorization',
  templatePath: 'public/documents/Credit_Card_Authorization_Form.pdf',
  fieldGroups: [
    {
      id: 'cardholder_info',
      name: 'Cardholder Info',
      fields: [
        { key: 'cardholder_name', label: 'Cardholder name', type: 'text' },
        { key: 'reservation_date', label: 'Reservation date', type: 'date' },
        { key: 'primary_renter', label: 'Primary renter', type: 'text' },
        { key: 'card_last_four', label: 'Card ending in', type: 'text', placeholder: 'Last 4 digits', maxLength: 4, digitsOnly: true },
      ],
    },
    {
      id: 'authorization',
      name: 'Authorization',
      fields: [
        { key: 'deposit_date', label: 'Deposit charge date', type: 'date' },
      ],
    },
    {
      id: 'signatures',
      name: 'Signatures',
      hidden: true,
      fields: [
        { key: 'cardholder_signature', label: 'Cardholder signature', type: 'text' },
        { key: 'cardholder_signed_date', label: 'Cardholder signed date', type: 'date' },
      ],
    },
  ],
};
