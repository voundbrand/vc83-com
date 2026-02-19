"use client";

import { Briefcase, Calendar, DollarSign, TrendingUp, Edit, Archive, Building2, Eye } from "lucide-react";
import { Doc, Id } from "../../../../convex/_generated/dataModel";

interface ProjectCardProps {
  project: Doc<"objects">;
  onEdit: (projectId: Id<"objects">) => void;
  onArchive: (projectId: Id<"objects">) => void;
  onView?: (project: unknown) => void;
}

export function ProjectCard({ project, onEdit, onArchive, onView }: ProjectCardProps) {
  const props = project.customProperties || {};
  const projectCode = props.projectCode as string | undefined;
  const priority = (props.priority as string) || "medium";
  const progress = (props.progress as number) || 0;
  const budget = props.budget as { amount: number; currency: string } | undefined;
  const startDate = props.startDate as number | undefined;
  const targetEndDate = props.targetEndDate as number | undefined;

  // Priority colors
  const priorityColors: Record<string, string> = {
    low: "var(--success)",
    medium: "var(--warning)",
    high: "var(--error)",
    critical: "#FF0000",
  };

  // Status colors
  const statusColors: Record<string, string> = {
    draft: "var(--neutral-gray)",
    planning: "var(--info)",
    active: "var(--success)",
    on_hold: "var(--warning)",
    completed: "var(--window-document-text)",
    cancelled: "var(--error)",
  };

  // Format date
  const formatDate = (timestamp: number | undefined) => {
    if (!timestamp) return "N/A";
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Format budget
  const formatBudget = (budget: { amount?: number; currency?: string } | undefined) => {
    if (!budget || typeof budget.amount !== "number" || budget.amount === 0) return "No budget";
    if (!budget.currency) return budget.amount.toLocaleString();
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: budget.currency,
    }).format(budget.amount);
  };

  // Subtype labels
  const subtypeLabels: Record<string, string> = {
    client_project: "Client Project",
    internal: "Internal",
    campaign: "Campaign",
    product_development: "Product Dev",
    other: "Other",
  };

  return (
    <div
      className="border-2 p-4 hover:shadow-md transition-shadow"
      style={{
        borderColor: "var(--window-document-border)",
        background: "var(--window-document-bg-elevated)",
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Briefcase size={16} style={{ color: "var(--tone-accent)" }} />
            <h3
              className="text-sm font-bold truncate"
              style={{ color: "var(--window-document-text)" }}
              title={project.name}
            >
              {project.name}
            </h3>
          </div>
          {projectCode && (
            <p className="text-xs font-mono" style={{ color: "var(--neutral-gray)" }}>
              {projectCode}
            </p>
          )}
        </div>

        {/* Priority Badge */}
        <div
          className="px-2 py-0.5 text-xs font-bold border"
          style={{
            borderColor: priorityColors[priority],
            color: priorityColors[priority],
            background: "var(--window-document-bg)",
          }}
        >
          {priority.toUpperCase()}
        </div>
      </div>

      {/* Description */}
      {project.description && (
        <p
          className="text-xs mb-3 line-clamp-2"
          style={{ color: "var(--window-document-text)" }}
        >
          {project.description}
        </p>
      )}

      {/* Meta Info Grid */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {/* Type */}
        <div className="flex items-center gap-1.5">
          <Building2 size={12} style={{ color: "var(--neutral-gray)" }} />
          <span className="text-xs" style={{ color: "var(--window-document-text)" }}>
            {subtypeLabels[project.subtype || "other"]}
          </span>
        </div>

        {/* Status */}
        <div className="flex items-center gap-1.5">
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: statusColors[project.status || "draft"] }}
          />
          <span className="text-xs capitalize" style={{ color: "var(--window-document-text)" }}>
            {(project.status || "draft").replace("_", " ")}
          </span>
        </div>

        {/* Start Date */}
        <div className="flex items-center gap-1.5">
          <Calendar size={12} style={{ color: "var(--neutral-gray)" }} />
          <span className="text-xs" style={{ color: "var(--window-document-text)" }}>
            {formatDate(startDate)}
          </span>
        </div>

        {/* Budget */}
        <div className="flex items-center gap-1.5">
          <DollarSign size={12} style={{ color: "var(--neutral-gray)" }} />
          <span className="text-xs" style={{ color: "var(--window-document-text)" }}>
            {formatBudget(budget)}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs flex items-center gap-1" style={{ color: "var(--neutral-gray)" }}>
            <TrendingUp size={12} />
            Progress
          </span>
          <span className="text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
            {progress}%
          </span>
        </div>
        <div
          className="w-full h-2 border"
          style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg)" }}
        >
          <div
            className="h-full"
            style={{
              width: `${progress}%`,
              background: "var(--tone-accent)",
            }}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-3 border-t" style={{ borderColor: "var(--window-document-border)" }}>
        {onView && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onView(project);
            }}
            className="flex-1 px-3 py-1.5 text-xs font-bold flex items-center justify-center gap-1.5 border-2 transition-colors hover:opacity-80"
            style={{
              borderColor: "var(--window-document-border)",
              background: "var(--tone-accent)",
              color: "white",
            }}
          >
            <Eye size={12} />
            View
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(project._id);
          }}
          className="flex-1 px-3 py-1.5 text-xs font-bold flex items-center justify-center gap-1.5 border-2 transition-colors hover:opacity-80"
          style={{
            borderColor: "var(--window-document-border)",
            background: "var(--window-document-bg-elevated)",
            color: "var(--window-document-text)",
          }}
        >
          <Edit size={12} />
          Edit
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onArchive(project._id);
          }}
          className="flex-1 px-3 py-1.5 text-xs font-bold flex items-center justify-center gap-1.5 border-2 transition-colors hover:opacity-80"
          style={{
            borderColor: "var(--window-document-border)",
            background: "var(--window-document-bg-elevated)",
            color: "var(--error)",
          }}
        >
          <Archive size={12} />
          Archive
        </button>
      </div>

      {/* Target End Date (if different from start) */}
      {targetEndDate && targetEndDate !== startDate && (
        <div className="mt-2 pt-2 border-t" style={{ borderColor: "var(--window-document-border)" }}>
          <span className="text-xs" style={{ color: "var(--neutral-gray)" }}>
            Target: {formatDate(targetEndDate)}
          </span>
        </div>
      )}
    </div>
  );
}
