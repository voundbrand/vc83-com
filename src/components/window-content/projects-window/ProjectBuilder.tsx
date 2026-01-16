/**
 * PROJECT BUILDER
 * Tabbed interface for creating and editing projects
 * Mirrors the template-builder pattern for consistency
 */

"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import {
  ArrowLeft,
  Loader2,
  FileText,
  Calendar,
  Globe,
  Save,
  X,
  AlertCircle,
} from "lucide-react";
import { ProjectDetailsTab } from "./ProjectDetailsTab";
import MeetingsTab from "./MeetingsTab";
import { ProjectPublishingTab } from "./ProjectPublishingTab";

type BuilderTab = "details" | "meetings" | "publishing";

interface ProjectBuilderProps {
  sessionId: string;
  organizationId: Id<"organizations">;
  projectId?: Id<"objects">; // If editing existing project
  mode: "create" | "edit";
  onSuccess: () => void;
  onCancel: () => void;
}

export interface ProjectFormData {
  name: string;
  description: string;
  subtype: string;
  status: string;
  priority: string;
  progress: number;
  budgetAmount: string;
  budgetCurrency: string;
  startDate: string;
  targetEndDate: string;
  clientOrgId?: Id<"objects">;
  detailedDescription: string;
}

export interface PublicPageConfig {
  enabled: boolean;
  slug: string;
  password: string;
  theme: string;
  template: string;
}

