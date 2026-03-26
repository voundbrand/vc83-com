"use client";

/**
 * AGENTS PAGE - Full-screen agent management dashboard
 *
 * Renders the AgentsWindow component in full-screen mode.
 * Same component is used in the desktop window manager.
 */

import { AgentsWindow } from "@/components/window-content/agents-window";
import { OrgActionCenter } from "@/components/window-content/agents/org-action-center";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import type { Id } from "../../../convex/_generated/dataModel";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function AgentsPageContent() {
  const searchParams = useSearchParams();
  const view = searchParams.get("view");
  const { sessionId } = useAuth();
  const currentOrganization = useCurrentOrganization();

  if (view === "action-center") {
    if (!sessionId || !currentOrganization?.id) {
      return (
        <div className="h-screen flex items-center justify-center p-6">
          <p className="text-sm" style={{ color: "var(--window-document-text)" }}>
            Sign in and select an organization to open Action Center.
          </p>
        </div>
      );
    }

    return (
      <div className="h-screen min-h-0 p-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-base font-semibold" style={{ color: "var(--window-document-text)" }}>
            Org Action Center
          </h1>
          <Link
            href="/agents"
            className="px-2 py-1 text-xs border rounded"
            style={{ borderColor: "var(--window-document-border)", color: "var(--window-document-text)" }}
          >
            Open Agent Dashboard
          </Link>
        </div>
        <div className="flex-1 min-h-0">
          <OrgActionCenter
            sessionId={sessionId}
            organizationId={currentOrganization.id as Id<"organizations">}
          />
        </div>
      </div>
    );
  }

  return <AgentsWindow fullScreen />;
}

export default function AgentsPage() {
  return (
    <Suspense>
      <AgentsPageContent />
    </Suspense>
  );
}
