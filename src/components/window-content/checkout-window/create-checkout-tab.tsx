"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import { ShoppingCart, ArrowLeft, Loader2, AlertCircle, Eye, FileText, Check, Palette, ChevronDown, ChevronUp, CreditCard } from "lucide-react";
import { Id } from "../../../../convex/_generated/dataModel";
import { CheckoutPreview } from "./checkout-preview";
import { getCheckoutSchema } from "@/templates/checkout/registry";
import { getTheme } from "@/templates/registry";
import type { CheckoutProduct } from "@/templates/checkout/types";
import { useNotification } from "@/hooks/use-notification";

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
  // Only fetch ACTIVE products (ready to be sold in checkout)
  const products = useQuery(
    api.productOntology.getProductsWithForms,
    sessionId && currentOrg?.id
      ? {
          sessionId,
          organizationId: currentOrg.id as Id<"organizations">,
          status: "active", // Only show published/active products
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

      // Load theme CODE from config, then find the database theme ID for UI display
      const savedThemeCode = (config.themeCode as string) || "";
      if (savedThemeCode && availableThemes) {
        const themeObj = availableThemes.find(t =>
          (t.customProperties as Record<string, unknown>)?.code === savedThemeCode
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
    const selectedTheme = availableThemes?.find(t => t._id === selectedThemeId);
    const themeCode = (selectedTheme?.customProperties as Record<string, unknown>)?.code as string || "";

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
          },
        });
      }

      notification.success(
        editingInstanceId ? "Checkout Updated" : "Checkout Created",
        editingInstanceId
          ? "Your changes have been saved successfully."
          : "Your new checkout has been created successfully."
      );
      onSaveComplete();
    } catch (error) {
      console.error("Failed to save checkout:", error);
      notification.error(
        "Save Failed",
        "Could not save checkout. Please check your configuration and try again."
      );
    }
  };

  if (!sessionId || !currentOrg) {
    return (
      <div className="p-4">
        <div className="border-2 border-red-600 bg-red-50 p-4">
          <div className="flex items-start gap-2">
            <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm text-red-900">Authentication Required</h4>
              <p className="text-xs text-red-800 mt-1">
                Please log in to create checkouts.
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
          <Loader2 size={32} className="animate-spin text-purple-600" />
        </div>
      );
    }

    return (
      <div className="p-4">
        {/* Header */}
        <div className="mb-4">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <ShoppingCart size={16} />
            Select Checkout Template
          </h3>
          <p className="text-xs text-gray-600 mt-1">
            Choose a template to get started
          </p>
        </div>

        {/* Templates Grid */}
        {availableTemplates.length === 0 ? (
          <div className="border-2 border-gray-400 bg-gray-50 p-8 text-center">
            <h4 className="font-bold text-sm text-gray-700 mb-2">No Templates Available</h4>
            <p className="text-xs text-gray-600">
              Contact your administrator to enable checkout templates.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableTemplates.map((template) => {
              const props = template.customProperties as Record<string, unknown>;
              const icon = props.icon as string || "📄";
              const features = props.features as string[] || [];
              const complexity = props.complexity as string || "intermediate";
              const comingSoon = props.comingSoon as boolean;

              // ✅ READ FORM SUPPORT FROM DATABASE (source of truth), not TypeScript schema
              const supportsFormIntegration = props.supportsFormIntegration as boolean || false;

              const getComplexityColor = (c: string) => {
                switch (c) {
                  case "beginner": return { bg: "#10B981", text: "white" };
                  case "intermediate": return { bg: "#F59E0B", text: "white" };
                  case "advanced": return { bg: "#EF4444", text: "white" };
                  default: return { bg: "#6B7280", text: "white" };
                }
              };

              const complexityColor = getComplexityColor(complexity);

              return (
                <div
                  key={template._id}
                  className="border-2 border-gray-400 bg-white p-4 hover:shadow-lg transition-all"
                  style={{ opacity: comingSoon ? 0.7 : 1 }}
                >
                  {/* Header */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="text-3xl">{icon}</div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-bold text-sm leading-tight">{template.name}</h4>
                        <span
                          className="text-xs px-2 py-0.5 rounded whitespace-nowrap"
                          style={{
                            backgroundColor: complexityColor.bg,
                            color: complexityColor.text,
                          }}
                        >
                          {complexity}
                        </span>
                      </div>

                      {/* Badges Row */}
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {/* Form Compatibility Badge */}
                        <span
                          className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded whitespace-nowrap"
                          style={{
                            backgroundColor: supportsFormIntegration ? "#D1FAE5" : "#FEE2E2",
                            color: supportsFormIntegration ? "#047857" : "#991B1B",
                            border: `1px solid ${supportsFormIntegration ? "#A7F3D0" : "#FECACA"}`,
                          }}
                          title={supportsFormIntegration ? "This template supports form integration during checkout" : "This template does not support form integration"}
                        >
                          {supportsFormIntegration ? "✓" : "✕"} Form {supportsFormIntegration ? "Compatible" : "Incompatible"}
                        </span>

                        {/* Coming Soon Badge */}
                        {comingSoon && (
                          <span className="inline-block text-xs px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded border border-yellow-300">
                            Coming Soon
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-gray-600 mb-3">{template.description}</p>

                  {/* Features Preview */}
                  {features.length > 0 && (
                    <ul className="text-xs text-gray-600 space-y-1 mb-3">
                      {features.slice(0, 3).map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-1">
                          <span className="text-purple-600">•</span>
                          <span>{feature}</span>
                        </li>
                      ))}
                      {features.length > 3 && (
                        <li className="text-gray-400 italic">+{features.length - 3} more...</li>
                      )}
                    </ul>
                  )}

                  {/* Action */}
                  <button
                    onClick={() => !comingSoon && handleSelectTemplate(props.code as string)}
                    disabled={comingSoon}
                    className={`w-full px-3 py-2 text-xs font-bold border-2 transition-colors ${
                      comingSoon
                        ? "border-gray-400 bg-gray-200 text-gray-500 cursor-not-allowed"
                        : "border-purple-600 bg-purple-600 text-white hover:bg-purple-700"
                    }`}
                  >
                    {comingSoon ? "Coming Soon" : "Use This Template"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Transform products for preview
  const linkedProductsForPreview: CheckoutProduct[] = selectedProducts
    .map((productId) => {
      const product = products?.find((p) => p._id === productId);
      if (!product) return null;

      const checkoutProduct: CheckoutProduct = {
        _id: product._id as string,
        name: product.name,
        description: product.description || "",
        price: (product.customProperties?.price as number) || 0, // ✅ Price is stored in cents in the 'price' field
        currency: (product.customProperties?.currency as string) || "usd",
        customProperties: product.customProperties as CheckoutProduct["customProperties"],
      };
      return checkoutProduct;
    })
    .filter((p) => p !== null) as CheckoutProduct[];

  // Step 2: Editor View with Live Preview
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b-2 border-gray-400 bg-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {!editingInstanceId && (
            <button
              onClick={() => setStep("template")}
              className="p-1.5 hover:bg-gray-200 transition-colors"
              title="Back to templates"
            >
              <ArrowLeft size={16} />
            </button>
          )}
          <div>
            <h3 className="text-sm font-bold">
              {editingInstanceId ? "Edit Checkout" : "Configure Checkout"}
            </h3>
            <p className="text-xs text-gray-600">
              Template: {selectedTemplateCode || "None"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            className="px-3 py-2 text-xs font-bold border-2 border-gray-400 bg-white text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!checkoutName.trim() || !selectedTemplateCode || selectedPaymentProviders.length === 0}
            className="px-3 py-2 text-xs font-bold border-2 border-purple-600 bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {editingInstanceId ? "Save Changes" : "Create Checkout"}
          </button>
        </div>
      </div>

      {/* Editor Content: 40% Form / 60% Preview */}
      <div className="flex-1 overflow-hidden flex">
        {/* LEFT: Configuration Form (40%) */}
        <div className="w-[40%] p-4 overflow-y-auto border-r-2 border-gray-400">
          <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
            <FileText size={16} />
            Configuration
          </h3>

          {/* Basic Info */}
          <div className="mb-4">
            <label className="block text-xs font-bold mb-1">
              Checkout Name <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={checkoutName}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g., Event Ticket Sales"
              className="w-full px-2 py-1.5 text-sm border-2 border-gray-400 focus:border-purple-600 focus:outline-none"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-xs font-bold mb-1">Description (Optional)</label>
            <textarea
              value={checkoutDescription}
              onChange={(e) => setCheckoutDescription(e.target.value)}
              placeholder="Internal description for your team..."
              rows={3}
              className="w-full px-2 py-1.5 text-sm border-2 border-gray-400 focus:border-purple-600 focus:outline-none resize-none"
            />
          </div>

          <div className="mb-4">
            <label className="block text-xs font-bold mb-1">
              Public URL Slug <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={publicSlug}
              onChange={(e) => handleSlugChange(e.target.value)}
              placeholder="e.g., vip-tickets-2024"
              className="w-full px-2 py-1.5 text-sm border-2 border-gray-400 focus:border-purple-600 focus:outline-none"
              required
              pattern="[a-z0-9-]+"
              title="Type any text - spaces and special chars will be auto-converted"
            />
            <p className="text-xs text-gray-500 mt-1">
              URL: {process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/checkout/
              {currentOrg?.slug || "your-org"}/{publicSlug || "checkout-slug"}
            </p>
          </div>

          {/* Payment Provider Selection */}
          <div className="mb-4 border-t-2 border-gray-400 pt-4">
            <label className="block text-xs font-bold mb-2 flex items-center gap-2">
              <CreditCard size={14} />
              Payment Providers <span className="text-red-600">*</span>
            </label>
            <p className="text-xs text-gray-600 mb-3">
              Select payment providers to offer during checkout. Customers will choose their preferred method.
            </p>

            {!organization || !organization.paymentProviders || organization.paymentProviders.length === 0 ? (
              <div className="border-2 border-red-600 bg-red-50 p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-sm text-red-900 mb-1">No Payment Providers Connected</h4>
                    <p className="text-xs text-red-800 mb-2">
                      You need to connect a payment provider before creating checkouts.
                    </p>
                    <p className="text-xs text-red-800">
                      Go to <strong>Payments → Stripe Connect</strong> to connect a payment provider.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {organization.paymentProviders.map((provider) => {
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
                          borderColor: isSelected ? "#6B46C1" : "#D1D5DB",
                          backgroundColor: isSelected ? "#F3E8FF" : "white",
                          borderWidth: isSelected ? "3px" : "2px",
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="font-bold text-sm capitalize">
                                {provider.providerCode.replace("-", " ")}
                              </div>
                              <span
                                className="text-xs px-2 py-0.5 rounded"
                                style={{
                                  backgroundColor: provider.isTestMode ? "#FEF3C7" : "#D1FAE5",
                                  color: provider.isTestMode ? "#92400E" : "#065F46",
                                }}
                              >
                                {provider.isTestMode ? "Test Mode" : "Live Mode"}
                              </span>
                              {provider.isDefault && (
                                <span
                                  className="text-xs px-2 py-0.5 rounded"
                                  style={{
                                    backgroundColor: "#DBEAFE",
                                    color: "#1E40AF",
                                  }}
                                >
                                  Default
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-600">
                              Status: <span className={`font-semibold ${isActive ? "text-green-600" : "text-red-600"}`}>
                                {provider.status}
                              </span>
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Account: {provider.accountId.substring(0, 20)}...
                            </p>
                          </div>
                          {isSelected && (
                            <Check size={20} className="text-purple-600 flex-shrink-0" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Selected Count Summary */}
                {selectedPaymentProviders.length > 0 && (
                  <p className="text-xs font-bold mt-2" style={{ color: "var(--success)" }}>
                    ✓ {selectedPaymentProviders.length} payment provider{selectedPaymentProviders.length !== 1 ? "s" : ""} selected
                  </p>
                )}

                {selectedPaymentProviders.length > 1 && (
                  <p className="text-xs mt-1 p-2 rounded" style={{ backgroundColor: "#EFF6FF", color: "#1E40AF" }}>
                    💡 Customers will choose their preferred payment method during checkout
                  </p>
                )}
              </>
            )}
          </div>

          {/* Theme Selection */}
          <div className="mb-4 border-t-2 border-gray-400 pt-4">
            <div className="border-2 border-gray-400">
              {/* Accordion Header */}
              <button
                type="button"
                onClick={() => setThemeAccordionOpen(!themeAccordionOpen)}
                className="w-full px-4 py-3 flex items-center justify-between bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Palette size={16} />
                  <span className="text-sm font-bold">
                    Select Theme <span className="text-red-600">*</span>
                  </span>
                  {selectedThemeId && availableThemes && (
                    <span className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded">
                      {availableThemes.find(t => t._id === selectedThemeId)?.name}
                    </span>
                  )}
                </div>
                {themeAccordionOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {/* Accordion Content */}
              {themeAccordionOpen && availableThemes && (
                <div className="p-3 bg-white space-y-2">
                  {availableThemes.map((theme) => (
                    <button
                      key={theme._id}
                      type="button"
                      onClick={() => setSelectedThemeId(theme._id)}
                      className="w-full border-2 p-3 text-left transition-all hover:shadow-md"
                      style={{
                        borderColor: selectedThemeId === theme._id ? "#6B46C1" : "#D1D5DB",
                        backgroundColor: selectedThemeId === theme._id ? "#F3E8FF" : "white",
                        borderWidth: selectedThemeId === theme._id ? "3px" : "2px",
                      }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="font-bold text-sm mb-1">{theme.name}</div>
                          <p className="text-xs text-gray-600 mb-1">
                            {theme.customProperties?.description as string}
                          </p>
                          <code className="text-xs bg-gray-100 px-1">
                            {theme.customProperties?.code as string}
                          </code>
                        </div>
                        {selectedThemeId === theme._id && (
                          <Check size={20} className="text-purple-600 flex-shrink-0" />
                        )}
                      </div>
                      {/* Color palette preview */}
                      <div className="flex gap-1 mt-2">
                        <div
                          className="w-8 h-8 rounded border border-gray-300"
                          style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}
                          title="Primary Gradient"
                        />
                        <div className="w-8 h-8 rounded border border-gray-300 bg-white" title="Background" />
                        <div className="w-8 h-8 rounded border border-gray-300 bg-gray-900" title="Text" />
                        <div className="w-8 h-8 rounded border border-gray-300 bg-gray-100" title="Secondary" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Linked Products */}
          <div className="mb-4 border-t-2 border-gray-400 pt-4">
            <label className="block text-xs font-bold mb-2 flex items-center gap-2">
              <ShoppingCart size={14} />
              Linked Products
            </label>
            <p className="text-xs text-gray-600 mb-3">
              Select products to include in this checkout.
            </p>

            {products === undefined ? (
              <div className="text-xs text-gray-500 flex items-center justify-center py-4">
                <Loader2 size={14} className="animate-spin mr-2" />
                Loading products...
              </div>
            ) : products.length === 0 ? (
              <div className="border-2 border-yellow-600 bg-yellow-50 p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle size={16} className="text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-xs text-yellow-900 mb-1">No Active Products</h4>
                    <p className="text-xs text-yellow-800 mb-2">
                      Only <strong>active</strong> (published) products can be linked to checkouts.
                    </p>
                    <p className="text-xs text-yellow-800">
                      Create products in the Products window and publish them to make them available here.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {products.map((product) => {
                  const isSelected = selectedProducts.includes(product._id);
                  const price = (product.customProperties?.price as number) || 0;
                  const currency = (product.customProperties?.currency as string) || "usd";

                  // Check if product has a linked form
                  const hasForm = !!(product.customProperties?.formId);
                  const formTiming = (product.customProperties?.formTiming as string) || "duringCheckout";
                  const formRequired = (product.customProperties?.formRequired as boolean) ?? true;

                  // ✅ CHECK IF CHECKOUT TEMPLATE SUPPORTS FORMS (from database)
                  const selectedTemplate = availableTemplates?.find(t =>
                    (t.customProperties as Record<string, unknown>)?.code === selectedTemplateCode
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
                        borderColor: isSelected ? "#6B46C1" : isIncompatible ? "#EF4444" : "#D1D5DB",
                        backgroundColor: isSelected ? "#F3E8FF" : isIncompatible ? "#FEE2E2" : "white",
                        opacity: isIncompatible ? 0.7 : 1,
                      }}
                    >
                      <div className="flex-1">
                        <div className="flex items-start gap-2">
                          <div className="flex-1">
                            <div className="font-bold text-xs">{product.name}</div>
                            {product.description && (
                              <div className="text-xs text-gray-600">{product.description}</div>
                            )}
                            <div className="text-xs text-gray-600 mt-1">
                              {new Intl.NumberFormat("en-US", {
                                style: "currency",
                                currency: currency.toUpperCase(),
                              }).format(price / 100)}
                            </div>

                            {/* Form Requirement Badge */}
                            {hasForm && (
                              <div className="flex items-center gap-1 mt-2">
                                <span
                                  className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded"
                                  style={{
                                    backgroundColor: "#EFF6FF",
                                    color: "#1E40AF",
                                    border: "1px solid #BFDBFE",
                                  }}
                                >
                                  📋 Form {formRequired ? "Required" : "Optional"}
                                </span>
                                {formTiming === "duringCheckout" && (
                                  <span
                                    className="text-xs px-2 py-0.5 rounded"
                                    style={{
                                      backgroundColor: "#F0FDF4",
                                      color: "#15803D",
                                      border: "1px solid #BBF7D0",
                                    }}
                                    title="Form will be collected during checkout"
                                  >
                                    🛒 In Checkout
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
                                    title="Form link sent via email after purchase"
                                  >
                                    ✉️ After Purchase
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Warning if product is incompatible */}
                            {isIncompatible && (
                              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                                <div className="text-xs text-red-700 font-bold flex items-start gap-1 mb-1">
                                  <AlertCircle size={12} className="flex-shrink-0 mt-0.5" />
                                  <span>Cannot link to this template</span>
                                </div>
                                <div className="text-xs text-red-600">
                                  This product requires a form during checkout, but the selected template doesn&apos;t support form integration.
                                </div>
                                <div className="text-xs text-red-600 mt-1 font-semibold">
                                  Solutions:
                                </div>
                                <ul className="text-xs text-red-600 ml-4 mt-1 space-y-0.5">
                                  <li>• Choose a template with form support</li>
                                  <li>• Change form timing to &quot;After Purchase&quot;</li>
                                  <li>• Remove form requirement</li>
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
                          borderColor: isIncompatible && !isSelected ? "#EF4444" : isSelected ? "#6B46C1" : "#D1D5DB",
                          backgroundColor: isIncompatible && !isSelected ? "#FEE2E2" : isSelected ? "#6B46C1" : "white",
                          color: isIncompatible && !isSelected ? "#991B1B" : isSelected ? "white" : "#374151",
                          cursor: isIncompatible && !isSelected ? "not-allowed" : "pointer",
                          opacity: isIncompatible && !isSelected ? 0.6 : 1,
                        }}
                        title={isIncompatible && !isSelected ? "Cannot link: Product requires form support" : ""}
                      >
                        {isIncompatible && !isSelected ? "Incompatible" : isSelected ? (
                          <span className="flex items-center gap-1">
                            <Check size={12} /> Linked
                          </span>
                        ) : (
                          "Link"
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {selectedProducts.length > 0 && (
              <p className="text-xs text-green-600 font-bold mt-2">
                ✓ {selectedProducts.length} product{selectedProducts.length !== 1 ? "s" : ""}{" "}
                linked
              </p>
            )}
          </div>

          {/* Template Configuration (Dynamic based on schema) */}
          {selectedTemplateCode && (() => {
            const schema = getCheckoutSchema(selectedTemplateCode);
            if (schema) {
              return (
                <div className="mb-4 border-t-2 border-gray-400 pt-4">
                  <h4 className="text-xs font-bold mb-3">Template Settings</h4>
                  <div className="text-xs text-gray-600 mb-2">
                    Advanced settings for {schema.name}
                  </div>
                  {/* TODO: Add DynamicFormGenerator for checkout schema */}
                  <div className="border-2 border-gray-300 bg-gray-50 p-3 text-xs text-gray-500">
                    Dynamic form fields will be added here based on template schema
                  </div>
                </div>
              );
            }
            return null;
          })()}
        </div>

        {/* RIGHT: Live Preview (60%) */}
        <div className="w-[60%] p-4 overflow-y-auto bg-gray-50">
          <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
            <Eye size={16} />
            Live Preview
          </h3>

          {selectedTemplateCode && selectedThemeId && currentOrg ? (
            <div className="border-2 border-gray-400 bg-white overflow-hidden">
              <CheckoutPreview
                templateCode={selectedTemplateCode}
                configuration={configuration}
                linkedProducts={linkedProductsForPreview}
                organizationId={currentOrg.id as Id<"organizations">}
                theme={getTheme(availableThemes?.find(t => t._id === selectedThemeId)?.customProperties?.code as string)}
                paymentProviders={selectedPaymentProviders}
              />
            </div>
          ) : (
            <div className="border-2 border-gray-400 bg-white p-8 text-center">
              <ShoppingCart size={64} className="mx-auto text-gray-300 mb-4" />
              <h4 className="font-bold text-sm text-gray-700 mb-2">
                {!selectedTemplateCode
                  ? "No Template Selected"
                  : !selectedThemeId
                  ? "No Theme Selected"
                  : "Preview Loading"}
              </h4>
              <p className="text-xs text-gray-600">
                {!selectedTemplateCode
                  ? "Select a template to see a live preview of your checkout."
                  : !selectedThemeId
                  ? "Select a theme to see a live preview with styling."
                  : "Select products to preview the checkout."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
