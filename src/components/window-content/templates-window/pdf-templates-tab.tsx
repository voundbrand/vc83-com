"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { TemplatesList } from "./templates-list";

interface PdfTemplatesTabProps {
  onEditTemplate: (templateId: string) => void;
  onViewSchema?: (templateId: string) => void;
}

export function PdfTemplatesTab({ onEditTemplate, onViewSchema }: PdfTemplatesTabProps) {
  const { sessionId } = useAuth();

  // Fetch all system PDF templates
  const pdfTemplates = useQuery(
    api.pdfTemplateAvailability.getAllSystemPdfTemplates,
    sessionId ? { sessionId } : "skip"
  );

  if (pdfTemplates === undefined) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 size={32} className="animate-spin" style={{ color: 'var(--win95-highlight)' }} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {pdfTemplates.length === 0 ? (
        <div className="flex items-center justify-center p-8">
          <p className="text-sm" style={{ color: 'var(--neutral-gray)' }}>
            No PDF templates available.
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
