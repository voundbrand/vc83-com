"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import { useAppAvailabilityGuard } from "@/hooks/use-app-availability";
import { Briefcase, Plus, List, Loader2, AlertCircle, Building2, CheckCircle } from "lucide-react";
import { Id } from "../../../../convex/_generated/dataModel";
import { ProjectsList } from "./ProjectsList";
import { ProjectForm } from "./ProjectForm";
import { ProjectFilters } from "./ProjectFilters";
import SearchBar from "./SearchBar";
import ProjectDetailView from "./ProjectDetailView";

type ViewMode = "list" | "create" | "edit" | "detail";

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

export function ProjectsWindow() {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedProjectId, setSelectedProjectId] = useState<Id<"objects"> | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [filters, setFilters] = useState<{
    subtype?: string;
    status?: string;
    priority?: string;
  }>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Project[] | null>(null);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const { user, isLoading, sessionId } = useAuth();
  const currentOrganization = useCurrentOrganization();
  const organizationId = currentOrganization?.id || user?.defaultOrgId;

  // Mutations
  const archiveProject = useMutation(api.projectOntology.archiveProject);

  // Check app availability - returns guard component if unavailable/loading, null if available
  const guard = useAppAvailabilityGuard({
    code: "projects",
    name: "Projects",
    description: "Project management - track client projects, internal initiatives, campaigns, and tasks"
  });

  if (guard) return guard;

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col h-full" style={{ background: "var(--win95-bg)" }}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <Loader2 size={48} className="animate-spin mx-auto mb-4" style={{ color: "var(--win95-highlight)" }} />
            <p style={{ color: "var(--win95-text)" }}>Loading Projects...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user || !sessionId) {
    return (
      <div className="flex flex-col h-full" style={{ background: "var(--win95-bg)" }}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <AlertCircle size={48} style={{ color: "var(--error)" }} className="mx-auto mb-4" />
            <p style={{ color: "var(--win95-text)" }}>Please log in to access Projects</p>
          </div>
        </div>
      </div>
    );
  }

  if (!organizationId) {
    return (
      <div className="flex flex-col h-full" style={{ background: "var(--win95-bg)" }}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <Building2 size={48} style={{ color: "var(--warning)" }} className="mx-auto mb-4" />
            <p style={{ color: "var(--win95-text)" }} className="font-semibold">
              No Organization Selected
            </p>
            <p style={{ color: "var(--neutral-gray)" }} className="text-sm mt-2">
              Please select an organization to access Projects
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show notification temporarily
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
    <div className="flex flex-col h-full" style={{ background: "var(--win95-bg)" }}>
      {/* Header */}
      <div className="px-4 py-3 border-b-2" style={{ borderColor: "var(--win95-border)" }}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--win95-text)" }}>
              <Briefcase size={16} />
              Projects
            </h2>
            <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
              Track client projects, internal initiatives, campaigns, and tasks
            </p>
          </div>

          {/* Organization Info */}
          <div className="text-right">
            <p className="text-xs font-semibold" style={{ color: "var(--win95-text)" }}>
              {currentOrganization?.name}
            </p>
          </div>
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div
          className="flex items-center gap-2 px-4 py-2 border-b-2"
          style={{
            borderColor: notification.type === "success" ? "var(--success)" : "var(--error)",
            background: notification.type === "success" ? "#E8F5E9" : "#FFEBEE",
            color: notification.type === "success" ? "var(--success)" : "var(--error)",
          }}
        >
          <CheckCircle size={16} />
          <span className="text-xs font-bold">{notification.message}</span>
        </div>
      )}

      {/* Action Bar */}
      <div
        className="flex items-center gap-2 px-4 py-2 border-b-2"
        style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
      >
        {viewMode === "list" ? (
          <button
            onClick={handleCreateNew}
            className="px-3 py-1.5 text-xs font-bold flex items-center gap-2 border-2 transition-colors hover:opacity-80"
            style={{
              borderColor: "var(--win95-border)",
              background: "var(--win95-button-face)",
              color: "var(--win95-text)",
            }}
          >
            <Plus size={14} />
            New Project
          </button>
        ) : (
          <button
            onClick={handleBackToList}
            className="px-3 py-1.5 text-xs font-bold flex items-center gap-2 border-2 transition-colors hover:opacity-80"
            style={{
              borderColor: "var(--win95-border)",
              background: "var(--win95-button-face)",
              color: "var(--win95-text)",
            }}
          >
            <List size={14} />
            Back to List
          </button>
        )}
      </div>

      {/* Filters & Search (only show in list view) */}
      {viewMode === "list" && (
        <>
          <ProjectFilters filters={filters} onFilterChange={setFilters} />
          <div className="px-4 py-2 border-b-2" style={{ borderColor: "var(--win95-border)" }}>
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              onSearch={async (query) => {
                if (query.trim()) {
                  // TODO: Implement search with searchProjects mutation
                  // For now, just clear results
                  setSearchResults(null);
                } else {
                  setSearchResults(null);
                }
              }}
            />
          </div>
        </>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
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
          <ProjectForm
            sessionId={sessionId}
            organizationId={organizationId as Id<"organizations">}
            projectId={selectedProjectId || undefined}
            mode={viewMode}
            onSuccess={handleFormSuccess}
            onCancel={handleBackToList}
          />
        )}
      </div>
    </div>
  );
}
