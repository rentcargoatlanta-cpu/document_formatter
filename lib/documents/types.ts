export type FieldType = 'text' | 'date' | 'datetime' | 'email' | 'tel' | 'number' | 'currency';

export interface DocumentField {
  key: string;          // matches [[key]] in the PDF template
  label: string;        // display label in the form
  type: FieldType;      // HTML input type
  placeholder?: string; // input placeholder text
  computed?: boolean;    // if true, rendered as readonly with visual indicator
  maxLength?: number;   // caps character count on the input
  digitsOnly?: boolean; // strip non-digit characters on input
}

export interface FieldGroup {
  id: string;
  name: string;
  fields: DocumentField[];
  hidden?: boolean;     // controls visibility in UI
}

export interface DocumentTemplate {
  id: string;
  name: string;
  templatePath: string; // path to template PDF, relative to process.cwd()
  fieldGroups: FieldGroup[];
}
