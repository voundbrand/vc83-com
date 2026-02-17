"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import { Loader2, Plus, FileText, Filter, X, ChevronDown, Tag, Shield, Layers, Check } from "lucide-react";
import type { Id } from "../../../../convex/_generated/dataModel";
import { TemplatesList } from "./templates-list";
import { isValidEmailTemplateType, isValidPdfTemplateType } from "@/templates/template-types";
import type { TemplateUsageData } from "@/components/template-usage-badges";

interface AllTemplatesTabProps {
  onEditTemplate: (templateId: string) => void;
  onCreateTemplate: () => void;
  onViewSchema?: (templateId: string) => void;
  templateUsageData?: Record<string, TemplateUsageData>; // Usage data by template ID
}

type TabType = "all" | "active" | "inactive";
type FilterType = "all" | "email" | "pdf";
type CategoryFilter = "all" | "ticket" | "universal" | "certificate" | "invoice" | "registration" |
  "checkout" | "survey" | "transactional" | "marketing" | "event" | "support" |
  "leadmagnet" | "quote" | "badge" | "eventdoc" | "luxury" | "product" | "newsletter" | "receipt";
type PropertyFilter = "all" | "system" | "schema" | "default";

export function AllTemplatesTab({ onEditTemplate, onCreateTemplate, onViewSchema, templateUsageData }: AllTemplatesTabProps) {
  const { sessionId } = useAuth();
  const currentOrg = useCurrentOrganization();
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [propertyFilter, setPropertyFilter] = useState<PropertyFilter>("all");
  const [templateSetFilter, setTemplateSetFilter] = useState<string>("all");
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showPropertyDropdown, setShowPropertyDropdown] = useState(false);
  const [showTemplateSetDropdown, setShowTemplateSetDropdown] = useState(false);

  // Fetch ALL templates (both organization and system templates)
  const templates = useQuery(
    api.templateOntology.getAllTemplatesIncludingSystem,
    sessionId && currentOrg ? { sessionId, organizationId: currentOrg.id as Id<"organizations"> } : "skip"
  );

  // Fetch template sets for the filter dropdown
  const templateSets = useQuery(
    api.templateSetOntology.getTemplateSets,
    sessionId && currentOrg ? { sessionId, organizationId: currentOrg.id as Id<"organizations">, includeSystem: false } : "skip"
  );

  // Fetch objectLinks to map templates to template sets
  const templateLinks = useQuery(
    api.templateSetQueries.getTemplateSetLinks,
    currentOrg ? { organizationId: currentOrg.id as Id<"organizations"> } : "skip"
  );

  // Filter templates based on all active filters
  const filteredTemplates = useMemo(() => {
    if (!templates) return [];

    let filtered = templates;

    // Filter by status (active/inactive)
    if (activeTab === "active") {
      filtered = filtered.filter((t) => t.status === "published");
    } else if (activeTab === "inactive") {
      filtered = filtered.filter((t) => t.status === "draft");
    }

    // Filter by type (email/pdf)
    if (filterType === "email") {
      // Include legacy "email" subtype AND all valid email template types
      filtered = filtered.filter((t) =>
        t.subtype === "email" || (t.subtype && isValidEmailTemplateType(t.subtype))
      );
    } else if (filterType === "pdf") {
      // Include legacy PDF subtypes AND all valid PDF template types
      filtered = filtered.filter((t) =>
        t.subtype === "pdf" ||
        t.subtype === "pdf_ticket" ||
        (typeof t.subtype === "string" && t.subtype.startsWith("pdf")) ||
        (t.subtype && isValidPdfTemplateType(t.subtype))
      );
    }

    // Filter by category
    if (categoryFilter !== "all") {
      filtered = filtered.filter((t) => {
        const props = t.customProperties as Record<string, unknown> | undefined;
        const category = props?.category;
        const subtype = t.subtype;
        // Match category or subtype (some templates store category in different fields)
        return category === categoryFilter || subtype === categoryFilter;
      });
    }

    // Filter by property
    if (propertyFilter === "system") {
      filtered = filtered.filter((t) => (t as { isSystemTemplate?: boolean }).isSystemTemplate === true);
    } else if (propertyFilter === "schema") {
      filtered = filtered.filter((t) => {
        const hasSchema = !!(t.customProperties?.templateSchema || t.customProperties?.emailTemplateSchema);
        return hasSchema;
      });
    } else if (propertyFilter === "default") {
      filtered = filtered.filter((t) => {
        const props = t.customProperties as Record<string, unknown> | undefined;
        return props?.isDefault === true;
      });
    }

    // Filter by template set (only if a specific set is selected AND we have link data)
    if (templateSetFilter !== "all" && templateLinks) {
      const templatesInSet = templateLinks
        .filter((link) => link.templateSetId === templateSetFilter)
        .map((link) => link.templateId);

      filtered = filtered.filter((t) => templatesInSet.includes(t._id));
    }

    return filtered;
  }, [templates, activeTab, filterType, categoryFilter, propertyFilter, templateSetFilter, templateLinks]);

  // Count templates by status
  const counts = useMemo(() => {
    if (!templates) return { all: 0, active: 0, inactive: 0 };
    return {
      all: templates.length,
      active: templates.filter((t) => t.status === "published").length,
      inactive: templates.filter((t) => t.status === "draft").length,
    };
  }, [templates]);

  if (templates === undefined) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 size={32} className="animate-spin" style={{ color: 'var(--tone-accent-strong)' }} />
      </div>
    );
  }

  const getTabButtonStyle = (tab: TabType) => ({
    borderColor: 'var(--window-document-border)',
    borderWidth: '2px',
    borderStyle: 'solid' as const,
    background: activeTab === tab ? 'var(--tone-accent-strong)' : 'var(--window-document-bg)',
    color: activeTab === tab ? 'var(--window-document-text)' : 'var(--window-document-text)',
  });

  const categoryOptions: Array<{ value: CategoryFilter; label: string }> = [
    { value: "all", label: "All Categories" },
    { value: "ticket", label: "Ticket" },
    { value: "invoice", label: "Invoice" },
    { value: "receipt", label: "Receipt" },
    { value: "event", label: "Event" },
    { value: "newsletter", label: "Newsletter" },
    { value: "transactional", label: "Transactional" },
    { value: "marketing", label: "Marketing" },
    { value: "support", label: "Support" },
    { value: "registration", label: "Registration" },
    { value: "checkout", label: "Checkout" },
    { value: "survey", label: "Survey" },
    { value: "leadmagnet", label: "Lead Magnet" },
    { value: "quote", label: "Quote" },
    { value: "badge", label: "Badge" },
    { value: "certificate", label: "Certificate" },
    { value: "eventdoc", label: "Event Document" },
    { value: "universal", label: "Universal" },
    { value: "luxury", label: "Luxury" },
    { value: "product", label: "Product" },
  ];

  const propertyOptions: Array<{ value: PropertyFilter; label: string; color: string; desc: string }> = [
    { value: "all", label: "All Templates", color: "#6B7280", desc: "Show all templates" },
    { value: "system", label: "System Templates", color: "#3b82f6", desc: "Platform defaults" },
    { value: "schema", label: "Schema-Driven", color: "#10B981", desc: "Modern, flexible" },
    { value: "default", label: "Default Templates", color: "#9F7AEA", desc: "Category defaults" },
  ];

  const hasActiveFilters = categoryFilter !== "all" || propertyFilter !== "all";

  const clearAllFilters = () => {
    setCategoryFilter("all");
    setPropertyFilter("all");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Filter Controls */}
      <div className="p-4 border-b-2 space-y-3" style={{ borderColor: 'var(--window-document-border)' }}>
        {/* Row 1: Type and Status Filters */}
        <div className="flex items-center gap-2">
          {/* Template Type Filters */}
          <button
            onClick={() => setFilterType("all")}
            className="px-4 py-2 text-xs font-bold transition-colors"
            style={{
              borderColor: 'var(--window-document-border)',
              borderWidth: '2px',
              borderStyle: 'solid',
              background: filterType === "all" ? 'var(--tone-accent-strong)' : 'var(--window-document-bg)',
              color: filterType === "all" ? 'var(--window-document-text)' : 'var(--window-document-text)',
            }}
          >
            All
          </button>
          <button
            onClick={() => setFilterType("email")}
            className="px-4 py-2 text-xs font-bold transition-colors"
            style={{
              borderColor: 'var(--window-document-border)',
              borderWidth: '2px',
              borderStyle: 'solid',
              background: filterType === "email" ? 'var(--tone-accent-strong)' : 'var(--window-document-bg)',
              color: filterType === "email" ? 'var(--window-document-text)' : 'var(--window-document-text)',
            }}
          >
            Email
          </button>
          <button
            onClick={() => setFilterType("pdf")}
            className="px-4 py-2 text-xs font-bold transition-colors"
            style={{
              borderColor: 'var(--window-document-border)',
              borderWidth: '2px',
              borderStyle: 'solid',
              background: filterType === "pdf" ? 'var(--tone-accent-strong)' : 'var(--window-document-bg)',
              color: filterType === "pdf" ? 'var(--window-document-text)' : 'var(--window-document-text)',
            }}
          >
            PDF
          </button>

          {/* Separator */}
          <div className="w-px h-8 mx-2" style={{ background: 'var(--window-document-border)' }} />

          {/* Status Filters */}
          <button
            onClick={() => setActiveTab("active")}
            className="px-4 py-2 text-xs font-bold transition-colors"
            style={getTabButtonStyle("active")}
          >
            Active ({counts.active})
          </button>
          <button
            onClick={() => setActiveTab("inactive")}
            className="px-4 py-2 text-xs font-bold transition-colors"
            style={getTabButtonStyle("inactive")}
          >
            Inactive ({counts.inactive})
          </button>
        </div>

        {/* Row 2: Smart Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1">
            <Filter size={14} style={{ color: 'var(--neutral-gray)' }} />
            <span className="text-xs font-bold" style={{ color: 'var(--neutral-gray)' }}>
              Smart Filters:
            </span>
          </div>

          {/* Category Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setShowCategoryDropdown(!showCategoryDropdown);
                setShowPropertyDropdown(false);
              }}
              className="px-3 py-2 text-xs font-bold transition-colors flex items-center gap-2"
              style={{
                borderColor: categoryFilter !== "all" ? 'var(--tone-accent-strong)' : 'var(--window-document-border)',
                borderWidth: '2px',
                borderStyle: 'solid',
                background: categoryFilter !== "all" ? 'var(--tone-accent-strong)' : 'var(--window-document-bg)',
                color: categoryFilter !== "all" ? 'var(--window-document-text)' : 'var(--window-document-text)',
              }}
            >
              <Tag size={12} />
              {categoryOptions.find(o => o.value === categoryFilter)?.label}
              <ChevronDown size={12} />
            </button>

            {showCategoryDropdown && (
              <div
                className="absolute top-full left-0 mt-1 border-2 shadow-lg z-50 max-h-80 overflow-y-auto"
                style={{
                  background: 'var(--window-document-bg)',
                  borderColor: 'var(--window-document-border)',
                  minWidth: '200px',
                }}
              >
                {categoryOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setCategoryFilter(option.value);
                      setShowCategoryDropdown(false);
                    }}
                    className="w-full px-3 py-2 text-xs text-left hover:bg-opacity-20 transition-colors flex items-center gap-2"
                    style={{
                      background: categoryFilter === option.value ? 'rgba(107, 70, 193, 0.1)' : 'transparent',
                      color: 'var(--window-document-text)',
                    }}
                    onMouseEnter={(e) => {
                      if (categoryFilter !== option.value) {
                        e.currentTarget.style.background = 'var(--desktop-menu-hover)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (categoryFilter !== option.value) {
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    <span className={categoryFilter === option.value ? "font-bold" : ""}>
                      {option.label}
                    </span>
                    {categoryFilter === option.value && (
                      <Check className="ml-auto h-3 w-3" style={{ color: "var(--tone-accent-strong)" }} />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Property Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setShowPropertyDropdown(!showPropertyDropdown);
                setShowCategoryDropdown(false);
              }}
              className="px-3 py-2 text-xs font-bold transition-colors flex items-center gap-2"
              style={{
                borderColor: propertyFilter !== "all" ? 'var(--tone-accent-strong)' : 'var(--window-document-border)',
                borderWidth: '2px',
                borderStyle: 'solid',
                background: propertyFilter !== "all" ? 'var(--tone-accent-strong)' : 'var(--window-document-bg)',
                color: propertyFilter !== "all" ? 'var(--window-document-text)' : 'var(--window-document-text)',
              }}
            >
              <Shield size={12} />
              {propertyOptions.find(o => o.value === propertyFilter)?.label}
              <ChevronDown size={12} />
            </button>

            {showPropertyDropdown && (
              <div
                className="absolute top-full left-0 mt-1 border-2 shadow-lg z-50"
                style={{
                  background: 'var(--window-document-bg)',
                  borderColor: 'var(--window-document-border)',
                  minWidth: '220px',
                }}
              >
                {propertyOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setPropertyFilter(option.value);
                      setShowPropertyDropdown(false);
                    }}
                    className="w-full px-3 py-2.5 text-xs text-left hover:bg-opacity-20 transition-colors"
                    style={{
                      background: propertyFilter === option.value ? 'rgba(107, 70, 193, 0.1)' : 'transparent',
                      color: 'var(--window-document-text)',
                    }}
                    onMouseEnter={(e) => {
                      if (propertyFilter !== option.value) {
                        e.currentTarget.style.background = 'var(--desktop-menu-hover)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (propertyFilter !== option.value) {
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ background: option.color }}
                      />
                      <span className={propertyFilter === option.value ? "font-bold" : ""}>
                        {option.label}
                      </span>
                      {propertyFilter === option.value && (
                        <Check className="ml-auto h-3 w-3" style={{ color: "var(--tone-accent-strong)" }} />
                      )}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--neutral-gray)', paddingLeft: '16px' }}>
                      {option.desc}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Template Set Filter */}
          {templateSets && templateSets.length > 0 && (
            <div className="relative">
              <button
                onClick={() => {
                  setShowTemplateSetDropdown(!showTemplateSetDropdown);
                  setShowCategoryDropdown(false);
                  setShowPropertyDropdown(false);
                }}
                className="px-3 py-2 text-xs font-bold transition-colors flex items-center gap-2"
                style={{
                  borderColor: templateSetFilter !== "all" ? 'var(--tone-accent-strong)' : 'var(--window-document-border)',
                  borderWidth: '2px',
                  borderStyle: 'solid',
                  background: templateSetFilter !== "all" ? 'var(--tone-accent-strong)' : 'var(--window-document-bg)',
                  color: templateSetFilter !== "all" ? 'var(--window-document-text)' : 'var(--window-document-text)',
                }}
              >
                <Layers size={12} />
                {templateSetFilter === "all"
                  ? "All Template Sets"
                  : templateSets.find(s => s._id === templateSetFilter)?.name || "Template Set"}
                <ChevronDown size={12} />
              </button>

              {showTemplateSetDropdown && (
                <div
                  className="absolute top-full left-0 mt-1 border-2 shadow-lg z-50 max-h-96 overflow-y-auto"
                  style={{
                    borderColor: 'var(--window-document-border)',
                    background: 'var(--window-document-bg)',
                    minWidth: '220px',
                  }}
                >
                  {/* All option */}
                  <button
                    onClick={() => {
                      setTemplateSetFilter("all");
                      setShowTemplateSetDropdown(false);
                    }}
                    className="w-full px-3 py-2.5 text-xs text-left hover:bg-opacity-20 transition-colors"
                    style={{
                      background: templateSetFilter === "all" ? 'rgba(107, 70, 193, 0.1)' : 'transparent',
                      color: 'var(--window-document-text)',
                    }}
                    onMouseEnter={(e) => {
                      if (templateSetFilter !== "all") {
                        e.currentTarget.style.background = 'var(--desktop-menu-hover)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (templateSetFilter !== "all") {
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span className={templateSetFilter === "all" ? "font-bold" : ""}>
                        All Template Sets
                      </span>
                      {templateSetFilter === "all" && (
                        <Check className="ml-auto h-3 w-3" style={{ color: "var(--tone-accent-strong)" }} />
                      )}
                    </div>
                  </button>

                  {/* Template set options */}
                  {templateSets.map((set) => (
                    <button
                      key={set._id}
                      onClick={() => {
                        setTemplateSetFilter(set._id);
                        setShowTemplateSetDropdown(false);
                      }}
                      className="w-full px-3 py-2.5 text-xs text-left hover:bg-opacity-20 transition-colors"
                      style={{
                        background: templateSetFilter === set._id ? 'rgba(107, 70, 193, 0.1)' : 'transparent',
                        color: 'var(--window-document-text)',
                      }}
                      onMouseEnter={(e) => {
                        if (templateSetFilter !== set._id) {
                          e.currentTarget.style.background = 'var(--desktop-menu-hover)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (templateSetFilter !== set._id) {
                          e.currentTarget.style.background = 'transparent';
                        }
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <Layers size={12} style={{ color: 'var(--tone-accent-strong)' }} />
                        <span className={templateSetFilter === set._id ? "font-bold" : ""}>
                          {set.name}
                        </span>
                        {templateSetFilter === set._id && (
                          <Check className="ml-auto h-3 w-3" style={{ color: "var(--tone-accent-strong)" }} />
                        )}
                      </div>
                      {set.description && (
                        <div className="text-xs mt-1" style={{ color: 'var(--neutral-gray)', paddingLeft: '20px' }}>
                          {set.description}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="px-3 py-2 text-xs font-bold transition-colors flex items-center gap-1.5"
              style={{
                borderColor: 'var(--error)',
                borderWidth: '2px',
                borderStyle: 'solid',
                background: 'rgba(239, 68, 68, 0.1)',
                color: 'var(--error)',
              }}
              title="Clear all active filters"
            >
              <X size={12} />
              Clear Filters
            </button>
          )}

          {/* Results Count */}
          <div className="ml-auto text-xs font-bold" style={{ color: 'var(--neutral-gray)' }}>
            {filteredTemplates.length} {filteredTemplates.length === 1 ? 'template' : 'templates'}
          </div>
        </div>
      </div>

      {/* Templates List or Empty State */}
      <div className="flex-1 overflow-y-auto">
        {filteredTemplates.length === 0 ? (
          <div className="p-4">
            <div className="border-2 p-8 text-center" style={{ borderColor: 'var(--window-document-border)', background: 'var(--desktop-shell-accent)' }}>
              <FileText size={48} className="mx-auto mb-4" style={{ color: 'var(--neutral-gray)', opacity: 0.3 }} />
              <h4 className="text-sm font-bold mb-2" style={{ color: 'var(--window-document-text)' }}>
                {activeTab === "all" && "No Custom Templates Yet"}
                {activeTab === "active" && "No Active Templates"}
                {activeTab === "inactive" && "No Inactive Templates"}
              </h4>
              <p className="text-xs mb-4" style={{ color: 'var(--neutral-gray)' }}>
                {activeTab === "all" && "Duplicate templates from Email Library or PDF Library to customize them for your organization."}
                {activeTab === "active" && "No templates are currently published. Publish templates to make them available for use."}
                {activeTab === "inactive" && "No draft templates. Duplicated templates start as drafts until you publish them."}
              </p>
              {activeTab === "all" && (
                <button
                  onClick={onCreateTemplate}
                  className="px-4 py-2 text-xs font-bold border-2 transition-colors hover:brightness-95"
                  style={{
                    borderColor: 'var(--window-document-border)',
                    background: 'var(--tone-accent-strong)',
                    color: 'white',
                  }}
                >
                  <Plus size={14} className="inline mr-2" />
                  Browse Libraries
                </button>
              )}
            </div>
          </div>
        ) : (
          <TemplatesList
            templates={filteredTemplates as unknown as Parameters<typeof TemplatesList>[0]['templates']}
            onEditTemplate={onEditTemplate}
            onViewSchema={onViewSchema}
            templateType="all"
            templateUsageData={templateUsageData}
          />
        )}
      </div>
    </div>
  );
}
