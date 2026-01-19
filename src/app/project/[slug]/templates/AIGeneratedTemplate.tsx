"use client";

/**
 * AI GENERATED TEMPLATE
 *
 * Renders AI-generated pages using the PageRenderer.
 * Supports edit mode for authenticated users who own the project.
 */

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { PageRenderer } from "@/components/builder/page-renderer";
import {
  EditModeProvider,
  EditModeToolbar,
} from "@/components/project-editing";
import { useAuth } from "@/hooks/use-auth";
import type { AIGeneratedPageSchema } from "@/lib/page-builder/page-schema";
import type { Id } from "@convex/_generated/dataModel";

interface ProjectPageConfig {
  projectId: string;
  organizationId: string;
  name: string;
  description?: string;
  theme: string;
  template: string;
  logoUrl?: string;
  faviconUrl?: string;
  customCss?: string;
  pageSchema?: AIGeneratedPageSchema;
}

interface AIGeneratedTemplateProps {
  config: ProjectPageConfig;
  slug: string;
}

export default function AIGeneratedTemplate({
  config,
}: AIGeneratedTemplateProps) {
  const { user, sessionId } = useAuth();
  const [isEditMode, setIsEditMode] = useState(false);

  // Check if user can edit this project
  const canEdit = Boolean(
    user &&
      sessionId &&
      user.currentOrganization?.id === config.organizationId
  );

  // Get the page schema from config or load it if not provided
  const pageData = useQuery(
    api.pageBuilder.loadGeneratedPage,
    config.pageSchema
      ? "skip"
      : sessionId && config.projectId
        ? {
            sessionId,
            projectId: config.projectId as Id<"objects">,
          }
        : "skip"
  );

  // Use schema from config or loaded data
  const pageSchema = config.pageSchema || pageData?.pageSchema;

  if (!pageSchema) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-200 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Page Not Found
          </h2>
          <p className="text-gray-500">
            This AI-generated page could not be loaded.
          </p>
        </div>
      </div>
    );
  }

  // Wrap in EditModeProvider if editing
  if (isEditMode && canEdit) {
    return (
      <EditModeProvider
        projectId={config.projectId}
        organizationId={config.organizationId as Id<"organizations">}
        sessionId={sessionId || ""}
      >
        <div className="relative">
          {/* Exit edit mode button */}
          <button
            onClick={() => setIsEditMode(false)}
            className="fixed top-4 left-4 z-50 px-4 py-2 bg-white text-gray-700 rounded-full shadow-lg hover:bg-gray-50 border border-gray-200 flex items-center gap-2 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Exit Edit Mode
          </button>

          {/* Edit mode toolbar */}
          <EditModeToolbar position="bottom-right" />

          {/* Page content */}
          <PageRenderer
            schema={pageSchema as AIGeneratedPageSchema}
            isEditMode={true}
            projectId={config.projectId}
            organizationId={config.organizationId}
          />
        </div>
      </EditModeProvider>
    );
  }

  // Normal view mode
  return (
    <div className="relative">
      {/* Edit button for authorized users */}
      {canEdit && (
        <button
          onClick={() => setIsEditMode(true)}
          className="fixed bottom-4 right-4 z-50 px-4 py-2 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
          Edit Page
        </button>
      )}

      {/* Page content */}
      <PageRenderer
        schema={pageSchema as AIGeneratedPageSchema}
        isEditMode={false}
      />
    </div>
  );
}
