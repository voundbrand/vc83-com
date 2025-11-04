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
    ...(crmOrganizations?.map((o: any) => ({
      id: o._id,
      name: o.name,
      type: "crm_organization",
      subtype: "organization",
    })) || []),
    ...(crmContacts?.map((c: any) => ({
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
      <div className="border-b-2 p-3" style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg-light)' }}>
        <h3 className="text-xs font-bold" style={{ color: 'var(--win95-text)' }}>OBJECTS</h3>
        <p className="mt-1 text-[10px]" style={{ color: 'var(--neutral-gray)' }}>
          Add objects to your workflow
        </p>
      </div>

      {/* Search */}
      <div className="border-b-2 p-3" style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg)' }}>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2" style={{ color: 'var(--neutral-gray)' }} />
          <input
            type="text"
            placeholder="Search objects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="retro-input w-full py-1 pl-7 pr-2 text-xs"
          />
        </div>

        {/* Type Filter */}
        <div className="mt-2 flex flex-wrap gap-1">
          <button
            onClick={() => setObjectTypeFilter("all")}
            className={`retro-button px-2 py-1 text-[10px] ${
              objectTypeFilter === "all" ? "shadow-inner" : ""
            }`}
          >
            All
          </button>
          <button
            onClick={() => setObjectTypeFilter("product")}
            className={`retro-button px-2 py-1 text-[10px] ${
              objectTypeFilter === "product" ? "shadow-inner" : ""
            }`}
          >
            Products
          </button>
          <button
            onClick={() => setObjectTypeFilter("form")}
            className={`retro-button px-2 py-1 text-[10px] ${
              objectTypeFilter === "form" ? "shadow-inner" : ""
            }`}
          >
            Forms
          </button>
          <button
            onClick={() => setObjectTypeFilter("checkout_instance")}
            className={`retro-button px-2 py-1 text-[10px] ${
              objectTypeFilter === "checkout_instance" ? "shadow-inner" : ""
            }`}
          >
            Checkouts
          </button>
          <button
            onClick={() => setObjectTypeFilter("crm_organization")}
            className={`retro-button px-2 py-1 text-[10px] ${
              objectTypeFilter === "crm_organization" ? "shadow-inner" : ""
            }`}
          >
            CRM Orgs
          </button>
          <button
            onClick={() => setObjectTypeFilter("crm_contact")}
            className={`retro-button px-2 py-1 text-[10px] ${
              objectTypeFilter === "crm_contact" ? "shadow-inner" : ""
            }`}
          >
            CRM Contacts
          </button>
        </div>
      </div>

      {/* Object List */}
      <div className="flex-1 overflow-auto p-3" style={{ background: 'var(--win95-bg)' }}>
        {filteredObjects.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-xs" style={{ color: 'var(--neutral-gray)' }}>No objects found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredObjects.map((obj) => {
              const selected = isSelected(obj.id);
              return (
                <button
                  key={obj.id}
                  onClick={() => handleToggleObject(obj)}
                  className={`retro-button flex w-full items-center gap-2 p-2 text-left ${
                    selected ? "shadow-inner" : ""
                  }`}
                >
                  <div className="p-1" style={{
                    background: selected ? 'var(--win95-highlight)' : 'var(--win95-bg-light)',
                    color: selected ? '#ffffff' : 'var(--neutral-gray)'
                  }}>
                    {obj.type === "product" && <Package className="h-3 w-3" />}
                    {obj.type === "form" && <FileText className="h-3 w-3" />}
                    {(obj.type === "checkout" || obj.type === "checkout_instance") && <CreditCard className="h-3 w-3" />}
                    {obj.type === "crm_organization" && <Building2 className="h-3 w-3" />}
                    {obj.type === "crm_contact" && <User className="h-3 w-3" />}
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-bold" style={{ color: 'var(--win95-text)' }}>
                      {obj.name}
                    </div>
                    <div className="text-[10px]" style={{ color: 'var(--neutral-gray)' }}>{obj.type}</div>
                  </div>
                  {selected ? (
                    <Check className="h-3 w-3" style={{ color: 'var(--win95-highlight)' }} />
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
      <div className="border-t-2 p-3" style={{ borderColor: 'var(--win95-border)', background: 'var(--win95-bg-light)' }}>
        <div className="text-xs" style={{ color: 'var(--win95-text)' }}>
          <strong>{selectedObjects.length}</strong> object
          {selectedObjects.length !== 1 ? "s" : ""} selected
        </div>
      </div>
    </div>
  );
}
