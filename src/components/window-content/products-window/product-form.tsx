"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { Loader2, Save, X, ChevronDown } from "lucide-react";
import { useAppAvailability } from "@/hooks/use-app-availability";
import { AppUnavailableInline } from "@/components/app-unavailable";
import { getTaxCodesForCountry } from "@/lib/tax-calculator";
import { AddonManager } from "./addon-manager";
import { ProductAddon } from "@/types/product-addons";
import { InvoicingConfigSection, InvoiceConfig } from "./invoicing-config-section";

/**
 * Helper: Extract all field IDs, labels, types, and options from a form template
 */
function extractFormFields(
  formTemplate: { customProperties?: { formSchema?: { sections?: unknown[]; fields?: unknown[] } } } | null | undefined
): Array<{ id: string; label: string; type?: string; options?: Array<{ value: string; label: string }> }> {
  const fields: Array<{ id: string; label: string; type?: string; options?: Array<{ value: string; label: string }> }> = [];

  if (!formTemplate?.customProperties?.formSchema) {
    return fields;
  }

  const schema = formTemplate.customProperties.formSchema as {
    sections?: Array<{
      fields?: Array<{
        id?: string;
        label?: string;
        type?: string;
        options?: Array<{ value: string; label: string }>;
      }>
    }>;
    fields?: Array<{
      id?: string;
      label?: string;
      type?: string;
      options?: Array<{ value: string; label: string }>;
    }>;
  };

  // Extract from sections (if form has sections)
  if (schema.sections && Array.isArray(schema.sections)) {
    for (const section of schema.sections) {
      if (section.fields && Array.isArray(section.fields)) {
        for (const field of section.fields) {
          if (field.id && field.label) {
            fields.push({
              id: field.id,
              label: field.label,
              type: field.type,
              options: field.options,
            });
          }
        }
      }
    }
  }

  // Extract from top-level fields (if form has no sections)
  if (schema.fields && Array.isArray(schema.fields)) {
    for (const field of schema.fields) {
      if (field.id && field.label) {
        fields.push({
          id: field.id,
          label: field.label,
          type: field.type,
          options: field.options,
        });
      }
    }
  }

  return fields;
}

