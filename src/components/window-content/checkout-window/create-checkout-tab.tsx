"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
// Dynamic require to avoid TS2589 deep type instantiation
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
const { api } = require("../../../../convex/_generated/api") as { api: any };
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import { ShoppingCart, ArrowLeft, Loader2, AlertCircle, Eye, FileText, Check, Palette, ChevronDown, ChevronUp, CreditCard, Building2, X } from "lucide-react";
import { Id } from "../../../../convex/_generated/dataModel";
import { CheckoutPreview } from "./checkout-preview";
import { getCheckoutSchema } from "@/templates/checkout/registry";
import { getTheme } from "@/templates/registry";
import type { CheckoutProduct } from "@/templates/checkout/types";
import { useNotification } from "@/hooks/use-notification";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import { TemplateSelector } from "@/components/template-selector";
import { TemplateSetSelector } from "@/components/template-set-selector";
import { EmailSelector } from "@/components/email-selector";
import { parseLimitError, useUpgradeModal } from "@/components/ui/upgrade-prompt";

/**
 * Helper: Check which features are required for the checkout configuration
 * Returns the first missing feature that requires an upgrade, or null if all features are available
 */
function getRequiredFeatureForCheckout(
  config: {
    paymentProviders?: string[];
    defaultLanguage?: string;
    templateSetId?: unknown;
    customBranding?: unknown;
    settings?: { stripeTaxEnabled?: boolean };
  },
  license: {
    features: {
      stripeConnectEnabled?: boolean;
      invoicePaymentEnabled?: boolean;
      manualPaymentEnabled?: boolean;
      multiLanguageEnabled?: boolean;
      templateSetOverridesEnabled?: boolean;
      customBrandingEnabled?: boolean;
      stripeTaxEnabled?: boolean;
    };
  } | null | undefined
): { feature: string; friendlyName: string; requiredTier: string } | null {
  if (!license) return null;

  const { features } = license;

  // Check payment providers
  if (config.paymentProviders?.includes("stripe-connect") && !features.stripeConnectEnabled) {
    return { feature: "stripeConnectEnabled", friendlyName: "Stripe Connect", requiredTier: "Starter (€199/month)" };
  }
  if (config.paymentProviders?.includes("invoice") && !features.invoicePaymentEnabled) {
    return { feature: "invoicePaymentEnabled", friendlyName: "Invoice Payment", requiredTier: "Starter (€199/month)" };
  }
  if (config.paymentProviders?.includes("manual") && !features.manualPaymentEnabled) {
    return { feature: "manualPaymentEnabled", friendlyName: "Manual Payment", requiredTier: "Starter (€199/month)" };
  }

  // Check multi-language
  if (config.defaultLanguage && config.defaultLanguage !== "en" && !features.multiLanguageEnabled) {
    return { feature: "multiLanguageEnabled", friendlyName: "Multi-Language Support", requiredTier: "Starter (€199/month)" };
  }

  // Check template set overrides
  if (config.templateSetId && !features.templateSetOverridesEnabled) {
    return { feature: "templateSetOverridesEnabled", friendlyName: "Custom Template Sets", requiredTier: "Professional (€399/month)" };
  }

  // Check custom branding
  if (config.customBranding && !features.customBrandingEnabled) {
    return { feature: "customBrandingEnabled", friendlyName: "Custom Branding", requiredTier: "Professional (€399/month)" };
  }

  // Check Stripe Tax
  if (config.settings?.stripeTaxEnabled && !features.stripeTaxEnabled) {
    return { feature: "stripeTaxEnabled", friendlyName: "Stripe Tax", requiredTier: "Starter (€199/month)" };
  }

  return null; // All features available
}

/**
 * Create Checkout Tab
 *
 * Two-step process:
 * 1. Select a template (nice UI you created)
 * 2. Configure and preview checkout (editor view)
 */

interface CreateCheckoutTabProps {
  editingInstanceId?: Id<"objects"> | null;
  onSaveComplete: () => void;
  onCancel: () => void;
}

