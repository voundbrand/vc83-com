/**
 * OBJECT MAPPING MODAL
 *
 * Allows users to map template requirements to their actual objects
 * when creating a workflow from a template.
 */

"use client";

import React, { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { X, Package, FileText, Calendar, Loader2 } from "lucide-react";

interface ObjectRequirement {
  objectType: string;
  required: boolean;
  role: string;
  description?: string;
}

interface ObjectMappingModalProps {
  templateName: string;
  templateDescription?: string;
  objectRequirements: ObjectRequirement[];
  organizationId: string;
  sessionId: string;
  onConfirm: (mappings: Record<string, string>) => void;
  onCancel: () => void;
}

export function ObjectMappingModal({
  templateName,
  templateDescription,
  objectRequirements,
  organizationId,
  sessionId,
  onConfirm,
  onCancel,
}: ObjectMappingModalProps) {
  const [mappings, setMappings] = useState<Record<string, string>>({});

  // Fetch available objects by type
  const products = useQuery(
    api.productOntology.getProducts,
    sessionId && organizationId
      ? { sessionId, organizationId: organizationId as Id<"organizations"> }
      : "skip"
  );

  const forms = useQuery(
    api.formsOntology.getForms,
    sessionId && organizationId
      ? { sessionId, organizationId: organizationId as Id<"organizations"> }
      : "skip"
  );

  const events = useQuery(
    api.eventOntology.getEvents,
    sessionId && organizationId
      ? { sessionId, organizationId: organizationId as Id<"organizations"> }
      : "skip"
  );

  const handleMappingChange = (objectType: string, objectId: string) => {
    setMappings((prev) => ({
      ...prev,
      [objectType]: objectId,
    }));
  };

  const handleConfirm = () => {
    // Validate all required mappings are selected
    const requiredTypes = objectRequirements
      .filter((req) => req.required)
      .map((req) => req.objectType);

    const missingMappings = requiredTypes.filter((type) => !mappings[type]);

    if (missingMappings.length > 0) {
      alert(`Please select all required objects: ${missingMappings.join(", ")}`);
      return;
    }

    onConfirm(mappings);
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case "product":
        return <Package className="h-4 w-4" />;
      case "form":
        return <FileText className="h-4 w-4" />;
      case "event":
        return <Calendar className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const getObjectsForType = (type: string) => {
    switch (type) {
      case "product":
        return products || [];
      case "form":
        return forms || [];
      case "event":
        return events || [];
      default:
        return [];
    }
  };

  const isLoading = products === undefined || forms === undefined || events === undefined;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0, 0, 0, 0.7)" }}
    >
      <div
        className="w-full max-w-2xl border-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)]"
        style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
      >
        {/* Title Bar */}
        <div
          className="flex items-center justify-between border-b-4 px-4 py-2"
          style={{ borderColor: "var(--win95-border)", background: "var(--win95-highlight)" }}
        >
          <h3 className="text-sm font-bold text-white">Configure Workflow from Template</h3>
          <button
            onClick={onCancel}
            className="border-2 px-2 py-0.5 text-xs font-bold text-white hover:bg-white hover:text-black transition-colors"
            style={{ borderColor: "white" }}
          >
            <X className="h-3 w-3" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Template Info */}
          <div className="mb-6">
            <h4 className="text-sm font-bold mb-1" style={{ color: "var(--win95-text)" }}>
              {templateName}
            </h4>
            {templateDescription && (
              <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                {templateDescription}
              </p>
            )}
          </div>

          {/* Instructions */}
          <div
            className="mb-6 border-2 p-3"
            style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)" }}
          >
            <p className="text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>
              Map Template Requirements to Your Objects
            </p>
            <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
              This template needs specific objects to work. Select your existing objects from the
              dropdowns below, or you can create new objects later in the builder.
            </p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--win95-highlight)" }} />
            </div>
          ) : (
            <div className="space-y-4">
              {objectRequirements.map((requirement) => {
                const objects = getObjectsForType(requirement.objectType);
                const hasObjects = objects.length > 0;

                return (
                  <div
                    key={requirement.objectType}
                    className="border-2 p-4"
                    style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)" }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="border-2 p-2"
                        style={{
                          borderColor: "var(--win95-border)",
                          background: "var(--win95-bg-light)",
                        }}
                      >
                        {getIconForType(requirement.objectType)}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h5 className="text-xs font-bold" style={{ color: "var(--win95-text)" }}>
                            {requirement.objectType.charAt(0).toUpperCase() +
                              requirement.objectType.slice(1)}
                          </h5>
                          {requirement.required && (
                            <span
                              className="text-[10px] px-2 py-0.5 font-bold"
                              style={{ background: "var(--error)", color: "white" }}
                            >
                              Required
                            </span>
                          )}
                          <span
                            className="text-[10px] px-2 py-0.5"
                            style={{
                              background: "var(--win95-bg-light)",
                              border: "1px solid var(--win95-border)",
                              color: "var(--neutral-gray)",
                            }}
                          >
                            {requirement.role}
                          </span>
                        </div>

                        {requirement.description && (
                          <p className="text-xs mb-2" style={{ color: "var(--neutral-gray)" }}>
                            {requirement.description}
                          </p>
                        )}

                        <select
                          value={mappings[requirement.objectType] || ""}
                          onChange={(e) =>
                            handleMappingChange(requirement.objectType, e.target.value)
                          }
                          className="retro-input w-full py-1 px-2 text-xs"
                        >
                          <option value="">
                            {hasObjects
                              ? `Select ${requirement.objectType}...`
                              : `No ${requirement.objectType}s available - add in builder`}
                          </option>
                          {objects.map((obj) => (
                            <option key={obj._id} value={obj._id}>
                              {obj.name || `Unnamed ${requirement.objectType}`}
                            </option>
                          ))}
                        </select>

                        {!hasObjects && (
                          <p
                            className="text-[10px] mt-1"
                            style={{ color: "var(--warning)" }}
                          >
                            ⚠️ You can skip this and add {requirement.objectType}s in the builder
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 flex items-center justify-end gap-2">
            <button onClick={onCancel} className="retro-button px-4 py-2 text-xs font-bold">
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={isLoading}
              className="retro-button px-4 py-2 text-xs font-bold disabled:opacity-50"
              style={{ background: "var(--win95-highlight)", color: "white" }}
            >
              Create Workflow
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