interface ProductFormProps {
  sessionId: string;
  organizationId: Id<"organizations">;
  productId: Id<"objects"> | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ProductForm({
  sessionId,
  organizationId,
  productId,
  onSuccess,
  onCancel,
}: ProductFormProps) {
  const [formData, setFormData] = useState({
    subtype: "ticket",
    name: "",
    description: "",
    price: "",
    currency: "USD",
    inventory: "",
    eventId: "",
    // Ticket-specific fields
    isActive: true, // NEW: Active/Inactive toggle
    ticketType: "paid" as "paid" | "free" | "donation",
    startSaleDateTime: "",
    endSaleDateTime: "",
    minPerOrder: "1",
    maxPerOrder: "10",
    // Advanced ticket settings
    visibility: "visible" as "visible" | "invisible" | "invisibleNotForSale" | "customSchedule",
    visibilityStartDateTime: "",
    visibilityEndDateTime: "",
    distributionChannel: "onlineOnly" as "onlineOnly" | "atVenueOnly" | "onlineAndVenue",
    allowEticket: true,
    allowPickup: false,
    showSalesEndStatus: false,
    deductFees: false,
    // NEW: Logistics Settings
    accommodationRequired: false,
    collectAccommodationNotes: false,
    mealIncluded: false,
    collectDietaryRequirements: false,
    collectArrivalTime: false,
    // NEW: Companion/Guest Settings
    allowCompanions: false,
    maxCompanions: "0",
    companionCost: "",
    // NEW: Activity/Workshop Settings
    includesActivitySelection: false,
    activityOptions: [] as string[],
    activityRequired: false,
    // NEW: Billing Settings
    requiresBillingAddress: false,
    // NEW: Event Linking
    takeOverEventDates: false, // Offer to use event start/end for ticket sales
    // NEW: Form Linking
    formId: "", // Linked form for registration data collection
    formTiming: "duringCheckout" as "duringCheckout" | "afterPurchase" | "standalone",
    formRequired: true, // Whether form must be completed
    // NEW: Tax Settings
    taxable: true, // Whether this product is taxable
    taxCode: "", // Stripe tax code (e.g., "txcd_10401000" for event tickets)
    taxBehavior: "exclusive" as "exclusive" | "inclusive" | "automatic", // How to handle tax in price
    // NEW: Addons
    addons: [] as ProductAddon[], // Product addons configuration
    // NEW: B2B Invoicing Configuration (nullable - only set if configured)
    invoiceConfig: null as InvoiceConfig | null,
  });
  const [saving, setSaving] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  // Check if Events app is available (determines if we show event association)
  const { isAvailable: isEventsAppAvailable, organizationName } = useAppAvailability("events");

  // Get existing product if editing
  const existingProduct = useQuery(
    api.productOntology.getProduct,
    productId ? { sessionId, productId } : "skip"
  );

  const createProduct = useMutation(api.productOntology.createProduct);
  const updateProduct = useMutation(api.productOntology.updateProduct);
  const unlinkFormFromProduct = useMutation(api.productOntology.unlinkFormFromProduct);

  // Get events for dropdown (only if Events app is available)
  const events = useQuery(
    api.eventOntology.getEvents,
    isEventsAppAvailable && sessionId
      ? { sessionId, organizationId }
      : "skip"
  );

  // Get organization tax settings to determine available tax codes
  const orgTaxSettings = useQuery(
    api.organizationTaxSettings.getPublicTaxSettings,
    { organizationId }
  );

  // Get published forms for dropdown
  const forms = useQuery(
    api.formsOntology.getForms,
    sessionId
      ? { sessionId, organizationId, status: "published" }
      : "skip"
  );

  // Get selected form template to extract field IDs for addon mapping and invoicing config
  const selectedFormTemplate = useQuery(
    api.formsOntology.getPublicForm,
    formData.formId && formData.formId.length >= 28 // Validate it's a Convex ID
      ? { formId: formData.formId as Id<"objects"> }
      : "skip"
  );

  // Extract available form fields for addon field mapping and invoicing config
  const availableFormFields = useMemo(() => {
    if (!selectedFormTemplate) return [];
    return extractFormFields(selectedFormTemplate);
  }, [selectedFormTemplate]);

  // Load existing product data
  useEffect(() => {
    if (existingProduct) {
      const props = existingProduct.customProperties || {};
      setFormData({
        subtype: existingProduct.subtype || "ticket",
        name: existingProduct.name || "",
        description: existingProduct.description || "",
        price: ((props.price || 0) / 100).toString(),
        currency: props.currency || "USD",
        inventory: props.inventory?.toString() || "",
        eventId: (props.eventId as string) || "", // Load existing event association
        // Form linking (generalized for all product types)
        formId: (props.formId as string) || "",
        formTiming: (props.formTiming as "duringCheckout" | "afterPurchase" | "standalone") || "duringCheckout",
        formRequired: (props.formRequired as boolean) ?? true,
        // Ticket-specific fields
        isActive: (props.isActive as boolean) ?? true,
        ticketType: (props.ticketType as "paid" | "free" | "donation") || "paid",
        startSaleDateTime: props.startSaleDateTime
          ? new Date(props.startSaleDateTime as number).toISOString().slice(0, 16)
          : "",
        endSaleDateTime: props.endSaleDateTime
          ? new Date(props.endSaleDateTime as number).toISOString().slice(0, 16)
          : "",
        minPerOrder: (props.minPerOrder as number)?.toString() || "1",
        maxPerOrder: (props.maxPerOrder as number)?.toString() || "10",
        // Advanced settings
        visibility: (props.visibility as "visible" | "invisible" | "invisibleNotForSale" | "customSchedule") || "visible",
        visibilityStartDateTime: props.visibilityStartDateTime
          ? new Date(props.visibilityStartDateTime as number).toISOString().slice(0, 16)
          : "",
        visibilityEndDateTime: props.visibilityEndDateTime
          ? new Date(props.visibilityEndDateTime as number).toISOString().slice(0, 16)
          : "",
        distributionChannel: (props.distributionChannel as "onlineOnly" | "atVenueOnly" | "onlineAndVenue") || "onlineOnly",
        allowEticket: (props.allowEticket as boolean) ?? true,
        allowPickup: (props.allowPickup as boolean) ?? false,
        showSalesEndStatus: (props.showSalesEndStatus as boolean) ?? false,
        deductFees: (props.deductFees as boolean) ?? false,
        // Logistics settings
        accommodationRequired: (props.accommodationRequired as boolean) ?? false,
        collectAccommodationNotes: (props.collectAccommodationNotes as boolean) ?? false,
        mealIncluded: (props.mealIncluded as boolean) ?? false,
        collectDietaryRequirements: (props.collectDietaryRequirements as boolean) ?? false,
        collectArrivalTime: (props.collectArrivalTime as boolean) ?? false,
        // Companion settings
        allowCompanions: (props.allowCompanions as boolean) ?? false,
        maxCompanions: (props.maxCompanions as number)?.toString() || "0",
        companionCost: props.companionCost ? ((props.companionCost as number) / 100).toString() : "",
        // Activity settings
        includesActivitySelection: (props.includesActivitySelection as boolean) ?? false,
        activityOptions: (props.activityOptions as string[]) || [],
        activityRequired: (props.activityRequired as boolean) ?? false,
        // Billing settings
        requiresBillingAddress: (props.requiresBillingAddress as boolean) ?? false,
        // Event linking
        takeOverEventDates: false, // Reset for edit mode
        // Tax settings
        taxable: (props.taxable as boolean) ?? true,
        taxCode: (props.taxCode as string) || "",
        taxBehavior: (props.taxBehavior as "exclusive" | "inclusive" | "automatic") || "exclusive",
        // Addons
        addons: (props.addons as ProductAddon[]) || [],
        // B2B Invoicing Configuration
        invoiceConfig: (props.invoiceConfig as InvoiceConfig) || null,
      });
    }
  }, [existingProduct]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Handle price based on ticket type
      let priceInCents = 0;
      if (formData.subtype === "ticket" && formData.ticketType === "free") {
        // Free tickets always have price of 0
        priceInCents = 0;
      } else if (formData.price) {
        // For paid tickets, donation tickets with suggested amount, or other products
        priceInCents = Math.round(parseFloat(formData.price) * 100);
      }

      const inventory = formData.inventory ? parseInt(formData.inventory, 10) : null;

      // Build custom properties for all product types
      const customProperties: Record<string, unknown> = {};

      // Tax settings (applies to all product types)
      customProperties.taxable = formData.taxable;
      if (formData.taxCode) {
        customProperties.taxCode = formData.taxCode;
      }
      customProperties.taxBehavior = formData.taxBehavior;

      // Addons (applies to all product types)
      // ALWAYS set addons, even if empty array (to ensure deletions persist)
      customProperties.addons = formData.addons || [];

      // B2B Invoicing Configuration (applies to all product types) - only store if configured
      if (formData.invoiceConfig) {
        customProperties.invoiceConfig = formData.invoiceConfig;
      }

      // Form linking (generalized - works for all product types)
      if (formData.formId) {
        customProperties.formId = formData.formId;
        customProperties.formTiming = formData.formTiming;
        customProperties.formRequired = formData.formRequired;
      } else if (productId && existingProduct?.customProperties?.formId) {
        // If editing and form was removed, call unlink mutation
        await unlinkFormFromProduct({
          sessionId,
          productId,
        });
      }

      // Build ticket-specific custom properties
      if (formData.subtype === "ticket") {
        customProperties.isActive = formData.isActive;
        customProperties.ticketType = formData.ticketType;
        customProperties.minPerOrder = parseInt(formData.minPerOrder, 10);
        customProperties.maxPerOrder = parseInt(formData.maxPerOrder, 10);
        if (formData.startSaleDateTime) {
          customProperties.startSaleDateTime = new Date(formData.startSaleDateTime).getTime();
        }
        if (formData.endSaleDateTime) {
          customProperties.endSaleDateTime = new Date(formData.endSaleDateTime).getTime();
        }

        // Advanced settings
        if (showAdvancedSettings) {
          customProperties.visibility = formData.visibility;
          if (formData.visibility === "customSchedule") {
            if (formData.visibilityStartDateTime) {
              customProperties.visibilityStartDateTime = new Date(formData.visibilityStartDateTime).getTime();
            }
            if (formData.visibilityEndDateTime) {
              customProperties.visibilityEndDateTime = new Date(formData.visibilityEndDateTime).getTime();
            }
          }
          customProperties.distributionChannel = formData.distributionChannel;
          customProperties.allowEticket = formData.allowEticket;
          customProperties.allowPickup = formData.allowPickup;
          customProperties.showSalesEndStatus = formData.showSalesEndStatus;
          if (formData.ticketType === "donation") {
            customProperties.deductFees = formData.deductFees;
          }

          // NEW: Logistics settings
          customProperties.accommodationRequired = formData.accommodationRequired;
          customProperties.collectAccommodationNotes = formData.collectAccommodationNotes;
          customProperties.mealIncluded = formData.mealIncluded;
          customProperties.collectDietaryRequirements = formData.collectDietaryRequirements;
          customProperties.collectArrivalTime = formData.collectArrivalTime;

          // NEW: Companion settings
          customProperties.allowCompanions = formData.allowCompanions;
          if (formData.allowCompanions) {
            customProperties.maxCompanions = parseInt(formData.maxCompanions, 10);
            if (formData.companionCost) {
              customProperties.companionCost = Math.round(parseFloat(formData.companionCost) * 100);
            }
          }

          // NEW: Activity settings
          customProperties.includesActivitySelection = formData.includesActivitySelection;
          if (formData.includesActivitySelection) {
            customProperties.activityOptions = formData.activityOptions;
            customProperties.activityRequired = formData.activityRequired;
          }

          // NEW: Billing settings
          customProperties.requiresBillingAddress = formData.requiresBillingAddress;
        }
      }

      if (productId) {
        // Update existing product
        await updateProduct({
          sessionId,
          productId,
          name: formData.name,
          description: formData.description,
          price: priceInCents,
          inventory: inventory || undefined,
          eventId: formData.eventId ? (formData.eventId as Id<"objects">) : null,
          customProperties,
          invoiceConfig: formData.invoiceConfig || undefined,
        });
      } else {
        // Create new product
        await createProduct({
          sessionId,
          organizationId,
          subtype: formData.subtype,
          name: formData.name,
          description: formData.description,
          price: priceInCents,
          currency: formData.currency,
          inventory: inventory || undefined,
          eventId: formData.eventId ? (formData.eventId as Id<"objects">) : undefined,
          customProperties,
        });
      }

      onSuccess();
    } catch (error) {
      console.error("Failed to save product:", error);
      alert("Failed to save product. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (productId && !existingProduct) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 size={32} className="animate-spin" style={{ color: "var(--primary)" }} />
      </div>
    );
  }

  // Get the organization's origin country for tax code filtering
  const originCountry = orgTaxSettings?.originAddress?.country || "US";
  const availableTaxCodes = getTaxCodesForCountry(originCountry);
  const orgDefaultTaxCode = orgTaxSettings?.defaultTaxCode as string | undefined;

  // Find the human-readable label for the organization's default tax code
  const defaultTaxCodeLabel = orgDefaultTaxCode
    ? availableTaxCodes?.codes.find(c => c.value === orgDefaultTaxCode)?.label || orgDefaultTaxCode
    : "Not set";

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4">
      {/* Product Type */}
      <div>
        <label className="block text-sm font-semibold mb-2" style={{ color: "var(--win95-text)" }}>
          Product Type <span style={{ color: "var(--error)" }}>*</span>
        </label>
        <select
          value={formData.subtype}
          onChange={(e) => setFormData({ ...formData, subtype: e.target.value })}
          disabled={!!productId}
          className="w-full px-3 py-2 text-sm border-2"
          style={{
            borderColor: "var(--win95-border)",
            background: "var(--win95-input-bg)",
            color: "var(--win95-input-text)",
          }}
          required
        >
          <option value="ticket">Ticket - Event tickets (VIP, standard, early-bird)</option>
          <option value="physical">Physical - Merchandise, swag, physical goods</option>
          <option value="digital">Digital - Downloads, access codes, digital content</option>
        </select>
        {productId && (
          <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
            Product type cannot be changed after creation
          </p>
        )}
      </div>

      {/* Product Name */}
      <div>
        <label className="block text-sm font-semibold mb-2" style={{ color: "var(--win95-text)" }}>
          Product Name <span style={{ color: "var(--error)" }}>*</span>
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="VIP Ticket, T-Shirt, Digital Album, etc."
          className="w-full px-3 py-2 text-sm border-2"
          style={{
            borderColor: "var(--win95-border)",
            background: "var(--win95-input-bg)",
            color: "var(--win95-input-text)",
          }}
          required
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-semibold mb-2" style={{ color: "var(--win95-text)" }}>
          Description
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Describe the product features, benefits, and details..."
          rows={4}
          className="w-full px-3 py-2 text-sm border-2"
          style={{
            borderColor: "var(--win95-border)",
            background: "var(--win95-input-bg)",
            color: "var(--win95-input-text)",
          }}
        />
      </div>

      {/* Price */}
      <div>
        <label className="block text-sm font-semibold mb-2" style={{ color: "var(--win95-text)" }}>
          Price {formData.subtype === "ticket" && formData.ticketType === "paid" && <span style={{ color: "var(--error)" }}>*</span>}
          {formData.subtype !== "ticket" && <span style={{ color: "var(--error)" }}>*</span>}
        </label>
        <div className="flex gap-2">
          <div className="flex-1">
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              placeholder={
                formData.subtype === "ticket" && formData.ticketType === "free"
                  ? "0.00 (Free)"
                  : formData.subtype === "ticket" && formData.ticketType === "donation"
                  ? "Optional (Pay what you want)"
                  : "49.99"
              }
              disabled={formData.subtype === "ticket" && formData.ticketType === "free"}
              className="w-full px-3 py-2 text-sm border-2"
              style={{
                borderColor: "var(--win95-border)",
                background: formData.subtype === "ticket" && formData.ticketType === "free" ? "var(--win95-bg-light)" : "var(--win95-input-bg)",
                color: "var(--win95-input-text)",
              }}
              required={formData.subtype === "ticket" ? formData.ticketType === "paid" : true}
            />
          </div>
          <select
            value={formData.currency}
            onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
            className="px-3 py-2 text-sm border-2"
            style={{
              borderColor: "var(--win95-border)",
              background: "var(--win95-input-bg)",
              color: "var(--win95-input-text)",
            }}
            disabled={formData.subtype === "ticket" && formData.ticketType === "free"}
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
            <option value="CAD">CAD</option>
          </select>
        </div>
        <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
          {formData.subtype === "ticket" && formData.ticketType === "free" && "Free tickets have no cost"}
          {formData.subtype === "ticket" && formData.ticketType === "donation" && "Suggested amount - buyers can pay any amount"}
          {(formData.subtype !== "ticket" || formData.ticketType === "paid") && "Enter price in dollars/euros (e.g., 49.99 for $49.99)"}
        </p>
      </div>

      {/* Inventory */}
      <div>
        <label className="block text-sm font-semibold mb-2" style={{ color: "var(--win95-text)" }}>
          Inventory (Optional)
        </label>
        <input
          type="number"
          min="0"
          value={formData.inventory}
          onChange={(e) => setFormData({ ...formData, inventory: e.target.value })}
          placeholder="Leave empty for unlimited"
          className="w-full px-3 py-2 text-sm border-2"
          style={{
            borderColor: "var(--win95-border)",
            background: "var(--win95-input-bg)",
            color: "var(--win95-input-text)",
          }}
        />
        <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
          Available quantity. Leave empty for unlimited inventory.
        </p>
      </div>

      {/* TAX SETTINGS - Applies to all product types */}
      <div className="space-y-4 p-4 border-2 rounded" style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}>
        <h3 className="text-sm font-bold" style={{ color: "var(--win95-text)" }}>
          💰 Tax Settings
        </h3>
        <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
          Configure how taxes are calculated and displayed for this product
        </p>

