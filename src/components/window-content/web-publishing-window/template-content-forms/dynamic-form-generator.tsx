/**
 * DYNAMIC FORM GENERATOR
 *
 * Generates form fields dynamically based on template schema.
 * This eliminates the need for template-specific form components!
 */

import { useState } from "react";
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
  RepeaterFieldDefinition,
  BooleanFieldDefinition,
  TextArrayFieldDefinition,
  ImageFieldDefinition,
  IconFieldDefinition,
  EventLinkFieldDefinition,
  CheckoutLinkFieldDefinition,
} from "@/templates/schema-types";

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
  return (
    <div className="space-y-6">
      {schema.sections.map((section) => (
        <SectionRenderer
          key={section.id}
          section={section}
          content={content}
          onChange={onChange}
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
}: {
  section: SectionDefinition;
  content: Record<string, unknown>;
  onChange: (content: Record<string, unknown>) => void;
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
      <div className="border-2 border-gray-400 bg-white">
        {/* Section Header */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between p-3 hover:bg-gray-50"
        >
          <div className="text-left">
            <h4 className="text-xs font-bold">{section.label}</h4>
            {section.description && (
              <p className="text-xs text-gray-600 mt-1">{section.description}</p>
            )}
          </div>
          <span className="text-xs">{isOpen ? "▼" : "▶"}</span>
        </button>

        {/* Repeater Content */}
        {isOpen && (
          <div className="p-3 border-t-2 border-gray-300">
            <FieldRenderer
              field={repeaterField}
              content={content}
              onChange={onChange}
            />
          </div>
        )}
      </div>
    );
  }

  // Regular section - render fields normally
  return (
    <div className="border-2 border-gray-400 bg-white">
      {/* Section Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 hover:bg-gray-50"
      >
        <div className="text-left">
          <h4 className="text-xs font-bold">{section.label}</h4>
          {section.description && (
            <p className="text-xs text-gray-600 mt-1">{section.description}</p>
          )}
        </div>
        <span className="text-xs">{isOpen ? "▼" : "▶"}</span>
      </button>

      {/* Section Content */}
      {isOpen && (
        <div className="p-3 border-t-2 border-gray-300 space-y-4">
          {section.fields.map((field) => (
            <FieldRenderer
              key={field.id}
              field={field}
              content={content}
              onChange={onChange}
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
}: {
  field: FieldDefinition;
  content: Record<string, unknown>;
  onChange: (content: Record<string, unknown>) => void;
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
        />
      );

    case FieldType.Repeater:
      return (
        <RepeaterInput
          field={field as RepeaterFieldDefinition}
          value={value as Array<Record<string, unknown>>}
          onChange={handleChange}
        />
      );

    case FieldType.Image:
    case FieldType.File:
      return (
        <ImageInput
          field={field as ImageFieldDefinition}
          value={value as string}
          onChange={handleChange}
        />
      );

    case FieldType.Icon:
      return (
        <IconInput
          field={field as IconFieldDefinition}
          value={value as string}
          onChange={handleChange}
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
        />
      );

    case FieldType.CheckoutLink:
      return (
        <CheckoutLinkInput
          field={field as CheckoutLinkFieldDefinition}
          value={value as string}
          onChange={handleChange}
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
  return (
    <div>
      <label className="block text-xs font-bold mb-1">
        {field.label}
        {field.required && <span className="text-red-600 ml-1">*</span>}
      </label>
      <input
        type={field.type}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        required={field.required}
        maxLength={field.maxLength}
        className="w-full px-2 py-1 text-xs border-2 border-gray-400 bg-white focus:border-purple-500 focus:outline-none"
      />
      {field.helpText && (
        <p className="text-xs text-gray-600 mt-1">{field.helpText}</p>
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
      <label className="block text-xs font-bold mb-1">
        {field.label}
        {field.required && <span className="text-red-600 ml-1">*</span>}
      </label>
      <textarea
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        required={field.required}
        maxLength={field.maxLength}
        rows={field.rows || 3}
        className="w-full px-2 py-1 text-xs border-2 border-gray-400 bg-white focus:border-purple-500 focus:outline-none resize-y"
      />
      {field.helpText && (
        <p className="text-xs text-gray-600 mt-1">{field.helpText}</p>
      )}
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
  return (
    <div className="flex items-start gap-2">
      <input
        type="checkbox"
        checked={value || false}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5"
      />
      <div>
        <label className="text-xs font-bold">{field.label}</label>
        {field.helpText && (
          <p className="text-xs text-gray-600 mt-1">{field.helpText}</p>
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
}: {
  field: TextArrayFieldDefinition;
  value: string[];
  onChange: (value: string[]) => void;
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
      <label className="block text-xs font-bold mb-1">
        {field.label}
        {field.required && <span className="text-red-600 ml-1">*</span>}
      </label>
      {field.helpText && (
        <p className="text-xs text-gray-600 mb-2">{field.helpText}</p>
      )}

      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex gap-2">
            <input
              type="text"
              value={item}
              onChange={(e) => updateItem(index, e.target.value)}
              placeholder={field.placeholder}
              className="flex-1 px-2 py-1 text-xs border-2 border-gray-400 bg-white"
            />
            <button
              onClick={() => removeItem(index)}
              className="px-2 py-1 text-xs bg-red-100 hover:bg-red-200 border-2 border-gray-400"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      {(!field.maxItems || items.length < field.maxItems) && (
        <button
          onClick={addItem}
          className="mt-2 px-3 py-1 text-xs bg-purple-100 hover:bg-purple-200 border-2 border-gray-400"
        >
          + Add {field.label}
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
}: {
  field: RepeaterFieldDefinition;
  value: Array<Record<string, unknown>>;
  onChange: (value: Array<Record<string, unknown>>) => void;
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
        <label className="text-xs font-bold">
          {field.label}
          {field.required && <span className="text-red-600 ml-1">*</span>}
        </label>
        {(!field.maxItems || items.length < field.maxItems) && (
          <button
            onClick={addItem}
            className="px-2 py-1 text-xs bg-purple-100 hover:bg-purple-200 border-2 border-gray-400"
          >
            + Add
          </button>
        )}
      </div>

      {field.helpText && (
        <p className="text-xs text-gray-600 mb-2">{field.helpText}</p>
      )}

      <div className="space-y-3">
        {items.map((item, index) => (
          <div
            key={item.id as string}
            className="border-2 border-gray-300 p-3 bg-gray-50"
          >
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold">
                {field.label} #{index + 1}
              </span>
              <button
                onClick={() => removeItem(index)}
                className="px-2 py-1 text-xs bg-red-100 hover:bg-red-200 border-2 border-gray-400"
              >
                Remove
              </button>
            </div>

            <div className="space-y-3">
              {field.fields.map((subField) => (
                <FieldRenderer
                  key={subField.id}
                  field={subField}
                  content={item}
                  onChange={(newContent) => updateItem(index, newContent)}
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
}: {
  field: ImageFieldDefinition;
  value: string;
  onChange: (value: string) => void;
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
          onChange(media.url);
        }}
      />,
      { x: 240, y: 160 },
      { width: 1000, height: 700 }
    );
  };

  return (
    <div>
      <label className="block text-xs font-bold mb-1">
        {field.label}
        {field.required && <span className="text-red-600 ml-1">*</span>}
      </label>

      {/* Media Library Selection Only */}
      {isMediaLibraryAvailable ? (
        <button
          type="button"
          onClick={handleBrowseLibrary}
          className="w-full px-4 py-3 text-sm border-2 border-gray-400 bg-white hover:bg-purple-50 focus:border-purple-500 focus:outline-none flex items-center justify-center gap-2"
        >
          📁 Select from Media Library
        </button>
      ) : (
        <AppUnavailableInline
          appName="Media Library"
          organizationName={organizationName}
        />
      )}

      {field.helpText && (
        <p className="text-xs text-gray-600 mt-1">{field.helpText}</p>
      )}

      {/* Info message */}
      {isMediaLibraryAvailable && !value && (
        <p className="text-xs text-gray-500 mt-2 italic">
          Images must be uploaded to Media Library first, then selected here.
        </p>
      )}

      {/* Selected Image Preview with Remove Button */}
      {value && (
        <div className="mt-2 border-2 border-purple-400 p-3 bg-purple-50 relative rounded">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-purple-900">Selected Image:</p>
            <button
              type="button"
              onClick={() => onChange("")}
              className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded flex items-center gap-1 transition-colors"
              title="Remove this image"
            >
              <X className="w-3 h-3" />
              Remove
            </button>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Selected"
            className="w-full h-auto max-h-48 object-contain border border-purple-200 bg-white p-2 rounded"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
          <p className="text-xs text-purple-700 mt-2 break-all">
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
}: {
  field: IconFieldDefinition;
  value: string;
  onChange: (value: string) => void;
}) {
  // Common icon options (emojis for simplicity)
  const iconOptions = [
    "✨", "🚀", "💡", "🎯", "⚡", "🔥", "💰", "📊", "🎨", "🔒",
    "⭐", "❤️", "👍", "🎉", "📱", "💻", "🌟", "🏆", "📈", "🎁",
    "🔔", "📧", "🌍", "🎵", "📷", "🎮", "☁️", "🔗", "📝", "🔍"
  ];

  return (
    <div>
      <label className="block text-xs font-bold mb-1">
        {field.label}
        {field.required && <span className="text-red-600 ml-1">*</span>}
      </label>
      {field.helpText && (
        <p className="text-xs text-gray-600 mb-2">{field.helpText}</p>
      )}

      <div className="grid grid-cols-10 gap-1 mb-2">
        {iconOptions.map((icon) => (
          <button
            key={icon}
            type="button"
            onClick={() => onChange(icon)}
            className={`p-2 text-lg border-2 hover:bg-purple-50 ${
              value === icon
                ? 'border-purple-500 bg-purple-100'
                : 'border-gray-300 bg-white'
            }`}
          >
            {icon}
          </button>
        ))}
      </div>

      <input
        type="text"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder || "Or enter custom icon/emoji"}
        className="w-full px-2 py-1 text-xs border-2 border-gray-400 bg-white focus:border-purple-500 focus:outline-none"
      />

      {value && (
        <div className="mt-2 text-2xl border-2 border-gray-300 p-2 bg-gray-50 text-center">
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
  onChange,
  content,
  onContentChange,
}: {
  field: EventLinkFieldDefinition;
  value: string;
  onChange: (value: string) => void;
  content: Record<string, unknown>;
  onContentChange: (content: Record<string, unknown>) => void;
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

    // Auto-populate fields based on configuration
    if (field.autoPopulateFields.eventName) {
      newContent = setNestedValue(newContent, field.autoPopulateFields.eventName, selectedEvent.name);
    }

    if (field.autoPopulateFields.eventDate && selectedEvent.customProperties?.startDate) {
      const startDate = new Date(selectedEvent.customProperties.startDate as number);
      const formattedDate = startDate.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      newContent = setNestedValue(newContent, field.autoPopulateFields.eventDate, formattedDate);
    }

    if (field.autoPopulateFields.eventLocation && selectedEvent.customProperties?.location) {
      newContent = setNestedValue(newContent, field.autoPopulateFields.eventLocation, selectedEvent.customProperties.location);
    }

    if (field.autoPopulateFields.eventDescription && selectedEvent.description) {
      newContent = setNestedValue(newContent, field.autoPopulateFields.eventDescription, selectedEvent.description);
    }

    // Apply all updates at once
    onContentChange(newContent);
  };

  // Get selected event details
  const selectedEvent = availableEvents?.find((e) => e._id === value);

  return (
    <div>
      <label className="block text-xs font-bold mb-1">
        {field.label}
        {field.required && <span className="text-red-600 ml-1">*</span>}
      </label>

      {isEventAppAvailable ? (
        <>
          <select
            value={value || ""}
            onChange={(e) => handleEventSelect(e.target.value)}
            className="w-full px-2 py-1 text-xs border-2 border-gray-400 bg-white focus:border-purple-500 focus:outline-none"
          >
            <option value="">-- Select an event --</option>
            {availableEvents?.map((event) => (
              <option key={event._id} value={event._id}>
                {event.name} ({event.subtype})
              </option>
            ))}
          </select>

          {field.helpText && (
            <p className="text-xs text-gray-600 mt-1">{field.helpText}</p>
          )}

          {/* Selected Event Preview */}
          {selectedEvent && (
            <div className="mt-2 border-2 border-purple-400 p-3 bg-purple-50 rounded">
              <p className="text-xs font-bold text-purple-900 mb-2">Linked Event:</p>
              <div className="space-y-1 text-xs">
                <p>
                  <span className="font-bold">Name:</span> {selectedEvent.name}
                </p>
                <p>
                  <span className="font-bold">Type:</span> {selectedEvent.subtype}
                </p>
                {selectedEvent.customProperties?.startDate && (
                  <p>
                    <span className="font-bold">Date:</span>{" "}
                    {new Date(selectedEvent.customProperties.startDate as number).toLocaleDateString()}
                  </p>
                )}
                {selectedEvent.customProperties?.location && (
                  <p>
                    <span className="font-bold">Location:</span>{" "}
                    {selectedEvent.customProperties.location as string}
                  </p>
                )}
              </div>
              {field.autoPopulateFields && (
                <p className="text-xs text-purple-700 mt-2 italic">
                  ✓ Fields auto-populated from this event
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
}: {
  field: CheckoutLinkFieldDefinition;
  value: string;
  onChange: (value: string) => void;
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
      <label className="block text-xs font-bold mb-1">
        {field.label}
        {field.required && <span className="text-red-600 ml-1">*</span>}
      </label>

      {isCheckoutAppAvailable ? (
        <>
          <select
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-2 py-1 text-xs border-2 border-gray-400 bg-white focus:border-purple-500 focus:outline-none"
          >
            <option value="">-- Select a checkout --</option>
            {availableCheckouts?.map((checkout) => (
              <option key={checkout._id} value={checkout._id}>
                {checkout.name} ({checkout.subtype})
              </option>
            ))}
          </select>

          {field.helpText && (
            <p className="text-xs text-gray-600 mt-1">{field.helpText}</p>
          )}

          {/* Selected Checkout Preview */}
          {selectedCheckout && (
            <div className="mt-2 border-2 border-purple-400 p-3 bg-purple-50 rounded">
              <p className="text-xs font-bold text-purple-900 mb-2">Linked Checkout:</p>
              <div className="space-y-1 text-xs">
                <p>
                  <span className="font-bold">Name:</span> {selectedCheckout.name}
                </p>
                <p>
                  <span className="font-bold">Type:</span> {selectedCheckout.subtype}
                </p>
                <p>
                  <span className="font-bold">Products:</span> {productCount} linked
                </p>
                {selectedCheckout.customProperties?.paymentProvider && (
                  <p>
                    <span className="font-bold">Payment:</span>{" "}
                    {selectedCheckout.customProperties.paymentProvider as string}
                  </p>
                )}
              </div>
              <p className="text-xs text-purple-700 mt-2 italic">
                ✓ Products will be displayed from this checkout
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
