"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import { Loader2, Plus, FileText, Filter, X, ChevronDown, Tag, Shield } from "lucide-react";
import type { Id } from "../../../../convex/_generated/dataModel";
import { TemplatesList } from "./templates-list";
import { isValidEmailTemplateType, isValidPdfTemplateType } from "@/templates/template-types";
import { TemplateUsageBadges, type TemplateUsageData } from "@/components/template-usage-badges";

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
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showPropertyDropdown, setShowPropertyDropdown] = useState(false);

  // Fetch ALL templates (both organization and system templates)
  const templates = useQuery(
    api.templateOntology.getAllTemplatesIncludingSystem,
    sessionId && currentOrg ? { sessionId, organizationId: currentOrg.id as Id<"organizations"> } : "skip"
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
        const category = (t.customProperties as any)?.category;
        const subtype = t.subtype;
        // Match category or subtype (some templates store category in different fields)
        return category === categoryFilter || subtype === categoryFilter;
      });
    }

    // Filter by property
    if (propertyFilter === "system") {
      filtered = filtered.filter((t) => (t as any).isSystemTemplate === true);
    } else if (propertyFilter === "schema") {
      filtered = filtered.filter((t) => {
        const hasSchema = !!(t.customProperties?.templateSchema || t.customProperties?.emailTemplateSchema);
        return hasSchema;
      });
    } else if (propertyFilter === "default") {
      filtered = filtered.filter((t) => (t.customProperties as any)?.isDefault === true);
    }

    return filtered;
  }, [templates, activeTab, filterType, categoryFilter, propertyFilter]);

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
        <Loader2 size={32} className="animate-spin" style={{ color: 'var(--win95-highlight)' }} />
      </div>
    );
  }

  const getTabButtonStyle = (tab: TabType) => ({
    borderColor: 'var(--win95-border)',
    borderWidth: '2px',
    borderStyle: 'solid',
    background: activeTab === tab ? 'var(--win95-highlight)' : 'var(--win95-bg-light)',
    color: activeTab === tab ? 'white' : 'var(--win95-text)',
  });

  const categoryOptions: Array<{ value: CategoryFilter; label: string; icon?: string }> = [
    { value: "all", label: "All Categories" },
    { value: "ticket", label: "Ticket", icon: "🎫" },
    { value: "invoice", label: "Invoice", icon: "📄" },
    { value: "receipt", label: "Receipt", icon: "🧾" },
    { value: "event", label: "Event", icon: "📅" },
    { value: "newsletter", label: "Newsletter", icon: "📰" },
    { value: "transactional", label: "Transactional", icon: "💼" },
    { value: "marketing", label: "Marketing", icon: "📣" },
    { value: "support", label: "Support", icon: "💬" },
    { value: "registration", label: "Registration", icon: "📝" },
    { value: "checkout", label: "Checkout", icon: "🛒" },
    { value: "survey", label: "Survey", icon: "📊" },
    { value: "leadmagnet", label: "Lead Magnet", icon: "🧲" },
    { value: "quote", label: "Quote", icon: "💰" },
    { value: "badge", label: "Badge", icon: "🏷️" },
    { value: "certificate", label: "Certificate", icon: "🎓" },
    { value: "eventdoc", label: "Event Document", icon: "📋" },
    { value: "universal", label: "Universal", icon: "🌐" },
    { value: "luxury", label: "Luxury", icon: "💎" },
    { value: "product", label: "Product", icon: "📦" },
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
      <div className="p-4 border-b-2 space-y-3" style={{ borderColor: 'var(--win95-border)' }}>
        {/* Row 1: Type and Status Filters */}
        <div className="flex items-center gap-2">
          {/* Template Type Filters */}
          <button
            onClick={() => setFilterType("all")}
            className="px-4 py-2 text-xs font-bold transition-colors"
            style={{
              borderColor: 'var(--win95-border)',
              borderWidth: '2px',
              borderStyle: 'solid',
              background: filterType === "all" ? 'var(--win95-highlight)' : 'var(--win95-bg-light)',
              color: filterType === "all" ? 'white' : 'var(--win95-text)',
            }}
          >
            All
          </button>
          <button
            onClick={() => setFilterType("email")}
            className="px-4 py-2 text-xs font-bold transition-colors"
            style={{
              borderColor: 'var(--win95-border)',
              borderWidth: '2px',
              borderStyle: 'solid',
              background: filterType === "email" ? 'var(--win95-highlight)' : 'var(--win95-bg-light)',
              color: filterType === "email" ? 'white' : 'var(--win95-text)',
            }}
          >
            Email
          </button>
          <button
            onClick={() => setFilterType("pdf")}
            className="px-4 py-2 text-xs font-bold transition-colors"
            style={{
              borderColor: 'var(--win95-border)',
              borderWidth: '2px',
              borderStyle: 'solid',
              background: filterType === "pdf" ? 'var(--win95-highlight)' : 'var(--win95-bg-light)',
              color: filterType === "pdf" ? 'white' : 'var(--win95-text)',
            }}
          >
            PDF
          </button>

          {/* Separator */}
          <div className="w-px h-8 mx-2" style={{ background: 'var(--win95-border)' }} />

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
                borderColor: categoryFilter !== "all" ? 'var(--win95-highlight)' : 'var(--win95-border)',
                borderWidth: '2px',
                borderStyle: 'solid',
                background: categoryFilter !== "all" ? 'rgba(107, 70, 193, 0.1)' : 'var(--win95-bg-light)',
                color: 'var(--win95-text)',
              }}
            >
              <Tag size={12} />
              {categoryOptions.find(o => o.value === categoryFilter)?.label}
              {categoryFilter !== "all" && (
                <span className="ml-1 px-1.5 py-0.5 text-xs rounded" style={{ background: 'var(--win95-highlight)', color: 'white' }}>
                  ✓
                </span>
              )}
              <ChevronDown size={12} />
            </button>

            {showCategoryDropdown && (
              <div
                className="absolute top-full left-0 mt-1 border-2 shadow-lg z-50 max-h-80 overflow-y-auto"
                style={{
                  background: 'var(--win95-bg)',
                  borderColor: 'var(--win95-border)',
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
                      color: 'var(--win95-text)',
                    }}
                    onMouseEnter={(e) => {
                      if (categoryFilter !== option.value) {
                        e.currentTarget.style.background = 'var(--win95-hover-light)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (categoryFilter !== option.value) {
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    {option.icon && <span>{option.icon}</span>}
                    <span className={categoryFilter === option.value ? "font-bold" : ""}>
                      {option.label}
                    </span>
                    {categoryFilter === option.value && (
                      <span className="ml-auto" style={{ color: 'var(--win95-highlight)' }}>✓</span>
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
                borderColor: propertyFilter !== "all" ? 'var(--win95-highlight)' : 'var(--win95-border)',
                borderWidth: '2px',
                borderStyle: 'solid',
                background: propertyFilter !== "all" ? 'rgba(107, 70, 193, 0.1)' : 'var(--win95-bg-light)',
                color: 'var(--win95-text)',
              }}
            >
              <Shield size={12} />
              {propertyOptions.find(o => o.value === propertyFilter)?.label}
              {propertyFilter !== "all" && (
                <span className="ml-1 px-1.5 py-0.5 text-xs rounded" style={{ background: 'var(--win95-highlight)', color: 'white' }}>
                  ✓
                </span>
              )}
              <ChevronDown size={12} />
            </button>

            {showPropertyDropdown && (
              <div
                className="absolute top-full left-0 mt-1 border-2 shadow-lg z-50"
                style={{
                  background: 'var(--win95-bg)',
                  borderColor: 'var(--win95-border)',
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
                      color: 'var(--win95-text)',
                    }}
                    onMouseEnter={(e) => {
                      if (propertyFilter !== option.value) {
                        e.currentTarget.style.background = 'var(--win95-hover-light)';
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
                        <span className="ml-auto" style={{ color: 'var(--win95-highlight)' }}>✓</span>
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
            <div className="border-2 p-8 text-center" style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg-light)' }}>
              <FileText size={48} className="mx-auto mb-4" style={{ color: 'var(--neutral-gray)', opacity: 0.3 }} />
              <h4 className="text-sm font-bold mb-2" style={{ color: 'var(--win95-text)' }}>
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
                    borderColor: 'var(--win95-border)',
                    background: 'var(--win95-highlight)',
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
