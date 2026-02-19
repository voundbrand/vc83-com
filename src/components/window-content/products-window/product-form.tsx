"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { Loader2, Save, X, ChevronDown, CalendarDays } from "lucide-react";
import { useAppAvailability } from "@/hooks/use-app-availability";
import { AppUnavailableInline } from "@/components/app-unavailable";
import { getTaxCodesForCountry } from "@/lib/tax-calculator";
import { AddonManager } from "./addon-manager";
import { ProductAddon } from "@/types/product-addons";
import { InvoicingConfigSection, InvoiceConfig } from "./invoicing-config-section";
import { BookableConfigSection, BookableConfig, DEFAULT_BOOKABLE_CONFIG, BOOKABLE_PRESETS } from "./bookable-config-section";
import { usePostHog } from "posthog-js/react";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import { TemplateSelector } from "@/components/template-selector";
import { TemplateSetSelector } from "@/components/template-set-selector";

/**
 * Helper: Derive default category label from subtype
 */
function getDefaultCategoryLabel(subtype: string): string {
  const labels: Record<string, string> = {
    // Standard product types
    ticket: "Event Ticket",
    physical: "Physical Product",
    digital: "Digital Product",
    // Bookable resource types
    room: "Room / Meeting Space",
    staff: "Staff / Service Provider",
    equipment: "Equipment",
    space: "Workspace / Desk",
    vehicle: "Vehicle",
    accommodation: "Accommodation",
    // Bookable service types
    appointment: "Appointment Service",
    class: "Class / Group Session",
    treatment: "Treatment / Spa Service",
  };
  return labels[subtype] || "Product";
}

/**
 * Helper: Check if subtype is a bookable type
 */
