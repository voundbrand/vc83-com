"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation } from "convex/react";
import { AlertCircle, ArrowLeft, Briefcase, Building2, CheckCircle, List, Loader2, Maximize2, Plus } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import { useAppAvailabilityGuard } from "@/hooks/use-app-availability";
import {
  InteriorButton,
  InteriorHeader,
  InteriorHelperText,
  InteriorRoot,
  InteriorSubtitle,
  InteriorTitle,
} from "@/components/window-content/shared/interior-primitives";
import { ProjectsList } from "./ProjectsList";
import { ProjectBuilder } from "./ProjectBuilder";
import { ProjectFilters } from "./ProjectFilters";
import SearchBar from "./SearchBar";
import ProjectDetailView from "./ProjectDetailView";

type ViewMode = "list" | "create" | "edit" | "detail";

interface ProjectsWindowProps {
  /** When true, shows back-to-desktop navigation (for /projects route) */
  fullScreen?: boolean;
}

interface Project {
  _id: string;
  name: string;
  description?: string;
  status: string;
  subtype: string;
  customProperties?: {
    projectCode?: string;
    priority?: string;
    progress?: number;
    startDate?: number;
    targetEndDate?: number;
    budget?: {
      amount: number;
      currency: string;
    };
    detailedDescription?: string;
  };
}