export function CreateCheckoutTab({
  editingInstanceId,
  onSaveComplete,
  onCancel,
}: CreateCheckoutTabProps) {
  const { sessionId } = useAuth();
  const currentOrg = useCurrentOrganization();
  const notification = useNotification();
  const { t } = useNamespaceTranslations("ui.checkout_window");
  const tx = (
    key: string,
    fallback: string,
    params?: Record<string, string | number>
  ): string => {
    const translated = t(key, params);
    return translated === key ? fallback : translated;
  };
  const { showFeatureLockedModal } = useUpgradeModal();

  // Step management
  const [step, setStep] = useState<"template" | "editor">(
    editingInstanceId ? "editor" : "template"
  );
  const [selectedTemplateCode, setSelectedTemplateCode] = useState<string | null>(null);

  // Editor state
  const [checkoutName, setCheckoutName] = useState("");
  const [checkoutDescription, setCheckoutDescription] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<Id<"objects">[]>([]);
  const [publicSlug, setPublicSlug] = useState("");
  const [configuration, setConfiguration] = useState<Record<string, unknown>>({});
  const [selectedThemeId, setSelectedThemeId] = useState<string>("");
  const [themeAccordionOpen, setThemeAccordionOpen] = useState(true);
  const [selectedPaymentProviders, setSelectedPaymentProviders] = useState<string[]>([]);
  const [forceB2B, setForceB2B] = useState(false);
  const [defaultLanguage, setDefaultLanguage] = useState<string>("en");

  // Template Set Selection (replaces individual template selections)
  const [templateSetId, setTemplateSetId] = useState<Id<"objects"> | undefined>(undefined);

  // Email Template selections (internal notifications only)
  const [salesNotificationEmailTemplateId, setSalesNotificationEmailTemplateId] = useState<Id<"objects"> | undefined>(undefined);
  const [salesNotificationRecipientEmail, setSalesNotificationRecipientEmail] = useState<string | undefined>(undefined);

  // DEPRECATED: Legacy template code system (keep for backward compatibility during migration)
  const [selectedPdfTemplate, setSelectedPdfTemplate] = useState<
    "invoice_b2c_receipt_v1" | "invoice_b2b_single_v1" | "invoice_b2b_consolidated_v1" | "invoice_b2b_consolidated_detailed_v1"
  >("invoice_b2c_receipt_v1");

  // Fetch available templates
  const availableTemplates = useQuery(
    api.checkoutTemplateAvailability.getAvailableCheckoutTemplates,
    sessionId && currentOrg?.id
      ? {
          sessionId,
          organizationId: currentOrg.id as Id<"organizations">,
        }
      : "skip"
  );

  // Fetch products for linking (WITH their linked forms)
  // Show ALL products (active, draft, etc.) - let user decide what to link
  const products = useQuery(
    api.productOntology.getProductsWithForms,
    sessionId && currentOrg?.id
      ? {
          sessionId,
          organizationId: currentOrg.id as Id<"organizations">,
          // Don't filter by status - show all products
        }
      : "skip"
  );

  // Fetch all system themes (themes are available to ALL orgs)
  const availableThemes = useQuery(
    api.templateAvailability.getAllSystemThemes,
    sessionId ? { sessionId } : "skip"
  );

  // Fetch organization details (includes payment providers)
  const organization = useQuery(
    api.organizations.getById,
    sessionId && currentOrg?.id
      ? { sessionId, organizationId: currentOrg.id as Id<"organizations"> }
      : "skip"
  );

  // PRE-CHECK: Fetch organization license to check feature access BEFORE mutations
  // This prevents server-side errors by validating features on the frontend
  const organizationLicense = useQuery(
    api.licensing.helpers.getLicense,
    currentOrg?.id
      ? { organizationId: currentOrg.id as Id<"organizations"> }
      : "skip"
  );

  // Check if invoice payment is available (dynamic check based on Invoicing app availability)
  const invoiceAvailability = useQuery(
    api.paymentProviders.invoiceAvailability.checkInvoicePaymentAvailability,
    sessionId && currentOrg?.id
      ? { sessionId, organizationId: currentOrg.id as Id<"organizations"> }
      : "skip"
  );

  // SINGLE SOURCE OF TRUTH: Get organization's enabled payment providers
  // This determines the DEFAULT selection when creating a new checkout
  const orgPaymentSettings = useQuery(
    api.organizationPaymentSettings.getPaymentSettings,
    sessionId && currentOrg?.id
      ? { sessionId, organizationId: currentOrg.id as Id<"organizations"> }
      : "skip"
  );

  // Fetch existing checkout data if editing
  const existingCheckout = useQuery(
    api.checkoutOntology.getCheckoutInstanceById,
    sessionId && editingInstanceId
      ? { sessionId, instanceId: editingInstanceId }
      : "skip"
  );

  // Mutations
  const createCheckout = useMutation(api.checkoutOntology.createCheckoutInstance);
  const updateCheckout = useMutation(api.checkoutOntology.updateCheckoutInstance);

  // Load existing checkout data when editing
  useEffect(() => {
    if (existingCheckout && editingInstanceId) {
      console.log("🔧 [CreateCheckoutTab] Loading existing checkout:", existingCheckout);

      // Extract configuration from customProperties
      const config = existingCheckout.customProperties as Record<string, unknown>;

      // Set all form fields
      setCheckoutName(existingCheckout.name);
      setCheckoutDescription(existingCheckout.description || "");
      setSelectedTemplateCode((config.templateCode as string) || null); // ✅ Load from customProperties, not subtype
      setPublicSlug((config.publicSlug as string) || "");
      setSelectedProducts((config.linkedProducts as Id<"objects">[]) || []);
      setSelectedPaymentProviders((config.paymentProviders as string[]) || []);
      setForceB2B((config.forceB2B as boolean) || false);
      setDefaultLanguage((config.defaultLanguage as string) || "en");

      // Load template set ID (new unified system)
      setTemplateSetId((config.templateSetId as Id<"objects">) || undefined);

      // Load internal email template IDs
      setSalesNotificationEmailTemplateId((config.salesNotificationEmailTemplateId as Id<"objects">) || undefined);
      setSalesNotificationRecipientEmail((config.salesNotificationRecipientEmail as string) || undefined);

      // Load legacy template code for backward compatibility
      setSelectedPdfTemplate(
        (config.pdfTemplateCode as typeof selectedPdfTemplate) || "invoice_b2c_receipt_v1"
      );

      // Load theme CODE from config, then find the database theme ID for UI display
      const savedThemeCode = (config.themeCode as string) || "";
      if (savedThemeCode && availableThemes) {
        const themeObj = availableThemes.find((themeItem: any) =>
          (themeItem.customProperties as Record<string, unknown>)?.code === savedThemeCode
        );
        if (themeObj) {
          setSelectedThemeId(themeObj._id);
        }
      }

      // Set configuration (everything except our managed fields)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { linkedProducts, publicSlug, paymentProviders, themeCode, ...restConfig } = config;
      setConfiguration(restConfig);

      console.log("✅ [CreateCheckoutTab] Loaded configuration:", {
        name: existingCheckout.name,
        template: existingCheckout.subtype,
        themeCode: config.themeCode,
        products: (config.linkedProducts as Id<"objects">[])?.length || 0,
        providers: (config.paymentProviders as string[])?.length || 0,
      });
    }
  }, [existingCheckout, editingInstanceId, availableThemes]);

  // Load default configuration when template is selected (only for new checkouts)
  useEffect(() => {
    if (selectedTemplateCode && !editingInstanceId) {
      const schema = getCheckoutSchema(selectedTemplateCode);
      if (schema?.defaultConfig) {
        setConfiguration(schema.defaultConfig);
      }
    }
  }, [selectedTemplateCode, editingInstanceId]);

  // SINGLE SOURCE OF TRUTH: Default payment providers from organization settings
  // When creating a new checkout, auto-select the org's enabled providers
  useEffect(() => {
    if (
      !editingInstanceId && // Only for new checkouts
      orgPaymentSettings?.enabledPaymentProviders &&
      orgPaymentSettings.enabledPaymentProviders.length > 0 &&
      selectedPaymentProviders.length === 0 // Only if not already selected
    ) {
      console.log("💳 [CreateCheckout] Setting default payment providers from org settings:", orgPaymentSettings.enabledPaymentProviders);
      setSelectedPaymentProviders(orgPaymentSettings.enabledPaymentProviders);
    }
  }, [editingInstanceId, orgPaymentSettings, selectedPaymentProviders.length]);

  // Auto-generate slug from checkout name (always updates slug)
  const handleNameChange = (value: string) => {
    setCheckoutName(value);
    // Always auto-generate slug from name
    const autoSlug = formatSlug(value);
    setPublicSlug(autoSlug);
  };

  // Format slug: convert spaces to hyphens, remove invalid chars
  const formatSlug = (value: string): string => {
    return value
      .toLowerCase()
      .replace(/\s+/g, "-") // Replace spaces with hyphens
      .replace(/[^a-z0-9-]/g, "") // Remove invalid characters (keep hyphens)
      .replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
      .replace(/^-|-$/g, ""); // Remove leading/trailing hyphens
  };

  // Handle manual slug input with auto-formatting
  const handleSlugChange = (value: string) => {
    const formattedSlug = formatSlug(value);
    setPublicSlug(formattedSlug);
  };

  // Handle template selection
  const handleSelectTemplate = (templateCode: string) => {
    setSelectedTemplateCode(templateCode);
    setStep("editor");
  };

  // Handle save
  const handleSave = async () => {
    if (!sessionId || !currentOrg || !selectedTemplateCode) return;

    // Get theme CODE from selected theme ID
    const selectedTheme = availableThemes?.find(
      (themeItem: any) => themeItem._id === selectedThemeId
    );
    const themeCode = (selectedTheme?.customProperties as Record<string, unknown>)?.code as string || "";

    // PRE-CHECK: Validate feature access BEFORE calling mutation
    // This prevents server-side errors and provides a better user experience
    const checkoutConfig = {
      paymentProviders: selectedPaymentProviders,
      defaultLanguage,
      templateSetId,
      customBranding: configuration.customBranding,
      settings: configuration.settings as { stripeTaxEnabled?: boolean } | undefined,
    };

    const missingFeature = getRequiredFeatureForCheckout(checkoutConfig, organizationLicense);
    if (missingFeature) {
      // Show upgrade modal proactively - no server error will be thrown
      showFeatureLockedModal(
        missingFeature.friendlyName,
        `This checkout configuration requires ${missingFeature.friendlyName}, which is available on ${missingFeature.requiredTier}. Upgrade your plan to unlock this feature.`,
        missingFeature.requiredTier
      );
      return; // Don't call mutation - user needs to upgrade first
    }

    try {
      if (editingInstanceId) {
        // Update existing
        await updateCheckout({
          sessionId,
          instanceId: editingInstanceId,
          name: checkoutName,
          description: checkoutDescription,
          configuration: {
            ...configuration,
            linkedProducts: selectedProducts,
            publicSlug,
            paymentProviders: selectedPaymentProviders,
            themeCode, // Save theme CODE, not ID
            forceB2B, // Save Force B2B setting
            defaultLanguage, // Save default language

            // NEW: Template Set ID (replaces individual template IDs)
            templateSetId, // Template set containing ticket, invoice, and email templates

            // Internal Email Template IDs (not part of customer-facing template set)
            salesNotificationEmailTemplateId, // Internal sales team notification
            salesNotificationRecipientEmail, // Email to receive sales notifications

            // DEPRECATED: Legacy template code (keep for backward compatibility)
            pdfTemplateCode: selectedPdfTemplate,
          },
        });
      } else {
        // Create new
        await createCheckout({
          sessionId,
          organizationId: currentOrg.id as Id<"organizations">,
          templateCode: selectedTemplateCode,
          name: checkoutName,
          description: checkoutDescription,
          configuration: {
            ...configuration,
            linkedProducts: selectedProducts,
            publicSlug,
            paymentProviders: selectedPaymentProviders,
            themeCode, // Save theme CODE, not ID
            forceB2B, // Save Force B2B setting
            defaultLanguage, // Save default language

            // NEW: Template Set ID (replaces individual template IDs)
            templateSetId, // Template set containing ticket, invoice, and email templates

            // Internal Email Template IDs (not part of customer-facing template set)
            salesNotificationEmailTemplateId, // Internal sales team notification
            salesNotificationRecipientEmail, // Email to receive sales notifications

            // DEPRECATED: Legacy template code (keep for backward compatibility)
            pdfTemplateCode: selectedPdfTemplate,
          },
        });
      }

      const successTitle = editingInstanceId
        ? tx(
            "ui.checkout_window.create.notifications.updated_title",
            "Checkout Updated"
          )
        : tx(
            "ui.checkout_window.create.notifications.created_title",
            "Checkout Created"
          );
      const successMessage = editingInstanceId
        ? tx(
            "ui.checkout_window.create.notifications.updated_message",
            "Your changes have been saved successfully."
          )
        : tx(
            "ui.checkout_window.create.notifications.created_message",
            "Your new checkout has been created successfully."
          );
      notification.success(successTitle, successMessage);
      onSaveComplete();
    } catch (error) {
      // FALLBACK: Handle any errors that slip through the pre-check
      // This can happen if the license changes between frontend check and backend execution
      console.error("Failed to save checkout:", error);

      // Check if this is a tier/licensing error (fallback for edge cases)
      const tierError = parseLimitError(error);
      if (tierError) {
        showFeatureLockedModal(
          "Checkout Configuration",
          "This checkout configuration requires features from a higher tier. Upgrade your plan to unlock advanced payment options, multi-language support, and more.",
          tierError.upgradeTier
        );
        return;
      }

      // Generic error handling for non-tier errors
      const errorTitle = tx(
        "ui.checkout_window.create.notifications.save_failed_title",
        "Save Failed"
      );
      const errorMessage = tx(
        "ui.checkout_window.create.notifications.save_failed_message",
        "Could not save checkout. Please check your configuration and try again."
      );
      notification.error(errorTitle, errorMessage);
    }
  };

  // Transform products for preview (must be before early returns)
  const linkedProductsForPreview: CheckoutProduct[] = React.useMemo(() => {
    if (!products) return [];
    return selectedProducts
      .map((productId) => {
        const product = products.find((candidateProduct: any) => candidateProduct._id === productId);
        if (!product) return null;

        const props = (product.customProperties || {}) as CheckoutProduct["customProperties"];
        const checkoutProduct: CheckoutProduct = {
          _id: product._id as string,
          name: product.name,
          description: product.description || "",
          price: props?.price || 0,
          currency: props?.currency || "eur",
          customProperties: props,
        };
        return checkoutProduct;
      })
      .filter((p) => p !== null) as CheckoutProduct[];
  }, [products, selectedProducts]);

  // Combine static payment providers (Stripe) with dynamic invoice availability (must be before early returns)
  const availablePaymentProviders = React.useMemo(() => {
    const providers = [];

    // Add Stripe and other stored providers
    if (organization?.paymentProviders) {
      providers.push(...organization.paymentProviders);
    }

    // Dynamically add invoice provider if Invoicing app is enabled
    if (invoiceAvailability?.available) {
      providers.push({
        providerCode: "invoice",
        accountId: "invoice-system",
        status: "active" as const,
        isDefault: false,
        isTestMode: false,
        connectedAt: Date.now(),
      });
    }

    return providers;
  }, [organization?.paymentProviders, invoiceAvailability?.available]);

  if (!sessionId || !currentOrg) {
    return (
      <div className="p-4">
        <div className="border-2 p-4" style={{ borderColor: 'var(--error)', background: 'rgba(239, 68, 68, 0.1)' }}>
          <div className="flex items-start gap-2">
            <AlertCircle size={20} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--error)' }} />
            <div>
              <h4 className="font-bold text-sm" style={{ color: 'var(--error)' }}>
                {tx(
                  "ui.checkout_window.error.auth_required_title",
                  "Authentication Required"
                )}
              </h4>
              <p className="text-xs mt-1" style={{ color: 'var(--error)' }}>
                {tx(
                  "ui.checkout_window.create.error.auth_required",
                  "Please log in to create checkouts."
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Step 1: Template Selection
  if (step === "template") {
    if (availableTemplates === undefined) {
      return (
        <div className="flex items-center justify-center p-8">
          <Loader2 size={32} className="animate-spin" style={{ color: 'var(--shell-accent)' }} />
        </div>
      );
    }

    return (
      <div className="p-4">
        {/* Header */}
        <div className="mb-4">
          <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--shell-text)' }}>
            <ShoppingCart size={16} />
            {tx(
              "ui.checkout_window.create.select_template_title",
              "Select Checkout Template"
            )}
          </h3>
          <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
            {tx(
              "ui.checkout_window.create.select_template_description",
              "Choose a template to get started"
            )}
          </p>
        </div>

        {/* Templates Grid */}
        {availableTemplates.length === 0 ? (
          <div className="border-2 p-8 text-center" style={{ borderColor: 'var(--shell-border)', background: 'var(--shell-surface)' }}>
            <h4 className="font-bold text-sm mb-2" style={{ color: 'var(--shell-text)' }}>
              {tx(
                "ui.checkout_window.create.no_templates_title",
                "No Templates Available"
              )}
            </h4>
            <p className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
              {tx(
                "ui.checkout_window.create.no_templates_description",
                "Contact your administrator to enable checkout templates."
              )}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableTemplates.map((template: any) => {
              const props = template.customProperties as Record<string, unknown>;
              const features = props.features as string[] || [];
              const complexity = props.complexity as string || "intermediate";
              const comingSoon = props.comingSoon as boolean;

              // ✅ READ FORM SUPPORT FROM DATABASE (source of truth), not TypeScript schema
              const supportsFormIntegration = props.supportsFormIntegration as boolean || false;

              const getComplexityColor = (c: string) => {
                switch (c) {
                  case "beginner": return { bg: "var(--success)", text: "var(--shell-titlebar-text)" };
                  case "intermediate": return { bg: "#F59E0B", text: "var(--shell-titlebar-text)" };
                  case "advanced": return { bg: "var(--error)", text: "var(--shell-titlebar-text)" };
                  default: return { bg: "var(--neutral-gray)", text: "var(--shell-titlebar-text)" };
                }
              };

              const complexityColor = getComplexityColor(complexity);

              return (
                <div
                  key={template._id}
                  className="border-2 p-4 hover:shadow-lg transition-all"
                  style={{
                    borderColor: 'var(--shell-border)',
                    background: 'var(--shell-surface-elevated)',
                    opacity: comingSoon ? 0.7 : 1
                  }}
                >
                  {/* Header */}
                  <div className="flex items-start gap-3 mb-3">
                    <FileText size={28} style={{ color: "var(--shell-accent)" }} />
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-bold text-sm leading-tight" style={{ color: 'var(--shell-text)' }}>{template.name}</h4>
                        <span
                          className="text-xs px-2 py-0.5 rounded whitespace-nowrap"
                          style={{
                            backgroundColor: complexityColor.bg,
                            color: complexityColor.text,
                          }}
                        >
                          {tx(
                            `ui.checkout_window.templates.complexity.${complexity}`,
                            complexity
                          )}
                        </span>
                      </div>

                      {/* Badges Row */}
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {/* Form Compatibility Badge */}
                        <span
                          className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded whitespace-nowrap"
                          style={{
                            backgroundColor: supportsFormIntegration ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                            color: supportsFormIntegration ? "var(--success)" : "var(--error)",
                            border: `1px solid ${supportsFormIntegration ? "var(--success)" : "var(--error)"}`,
                          }}
                          title={
                            supportsFormIntegration
                              ? tx(
                                  "ui.checkout_window.templates.tooltip.form_supports",
                                  "This template supports form integration during checkout"
                                )
                              : tx(
                                  "ui.checkout_window.templates.tooltip.form_not_supports",
                                  "This template does not support form integration"
                                )
                          }
                        >
                          {supportsFormIntegration ? <Check size={12} /> : <X size={12} />}
                          {supportsFormIntegration
                            ? tx(
                                "ui.checkout_window.templates.badge.form_compatible",
                                "Form Compatible"
                              )
                            : tx(
                                "ui.checkout_window.templates.badge.form_incompatible",
                                "Form Incompatible"
                              )}
                        </span>

                        {/* Coming Soon Badge */}
                        {comingSoon && (
                          <span className="inline-block text-xs px-2 py-0.5 rounded border" style={{
                            background: 'rgba(245, 158, 11, 0.1)',
                            color: '#F59E0B',
                            borderColor: '#F59E0B'
                          }}>
                            {tx(
                              "ui.checkout_window.templates.badge.coming_soon",
                              "Coming Soon"
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs mb-3" style={{ color: 'var(--neutral-gray)' }}>{template.description}</p>

                  {/* Features Preview */}
                  {features.length > 0 && (
                    <ul className="text-xs space-y-1 mb-3" style={{ color: 'var(--neutral-gray)' }}>
                      {features.slice(0, 3).map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-1">
                          <span style={{ color: 'var(--shell-accent)' }}>•</span>
                          <span>{feature}</span>
                        </li>
                      ))}
                      {features.length > 3 && (
                        <li className="italic" style={{ color: 'var(--shell-border)' }}>+{features.length - 3} more...</li>
                      )}
                    </ul>
                  )}

                  {/* Action */}
                  <button
                    onClick={() => !comingSoon && handleSelectTemplate(props.code as string)}
                    disabled={comingSoon}
                    className="w-full px-3 py-2 text-xs font-bold border-2 transition-colors"
                    style={{
                      borderColor: comingSoon ? 'var(--shell-border)' : 'var(--shell-accent)',
                      background: comingSoon ? 'var(--shell-surface)' : 'var(--shell-accent)',
                      color: comingSoon ? 'var(--neutral-gray)' : 'var(--shell-titlebar-text)',
                      cursor: comingSoon ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {comingSoon
                      ? tx(
                          "ui.checkout_window.templates.badge.coming_soon",
                          "Coming Soon"
                        )
                      : tx(
                          "ui.checkout_window.templates.actions.use_template",
                          "Use This Template"
                        )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Step 2: Editor View with Live Preview
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b-2 flex items-center justify-between" style={{ borderColor: 'var(--shell-border)', background: 'var(--shell-surface-elevated)' }}>
        <div className="flex items-center gap-3">
          {!editingInstanceId && (
            <button
              onClick={() => setStep("template")}
              className="p-1.5 transition-colors"
              style={{ background: 'transparent' }}
              title={tx(
                "ui.checkout_window.create.back_to_templates",
                "Back to templates"
              )}
            >
              <ArrowLeft size={16} style={{ color: 'var(--shell-text)' }} />
            </button>
          )}
          <div>
            <h3 className="text-sm font-bold" style={{ color: 'var(--shell-text)' }}>
              {editingInstanceId
                ? tx("ui.checkout_window.create.edit_title", "Edit Checkout")
                : tx(
                    "ui.checkout_window.create.configure_title",
                    "Configure Checkout"
                  )}
            </h3>
            <p className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
              {tx(
                "ui.checkout_window.create.template_label",
                `Template: ${selectedTemplateCode || "None"}`,
                { template: selectedTemplateCode || "None" }
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-2 text-xs font-bold border-2 transition-colors"
            style={{
              borderColor: 'var(--shell-border)',
              background: 'var(--shell-surface-elevated)',
              color: 'var(--shell-text)'
            }}
          >
            {tx("ui.checkout_window.create.cancel_button", "Cancel")}
          </button>
          <button
            onClick={handleSave}
            disabled={!checkoutName.trim() || !selectedTemplateCode || selectedPaymentProviders.length === 0}
            className="px-3 py-2 text-xs font-bold border-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              borderColor: 'var(--shell-accent)',
              background: 'var(--shell-accent)',
              color: 'var(--shell-titlebar-text)'
            }}
          >
            {editingInstanceId
              ? tx("ui.checkout_window.create.save_button", "Save Changes")
              : tx("ui.checkout_window.create.create_button", "Create Checkout")}
          </button>
        </div>
      </div>

      {/* Editor Content: 40% Form / 60% Preview */}
      <div className="flex-1 overflow-hidden flex">
        {/* LEFT: Configuration Form (40%) */}
        <div className="w-[40%] p-4 overflow-y-auto border-r-2" style={{ borderColor: 'var(--shell-border)' }}>
          <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--shell-text)' }}>
            <FileText size={16} />
            {tx("ui.checkout_window.create.configuration_title", "Configuration")}
          </h3>

          {/* Basic Info */}
          <div className="mb-4">
            <label className="block text-xs font-bold mb-1" style={{ color: 'var(--shell-text)' }}>
              {tx("ui.checkout_window.create.name_label", "Checkout Name")}{" "}
              <span style={{ color: 'var(--error)' }}>*</span>
            </label>
            <input
              type="text"
              value={checkoutName}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder={tx(
                "ui.checkout_window.create.name_placeholder",
                "e.g., Event Ticket Sales"
              )}
              className="retro-input w-full px-2 py-1.5 text-sm"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-xs font-bold mb-1" style={{ color: 'var(--shell-text)' }}>
              {tx(
                "ui.checkout_window.create.description_label",
                "Description (Optional)"
              )}
            </label>
            <textarea
              value={checkoutDescription}
              onChange={(e) => setCheckoutDescription(e.target.value)}
              placeholder={tx(
                "ui.checkout_window.create.description_placeholder",
                "Internal description for your team..."
              )}
              rows={3}
              className="retro-input w-full px-2 py-1.5 text-sm resize-none"
            />
          </div>

          <div className="mb-4">
            <label className="block text-xs font-bold mb-1" style={{ color: 'var(--shell-text)' }}>
              {tx("ui.checkout_window.create.slug_label", "Public URL Slug")}{" "}
              <span style={{ color: 'var(--error)' }}>*</span>
            </label>
            <input
              type="text"
              value={publicSlug}
              onChange={(e) => handleSlugChange(e.target.value)}
              placeholder={tx(
                "ui.checkout_window.create.slug_placeholder",
                "e.g., vip-tickets-2024"
              )}
              className="retro-input w-full px-2 py-1.5 text-sm"
              required
              pattern="[a-z0-9-]+"
              title={tx(
                "ui.checkout_window.create.slug_help",
                "Type any text - spaces and special chars will be auto-converted"
              )}
            />
            <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
              {tx("ui.checkout_window.create.url_label", "URL:")}{" "}
              {process.env.NEXT_PUBLIC_APP_URL ||
                tx(
                  "ui.checkout_window.create.url_default_app",
                  "http://localhost:3000"
                )}
              {tx("ui.checkout_window.create.url_checkout_path", "/checkout/")}
              {currentOrg?.slug ||
                tx("ui.checkout_window.create.url_default_org", "your-org")}
              /
              {publicSlug ||
                tx("ui.checkout_window.create.url_default_slug", "checkout-slug")}
            </p>
          </div>

          {/* Force B2B Setting */}
          <div className="mb-4 border-t-2 pt-4" style={{ borderColor: 'var(--shell-border)' }}>
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={forceB2B}
                onChange={(e) => setForceB2B(e.target.checked)}
                className="mt-1 cursor-pointer"
                style={{ width: "18px", height: "18px" }}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Building2 size={14} style={{ color: 'var(--shell-text)' }} />
                  <span className="text-xs font-bold" style={{ color: 'var(--shell-text)' }}>
                    {tx(
                      "ui.checkout_window.create.force_b2b_label",
                      "Require Organization Info (Force B2B)"
                    )}
                  </span>
                </div>
                <p className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
                  {tx(
                    "ui.checkout_window.create.force_b2b_description",
                    "When enabled, customers must provide company/organization details (company name, VAT number, billing address). Use this for employer-invoiced events or B2B-only products."
                  )}
                </p>
                {forceB2B && (
                  <div className="mt-2 p-2 rounded" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                    <p className="text-xs font-bold" style={{ color: 'var(--shell-accent)' }}>
                      {tx(
                        "ui.checkout_window.create.force_b2b_notice",
                        "Organization info will be required for all purchases"
                      )}
                    </p>
                  </div>
                )}
              </div>
            </label>
          </div>

          {/* Default Language Selection */}
          <div className="mb-4 border-t-2 pt-4" style={{ borderColor: 'var(--shell-border)' }}>
            <label className="block text-xs font-bold mb-2" style={{ color: 'var(--shell-text)' }}>
              {tx("ui.checkout_window.create.language_label", "Default Language")}
            </label>
            <p className="text-xs mb-3" style={{ color: 'var(--neutral-gray)' }}>
              {tx(
                "ui.checkout_window.create.language_description",
                "Set the default language for this checkout. Customers will see the checkout in this language initially."
              )}
            </p>
            <select
              value={defaultLanguage}
              onChange={(e) => setDefaultLanguage(e.target.value)}
              className="retro-input w-full px-2 py-1.5 text-sm"
            >
              <option value="en">
                {tx("ui.checkout_window.create.language.en", "English")}
              </option>
              <option value="de">
                {tx("ui.checkout_window.create.language.de", "German (Deutsch)")}
              </option>
              <option value="pl">
                {tx("ui.checkout_window.create.language.pl", "Polish (Polski)")}
              </option>
              <option value="es">
                {tx(
                  "ui.checkout_window.create.language.es",
                  "Spanish (Espanol)"
                )}
              </option>
              <option value="fr">
                {tx(
                  "ui.checkout_window.create.language.fr",
                  "French (Francais)"
                )}
              </option>
              <option value="ja">
                {tx("ui.checkout_window.create.language.ja", "Japanese")}
              </option>
            </select>
          </div>

          {/* Template Set Selection */}
          <div className="mb-4 border-t-2 pt-4" style={{ borderColor: 'var(--shell-border)' }}>
            <h4 className="text-xs font-bold mb-3" style={{ color: 'var(--shell-text)' }}>
              {tx(
                "ui.checkout_window.create.branding_templates_title",
                "Branding Templates"
              )}
            </h4>
            <p className="text-xs mb-4" style={{ color: 'var(--neutral-gray)' }}>
              {tx(
                "ui.checkout_window.create.branding_templates_description",
                "Choose a template set for consistent branding across tickets, invoices, and emails."
              )}
            </p>

            {/* Template Set Selector */}
            <TemplateSetSelector
              organizationId={currentOrg?.id as Id<"organizations">}
              value={templateSetId}
              onChange={(id) => setTemplateSetId(id || undefined)}
              label={tx(
                "ui.checkout_window.create.template_set_label",
                "Template Set"
              )}
              description={tx(
                "ui.checkout_window.create.template_set_description",
                "Bundles ticket, invoice, and email templates for consistent customer experience."
              )}
              required={false}
              allowNull={true}
              nullLabel={tx(
                "ui.checkout_window.create.template_set_use_org_default",
                "Use organization default"
              )}
              showDetails={true}
            />

            <div className="mt-3 p-3 rounded text-xs" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: 'var(--shell-accent)' }}>
              <div className="font-bold mb-1">
                {tx(
                  "ui.checkout_window.create.template_set_how_it_works",
                  "How Template Sets Work:"
                )}
              </div>
              <ul className="space-y-1 ml-4">
                <li>
                  •{" "}
                  <strong>
                    {tx(
                      "ui.checkout_window.create.template_set_unified_branding",
                      "Unified Branding"
                    )}
                  </strong>
                  {tx(
                    "ui.checkout_window.create.template_set_unified_branding_description",
                    ": One set = consistent look across all customer touchpoints"
                  )}
                </li>
                <li>
                  •{" "}
                  <strong>
                    {tx(
                      "ui.checkout_window.create.template_set_precedence",
                      "Precedence"
                    )}
                  </strong>
                  {tx(
                    "ui.checkout_window.create.template_set_precedence_description",
                    ": Product templates can override checkout-level settings"
                  )}
                </li>
                <li>
                  •{" "}
                  <strong>
                    {tx(
                      "ui.checkout_window.create.template_set_fallback",
                      "Fallback"
                    )}
                  </strong>
                  {tx(
                    "ui.checkout_window.create.template_set_fallback_description",
                    ": Uses organization default if not specified"
                  )}
                </li>
              </ul>
            </div>
          </div>

          {/* Email Template Selection - Internal Only */}
          <div className="mb-4 border-t-2 pt-4" style={{ borderColor: 'var(--shell-border)' }}>
            <h4 className="text-xs font-bold mb-3" style={{ color: 'var(--shell-text)' }}>
              {tx(
                "ui.checkout_window.create.internal_notifications_title",
                "Internal Notifications"
              )}
            </h4>
            <p className="text-xs mb-4" style={{ color: 'var(--neutral-gray)' }}>
              {tx(
                "ui.checkout_window.create.internal_notifications_description",
                "Configure internal email notifications for your team (separate from customer emails)."
              )}
            </p>

            {/* Internal Sales Notification Email */}
            <TemplateSelector
              category="internal"
              value={salesNotificationEmailTemplateId}
              onChange={(id) => setSalesNotificationEmailTemplateId(id || undefined)}
              label={tx(
                "ui.checkout_window.create.internal_sales_notification_template_label",
                "Internal Sales Notification Template"
              )}
              description={tx(
                "ui.checkout_window.create.internal_sales_notification_template_description",
                "Email template for sales team notifications when a new order is placed."
              )}
              organizationId={currentOrg?.id as Id<"organizations">}
              required={false}
              allowNull={true}
              nullLabel={tx(
                "ui.checkout_window.create.internal_sales_notification_template_default",
                "Use system default (Sales Notification)"
              )}
            />

            {/* Sales Notification Recipient Email */}
            <EmailSelector
              value={salesNotificationRecipientEmail}
              onChange={(email) => setSalesNotificationRecipientEmail(email)}
              organizationId={currentOrg?.id as Id<"organizations">}
              sessionId={sessionId}
              label={tx(
                "ui.checkout_window.create.sales_notification_recipient_label",
                "Sales Notification Recipient"
              )}
              description={tx(
                "ui.checkout_window.create.sales_notification_recipient_description",
                "Email address to receive sales notifications. Select from your organization emails or enter a custom address."
              )}
              required={false}
              defaultEmail="support@sevenlayers.io"
            />

            <div className="mt-3 p-3 rounded text-xs" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: 'var(--shell-accent)' }}>
              <div className="font-bold mb-1">
                {tx(
                  "ui.checkout_window.create.email_configuration_title",
                  "Email Configuration:"
                )}
              </div>
              <ul className="space-y-1 ml-4">
                <li>
                  •{" "}
                  <strong>
                    {tx(
                      "ui.checkout_window.create.email_configuration_customer_templates",
                      "Customer Templates"
                    )}
                  </strong>
                  {tx(
                    "ui.checkout_window.create.email_configuration_customer_templates_description",
                    ": Choose Luxury/Minimal/VIP styles for order confirmations"
                  )}
                </li>
                <li>
                  •{" "}
                  <strong>
                    {tx(
                      "ui.checkout_window.create.email_configuration_sales_notifications",
                      "Sales Notifications"
                    )}
                  </strong>
                  {tx(
                    "ui.checkout_window.create.email_configuration_sales_notifications_description",
                    ": Internal alerts sent to your team"
                  )}
                </li>
                <li>
                  •{" "}
                  <strong>
                    {tx(
                      "ui.checkout_window.create.email_configuration_recipient_email",
                      "Recipient Email"
                    )}
                  </strong>
                  {tx(
                    "ui.checkout_window.create.email_configuration_recipient_email_description",
                    ": Defaults to support@sevenlayers.io if not configured"
                  )}
                </li>
              </ul>
            </div>
          </div>

          {/* Payment Provider Selection */}
          <div className="mb-4 border-t-2 pt-4" style={{ borderColor: 'var(--shell-border)' }}>
            <label className="block text-xs font-bold mb-2 flex items-center gap-2" style={{ color: 'var(--shell-text)' }}>
              <CreditCard size={14} />
              {tx(
                "ui.checkout_window.create.payment_providers_label",
                "Payment Providers"
              )}{" "}
              <span style={{ color: 'var(--error)' }}>*</span>
            </label>
            <p className="text-xs mb-3" style={{ color: 'var(--neutral-gray)' }}>
              {tx(
                "ui.checkout_window.create.payment_providers_description",
                "Select payment providers to offer during checkout. Customers will choose their preferred method."
              )}
            </p>

            {/* Source of Truth Indicator */}
            {!editingInstanceId && orgPaymentSettings?.enabledPaymentProviders && orgPaymentSettings.enabledPaymentProviders.length > 0 && (
              <div className="mb-3 p-2 rounded text-xs" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                <span className="font-bold" style={{ color: 'var(--success)' }}>
                  {tx(
                    "ui.checkout_window.create.defaulting_org_payment_settings",
                    "Defaulting to organization settings"
                  )}
                </span>
                <span className="ml-1" style={{ color: 'var(--neutral-gray)' }}>
                  {tx(
                    "ui.checkout_window.create.defaulting_org_payment_settings_details",
                    "(configured in Payments → Providers)"
                  )}
                </span>
              </div>
            )}

            {!availablePaymentProviders || availablePaymentProviders.length === 0 ? (
              <div className="border-2 p-4" style={{ borderColor: 'var(--error)', background: 'rgba(239, 68, 68, 0.1)' }}>
                <div className="flex items-start gap-2">
                  <AlertCircle size={20} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--error)' }} />
                  <div>
                    <h4 className="font-bold text-sm mb-1" style={{ color: 'var(--error)' }}>
                      {tx(
                        "ui.checkout_window.create.no_payment_providers_title",
                        "No Payment Providers Connected"
                      )}
                    </h4>
                    <p className="text-xs mb-2" style={{ color: 'var(--error)' }}>
                      {tx(
                        "ui.checkout_window.create.no_payment_providers_description",
                        "You need to connect a payment provider before creating checkouts."
                      )}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--error)' }}>
                      {tx(
                        "ui.checkout_window.create.no_payment_providers_help",
                        "Go to Payments → Stripe Connect to connect a payment provider."
                      )}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {availablePaymentProviders.map((provider) => {
                    const isSelected = selectedPaymentProviders.includes(provider.providerCode);
                    const isActive = provider.status === "active";

                    return (
                      <button
                        key={provider.providerCode}
                        type="button"
                        onClick={() => {
                          if (!isActive) return;

                          if (isSelected) {
                            // Deselect
                            setSelectedPaymentProviders(
                              selectedPaymentProviders.filter((code) => code !== provider.providerCode)
                            );
                          } else {
                            // Select
                            setSelectedPaymentProviders([
                              ...selectedPaymentProviders,
                              provider.providerCode,
                            ]);
                          }
                        }}
                        disabled={!isActive}
                        className="w-full border-2 p-3 text-left transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                          borderColor: isSelected ? 'var(--shell-accent)' : 'var(--shell-border)',
                          backgroundColor: isSelected ? 'rgba(107, 70, 193, 0.1)' : 'var(--shell-surface-elevated)',
                          borderWidth: isSelected ? '3px' : '2px',
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="font-bold text-sm" style={{ color: 'var(--shell-text)' }}>
                                {provider.providerCode === "stripe-connect"
                                  ? tx(
                                      "ui.checkout_window.create.provider_name.stripe_connect",
                                      "Stripe"
                                    )
                                  : provider.providerCode === "invoice"
                                  ? tx(
                                      "ui.checkout_window.create.provider_name.invoice",
                                      "Invoice (Pay Later)"
                                    )
                                  : provider.providerCode.replace("-", " ")}
                              </div>
                              {provider.providerCode !== "invoice" && (
                                <span
                                  className="text-xs px-2 py-0.5 rounded"
                                  style={{
                                    backgroundColor: provider.isTestMode ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                    color: provider.isTestMode ? '#F59E0B' : 'var(--success)',
                                  }}
                                >
                                  {provider.isTestMode
                                    ? tx(
                                        "ui.checkout_window.create.payment_mode.test",
                                        "Test Mode"
                                      )
                                    : tx(
                                        "ui.checkout_window.create.payment_mode.live",
                                        "Live Mode"
                                      )}
                                </span>
                              )}
                              {provider.isDefault && (
                                <span
                                  className="text-xs px-2 py-0.5 rounded"
                                  style={{
                                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                    color: 'var(--shell-accent)',
                                  }}
                                >
                                  {tx(
                                    "ui.checkout_window.create.payment_mode.default",
                                    "Default"
                                  )}
                                </span>
                              )}
                            </div>
                            <p className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
                              {tx(
                                "ui.checkout_window.create.provider_status_label",
                                "Status:"
                              )}{" "}
                              <span className="font-semibold" style={{ color: isActive ? 'var(--success)' : 'var(--error)' }}>
                                {provider.status}
                              </span>
                            </p>
                            {provider.providerCode !== "invoice" && (
                              <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
                                {tx(
                                  "ui.checkout_window.create.provider_account_label",
                                  "Account:"
                                )}{" "}
                                {provider.accountId.substring(0, 20)}...
                              </p>
                            )}
                            {provider.providerCode === "invoice" && (
                              <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
                                {tx(
                                  "ui.checkout_window.create.provider_invoice_description",
                                  "Customers can choose to receive an invoice and pay later"
                                )}
                              </p>
                            )}
                          </div>
                          {isSelected && (
                            <Check size={20} className="flex-shrink-0" style={{ color: 'var(--shell-accent)' }} />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Selected Count Summary */}
                {selectedPaymentProviders.length > 0 && (
                  <p className="text-xs font-bold mt-2" style={{ color: "var(--success)" }}>
                    {tx(
                      "ui.checkout_window.create.payment_providers_selected_count",
                      `${selectedPaymentProviders.length} payment provider${selectedPaymentProviders.length !== 1 ? "s" : ""} selected`,
                      {
                        count: selectedPaymentProviders.length,
                        suffix: selectedPaymentProviders.length !== 1 ? "s" : "",
                      }
                    )}
                  </p>
                )}

                {selectedPaymentProviders.length > 1 && (
                  <p className="text-xs mt-1 p-2 rounded" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: 'var(--shell-accent)' }}>
                    {tx(
                      "ui.checkout_window.create.multiple_payment_methods_hint",
                      "Customers will choose their preferred payment method during checkout"
                    )}
                  </p>
                )}
              </>
            )}
          </div>

          {/* Theme Selection */}
          <div className="mb-4 border-t-2 pt-4" style={{ borderColor: 'var(--shell-border)' }}>
            <div className="border-2" style={{ borderColor: 'var(--shell-border)' }}>
              {/* Accordion Header */}
              <button
                type="button"
                onClick={() => setThemeAccordionOpen(!themeAccordionOpen)}
                className="w-full px-4 py-3 flex items-center justify-between transition-colors"
                style={{
                  background: 'var(--shell-surface)',
                  color: 'var(--shell-text)'
                }}
              >
                <div className="flex items-center gap-2">
                  <Palette size={16} />
                  <span className="text-sm font-bold">
                    {tx(
                      "ui.checkout_window.create.select_theme_label",
                      "Select Theme"
                    )}{" "}
                    <span style={{ color: 'var(--error)' }}>*</span>
                  </span>
                  {selectedThemeId && availableThemes && (
                    <span className="text-xs px-2 py-0.5 rounded" style={{
                      background: 'var(--shell-accent)',
                      color: 'var(--shell-titlebar-text)'
                    }}>
                      {availableThemes.find((themeItem: any) => themeItem._id === selectedThemeId)?.name}
                    </span>
                  )}
                </div>
                {themeAccordionOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {/* Accordion Content */}
              {themeAccordionOpen && availableThemes && (
                <div className="p-3 space-y-2" style={{ background: 'var(--shell-surface-elevated)' }}>
                  {availableThemes.map((theme: any) => (
                    <button
                      key={theme._id}
                      type="button"
                      onClick={() => setSelectedThemeId(theme._id)}
                      className="w-full border-2 p-3 text-left transition-all hover:shadow-md"
                      style={{
                        borderColor: selectedThemeId === theme._id ? 'var(--shell-accent)' : 'var(--shell-border)',
                        backgroundColor: selectedThemeId === theme._id ? 'rgba(107, 70, 193, 0.1)' : 'var(--shell-surface-elevated)',
                        borderWidth: selectedThemeId === theme._id ? '3px' : '2px',
                      }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="font-bold text-sm mb-1" style={{ color: 'var(--shell-text)' }}>{theme.name}</div>
                          <p className="text-xs mb-1" style={{ color: 'var(--neutral-gray)' }}>
                            {theme.customProperties?.description as string}
                          </p>
                          <code className="text-xs px-1" style={{ background: 'var(--shell-surface)', color: 'var(--shell-text)' }}>
                            {theme.customProperties?.code as string}
                          </code>
                        </div>
                        {selectedThemeId === theme._id && (
                          <Check size={20} className="flex-shrink-0" style={{ color: 'var(--shell-accent)' }} />
                        )}
                      </div>
                      {/* Color palette preview */}
                      <div className="flex gap-1 mt-2">
                        <div
                          className="w-8 h-8 rounded border"
                          style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", borderColor: 'var(--shell-border)' }}
                          title={tx(
                            "ui.checkout_window.create.theme_preview.primary_gradient",
                            "Primary Gradient"
                          )}
                        />
                        <div
                          className="w-8 h-8 rounded border"
                          style={{ background: 'var(--shell-surface-elevated)', borderColor: 'var(--shell-border)' }}
                          title={tx(
                            "ui.checkout_window.create.theme_preview.background",
                            "Background"
                          )}
                        />
                        <div
                          className="w-8 h-8 rounded border"
                          style={{ background: 'var(--shell-text)', borderColor: 'var(--shell-border)' }}
                          title={tx(
                            "ui.checkout_window.create.theme_preview.text",
                            "Text"
                          )}
                        />
                        <div
                          className="w-8 h-8 rounded border"
                          style={{ background: 'var(--shell-surface)', borderColor: 'var(--shell-border)' }}
                          title={tx(
                            "ui.checkout_window.create.theme_preview.secondary",
                            "Secondary"
                          )}
                        />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Linked Products */}
          <div className="mb-4 border-t-2 pt-4" style={{ borderColor: 'var(--shell-border)' }}>
            <label className="block text-xs font-bold mb-2 flex items-center gap-2" style={{ color: 'var(--shell-text)' }}>
              <ShoppingCart size={14} />
              {tx(
                "ui.checkout_window.create.linked_products_label",
                "Linked Products"
              )}
            </label>
            <p className="text-xs mb-3" style={{ color: 'var(--neutral-gray)' }}>
              {tx(
                "ui.checkout_window.create.linked_products_description",
                "Select products to include in this checkout."
              )}
            </p>

            {products === undefined ? (
              <div className="text-xs flex items-center justify-center py-4" style={{ color: 'var(--neutral-gray)' }}>
                <Loader2 size={14} className="animate-spin mr-2" />
                {tx(
                  "ui.checkout_window.create.loading_products",
                  "Loading products..."
                )}
              </div>
            ) : products.length === 0 ? (
              <div className="border-2 p-3" style={{ borderColor: '#F59E0B', background: 'rgba(245, 158, 11, 0.1)' }}>
                <div className="flex items-start gap-2">
                  <AlertCircle size={16} className="flex-shrink-0 mt-0.5" style={{ color: '#F59E0B' }} />
                  <div>
                    <h4 className="font-bold text-xs mb-1" style={{ color: '#F59E0B' }}>
                      {tx(
                        "ui.checkout_window.create.no_active_products_title",
                        "No Active Products"
                      )}
                    </h4>
                    <p className="text-xs mb-2" style={{ color: '#F59E0B' }}>
                      {tx(
                        "ui.checkout_window.create.no_active_products_description",
                        "Only "
                      )}
                      <strong>
                        {tx(
                          "ui.checkout_window.create.no_active_products_status",
                          "active"
                        )}
                      </strong>
                      {tx(
                        "ui.checkout_window.create.no_active_products_description_suffix",
                        " (published) products can be linked to checkouts."
                      )}
                    </p>
                    <p className="text-xs" style={{ color: '#F59E0B' }}>
                      {tx(
                        "ui.checkout_window.create.no_active_products_help",
                        "Create products in the Products window and publish them to make them available here."
                      )}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {products.map((product: any) => {
                  const isSelected = selectedProducts.includes(product._id);
                  const props = (product.customProperties || {}) as CheckoutProduct["customProperties"];
                  const price = props?.price || 0;
                  const currency = props?.currency || "eur";

                  // Check if product has a linked form
                  const hasForm = !!props?.formId;
                  const formTiming = props?.formTiming || "duringCheckout";
                  const formRequired = props?.formRequired ?? true;

                  // ✅ CHECK IF CHECKOUT TEMPLATE SUPPORTS FORMS (from database)
                  const selectedTemplate = availableTemplates?.find((template: any) =>
                    (template.customProperties as Record<string, unknown>)?.code === selectedTemplateCode
                  );
                  const checkoutSupportsForms = (selectedTemplate?.customProperties as Record<string, unknown>)?.supportsFormIntegration as boolean || false;

                  // Determine if this product can be linked to the current template
                  const requiresFormSupport = hasForm && formTiming === "duringCheckout";
                  const canLinkProduct = !requiresFormSupport || checkoutSupportsForms;
                  const isIncompatible = !canLinkProduct;

                  return (
                    <div
                      key={product._id}
                      className="border-2 p-2 flex items-start justify-between"
                      style={{
                        borderColor: isSelected ? 'var(--shell-accent)' : isIncompatible ? 'var(--error)' : 'var(--shell-border)',
                        backgroundColor: isSelected ? 'rgba(107, 70, 193, 0.1)' : isIncompatible ? 'rgba(239, 68, 68, 0.1)' : 'var(--shell-surface-elevated)',
                        opacity: isIncompatible ? 0.7 : 1,
                      }}
                    >
                      <div className="flex-1">
                        <div className="flex items-start gap-2">
                          <div className="flex-1">
                            <div className="font-bold text-xs" style={{ color: 'var(--shell-text)' }}>{product.name}</div>
                            {product.description && (
                              <div className="text-xs" style={{ color: 'var(--neutral-gray)' }}>{product.description}</div>
                            )}
                            <div className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
                              {new Intl.NumberFormat("en-US", {
                                style: "currency",
                                currency: currency.toUpperCase(),
                              }).format(price / 100)}
                            </div>

                            {/* Event & Form Status Badges */}
                            <div className="flex flex-wrap items-center gap-1 mt-2">
                              {/* Event Badge - ALWAYS SHOW */}
                              {(() => {
                                const eventName = props?.eventName || null;
                                const hasEvent = !!eventName;

                                if (hasEvent) {
                                  return (
                                    <span
                                      className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded font-semibold"
                                      style={{
                                        backgroundColor: "#F0FDF4",
                                        color: "#15803D",
                                        border: "1px solid #BBF7D0",
                                      }}
                                      title={tx(
                                        "ui.checkout_window.create.product_badge.linked_event_title",
                                        `Linked to event: ${eventName}`,
                                        { eventName }
                                      )}
                                    >
                                      {eventName}
                                    </span>
                                  );
                                } else {
                                  return (
                                    <span
                                      className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded font-semibold"
                                      style={{
                                        backgroundColor: "#FEE2E2",
                                        color: "#991B1B",
                                        border: "1px solid #FCA5A5",
                                      }}
                                      title={tx(
                                        "ui.checkout_window.create.product_badge.no_event_title",
                                        "This product is not linked to any event"
                                      )}
                                    >
                                      {tx(
                                        "ui.checkout_window.create.product_badge.no_event",
                                        "No Event"
                                      )}
                                    </span>
                                  );
                                }
                              })()}

                              {/* Form Requirement Badge */}
                              {hasForm && (
                                <>
                                  <span
                                    className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded"
                                    style={{
                                      backgroundColor: "#EFF6FF",
                                      color: "#1E40AF",
                                      border: "1px solid #BFDBFE",
                                    }}
                                  >
                                    {tx("ui.checkout_window.create.product_badge.form", "Form")}{" "}
                                    {formRequired
                                      ? tx(
                                          "ui.checkout_window.create.product_badge.form_required",
                                          "Required"
                                        )
                                      : tx(
                                          "ui.checkout_window.create.product_badge.form_optional",
                                          "Optional"
                                        )}
                                  </span>
                                  {formTiming === "duringCheckout" && (
                                    <span
                                      className="text-xs px-2 py-0.5 rounded"
                                      style={{
                                        backgroundColor: "#F0FDF4",
                                        color: "#15803D",
                                        border: "1px solid #BBF7D0",
                                      }}
                                      title={tx(
                                        "ui.checkout_window.create.form_timing.in_checkout_tooltip",
                                        "Form will be collected during checkout"
                                      )}
                                    >
                                      {tx(
                                        "ui.checkout_window.create.form_timing.in_checkout_badge",
                                        "In Checkout"
                                      )}
                                    </span>
                                  )}
                                  {formTiming === "afterPurchase" && (
                                    <span
                                      className="text-xs px-2 py-0.5 rounded"
                                      style={{
                                        backgroundColor: "#FEF3C7",
                                        color: "#92400E",
                                        border: "1px solid #FDE68A",
                                      }}
                                      title={tx(
                                        "ui.checkout_window.create.form_timing.after_purchase_tooltip",
                                        "Form link sent via email after purchase"
                                      )}
                                    >
                                      {tx(
                                        "ui.checkout_window.create.form_timing.after_purchase_badge",
                                        "After Purchase"
                                      )}
                                    </span>
                                  )}
                                </>
                              )}
                            </div>

                            {/* Warning if product is incompatible */}
                            {isIncompatible && (
                              <div className="mt-2 p-2 border rounded" style={{ background: 'rgba(239, 68, 68, 0.1)', borderColor: 'var(--error)' }}>
                                <div className="text-xs font-bold flex items-start gap-1 mb-1" style={{ color: 'var(--error)' }}>
                                  <AlertCircle size={12} className="flex-shrink-0 mt-0.5" />
                                  <span>
                                    {tx(
                                      "ui.checkout_window.create.product_incompatible_title",
                                      "Cannot link to this template"
                                    )}
                                  </span>
                                </div>
                                <div className="text-xs" style={{ color: 'var(--error)' }}>
                                  {tx(
                                    "ui.checkout_window.create.product_incompatible_description",
                                    "This product requires a form during checkout, but the selected template doesn't support form integration."
                                  )}
                                </div>
                                <div className="text-xs mt-1 font-semibold" style={{ color: 'var(--error)' }}>
                                  {tx(
                                    "ui.checkout_window.create.product_incompatible_solutions_title",
                                    "Solutions:"
                                  )}
                                </div>
                                <ul className="text-xs ml-4 mt-1 space-y-0.5" style={{ color: 'var(--error)' }}>
                                  <li>
                                    {tx(
                                      "ui.checkout_window.create.product_incompatible_solution_one",
                                      "• Choose a template with form support"
                                    )}
                                  </li>
                                  <li>
                                    {tx(
                                      "ui.checkout_window.create.product_incompatible_solution_two",
                                      "• Change form timing to \"After Purchase\""
                                    )}
                                  </li>
                                  <li>
                                    {tx(
                                      "ui.checkout_window.create.product_incompatible_solution_three",
                                      "• Remove form requirement"
                                    )}
                                  </li>
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          // Prevent linking incompatible products
                          if (!isSelected && isIncompatible) {
                            return; // Button is disabled via style, but prevent action just in case
                          }

                          if (isSelected) {
                            setSelectedProducts(
                              selectedProducts.filter((id) => id !== product._id)
                            );
                          } else {
                            setSelectedProducts([...selectedProducts, product._id]);
                          }
                        }}
                        disabled={isIncompatible && !isSelected}
                        className="px-2 py-1 text-xs font-bold border-2 transition-colors"
                        style={{
                          borderColor: isIncompatible && !isSelected ? 'var(--error)' : isSelected ? 'var(--shell-accent)' : 'var(--shell-border)',
                          backgroundColor: isIncompatible && !isSelected ? 'rgba(239, 68, 68, 0.1)' : isSelected ? 'var(--shell-accent)' : 'var(--shell-surface-elevated)',
                          color: isIncompatible && !isSelected ? 'var(--error)' : isSelected ? 'var(--shell-titlebar-text)' : 'var(--shell-text)',
                          cursor: isIncompatible && !isSelected ? 'not-allowed' : 'pointer',
                          opacity: isIncompatible && !isSelected ? 0.6 : 1,
                        }}
                        title={
                          isIncompatible && !isSelected
                            ? tx(
                                "ui.checkout_window.create.product_link_disabled_title",
                                "Cannot link: Product requires form support"
                              )
                            : ""
                        }
                      >
                        {isIncompatible && !isSelected ? tx(
                          "ui.checkout_window.create.product_link_state_incompatible",
                          "Incompatible"
                        ) : isSelected ? (
                          <span className="flex items-center gap-1">
                            <Check size={12} />{" "}
                            {tx(
                              "ui.checkout_window.create.product_link_state_linked",
                              "Linked"
                            )}
                          </span>
                        ) : (
                          tx("ui.checkout_window.create.product_link_state_link", "Link")
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {selectedProducts.length > 0 && (
              <p className="text-xs font-bold mt-2" style={{ color: 'var(--success)' }}>
                {tx(
                  "ui.checkout_window.create.products_selected_count",
                  `${selectedProducts.length} product${selectedProducts.length !== 1 ? "s" : ""} linked`,
                  {
                    count: selectedProducts.length,
                    suffix: selectedProducts.length !== 1 ? "s" : "",
                  }
                )}
              </p>
            )}
          </div>

          {/* Template Configuration (Dynamic based on schema) */}
          {selectedTemplateCode && (() => {
            const schema = getCheckoutSchema(selectedTemplateCode);
            if (schema) {
              return (
                <div className="mb-4 border-t-2 pt-4" style={{ borderColor: 'var(--shell-border)' }}>
                  <h4 className="text-xs font-bold mb-3" style={{ color: 'var(--shell-text)' }}>
                    {tx(
                      "ui.checkout_window.create.template_settings_title",
                      "Template Settings"
                    )}
                  </h4>
                  <div className="text-xs mb-2" style={{ color: 'var(--neutral-gray)' }}>
                    {tx(
                      "ui.checkout_window.create.template_settings_description",
                      `Advanced settings for ${schema.name}`,
                      { template: schema.name }
                    )}
                  </div>
                  {/* TODO: Add DynamicFormGenerator for checkout schema */}
                  <div className="border-2 p-3 text-xs" style={{ borderColor: 'var(--shell-border)', background: 'var(--shell-surface)', color: 'var(--neutral-gray)' }}>
                    {tx(
                      "ui.checkout_window.create.template_settings_placeholder",
                      "Dynamic form fields will be added here based on template schema"
                    )}
                  </div>
                </div>
              );
            }
            return null;
          })()}
        </div>

        {/* RIGHT: Live Preview (60%) */}
        <div className="w-[60%] p-4 overflow-y-auto" style={{ background: 'var(--shell-surface)' }}>
          <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--shell-text)' }}>
            <Eye size={16} />
            {tx("ui.checkout_window.create.preview_title", "Live Preview")}
          </h3>

          {selectedTemplateCode && selectedThemeId && currentOrg ? (
            <div className="border-2 overflow-hidden" style={{ borderColor: 'var(--shell-border)', background: 'var(--shell-surface-elevated)' }}>
              <CheckoutPreview
                templateCode={selectedTemplateCode}
                configuration={configuration}
                linkedProducts={linkedProductsForPreview}
                organizationId={currentOrg.id as Id<"organizations">}
                theme={getTheme(availableThemes?.find((themeItem: any) => themeItem._id === selectedThemeId)?.customProperties?.code as string)}
                paymentProviders={selectedPaymentProviders}
                forceB2B={forceB2B}
              />
            </div>
          ) : (
            <div className="border-2 p-8 text-center" style={{ borderColor: 'var(--shell-border)', background: 'var(--shell-surface-elevated)' }}>
              <ShoppingCart size={64} className="mx-auto mb-4" style={{ color: 'var(--shell-border)' }} />
              <h4 className="font-bold text-sm mb-2" style={{ color: 'var(--shell-text)' }}>
                {!selectedTemplateCode
                  ? tx(
                      "ui.checkout_window.create.preview_no_template",
                      "No Template Selected"
                    )
                  : !selectedThemeId
                  ? tx(
                      "ui.checkout_window.create.preview_no_theme",
                      "No Theme Selected"
                    )
                  : tx(
                      "ui.checkout_window.create.preview_loading",
                      "Preview Loading"
                    )}
              </h4>
              <p className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
                {!selectedTemplateCode
                  ? tx(
                      "ui.checkout_window.create.preview_no_template_description",
                      "Select a template to see a live preview of your checkout."
                    )
                  : !selectedThemeId
                  ? tx(
                      "ui.checkout_window.create.preview_no_theme_description",
                      "Select a theme to see a live preview with styling."
                    )
                  : tx(
                      "ui.checkout_window.create.preview_loading_description",
                      "Select products to preview the checkout."
                    )}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