function isBookableSubtype(subtype: string): boolean {
  const bookableTypes = [
    "room", "staff", "equipment", "space", "vehicle", "accommodation",
    "appointment", "class", "treatment"
  ];
  return bookableTypes.includes(subtype);
}

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
  const { t, isLoading: translationsLoading } = useNamespaceTranslations("ui.products");
  const posthog = usePostHog();
  const [formData, setFormData] = useState({
    subtype: "ticket",
    categoryLabel: "", // Derived from subtype, but can be customized
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
    // NEW: Template Set Override (for consistent branding)
    templateSetId: "" as string, // Template set ID for unified branding
    // NEW: Ticket Template Override (legacy - for ticket subtype only)
    ticketTemplateId: "" as string, // Template ID for ticket PDF generation (overrides template set)
    // NEW: Bookable Configuration (for bookable subtypes)
    bookableConfig: null as BookableConfig | null,
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
      const subtype = existingProduct.subtype || "ticket";
      setFormData({
        subtype,
        categoryLabel: (props.categoryLabel as string) || getDefaultCategoryLabel(subtype),
        name: existingProduct.name || "",
        description: existingProduct.description || "",
        price: ((props.price || 0) / 100).toString(),
        currency: props.currency || "EUR",
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
        // Template Set
        templateSetId: (props.templateSetId as string) || "",
        // Ticket Template (legacy)
        ticketTemplateId: (props.ticketTemplateId as string) || "",
        // Bookable Configuration
        bookableConfig: (props.bookableConfig as BookableConfig) || (
          isBookableSubtype(subtype)
            ? { ...DEFAULT_BOOKABLE_CONFIG, ...(BOOKABLE_PRESETS[subtype as keyof typeof BOOKABLE_PRESETS] || {}) }
            : null
        ),
      });
    }
  }, [existingProduct]);

  // Auto-populate categoryLabel when creating new product (only if categoryLabel is empty)
  useEffect(() => {
    if (!productId && !formData.categoryLabel) {
      setFormData((prev) => ({
        ...prev,
        categoryLabel: getDefaultCategoryLabel(prev.subtype),
      }));
    }
  }, [productId, formData.subtype, formData.categoryLabel]);

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

      // Category Label (applies to all product types)
      customProperties.categoryLabel = formData.categoryLabel || getDefaultCategoryLabel(formData.subtype);

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

      // Template Set (for consistent branding across all templates)
      if (formData.templateSetId) {
        customProperties.templateSetId = formData.templateSetId;
      }

      // Ticket Template (only for ticket subtype - overrides template set ticket template)
      if (formData.subtype === "ticket" && formData.ticketTemplateId) {
        customProperties.ticketTemplateId = formData.ticketTemplateId;
      }

      // Bookable Configuration (for bookable resource/service types)
      if (isBookableSubtype(formData.subtype) && formData.bookableConfig) {
        customProperties.bookableConfig = formData.bookableConfig;

        // Persist availability model and model-specific fields at top level
        // so the Convex backend dispatchers can read them directly.
        const bc = formData.bookableConfig;
        customProperties.availabilityModel = bc.availabilityModel || "time_slot";

        if (bc.availabilityModel === "date_range_inventory") {
          customProperties.inventoryCount = bc.inventoryCount;
          customProperties.minimumStayNights = bc.minimumStayNights;
          customProperties.maximumStayNights = bc.maximumStayNights;
          customProperties.checkInTime = bc.checkInTime;
          customProperties.checkOutTime = bc.checkOutTime;
          customProperties.baseNightlyRateCents = bc.baseNightlyRateCents;
        } else if (bc.availabilityModel === "event_bound_seating") {
          customProperties.totalSeats = bc.totalSeats;
          customProperties.maxSeatsPerBooking = bc.maxSeatsPerBooking;
        } else if (bc.availabilityModel === "departure_bound") {
          customProperties.totalPassengerSeats = bc.totalPassengerSeats;
          customProperties.vehicleType = bc.vehicleType;
          customProperties.boardingMinutesBefore = bc.boardingMinutesBefore;
        }
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
          currency: formData.currency, // Include currency in update
          inventory: inventory || undefined,
          eventId: formData.eventId ? (formData.eventId as Id<"objects">) : null,
          customProperties,
          invoiceConfig: formData.invoiceConfig || undefined,
        });

        // Track product update
        posthog?.capture("product_updated", {
          product_id: productId,
          product_type: formData.subtype,
          product_name: formData.name,
          price: priceInCents / 100,
          currency: formData.currency,
          has_inventory: !!inventory,
          has_form: !!formData.formId,
          has_addons: (formData.addons?.length || 0) > 0,
          organization_id: organizationId,
          ticket_type: formData.subtype === "ticket" ? formData.ticketType : undefined,
          is_active: formData.subtype === "ticket" ? formData.isActive : undefined,
        });
      } else {
        // Create new product
        const newProductId = await createProduct({
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

        // Track product creation
        posthog?.capture("product_created", {
          product_id: newProductId,
          product_type: formData.subtype,
          product_name: formData.name,
          price: priceInCents / 100,
          currency: formData.currency,
          has_inventory: !!inventory,
          has_form: !!formData.formId,
          has_addons: (formData.addons?.length || 0) > 0,
          organization_id: organizationId,
          ticket_type: formData.subtype === "ticket" ? formData.ticketType : undefined,
          is_active: formData.subtype === "ticket" ? formData.isActive : undefined,
        });
      }

      onSuccess();
    } catch (error) {
      console.error("Failed to save product:", error);
      alert("Failed to save product. Please try again.");

      posthog?.capture("$exception", {
        error_type: productId ? "product_update_failed" : "product_creation_failed",
        error_message: error instanceof Error ? error.message : "Unknown error",
        product_type: formData.subtype,
        organization_id: organizationId,
      });
    } finally {
      setSaving(false);
    }
  };

  if (translationsLoading || (productId && !existingProduct)) {
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
    <form onSubmit={handleSubmit} className="p-6 space-y-4 relative">
      {/* Product ID Display (top right) */}
      {productId && (
        <div className="absolute top-2 right-2 px-2 py-1 text-xs font-mono border"
          style={{
            background: "var(--shell-surface-elevated)",
            borderColor: "var(--shell-border)",
            color: "var(--neutral-gray)",
          }}
          title="Product ID"
        >
          <code>{productId}</code>
        </div>
      )}

      {/* Product Type */}
      <div>
        <label className="block text-sm font-semibold mb-2" style={{ color: "var(--shell-text)" }}>
          {t("ui.products.form.type.label")} <span style={{ color: "var(--error)" }}>*</span>
        </label>
        <select
          value={formData.subtype}
          onChange={(e) => {
            const newSubtype = e.target.value;
            setFormData({
              ...formData,
              subtype: newSubtype,
              // Auto-update categoryLabel to default when subtype changes (only if not manually edited)
              categoryLabel: formData.categoryLabel === getDefaultCategoryLabel(formData.subtype)
                ? getDefaultCategoryLabel(newSubtype)
                : formData.categoryLabel,
              // Auto-apply bookable preset when switching to a bookable type
              bookableConfig: isBookableSubtype(newSubtype)
                ? { ...DEFAULT_BOOKABLE_CONFIG, ...(BOOKABLE_PRESETS[newSubtype as keyof typeof BOOKABLE_PRESETS] || {}) }
                : null
            });
          }}
          disabled={!!productId}
          className="w-full px-3 py-2 text-sm border-2"
          style={{
            borderColor: "var(--shell-border)",
            background: "var(--shell-input-surface)",
            color: "var(--shell-input-text)",
          }}
          required
        >
          <optgroup label="Standard Products">
            <option value="ticket">{t("ui.products.form.type.ticket")}</option>
            <option value="physical">{t("ui.products.form.type.physical")}</option>
            <option value="digital">{t("ui.products.form.type.digital")}</option>
          </optgroup>
          <optgroup label="Bookable Resources">
            <option value="room">Room / Meeting Space</option>
            <option value="staff">Staff / Service Provider</option>
            <option value="equipment">Equipment</option>
            <option value="space">Workspace / Desk</option>
            <option value="vehicle">Vehicle</option>
            <option value="accommodation">Accommodation</option>
          </optgroup>
          <optgroup label="Bookable Services">
            <option value="appointment">Appointment Service</option>
            <option value="class">Class / Group Session</option>
            <option value="treatment">Treatment / Spa Service</option>
          </optgroup>
        </select>
        {productId && (
          <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
            {t("ui.products.form.type.locked")}
          </p>
        )}
      </div>

      {/* Category Label */}
      <div>
        <label className="block text-sm font-semibold mb-2" style={{ color: "var(--shell-text)" }}>
          Category Label
        </label>
        <input
          type="text"
          value={formData.categoryLabel}
          onChange={(e) => setFormData({ ...formData, categoryLabel: e.target.value })}
          placeholder={getDefaultCategoryLabel(formData.subtype)}
          className="w-full px-3 py-2 text-sm border-2"
          style={{
            borderColor: "var(--shell-border)",
            background: "var(--shell-input-surface)",
            color: "var(--shell-input-text)",
          }}
        />
        <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
          Tip: Human-readable category name for external APIs. Auto-derived from product type, but can be customized.
        </p>
      </div>

      {/* Product Name */}
      <div>
        <label className="block text-sm font-semibold mb-2" style={{ color: "var(--shell-text)" }}>
          {t("ui.products.form.name.label")} <span style={{ color: "var(--error)" }}>*</span>
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder={t("ui.products.form.name.placeholder")}
          className="w-full px-3 py-2 text-sm border-2"
          style={{
            borderColor: "var(--shell-border)",
            background: "var(--shell-input-surface)",
            color: "var(--shell-input-text)",
          }}
          required
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-semibold mb-2" style={{ color: "var(--shell-text)" }}>
          {t("ui.products.form.description.label")}
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder={t("ui.products.form.description.placeholder")}
          rows={4}
          className="w-full px-3 py-2 text-sm border-2"
          style={{
            borderColor: "var(--shell-border)",
            background: "var(--shell-input-surface)",
            color: "var(--shell-input-text)",
          }}
        />
      </div>

      {/* Price */}
      <div>
        <label className="block text-sm font-semibold mb-2" style={{ color: "var(--shell-text)" }}>
          {t("ui.products.form.price.label")} {formData.subtype === "ticket" && formData.ticketType === "paid" && <span style={{ color: "var(--error)" }}>*</span>}
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
                borderColor: "var(--shell-border)",
                background: formData.subtype === "ticket" && formData.ticketType === "free" ? "var(--shell-surface-elevated)" : "var(--shell-input-surface)",
                color: "var(--shell-input-text)",
              }}
              required={formData.subtype === "ticket" ? formData.ticketType === "paid" : true}
            />
          </div>
          <select
            value={formData.currency}
            onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
            className="px-3 py-2 text-sm border-2"
            style={{
              borderColor: "var(--shell-border)",
              background: "var(--shell-input-surface)",
              color: "var(--shell-input-text)",
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
          {formData.subtype === "ticket" && formData.ticketType === "free" && t("ui.products.form.price.help")}
          {formData.subtype === "ticket" && formData.ticketType === "donation" && t("ui.products.form.price.help")}
          {(formData.subtype !== "ticket" || formData.ticketType === "paid") && t("ui.products.form.price.help")}
        </p>
      </div>

      {/* Inventory */}
      <div>
        <label className="block text-sm font-semibold mb-2" style={{ color: "var(--shell-text)" }}>
          {t("ui.products.form.inventory.label")}
        </label>
        <input
          type="number"
          min="0"
          value={formData.inventory}
          onChange={(e) => setFormData({ ...formData, inventory: e.target.value })}
          placeholder={t("ui.products.form.inventory.placeholder")}
          className="w-full px-3 py-2 text-sm border-2"
          style={{
            borderColor: "var(--shell-border)",
            background: "var(--shell-input-surface)",
            color: "var(--shell-input-text)",
          }}
        />
        <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
          {t("ui.products.form.inventory.help")}
        </p>
      </div>

      {/* TAX SETTINGS - Applies to all product types */}
      <div className="space-y-4 p-4 border-2 rounded" style={{ borderColor: "var(--shell-border)", background: "var(--shell-surface-elevated)" }}>
        <h3 className="text-sm font-bold" style={{ color: "var(--shell-text)" }}>
          {t("ui.products.form.tax.title")}
        </h3>
        <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
          {t("ui.products.form.tax.description")}
        </p>

        {/* Taxable Toggle */}
        <div className="flex items-center justify-between p-3 border-2 rounded" style={{ borderColor: "var(--shell-border)", background: "var(--shell-input-surface)" }}>
          <div className="flex-1">
            <label className="block text-sm font-semibold" style={{ color: "var(--shell-text)" }}>
              {t("ui.products.form.tax.taxable")}
            </label>
            <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
              {formData.taxable ? `${t("ui.products.form.tax.taxableYes")}` : `${t("ui.products.form.tax.taxableNo")}`}
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
              {formData.taxable ? t("ui.products.form.tax.taxableYes") : t("ui.products.form.tax.taxableNo")}
            </span>
          </label>
        </div>

        {/* Tax Code - Only show if taxable */}
        {formData.taxable && (
          <div className="pl-4 space-y-3 border-l-2" style={{ borderColor: "var(--shell-border)" }}>
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: "var(--shell-text)" }}>
                {t("ui.products.form.tax.taxCode.label")}
              </label>
              <select
                value={formData.taxCode}
                onChange={(e) => setFormData({ ...formData, taxCode: e.target.value })}
                className="w-full px-3 py-2 text-sm border-2"
                style={{
                  borderColor: "var(--shell-border)",
                  background: "var(--shell-input-surface)",
                  color: "var(--shell-input-text)",
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
                Tip: Showing tax codes for {originCountry}.
                {orgDefaultTaxCode
                  ? ` Org default: ${defaultTaxCodeLabel}`
                  : ` No org default - configure in tax settings.`
                }
              </p>
            </div>

            {/* Tax Behavior */}
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: "var(--shell-text)" }}>
                {t("ui.products.form.tax.behavior.label")}
              </label>
              <select
                value={formData.taxBehavior}
                onChange={(e) => setFormData({ ...formData, taxBehavior: e.target.value as "exclusive" | "inclusive" | "automatic" })}
                className="w-full px-3 py-2 text-sm border-2"
                style={{
                  borderColor: "var(--shell-border)",
                  background: "var(--shell-input-surface)",
                  color: "var(--shell-input-text)",
                }}
              >
                <option value="exclusive">{t("ui.products.form.tax.behavior.exclusive")}</option>
                <option value="inclusive">{t("ui.products.form.tax.behavior.inclusive")}</option>
                <option value="automatic">{t("ui.products.form.tax.behavior.automatic")}</option>
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
      <div className="space-y-4 p-4 border-2 rounded" style={{ borderColor: "var(--shell-border)", background: "var(--shell-surface-elevated)" }}>
        <h3 className="text-sm font-bold" style={{ color: "var(--shell-text)" }}>
          {t("ui.products.form.formLink.title")}
        </h3>
        <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
          {t("ui.products.form.formLink.description")}
        </p>

        {/* Form Selection */}
        <div>
          <label className="block text-sm font-semibold mb-2" style={{ color: "var(--shell-text)" }}>
            {t("ui.products.form.formLink.select")}
          </label>
          <select
            value={formData.formId}
            onChange={(e) => setFormData({ ...formData, formId: e.target.value })}
            className="w-full px-3 py-2 text-sm border-2"
            style={{
              borderColor: "var(--shell-border)",
              background: "var(--shell-input-surface)",
              color: "var(--shell-input-text)",
            }}
          >
            <option value="">{t("ui.products.form.formLink.none")}</option>
            {forms?.map((form) => (
              <option key={form._id} value={form._id}>
                {form.name} ({form.subtype})
              </option>
            ))}
          </select>
          <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
            Tip: Forms must be published to appear here. Create forms in the Forms app.
          </p>
        </div>

        {/* Form Timing & Requirements - Only show if form is selected */}
        {formData.formId && (
          <div className="pl-4 space-y-3 border-l-2" style={{ borderColor: "var(--shell-border)" }}>
            {/* Form Timing */}
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: "var(--shell-text)" }}>
                {t("ui.products.form.formLink.timing.label")}
              </label>
              <select
                value={formData.formTiming}
                onChange={(e) => setFormData({ ...formData, formTiming: e.target.value as "duringCheckout" | "afterPurchase" | "standalone" })}
                className="w-full px-3 py-2 text-sm border-2"
                style={{
                  borderColor: "var(--shell-border)",
                  background: "var(--shell-input-surface)",
                  color: "var(--shell-input-text)",
                }}
              >
                <option value="duringCheckout">{t("ui.products.form.formLink.timing.duringCheckout")}</option>
                <option value="afterPurchase">{t("ui.products.form.formLink.timing.afterPurchase")}</option>
                <option value="standalone">{t("ui.products.form.formLink.timing.standalone")}</option>
              </select>
              <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
                {formData.formTiming === "duringCheckout" && "Form appears in checkout flow before payment"}
                {formData.formTiming === "afterPurchase" && "Customer receives email with form link after purchase"}
                {formData.formTiming === "standalone" && "Form is not integrated into checkout - manual sharing only"}
              </p>
            </div>

            {/* Form Required */}
            <div className="flex items-center justify-between p-3 border-2 rounded" style={{ borderColor: "var(--shell-border)", background: "var(--shell-input-surface)" }}>
              <div className="flex-1">
                <label className="block text-sm font-semibold" style={{ color: "var(--shell-text)" }}>
                  {t("ui.products.form.formLink.required.label")}
                </label>
                <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
                  {formData.formRequired ? `${t("ui.products.form.formLink.required.yes")}` : `${t("ui.products.form.formLink.required.no")}`}
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
                  {formData.formRequired ? t("ui.products.form.formLink.required.yes") : t("ui.products.form.formLink.required.no")}
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

      {/* BOOKABLE CONFIGURATION - Only show for bookable subtypes */}
      {isBookableSubtype(formData.subtype) && (
        <BookableConfigSection
          config={formData.bookableConfig || DEFAULT_BOOKABLE_CONFIG}
          onChange={(bookableConfig) => setFormData({ ...formData, bookableConfig })}
          subtype={formData.subtype}
        />
      )}

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
        <div className="space-y-4 p-4 border-2 rounded" style={{ borderColor: "var(--shell-border)", background: "var(--shell-surface-elevated)" }}>
          <h3 className="text-sm font-bold" style={{ color: "var(--shell-text)" }}>
            Ticket Settings
          </h3>

          {/* Event Association - Only if Events app is available */}
          {isEventsAppAvailable ? (
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: "var(--shell-text)" }}>
                Associated Event (Optional)
              </label>
              <select
                value={formData.eventId}
                onChange={(e) => setFormData({ ...formData, eventId: e.target.value })}
                className="w-full px-3 py-2 text-sm border-2"
                style={{
                  borderColor: "var(--shell-border)",
                  background: "var(--shell-input-surface)",
                  color: "var(--shell-input-text)",
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
            <div className="p-3 border-2 rounded" style={{ borderColor: "var(--shell-border)", background: "var(--shell-surface)" }}>
              <div className="flex items-start gap-3">
                <CalendarDays className="h-6 w-6 mt-0.5" style={{ color: "var(--shell-accent)" }} />
                <div>
                  <p className="text-sm font-semibold mb-1" style={{ color: "var(--shell-text)" }}>
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

          {/* Template Set Selector (NEW - Unified Branding) */}
          <div className="mb-4 border-t-2 pt-4" style={{ borderColor: 'var(--shell-border)' }}>
            <h4 className="text-xs font-bold mb-3" style={{ color: 'var(--shell-text)' }}>
              Branding Templates (Optional Override)
            </h4>
            <TemplateSetSelector
              organizationId={organizationId}
              value={formData.templateSetId ? (formData.templateSetId as Id<"objects">) : null}
              onChange={(templateSetId) => setFormData({ ...formData, templateSetId: templateSetId || "" })}
              label="Template Set Override"
              description="Override checkout-level templates for this product. Provides consistent branding across tickets, invoices, and emails."
              required={false}
              allowNull={true}
              nullLabel="Use checkout-level templates"
              showDetails={true}
            />

            <div className="mt-3 p-3 rounded text-xs" style={{ backgroundColor: 'rgba(107, 70, 193, 0.1)', color: 'var(--shell-accent)' }}>
              <div className="font-bold mb-1">Template Precedence:</div>
              <ul className="space-y-1 ml-4">
                <li>• <strong>Product Template Set</strong>: Highest priority (if set)</li>
                <li>• <strong>Checkout Template Set</strong>: Mid priority (fallback)</li>
                <li>• <strong>Organization Default</strong>: Lowest priority (ultimate fallback)</li>
              </ul>
            </div>
          </div>

          {/* Legacy: Individual Ticket Template Selector */}
          <details className="mb-4">
            <summary className="cursor-pointer text-xs font-bold p-2 rounded" style={{ backgroundColor: 'rgba(107, 70, 193, 0.05)', color: 'var(--shell-text)' }}>
              Advanced: Override Ticket Template Only
            </summary>
            <div className="mt-2 p-3 border-2 rounded" style={{ borderColor: 'var(--shell-border)' }}>
              <p className="text-xs mb-3" style={{ color: 'var(--neutral-gray)' }}>
                Override ONLY the ticket template (not recommended - use Template Set for consistent branding).
              </p>
              <TemplateSelector
                category="ticket"
                value={formData.ticketTemplateId ? (formData.ticketTemplateId as Id<"objects">) : null}
                onChange={(templateId) => setFormData({ ...formData, ticketTemplateId: templateId || "" })}
                label="Ticket Template Override"
                description="Overrides the ticket template from the template set."
                organizationId={organizationId}
                required={false}
                allowNull={true}
                nullLabel="Use template from template set"
              />
            </div>
          </details>

          {/* Active/Inactive Status Toggle */}
          <div className="flex items-center justify-between p-3 border-2 rounded" style={{ borderColor: "var(--shell-border)", background: "var(--shell-input-surface)" }}>
            <div className="flex-1">
              <label className="block text-sm font-semibold" style={{ color: "var(--shell-text)" }}>
                Ticket Status
              </label>
              <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
                {formData.isActive ? "Active - Ticket sales are enabled" : "Paused - Ticket sales are temporarily suspended"}
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
            <label className="block text-sm font-semibold mb-2" style={{ color: "var(--shell-text)" }}>
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
                borderColor: "var(--shell-border)",
                background: "var(--shell-input-surface)",
                color: "var(--shell-input-text)",
              }}
            >
              <option value="paid">Paid - Standard ticket with price</option>
              <option value="free">Free - No charge required</option>
              <option value="donation">Donation - Pay what you want</option>
            </select>
          </div>

          {/* Sales Schedule */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: "var(--shell-text)" }}>
                Sales Start
              </label>
              <input
                type="datetime-local"
                value={formData.startSaleDateTime}
                onChange={(e) => setFormData({ ...formData, startSaleDateTime: e.target.value })}
                className="w-full px-3 py-2 text-xs border-2"
                style={{
                  borderColor: "var(--shell-border)",
                  background: "var(--shell-input-surface)",
                  color: "var(--shell-input-text)",
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: "var(--shell-text)" }}>
                Sales End
              </label>
              <input
                type="datetime-local"
                value={formData.endSaleDateTime}
                onChange={(e) => setFormData({ ...formData, endSaleDateTime: e.target.value })}
                className="w-full px-3 py-2 text-xs border-2"
                style={{
                  borderColor: "var(--shell-border)",
                  background: "var(--shell-input-surface)",
                  color: "var(--shell-input-text)",
                }}
              />
            </div>
          </div>

          {/* Order Limits */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: "var(--shell-text)" }}>
                Min Per Order
              </label>
              <input
                type="number"
                min="1"
                value={formData.minPerOrder}
                onChange={(e) => setFormData({ ...formData, minPerOrder: e.target.value })}
                className="w-full px-3 py-2 text-sm border-2"
                style={{
                  borderColor: "var(--shell-border)",
                  background: "var(--shell-input-surface)",
                  color: "var(--shell-input-text)",
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: "var(--shell-text)" }}>
                Max Per Order
              </label>
              <input
                type="number"
                min="1"
                value={formData.maxPerOrder}
                onChange={(e) => setFormData({ ...formData, maxPerOrder: e.target.value })}
                className="w-full px-3 py-2 text-sm border-2"
                style={{
                  borderColor: "var(--shell-border)",
                  background: "var(--shell-input-surface)",
                  color: "var(--shell-input-text)",
                }}
              />
            </div>
          </div>

          <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
            Tip: Sales schedule and order limits help manage ticket availability and prevent bulk purchases.
          </p>

          {/* Advanced Settings - Collapsible Section */}
          <div className="pt-4 border-t-2" style={{ borderColor: "var(--shell-border)" }}>
            <button
              type="button"
              onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
              className="flex items-center justify-between w-full text-left mb-3"
            >
              <h4 className="text-sm font-bold" style={{ color: "var(--shell-text)" }}>
                Advanced Settings
              </h4>
              <ChevronDown
                size={16}
                className="transition-transform"
                style={{
                  transform: showAdvancedSettings ? "rotate(180deg)" : "rotate(0deg)",
                  color: "var(--shell-text)",
                }}
              />
            </button>

            {showAdvancedSettings && (
              <div className="space-y-4 mt-3">
                {/* Visibility Settings */}
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: "var(--shell-text)" }}>
                    Visibility
                  </label>
                  <select
                    value={formData.visibility}
                    onChange={(e) => setFormData({ ...formData, visibility: e.target.value as "visible" | "invisible" | "invisibleNotForSale" | "customSchedule" })}
                    className="w-full px-3 py-2 text-sm border-2"
                    style={{
                      borderColor: "var(--shell-border)",
                      background: "var(--shell-input-surface)",
                      color: "var(--shell-input-text)",
                    }}
                  >
                    <option value="visible">Visible - Show on event page</option>
                    <option value="invisible">Invisible - Hidden, direct link only</option>
                    <option value="invisibleNotForSale">Invisible & Not For Sale</option>
                    <option value="customSchedule">Custom Schedule - Show/hide by date</option>
                  </select>
                  <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
                    Control when and how this ticket appears to buyers
                  </p>
                </div>

                {/* Custom Schedule Dates - Only show when customSchedule selected */}
                {formData.visibility === "customSchedule" && (
                  <div className="pl-4 space-y-3 border-l-2" style={{ borderColor: "var(--shell-border)" }}>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold mb-1" style={{ color: "var(--shell-text)" }}>
                          Show From
                        </label>
                        <input
                          type="datetime-local"
                          value={formData.visibilityStartDateTime}
                          onChange={(e) => setFormData({ ...formData, visibilityStartDateTime: e.target.value })}
                          className="w-full px-2 py-1 text-xs border-2"
                          style={{
                            borderColor: "var(--shell-border)",
                            background: "var(--shell-input-surface)",
                            color: "var(--shell-input-text)",
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-1" style={{ color: "var(--shell-text)" }}>
                          Hide After
                        </label>
                        <input
                          type="datetime-local"
                          value={formData.visibilityEndDateTime}
                          onChange={(e) => setFormData({ ...formData, visibilityEndDateTime: e.target.value })}
                          className="w-full px-2 py-1 text-xs border-2"
                          style={{
                            borderColor: "var(--shell-border)",
                            background: "var(--shell-input-surface)",
                            color: "var(--shell-input-text)",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Distribution Channel */}
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: "var(--shell-text)" }}>
                    Distribution Channel
                  </label>
                  <select
                    value={formData.distributionChannel}
                    onChange={(e) => setFormData({ ...formData, distributionChannel: e.target.value as "onlineOnly" | "atVenueOnly" | "onlineAndVenue" })}
                    className="w-full px-3 py-2 text-sm border-2"
                    style={{
                      borderColor: "var(--shell-border)",
                      background: "var(--shell-input-surface)",
                      color: "var(--shell-input-text)",
                    }}
                    disabled={formData.ticketType === "donation"}
                  >
                    <option value="onlineOnly">Online Only</option>
                    <option value="atVenueOnly">At Venue Only</option>
                    <option value="onlineAndVenue">Online & Venue</option>
                  </select>
                  <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
                    {formData.ticketType === "donation" ? "Donations are online only" : "Where tickets can be purchased"}
                  </p>
                </div>

                {/* Delivery Methods */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold mb-2" style={{ color: "var(--shell-text)" }}>
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
                    <span className="text-sm" style={{ color: "var(--shell-text)" }}>
                      E-Ticket (Email/Mobile)
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
                    <span className="text-sm" style={{ color: "var(--shell-text)" }}>
                      Will Call Pickup (At Venue)
                    </span>
                  </label>
                </div>

                {/* Display Options */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold mb-2" style={{ color: "var(--shell-text)" }}>
                    Display Options
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.showSalesEndStatus}
                      onChange={(e) => setFormData({ ...formData, showSalesEndStatus: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm" style={{ color: "var(--shell-text)" }}>
                      Show &quot;Sales end in X hours&quot; countdown
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
                      <span className="text-sm" style={{ color: "var(--shell-text)" }}>
                        Deduct fees from donation amount
                      </span>
                    </label>
                  )}
                </div>

                {/* NEW: Logistics Settings */}
                <div className="pt-3 border-t-2 space-y-3" style={{ borderColor: "var(--shell-border)" }}>
                  <h4 className="text-sm font-bold" style={{ color: "var(--shell-text)" }}>
                    Event Logistics
                  </h4>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.accommodationRequired}
                      onChange={(e) => setFormData({ ...formData, accommodationRequired: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm" style={{ color: "var(--shell-text)" }}>
                      Accommodation Required
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.collectAccommodationNotes}
                      onChange={(e) => setFormData({ ...formData, collectAccommodationNotes: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm" style={{ color: "var(--shell-text)" }}>
                      Collect Accommodation Notes/Requests
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.mealIncluded}
                      onChange={(e) => setFormData({ ...formData, mealIncluded: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm" style={{ color: "var(--shell-text)" }}>
                      Meal Included
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.collectDietaryRequirements}
                      onChange={(e) => setFormData({ ...formData, collectDietaryRequirements: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm" style={{ color: "var(--shell-text)" }}>
                      Collect Dietary Requirements/Allergies
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.collectArrivalTime}
                      onChange={(e) => setFormData({ ...formData, collectArrivalTime: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm" style={{ color: "var(--shell-text)" }}>
                      Collect Planned Arrival Time
                    </span>
                  </label>
                </div>

                {/* NEW: Companion/Guest Settings */}
                <div className="pt-3 border-t-2 space-y-3" style={{ borderColor: "var(--shell-border)" }}>
                  <h4 className="text-sm font-bold" style={{ color: "var(--shell-text)" }}>
                    Companion/Guest Settings
                  </h4>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.allowCompanions}
                      onChange={(e) => setFormData({ ...formData, allowCompanions: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm" style={{ color: "var(--shell-text)" }}>
                      Allow Companions/Guests
                    </span>
                  </label>

                  {formData.allowCompanions && (
                    <div className="pl-6 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold mb-1" style={{ color: "var(--shell-text)" }}>
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
                              borderColor: "var(--shell-border)",
                              background: "var(--shell-input-surface)",
                              color: "var(--shell-input-text)",
                            }}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold mb-1" style={{ color: "var(--shell-text)" }}>
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
                              borderColor: "var(--shell-border)",
                              background: "var(--shell-input-surface)",
                              color: "var(--shell-input-text)",
                            }}
                          />
                        </div>
                      </div>
                      <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                        Tip: Additional cost per companion (e.g., 30.00 for boat excursion)
                      </p>
                    </div>
                  )}
                </div>

                {/* NEW: Activity/Workshop Selection */}
                <div className="pt-3 border-t-2 space-y-3" style={{ borderColor: "var(--shell-border)" }}>
                  <h4 className="text-sm font-bold" style={{ color: "var(--shell-text)" }}>
                    Activity/Workshop Selection
                  </h4>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.includesActivitySelection}
                      onChange={(e) => setFormData({ ...formData, includesActivitySelection: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm" style={{ color: "var(--shell-text)" }}>
                      Include Activity/Workshop Selection
                    </span>
                  </label>

                  {formData.includesActivitySelection && (
                    <div className="pl-6 space-y-3">
                      <div>
                        <label className="block text-xs font-semibold mb-1" style={{ color: "var(--shell-text)" }}>
                          Activity Options (one per line)
                        </label>
                        <textarea
                          value={formData.activityOptions.join("\n")}
                          onChange={(e) => setFormData({ ...formData, activityOptions: e.target.value.split("\n").filter(o => o.trim()) })}
                          placeholder="Workshop A&#10;Workshop B&#10;Excursion&#10;Boat Tour"
                          rows={4}
                          className="w-full px-2 py-1 text-xs border-2"
                          style={{
                            borderColor: "var(--shell-border)",
                            background: "var(--shell-input-surface)",
                            color: "var(--shell-input-text)",
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
                        <span className="text-xs" style={{ color: "var(--shell-text)" }}>
                          Activity selection required
                        </span>
                      </label>
                    </div>
                  )}
                </div>

                {/* NEW: Billing Address */}
                <div className="pt-3 border-t-2 space-y-3" style={{ borderColor: "var(--shell-border)" }}>
                  <h4 className="text-sm font-bold" style={{ color: "var(--shell-text)" }}>
                    Billing and Invoicing
                  </h4>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.requiresBillingAddress}
                      onChange={(e) => setFormData({ ...formData, requiresBillingAddress: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm" style={{ color: "var(--shell-text)" }}>
                      Require Full Billing Address
                    </span>
                  </label>
                  <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                    Tip: Useful for invoice generation and tax compliance
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
          <label className="block text-sm font-semibold mb-2" style={{ color: "var(--shell-text)" }}>
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
                  borderColor: "var(--shell-border)",
                  background: "var(--shell-input-surface)",
                  color: "var(--shell-input-text)",
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
                <div className="mt-3 p-3 border-2 rounded" style={{ borderColor: "var(--shell-border)", background: "var(--shell-input-surface)" }}>
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
                    <span className="text-sm" style={{ color: "var(--shell-text)" }}>
                      Use event dates for ticket sales schedule
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
          background: "var(--shell-surface-elevated)",
          borderColor: "var(--shell-border)",
        }}
      >
        <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
          Tip: Products start in &ldquo;Draft&rdquo; status. Click &ldquo;Publish&rdquo; to make them available for sale.
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-2 justify-end pt-4 border-t-2" style={{ borderColor: "var(--shell-border)" }}>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="px-4 py-2 text-sm font-bold flex items-center gap-2 border-2 transition-colors"
          style={{
            borderColor: "var(--shell-border)",
            background: "var(--shell-button-surface)",
            color: "var(--shell-text)",
          }}
        >
          <X size={14} />
          {t("ui.products.button.cancel")}
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 text-sm font-bold flex items-center gap-2 border-2 transition-colors"
          style={{
            borderColor: "var(--shell-border)",
            background: "var(--shell-button-surface)",
            color: "var(--shell-text)",
          }}
        >
          {saving ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              {t("ui.products.saving")}
            </>
          ) : (
            <>
              <Save size={14} />
              {productId ? t("ui.products.button.update") : t("ui.products.button.create")} Product
            </>
          )}
        </button>
      </div>
    </form>
  );
}
