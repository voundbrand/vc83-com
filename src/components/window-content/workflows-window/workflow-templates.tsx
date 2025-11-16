/**
 * WORKFLOW TEMPLATES
 *
 * Shows available workflow templates for the current organization.
 * Org owners can browse and create workflows from these templates.
 */

"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { Zap, Copy, Loader2, AlertCircle } from "lucide-react";
import { ObjectMappingModal } from "./object-mapping-modal";

interface WorkflowTemplatesProps {
  organizationId: string;
  sessionId: string;
  onCreateFromTemplate?: (templateId: string, objectMappings: Record<string, string>) => void;
}

export function WorkflowTemplates({
  organizationId,
  sessionId,
  onCreateFromTemplate,
}: WorkflowTemplatesProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<{
    id: string;
    name: string;
    description?: string;
    objectRequirements: any[];
  } | null>(null);

  // Fetch available workflow templates for this organization
  const templates = useQuery(
    api.workflowTemplateAvailability.getAvailableWorkflowTemplates,
    sessionId && organizationId
      ? {
          sessionId,
          organizationId: organizationId as Id<"organizations">,
        }
      : "skip"
  );

  const handleTemplateClick = (template: any) => {
    // Show modal with object requirements
    setSelectedTemplate({
      id: template._id,
      name: template.name,
      description: template.description,
      objectRequirements: template.customProperties?.objectRequirements || template.customProperties?.objects || [],
    });
  };

  const handleConfirmMapping = (objectMappings: Record<string, string>) => {
    if (selectedTemplate && onCreateFromTemplate) {
      onCreateFromTemplate(selectedTemplate.id, objectMappings);
    }
    setSelectedTemplate(null);
  };

  if (!sessionId || !organizationId) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="border-2 border-red-600 bg-red-50 p-4">
          <div className="flex items-start gap-2">
            <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm text-red-900">Authentication Required</h4>
              <p className="text-xs text-red-800 mt-1">
                Please log in to view workflow templates.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (templates === undefined) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 size={32} className="animate-spin text-purple-600" />
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="text-center">
          <Zap
            className="mx-auto h-16 w-16"
            style={{ color: "var(--neutral-gray)", opacity: 0.3 }}
          />
          <h3
            className="mt-4 text-sm font-bold"
            style={{ color: "var(--win95-text)" }}
          >
            No Templates Available
          </h3>
          <p className="mt-2 text-xs" style={{ color: "var(--neutral-gray)" }}>
            No workflow templates have been enabled for your organization yet.
            <br />
            Contact your administrator to enable workflow templates.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="mb-4">
        <h3 className="text-sm font-bold" style={{ color: "var(--win95-text)" }}>
          Available Workflow Templates
        </h3>
        <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
          Choose a template to create a new workflow
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => (
          <div
            key={template._id}
            className="border-2 p-4 hover:border-purple-500 transition-colors"
            style={{
              borderColor: "var(--win95-border)",
              background: "var(--win95-bg-light)",
            }}
          >
            {/* Template Icon */}
            <div className="mb-3">
              <div
                className="w-12 h-12 flex items-center justify-center text-2xl"
                style={{
                  background: "var(--win95-bg)",
                  border: "2px solid var(--win95-border)",
                }}
              >
                {template.customProperties?.icon || "⚡"}
              </div>
            </div>

            {/* Template Info */}
            <h4 className="text-sm font-bold mb-1" style={{ color: "var(--win95-text)" }}>
              {template.name}
            </h4>

            {template.description && (
              <p
                className="text-xs mb-3 line-clamp-2"
                style={{ color: "var(--neutral-gray)" }}
              >
                {template.description}
              </p>
            )}

            {/* Template Metadata */}
            <div className="flex flex-wrap gap-2 mb-3">
              {template.customProperties?.category && (
                <span
                  className="text-xs px-2 py-1"
                  style={{
                    background: "var(--win95-bg)",
                    border: "1px solid var(--win95-border)",
                  }}
                >
                  {template.customProperties.category}
                </span>
              )}
              <span
                className="text-xs px-2 py-1"
                style={{
                  background: "var(--win95-bg)",
                  border: "1px solid var(--win95-border)",
                }}
              >
                {template.customProperties?.code}
              </span>
            </div>

            {/* Use Template Button */}
            <button
              onClick={() => handleTemplateClick(template)}
              className="retro-button w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold"
            >
              <Copy className="h-3 w-3" />
              Use Template
            </button>
          </div>
        ))}
      </div>

      {/* Object Mapping Modal */}
      {selectedTemplate && (
        <ObjectMappingModal
          templateName={selectedTemplate.name}
          templateDescription={selectedTemplate.description}
          objectRequirements={selectedTemplate.objectRequirements}
          organizationId={organizationId}
          sessionId={sessionId}
          onConfirm={handleConfirmMapping}
          onCancel={() => setSelectedTemplate(null)}
        />
      )}
    </div>
  );
}
