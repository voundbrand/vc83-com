"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import { Loader2, AlertCircle, FileText, ExternalLink, Check, ChevronDown, ChevronUp, Palette, Eye, ShoppingCart } from "lucide-react";
import { Id } from "../../../../convex/_generated/dataModel";
import { getTemplateSchema, getTemplateComponent, getTheme } from "@/templates/registry";
import { DynamicFormGenerator } from "./template-content-forms/dynamic-form-generator";
import { TranslationProvider } from "@/contexts/translation-context";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";

/**
 * Deep merge two objects
 * User values override defaults at each level
 */
function deepMerge(defaults: Record<string, unknown>, user: Record<string, unknown>): Record<string, unknown> {
  const result = { ...defaults };

  for (const key in user) {
    if (user[key] !== undefined && user[key] !== null) {
      if (
        typeof user[key] === 'object' &&
        !Array.isArray(user[key]) &&
        typeof defaults[key] === 'object' &&
        !Array.isArray(defaults[key])
      ) {
        // Both are objects, merge recursively
        result[key] = deepMerge(
          defaults[key] as Record<string, unknown>,
          user[key] as Record<string, unknown>
        );
      } else {
        // User value overrides (including arrays)
        result[key] = user[key];
      }
    }
  }

  return result;
}

// Type for template/theme objects from DB
interface TemplateOrTheme {
  _id: string;
  name: string;
  customProperties?: {
    code?: string;
    description?: string;
    category?: string;
  };
}

// Type for edit mode
interface EditMode {
  pageId: Id<"objects">;
  pageData: {
    _id: Id<"objects">;
    name: string;
    customProperties?: {
      slug: string;
      metaTitle: string;
      metaDescription?: string;
      templateCode?: string;
      themeCode?: string;
      templateContent?: Record<string, unknown>;
    };
  };
}

/**
 * Create/Edit Page Tab
 *
 * Allows org owners to:
 * 1. Create new pages (template + theme + content)
 * 2. Edit existing pages (same UI, pre-populated)
 */
