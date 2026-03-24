import type { DocumentTemplate } from '@/lib/documents/types';

export const additionalDriverTemplate: DocumentTemplate = {
  id: 'additional-driver',
  name: 'Additional Driver',
  templatePath: 'public/documents/additional_driver.pdf',
  fieldGroups: [
    {
      id: 'agreement_info',
      name: 'Agreement Info',
      fields: [
        { key: 'renters_fullname', label: "Renter's full name", type: 'text' },
        { key: 'rental_number', label: 'Rental number', type: 'text' },
        { key: 'original_agreement_date', label: 'Original agreement date', type: 'date' },
      ],
    },
    {
      id: 'additional_driver_info',
      name: 'Additional Driver Info',
      fields: [
        { key: 'additional_driver_fullname', label: 'Full name', type: 'text' },
        { key: 'additional_dob', label: 'Date of birth', type: 'date' },
        { key: 'additional_license_number', label: 'License number', type: 'text' },
        { key: 'state_issue', label: 'State of issue', type: 'text' },
        { key: 'additional_license_expiration', label: 'License expiration', type: 'date' },
        { key: 'additional_address', label: 'Address', type: 'text' },
        { key: 'additional_email', label: 'Email address', type: 'email' },
        { key: 'additional_phone', label: 'Phone number', type: 'tel' },
      ],
    },
    {
      id: 'signatures',
      name: 'Signatures',
      hidden: true,
      fields: [
        { key: 'renters_fullname_signature', label: "Renter's printed name", type: 'text' },
        { key: 'renters_signature', label: "Renter's signature", type: 'text' },
        { key: 'renters_signed_date', label: 'Renter signed date', type: 'date' },
        { key: 'additional_driver_full_name', label: 'Additional driver printed name', type: 'text' },
        { key: 'additional_driver_signature', label: 'Additional driver signature', type: 'text' },
        { key: 'additional_driver_signed_date', label: 'Additional driver signed date', type: 'date' },
        { key: 'representative_signed_date', label: 'Representative signed date', type: 'date' },
      ],
    },
  ],
};
