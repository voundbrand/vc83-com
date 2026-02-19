/**
 * DYNAMIC FORM GENERATOR
 *
 * Generates form fields dynamically based on template schema.
 * This eliminates the need for template-specific form components!
 */

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useWindowManager } from "@/hooks/use-window-manager";
import { useAppAvailability } from "@/hooks/use-app-availability";
import { AppUnavailableInline } from "@/components/app-unavailable";
import MediaLibraryWindow from "@/components/window-content/media-library-window";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import {
  TemplateContentSchema,
  FieldDefinition,
  FieldType,
  SectionDefinition,
  TextFieldDefinition,
  TextareaFieldDefinition,
  RichTextFieldDefinition,
  RepeaterFieldDefinition,
  BooleanFieldDefinition,
  TextArrayFieldDefinition,
  ImageFieldDefinition,
  IconFieldDefinition,
  EventLinkFieldDefinition,
  CheckoutLinkFieldDefinition,
} from "@/templates/schema-types";
import SimpleTiptapEditor from "@/components/ui/tiptap-editor-simple";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";

interface DynamicFormGeneratorProps {
  schema: TemplateContentSchema;
  content: Record<string, unknown>;
  onChange: (content: Record<string, unknown>) => void;
}

/**
 * Main Form Generator Component
 */
export function DynamicFormGenerator({
  schema,
  content,
  onChange,
}: DynamicFormGeneratorProps) {
  const { t } = useNamespaceTranslations("ui.web_publishing");

  return (
    <div className="space-y-6">
      {schema.sections.map((section) => (
        <SectionRenderer
          key={section.id}
          section={section}
          content={content}
          onChange={onChange}
          t={t}
        />
      ))}
    </div>
  );
}

/**
 * Section Renderer
 *
 * Handles both regular sections and repeater sections.
 * If section.type === FieldType.Repeater, the entire section is a repeater.
 */
