/**
 * OBJECT SELECTOR PANEL
 *
 * Left panel for selecting objects to add to the workflow.
 * Lists available products, forms, checkouts, and allows adding them.
 */

"use client";

import React, { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Package, FileText, CreditCard, Plus, Check, Search, Building2, User } from "lucide-react";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";

// Workflow object reference type
interface WorkflowObject {
  objectId: Id<"objects">;
  objectType: string;
  role: string;
  config?: Record<string, unknown>;
}

interface ObjectSelectorPanelProps {
  organizationId: string;
  sessionId: string;
  selectedObjects: WorkflowObject[];
  onAddObject: (object: WorkflowObject) => void;
  onRemoveObject: (objectId: string) => void;
}

export function ObjectSelectorPanel({
  organizationId,
  sessionId,
  selectedObjects,
  onAddObject,
  onRemoveObject,
}: ObjectSelectorPanelProps) {
  const { t } = useNamespaceTranslations("ui.workflows");
  const [searchQuery, setSearchQuery] = useState("");
  const [objectTypeFilter, setObjectTypeFilter] = useState<string>("all");

  // Query available objects
  const products = useQuery(api.productOntology.getProducts, {
    sessionId,
    organizationId: organizationId as Id<"organizations">,
  });

  const forms = useQuery(api.formsOntology.getForms, {
    sessionId,
    organizationId: organizationId as Id<"organizations">,
  });

  const checkouts = useQuery(api.checkoutOntology.getCheckoutInstances, {
    sessionId,
    organizationId: organizationId as Id<"organizations">,
  });

  // Query CRM objects
  const crmOrganizations = useQuery(api.crmOntology.getCrmOrganizations, {
    sessionId,
    organizationId: organizationId as Id<"organizations">,
  });

  const crmContacts = useQuery(api.crmOntology.getContacts, {
    sessionId,
    organizationId: organizationId as Id<"organizations">,
  });

  // Combine all object types
  const availableObjects = [
    ...(products?.map((p) => ({
      id: p._id,
      name: p.name,
      type: "product",
      subtype: p.subtype,
    })) || []),
    ...(forms?.map((f) => ({
      id: f._id,
      name: f.name,
      type: "form",
      subtype: f.subtype,
    })) || []),
    ...(checkouts?.map((c) => ({
      id: c._id,
      name: c.name,
      type: c.type || "checkout_instance", // Use actual type from database
      subtype: c.subtype,
    })) || []),
    ...(crmOrganizations?.map((o) => ({
      id: o._id,
      name: o.name,
      type: "crm_organization",
      subtype: "organization",
    })) || []),
    ...(crmContacts?.map((c) => ({
      id: c._id,
      name: c.name || `${c.customProperties?.firstName || ""} ${c.customProperties?.lastName || ""}`.trim() || c.customProperties?.email || "Unknown",
      type: "crm_contact",
      subtype: "contact",
    })) || []),
  ];

  const filteredObjects = availableObjects.filter((obj) => {
    const matchesSearch = obj.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = objectTypeFilter === "all" || obj.type === objectTypeFilter;
    return matchesSearch && matchesType;
  });

  const isSelected = (objectId: string) => {
    return selectedObjects.some((o) => o.objectId === objectId);
  };

  const handleToggleObject = (obj: { id: string; name: string; type: string; subtype?: string }) => {
    if (isSelected(obj.id)) {
      onRemoveObject(obj.id);
    } else {
      onAddObject({
        objectId: obj.id as Id<"objects">,
        objectType: obj.type,
        role: "primary", // Default role
        config: {},
      });
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b-2 p-3" style={{ borderColor: 'var(--window-document-border)', background: 'var(--window-document-bg-elevated)' }}>
        <h3 className="text-xs font-bold" style={{ color: 'var(--window-document-text)' }}>{t("ui.workflows.objectSelector.title")}</h3>
        <p className="mt-1 text-[10px]" style={{ color: 'var(--neutral-gray)' }}>
          {t("ui.workflows.objectSelector.description")}
        </p>
      </div>

      {/* Search */}
      <div className="border-b-2 p-3" style={{ borderColor: 'var(--window-document-border)', background: 'var(--window-document-bg)' }}>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2" style={{ color: 'var(--neutral-gray)' }} />
          <input
            type="text"
            placeholder={t("ui.workflows.objectSelector.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="retro-input w-full py-1 pl-7 pr-2 text-xs"
          />
        </div>

        {/* Type Filter */}
        <div className="mt-2 flex flex-wrap gap-1">
          <button
            onClick={() => setObjectTypeFilter("all")}
            className={`desktop-interior-button px-2 py-1 text-[10px] ${
              objectTypeFilter === "all" ? "shadow-inner" : ""
            }`}
          >
            {t("ui.workflows.objectSelector.filters.all")}
          </button>
          <button
            onClick={() => setObjectTypeFilter("product")}
            className={`desktop-interior-button px-2 py-1 text-[10px] ${
              objectTypeFilter === "product" ? "shadow-inner" : ""
            }`}
          >
            {t("ui.workflows.objectSelector.filters.products")}
          </button>
          <button
            onClick={() => setObjectTypeFilter("form")}
            className={`desktop-interior-button px-2 py-1 text-[10px] ${
              objectTypeFilter === "form" ? "shadow-inner" : ""
            }`}
          >
            {t("ui.workflows.objectSelector.filters.forms")}
          </button>
          <button
            onClick={() => setObjectTypeFilter("checkout_instance")}
            className={`desktop-interior-button px-2 py-1 text-[10px] ${
              objectTypeFilter === "checkout_instance" ? "shadow-inner" : ""
            }`}
          >
            {t("ui.workflows.objectSelector.filters.checkouts")}
          </button>
          <button
            onClick={() => setObjectTypeFilter("crm_organization")}
            className={`desktop-interior-button px-2 py-1 text-[10px] ${
              objectTypeFilter === "crm_organization" ? "shadow-inner" : ""
            }`}
          >
            {t("ui.workflows.objectSelector.filters.crmOrgs")}
          </button>
          <button
            onClick={() => setObjectTypeFilter("crm_contact")}
            className={`desktop-interior-button px-2 py-1 text-[10px] ${
              objectTypeFilter === "crm_contact" ? "shadow-inner" : ""
            }`}
          >
            {t("ui.workflows.objectSelector.filters.crmContacts")}
          </button>
        </div>
      </div>

      {/* Object List */}
      <div className="flex-1 overflow-auto p-3" style={{ background: 'var(--window-document-bg)' }}>
        {filteredObjects.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-xs" style={{ color: 'var(--neutral-gray)' }}>{t("ui.workflows.objectSelector.noObjectsFound")}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredObjects.map((obj) => {
              const selected = isSelected(obj.id);
              return (
                <button
                  key={obj.id}
                  onClick={() => handleToggleObject(obj)}
                  className={`desktop-interior-button flex w-full items-center gap-2 p-2 text-left ${
                    selected ? "shadow-inner" : ""
                  }`}
                >
                  <div className="p-1" style={{
                    background: selected ? 'var(--tone-accent)' : 'var(--window-document-bg-elevated)',
                    color: selected ? '#ffffff' : 'var(--neutral-gray)'
                  }}>
                    {obj.type === "product" && <Package className="h-3 w-3" />}
                    {obj.type === "form" && <FileText className="h-3 w-3" />}
                    {(obj.type === "checkout" || obj.type === "checkout_instance") && <CreditCard className="h-3 w-3" />}
                    {obj.type === "crm_organization" && <Building2 className="h-3 w-3" />}
                    {obj.type === "crm_contact" && <User className="h-3 w-3" />}
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-bold" style={{ color: 'var(--window-document-text)' }}>
                      {obj.name}
                    </div>
                    <div className="text-[10px]" style={{ color: 'var(--neutral-gray)' }}>{obj.type}</div>
                  </div>
                  {selected ? (
                    <Check className="h-3 w-3" style={{ color: 'var(--tone-accent)' }} />
                  ) : (
                    <Plus className="h-3 w-3" style={{ color: 'var(--neutral-gray)' }} />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected Count */}
      <div className="border-t-2 p-3" style={{ borderColor: 'var(--window-document-border)', background: 'var(--window-document-bg-elevated)' }}>
        <div className="text-xs" style={{ color: 'var(--window-document-text)' }}>
          {t("ui.workflows.objectSelector.selectedCount", { count: selectedObjects.length })}
        </div>
      </div>
    </div>
  );
}
