"use client";

/**
 * ADDON MANAGER COMPONENT
 *
 * UI for managing product addons in the product form.
 * Allows adding, editing, and removing addons with full configuration.
 */

import { useState } from "react";
import { Plus, Trash2, Edit2, Save, X } from "lucide-react";
import { ProductAddon } from "@/types/product-addons";
import { getTaxCodesForCountry } from "@/lib/tax-calculator";
import { useNotification } from "@/hooks/use-notification";
import { ConfirmationModal } from "@/components/confirmation-modal";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";

interface AddonManagerProps {
  addons: ProductAddon[];
  currency: string;
  onChange: (addons: ProductAddon[]) => void;
  availableFormFields?: Array<{
    id: string;
    label: string;
    type?: string;
    options?: Array<{ value: string; label: string }>;
  }>; // Optional: form fields with options for auto-mapping
}

export function AddonManager({
  addons,
  currency,
  onChange,
  availableFormFields = [],
}: AddonManagerProps) {
  const { t } = useNamespaceTranslations("ui.products");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [currentAddon, setCurrentAddon] = useState<Partial<ProductAddon>>({
    id: "",
    name: "",
    description: "",
    pricePerUnit: 0,
    currency,
    taxable: true,
    formFieldIds: [],
    formFieldMapping: {},
    displayInCart: true,
  });

  // Store price as string to avoid cursor jumping
  const [priceInput, setPriceInput] = useState<string>("");

  // Get available tax codes (assuming EUR organization for demo)
  const taxCodes = getTaxCodesForCountry("DE"); // TODO: Use actual org country

  // Notification system
  const notification = useNotification();

  // Delete confirmation modal
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    isOpen: boolean;
    index: number;
    addonName: string;
  } | null>(null);

  /**
   * Auto-generate quantity mapping from selected form fields
   * For fields with numeric options like "0", "1", "2", creates mapping: { "0": 0, "1": 1, "2": 2 }
   */
  const handleAutoGenerateMapping = () => {
    const selectedFieldIds = currentAddon.formFieldIds || [];
    if (selectedFieldIds.length === 0) {
      notification.error("Missing Form Field", "Please select at least one form field first");
      return;
    }

    // Get the first selected field to use as template
    const firstField = availableFormFields.find(f => selectedFieldIds.includes(f.id));
    if (!firstField?.options || firstField.options.length === 0) {
      notification.error("Invalid Field Type", "Selected field has no options. Auto-mapping only works for radio/select/checkbox fields with options.");
      return;
    }

    // Auto-generate mapping based on field options
    const mapping: Record<string, number> = {};
    for (const option of firstField.options) {
      // Try to parse the value as a number
      const numValue = parseInt(option.value, 10);
      if (!isNaN(numValue)) {
        // If value is numeric, map it directly
        mapping[option.value] = numValue;
      } else {
        // For non-numeric values, check label for hints
        const labelMatch = option.label.match(/^(\d+)/);
        if (labelMatch) {
          mapping[option.value] = parseInt(labelMatch[1], 10);
        }
      }
    }

    if (Object.keys(mapping).length === 0) {
      notification.error("Auto-mapping Failed", "Could not auto-generate mapping. Please enter it manually.");
      return;
    }

    setCurrentAddon({ ...currentAddon, formFieldMapping: mapping });
    notification.success("Mapping Generated", "Form field mapping has been auto-generated successfully");
  };

  const handleAdd = () => {
    setIsAdding(true);
    setPriceInput("");
    setCurrentAddon({
      id: `addon-${Date.now()}`,
      name: "",
      description: "",
      pricePerUnit: 0,
      currency,
      taxable: true,
      formFieldIds: [],
      formFieldMapping: {},
      displayInCart: true,
    });
  };

  const handleSave = () => {
    // Only name is required - form fields are now optional
    if (!currentAddon.name) {
      notification.error("Missing Required Fields", "Please fill in the addon Name");
      return;
    }

    const addonToSave: ProductAddon = {
      id: currentAddon.id || `addon-${Date.now()}`,
      name: currentAddon.name,
      description: currentAddon.description,
      pricePerUnit: currentAddon.pricePerUnit || 0,
      currency: currentAddon.currency || currency,
      taxable: currentAddon.taxable !== false,
      taxCode: currentAddon.taxCode,
      taxBehavior: currentAddon.taxBehavior,
      formFieldIds: currentAddon.formFieldIds && currentAddon.formFieldIds.length > 0 ? currentAddon.formFieldIds : undefined,
      formFieldId: currentAddon.formFieldId, // Keep for backward compatibility
      formFieldMapping: currentAddon.formFieldMapping || {},
      maxQuantity: currentAddon.maxQuantity,
      maxPerOrder: currentAddon.maxPerOrder,
      displayInCart: currentAddon.displayInCart !== false,
      icon: currentAddon.icon,
    };

    if (editingIndex !== null) {
      // Update existing
      const updated = [...addons];
      updated[editingIndex] = addonToSave;
      onChange(updated);
      setEditingIndex(null);
    } else {
      // Add new
      onChange([...addons, addonToSave]);
      setIsAdding(false);
    }

    setCurrentAddon({});
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingIndex(null);
    setPriceInput("");
    setCurrentAddon({});
  };

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    const addon = addons[index];
    setCurrentAddon({ ...addon });
    // Set price input from addon's pricePerUnit
    setPriceInput(addon.pricePerUnit ? (addon.pricePerUnit / 100).toFixed(2) : "");
  };

  const handleDelete = (index: number) => {
    const addonToDelete = addons[index];
    setDeleteConfirmModal({
      isOpen: true,
      index,
      addonName: addonToDelete.name,
    });
  };

  const confirmDelete = () => {
    if (!deleteConfirmModal) return;

    const updated = addons.filter((_, i) => i !== deleteConfirmModal.index);
    console.log("🗑️ Deleting addon. Before:", addons.length, "After:", updated.length);
    console.log("Updated addons array:", updated);
    onChange(updated);
    notification.success("Addon Deleted", `"${deleteConfirmModal.addonName}" has been removed. Remember to save the product!`);
    setDeleteConfirmModal(null);
  };

  const handleMappingChange = (key: string, value: string) => {
    setCurrentAddon({
      ...currentAddon,
      formFieldMapping: {
        ...currentAddon.formFieldMapping,
        [key]: parseInt(value) || 0,
      },
    });
  };

  const addMappingEntry = () => {
    setCurrentAddon({
      ...currentAddon,
      formFieldMapping: {
        ...currentAddon.formFieldMapping,
        "": 0,
      },
    });
  };

  return (
    <div className="space-y-4 p-4 border-2 rounded" style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold" style={{ color: "var(--win95-text)" }}>
            🧩 {t("ui.products.addons.title")}
          </h3>
          <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
            {t("ui.products.addons.description")}
          </p>
        </div>
        {!isAdding && editingIndex === null && (
          <button
            type="button"
            onClick={handleAdd}
            className="px-3 py-1 text-xs font-bold border-2 flex items-center gap-1"
            style={{
              borderColor: "var(--win95-border)",
              background: "var(--win95-button-face)",
              color: "var(--win95-text)",
            }}
          >
            <Plus size={14} />
            {t("ui.products.addons.button.add")}
          </button>
        )}
      </div>

      {/* Addon List */}
      {addons.length > 0 && !isAdding && editingIndex === null && (
        <div className="space-y-2">
          {addons.map((addon, index) => (
            <div
              key={addon.id}
              className="p-3 border-2 rounded flex items-start justify-between"
              style={{ borderColor: "var(--win95-border)", background: "var(--win95-input-bg)" }}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  {addon.icon && <span>{addon.icon}</span>}
                  <span className="font-semibold text-sm" style={{ color: "var(--win95-text)" }}>
                    {addon.name}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded" style={{ background: "var(--win95-bg)", color: "var(--win95-text)" }}>
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: addon.currency,
                    }).format(addon.pricePerUnit / 100)}
                  </span>
                </div>
                {addon.description && (
                  <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
                    {addon.description}
                  </p>
                )}
                <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
                  {addon.formFieldIds && addon.formFieldIds.length > 0 ? (
                    <>
                      Linked to {addon.formFieldIds.length} field{addon.formFieldIds.length > 1 ? "s" : ""}: {" "}
                      <code className="text-xs">{addon.formFieldIds.join(", ")}</code>
                    </>
                  ) : addon.formFieldId ? (
                    <>
                      Linked to form field: <code className="text-xs">{addon.formFieldId}</code>
                    </>
                  ) : (
                    <span style={{ color: "var(--neutral-gray)" }}>💡 Standalone addon (no form field trigger)</span>
                  )}
                  {addon.taxable && addon.taxCode && ` • Tax: ${addon.taxCode}`}
                  {!addon.taxable && " • Not taxable"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleEdit(index)}
                  className="p-1 border-2"
                  style={{ borderColor: "var(--win95-border)", background: "var(--win95-button-face)" }}
                  title={t("ui.products.addons.button.edit")}
                >
                  <Edit2 size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(index)}
                  className="p-1 border-2"
                  style={{ borderColor: "var(--error)", background: "var(--win95-button-face)", color: "var(--error)" }}
                  title={t("ui.products.addons.button.delete")}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Addon Editor */}
      {(isAdding || editingIndex !== null) && (
        <div className="space-y-3 p-4 border-2 rounded" style={{ borderColor: "var(--win95-border)", background: "var(--win95-input-bg)" }}>
          <h4 className="text-sm font-bold" style={{ color: "var(--win95-text)" }}>
            {isAdding ? "Add New Addon" : "Edit Addon"}
          </h4>

          {/* Addon Name */}
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: "var(--win95-text)" }}>
              {t("ui.products.addons.name.label")} <span style={{ color: "var(--error)" }}>*</span>
            </label>
            <input
              type="text"
              value={currentAddon.name || ""}
              onChange={(e) => setCurrentAddon({ ...currentAddon, name: e.target.value })}
              placeholder={t("ui.products.addons.name.placeholder")}
              className="w-full px-2 py-1 text-sm border-2"
              style={{ borderColor: "var(--win95-border)", background: "var(--win95-input-bg)", color: "var(--win95-input-text)" }}
            />
          </div>

          {/* Icon (Optional) */}
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: "var(--win95-text)" }}>
              Icon (Emoji)
            </label>
            <input
              type="text"
              value={currentAddon.icon || ""}
              onChange={(e) => setCurrentAddon({ ...currentAddon, icon: e.target.value })}
              placeholder="⛵ 🎓 🍽️"
              maxLength={2}
              className="w-20 px-2 py-1 text-sm border-2"
              style={{ borderColor: "var(--win95-border)", background: "var(--win95-input-bg)", color: "var(--win95-input-text)" }}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: "var(--win95-text)" }}>
              Description
            </label>
            <textarea
              value={currentAddon.description || ""}
              onChange={(e) => setCurrentAddon({ ...currentAddon, description: e.target.value })}
              placeholder="Brief description of what this addon includes..."
              rows={2}
              className="w-full px-2 py-1 text-sm border-2"
              style={{ borderColor: "var(--win95-border)", background: "var(--win95-input-bg)", color: "var(--win95-input-text)" }}
            />
          </div>

          {/* Price */}
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: "var(--win95-text)" }}>
              {t("ui.products.addons.price.label")} <span style={{ color: "var(--error)" }}>*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                step="0.01"
                min="0"
                value={priceInput}
                onChange={(e) => {
                  const value = e.target.value;
                  setPriceInput(value);
                  // Update pricePerUnit in cents with proper rounding
                  // Multiply by 100 first, then round to avoid floating point precision issues
                  let priceInCents = 0;
                  if (value) {
                    const numValue = parseFloat(value);
                    // Use Number.EPSILON to handle floating point precision
                    priceInCents = Math.round((numValue * 100 + Number.EPSILON));
                  }
                  setCurrentAddon({
                    ...currentAddon,
                    pricePerUnit: priceInCents,
                  });
                }}
                placeholder="30.00"
                className="flex-1 px-2 py-1 text-sm border-2"
                style={{ borderColor: "var(--win95-border)", background: "var(--win95-input-bg)", color: "var(--win95-input-text)" }}
              />
              <span className="px-2 py-1 text-sm border-2" style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}>
                {currency}
              </span>
            </div>
          </div>

          {/* Tax Settings */}
          <div className="space-y-2 p-3 border rounded" style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={currentAddon.taxable !== false}
                onChange={(e) => setCurrentAddon({ ...currentAddon, taxable: e.target.checked })}
              />
              <span className="text-xs font-semibold" style={{ color: "var(--win95-text)" }}>
                {t("ui.products.addons.taxable.label")}
              </span>
            </label>

            {currentAddon.taxable !== false && (
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: "var(--win95-text)" }}>
                  Tax Code (Optional - defaults to product&apos;s tax)
                </label>
                <select
                  value={currentAddon.taxCode || ""}
                  onChange={(e) => setCurrentAddon({ ...currentAddon, taxCode: e.target.value || undefined })}
                  className="w-full px-2 py-1 text-xs border-2"
                  style={{ borderColor: "var(--win95-border)", background: "var(--win95-input-bg)", color: "var(--win95-input-text)" }}
                >
                  <option value="">Use product&apos;s tax code</option>
                  {taxCodes?.codes.map((code) => (
                    <option key={code.value} value={code.value}>
                      {code.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
                  Leave empty to use the main product&apos;s tax code
                </p>
              </div>
            )}
          </div>

          {/* Form Field Mapping - Multi-Select */}
          <div>
            <label className="block text-xs font-semibold mb-1" style={{ color: "var(--win95-text)" }}>
              Form Fields (Optional)
            </label>
            <p className="text-xs mb-2" style={{ color: "var(--neutral-gray)" }}>
              Optional: Select form fields that trigger this addon automatically. Leave empty for standalone addons that can be added manually.
            </p>

            {availableFormFields && availableFormFields.length > 0 ? (
              <div
                className="border-2 rounded p-2 max-h-48 overflow-y-auto"
                style={{ borderColor: "var(--win95-border)", background: "var(--win95-input-bg)" }}
              >
                {availableFormFields.map((field) => {
                  const isSelected = (currentAddon.formFieldIds || []).includes(field.id);
                  return (
                    <label
                      key={field.id}
                      className="flex items-center gap-2 py-1 px-1 cursor-pointer"
                      style={{
                        backgroundColor: isSelected ? "var(--win95-selected-bg)" : "transparent",
                        color: isSelected ? "var(--win95-selected-text)" : "var(--win95-text)",
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.backgroundColor = "var(--win95-hover-light)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.backgroundColor = "transparent";
                        }
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected || false}
                        onChange={(e) => {
                          const currentIds = currentAddon.formFieldIds || [];
                          const newIds = e.target.checked
                            ? [...currentIds, field.id]
                            : currentIds.filter(id => id !== field.id);
                          setCurrentAddon({ ...currentAddon, formFieldIds: newIds });
                        }}
                        className="w-4 h-4"
                      />
                      <span className="text-xs flex-1">
                        {field.label}
                        <code className="text-xs ml-1" style={{ color: "var(--neutral-gray)" }}>
                          ({field.id})
                        </code>
                      </span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <input
                type="text"
                value={currentAddon.formFieldIds?.[0] || currentAddon.formFieldId || ""}
                onChange={(e) => {
                  const value = e.target.value.trim();
                  if (value) {
                    setCurrentAddon({ ...currentAddon, formFieldIds: [value], formFieldId: value });
                  } else {
                    setCurrentAddon({ ...currentAddon, formFieldIds: [], formFieldId: "" });
                  }
                }}
                placeholder="ucra_participants_external"
                className="w-full px-2 py-1 text-sm border-2"
                style={{ borderColor: "var(--win95-border)", background: "var(--win95-input-bg)", color: "var(--win95-input-text)" }}
              />
            )}

            {/* Show selected fields count */}
            {currentAddon.formFieldIds && currentAddon.formFieldIds.length > 0 && (
              <p className="text-xs mt-1" style={{ color: "var(--success, green)" }}>
                ✓ {currentAddon.formFieldIds.length} field{currentAddon.formFieldIds.length > 1 ? "s" : ""} selected
              </p>
            )}
          </div>

          {/* Field Value Mapping - Only show if form fields are selected */}
          {((currentAddon.formFieldIds && currentAddon.formFieldIds.length > 0) || currentAddon.formFieldId) && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold" style={{ color: "var(--win95-text)" }}>
                  Field Value → Quantity Mapping
                </label>
              {availableFormFields && availableFormFields.length > 0 && (
                <button
                  type="button"
                  onClick={handleAutoGenerateMapping}
                  className="px-2 py-1 text-xs border-2"
                  style={{
                    borderColor: "var(--win95-border)",
                    background: "var(--win95-button-face)",
                    color: "var(--win95-text)"
                  }}
                  title="Auto-generate mapping from selected field options"
                >
                  ✨ Auto-Fill
                </button>
              )}
            </div>
            <p className="text-xs mb-2" style={{ color: "var(--neutral-gray)" }}>
              Click &ldquo;Auto-Fill&rdquo; to automatically generate mapping from field options
            </p>
            <div className="space-y-2">
              {Object.entries(currentAddon.formFieldMapping || {}).map(([key, value], idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={key}
                    onChange={(e) => {
                      const newMapping = { ...currentAddon.formFieldMapping };
                      delete newMapping[key];
                      newMapping[e.target.value] = value as number;
                      setCurrentAddon({ ...currentAddon, formFieldMapping: newMapping });
                    }}
                    placeholder="Field value (e.g., '1', 'yes')"
                    className="flex-1 px-2 py-1 text-sm border-2"
                    style={{ borderColor: "var(--win95-border)", background: "var(--win95-input-bg)", color: "var(--win95-input-text)" }}
                  />
                  <span style={{ color: "var(--win95-text)" }}>→</span>
                  <input
                    type="number"
                    min="0"
                    value={value}
                    onChange={(e) => handleMappingChange(key, e.target.value)}
                    placeholder="Qty"
                    className="w-20 px-2 py-1 text-sm border-2"
                    style={{ borderColor: "var(--win95-border)", background: "var(--win95-input-bg)", color: "var(--win95-input-text)" }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const newMapping = { ...currentAddon.formFieldMapping };
                      delete newMapping[key];
                      setCurrentAddon({ ...currentAddon, formFieldMapping: newMapping });
                    }}
                    className="p-1 border-2"
                    style={{ borderColor: "var(--error)", background: "var(--win95-button-face)", color: "var(--error)" }}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addMappingEntry}
                className="px-2 py-1 text-xs border-2 flex items-center gap-1"
                style={{ borderColor: "var(--win95-border)", background: "var(--win95-button-face)", color: "var(--win95-text)" }}
              >
                <Plus size={12} />
                Add Mapping
              </button>
            </div>
              <p className="text-xs mt-2" style={{ color: "var(--neutral-gray)" }}>
                Example: &quot;0&quot; → 0, &quot;1&quot; → 1, &quot;2&quot; → 2 (for radio button with 0, 1, or 2 participants)
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={handleSave}
              className="px-3 py-1 text-sm font-bold border-2 flex items-center gap-1"
              style={{ borderColor: "var(--win95-border)", background: "var(--success)", color: "white" }}
            >
              <Save size={14} />
              {t("ui.products.addons.button.save")}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="px-3 py-1 text-sm font-bold border-2"
              style={{ borderColor: "var(--win95-border)", background: "var(--win95-button-bg)" }}
            >
              {t("ui.products.addons.button.cancel")}
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteConfirmModal?.isOpen || false}
        onClose={() => setDeleteConfirmModal(null)}
        onConfirm={confirmDelete}
        title="Delete Addon"
        message={`Are you sure you want to delete "${deleteConfirmModal?.addonName}"?\n\nThis will remove the addon from the product. Remember to save the product to persist this change.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
}
