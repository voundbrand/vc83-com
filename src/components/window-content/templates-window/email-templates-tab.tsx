"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { TemplatesList } from "./templates-list";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useMemo } from "react";

interface EmailTemplatesTabProps {
  onEditTemplate: (templateId: string) => void;
  onViewSchema?: (templateId: string) => void;
}

export function EmailTemplatesTab({ onEditTemplate, onViewSchema }: EmailTemplatesTabProps) {
  const { sessionId } = useAuth();
  const currentOrg = useCurrentOrganization();

  // 🔧 FIX: Use availability-aware query that respects template_availability ontology
  // This ensures normal org owners only see email templates enabled for their organization
  const allTemplates = useQuery(
    api.templateOntology.getAllTemplatesIncludingSystem,
    sessionId && currentOrg ? {
      sessionId,
      organizationId: currentOrg.id as Id<"organizations">
    } : "skip"
  );

  // Filter to only email templates
  const emailTemplates = useMemo(() => {
    if (!allTemplates) return undefined;
    return allTemplates.filter(t => t.subtype === "email");
  }, [allTemplates]);

  if (emailTemplates === undefined) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 size={32} className="animate-spin" style={{ color: 'var(--win95-highlight)' }} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {emailTemplates.length === 0 ? (
        <div className="flex items-center justify-center p-8">
          <p className="text-sm" style={{ color: 'var(--neutral-gray)' }}>
            No email templates available for your organization.
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <TemplatesList
            templates={emailTemplates as unknown as Parameters<typeof TemplatesList>[0]['templates']}
            onEditTemplate={onEditTemplate}
            onViewSchema={onViewSchema}
            templateType="email"
          />
        </div>
      )}
    </div>
  );
}