export function ProjectBuilder({
  sessionId,
  organizationId,
  projectId,
  mode,
  onSuccess,
  onCancel,
}: ProjectBuilderProps) {
  const [activeTab, setActiveTab] = useState<BuilderTab>("details");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mutations
  const createProject = useMutation(api.projectOntology.createProject);
  const updateProject = useMutation(api.projectOntology.updateProject);

  // Load existing project if editing
  const existingProject = useQuery(
    api.projectOntology.getProject,
    projectId ? { sessionId, projectId } : "skip"
  );

  // Form state
  const [formData, setFormData] = useState<ProjectFormData>({
    name: "",
    description: "",
    subtype: "client_project",
    status: "draft",
    priority: "medium",
    progress: 0,
    budgetAmount: "",
    budgetCurrency: "EUR",
    startDate: "",
    targetEndDate: "",
    clientOrgId: undefined,
    detailedDescription: "",
  });

  // Public page state
  const [publicPage, setPublicPage] = useState<PublicPageConfig>({
    enabled: false,
    slug: "",
    password: "",
    theme: "purple",
    template: "simple",
  });

  // Track if project was just created (to enable meetings/publishing tabs)
  const [createdProjectId, setCreatedProjectId] = useState<Id<"objects"> | null>(null);
  const effectiveProjectId = projectId || createdProjectId;

  // Load existing project data
  useEffect(() => {
    if (mode === "edit" && existingProject) {
      const props = existingProject.customProperties || {};
      setFormData({
        name: existingProject.name || "",
        description: existingProject.description || "",
        subtype: existingProject.subtype || "client_project",
        status: existingProject.status || "draft",
        priority: (props.priority as string) || "medium",
        progress: (props.progress as number) || 0,
        budgetAmount: (props.budget as { amount: number })?.amount?.toString() || "",
        budgetCurrency: (props.budget as { currency: string })?.currency || "EUR",
        startDate: props.startDate ? new Date(props.startDate as number).toISOString().split("T")[0] : "",
        targetEndDate: props.targetEndDate ? new Date(props.targetEndDate as number).toISOString().split("T")[0] : "",
        clientOrgId: props.clientOrgId as Id<"objects"> | undefined,
        detailedDescription: (props.detailedDescription as string) || "",
      });

      // Load public page config
      const publicPageData = props.publicPage as PublicPageConfig | undefined;
      if (publicPageData) {
        setPublicPage({
          enabled: publicPageData.enabled || false,
          slug: publicPageData.slug || "",
          password: publicPageData.password || "",
          theme: publicPageData.theme || "purple",
          template: publicPageData.template || "simple",
        });
      }
    }
  }, [mode, existingProject]);

  // Handle form data changes
  const handleFormDataChange = (updates: Partial<ProjectFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  // Handle save (create or update)
  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError("Project name is required");
      setActiveTab("details");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const budget = formData.budgetAmount
        ? { amount: parseFloat(formData.budgetAmount), currency: formData.budgetCurrency }
        : undefined;

      const startTimestamp = formData.startDate ? new Date(formData.startDate).getTime() : undefined;
      const endTimestamp = formData.targetEndDate ? new Date(formData.targetEndDate).getTime() : undefined;

      if (mode === "create" && !createdProjectId) {
        // Create new project - returns the project ID directly
        const newProjectId = await createProject({
          sessionId,
          organizationId,
          name: formData.name,
          description: formData.description,
          subtype: formData.subtype,
          priority: formData.priority,
          budget,
          startDate: startTimestamp,
          targetEndDate: endTimestamp,
          clientOrgId: formData.clientOrgId,
          customProperties: {
            detailedDescription: formData.detailedDescription,
          },
        });

        // Store the created project ID so we can add meetings/publishing
        setCreatedProjectId(newProjectId);

        // Don't call onSuccess yet - let user add meetings/publishing if they want
      } else if (effectiveProjectId) {
        // Update existing project
        await updateProject({
          sessionId,
          projectId: effectiveProjectId,
          name: formData.name,
          description: formData.description,
          subtype: formData.subtype,
          status: formData.status,
          priority: formData.priority,
          progress: formData.progress,
          budget,
          startDate: startTimestamp,
          targetEndDate: endTimestamp,
          clientOrgId: formData.clientOrgId,
          customProperties: {
            detailedDescription: formData.detailedDescription,
          },
        });

        onSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save project");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle finish (when done adding meetings/publishing)
  const handleFinish = () => {
    onSuccess();
  };

  // Show loading state while fetching existing project
  if (mode === "edit" && existingProject === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={48} className="animate-spin" style={{ color: "var(--win95-highlight)" }} />
      </div>
    );
  }

  const isNewProject = mode === "create" && !createdProjectId;
  const projectName = formData.name || (isNewProject ? "New Project" : existingProject?.name || "Project");

  return (
    <div className="flex flex-col h-full">
      {/* Header with Back Button */}
      <div className="px-4 py-3 border-b-2" style={{ borderColor: "var(--win95-border)" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onCancel}
              className="px-3 py-1.5 text-xs font-bold flex items-center gap-2 border-2 transition-colors hover:brightness-95"
              style={{
                borderColor: "var(--win95-border)",
                background: "var(--win95-button-face)",
                color: "var(--win95-text)",
              }}
            >
              <ArrowLeft size={12} />
              Back
            </button>
            <div>
              <h2 className="text-sm font-bold" style={{ color: "var(--win95-text)" }}>
                {isNewProject ? "Create New Project" : projectName}
                {createdProjectId && (
                  <span
                    className="ml-2 text-xs px-2 py-0.5 rounded"
                    style={{ background: "var(--success)", color: "white" }}
                  >
                    Created
                  </span>
                )}
              </h2>
              <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                {isNewProject
                  ? "Fill in the details to create your project"
                  : createdProjectId
                  ? "Project created! Add meetings and configure publishing, then click Done."
                  : "Edit project details, meetings, and publishing settings"}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {createdProjectId ? (
              <button
                onClick={handleFinish}
                className="px-4 py-2 text-xs font-bold flex items-center gap-2 border-2 transition-colors hover:opacity-90"
                style={{
                  borderColor: "var(--win95-border)",
                  background: "var(--win95-highlight)",
                  color: "white",
                }}
              >
                <Save size={14} />
                Done
              </button>
            ) : (
              <>
                <button
                  onClick={onCancel}
                  disabled={isSubmitting}
                  className="px-3 py-1.5 text-xs font-bold flex items-center gap-2 border-2 transition-colors hover:opacity-80 disabled:opacity-50"
                  style={{
                    borderColor: "var(--win95-border)",
                    background: "var(--win95-button-face)",
                    color: "var(--win95-text)",
                  }}
                >
                  <X size={12} />
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSubmitting || !formData.name}
                  className="px-4 py-2 text-xs font-bold flex items-center gap-2 border-2 transition-colors hover:opacity-90 disabled:opacity-50"
                  style={{
                    borderColor: "var(--win95-border)",
                    background: "var(--win95-highlight)",
                    color: "white",
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={14} />
                      {isNewProject ? "Create & Continue" : "Save Changes"}
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div
          className="mx-4 mt-4 flex items-center gap-2 p-3 border-2"
          style={{
            borderColor: "var(--error)",
            background: "#FEE",
            color: "var(--error)",
          }}
        >
          <AlertCircle size={16} />
          <span className="text-sm font-bold">{error}</span>
        </div>
      )}

      {/* Builder Tabs */}
      <div
        className="flex border-b-2"
        style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
      >
        <button
          className="px-4 py-2 text-xs font-bold border-r-2 transition-colors flex items-center gap-2"
          style={{
            borderColor: "var(--win95-border)",
            background: activeTab === "details" ? "var(--win95-bg-light)" : "var(--win95-bg)",
            color: activeTab === "details" ? "var(--win95-text)" : "var(--neutral-gray)",
          }}
          onClick={() => setActiveTab("details")}
        >
          <FileText size={14} />
          Details
        </button>
        <button
          className="px-4 py-2 text-xs font-bold border-r-2 transition-colors flex items-center gap-2"
          style={{
            borderColor: "var(--win95-border)",
            background: activeTab === "meetings" ? "var(--win95-bg-light)" : "var(--win95-bg)",
            color: activeTab === "meetings" ? "var(--win95-text)" : "var(--neutral-gray)",
            opacity: effectiveProjectId ? 1 : 0.5,
          }}
          onClick={() => effectiveProjectId && setActiveTab("meetings")}
          disabled={!effectiveProjectId}
          title={!effectiveProjectId ? "Save project first to add meetings" : undefined}
        >
          <Calendar size={14} />
          Meetings
          {!effectiveProjectId && (
            <span className="text-[10px] px-1 py-0.5 rounded" style={{ background: "var(--neutral-gray)", color: "white" }}>
              Save First
            </span>
          )}
        </button>
        <button
          className="px-4 py-2 text-xs font-bold border-r-2 transition-colors flex items-center gap-2"
          style={{
            borderColor: "var(--win95-border)",
            background: activeTab === "publishing" ? "var(--win95-bg-light)" : "var(--win95-bg)",
            color: activeTab === "publishing" ? "var(--win95-text)" : "var(--neutral-gray)",
            opacity: effectiveProjectId ? 1 : 0.5,
          }}
          onClick={() => effectiveProjectId && setActiveTab("publishing")}
          disabled={!effectiveProjectId}
          title={!effectiveProjectId ? "Save project first to configure publishing" : undefined}
        >
          <Globe size={14} />
          Publishing
          {!effectiveProjectId && (
            <span className="text-[10px] px-1 py-0.5 rounded" style={{ background: "var(--neutral-gray)", color: "white" }}>
              Save First
            </span>
          )}
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === "details" && (
          <ProjectDetailsTab
            formData={formData}
            onChange={handleFormDataChange}
            mode={mode}
            sessionId={sessionId}
            organizationId={organizationId}
            disabled={isSubmitting}
          />
        )}

        {activeTab === "meetings" && effectiveProjectId && (
          <MeetingsTab
            projectId={effectiveProjectId}
            sessionId={sessionId}
            organizationId={organizationId}
          />
        )}

        {activeTab === "publishing" && effectiveProjectId && (
          <ProjectPublishingTab
            projectId={effectiveProjectId}
            sessionId={sessionId}
            organizationId={organizationId}
            publicPage={publicPage}
            onChange={setPublicPage}
          />
        )}
      </div>
    </div>
  );
}
