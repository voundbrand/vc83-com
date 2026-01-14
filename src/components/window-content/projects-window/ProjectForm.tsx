"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { ClientSelector } from "./ClientSelector";
import RichTextEditor from "./RichTextEditor";
import MeetingsTab from "./MeetingsTab";
import { Loader2, Save, X, AlertCircle, Calendar, Globe, ExternalLink } from "lucide-react";

interface ProjectFormProps {
  sessionId: string;
  organizationId: Id<"organizations">;
  projectId?: Id<"objects">; // If editing
  mode: "create" | "edit";
  onSuccess: () => void;
  onCancel: () => void;
}

export function ProjectForm({
  sessionId,
  organizationId,
  projectId,
  mode,
  onSuccess,
  onCancel,
}: ProjectFormProps) {
  const createProject = useMutation(api.projectOntology.createProject);
  const updateProject = useMutation(api.projectOntology.updateProject);
  const updatePublicPage = useMutation(api.projectOntology.updateProjectPublicPage);

  // Load existing project if editing
  const existingProject = useQuery(
    api.projectOntology.getProject,
    projectId ? { sessionId, projectId } : "skip"
  );

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [subtype, setSubtype] = useState("client_project");
  const [status, setStatus] = useState("draft");
  const [priority, setPriority] = useState("medium");
  const [progress, setProgress] = useState(0);
  const [budgetAmount, setBudgetAmount] = useState("");
  const [budgetCurrency, setBudgetCurrency] = useState("USD");
  const [startDate, setStartDate] = useState("");
  const [targetEndDate, setTargetEndDate] = useState("");
  const [clientOrgId, setClientOrgId] = useState<Id<"objects"> | undefined>();
  const [detailedDescription, setDetailedDescription] = useState("");

  // Public page state
  const [publicPageEnabled, setPublicPageEnabled] = useState(false);
  const [publicPageSlug, setPublicPageSlug] = useState("");
  const [publicPagePassword, setPublicPagePassword] = useState("");
  const [publicPageTheme, setPublicPageTheme] = useState("purple");
  const [publicPageTemplate, setPublicPageTemplate] = useState("simple");
  const [publicPageSaving, setPublicPageSaving] = useState(false);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load existing project data
  useEffect(() => {
    if (mode === "edit" && existingProject) {
      const props = existingProject.customProperties || {};
      setName(existingProject.name || "");
      setDescription(existingProject.description || "");
      setSubtype(existingProject.subtype || "client_project");
      setStatus(existingProject.status || "draft");
      setPriority((props.priority as string) || "medium");
      setProgress((props.progress as number) || 0);

      const budget = props.budget as { amount: number; currency: string } | undefined;
      setBudgetAmount(budget?.amount ? budget.amount.toString() : "");
      setBudgetCurrency(budget?.currency || "USD");

      const start = props.startDate as number | undefined;
      const end = props.targetEndDate as number | undefined;
      setStartDate(start ? new Date(start).toISOString().split("T")[0] : "");
      setTargetEndDate(end ? new Date(end).toISOString().split("T")[0] : "");

      setClientOrgId(props.clientOrgId as Id<"objects"> | undefined);
      setDetailedDescription((props.detailedDescription as string) || "");

      // Load public page config
      const publicPage = props.publicPage as {
        enabled?: boolean;
        slug?: string;
        password?: string;
        theme?: string;
        template?: string;
      } | undefined;
      if (publicPage) {
        setPublicPageEnabled(publicPage.enabled || false);
        setPublicPageSlug(publicPage.slug || "");
        setPublicPagePassword(publicPage.password || "");
        setPublicPageTheme(publicPage.theme || "purple");
        setPublicPageTemplate(publicPage.template || "simple");
      }
    }
  }, [mode, existingProject]);

  // Handle public page save
  const handleSavePublicPage = async () => {
    if (!projectId || !publicPageSlug) return;
    setPublicPageSaving(true);
    setError(null);

    try {
      await updatePublicPage({
        sessionId,
        projectId,
        publicPage: {
          enabled: publicPageEnabled,
          slug: publicPageSlug,
          password: publicPagePassword || undefined,
          theme: publicPageTheme,
          template: publicPageTemplate,
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save public page settings");
    } finally {
      setPublicPageSaving(false);
    }
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const budget = budgetAmount
        ? { amount: parseFloat(budgetAmount), currency: budgetCurrency }
        : undefined;

      const startTimestamp = startDate ? new Date(startDate).getTime() : undefined;
      const endTimestamp = targetEndDate ? new Date(targetEndDate).getTime() : undefined;

      if (mode === "create") {
        await createProject({
          sessionId,
          organizationId,
          name,
          description,
          subtype,
          priority,
          budget,
          startDate: startTimestamp,
          targetEndDate: endTimestamp,
          clientOrgId,
          customProperties: {
            detailedDescription,
          },
        });
      } else if (projectId) {
        await updateProject({
          sessionId,
          projectId,
          name,
          description,
          subtype,
          status,
          priority,
          progress,
          budget,
          startDate: startTimestamp,
          targetEndDate: endTimestamp,
          clientOrgId,
          customProperties: {
            detailedDescription,
          },
        });
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save project");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading state while fetching existing project
  if (mode === "edit" && existingProject === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={48} className="animate-spin" style={{ color: "var(--win95-highlight)" }} />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Error Message */}
      {error && (
        <div
          className="flex items-center gap-2 p-3 border-2"
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

      {/* Basic Info Section */}
      <div
        className="p-4 border-2"
        style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
      >
        <h3 className="text-sm font-bold mb-4" style={{ color: "var(--win95-text)" }}>
          Basic Information
        </h3>

        {/* Project Name */}
        <div className="mb-4">
          <label className="block text-xs font-bold mb-1" style={{ color: "var(--win95-text)" }}>
            Project Name <span style={{ color: "var(--error)" }}>*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={100}
            className="w-full px-3 py-2 text-sm border-2 focus:outline-none focus:border-black"
            style={{
              borderColor: "var(--win95-border)",
              background: "var(--win95-bg)",
              color: "var(--win95-text)",
            }}
            placeholder="Enter project name"
          />
        </div>

        {/* Short Description */}
        <div className="mb-4">
          <label className="block text-xs font-bold mb-1" style={{ color: "var(--win95-text)" }}>
            Short Description
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={200}
            className="w-full px-3 py-2 text-sm border-2 focus:outline-none focus:border-black"
            style={{
              borderColor: "var(--win95-border)",
              background: "var(--win95-bg)",
              color: "var(--win95-text)",
            }}
            placeholder="Brief project summary"
          />
        </div>

        {/* Type and Priority Row */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Project Type */}
          <div>
            <label className="block text-xs font-bold mb-1" style={{ color: "var(--win95-text)" }}>
              Project Type <span style={{ color: "var(--error)" }}>*</span>
            </label>
            <select
              value={subtype}
              onChange={(e) => setSubtype(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm border-2 focus:outline-none focus:border-black"
              style={{
                borderColor: "var(--win95-border)",
                background: "var(--win95-bg)",
                color: "var(--win95-text)",
              }}
            >
              <option value="client_project">Client Project</option>
              <option value="internal">Internal</option>
              <option value="campaign">Campaign</option>
              <option value="product_development">Product Development</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs font-bold mb-1" style={{ color: "var(--win95-text)" }}>
              Priority <span style={{ color: "var(--error)" }}>*</span>
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm border-2 focus:outline-none focus:border-black"
              style={{
                borderColor: "var(--win95-border)",
                background: "var(--win95-bg)",
                color: "var(--win95-text)",
              }}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </div>

        {/* Status (only for edit mode) */}
        {mode === "edit" && (
          <div className="mb-4">
            <label className="block text-xs font-bold mb-1" style={{ color: "var(--win95-text)" }}>
              Status <span style={{ color: "var(--error)" }}>*</span>
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm border-2 focus:outline-none focus:border-black"
              style={{
                borderColor: "var(--win95-border)",
                background: "var(--win95-bg)",
                color: "var(--win95-text)",
              }}
            >
              <option value="draft">Draft</option>
              <option value="planning">Planning</option>
              <option value="active">Active</option>
              <option value="on_hold">On Hold</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        )}

        {/* Progress (only for edit mode) */}
        {mode === "edit" && (
          <div className="mb-4">
            <label className="block text-xs font-bold mb-2" style={{ color: "var(--win95-text)" }}>
              Progress: {progress}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={progress}
              onChange={(e) => setProgress(parseInt(e.target.value))}
              className="w-full"
            />
          </div>
        )}
      </div>

      {/* Client & Dates Section */}
      <div
        className="p-4 border-2"
        style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
      >
        <h3 className="text-sm font-bold mb-4" style={{ color: "var(--win95-text)" }}>
          Client & Timeline
        </h3>

        {/* Client Selector */}
        <div className="mb-4">
          <label className="block text-xs font-bold mb-1" style={{ color: "var(--win95-text)" }}>
            Client (CRM)
          </label>
          <ClientSelector
            sessionId={sessionId}
            organizationId={organizationId}
            value={clientOrgId}
            onChange={setClientOrgId}
            disabled={isSubmitting}
          />
        </div>

        {/* Dates Row */}
        <div className="grid grid-cols-2 gap-4">
          {/* Start Date */}
          <div>
            <label className="block text-xs font-bold mb-1" style={{ color: "var(--win95-text)" }}>
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border-2 focus:outline-none focus:border-black"
              style={{
                borderColor: "var(--win95-border)",
                background: "var(--win95-bg)",
                color: "var(--win95-text)",
              }}
            />
          </div>

          {/* Target End Date */}
          <div>
            <label className="block text-xs font-bold mb-1" style={{ color: "var(--win95-text)" }}>
              Target End Date
            </label>
            <input
              type="date"
              value={targetEndDate}
              onChange={(e) => setTargetEndDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border-2 focus:outline-none focus:border-black"
              style={{
                borderColor: "var(--win95-border)",
                background: "var(--win95-bg)",
                color: "var(--win95-text)",
              }}
            />
          </div>
        </div>
      </div>

      {/* Budget Section */}
      <div
        className="p-4 border-2"
        style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
      >
        <h3 className="text-sm font-bold mb-4" style={{ color: "var(--win95-text)" }}>
          Budget
        </h3>

        <div className="grid grid-cols-2 gap-4">
          {/* Budget Amount */}
          <div>
            <label className="block text-xs font-bold mb-1" style={{ color: "var(--win95-text)" }}>
              Amount
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={budgetAmount}
              onChange={(e) => setBudgetAmount(e.target.value)}
              className="w-full px-3 py-2 text-sm border-2 focus:outline-none focus:border-black"
              style={{
                borderColor: "var(--win95-border)",
                background: "var(--win95-bg)",
                color: "var(--win95-text)",
              }}
              placeholder="0.00"
            />
          </div>

          {/* Currency */}
          <div>
            <label className="block text-xs font-bold mb-1" style={{ color: "var(--win95-text)" }}>
              Currency
            </label>
            <select
              value={budgetCurrency}
              onChange={(e) => setBudgetCurrency(e.target.value)}
              className="w-full px-3 py-2 text-sm border-2 focus:outline-none focus:border-black"
              style={{
                borderColor: "var(--win95-border)",
                background: "var(--win95-bg)",
                color: "var(--win95-text)",
              }}
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="CAD">CAD</option>
              <option value="AUD">AUD</option>
            </select>
          </div>
        </div>
      </div>

      {/* Detailed Description Section */}
      <div
        className="p-4 border-2"
        style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
      >
        <h3 className="text-sm font-bold mb-4" style={{ color: "var(--win95-text)" }}>
          Detailed Description
        </h3>
        <p className="text-xs mb-2" style={{ color: "var(--neutral-gray)" }}>
          Use the rich text editor to format your project description (bold, italic, lists, etc.)
        </p>

        <RichTextEditor
          value={detailedDescription}
          onChange={setDetailedDescription}
          placeholder="Enter detailed project description, requirements, notes, etc."
          disabled={isSubmitting}
        />
      </div>

      {/* Meetings Section (only for edit mode) */}
      {mode === "edit" && projectId && (
        <div
          className="p-4 border-2"
          style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
        >
          <h3 className="text-sm font-bold mb-2 flex items-center gap-2" style={{ color: "var(--win95-text)" }}>
            <Calendar size={16} />
            Project Meetings
          </h3>
          <p className="text-xs mb-4" style={{ color: "var(--neutral-gray)" }}>
            Manage client-facing meetings for this project. These will be visible in the Project Drawer.
          </p>

          <div
            className="border-2 rounded overflow-hidden"
            style={{ borderColor: "var(--win95-border)" }}
          >
            <MeetingsTab
              projectId={projectId}
              sessionId={sessionId}
              organizationId={organizationId}
            />
          </div>
        </div>
      )}

      {/* Public Project Page Section (only for edit mode) */}
      {mode === "edit" && projectId && (
        <div
          className="p-4 border-2"
          style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
        >
          <h3 className="text-sm font-bold mb-2 flex items-center gap-2" style={{ color: "var(--win95-text)" }}>
            <Globe size={16} />
            Public Project Page
          </h3>
          <p className="text-xs mb-4" style={{ color: "var(--neutral-gray)" }}>
            Create a public-facing page for this project that clients can access via a unique URL.
          </p>

          {/* Enable Toggle */}
          <div className="mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={publicPageEnabled}
                onChange={(e) => setPublicPageEnabled(e.target.checked)}
                className="w-4 h-4"
                disabled={publicPageSaving}
              />
              <span className="text-sm font-bold" style={{ color: "var(--win95-text)" }}>
                Enable public page
              </span>
            </label>
          </div>

          {publicPageEnabled && (
            <div className="space-y-4 pl-6 border-l-2" style={{ borderColor: "var(--win95-highlight)" }}>
              {/* Slug */}
              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: "var(--win95-text)" }}>
                  URL Slug <span style={{ color: "var(--error)" }}>*</span>
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                    /project/
                  </span>
                  <input
                    type="text"
                    value={publicPageSlug}
                    onChange={(e) => setPublicPageSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                    placeholder="my-project"
                    className="flex-1 px-2 py-1 text-sm border-2 focus:outline-none focus:border-black"
                    style={{
                      borderColor: "var(--win95-border)",
                      background: "var(--win95-bg)",
                      color: "var(--win95-text)",
                    }}
                    disabled={publicPageSaving}
                    maxLength={50}
                  />
                </div>
                <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
                  Only lowercase letters, numbers, and hyphens. 3-50 characters.
                </p>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: "var(--win95-text)" }}>
                  Password Protection
                </label>
                <input
                  type="text"
                  value={publicPagePassword}
                  onChange={(e) => setPublicPagePassword(e.target.value)}
                  placeholder="Leave empty for no password"
                  className="w-full px-2 py-1 text-sm border-2 focus:outline-none focus:border-black"
                  style={{
                    borderColor: "var(--win95-border)",
                    background: "var(--win95-bg)",
                    color: "var(--win95-text)",
                  }}
                  disabled={publicPageSaving}
                />
              </div>

              {/* Theme */}
              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: "var(--win95-text)" }}>
                  Theme Color
                </label>
                <select
                  value={publicPageTheme}
                  onChange={(e) => setPublicPageTheme(e.target.value)}
                  className="w-full px-2 py-1 text-sm border-2 focus:outline-none focus:border-black"
                  style={{
                    borderColor: "var(--win95-border)",
                    background: "var(--win95-bg)",
                    color: "var(--win95-text)",
                  }}
                  disabled={publicPageSaving}
                >
                  <option value="purple">Purple (Default)</option>
                  <option value="amber">Amber/Orange</option>
                  <option value="blue">Blue</option>
                  <option value="green">Green</option>
                  <option value="neutral">Neutral/Gray</option>
                </select>
              </div>

              {/* Template */}
              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: "var(--win95-text)" }}>
                  Page Template
                </label>
                <select
                  value={publicPageTemplate}
                  onChange={(e) => setPublicPageTemplate(e.target.value)}
                  className="w-full px-2 py-1 text-sm border-2 focus:outline-none focus:border-black"
                  style={{
                    borderColor: "var(--win95-border)",
                    background: "var(--win95-bg)",
                    color: "var(--win95-text)",
                  }}
                  disabled={publicPageSaving}
                >
                  <option value="simple">Simple (Meetings Only)</option>
                  <option value="proposal">Proposal (Full Landing Page)</option>
                  <option value="rikscha">Rikscha (Hamburg Pedicab)</option>
                  <option value="gerrit">Gerrit (Sailing School)</option>
                  <option value="portfolio">Portfolio (Project Showcase)</option>
                </select>
              </div>

              {/* Save Button & Preview Link */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleSavePublicPage}
                  disabled={publicPageSaving || !publicPageSlug || publicPageSlug.length < 3}
                  className="px-3 py-1.5 text-xs font-bold flex items-center gap-2 border-2 transition-colors hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    borderColor: "var(--win95-border)",
                    background: "var(--win95-highlight)",
                    color: "white",
                  }}
                >
                  {publicPageSaving ? (
                    <>
                      <Loader2 size={12} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={12} />
                      Save Public Page
                    </>
                  )}
                </button>

                {publicPageSlug && publicPageSlug.length >= 3 && (
                  <a
                    href={`/project/${publicPageSlug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs flex items-center gap-1 hover:underline"
                    style={{ color: "var(--win95-highlight)" }}
                  >
                    <ExternalLink size={12} />
                    Preview: /project/{publicPageSlug}
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-3 justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-bold flex items-center gap-2 border-2 transition-colors hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            borderColor: "var(--win95-border)",
            background: "var(--win95-button-face)",
            color: "var(--win95-text)",
          }}
        >
          <X size={14} />
          Cancel
        </button>

        <button
          type="submit"
          disabled={isSubmitting || !name}
          className="px-4 py-2 text-sm font-bold flex items-center gap-2 border-2 transition-colors hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
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
              {mode === "create" ? "Create Project" : "Save Changes"}
            </>
          )}
        </button>
      </div>
    </form>
  );
}
