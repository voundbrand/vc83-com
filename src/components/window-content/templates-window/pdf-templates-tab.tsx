"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { TemplatesList } from "./templates-list";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useMemo } from "react";

interface PdfTemplatesTabProps {
  onEditTemplate: (templateId: string) => void;
  onViewSchema?: (templateId: string) => void;
}

export function PdfTemplatesTab({ onEditTemplate, onViewSchema }: PdfTemplatesTabProps) {
  const { sessionId } = useAuth();
  const currentOrg = useCurrentOrganization();

  // 🔧 FIX: Use availability-aware query that respects template_availability ontology
  // This ensures normal org owners only see PDF templates enabled for their organization
  // They can VIEW available templates but cannot EDIT system templates (enforced by RBAC)
  const allTemplates = useQuery(
    api.templateOntology.getAllTemplatesIncludingSystem,
    sessionId && currentOrg ? {
      sessionId,
      organizationId: currentOrg.id as Id<"organizations">
    } : "skip"
  );

  // Filter to only PDF templates
  const pdfTemplates = useMemo(() => {
    if (!allTemplates) return undefined;
    return allTemplates.filter(t => t.subtype === "pdf");
  }, [allTemplates]);

  if (pdfTemplates === undefined) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 size={32} className="animate-spin" style={{ color: 'var(--tone-accent)' }} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {pdfTemplates.length === 0 ? (
        <div className="flex items-center justify-center p-8">
          <p className="text-sm" style={{ color: 'var(--neutral-gray)' }}>
            No PDF templates available for your organization.
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <TemplatesList
            templates={pdfTemplates as unknown as Parameters<typeof TemplatesList>[0]['templates']}
            onEditTemplate={onEditTemplate}
            onViewSchema={onViewSchema}
            templateType="pdf"
          />
        </div>
      )}
    </div>
  );
}