export function ProjectsWindow({ fullScreen = false }: ProjectsWindowProps = {}) {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedProjectId, setSelectedProjectId] = useState<Id<"objects"> | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [filters, setFilters] = useState<{ subtype?: string; status?: string; priority?: string }>({});
  const [searchQuery, setSearchQuery] = useState("");
  // Preserved for future search result display
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [searchResults, setSearchResults] = useState<Project[] | null>(null);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const { user, isLoading, sessionId } = useAuth();
  const currentOrganization = useCurrentOrganization();
  const organizationId = currentOrganization?.id || user?.defaultOrgId;
  const archiveProject = useMutation(api.projectOntology.archiveProject);

  const guard = useAppAvailabilityGuard({
    code: "projects",
    name: "Projects",
    description: "Project management - track client projects, internal initiatives, campaigns, and tasks",
  });

  if (guard) return guard;

  if (isLoading) {
    return (
      <InteriorRoot className="flex h-full flex-col">
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <Loader2 size={48} className="mx-auto mb-4 animate-spin" style={{ color: "var(--tone-accent-strong)" }} />
            <p style={{ color: "var(--window-document-text)" }}>Loading Projects...</p>
          </div>
        </div>
      </InteriorRoot>
    );
  }

  if (!user || !sessionId) {
    return (
      <InteriorRoot className="flex h-full flex-col">
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <AlertCircle size={48} className="mx-auto mb-4" style={{ color: "var(--error)" }} />
            <p style={{ color: "var(--window-document-text)" }}>Please log in to access Projects</p>
          </div>
        </div>
      </InteriorRoot>
    );
  }

  if (!organizationId) {
    return (
      <InteriorRoot className="flex h-full flex-col">
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <Building2 size={48} className="mx-auto mb-4" style={{ color: "var(--warning)" }} />
            <p className="font-semibold" style={{ color: "var(--window-document-text)" }}>
              No Organization Selected
            </p>
            <InteriorHelperText className="mt-2">Please select an organization to access Projects</InteriorHelperText>
          </div>
        </div>
      </InteriorRoot>
    );
  }

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleCreateNew = () => {
    setSelectedProjectId(null);
    setViewMode("create");
  };

  const handleEdit = (projectId: Id<"objects">) => {
    setSelectedProjectId(projectId);
    setViewMode("edit");
  };

  const handleBackToList = () => {
    setViewMode("list");
    setSelectedProjectId(null);
  };

  const handleFormSuccess = () => {
    showNotification("success", "Project saved successfully!");
    handleBackToList();
  };

  const handleArchive = async (projectId: Id<"objects">) => {
    if (!confirm("Are you sure you want to archive this project?")) return;

    try {
      await archiveProject({ sessionId, projectId });
      showNotification("success", "Project archived successfully");
    } catch (error) {
      showNotification("error", error instanceof Error ? error.message : "Failed to archive project");
    }
  };

  return (
    <InteriorRoot className="flex h-full flex-col">
      <InteriorHeader className="px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {fullScreen && (
              <Link href="/" className="desktop-interior-button inline-flex h-9 items-center gap-2 px-3 text-xs" title="Back to Desktop">
                <ArrowLeft size={14} />
              </Link>
            )}
            <div>
              <InteriorTitle className="flex items-center gap-2 text-sm">
                <Briefcase size={16} />
                Projects
              </InteriorTitle>
              <InteriorSubtitle className="mt-1">Track client projects, internal initiatives, campaigns, and tasks</InteriorSubtitle>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <p className="text-right text-xs font-semibold" style={{ color: "var(--window-document-text)" }}>
              {currentOrganization?.name}
            </p>
            {!fullScreen && (
              <Link
                href="/projects"
                className="desktop-interior-button inline-flex h-9 items-center gap-2 px-3 text-xs"
                title="Open Full Screen"
              >
                <Maximize2 size={14} />
              </Link>
            )}
          </div>
        </div>
      </InteriorHeader>

      {notification && (
        <div
          className="flex items-center gap-2 border-b px-4 py-2"
          style={{
            borderColor: notification.type === "success" ? "var(--success)" : "var(--error)",
            background: notification.type === "success" ? "#e8f5e9" : "#ffebee",
            color: notification.type === "success" ? "var(--success)" : "var(--error)",
          }}
        >
          <CheckCircle size={16} />
          <span className="text-xs font-semibold">{notification.message}</span>
        </div>
      )}

      <div className="flex items-center gap-2 border-b px-4 py-2" style={{ borderColor: "var(--window-document-border)", background: "var(--desktop-shell-accent)" }}>
        {viewMode === "list" ? (
          <InteriorButton onClick={handleCreateNew} className="gap-2">
            <Plus size={14} />
            New Project
          </InteriorButton>
        ) : (
          <InteriorButton onClick={handleBackToList} className="gap-2">
            <List size={14} />
            Back to List
          </InteriorButton>
        )}
      </div>

      {viewMode === "list" && (
        <>
          <ProjectFilters filters={filters} onFilterChange={setFilters} />
          <div className="border-b px-4 py-2" style={{ borderColor: "var(--window-document-border)" }}>
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              onSearch={async (query) => {
                if (query.trim()) {
                  setSearchResults(null);
                } else {
                  setSearchResults(null);
                }
              }}
            />
          </div>
        </>
      )}

      <div className="flex-1 overflow-y-auto p-4" style={{ background: "var(--window-document-bg)" }}>
        {viewMode === "list" && (
          <ProjectsList
            sessionId={sessionId}
            organizationId={organizationId as Id<"organizations">}
            filters={filters}
            onEdit={handleEdit}
            onArchive={handleArchive}
            onView={(project) => {
              setSelectedProject(project as Project);
              setViewMode("detail");
            }}
          />
        )}

        {viewMode === "detail" && selectedProject && (
          <ProjectDetailView
            project={selectedProject}
            sessionId={sessionId}
            organizationId={organizationId as Id<"organizations">}
            onBack={() => {
              setViewMode("list");
              setSelectedProject(null);
            }}
            onEdit={(project) => {
              setSelectedProjectId(project._id as Id<"objects">);
              setViewMode("edit");
            }}
          />
        )}

        {(viewMode === "create" || viewMode === "edit") && (
          <ProjectBuilder
            sessionId={sessionId}
            organizationId={organizationId as Id<"organizations">}
            projectId={selectedProjectId || undefined}
            mode={viewMode}
            onSuccess={handleFormSuccess}
            onCancel={handleBackToList}
          />
        )}
      </div>
    </InteriorRoot>
  );
}
