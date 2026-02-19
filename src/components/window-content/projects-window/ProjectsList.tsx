"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { ProjectCard } from "./ProjectCard";
import { Loader2, Briefcase, AlertCircle } from "lucide-react";

interface ProjectsListProps {
  sessionId: string;
  organizationId: Id<"organizations">;
  filters: {
    subtype?: string;
    status?: string;
    priority?: string;
  };
  onEdit: (projectId: Id<"objects">) => void;
  onArchive: (projectId: Id<"objects">) => void;
  onView?: (project: unknown) => void;
}

export function ProjectsList({
  sessionId,
  organizationId,
  filters,
  onEdit,
  onArchive,
  onView,
}: ProjectsListProps) {
  // Query projects from Convex
  const projects = useQuery(api.projectOntology.getProjects, {
    sessionId,
    organizationId,
    subtype: filters.subtype,
    status: filters.status,
    priority: filters.priority,
  });

  // Loading state
  if (projects === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2
            size={48}
            className="animate-spin mx-auto mb-4"
            style={{ color: "var(--tone-accent)" }}
          />
          <p className="text-sm" style={{ color: "var(--neutral-gray)" }}>
            Loading projects...
          </p>
        </div>
      </div>
    );
  }

  // Error state (empty array means no error, just no projects)
  if (projects === null) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle size={48} style={{ color: "var(--error)" }} className="mx-auto mb-4" />
          <p className="text-sm font-bold mb-2" style={{ color: "var(--window-document-text)" }}>
            Error Loading Projects
          </p>
          <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
            Please try again later
          </p>
        </div>
      </div>
    );
  }

  // Empty state
  if (projects.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Briefcase
            size={64}
            className="mx-auto mb-4 opacity-30"
            style={{ color: "var(--neutral-gray)" }}
          />
          <p className="text-lg font-bold mb-2" style={{ color: "var(--window-document-text)" }}>
            No Projects Found
          </p>
          <p className="text-sm" style={{ color: "var(--neutral-gray)" }}>
            {filters.subtype || filters.status || filters.priority
              ? "Try adjusting your filters"
              : 'Click "New Project" to create your first project'}
          </p>
        </div>
      </div>
    );
  }

  // Projects grid
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {projects.map((project) => (
        <ProjectCard
          key={project._id}
          project={project}
          onEdit={onEdit}
          onArchive={onArchive}
          onView={onView}
        />
      ))}
    </div>
  );
}
