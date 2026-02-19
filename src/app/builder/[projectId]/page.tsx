"use client";

/**
 * BUILDER WORKSPACE PAGE
 *
 * Authenticated workspace for the l4yercak3 Builder.
 * Requires authentication - redirects to login if not signed in.
 * Supports loading existing conversations via sessionStorage.
 *
 * URL formats:
 * - /builder/new - Create a new conversation
 * - /builder/{slug} - Load conversation by slug (e.g., "sailing-school-landing-page-abc123")
 * - /builder/{conversationId} - Load conversation by ID (legacy support)
 */

import { use, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import { BuilderProvider } from "@/contexts/builder-context";
import { BuilderLayout } from "@/components/builder/builder-layout";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import type { Id } from "@convex/_generated/dataModel";

/**
 * Check if a string looks like a Convex ID
 * Convex IDs are base64-like alphanumeric strings (no hyphens, typically ~20 chars)
 * Slugs contain hyphens and are human-readable
 */
function isConvexId(str: string): boolean {
  // Convex IDs: alphanumeric only, no hyphens (e.g., "j5718tz4rk5abc123def")
  // Slugs: contain hyphens (e.g., "sailing-school-landing-page-abc123")
  // If it contains any hyphen, it's definitely a slug
  return !str.includes("-") && str.length >= 10 && /^[a-zA-Z0-9]+$/.test(str);
}

export default function BuilderWorkspacePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  // Next.js 15: params is now a Promise, unwrap with use()
  const { projectId } = use(params);

  const router = useRouter();
  const { isSignedIn, isLoading, sessionId } = useAuth();
  const currentOrg = useCurrentOrganization();
  const { translationsMap } = useNamespaceTranslations("ui.builder");
  const tx = (key: string, fallback: string): string => translationsMap?.[key] ?? fallback;

  // Determine if projectId is a slug or a Convex ID
  const isSlug = projectId !== "new" && !isConvexId(projectId);

  // Query conversation by slug if needed
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore - Convex type instantiation is excessively deep
  const conversationBySlug = useQuery(
    api.ai.conversations.getConversationBySlug,
    isSlug ? { slug: projectId } : "skip"
  );

  // Detect embedded mode (loaded inside an iframe, e.g. desktop window)
  const [isEmbedded] = useState(() =>
    typeof window !== "undefined" && window.self !== window.top
  );

  // Check for pending conversation ID from sessionStorage
  const [initialConversationId, setInitialConversationId] = useState<Id<"aiConversations"> | undefined>(undefined);
  const [resolvedFromSlug, setResolvedFromSlug] = useState(false);

  // Resolve conversation ID from slug
  useEffect(() => {
    if (isSlug && conversationBySlug && !resolvedFromSlug) {
      setInitialConversationId(conversationBySlug._id as Id<"aiConversations">);
      setResolvedFromSlug(true);
    }
  }, [isSlug, conversationBySlug, resolvedFromSlug]);

  // Check for pending conversation from sessionStorage
  useEffect(() => {
    const pendingConversationId = sessionStorage.getItem("builder_pending_conversation");
    if (pendingConversationId) {
      sessionStorage.removeItem("builder_pending_conversation");
      setInitialConversationId(pendingConversationId as Id<"aiConversations">);
    }
  }, []);

  // Update URL when a new conversation is created (without full page reload)
  // Uses slug for pretty URLs like v0.dev
  const handleConversationCreated = useCallback((conversationId: Id<"aiConversations">, slug?: string) => {
    // Only update if we're on /builder/new or similar generic path
    if (projectId === "new" || !projectId) {
      // Use slug for pretty URL if available, otherwise fall back to ID
      const urlPath = slug || conversationId;
      // Use replaceState to update URL without navigation/reload
      window.history.replaceState(null, "", `/builder/${urlPath}`);
    }
  }, [projectId]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isSignedIn) {
      router.push("/");
    }
  }, [isLoading, isSignedIn, router, projectId]);

  const loadingShellStyle = {
    background: "var(--background)",
    color: "var(--shell-text-muted)",
  } as const;

  const spinnerStyle = {
    borderColor: "var(--tone-accent)",
    borderTopColor: "transparent",
  } as const;

  const primaryActionClassName =
    "desktop-shell-button desktop-shell-button-primary px-4 py-2 rounded-md transition-colors";

  // Loading state
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center" style={loadingShellStyle}>
        <div className="text-center">
          <div
            className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-4"
            style={spinnerStyle}
          />
          <p>
            {tx("ui.builder.workspace.loading.builder", "Loading builder...")}
          </p>
        </div>
      </div>
    );
  }

  // Not signed in (will redirect)
  if (!isSignedIn || !currentOrg) {
    return (
      <div className="h-full flex items-center justify-center" style={loadingShellStyle}>
        <div className="text-center">
          <div
            className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-4"
            style={spinnerStyle}
          />
          <p>
            {tx("ui.builder.workspace.loading.redirectingToLogin", "Redirecting to login...")}
          </p>
        </div>
      </div>
    );
  }

  // Waiting for slug resolution
  if (isSlug && !resolvedFromSlug) {
    // Show 404-like message if slug query completed but returned null
    if (conversationBySlug === null) {
      return (
        <div className="h-full flex items-center justify-center" style={loadingShellStyle}>
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--shell-text)" }}>
              {tx("ui.builder.workspace.empty.conversationNotFoundTitle", "Conversation not found")}
            </h1>
            <p className="mb-4">
              {tx(
                "ui.builder.workspace.empty.conversationNotFoundDescription",
                "This conversation may have been deleted or the link is invalid."
              )}
            </p>
            <button
              onClick={() => router.push("/builder/new")}
              className={primaryActionClassName}
            >
              {tx("ui.builder.workspace.empty.startNewConversation", "Start New Conversation")}
            </button>
          </div>
        </div>
      );
    }

    // Still loading
    return (
      <div className="h-full flex items-center justify-center" style={loadingShellStyle}>
        <div className="text-center">
          <div
            className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-4"
            style={spinnerStyle}
          />
          <p>
            {tx("ui.builder.workspace.loading.conversation", "Loading conversation...")}
          </p>
        </div>
      </div>
    );
  }

  // Determine the initial conversation ID to use
  const effectiveInitialConversationId = initialConversationId ??
    (projectId !== "new" && isConvexId(projectId) ? projectId as Id<"aiConversations"> : undefined);

  return (
    <BuilderProvider
      organizationId={currentOrg.id as Id<"organizations">}
      sessionId={sessionId}
      initialConversationId={effectiveInitialConversationId}
      onConversationCreated={handleConversationCreated}
    >
      <BuilderLayout hideHeader={isEmbedded} />
    </BuilderProvider>
  );
}
