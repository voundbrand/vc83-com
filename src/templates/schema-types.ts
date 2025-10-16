/**
 * TEMPLATE SCHEMA TYPES
 *
 * Defines the type system for template content schemas.
 * Used to generate forms, validate content, and type-check templates.
 */

/**
 * Field Types
 *
 * All possible input types for template content fields.
 */
export enum FieldType {
  Text = "text",
  Textarea = "textarea",
  RichText = "richtext",
  Number = "number",
  Boolean = "boolean",
  Url = "url",
  Email = "email",
  Tel = "tel",
  Date = "date",
  DateTime = "datetime",
  Color = "color",
  Image = "image",
  File = "file",
  Icon = "icon",
  Select = "select",
  Radio = "radio",
  Checkbox = "checkbox",
  TextArray = "text-array", // Array of strings
  Repeater = "repeater", // Array of objects
  Object = "object", // Nested object
  EventLink = "event-link", // Link to an event to auto-populate template fields
  CheckoutLink = "checkout-link", // Link to a checkout instance to auto-populate products
}

/**
 * Base Field Definition
 */
export interface BaseFieldDefinition {
  id: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  helpText?: string;
  defaultValue?: unknown;
}

/**
 * Text Field
 */
export interface TextFieldDefinition extends BaseFieldDefinition {
  type: FieldType.Text | FieldType.Email | FieldType.Tel | FieldType.Url;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
}

/**
 * Textarea Field
 */
export interface TextareaFieldDefinition extends BaseFieldDefinition {
  type: FieldType.Textarea;
  minLength?: number;
  maxLength?: number;
  rows?: number;
}

/**
 * Rich Text Field
 */
export interface RichTextFieldDefinition extends BaseFieldDefinition {
  type: FieldType.RichText;
  minLength?: number;
  maxLength?: number;
  allowedFormats?: string[]; // ['bold', 'italic', 'link', etc.]
}

/**
 * Number Field
 */
export interface NumberFieldDefinition extends BaseFieldDefinition {
  type: FieldType.Number;
  min?: number;
  max?: number;
  step?: number;
}

/**
 * Boolean Field
 */
export interface BooleanFieldDefinition extends BaseFieldDefinition {
  type: FieldType.Boolean;
  defaultValue?: boolean;
}

/**
 * Date/DateTime Field
 */
export interface DateFieldDefinition extends BaseFieldDefinition {
  type: FieldType.Date | FieldType.DateTime;
  min?: string;
  max?: string;
}

/**
 * Color Field
 */
export interface ColorFieldDefinition extends BaseFieldDefinition {
  type: FieldType.Color;
  format?: "hex" | "rgb" | "hsl";
}

/**
 * Image/File Field
 */
export interface ImageFieldDefinition extends BaseFieldDefinition {
  type: FieldType.Image | FieldType.File;
  accept?: string; // File types (e.g., 'image/*')
  maxSize?: number; // Max file size in bytes
}

/**
 * Icon Field
 */
export interface IconFieldDefinition extends BaseFieldDefinition {
  type: FieldType.Icon;
  iconSet?: string; // e.g., 'lucide', 'heroicons'
}

/**
 * Select/Radio/Checkbox Field
 */
export interface SelectFieldDefinition extends BaseFieldDefinition {
  type: FieldType.Select | FieldType.Radio | FieldType.Checkbox;
  options: Array<{
    label: string;
    value: string | number | boolean;
  }>;
  multiple?: boolean; // For select/checkbox
}

/**
 * Text Array Field
 */
export interface TextArrayFieldDefinition extends BaseFieldDefinition {
  type: FieldType.TextArray;
  minItems?: number;
  maxItems?: number;
  itemPlaceholder?: string;
}

/**
 * Repeater Field (Array of Objects)
 */
export interface RepeaterFieldDefinition extends BaseFieldDefinition {
  type: FieldType.Repeater;
  minItems?: number;
  maxItems?: number;
  defaultItem?: Record<string, unknown>;
  fields: FieldDefinition[];
}

/**
 * Object Field (Nested Object)
 */
export interface ObjectFieldDefinition extends BaseFieldDefinition {
  type: FieldType.Object;
  fields: FieldDefinition[];
}

/**
 * Event Link Field
 *
 * Links a web page to an event from Event Management app.
 * When an event is selected, specified fields are auto-populated with event data.
 */
export interface EventLinkFieldDefinition extends BaseFieldDefinition {
  type: FieldType.EventLink;
  autoPopulateFields?: {
    eventName?: string; // Field ID to populate with event name
    eventDate?: string; // Field ID to populate with event start date
    eventEndDate?: string; // Field ID to populate with event end date
    eventLocation?: string; // Field ID to populate with event location
    eventDescription?: string; // Field ID to populate with event description
  };
}

/**
 * Checkout Link Field
 *
 * Links a web page to a checkout instance from Checkout app.
 * When a checkout is selected, products are automatically fetched and displayed.
 */
export interface CheckoutLinkFieldDefinition extends BaseFieldDefinition {
  type: FieldType.CheckoutLink;
  helpText?: string;
}

/**
 * Union of All Field Types
 */
export type FieldDefinition =
  | TextFieldDefinition
  | TextareaFieldDefinition
  | RichTextFieldDefinition
  | NumberFieldDefinition
  | BooleanFieldDefinition
  | DateFieldDefinition
  | ColorFieldDefinition
  | ImageFieldDefinition
  | IconFieldDefinition
  | SelectFieldDefinition
  | TextArrayFieldDefinition
  | RepeaterFieldDefinition
  | ObjectFieldDefinition
  | EventLinkFieldDefinition
  | CheckoutLinkFieldDefinition;

/**
 * Section Definition
 *
 * Groups related fields together in the UI.
 */
export interface SectionDefinition {
  id: string;
  label: string;
  description?: string;
  type?: FieldType.Repeater; // If the entire section is a repeater
  minItems?: number; // For repeater sections
  maxItems?: number; // For repeater sections
  defaultItem?: Record<string, unknown>; // For repeater sections
  fields: FieldDefinition[];
}

/**
 * Template Content Schema
 *
 * Complete schema definition for a template.
 */
export interface TemplateContentSchema<T = unknown> {
  templateCode: string;
  templateName: string;
  description?: string;
  defaultContent: T;
  sections: SectionDefinition[];
}

/**
 * Validation Error
 */
export interface ValidationError {
  fieldId: string;
  message: string;
}

/**
 * Validation Result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}
