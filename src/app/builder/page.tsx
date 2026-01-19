"use client";

import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import { BuilderProvider } from "@/contexts/builder-context";
import { BuilderLayout } from "@/components/builder/builder-layout";
import type { Id } from "@convex/_generated/dataModel";

export default function BuilderPage() {
  const { isSignedIn, isLoading, sessionId } = useAuth();
  const currentOrg = useCurrentOrganization();

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading builder...</p>
        </div>
      </div>
    );
  }

  if (!isSignedIn || !currentOrg) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center max-w-md p-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-indigo-100 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-indigo-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Sign in to use the Page Builder
          </h2>
          <p className="text-gray-500 mb-6">
            Create beautiful landing pages with AI. Sign in to get started.
          </p>
          <a
            href="/login"
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Sign In
          </a>
        </div>
      </div>
    );
  }

  return (
    <BuilderProvider
      organizationId={currentOrg.id as Id<"organizations">}
      sessionId={sessionId}
    >
      <BuilderLayout />
    </BuilderProvider>
  );
}