export function CreatePageTab({ editMode }: { editMode?: EditMode | null }) {
  const { t } = useNamespaceTranslations("ui.web_publishing");
  const { sessionId } = useAuth();
  const currentOrg = useCurrentOrganization();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [selectedThemeId, setSelectedThemeId] = useState<string>("");
  const [metaTitle, setMetaTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [templateContent, setTemplateContent] = useState<Record<string, unknown>>({});
  const [linkedProducts, setLinkedProducts] = useState<string[]>([]); // Array of product IDs
  const [isCreating, setIsCreating] = useState(false);
  const [createdPageUrl, setCreatedPageUrl] = useState<string | null>(null);
  const [templateAccordionOpen, setTemplateAccordionOpen] = useState(true); // Auto-open
  const [themeAccordionOpen, setThemeAccordionOpen] = useState(true); // Auto-open

  // Fetch available templates for this org
  const availableTemplates = useQuery(
    api.templateAvailability.getAvailableTemplatesForOrg,
    sessionId && currentOrg?.id ? { sessionId, organizationId: currentOrg.id as Id<"organizations"> } : "skip"
  );

  // Fetch all system themes (themes are available to ALL orgs)
  const availableThemes = useQuery(
    api.templateAvailability.getAllSystemThemes,
    sessionId ? { sessionId } : "skip"
  );

  // Check if checkout app is available for this org
  const availableApps = useQuery(
    api.appAvailability.getAvailableApps,
    sessionId && currentOrg?.id ? { sessionId, organizationId: currentOrg.id as Id<"organizations"> } : "skip"
  );
  const checkoutAppAvailable = availableApps?.some(app => app.code === "checkout");

  // Fetch available products (for linking) - only if checkout app is available
  const availableProducts = useQuery(
    api.productOntology.getProducts,
    sessionId && currentOrg?.id && checkoutAppAvailable
      ? { sessionId, organizationId: currentOrg.id as Id<"organizations"> }
      : "skip"
  );

  const createPage = useMutation(api.publishingOntology.createPublishedPage);
  const updatePage = useMutation(api.publishingOntology.updatePublishedPage);

  // Load page data when in edit mode
  useEffect(() => {
    if (editMode?.pageData && availableTemplates) {
      const page = editMode.pageData;
      setMetaTitle(page.customProperties?.metaTitle || page.name);
      setSlug(page.customProperties?.slug || "");
      setMetaDescription(page.customProperties?.metaDescription || "");

      // Find template/theme IDs from codes
      const templateCode = page.customProperties?.templateCode;
      const themeCode = page.customProperties?.themeCode;

      if (templateCode && availableTemplates) {
        const template = availableTemplates.find(t => t.customProperties?.code === templateCode);
        if (template) setSelectedTemplateId(template._id);
      }

      if (themeCode && availableThemes) {
        const theme = availableThemes.find(t => t.customProperties?.code === themeCode);
        if (theme) setSelectedThemeId(theme._id);
      }

      // Load template content and linked products
      const content = page.customProperties?.templateContent || {};
      setTemplateContent(content);

      // Extract linked products from templateContent
      const linkedProds = (content as { linkedProducts?: string[] }).linkedProducts || [];
      setLinkedProducts(linkedProds);
    }
  }, [editMode, availableTemplates, availableThemes]);

  // Load default content when template is selected (only for new pages)
  useEffect(() => {
    if (!editMode && selectedTemplateId && availableTemplates) {
      const selectedTemplate = availableTemplates.find(t => t._id === selectedTemplateId);
      const templateCode = selectedTemplate?.customProperties?.code as string;

      if (templateCode) {
        const schema = getTemplateSchema(templateCode);
        setTemplateContent(schema.defaultContent as Record<string, unknown>);
      }
    }
  }, [selectedTemplateId, availableTemplates, editMode]);

  if (!sessionId || !currentOrg) {
    return (
      <div className="p-4">
        <div className="border-2 p-4" style={{ borderColor: 'var(--error)', background: 'var(--win95-bg-light)' }}>
          <div className="flex items-start gap-2">
            <AlertCircle size={20} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--error)' }} />
            <div>
              <h4 className="font-bold text-sm" style={{ color: 'var(--win95-text)' }}>{t("ui.web_publishing.create.auth_required")}</h4>
              <p className="text-xs mt-1" style={{ color: 'var(--win95-text)' }}>
                {t("ui.web_publishing.create.auth_required_desc")}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (availableTemplates === undefined || availableThemes === undefined) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 size={32} className="animate-spin" style={{ color: 'var(--win95-highlight)' }} />
      </div>
    );
  }

  if (availableTemplates.length === 0 || availableThemes.length === 0) {
    return (
      <div className="p-4">
        <div className="border-2 p-4" style={{ borderColor: 'var(--warning)', background: 'var(--win95-bg-light)' }}>
          <div className="flex items-start gap-2">
            <AlertCircle size={20} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--warning)' }} />
            <div>
              <h4 className="font-bold text-sm" style={{ color: 'var(--win95-text)' }}>{t("ui.web_publishing.create.no_templates_title")}</h4>
              <p className="text-xs mt-1" style={{ color: 'var(--win95-text)' }}>
                {availableTemplates.length === 0 && t("ui.web_publishing.create.no_templates_desc")}
                {availableThemes.length === 0 && t("ui.web_publishing.create.no_themes_desc")}
                {t("ui.web_publishing.create.contact_admin")}
              </p>
              <details className="mt-2 text-xs">
                <summary className="cursor-pointer font-bold" style={{ color: 'var(--win95-text)' }}>{t("ui.web_publishing.create.debug_info")}</summary>
                <pre className="mt-2 p-2 text-xs overflow-auto" style={{ background: 'var(--win95-bg-light)', color: 'var(--win95-text)' }}>
                  Templates: {JSON.stringify(availableTemplates, null, 2)}
                  Themes: {JSON.stringify(availableThemes, null, 2)}
                </pre>
              </details>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplateId || !selectedThemeId || !metaTitle || !slug) return;

    setIsCreating(true);
    try {
      // Get the selected template and theme codes
      const selectedTemplate = availableTemplates.find((t: TemplateOrTheme) => t._id === selectedTemplateId);
      const selectedTheme = availableThemes.find((t: TemplateOrTheme) => t._id === selectedThemeId);

      if (!selectedTemplate || !selectedTheme) {
        throw new Error("Selected template or theme not found");
      }

      const templateCode = selectedTemplate.customProperties?.code as string;
      const themeCode = selectedTheme.customProperties?.code as string;

      // Get the schema to merge default content with user edits
      const schema = getTemplateSchema(templateCode);

      // Deep merge: defaultContent + user edits
      // User edits override defaults at each level
      const mergedContent = deepMerge(
        schema.defaultContent as Record<string, unknown>,
        templateContent
      );

      // Transform linked products into checkout tickets format
      // This embeds product data into the page so we don't need auth at runtime
      let checkoutTickets: Array<{
        id: string;
        name: string;
        price: number;
        originalPrice?: number;
        description: string;
        features: string[];
        currency: string;
        checkoutUrl: string;
      }> = [];

      // Check if mergedContent has checkout with tickets
      const existingCheckout = mergedContent.checkout as { tickets?: Array<unknown> } | undefined;
      if (existingCheckout?.tickets) {
        checkoutTickets = existingCheckout.tickets as typeof checkoutTickets;
      }

      if (linkedProducts.length > 0 && availableProducts) {
        checkoutTickets = availableProducts
          .filter(p => linkedProducts.includes(p._id))
          .map(product => ({
            id: product._id,
            name: product.name,
            price: (product.customProperties?.price as number) || 0, // Keep in cents
            originalPrice: undefined,
            description: product.description || "",
            features: [],
            currency: (product.customProperties?.currency as string) || "EUR",
            checkoutUrl: `/checkout/${currentOrg.slug}/${product.customProperties?.slug || product._id}`,
          }));
      }

      // Add linked products and transformed tickets to custom properties
      const customPropertiesWithProducts = {
        ...mergedContent,
        linkedProducts, // Keep the product IDs for reference
        checkout: {
          ...(typeof mergedContent.checkout === 'object' && mergedContent.checkout !== null ? mergedContent.checkout as Record<string, unknown> : {}),
          tickets: checkoutTickets, // Embed product data as tickets
        },
      };

      if (editMode) {
        // UPDATE existing page
        await updatePage({
          sessionId,
          pageId: editMode.pageId,
          slug,
          metaTitle,
          metaDescription,
          templateCode,
          themeCode,
          templateContent: customPropertiesWithProducts,
        });

        alert("Page updated successfully!");
      } else {
        // CREATE new page
        // Determine what object to link to based on templateContent
        let linkedObjectId: Id<"objects"> = selectedTemplateId as Id<"objects">; // Default to template
        let linkedObjectType = "simple_page";

        // Check if an event is linked
        const linkedEventId = mergedContent.linkedEventId as string | undefined;
        if (linkedEventId) {
          linkedObjectId = linkedEventId as Id<"objects">;
          linkedObjectType = "event";
        }

        // Check if a checkout is linked (takes priority over event)
        const linkedCheckoutId = mergedContent.linkedCheckoutId as string | undefined;
        if (linkedCheckoutId) {
          linkedObjectId = linkedCheckoutId as Id<"objects">;
          linkedObjectType = "checkout_instance";
        }

        const result = await createPage({
          sessionId,
          organizationId: currentOrg.id as Id<"organizations">,
          linkedObjectId,
          linkedObjectType,
          slug,
          metaTitle,
          metaDescription,
          templateCode,
          themeCode,
          templateContent: customPropertiesWithProducts,
        });

        setCreatedPageUrl(result.publicUrl);

        // Reset form
        setSelectedTemplateId("");
        setSelectedThemeId("");
        setMetaTitle("");
        setSlug("");
        setMetaDescription("");
        setTemplateContent({});
      }
    } catch (error) {
      console.error(`Failed to ${editMode ? "update" : "create"} page:`, error);
      alert(`Failed to ${editMode ? "update" : "create"} page: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsCreating(false);
    }
  };

  // Auto-generate slug from title (always updates slug)
  const handleTitleChange = (value: string) => {
    setMetaTitle(value);
    // Always auto-generate slug from title
    const autoSlug = formatSlug(value);
    setSlug(autoSlug);
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
    setSlug(formattedSlug);
  };

  // Debug logging
  console.log('Create Page Tab State:', {
    selectedTemplateId,
    selectedThemeId,
    metaTitle,
    slug,
    isCreating,
    availableTemplatesCount: availableTemplates?.length,
    availableThemesCount: availableThemes?.length,
    buttonShouldBeEnabled: !!(selectedTemplateId && selectedThemeId && metaTitle && slug && !isCreating),
    templates: availableTemplates,
    themes: availableThemes
  });

  return (
    <div className="flex h-full">
      {/* LEFT: Form (40%) */}
      <div className="w-[40%] p-4 overflow-y-auto border-r-2" style={{ borderColor: 'var(--win95-border)' }}>
        {/* Success message */}
        {createdPageUrl && (
          <div className="border-2 p-4 mb-4" style={{ borderColor: 'var(--success)', background: 'var(--win95-bg-light)' }}>
            <div className="flex items-start gap-2">
              <Check size={20} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--success)' }} />
              <div>
                <h4 className="font-bold text-sm" style={{ color: 'var(--win95-text)' }}>{t("ui.web_publishing.create.success_title")}</h4>
                <p className="text-xs mt-1" style={{ color: 'var(--win95-text)' }}>
                  {t("ui.web_publishing.create.success_desc")}
                </p>
                <a
                  href={createdPageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs hover:underline mt-2 flex items-center gap-1"
                  style={{ color: 'var(--success)' }}
                >
                  {createdPageUrl}
                  <ExternalLink size={10} />
                </a>
              </div>
            </div>
          </div>
        )}

        <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--win95-text)' }}>
          <FileText size={16} />
          {editMode ? t("ui.web_publishing.create.title_edit") : t("ui.web_publishing.create.title_new")}
        </h3>

        {editMode && (
          <div className="border-2 p-3 mb-4" style={{ borderColor: 'var(--win95-highlight)', background: 'var(--win95-bg-light)' }}>
            <div className="flex items-start gap-2">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--win95-highlight)' }} />
              <div>
                <h4 className="font-bold text-xs" style={{ color: 'var(--win95-text)' }}>{t("ui.web_publishing.create.editing_mode_title")}</h4>
                <p className="text-xs mt-1" style={{ color: 'var(--win95-text)' }}>
                  {t("ui.web_publishing.create.editing_mode_desc")}
                </p>
              </div>
            </div>
          </div>
        )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Template selection */}
        <div className="border-2" style={{ borderColor: 'var(--win95-border)' }}>
          {/* Accordion Header */}
          <button
            type="button"
            onClick={() => setTemplateAccordionOpen(!templateAccordionOpen)}
            className="w-full px-4 py-3 flex items-center justify-between transition-colors"
            style={{ background: 'var(--win95-bg-light)' }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--win95-hover-light)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'var(--win95-bg-light)'}
          >
            <div className="flex items-center gap-2">
              <FileText size={16} />
              <span className="text-sm font-bold" style={{ color: 'var(--win95-text)' }}>
                {t("ui.web_publishing.template.select_title")} <span style={{ color: 'var(--error)' }}>{t("ui.web_publishing.template.required")}</span>
              </span>
              {selectedTemplateId && (
                <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--win95-highlight)', color: 'var(--win95-bg-light)' }}>
                  {availableTemplates.find(t => t._id === selectedTemplateId)?.name}
                </span>
              )}
            </div>
            {templateAccordionOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {/* Accordion Content */}
          {templateAccordionOpen && (
            <div className="p-3 space-y-2" style={{ background: 'var(--win95-bg-light)' }}>
              {availableTemplates.map((template) => (
                <button
                  key={template._id}
                  type="button"
                  onClick={() => setSelectedTemplateId(template._id)}
                  className="w-full border-2 p-3 text-left transition-all hover:shadow-md"
                  style={{
                    borderColor: selectedTemplateId === template._id ? 'var(--win95-highlight)' : 'var(--win95-border)',
                    backgroundColor: selectedTemplateId === template._id ? 'var(--win95-hover-light)' : 'var(--win95-bg-light)',
                    borderWidth: selectedTemplateId === template._id ? "3px" : "2px",
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-bold text-sm mb-1" style={{ color: 'var(--win95-text)' }}>{template.name}</div>
                      <p className="text-xs mb-1" style={{ color: 'var(--neutral-gray)' }}>
                        {template.customProperties?.description}
                      </p>
                      <code className="text-xs px-1" style={{ background: 'var(--win95-bg)', color: 'var(--win95-text)' }}>
                        {template.customProperties?.code}
                      </code>
                    </div>
                    {selectedTemplateId === template._id && (
                      <Check size={20} className="flex-shrink-0" style={{ color: 'var(--win95-highlight)' }} />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Theme selection */}
        <div className="border-2" style={{ borderColor: 'var(--win95-border)' }}>
          {/* Accordion Header */}
          <button
            type="button"
            onClick={() => setThemeAccordionOpen(!themeAccordionOpen)}
            className="w-full px-4 py-3 flex items-center justify-between transition-colors"
            style={{ background: 'var(--win95-bg-light)' }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--win95-hover-light)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'var(--win95-bg-light)'}
          >
            <div className="flex items-center gap-2">
              <Palette size={16} />
              <span className="text-sm font-bold" style={{ color: 'var(--win95-text)' }}>
                {t("ui.web_publishing.theme.select_title")} <span style={{ color: 'var(--error)' }}>{t("ui.web_publishing.theme.required")}</span>
              </span>
              {selectedThemeId && (
                <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--win95-highlight)', color: 'var(--win95-bg-light)' }}>
                  {availableThemes.find(t => t._id === selectedThemeId)?.name}
                </span>
              )}
            </div>
            {themeAccordionOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {/* Accordion Content */}
          {themeAccordionOpen && (
            <div className="p-3 space-y-2" style={{ background: 'var(--win95-bg-light)' }}>
              {availableThemes.map((theme: TemplateOrTheme) => (
                <button
                  key={theme._id}
                  type="button"
                  onClick={() => setSelectedThemeId(theme._id)}
                  className="w-full border-2 p-3 text-left transition-all hover:shadow-md"
                  style={{
                    borderColor: selectedThemeId === theme._id ? 'var(--win95-highlight)' : 'var(--win95-border)',
                    backgroundColor: selectedThemeId === theme._id ? 'var(--win95-hover-light)' : 'var(--win95-bg-light)',
                    borderWidth: selectedThemeId === theme._id ? "3px" : "2px",
                  }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="font-bold text-sm mb-1" style={{ color: 'var(--win95-text)' }}>{theme.name}</div>
                      <p className="text-xs mb-1" style={{ color: 'var(--neutral-gray)' }}>
                        {theme.customProperties?.description}
                      </p>
                      <code className="text-xs px-1" style={{ background: 'var(--win95-bg)', color: 'var(--win95-text)' }}>
                        {theme.customProperties?.code}
                      </code>
                    </div>
                    {selectedThemeId === theme._id && (
                      <Check size={20} className="flex-shrink-0" style={{ color: 'var(--win95-highlight)' }} />
                    )}
                  </div>
                  {/* Color palette preview in the button */}
                  <div className="flex gap-1 mt-2">
                    <div className="w-8 h-8 rounded border" style={{ borderColor: 'var(--win95-border)', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }} title={t("ui.web_publishing.theme.primary_gradient")} />
                    <div className="w-8 h-8 rounded border" style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg-light)' }} title={t("ui.web_publishing.theme.background")} />
                    <div className="w-8 h-8 rounded border" style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-text)' }} title={t("ui.web_publishing.theme.text")} />
                    <div className="w-8 h-8 rounded border" style={{ borderColor: 'var(--win95-border)', background: 'var(--neutral-gray)' }} title={t("ui.web_publishing.theme.secondary")} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Page metadata */}
        <div>
          <label className="block text-xs font-bold mb-1" style={{ color: 'var(--win95-text)' }}>
            {t("ui.web_publishing.meta.page_title")} <span style={{ color: 'var(--error)' }}>*</span>
          </label>
          <input
            type="text"
            value={metaTitle}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="w-full border-2 px-2 py-1 text-sm"
            style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg-light)', color: 'var(--win95-text)' }}
            placeholder="e.g., Our Amazing Product"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-bold mb-1" style={{ color: 'var(--win95-text)' }}>
            {t("ui.web_publishing.meta.page_slug")} <span style={{ color: 'var(--error)' }}>*</span>
          </label>
          <input
            type="text"
            value={slug}
            onChange={(e) => handleSlugChange(e.target.value)}
            className="w-full border-2 px-2 py-1 text-sm"
            style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg-light)', color: 'var(--win95-text)' }}
            placeholder="e.g., amazing-product"
            required
            pattern="[a-z0-9-]+"
            title="Type any text - spaces and special chars will be auto-converted"
          />
          <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
            {t("ui.web_publishing.meta.url_preview")} {process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/p/{currentOrg?.slug || "your-org"}/{slug || "page-slug"}
          </p>
        </div>

        <div>
          <label className="block text-xs font-bold mb-1" style={{ color: 'var(--win95-text)' }}>
            {t("ui.web_publishing.meta.meta_description")}
          </label>
          <textarea
            value={metaDescription}
            onChange={(e) => setMetaDescription(e.target.value)}
            className="w-full border-2 px-2 py-1 text-sm"
            style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg-light)', color: 'var(--win95-text)' }}
            placeholder={t("ui.web_publishing.meta.meta_description_placeholder")}
            rows={3}
            maxLength={160}
          />
          <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
            {t("ui.web_publishing.meta.character_count").replace("{count}", String(metaDescription.length))}
          </p>
        </div>

        {/* LINK PRODUCTS */}
        <div className="border-t-2 pt-4" style={{ borderColor: 'var(--win95-border)' }}>
          <h4 className="text-xs font-bold mb-2 flex items-center gap-2" style={{ color: 'var(--win95-text)' }}>
            <ShoppingCart size={14} />
            {t("ui.web_publishing.products.title")}
          </h4>
          <p className="text-xs mb-3" style={{ color: 'var(--neutral-gray)' }}>
            {t("ui.web_publishing.products.description")}
          </p>

          {/* Checkout app not available */}
          {availableApps !== undefined && !checkoutAppAvailable ? (
            <div className="border-2 p-3" style={{ borderColor: 'var(--warning)', background: 'var(--win95-bg-light)' }}>
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--warning)' }} />
                <div>
                  <h4 className="font-bold text-xs mb-1" style={{ color: 'var(--win95-text)' }}>{t("ui.web_publishing.products.checkout_required_title")}</h4>
                  <p className="text-xs mb-2" style={{ color: 'var(--win95-text)' }}>
                    {t("ui.web_publishing.products.checkout_required_desc")}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
                    {t("ui.web_publishing.products.contact_admin")}
                  </p>
                </div>
              </div>
            </div>
          ) : availableProducts && availableProducts.length > 0 ? (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {availableProducts.map((product) => {
                const productId = product._id;
                const isLinked = linkedProducts.includes(productId);
                const price = product.customProperties?.price as number || 0;
                const currency = (product.customProperties?.currency as string) || "eur";

                return (
                  <div
                    key={productId}
                    className="border-2 p-2 flex items-start justify-between"
                    style={{
                      borderColor: isLinked ? 'var(--win95-highlight)' : 'var(--win95-border)',
                      backgroundColor: isLinked ? 'var(--win95-hover-light)' : 'var(--win95-bg-light)'
                    }}
                  >
                    <div className="flex-1">
                      <div className="font-bold text-xs" style={{ color: 'var(--win95-text)' }}>{product.name}</div>
                      <div className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: currency.toUpperCase(),
                        }).format(price / 100)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (isLinked) {
                          setLinkedProducts(linkedProducts.filter(id => id !== productId));
                        } else {
                          setLinkedProducts([...linkedProducts, productId]);
                        }
                      }}
                      className="px-2 py-1 text-xs font-bold border-2 transition-colors"
                      style={{
                        borderColor: isLinked ? 'var(--win95-highlight)' : 'var(--win95-border)',
                        backgroundColor: isLinked ? 'var(--win95-highlight)' : 'var(--win95-bg-light)',
                        color: isLinked ? 'white' : 'var(--win95-text)'
                      }}
                    >
                      {isLinked ? t("ui.web_publishing.products.linked") : t("ui.web_publishing.products.link")}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : checkoutAppAvailable ? (
            <div className="text-xs p-3 border-2" style={{ color: 'var(--neutral-gray)', background: 'var(--win95-bg-light)', borderColor: 'var(--win95-border)' }}>
              {t("ui.web_publishing.products.no_products")}
            </div>
          ) : null}

          {linkedProducts.length > 0 && (
            <p className="text-xs font-bold mt-2" style={{ color: 'var(--success)' }}>
              {linkedProducts.length === 1
                ? t("ui.web_publishing.products.count_linked").replace("{count}", String(linkedProducts.length))
                : t("ui.web_publishing.products.count_linked_plural").replace("{count}", String(linkedProducts.length))
              }
            </p>
          )}
        </div>

        {/* DYNAMIC CONTENT FORM */}
        {selectedTemplateId && (() => {
          const selectedTemplate = availableTemplates.find(t => t._id === selectedTemplateId);
          const templateCode = selectedTemplate?.customProperties?.code as string;

          if (templateCode) {
            const schema = getTemplateSchema(templateCode);

            return (
              <div className="border-t-2 pt-4" style={{ borderColor: 'var(--win95-border)' }}>
                <h4 className="text-xs font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--win95-text)' }}>
                  <FileText size={14} />
                  {t("ui.web_publishing.content.title")}
                </h4>
                <DynamicFormGenerator
                  schema={schema}
                  content={templateContent}
                  onChange={setTemplateContent}
                />
              </div>
            );
          }
          return null;
        })()}

        {/* Submit */}
        <div className="flex items-center justify-between pt-4 border-t-2" style={{ borderColor: 'var(--win95-border)' }}>
          <p className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
            {t("ui.web_publishing.submit.draft_notice")} <span className="font-bold">{t("ui.web_publishing.submit.draft")}</span>.
          </p>
          <button
            type="submit"
            disabled={!selectedTemplateId || !selectedThemeId || !metaTitle || !slug || isCreating}
            className="px-4 py-2 text-sm font-bold border-2 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              borderColor: 'var(--win95-border)',
              backgroundColor: selectedTemplateId && selectedThemeId && metaTitle && slug && !isCreating ? 'var(--win95-highlight)' : 'var(--win95-bg)',
              color: selectedTemplateId && selectedThemeId && metaTitle && slug && !isCreating ? 'white' : 'var(--neutral-gray)',
            }}
          >
            {isCreating ? (
              <span className="flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" />
                {t("ui.web_publishing.submit.creating")}
              </span>
            ) : editMode ? (
              t("ui.web_publishing.submit.update_page")
            ) : (
              t("ui.web_publishing.submit.create_page")
            )}
          </button>
        </div>
      </form>
      </div>

      {/* RIGHT: Preview (60%) */}
      <div className="w-[60%] p-4 overflow-y-auto" style={{ background: 'var(--win95-bg)' }}>
        <h3 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--win95-text)' }}>
          <Eye size={16} />
          {t("ui.web_publishing.preview.title")}
        </h3>

        {/* Preview content */}
        {selectedTemplateId && selectedThemeId ? (
          <div className="space-y-4">
            {/* LIVE TEMPLATE PREVIEW with actual content */}
            <div className="border-2 overflow-hidden" style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg-light)' }}>
              {(() => {
                const selectedTemplate = availableTemplates.find(t => t._id === selectedTemplateId);
                const selectedTheme = availableThemes.find(t => t._id === selectedThemeId);
                const templateCode = selectedTemplate?.customProperties?.code as string;
                const themeCode = selectedTheme?.customProperties?.code as string;

                if (templateCode && themeCode) {
                  const TemplateComponent = getTemplateComponent(templateCode);
                  const theme = getTheme(themeCode);
                  const schema = getTemplateSchema(templateCode);

                  // Merge default content with user edits for preview
                  const previewContent = deepMerge(
                    schema.defaultContent as Record<string, unknown>,
                    templateContent
                  );

                  // Transform linked products into checkout tickets for preview
                  let previewCheckoutTickets: Array<{
                    id: string;
                    name: string;
                    price: number;
                    originalPrice?: number;
                    description: string;
                    features: string[];
                    currency: string;
                    checkoutUrl: string;
                  }> = [];

                  if (linkedProducts.length > 0 && availableProducts) {
                    previewCheckoutTickets = availableProducts
                      .filter(p => linkedProducts.includes(p._id))
                      .map(product => ({
                        id: product._id,
                        name: product.name,
                        price: (product.customProperties?.price as number) || 0, // Keep in cents
                        originalPrice: undefined,
                        description: product.description || "",
                        features: [],
                        currency: (product.customProperties?.currency as string) || "EUR",
                        checkoutUrl: `/checkout/${currentOrg.slug}/${product.customProperties?.slug || product._id}`,
                      }));
                  }

                  // Create mock page/data objects for preview
                  // Include transformed product data in preview content
                  const previewContentWithProducts = {
                    ...previewContent,
                    linkedProducts,
                    checkout: {
                      ...(typeof previewContent.checkout === 'object' && previewContent.checkout !== null ? previewContent.checkout as Record<string, unknown> : {}),
                      tickets: previewCheckoutTickets, // Add transformed tickets for preview
                    },
                  };

                  const mockPage = {
                    _id: "preview" as Id<"objects">,
                    organizationId: currentOrg?.id as Id<"organizations">,
                    type: "published_page",
                    name: metaTitle || "Preview Page",
                    status: "draft",
                    customProperties: {
                      slug: slug || "preview",
                      publicUrl: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/p/${currentOrg?.slug || "org"}/preview`,
                      metaTitle: metaTitle || "Preview Page",
                      metaDescription: metaDescription || "",
                      templateCode,
                      themeCode,
                      templateContent: previewContentWithProducts,
                    },
                  };

                  const mockData = {
                    _id: "preview-data" as Id<"objects">,
                    organizationId: currentOrg?.id as Id<"organizations">,
                    type: "simple_page",
                    name: metaTitle || "Preview Content",
                    customProperties: previewContentWithProducts,
                  };

                  const mockOrg = {
                    _id: currentOrg?.id as Id<"organizations">,
                    name: currentOrg?.name || "Your Organization",
                    slug: currentOrg?.slug || "your-org",
                  };

                  // Debug logging for preview data
                  console.log('[Preview Debug] Template Content:', templateContent);
                  console.log('[Preview Debug] Mock Data:', mockData);

                  return (
                    <div className="transform scale-75 origin-top-left w-[133%]">
                      <TranslationProvider>
                        <TemplateComponent
                          page={mockPage}
                          data={mockData}
                          organization={mockOrg}
                          theme={theme}
                        />
                      </TranslationProvider>
                    </div>
                  );
                }

                return (
                  <div className="p-8 text-center" style={{ color: 'var(--neutral-gray)' }}>
                    <p className="text-xs">{t("ui.web_publishing.preview.loading")}</p>
                  </div>
                );
              })()}
            </div>

            {/* Template Info */}
            <div className="border-2 p-4" style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg-light)' }}>
              <h4 className="text-xs font-bold mb-2 flex items-center gap-2" style={{ color: 'var(--win95-text)' }}>
                <FileText size={14} />
                {t("ui.web_publishing.preview.template_label")} {availableTemplates.find(t => t._id === selectedTemplateId)?.name}
              </h4>
              <p className="text-xs mb-3" style={{ color: 'var(--neutral-gray)' }}>
                {availableTemplates.find(t => t._id === selectedTemplateId)?.customProperties?.description}
              </p>
              <code className="text-xs px-2 py-1" style={{ background: 'var(--win95-bg)', color: 'var(--win95-text)' }}>
                {availableTemplates.find(t => t._id === selectedTemplateId)?.customProperties?.code}
              </code>
            </div>

            {/* Theme Info */}
            <div className="border-2 p-4" style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg-light)' }}>
              <h4 className="text-xs font-bold mb-2 flex items-center gap-2" style={{ color: 'var(--win95-text)' }}>
                <Palette size={14} />
                {t("ui.web_publishing.preview.theme_label")} {availableThemes.find(t => t._id === selectedThemeId)?.name}
              </h4>
              <p className="text-xs mb-3" style={{ color: 'var(--neutral-gray)' }}>
                {availableThemes.find(t => t._id === selectedThemeId)?.customProperties?.description}
              </p>

              {/* Color swatches */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold" style={{ color: 'var(--win95-text)' }}>{t("ui.web_publishing.theme.colors")}</span>
                <div className="flex gap-1">
                  <div
                    className="w-8 h-8 rounded border"
                    style={{ borderColor: 'var(--win95-border)', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
                    title={t("ui.web_publishing.theme.primary_gradient")}
                  />
                  <div className="w-8 h-8 rounded border" style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg-light)' }} title={t("ui.web_publishing.theme.background")} />
                  <div className="w-8 h-8 rounded border" style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-text)' }} title={t("ui.web_publishing.theme.text")} />
                  <div className="w-8 h-8 rounded border" style={{ borderColor: 'var(--win95-border)', background: 'var(--neutral-gray)' }} title={t("ui.web_publishing.theme.secondary")} />
                </div>
              </div>

              <code className="text-xs px-2 py-1" style={{ background: 'var(--win95-bg)', color: 'var(--win95-text)' }}>
                {availableThemes.find(t => t._id === selectedThemeId)?.customProperties?.code}
              </code>
            </div>
          </div>
        ) : (
          <div className="border-2 p-8 text-center" style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg-light)' }}>
            <FileText size={64} className="mx-auto mb-4" style={{ color: 'var(--neutral-gray)' }} />
            <h4 className="font-bold text-sm mb-2" style={{ color: 'var(--win95-text)' }}>
              {t("ui.web_publishing.preview.select_template_title")}
            </h4>
            <p className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
              {t("ui.web_publishing.preview.select_template_desc")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