        {/* Taxable Toggle */}
        <div className="flex items-center justify-between p-3 border-2 rounded" style={{ borderColor: "var(--win95-border)", background: "var(--win95-input-bg)" }}>
          <div className="flex-1">
            <label className="block text-sm font-semibold" style={{ color: "var(--win95-text)" }}>
              Product is Taxable
            </label>
            <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
              {formData.taxable ? "✅ Tax will be calculated for this product" : "⚠️ Product is tax-exempt"}
            </p>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.taxable}
              onChange={(e) => setFormData({ ...formData, taxable: e.target.checked })}
              className="w-5 h-5"
            />
            <span className="text-sm font-bold" style={{ color: formData.taxable ? "var(--success)" : "var(--neutral-gray)" }}>
              {formData.taxable ? "Taxable" : "Tax-Exempt"}
            </span>
          </label>
        </div>

        {/* Tax Code - Only show if taxable */}
        {formData.taxable && (
          <div className="pl-4 space-y-3 border-l-2" style={{ borderColor: "var(--win95-border)" }}>
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: "var(--win95-text)" }}>
                Tax Code (Optional)
              </label>
              <select
                value={formData.taxCode}
                onChange={(e) => setFormData({ ...formData, taxCode: e.target.value })}
                className="w-full px-3 py-2 text-sm border-2"
                style={{
                  borderColor: "var(--win95-border)",
                  background: "var(--win95-input-bg)",
                  color: "var(--win95-input-text)",
                }}
              >
                <option value="">
                  {orgDefaultTaxCode
                    ? `-- Use Organization Default (${defaultTaxCodeLabel}) --`
                    : `-- No Organization Default Set --`
                  }
                </option>

                {availableTaxCodes && (
                  <optgroup label={`${availableTaxCodes.flag} ${availableTaxCodes.label}`}>
                    {availableTaxCodes.codes.map((code) => (
                      <option key={code.value} value={code.value}>
                        {code.label}
                      </option>
                    ))}
                  </optgroup>
                )}

                {!availableTaxCodes && (
                  <option disabled>No tax codes available for {originCountry}</option>
                )}
              </select>
              <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
                💡 Showing tax codes for {availableTaxCodes?.flag} {originCountry}.
                {orgDefaultTaxCode
                  ? ` Org default: ${defaultTaxCodeLabel}`
                  : ` No org default - configure in tax settings.`
                }
              </p>
            </div>

            {/* Tax Behavior */}
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: "var(--win95-text)" }}>
                Tax Behavior
              </label>
              <select
                value={formData.taxBehavior}
                onChange={(e) => setFormData({ ...formData, taxBehavior: e.target.value as "exclusive" | "inclusive" | "automatic" })}
                className="w-full px-3 py-2 text-sm border-2"
                style={{
                  borderColor: "var(--win95-border)",
                  background: "var(--win95-input-bg)",
                  color: "var(--win95-input-text)",
                }}
              >
                <option value="exclusive">💵 Exclusive (US-style) - Tax added on top of price</option>
                <option value="inclusive">💶 Inclusive (EU-style) - Tax included in price</option>
                <option value="automatic">🔄 Automatic - Let Stripe decide based on currency/region</option>
              </select>
              <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
                {formData.taxBehavior === "exclusive" && "Price: $100 → Total: $100 + $8.50 tax = $108.50"}
                {formData.taxBehavior === "inclusive" && "Price: €119 (includes €19 VAT) → Total: €119"}
                {formData.taxBehavior === "automatic" && "USD/CAD/AUD → Exclusive | EUR/GBP → Inclusive"}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* FORM LINKING - Generalized for all product types */}
      <div className="space-y-4 p-4 border-2 rounded" style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}>
        <h3 className="text-sm font-bold" style={{ color: "var(--win95-text)" }}>
          📋 Registration Form (Optional)
        </h3>
        <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
          Link a form to collect additional information during or after checkout
        </p>

        {/* Form Selection */}
        <div>
          <label className="block text-sm font-semibold mb-2" style={{ color: "var(--win95-text)" }}>
            Select Form
          </label>
          <select
            value={formData.formId}
            onChange={(e) => setFormData({ ...formData, formId: e.target.value })}
            className="w-full px-3 py-2 text-sm border-2"
            style={{
              borderColor: "var(--win95-border)",
              background: "var(--win95-input-bg)",
              color: "var(--win95-input-text)",
            }}
          >
            <option value="">-- No Form --</option>
            {forms?.map((form) => (
              <option key={form._id} value={form._id}>
                {form.name} ({form.subtype})
              </option>
            ))}
          </select>
          <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
            💡 Forms must be published to appear here. Create forms in the Forms app.
          </p>
        </div>

        {/* Form Timing & Requirements - Only show if form is selected */}
        {formData.formId && (
          <div className="pl-4 space-y-3 border-l-2" style={{ borderColor: "var(--win95-border)" }}>
            {/* Form Timing */}
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: "var(--win95-text)" }}>
                When to Collect Form
              </label>
              <select
                value={formData.formTiming}
                onChange={(e) => setFormData({ ...formData, formTiming: e.target.value as "duringCheckout" | "afterPurchase" | "standalone" })}
                className="w-full px-3 py-2 text-sm border-2"
                style={{
                  borderColor: "var(--win95-border)",
                  background: "var(--win95-input-bg)",
                  color: "var(--win95-input-text)",
                }}
              >
                <option value="duringCheckout">🛒 During Checkout (before payment)</option>
                <option value="afterPurchase">✉️ After Purchase (via email link)</option>
                <option value="standalone">🔗 Standalone (separate link only)</option>
              </select>
              <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
                {formData.formTiming === "duringCheckout" && "Form appears in checkout flow before payment"}
                {formData.formTiming === "afterPurchase" && "Customer receives email with form link after purchase"}
                {formData.formTiming === "standalone" && "Form is not integrated into checkout - manual sharing only"}
              </p>
            </div>

            {/* Form Required */}
            <div className="flex items-center justify-between p-3 border-2 rounded" style={{ borderColor: "var(--win95-border)", background: "var(--win95-input-bg)" }}>
              <div className="flex-1">
                <label className="block text-sm font-semibold" style={{ color: "var(--win95-text)" }}>
                  Form Completion Required
                </label>
                <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
                  {formData.formRequired ? "✅ Customer must complete form to proceed" : "⚠️ Form is optional"}
                </p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.formRequired}
                  onChange={(e) => setFormData({ ...formData, formRequired: e.target.checked })}
                  className="w-5 h-5"
                />
                <span className="text-sm font-bold" style={{ color: formData.formRequired ? "var(--success)" : "var(--neutral-gray)" }}>
                  {formData.formRequired ? "Required" : "Optional"}
                </span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* ADDONS - Applies to all product types */}
      <AddonManager
        addons={formData.addons}
        currency={formData.currency}
        onChange={(addons) => setFormData({ ...formData, addons })}
        availableFormFields={availableFormFields}
      />

      {/* B2B INVOICING CONFIGURATION - Only show if form is linked */}
      {formData.formId && (
        <InvoicingConfigSection
          config={formData.invoiceConfig}
          onChange={(invoiceConfig) => setFormData({ ...formData, invoiceConfig })}
          availableFormFields={availableFormFields}
          sessionId={sessionId}
          organizationId={organizationId}
        />
      )}

      {/* TICKET-SPECIFIC SETTINGS - Only show when subtype is "ticket" */}
      {formData.subtype === "ticket" && (
        <div className="space-y-4 p-4 border-2 rounded" style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}>
          <h3 className="text-sm font-bold" style={{ color: "var(--win95-text)" }}>
            🎫 Ticket Settings
          </h3>

          {/* Event Association - Only if Events app is available */}
          {isEventsAppAvailable ? (
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: "var(--win95-text)" }}>
                📅 Associated Event (Optional)
              </label>
              <select
                value={formData.eventId}
                onChange={(e) => setFormData({ ...formData, eventId: e.target.value })}
                className="w-full px-3 py-2 text-sm border-2"
                style={{
                  borderColor: "var(--win95-border)",
                  background: "var(--win95-input-bg)",
                  color: "var(--win95-input-text)",
                }}
              >
                <option value="">-- No Event (Standalone Ticket) --</option>
                {events?.map((event) => (
                  <option key={event._id} value={event._id}>
                    {event.name} ({new Date((event.customProperties as {startDate?: number})?.startDate || 0).toLocaleDateString()})
                  </option>
                ))}
              </select>
              <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
                Link this ticket to an event to include event details, agenda, and sponsors in the attendee experience
              </p>
            </div>
          ) : (
            <div className="p-3 border-2 rounded" style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)" }}>
              <div className="flex items-start gap-3">
                <div className="text-2xl">📅</div>
                <div>
                  <p className="text-sm font-semibold mb-1" style={{ color: "var(--win95-text)" }}>
                    Event Linking Unavailable
                  </p>
                  <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                    <AppUnavailableInline
                      appName="Events"
                      organizationName={organizationName || "your organization"}
                    />
                  </p>
                  <p className="text-xs mt-2" style={{ color: "var(--neutral-gray)" }}>
                    Enable Events to link tickets to specific events with agendas and sponsors
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Active/Inactive Status Toggle */}
          <div className="flex items-center justify-between p-3 border-2 rounded" style={{ borderColor: "var(--win95-border)", background: "var(--win95-input-bg)" }}>
            <div className="flex-1">
              <label className="block text-sm font-semibold" style={{ color: "var(--win95-text)" }}>
                Ticket Status
              </label>
              <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
                {formData.isActive ? "✅ Active - Ticket sales are enabled" : "⏸️ Paused - Ticket sales are temporarily suspended"}
              </p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-5 h-5"
              />
              <span className="text-sm font-bold" style={{ color: formData.isActive ? "var(--success)" : "var(--neutral-gray)" }}>
                {formData.isActive ? "Active" : "Paused"}
              </span>
            </label>
          </div>

          {/* Ticket Type */}
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: "var(--win95-text)" }}>
              Ticket Type
            </label>
            <select
              value={formData.ticketType}
              onChange={(e) => {
                const newTicketType = e.target.value as "paid" | "free" | "donation";
                setFormData({
                  ...formData,
                  ticketType: newTicketType,
                  // Auto-set price to "0" for free tickets
                  price: newTicketType === "free" ? "0" : formData.price,
                });
              }}
              className="w-full px-3 py-2 text-sm border-2"
              style={{
                borderColor: "var(--win95-border)",
                background: "var(--win95-input-bg)",
                color: "var(--win95-input-text)",
              }}
            >
              <option value="paid">💳 Paid - Standard ticket with price</option>
              <option value="free">⚡ Free - No charge required</option>
              <option value="donation">❤️ Donation - Pay what you want</option>
            </select>
          </div>

          {/* Sales Schedule */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: "var(--win95-text)" }}>
                Sales Start
              </label>
              <input
                type="datetime-local"
                value={formData.startSaleDateTime}
                onChange={(e) => setFormData({ ...formData, startSaleDateTime: e.target.value })}
                className="w-full px-3 py-2 text-xs border-2"
                style={{
                  borderColor: "var(--win95-border)",
                  background: "var(--win95-input-bg)",
                  color: "var(--win95-input-text)",
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: "var(--win95-text)" }}>
                Sales End
              </label>
              <input
                type="datetime-local"
                value={formData.endSaleDateTime}
                onChange={(e) => setFormData({ ...formData, endSaleDateTime: e.target.value })}
                className="w-full px-3 py-2 text-xs border-2"
                style={{
                  borderColor: "var(--win95-border)",
                  background: "var(--win95-input-bg)",
                  color: "var(--win95-input-text)",
                }}
              />
            </div>
          </div>

          {/* Order Limits */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: "var(--win95-text)" }}>
                Min Per Order
              </label>
              <input
                type="number"
                min="1"
                value={formData.minPerOrder}
                onChange={(e) => setFormData({ ...formData, minPerOrder: e.target.value })}
                className="w-full px-3 py-2 text-sm border-2"
                style={{
                  borderColor: "var(--win95-border)",
                  background: "var(--win95-input-bg)",
                  color: "var(--win95-input-text)",
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: "var(--win95-text)" }}>
                Max Per Order
              </label>
              <input
                type="number"
                min="1"
                value={formData.maxPerOrder}
                onChange={(e) => setFormData({ ...formData, maxPerOrder: e.target.value })}
                className="w-full px-3 py-2 text-sm border-2"
                style={{
                  borderColor: "var(--win95-border)",
                  background: "var(--win95-input-bg)",
                  color: "var(--win95-input-text)",
                }}
              />
            </div>
          </div>

          <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
            💡 Sales schedule and order limits help manage ticket availability and prevent bulk purchases.
          </p>

          {/* Advanced Settings - Collapsible Section */}
          <div className="pt-4 border-t-2" style={{ borderColor: "var(--win95-border)" }}>
            <button
              type="button"
              onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
              className="flex items-center justify-between w-full text-left mb-3"
            >
              <h4 className="text-sm font-bold" style={{ color: "var(--win95-text)" }}>
                ⚙️ Advanced Settings
              </h4>
              <ChevronDown
                size={16}
                className="transition-transform"
                style={{
                  transform: showAdvancedSettings ? "rotate(180deg)" : "rotate(0deg)",
                  color: "var(--win95-text)",
                }}
              />
            </button>

            {showAdvancedSettings && (
              <div className="space-y-4 mt-3">
                {/* Visibility Settings */}
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: "var(--win95-text)" }}>
                    Visibility
                  </label>
                  <select
                    value={formData.visibility}
                    onChange={(e) => setFormData({ ...formData, visibility: e.target.value as "visible" | "invisible" | "invisibleNotForSale" | "customSchedule" })}
                    className="w-full px-3 py-2 text-sm border-2"
                    style={{
                      borderColor: "var(--win95-border)",
                      background: "var(--win95-input-bg)",
                      color: "var(--win95-input-text)",
                    }}
                  >
                    <option value="visible">👁️ Visible - Show on event page</option>
                    <option value="invisible">🔗 Invisible - Hidden, direct link only</option>
                    <option value="invisibleNotForSale">🚫 Invisible & Not For Sale</option>
                    <option value="customSchedule">📅 Custom Schedule - Show/hide by date</option>
                  </select>
                  <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
                    Control when and how this ticket appears to buyers
                  </p>
                </div>

                {/* Custom Schedule Dates - Only show when customSchedule selected */}
                {formData.visibility === "customSchedule" && (
                  <div className="pl-4 space-y-3 border-l-2" style={{ borderColor: "var(--win95-border)" }}>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold mb-1" style={{ color: "var(--win95-text)" }}>
                          Show From
                        </label>
                        <input
                          type="datetime-local"
                          value={formData.visibilityStartDateTime}
                          onChange={(e) => setFormData({ ...formData, visibilityStartDateTime: e.target.value })}
                          className="w-full px-2 py-1 text-xs border-2"
                          style={{
                            borderColor: "var(--win95-border)",
                            background: "var(--win95-input-bg)",
                            color: "var(--win95-input-text)",
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-1" style={{ color: "var(--win95-text)" }}>
                          Hide After
                        </label>
                        <input
                          type="datetime-local"
                          value={formData.visibilityEndDateTime}
                          onChange={(e) => setFormData({ ...formData, visibilityEndDateTime: e.target.value })}
                          className="w-full px-2 py-1 text-xs border-2"
                          style={{
                            borderColor: "var(--win95-border)",
                            background: "var(--win95-input-bg)",
                            color: "var(--win95-input-text)",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Distribution Channel */}
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: "var(--win95-text)" }}>
                    Distribution Channel
                  </label>
                  <select
                    value={formData.distributionChannel}
                    onChange={(e) => setFormData({ ...formData, distributionChannel: e.target.value as "onlineOnly" | "atVenueOnly" | "onlineAndVenue" })}
                    className="w-full px-3 py-2 text-sm border-2"
                    style={{
                      borderColor: "var(--win95-border)",
                      background: "var(--win95-input-bg)",
                      color: "var(--win95-input-text)",
                    }}
                    disabled={formData.ticketType === "donation"}
                  >
                    <option value="onlineOnly">🌐 Online Only</option>
                    <option value="atVenueOnly">🏢 At Venue Only</option>
                    <option value="onlineAndVenue">🌐+🏢 Online & Venue</option>
                  </select>
                  <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
                    {formData.ticketType === "donation" ? "Donations are online only" : "Where tickets can be purchased"}
                  </p>
                </div>

                {/* Delivery Methods */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold mb-2" style={{ color: "var(--win95-text)" }}>
                    Delivery Methods
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.allowEticket}
                      onChange={(e) => setFormData({ ...formData, allowEticket: e.target.checked })}
                      disabled={formData.distributionChannel === "atVenueOnly"}
                      className="w-4 h-4"
                    />
                    <span className="text-sm" style={{ color: "var(--win95-text)" }}>
                      📧 E-Ticket (Email/Mobile)
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.allowPickup}
                      onChange={(e) => setFormData({ ...formData, allowPickup: e.target.checked })}
                      disabled={formData.distributionChannel === "onlineOnly"}
                      className="w-4 h-4"
                    />
                    <span className="text-sm" style={{ color: "var(--win95-text)" }}>
                      🎟️ Will Call Pickup (At Venue)
                    </span>
                  </label>
                </div>

                {/* Display Options */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold mb-2" style={{ color: "var(--win95-text)" }}>
                    Display Options
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.showSalesEndStatus}
                      onChange={(e) => setFormData({ ...formData, showSalesEndStatus: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm" style={{ color: "var(--win95-text)" }}>
                      ⏰ Show &quot;Sales end in X hours&quot; countdown
                    </span>
                  </label>
                  {formData.ticketType === "donation" && (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.deductFees}
                        onChange={(e) => setFormData({ ...formData, deductFees: e.target.checked })}
                        className="w-4 h-4"
                      />
                      <span className="text-sm" style={{ color: "var(--win95-text)" }}>
                        💰 Deduct fees from donation amount
                      </span>
                    </label>
                  )}
                </div>

                {/* NEW: Logistics Settings */}
                <div className="pt-3 border-t-2 space-y-3" style={{ borderColor: "var(--win95-border)" }}>
                  <h4 className="text-sm font-bold" style={{ color: "var(--win95-text)" }}>
                    🏨 Event Logistics
                  </h4>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.accommodationRequired}
                      onChange={(e) => setFormData({ ...formData, accommodationRequired: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm" style={{ color: "var(--win95-text)" }}>
                      🛏️ Accommodation Required
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.collectAccommodationNotes}
                      onChange={(e) => setFormData({ ...formData, collectAccommodationNotes: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm" style={{ color: "var(--win95-text)" }}>
                      📝 Collect Accommodation Notes/Requests
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.mealIncluded}
                      onChange={(e) => setFormData({ ...formData, mealIncluded: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm" style={{ color: "var(--win95-text)" }}>
                      🍽️ Meal Included
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.collectDietaryRequirements}
                      onChange={(e) => setFormData({ ...formData, collectDietaryRequirements: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm" style={{ color: "var(--win95-text)" }}>
                      🥗 Collect Dietary Requirements/Allergies
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.collectArrivalTime}
                      onChange={(e) => setFormData({ ...formData, collectArrivalTime: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm" style={{ color: "var(--win95-text)" }}>
                      ⏰ Collect Planned Arrival Time
                    </span>
                  </label>
                </div>

                {/* NEW: Companion/Guest Settings */}
                <div className="pt-3 border-t-2 space-y-3" style={{ borderColor: "var(--win95-border)" }}>
                  <h4 className="text-sm font-bold" style={{ color: "var(--win95-text)" }}>
                    👥 Companion/Guest Settings
                  </h4>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.allowCompanions}
                      onChange={(e) => setFormData({ ...formData, allowCompanions: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm" style={{ color: "var(--win95-text)" }}>
                      Allow Companions/Guests
                    </span>
                  </label>

                  {formData.allowCompanions && (
                    <div className="pl-6 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold mb-1" style={{ color: "var(--win95-text)" }}>
                            Max Companions
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="10"
                            value={formData.maxCompanions}
                            onChange={(e) => setFormData({ ...formData, maxCompanions: e.target.value })}
                            className="w-full px-2 py-1 text-sm border-2"
                            style={{
                              borderColor: "var(--win95-border)",
                              background: "var(--win95-input-bg)",
                              color: "var(--win95-input-text)",
                            }}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold mb-1" style={{ color: "var(--win95-text)" }}>
                            Cost Per Companion
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.companionCost}
                            onChange={(e) => setFormData({ ...formData, companionCost: e.target.value })}
                            placeholder="Optional"
                            className="w-full px-2 py-1 text-sm border-2"
                            style={{
                              borderColor: "var(--win95-border)",
                              background: "var(--win95-input-bg)",
                              color: "var(--win95-input-text)",
                            }}
                          />
                        </div>
                      </div>
                      <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                        💡 Additional cost per companion (e.g., 30.00 for boat excursion)
                      </p>
                    </div>
                  )}
                </div>

                {/* NEW: Activity/Workshop Selection */}
                <div className="pt-3 border-t-2 space-y-3" style={{ borderColor: "var(--win95-border)" }}>
                  <h4 className="text-sm font-bold" style={{ color: "var(--win95-text)" }}>
                    🎯 Activity/Workshop Selection
                  </h4>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.includesActivitySelection}
                      onChange={(e) => setFormData({ ...formData, includesActivitySelection: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm" style={{ color: "var(--win95-text)" }}>
                      Include Activity/Workshop Selection
                    </span>
                  </label>

                  {formData.includesActivitySelection && (
                    <div className="pl-6 space-y-3">
                      <div>
                        <label className="block text-xs font-semibold mb-1" style={{ color: "var(--win95-text)" }}>
                          Activity Options (one per line)
                        </label>
                        <textarea
                          value={formData.activityOptions.join("\n")}
                          onChange={(e) => setFormData({ ...formData, activityOptions: e.target.value.split("\n").filter(o => o.trim()) })}
                          placeholder="Workshop A&#10;Workshop B&#10;Excursion&#10;Boat Tour"
                          rows={4}
                          className="w-full px-2 py-1 text-xs border-2"
                          style={{
                            borderColor: "var(--win95-border)",
                            background: "var(--win95-input-bg)",
                            color: "var(--win95-input-text)",
                          }}
                        />
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.activityRequired}
                          onChange={(e) => setFormData({ ...formData, activityRequired: e.target.checked })}
                          className="w-4 h-4"
                        />
                        <span className="text-xs" style={{ color: "var(--win95-text)" }}>
                          Activity selection required
                        </span>
                      </label>
                    </div>
                  )}
                </div>

                {/* NEW: Billing Address */}
                <div className="pt-3 border-t-2 space-y-3" style={{ borderColor: "var(--win95-border)" }}>
                  <h4 className="text-sm font-bold" style={{ color: "var(--win95-text)" }}>
                    💳 Billing & Invoicing
                  </h4>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.requiresBillingAddress}
                      onChange={(e) => setFormData({ ...formData, requiresBillingAddress: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm" style={{ color: "var(--win95-text)" }}>
                      📍 Require Full Billing Address
                    </span>
                  </label>
                  <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                    💡 Useful for invoice generation and tax compliance
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Event Association (only shown when Events app is available and creating new product) */}
      {!productId && (
        <div>
          <label className="block text-sm font-semibold mb-2" style={{ color: "var(--win95-text)" }}>
            Associate with Event (Optional)
          </label>
          {isEventsAppAvailable ? (
            <>
              <select
                value={formData.eventId}
                onChange={(e) => {
                  const selectedEventId = e.target.value;
                  setFormData({ ...formData, eventId: selectedEventId });

                  // If event selected and takeOverEventDates is true, populate dates
                  if (selectedEventId && formData.takeOverEventDates) {
                    const selectedEvent = events?.find(ev => ev._id === selectedEventId);
                    if (selectedEvent && selectedEvent.customProperties) {
                      const props = selectedEvent.customProperties;
                      const updatedFormData = { ...formData, eventId: selectedEventId };

                      // Populate start/end sale dates from event dates
                      if (props.eventDate) {
                        updatedFormData.startSaleDateTime = new Date(props.eventDate as number).toISOString().slice(0, 16);
                      }
                      if (props.eventEndDate) {
                        updatedFormData.endSaleDateTime = new Date(props.eventEndDate as number).toISOString().slice(0, 16);
                      }

                      setFormData(updatedFormData);
                    }
                  }
                }}
                className="w-full px-3 py-2 text-sm border-2"
                style={{
                  borderColor: "var(--win95-border)",
                  background: "var(--win95-input-bg)",
                  color: "var(--win95-input-text)",
                }}
              >
                <option value="">-- No Event --</option>
                {events?.map((event) => (
                  <option key={event._id} value={event._id}>
                    {event.name} ({event.subtype})
                  </option>
                ))}
              </select>

              {/* Date Takeover Option */}
              {formData.eventId && (
                <div className="mt-3 p-3 border-2 rounded" style={{ borderColor: "var(--win95-border)", background: "var(--win95-input-bg)" }}>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.takeOverEventDates}
                      onChange={(e) => {
                        const shouldTakeOver = e.target.checked;
                        setFormData({ ...formData, takeOverEventDates: shouldTakeOver });

                        // If enabling takeover, populate dates from selected event
                        if (shouldTakeOver && formData.eventId) {
                          const selectedEvent = events?.find(ev => ev._id === formData.eventId);
                          if (selectedEvent && selectedEvent.customProperties) {
                            const props = selectedEvent.customProperties;
                            const updatedFormData = { ...formData, takeOverEventDates: shouldTakeOver };

                            if (props.eventDate) {
                              updatedFormData.startSaleDateTime = new Date(props.eventDate as number).toISOString().slice(0, 16);
                            }
                            if (props.eventEndDate) {
                              updatedFormData.endSaleDateTime = new Date(props.eventEndDate as number).toISOString().slice(0, 16);
                            }

                            setFormData(updatedFormData);
                          }
                        }
                      }}
                      className="w-4 h-4"
                    />
                    <span className="text-sm" style={{ color: "var(--win95-text)" }}>
                      📅 Use event dates for ticket sales schedule
                    </span>
                  </label>
                  <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
                    Automatically set ticket sales start/end based on event dates
                  </p>
                </div>
              )}

              <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
                Link this product to an event. The event will &quot;offer&quot; this product.
              </p>
            </>
          ) : (
            <AppUnavailableInline
              appName="Events"
              organizationName={organizationName}
            />
          )}
        </div>
      )}

      {/* Info Box */}
      <div
        className="p-3 border-2 rounded"
        style={{
          background: "var(--win95-bg-light)",
          borderColor: "var(--win95-border)",
        }}
      >
        <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
          💡 Products start in &ldquo;Draft&rdquo; status. Click &ldquo;Publish&rdquo; to make them available for sale.
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-2 justify-end pt-4 border-t-2" style={{ borderColor: "var(--win95-border)" }}>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="px-4 py-2 text-sm font-bold flex items-center gap-2 border-2 transition-colors"
          style={{
            borderColor: "var(--win95-border)",
            background: "var(--win95-button-face)",
            color: "var(--win95-text)",
          }}
        >
          <X size={14} />
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 text-sm font-bold flex items-center gap-2 border-2 transition-colors"
          style={{
            borderColor: "var(--win95-border)",
            background: "var(--win95-button-face)",
            color: "var(--win95-text)",
          }}
        >
          {saving ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save size={14} />
              {productId ? "Update" : "Create"} Product
            </>
          )}
        </button>
      </div>
    </form>
  );
}
