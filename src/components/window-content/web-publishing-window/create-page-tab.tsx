"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import { Loader2, AlertCircle, FileText, ExternalLink, Check, ChevronDown, ChevronUp, Palette, Eye, ShoppingCart } from "lucide-react";
import { Id } from "../../../../convex/_generated/dataModel";
import { getTemplateSchema, getTemplateComponent, getTheme } from "@/templates/registry";
import { DynamicFormGenerator } from "./template-content-forms/dynamic-form-generator";
import type { LandingPageContent } from "@/templates/web/landing-page/schema";

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

  // Fetch available products (for linking)
  const availableProducts = useQuery(
    api.productOntology.getProducts,
    sessionId && currentOrg?.id ? { sessionId, organizationId: currentOrg.id as Id<"organizations"> } : "skip"
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

      setTemplateContent(page.customProperties?.templateContent || {});
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
        <div className="border-2 border-red-600 bg-red-50 p-4">
          <div className="flex items-start gap-2">
            <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm text-red-900">Authentication Required</h4>
              <p className="text-xs text-red-800 mt-1">
                Please log in to create pages.
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
        <Loader2 size={32} className="animate-spin text-purple-600" />
      </div>
    );
  }

  if (availableTemplates.length === 0 || availableThemes.length === 0) {
    return (
      <div className="p-4">
        <div className="border-2 border-yellow-600 bg-yellow-50 p-4">
          <div className="flex items-start gap-2">
            <AlertCircle size={20} className="text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm text-yellow-900">Templates or Themes Not Available</h4>
              <p className="text-xs text-yellow-800 mt-1">
                {availableTemplates.length === 0 && "Your organization does not have any templates enabled yet. "}
                {availableThemes.length === 0 && "No themes found in system. "}
                Contact your system administrator to enable templates.
              </p>
              <details className="mt-2 text-xs">
                <summary className="cursor-pointer font-bold">Debug Info</summary>
                <pre className="mt-2 bg-white p-2 text-xs overflow-auto">
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

      // Add linked products to custom properties
      const customPropertiesWithProducts = {
        ...mergedContent,
        linkedProducts, // Array of product IDs
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
        const result = await createPage({
          sessionId,
          organizationId: currentOrg.id as Id<"organizations">,
          linkedObjectId: selectedTemplateId as Id<"objects">, // TEMPORARY: using template as linked object
          linkedObjectType: "simple_page",
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
      <div className="w-[40%] p-4 overflow-y-auto border-r-2 border-gray-400">
        {/* Success message */}
        {createdPageUrl && (
          <div className="border-2 border-green-600 bg-green-50 p-4 mb-4">
            <div className="flex items-start gap-2">
              <Check size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm text-green-900">Page Created Successfully!</h4>
                <p className="text-xs text-green-800 mt-1">
                  Your page has been created as a draft. You can publish it from the Published Pages tab.
                </p>
                <a
                  href={createdPageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-green-600 hover:underline mt-2 flex items-center gap-1"
                >
                  {createdPageUrl}
                  <ExternalLink size={10} />
                </a>
              </div>
            </div>
          </div>
        )}

        <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
          <FileText size={16} />
          {editMode ? "Edit Page" : "Create New Page"}
        </h3>

        {editMode && (
          <div className="border-2 border-blue-600 bg-blue-50 p-3 mb-4">
            <div className="flex items-start gap-2">
              <AlertCircle size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-xs text-blue-900">Editing Mode</h4>
                <p className="text-xs text-blue-800 mt-1">
                  You are editing an existing page. Changes will update the page immediately.
                </p>
              </div>
            </div>
          </div>
        )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Template selection */}
        <div className="border-2 border-gray-400">
          {/* Accordion Header */}
          <button
            type="button"
            onClick={() => setTemplateAccordionOpen(!templateAccordionOpen)}
            className="w-full px-4 py-3 flex items-center justify-between bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            <div className="flex items-center gap-2">
              <FileText size={16} />
              <span className="text-sm font-bold">
                Select Template <span className="text-red-600">*</span>
              </span>
              {selectedTemplateId && (
                <span className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded">
                  {availableTemplates.find(t => t._id === selectedTemplateId)?.name}
                </span>
              )}
            </div>
            {templateAccordionOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {/* Accordion Content */}
          {templateAccordionOpen && (
            <div className="p-3 bg-white space-y-2">
              {availableTemplates.map((template) => (
                <button
                  key={template._id}
                  type="button"
                  onClick={() => setSelectedTemplateId(template._id)}
                  className="w-full border-2 p-3 text-left transition-all hover:shadow-md"
                  style={{
                    borderColor: selectedTemplateId === template._id ? "#6B46C1" : "#D1D5DB",
                    backgroundColor: selectedTemplateId === template._id ? "#F3E8FF" : "white",
                    borderWidth: selectedTemplateId === template._id ? "3px" : "2px",
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-bold text-sm mb-1">{template.name}</div>
                      <p className="text-xs text-gray-600 mb-1">
                        {template.customProperties?.description}
                      </p>
                      <code className="text-xs bg-gray-100 px-1">
                        {template.customProperties?.code}
                      </code>
                    </div>
                    {selectedTemplateId === template._id && (
                      <Check size={20} className="text-purple-600 flex-shrink-0" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Theme selection */}
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
              {selectedThemeId && (
                <span className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded">
                  {availableThemes.find(t => t._id === selectedThemeId)?.name}
                </span>
              )}
            </div>
            {themeAccordionOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {/* Accordion Content */}
          {themeAccordionOpen && (
            <div className="p-3 bg-white space-y-2">
              {availableThemes.map((theme: TemplateOrTheme) => (
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
                        {theme.customProperties?.description}
                      </p>
                      <code className="text-xs bg-gray-100 px-1">
                        {theme.customProperties?.code}
                      </code>
                    </div>
                    {selectedThemeId === theme._id && (
                      <Check size={20} className="text-purple-600 flex-shrink-0" />
                    )}
                  </div>
                  {/* Color palette preview in the button */}
                  <div className="flex gap-1 mt-2">
                    <div className="w-8 h-8 rounded border border-gray-300" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }} title="Primary Gradient" />
                    <div className="w-8 h-8 rounded border border-gray-300 bg-white" title="Background" />
                    <div className="w-8 h-8 rounded border border-gray-300 bg-gray-900" title="Text" />
                    <div className="w-8 h-8 rounded border border-gray-300 bg-gray-100" title="Secondary" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Page metadata */}
        <div>
          <label className="block text-xs font-bold mb-1">
            Page Title <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            value={metaTitle}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="w-full border-2 border-gray-400 px-2 py-1 text-sm"
            placeholder="e.g., Our Amazing Product"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-bold mb-1">
            Page Slug <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            value={slug}
            onChange={(e) => handleSlugChange(e.target.value)}
            className="w-full border-2 border-gray-400 px-2 py-1 text-sm"
            placeholder="e.g., amazing-product"
            required
            pattern="[a-z0-9-]+"
            title="Type any text - spaces and special chars will be auto-converted"
          />
          <p className="text-xs text-gray-500 mt-1">
            URL: {process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/p/{currentOrg?.slug || "your-org"}/{slug || "page-slug"}
          </p>
        </div>

        <div>
          <label className="block text-xs font-bold mb-1">
            Meta Description (Optional)
          </label>
          <textarea
            value={metaDescription}
            onChange={(e) => setMetaDescription(e.target.value)}
            className="w-full border-2 border-gray-400 px-2 py-1 text-sm"
            placeholder="Brief description for SEO and social sharing"
            rows={3}
            maxLength={160}
          />
          <p className="text-xs text-gray-500 mt-1">
            {metaDescription.length}/160 characters
          </p>
        </div>

        {/* LINK PRODUCTS */}
        <div className="border-t-2 border-gray-400 pt-4">
          <h4 className="text-xs font-bold mb-2 flex items-center gap-2">
            <ShoppingCart size={14} />
            Link Products (Optional)
          </h4>
          <p className="text-xs text-gray-600 mb-3">
            Connect products to this page. They'll appear in your template's checkout UI.
          </p>

          {availableProducts && availableProducts.length > 0 ? (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {availableProducts.map((product) => {
                const productId = product._id;
                const isLinked = linkedProducts.includes(productId);
                const price = product.customProperties?.priceInCents as number || 0;
                const currency = (product.customProperties?.currency as string) || "usd";

                return (
                  <div
                    key={productId}
                    className="border-2 p-2 flex items-start justify-between"
                    style={{
                      borderColor: isLinked ? "#6B46C1" : "#D1D5DB",
                      backgroundColor: isLinked ? "#F3E8FF" : "white"
                    }}
                  >
                    <div className="flex-1">
                      <div className="font-bold text-xs">{product.name}</div>
                      <div className="text-xs text-gray-600">
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
                        borderColor: isLinked ? "#6B46C1" : "#D1D5DB",
                        backgroundColor: isLinked ? "#6B46C1" : "white",
                        color: isLinked ? "white" : "#6B7280"
                      }}
                    >
                      {isLinked ? "✓ Linked" : "Link"}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-xs text-gray-500 bg-gray-50 p-3 border-2 border-gray-300">
              No products yet. Create products in the Products app first.
            </div>
          )}

          {linkedProducts.length > 0 && (
            <p className="text-xs text-green-600 font-bold mt-2">
              ✓ {linkedProducts.length} product{linkedProducts.length !== 1 ? 's' : ''} linked
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
              <div className="border-t-2 border-gray-400 pt-4">
                <h4 className="text-xs font-bold mb-3 flex items-center gap-2">
                  <FileText size={14} />
                  Page Content
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
        <div className="flex items-center justify-between pt-4 border-t-2 border-gray-400">
          <p className="text-xs text-gray-600">
            Page will be created as a <span className="font-bold">draft</span>.
          </p>
          <button
            type="submit"
            disabled={!selectedTemplateId || !selectedThemeId || !metaTitle || !slug || isCreating}
            className="px-4 py-2 text-sm font-bold border-2 border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: selectedTemplateId && selectedThemeId && metaTitle && slug && !isCreating ? "#6B46C1" : "#E5E7EB",
              color: selectedTemplateId && selectedThemeId && metaTitle && slug && !isCreating ? "white" : "#6B7280",
            }}
          >
            {isCreating ? (
              <span className="flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" />
                Creating...
              </span>
            ) : editMode ? (
              "Update Page"
            ) : (
              "Create Page"
            )}
          </button>
        </div>
      </form>
      </div>

      {/* RIGHT: Preview (60%) */}
      <div className="w-[60%] p-4 overflow-y-auto bg-gray-50">
        <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
          <Eye size={16} />
          Live Preview
        </h3>

        {/* Preview content */}
        {selectedTemplateId && selectedThemeId ? (
          <div className="space-y-4">
            {/* LIVE TEMPLATE PREVIEW with actual content */}
            <div className="border-2 border-gray-400 bg-white overflow-hidden">
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

                  // Create mock page/data objects for preview
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
                      templateContent: previewContent,
                    },
                  };

                  const mockData = {
                    _id: "preview-data" as Id<"objects">,
                    organizationId: currentOrg?.id as Id<"organizations">,
                    type: "simple_page",
                    name: metaTitle || "Preview Content",
                    customProperties: previewContent,
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
                      <TemplateComponent
                        page={mockPage}
                        data={mockData}
                        organization={mockOrg}
                        theme={theme}
                      />
                    </div>
                  );
                }

                return (
                  <div className="p-8 text-center text-gray-500">
                    <p className="text-xs">Template preview loading...</p>
                  </div>
                );
              })()}
            </div>

            {/* Template Info */}
            <div className="border-2 border-gray-400 bg-white p-4">
              <h4 className="text-xs font-bold mb-2 flex items-center gap-2">
                <FileText size={14} />
                Template: {availableTemplates.find(t => t._id === selectedTemplateId)?.name}
              </h4>
              <p className="text-xs text-gray-600 mb-3">
                {availableTemplates.find(t => t._id === selectedTemplateId)?.customProperties?.description}
              </p>
              <code className="text-xs bg-gray-100 px-2 py-1">
                {availableTemplates.find(t => t._id === selectedTemplateId)?.customProperties?.code}
              </code>
            </div>

            {/* Theme Info */}
            <div className="border-2 border-gray-400 bg-white p-4">
              <h4 className="text-xs font-bold mb-2 flex items-center gap-2">
                <Palette size={14} />
                Theme: {availableThemes.find(t => t._id === selectedThemeId)?.name}
              </h4>
              <p className="text-xs text-gray-600 mb-3">
                {availableThemes.find(t => t._id === selectedThemeId)?.customProperties?.description}
              </p>

              {/* Color swatches */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold">Colors:</span>
                <div className="flex gap-1">
                  <div
                    className="w-8 h-8 rounded border border-gray-300"
                    style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
                    title="Primary Gradient"
                  />
                  <div className="w-8 h-8 rounded border border-gray-300 bg-white" title="Background" />
                  <div className="w-8 h-8 rounded border border-gray-300 bg-gray-900" title="Text" />
                  <div className="w-8 h-8 rounded border border-gray-300 bg-gray-100" title="Secondary" />
                </div>
              </div>

              <code className="text-xs bg-gray-100 px-2 py-1">
                {availableThemes.find(t => t._id === selectedThemeId)?.customProperties?.code}
              </code>
            </div>
          </div>
        ) : (
          <div className="border-2 border-gray-400 bg-white p-8 text-center">
            <FileText size={64} className="mx-auto text-gray-300 mb-4" />
            <h4 className="font-bold text-sm text-gray-700 mb-2">
              Select Template & Theme
            </h4>
            <p className="text-xs text-gray-600">
              Choose a template and theme from the left panel to see a live preview here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
