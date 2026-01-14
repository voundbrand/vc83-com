"use client";

import { ReactNode } from "react";
import { EditModeProvider } from "./EditModeContext";
import { EditModeToolbar } from "./EditModeToolbar";
import { Id } from "@convex/_generated/dataModel";

interface EditableProjectWrapperProps {
  projectId: string;
  organizationId: Id<"organizations">; // Required for ontology-based storage
  children: ReactNode;
  // Optional user session info (if available)
  sessionId?: string | null;
  userEmail?: string | null;
  userName?: string | null;
}

/**
 * Wrapper component that adds inline editing capability to project pages.
 *
 * Usage:
 * ```tsx
 * <EditableProjectWrapper
 *   projectId="rikscha"
 *   organizationId={config.organizationId}
 *   sessionId={session?.id}
 *   userEmail={session?.email}
 *   userName={session?.name}
 * >
 *   <YourTemplateContent />
 * </EditableProjectWrapper>
 * ```
 *
 * Then in your template, use EditableText for editable content:
 * ```tsx
 * import { EditableText } from "@/components/project-editing";
 *
 * <EditableText
 *   blockId="hero.title"
 *   defaultValue="Default headline"
 *   as="h1"
 *   className="text-4xl font-bold"
 * />
 * ```
 */
export function EditableProjectWrapper({
  projectId,
  organizationId,
  children,
  sessionId,
  userEmail,
  userName,
}: EditableProjectWrapperProps) {
  // Only render editing tools if user has a session
  const hasSession = Boolean(sessionId);

  return (
    <EditModeProvider
      projectId={projectId}
      organizationId={organizationId}
      sessionId={sessionId}
      userEmail={userEmail}
      userName={userName}
    >
      {children}
      {hasSession && <EditModeToolbar position="bottom-right" />}
    </EditModeProvider>
  );
}
