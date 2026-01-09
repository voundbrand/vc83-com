"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useState, useEffect } from "react";
import { Suspense } from "react";
import {
  ProjectDrawerProvider,
  ProjectDrawer,
  MeetingDetailModal,
  ProjectDrawerTrigger,
} from "@/components/project-drawer";
import PasswordProtection from "./PasswordProtection";
import ProjectPageTemplate from "./ProjectPageTemplate";
import { Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";

// ============================================
// LOADING SCREEN
// ============================================
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-slate-50 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Loading project...</p>
      </div>
    </div>
  );
}

// ============================================
// NOT FOUND SCREEN
// ============================================
function NotFoundScreen({ slug }: { slug: string }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-slate-50 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Project Not Found
        </h1>
        <p className="text-gray-600 mb-6">
          The project page &quot;{slug}&quot; doesn&apos;t exist or is not
          publicly available.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
        >
          Go to Homepage
        </Link>
      </div>
    </div>
  );
}

// ============================================
// PAGE CONTENT (wrapped by provider)
// ============================================
function ProjectPageContent({
  config,
  slug,
}: {
  config: {
    projectId: string;
    organizationId: string;
    name: string;
    description?: string;
    theme: string;
    template: string;
    logoUrl?: string;
    faviconUrl?: string;
    customCss?: string;
  };
  slug: string;
}) {
  return (
    <>
      <ProjectPageTemplate config={config} slug={slug} />
      <ProjectDrawerTrigger />
      <ProjectDrawer />
      <MeetingDetailModal />
    </>
  );
}

// ============================================
// MAIN PAGE COMPONENT
// ============================================
export default function ProjectPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingStorage, setCheckingStorage] = useState(true);

  // Fetch project config by slug
  const projectConfig = useQuery(api.projectOntology.getProjectBySlug, {
    slug,
  });

  // Check localStorage for saved password
  useEffect(() => {
    const savedAuth = localStorage.getItem(`project-auth-${slug}`);
    if (savedAuth === "true") {
      setIsAuthenticated(true);
    }
    setCheckingStorage(false);
  }, [slug]);

  // Loading state
  if (projectConfig === undefined || checkingStorage) {
    return <LoadingScreen />;
  }

  // Not found
  if (projectConfig === null) {
    return <NotFoundScreen slug={slug} />;
  }

  // Password protection
  if (projectConfig.hasPassword && !isAuthenticated) {
    return (
      <PasswordProtection
        slug={slug}
        theme={projectConfig.theme}
        projectName={projectConfig.name}
        onSuccess={() => {
          localStorage.setItem(`project-auth-${slug}`, "true");
          setIsAuthenticated(true);
        }}
      />
    );
  }

  // Cast IDs to the proper types for ProjectDrawerProvider
  const drawerConfig = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    organizationId: projectConfig.organizationId as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    projectId: projectConfig.projectId as any,
    theme: projectConfig.theme as "amber" | "purple" | "blue" | "green" | "neutral",
    drawerTitle: "Project Meetings",
  };

  // Render the project page
  return (
    <Suspense fallback={<LoadingScreen />}>
      <ProjectDrawerProvider config={drawerConfig}>
        <ProjectPageContent config={projectConfig} slug={slug} />
      </ProjectDrawerProvider>
    </Suspense>
  );
}