function SectionRenderer({
  section,
  content,
  onChange,
  t,
}: {
  section: SectionDefinition;
  content: Record<string, unknown>;
  onChange: (content: Record<string, unknown>) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const [isOpen, setIsOpen] = useState(true);

  // Check if this section is a repeater section
  if (section.type === FieldType.Repeater) {
    // Entire section is a repeater - render as a repeater field
    const repeaterField: RepeaterFieldDefinition = {
      id: section.id,
      label: section.label,
      type: FieldType.Repeater,
      helpText: section.description,
      minItems: section.minItems,
      maxItems: section.maxItems,
      defaultItem: section.defaultItem,
      fields: section.fields,
    };

    return (
      <div className="border-2" style={{ borderColor: 'var(--window-document-border)', background: 'var(--window-document-bg-elevated)' }}>
        {/* Section Header */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between p-3 transition-colors"
          style={{ background: 'var(--window-document-bg-elevated)' }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--desktop-menu-hover)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'var(--window-document-bg-elevated)'}
        >
          <div className="text-left">
            <h4 className="text-xs font-bold" style={{ color: 'var(--window-document-text)' }}>{section.label}</h4>
            {section.description && (
              <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>{section.description}</p>
            )}
          </div>
          <span className="text-xs" style={{ color: 'var(--window-document-text)' }}>{isOpen ? "▼" : "▶"}</span>
        </button>

        {/* Repeater Content */}
        {isOpen && (
          <div className="p-3 border-t-2" style={{ borderColor: 'var(--window-document-border)' }}>
            <FieldRenderer
              field={repeaterField}
              content={content}
              onChange={onChange}
              t={t}
            />
          </div>
        )}
      </div>
    );
  }

  // Regular section - render fields normally
  return (
    <div className="border-2" style={{ borderColor: 'var(--window-document-border)', background: 'var(--window-document-bg-elevated)' }}>
      {/* Section Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 transition-colors"
        style={{ background: 'var(--window-document-bg-elevated)' }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--desktop-menu-hover)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'var(--window-document-bg-elevated)'}
      >
        <div className="text-left">
          <h4 className="text-xs font-bold" style={{ color: 'var(--window-document-text)' }}>{section.label}</h4>
          {section.description && (
            <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>{section.description}</p>
          )}
        </div>
        <span className="text-xs" style={{ color: 'var(--window-document-text)' }}>{isOpen ? "▼" : "▶"}</span>
      </button>

      {/* Section Content */}
      {isOpen && (
        <div className="p-3 border-t-2 space-y-4" style={{ borderColor: 'var(--window-document-border)' }}>
          {section.fields.map((field) => (
            <FieldRenderer
              key={field.id}
              field={field}
              content={content}
              onChange={onChange}
              t={t}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Field Renderer - Routes to specific input type
 */
function FieldRenderer({
  field,
  content,
  onChange,
  t,
}: {
  field: FieldDefinition;
  content: Record<string, unknown>;
  onChange: (content: Record<string, unknown>) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const value = getNestedValue(content, field.id);

  const handleChange = (newValue: unknown) => {
    onChange(setNestedValue(content, field.id, newValue));
  };

  switch (field.type) {
    case FieldType.Text:
    case FieldType.Email:
    case FieldType.Tel:
    case FieldType.Url:
      return (
        <TextInput
          field={field as TextFieldDefinition}
          value={value as string}
          onChange={handleChange}
        />
      );

    case FieldType.Textarea:
      return (
        <TextareaInput
          field={field as TextareaFieldDefinition}
          value={value as string}
          onChange={handleChange}
        />
      );

    case FieldType.RichText:
      return (
        <RichTextInput
          field={field as RichTextFieldDefinition}
          value={value as string}
          onChange={handleChange}
        />
      );

    case FieldType.Boolean:
      return (
        <BooleanInput
          field={field as BooleanFieldDefinition}
          value={value as boolean}
          onChange={handleChange}
        />
      );

    case FieldType.TextArray:
      return (
        <TextArrayInput
          field={field as TextArrayFieldDefinition}
          value={value as string[]}
          onChange={handleChange}
          t={t}
        />
      );

    case FieldType.Repeater:
      return (
        <RepeaterInput
          field={field as RepeaterFieldDefinition}
          value={value as Array<Record<string, unknown>>}
          onChange={handleChange}
          t={t}
        />
      );

    case FieldType.Image:
    case FieldType.File:
      return (
        <ImageInput
          field={field as ImageFieldDefinition}
          value={value as string}
          onChange={handleChange}
          t={t}
        />
      );

    case FieldType.Icon:
      return (
        <IconInput
          field={field as IconFieldDefinition}
          value={value as string}
          onChange={handleChange}
          t={t}
        />
      );

    case FieldType.EventLink:
      return (
        <EventLinkInput
          field={field as EventLinkFieldDefinition}
          value={value as string}
          onChange={handleChange}
          content={content}
          onContentChange={onChange}
          t={t}
        />
      );

    case FieldType.CheckoutLink:
      return (
        <CheckoutLinkInput
          field={field as CheckoutLinkFieldDefinition}
          value={value as string}
          onChange={handleChange}
          t={t}
        />
      );

    default:
      return (
        <div className="text-xs text-red-600">
          Unsupported field type: {field.type}
        </div>
      );
  }
}

/**
 * Text Input Component
 */
function TextInput({
  field,
  value,
  onChange,
}: {
  field: TextFieldDefinition;
  value: string;
  onChange: (value: string) => void;
}) {
  // For optional URL fields, use text type to avoid HTML5 validation issues
  const inputType = field.type === FieldType.Url && !field.required ? 'text' : field.type;

  return (
    <div>
      <label className="block text-xs font-bold mb-1" style={{ color: 'var(--window-document-text)' }}>
        {field.label}
        {field.required && <span className="ml-1" style={{ color: 'var(--error)' }}>*</span>}
      </label>
      <input
        type={inputType}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        required={field.required}
        maxLength={field.maxLength}
        className="w-full px-2 py-1 text-xs border-2 focus:outline-none"
        style={{
          borderColor: 'var(--window-document-border)',
          background: 'var(--window-document-bg-elevated)',
          color: 'var(--window-document-text)'
        }}
      />
      {field.helpText && (
        <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>{field.helpText}</p>
      )}
    </div>
  );
}

/**
 * Textarea Input Component
 */
function TextareaInput({
  field,
  value,
  onChange,
}: {
  field: TextareaFieldDefinition;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-bold mb-1" style={{ color: 'var(--window-document-text)' }}>
        {field.label}
        {field.required && <span className="ml-1" style={{ color: 'var(--error)' }}>*</span>}
      </label>
      <textarea
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        required={field.required}
        maxLength={field.maxLength}
        rows={field.rows || 3}
        className="w-full px-2 py-1 text-xs border-2 focus:outline-none resize-y"
        style={{
          borderColor: 'var(--window-document-border)',
          background: 'var(--window-document-bg-elevated)',
          color: 'var(--window-document-text)'
        }}
      />
      {field.helpText && (
        <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>{field.helpText}</p>
      )}
    </div>
  );
}

/**
 * Rich Text Input Component (WYSIWYG Editor)
 * Opens in a modal for better editing experience
 * Uses createPortal to render modal outside parent stacking contexts
 */
function RichTextInput({
  field,
  value,
  onChange,
}: {
  field: RichTextFieldDefinition;
  value: string;
  onChange: (value: string) => void;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tempValue, setTempValue] = useState(value || "");
  const [mounted, setMounted] = useState(false);

  // Ensure we're client-side for portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Strip HTML tags for preview
  const getPlainTextPreview = (html: string) => {
    if (!html) return "";
    const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    return text.length > 150 ? text.substring(0, 150) + "..." : text;
  };

  const handleOpen = () => {
    setTempValue(value || "");
    setIsModalOpen(true);
  };

  const handleSave = () => {
    onChange(tempValue);
    setIsModalOpen(false);
  };

  const handleCancel = () => {
    setTempValue(value || "");
    setIsModalOpen(false);
  };

  // Modal content - rendered via portal
  // Note: Using portal to document.body with explicit transform/isolation reset
  // to ensure modal is not affected by parent transforms (e.g., scale-75 in preview)
  const modalContent = isModalOpen && mounted ? createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{
        background: 'rgba(0, 0, 0, 0.5)',
        zIndex: 99999,
        // Reset any inherited transforms and create new stacking context
        transform: 'none',
        isolation: 'isolate',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleCancel();
      }}
    >
      <div
        className="w-full max-w-4xl max-h-[90vh] flex flex-col border-2 shadow-lg"
        style={{
          background: 'var(--window-document-bg)',
          borderColor: 'var(--window-document-border)',
          // Ensure this element is not affected by transforms
          transform: 'none',
          pointerEvents: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          className="flex items-center justify-between px-4 py-2 border-b-2"
          style={{ background: 'var(--tone-accent)', borderColor: 'var(--window-document-border)' }}
        >
          <h3 className="text-sm font-bold" style={{ color: 'var(--window-document-bg-elevated)' }}>
            {field.label}
          </h3>
          <button
            type="button"
            onClick={handleCancel}
            className="w-6 h-6 flex items-center justify-center border-2 text-xs font-bold"
            style={{
              background: 'var(--window-document-bg)',
              borderColor: 'var(--window-document-border)',
              color: 'var(--window-document-text)',
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Modal Body - Editor */}
        <div className="flex-1 overflow-auto p-4">
          <SimpleTiptapEditor
            value={tempValue}
            onChange={setTempValue}
            placeholder={field.placeholder || "Start typing..."}
            minHeight="400px"
          />
        </div>

        {/* Modal Footer */}
        <div
          className="flex items-center justify-end gap-2 px-4 py-3 border-t-2"
          style={{ borderColor: 'var(--window-document-border)' }}
        >
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 text-xs font-bold border-2 transition-colors"
            style={{
              background: 'var(--window-document-bg)',
              borderColor: 'var(--window-document-border)',
              color: 'var(--window-document-text)',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--desktop-menu-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'var(--window-document-bg)'}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 text-xs font-bold border-2 transition-colors"
            style={{
              background: 'var(--tone-accent)',
              borderColor: 'var(--window-document-border)',
              color: 'var(--window-document-bg-elevated)',
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            Save
          </button>
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div>
      <label className="block text-xs font-bold mb-1" style={{ color: 'var(--window-document-text)' }}>
        {field.label}
        {field.required && <span className="ml-1" style={{ color: 'var(--error)' }}>*</span>}
      </label>

      {/* Preview box that opens the modal */}
      <button
        type="button"
        onClick={handleOpen}
        className="w-full text-left border-2 p-3 min-h-[80px] transition-colors"
        style={{
          borderColor: 'var(--window-document-border)',
          background: 'var(--window-document-bg)',
          color: value ? 'var(--window-document-text)' : 'var(--neutral-gray)',
        }}
        onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--tone-accent)'}
        onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--window-document-border)'}
      >
        {value ? (
          <span className="text-xs">{getPlainTextPreview(value)}</span>
        ) : (
          <span className="text-xs italic">{field.placeholder || "Click to edit rich text..."}</span>
        )}
      </button>

      {field.helpText && (
        <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>{field.helpText}</p>
      )}

      {/* Modal rendered via portal to document.body */}
      {modalContent}
    </div>
  );
}

/**
 * Boolean/Checkbox Input Component
 */
function BooleanInput({
  field,
  value,
  onChange,
}: {
  field: BooleanFieldDefinition;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  // Use field's defaultValue if value is undefined
  const effectiveValue = value !== undefined ? value : (field.defaultValue ?? false);

  return (
    <div className="flex items-start gap-2">
      <input
        type="checkbox"
        checked={effectiveValue}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5"
      />
      <div>
        <label className="text-xs font-bold" style={{ color: 'var(--window-document-text)' }}>{field.label}</label>
        {field.helpText && (
          <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>{field.helpText}</p>
        )}
      </div>
    </div>
  );
}

/**
 * Text Array Input Component
 */
function TextArrayInput({
  field,
  value,
  onChange,
  t,
}: {
  field: TextArrayFieldDefinition;
  value: string[];
  onChange: (value: string[]) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const items = value || [];

  const addItem = () => {
    onChange([...items, ""]);
  };

  const updateItem = (index: number, newValue: string) => {
    const newItems = [...items];
    newItems[index] = newValue;
    onChange(newItems);
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div>
      <label className="block text-xs font-bold mb-1" style={{ color: 'var(--window-document-text)' }}>
        {field.label}
        {field.required && <span className="ml-1" style={{ color: 'var(--error)' }}>*</span>}
      </label>
      {field.helpText && (
        <p className="text-xs mb-2" style={{ color: 'var(--neutral-gray)' }}>{field.helpText}</p>
      )}

      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex gap-2">
            <input
              type="text"
              value={item}
              onChange={(e) => updateItem(index, e.target.value)}
              placeholder={field.placeholder}
              className="flex-1 px-2 py-1 text-xs border-2"
              style={{ borderColor: 'var(--window-document-border)', background: 'var(--window-document-bg-elevated)', color: 'var(--window-document-text)' }}
            />
            <button
              onClick={() => removeItem(index)}
              className="px-2 py-1 text-xs border-2 transition-colors"
              style={{ background: 'var(--window-document-bg-elevated)', borderColor: 'var(--window-document-border)', color: 'var(--error)' }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--desktop-menu-hover)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'var(--window-document-bg-elevated)'}
            >
              {t("ui.web_publishing.form.text_array.remove")}
            </button>
          </div>
        ))}
      </div>

      {(!field.maxItems || items.length < field.maxItems) && (
        <button
          onClick={addItem}
          className="mt-2 px-3 py-1 text-xs border-2 transition-colors"
          style={{ background: 'var(--window-document-bg-elevated)', borderColor: 'var(--window-document-border)', color: 'var(--window-document-text)' }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--desktop-menu-hover)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'var(--window-document-bg-elevated)'}
        >
          {t("ui.web_publishing.form.text_array.add").replace("{label}", field.label)}
        </button>
      )}
    </div>
  );
}

/**
 * Repeater Input Component
 */
function RepeaterInput({
  field,
  value,
  onChange,
  t,
}: {
  field: RepeaterFieldDefinition;
  value: Array<Record<string, unknown>>;
  onChange: (value: Array<Record<string, unknown>>) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const items = value || [];

  const addItem = () => {
    const newItem = {
      ...(field.defaultItem || {}),
      id: crypto.randomUUID(),
    };
    onChange([...items, newItem]);
  };

  const updateItem = (index: number, newItem: Record<string, unknown>) => {
    const newItems = [...items];
    newItems[index] = newItem;
    onChange(newItems);
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-bold" style={{ color: 'var(--window-document-text)' }}>
          {field.label}
          {field.required && <span className="ml-1" style={{ color: 'var(--error)' }}>*</span>}
        </label>
        {(!field.maxItems || items.length < field.maxItems) && (
          <button
            onClick={addItem}
            className="px-2 py-1 text-xs border-2 transition-colors"
            style={{ background: 'var(--window-document-bg-elevated)', borderColor: 'var(--window-document-border)', color: 'var(--window-document-text)' }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--desktop-menu-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'var(--window-document-bg-elevated)'}
          >
            {t("ui.web_publishing.form.repeater.add")}
          </button>
        )}
      </div>

      {field.helpText && (
        <p className="text-xs mb-2" style={{ color: 'var(--neutral-gray)' }}>{field.helpText}</p>
      )}

      <div className="space-y-3">
        {items.map((item, index) => (
          <div
            key={item.id as string}
            className="border-2 p-3"
            style={{ borderColor: 'var(--window-document-border)', background: 'var(--window-document-bg-elevated)' }}
          >
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold" style={{ color: 'var(--window-document-text)' }}>
                {t("ui.web_publishing.form.repeater.item_number").replace("{label}", field.label).replace("{number}", String(index + 1))}
              </span>
              <button
                onClick={() => removeItem(index)}
                className="px-2 py-1 text-xs border-2 transition-colors"
                style={{ background: 'var(--window-document-bg-elevated)', borderColor: 'var(--window-document-border)', color: 'var(--error)' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--desktop-menu-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'var(--window-document-bg-elevated)'}
              >
                {t("ui.web_publishing.form.repeater.remove")}
              </button>
            </div>

            <div className="space-y-3">
              {field.fields.map((subField) => (
                <FieldRenderer
                  key={subField.id}
                  field={subField}
                  content={item}
                  onChange={(newContent) => updateItem(index, newContent)}
                  t={t}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Image Input Component - Media Library Only
 *
 * Users MUST use the Media Library app to select images.
 * No direct uploads or external URLs allowed.
 */
function ImageInput({
  field,
  value,
  onChange,
  t,
}: {
  field: ImageFieldDefinition;
  value: string;
  onChange: (value: string) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const { openWindow } = useWindowManager();

  // Check if Media Library app is available
  const { isAvailable: isMediaLibraryAvailable, organizationName } = useAppAvailability("media-library");

  // Handle opening media library for selection
  // IMPORTANT: Use the same window ID as the main Media Library to reuse the window
  const handleBrowseLibrary = () => {
    openWindow(
      "media-library",
      "Media Library",
      <MediaLibraryWindow
        selectionMode={true}
        onSelect={(media) => {
          onChange(media.url || '');
        }}
      />,
      { x: 240, y: 160 },
      { width: 1000, height: 700 }
    );
  };

  return (
    <div>
      <label className="block text-xs font-bold mb-1" style={{ color: 'var(--window-document-text)' }}>
        {field.label}
        {field.required && <span className="ml-1" style={{ color: 'var(--error)' }}>*</span>}
      </label>

      {/* Media Library Selection Only */}
      {isMediaLibraryAvailable ? (
        <button
          type="button"
          onClick={handleBrowseLibrary}
          className="w-full px-4 py-3 text-sm border-2 flex items-center justify-center gap-2 transition-colors"
          style={{ borderColor: 'var(--window-document-border)', background: 'var(--window-document-bg-elevated)', color: 'var(--window-document-text)' }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--desktop-menu-hover)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'var(--window-document-bg-elevated)'}
        >
          {t("ui.web_publishing.form.media_library.select")}
        </button>
      ) : (
        <AppUnavailableInline
          appName="Media Library"
          organizationName={organizationName}
        />
      )}

      {field.helpText && (
        <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>{field.helpText}</p>
      )}

      {/* Info message */}
      {isMediaLibraryAvailable && !value && (
        <p className="text-xs mt-2 italic" style={{ color: 'var(--neutral-gray)' }}>
          {t("ui.web_publishing.form.media_library.required_notice")}
        </p>
      )}

      {/* Selected Image Preview with Remove Button */}
      {value && (
        <div className="mt-2 border-2 p-3 relative rounded" style={{ borderColor: 'var(--tone-accent)', background: 'var(--desktop-menu-hover)' }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold" style={{ color: 'var(--window-document-text)' }}>{t("ui.web_publishing.form.media_library.selected_image")}</p>
            <button
              type="button"
              onClick={() => onChange("")}
              className="px-3 py-1.5 text-xs font-bold rounded flex items-center gap-1 transition-colors"
              style={{ background: 'var(--error)', color: 'white' }}
              title={t("ui.web_publishing.form.media_library.remove_title")}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              <X className="w-3 h-3" />
              {t("ui.web_publishing.form.media_library.remove")}
            </button>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Selected"
            className="w-full h-auto max-h-48 object-contain border p-2 rounded"
            style={{ borderColor: 'var(--window-document-border)', background: 'var(--window-document-bg-elevated)' }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <p className="text-xs mt-2 break-all" style={{ color: 'var(--neutral-gray)' }}>
            {value.substring(0, 60)}{value.length > 60 ? '...' : ''}
          </p>
        </div>
      )}
    </div>
  );
}


/**
 * Icon Input Component
 */
function IconInput({
  field,
  value,
  onChange,
  t,
}: {
  field: IconFieldDefinition;
  value: string;
  onChange: (value: string) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  // Common icon options (emojis for simplicity)
  const iconOptions = [
    "", "", "", "", "", "", "", "", "", "",
    "⭐", "", "", "", "", "", "", "", "", "",
    "", "", "", "", "", "", "", "", "", ""
  ];

  return (
    <div>
      <label className="block text-xs font-bold mb-1" style={{ color: 'var(--window-document-text)' }}>
        {field.label}
        {field.required && <span className="ml-1" style={{ color: 'var(--error)' }}>*</span>}
      </label>
      {field.helpText && (
        <p className="text-xs mb-2" style={{ color: 'var(--neutral-gray)' }}>{field.helpText}</p>
      )}

      <div className="grid grid-cols-10 gap-1 mb-2">
        {iconOptions.map((icon) => (
          <button
            key={icon}
            type="button"
            onClick={() => onChange(icon)}
            className="p-2 text-lg border-2 transition-colors"
            style={{
              borderColor: value === icon ? 'var(--tone-accent)' : 'var(--window-document-border)',
              background: value === icon ? 'var(--desktop-menu-hover)' : 'var(--window-document-bg-elevated)'
            }}
            onMouseEnter={(e) => {
              if (value !== icon) e.currentTarget.style.background = 'var(--desktop-menu-hover)';
            }}
            onMouseLeave={(e) => {
              if (value !== icon) e.currentTarget.style.background = 'var(--window-document-bg-elevated)';
            }}
          >
            {icon}
          </button>
        ))}
      </div>

      <input
        type="text"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t("ui.web_publishing.form.icon.custom_placeholder")}
        className="w-full px-2 py-1 text-xs border-2 focus:outline-none"
        style={{ borderColor: 'var(--window-document-border)', background: 'var(--window-document-bg-elevated)', color: 'var(--window-document-text)' }}
      />

      {value && (
        <div className="mt-2 text-2xl border-2 p-2 text-center" style={{ borderColor: 'var(--window-document-border)', background: 'var(--window-document-bg-elevated)' }}>
          {value}
        </div>
      )}
    </div>
  );
}

/**
 * Event Link Input Component
 *
 * Allows linking to events from Event Management app.
 * Auto-populates specified fields when an event is selected.
 */
function EventLinkInput({
  field,
  value,
  content,
  onContentChange,
  t,
}: {
  field: EventLinkFieldDefinition;
  value: string;
  onChange: (value: string) => void;
  content: Record<string, unknown>;
  onContentChange: (content: Record<string, unknown>) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const { sessionId } = useAuth();
  const currentOrg = useCurrentOrganization();

  // Check if Event Management app is available
  const { isAvailable: isEventAppAvailable, organizationName } = useAppAvailability("events");

  // Fetch available events
  const availableEvents = useQuery(
    api.eventOntology.getEvents,
    sessionId && currentOrg?.id && isEventAppAvailable
      ? {
          sessionId,
          organizationId: currentOrg.id as Id<"organizations">,
        }
      : "skip"
  );

  // Handle event selection
  const handleEventSelect = (eventId: string) => {
    // Start with current content
    let newContent = { ...content };

    // FIRST: Store the event ID in the field
    newContent = setNestedValue(newContent, field.id, eventId);

    // If empty selection, just update and return
    if (!eventId) {
      onContentChange(newContent);
      return;
    }

    // Find the selected event
    const selectedEvent = availableEvents?.find((e) => e._id === eventId);
    if (!selectedEvent) {
      onContentChange(newContent);
      return;
    }

    // Only auto-populate if configured
    if (!field.autoPopulateFields) {
      onContentChange(newContent);
      return;
    }

    const props = selectedEvent.customProperties || {};
    const autoFields = field.autoPopulateFields;

    // Basic Info
    if (autoFields.eventName) {
      newContent = setNestedValue(newContent, autoFields.eventName, selectedEvent.name);
    }

    if (autoFields.eventDescription && selectedEvent.description) {
      newContent = setNestedValue(newContent, autoFields.eventDescription, selectedEvent.description);
    }

    if (autoFields.eventDetailedDescription && props.detailedDescription) {
      newContent = setNestedValue(newContent, autoFields.eventDetailedDescription, props.detailedDescription as string);
    }

    // Date & Time
    if (autoFields.eventDate && props.startDate) {
      const startDate = new Date(props.startDate as number);
      const formattedDate = startDate.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      newContent = setNestedValue(newContent, autoFields.eventDate, formattedDate);
    }

    if (autoFields.eventEndDate && props.endDate) {
      const endDate = new Date(props.endDate as number);
      const formattedEndDate = endDate.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      newContent = setNestedValue(newContent, autoFields.eventEndDate, formattedEndDate);
    }

    if (autoFields.eventStartTime && props.startTime) {
      newContent = setNestedValue(newContent, autoFields.eventStartTime, props.startTime as string);
    }

    if (autoFields.eventEndTime && props.endTime) {
      newContent = setNestedValue(newContent, autoFields.eventEndTime, props.endTime as string);
    }

    if (autoFields.eventShowEndTime && props.showEndTime !== undefined) {
      newContent = setNestedValue(newContent, autoFields.eventShowEndTime, props.showEndTime as boolean);
    }

    // Location
    if (autoFields.eventLocation && props.location) {
      newContent = setNestedValue(newContent, autoFields.eventLocation, props.location as string);
    }

    if (autoFields.eventVenueName && props.venueName) {
      newContent = setNestedValue(newContent, autoFields.eventVenueName, props.venueName as string);
    }

    if (autoFields.eventAddress && props.address) {
      newContent = setNestedValue(newContent, autoFields.eventAddress, props.address as string);
    }

    if (autoFields.eventCity && props.city) {
      newContent = setNestedValue(newContent, autoFields.eventCity, props.city as string);
    }

    if (autoFields.eventState && props.state) {
      newContent = setNestedValue(newContent, autoFields.eventState, props.state as string);
    }

    if (autoFields.eventPostalCode && props.postalCode) {
      newContent = setNestedValue(newContent, autoFields.eventPostalCode, props.postalCode as string);
    }

    if (autoFields.eventCountry && props.country) {
      newContent = setNestedValue(newContent, autoFields.eventCountry, props.country as string);
    }

    if (autoFields.eventLocationType && props.locationType) {
      const locationTypeMap: Record<string, string> = {
        physical: "In-Person",
        virtual: "Virtual Event",
        hybrid: "Hybrid (In-Person & Virtual)",
      };
      const formattedType = locationTypeMap[props.locationType as string] || props.locationType as string;
      newContent = setNestedValue(newContent, autoFields.eventLocationType, formattedType);
    }

    if (autoFields.eventShowMap && props.showMap !== undefined) {
      newContent = setNestedValue(newContent, autoFields.eventShowMap, props.showMap as boolean);
    }

    // Media
    if (autoFields.eventVideoUrl && props.media) {
      const media = props.media as { items?: Array<{ videoUrl?: string }> };
      const videoUrl = media.items?.[0]?.videoUrl;
      if (videoUrl) {
        newContent = setNestedValue(newContent, autoFields.eventVideoUrl, videoUrl);
      }
    }

    if (autoFields.eventImageUrl && props.media) {
      const media = props.media as { items?: Array<{ imageUrl?: string }> };
      const imageUrl = media.items?.[0]?.imageUrl;
      if (imageUrl) {
        newContent = setNestedValue(newContent, autoFields.eventImageUrl, imageUrl);
      }
    }

    // Agenda
    if (autoFields.eventAgenda && props.agenda) {
      const agenda = props.agenda as Array<{
        id: string;
        date: number;
        startTime: string;
        endTime?: string;
        title: string;
        description?: string;
        location?: string;
        speaker?: string;
      }>;

      // Convert agenda to the format expected by the template
      const agendaDays = Object.values(
        agenda.reduce((acc: Record<string, { id: string; date: string; sessions: Array<unknown> }>, item) => {
          const dateKey = new Date(item.date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          });
          if (!acc[dateKey]) {
            acc[dateKey] = {
              id: `day-${item.date}`,
              date: dateKey,
              sessions: [],
            };
          }
          acc[dateKey].sessions.push({
            id: item.id,
            time: props.showEndTime && item.endTime
              ? `${item.startTime} - ${item.endTime}`
              : item.startTime,
            title: item.title,
            speaker: item.speaker || "",
            type: "session",
            location: item.location,
          });
          return acc;
        }, {})
      );

      if (agendaDays.length > 0) {
        newContent = setNestedValue(newContent, autoFields.eventAgenda, agendaDays);
      }
    }

    // Registration
    if (autoFields.eventRegistrationUrl && props.registrationUrl) {
      newContent = setNestedValue(newContent, autoFields.eventRegistrationUrl, props.registrationUrl as string);
    }

    if (autoFields.eventCapacity && props.capacity !== undefined) {
      newContent = setNestedValue(newContent, autoFields.eventCapacity, props.capacity as number);
    }

    if (autoFields.eventShowAvailableSeats && props.showAvailableSeats !== undefined) {
      newContent = setNestedValue(newContent, autoFields.eventShowAvailableSeats, props.showAvailableSeats as boolean);
    }

    // Apply all updates at once
    onContentChange(newContent);
  };

  // Get selected event details
  const selectedEvent = availableEvents?.find((e) => e._id === value);

  return (
    <div>
      <label className="block text-xs font-bold mb-1" style={{ color: 'var(--window-document-text)' }}>
        {field.label}
        {field.required && <span className="ml-1" style={{ color: 'var(--error)' }}>*</span>}
      </label>

      {isEventAppAvailable ? (
        <>
          <select
            value={value || ""}
            onChange={(e) => handleEventSelect(e.target.value)}
            className="w-full px-2 py-1 text-xs border-2 focus:outline-none"
            style={{ borderColor: 'var(--window-document-border)', background: 'var(--window-document-bg-elevated)', color: 'var(--window-document-text)' }}
          >
            <option value="">{t("ui.web_publishing.form.event_link.select_event")}</option>
            {availableEvents?.map((event) => (
              <option key={event._id} value={event._id}>
                {event.name} ({event.subtype})
              </option>
            ))}
          </select>

          {field.helpText && (
            <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>{field.helpText}</p>
          )}

          {/* Selected Event Preview */}
          {selectedEvent && (
            <div className="mt-2 border-2 p-3 rounded" style={{ borderColor: 'var(--tone-accent)', background: 'var(--desktop-menu-hover)' }}>
              <p className="text-xs font-bold mb-2" style={{ color: 'var(--window-document-text)' }}>{t("ui.web_publishing.form.event_link.linked_event")}</p>
              <div className="space-y-1 text-xs">
                <p style={{ color: 'var(--window-document-text)' }}>
                  <span className="font-bold">{t("ui.web_publishing.form.event_link.name")}</span> {selectedEvent.name}
                </p>
                <p style={{ color: 'var(--window-document-text)' }}>
                  <span className="font-bold">{t("ui.web_publishing.form.event_link.type")}</span> {selectedEvent.subtype}
                </p>
                {selectedEvent.customProperties?.startDate && (
                  <p style={{ color: 'var(--window-document-text)' }}>
                    <span className="font-bold">{t("ui.web_publishing.form.event_link.date")}</span>{" "}
                    {new Date(selectedEvent.customProperties.startDate as number).toLocaleDateString()}
                  </p>
                )}
                {selectedEvent.customProperties?.location && (
                  <p style={{ color: 'var(--window-document-text)' }}>
                    <span className="font-bold">{t("ui.web_publishing.form.event_link.location")}</span>{" "}
                    {selectedEvent.customProperties.location as string}
                  </p>
                )}
              </div>
              {field.autoPopulateFields && (
                <p className="text-xs mt-2 italic" style={{ color: 'var(--neutral-gray)' }}>
                  {t("ui.web_publishing.form.event_link.auto_populated")}
                </p>
              )}
            </div>
          )}
        </>
      ) : (
        <AppUnavailableInline
          appName="Event Management"
          organizationName={organizationName}
        />
      )}
    </div>
  );
}

/**
 * Checkout Link Input Component
 *
 * Allows linking to checkout instances from Checkout app.
 * Products from the checkout are automatically displayed in the template.
 */
function CheckoutLinkInput({
  field,
  value,
  onChange,
  t,
}: {
  field: CheckoutLinkFieldDefinition;
  value: string;
  onChange: (value: string) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const { sessionId } = useAuth();
  const currentOrg = useCurrentOrganization();

  // Check if Checkout app is available
  const { isAvailable: isCheckoutAppAvailable, organizationName } = useAppAvailability("checkout");

  // Fetch available checkout instances
  const availableCheckouts = useQuery(
    api.checkoutOntology.getCheckoutInstances,
    sessionId && currentOrg?.id && isCheckoutAppAvailable
      ? {
          sessionId,
          organizationId: currentOrg.id as Id<"organizations">,
          status: "published", // Only show published checkouts
        }
      : "skip"
  );

  // Get selected checkout details
  const selectedCheckout = availableCheckouts?.find((c) => c._id === value);

  // Get product count
  const productCount = selectedCheckout?.customProperties?.linkedProducts
    ? (selectedCheckout.customProperties.linkedProducts as string[]).length
    : 0;

  return (
    <div>
      <label className="block text-xs font-bold mb-1" style={{ color: 'var(--window-document-text)' }}>
        {field.label}
        {field.required && <span className="ml-1" style={{ color: 'var(--error)' }}>*</span>}
      </label>

      {isCheckoutAppAvailable ? (
        <>
          <select
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-2 py-1 text-xs border-2 focus:outline-none"
            style={{ borderColor: 'var(--window-document-border)', background: 'var(--window-document-bg-elevated)', color: 'var(--window-document-text)' }}
          >
            <option value="">{t("ui.web_publishing.form.checkout_link.select_checkout")}</option>
            {availableCheckouts?.map((checkout) => (
              <option key={checkout._id} value={checkout._id}>
                {checkout.name} ({checkout.subtype})
              </option>
            ))}
          </select>

          {field.helpText && (
            <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>{field.helpText}</p>
          )}

          {/* Selected Checkout Preview */}
          {selectedCheckout && (
            <div className="mt-2 border-2 p-3 rounded" style={{ borderColor: 'var(--tone-accent)', background: 'var(--desktop-menu-hover)' }}>
              <p className="text-xs font-bold mb-2" style={{ color: 'var(--window-document-text)' }}>{t("ui.web_publishing.form.checkout_link.linked_checkout")}</p>
              <div className="space-y-1 text-xs">
                <p style={{ color: 'var(--window-document-text)' }}>
                  <span className="font-bold">Name:</span> {selectedCheckout.name}
                </p>
                <p style={{ color: 'var(--window-document-text)' }}>
                  <span className="font-bold">Type:</span> {selectedCheckout.subtype}
                </p>
                <p style={{ color: 'var(--window-document-text)' }}>
                  <span className="font-bold">{t("ui.web_publishing.form.checkout_link.products")}</span> {t("ui.web_publishing.form.checkout_link.products_linked").replace("{count}", String(productCount))}
                </p>
                {selectedCheckout.customProperties?.paymentProvider && (
                  <p style={{ color: 'var(--window-document-text)' }}>
                    <span className="font-bold">{t("ui.web_publishing.form.checkout_link.payment")}</span>{" "}
                    {selectedCheckout.customProperties.paymentProvider as string}
                  </p>
                )}
              </div>
              <p className="text-xs mt-2 italic" style={{ color: 'var(--neutral-gray)' }}>
                {t("ui.web_publishing.form.checkout_link.products_displayed")}
              </p>
            </div>
          )}
        </>
      ) : (
        <AppUnavailableInline
          appName="Checkout"
          organizationName={organizationName}
        />
      )}
    </div>
  );
}

/**
 * Helper: Get nested value from object using dot notation
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce((current, key) => {
    return current && typeof current === "object"
      ? (current as Record<string, unknown>)[key]
      : undefined;
  }, obj as unknown);
}

/**
 * Helper: Set nested value in object using dot notation
 */
function setNestedValue(
  obj: Record<string, unknown>,
  path: string,
  value: unknown
): Record<string, unknown> {
  const keys = path.split(".");
  const newObj = JSON.parse(JSON.stringify(obj)); // Deep clone

  let current: Record<string, unknown> = newObj;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!current[key] || typeof current[key] !== "object") {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }

  current[keys[keys.length - 1]] = value;
  return newObj;
}
