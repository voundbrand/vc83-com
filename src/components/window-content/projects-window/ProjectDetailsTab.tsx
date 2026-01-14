/**
 * PROJECT DETAILS TAB
 * Form fields for basic project information
 */

"use client";

import { Id } from "../../../../convex/_generated/dataModel";
import { ClientSelector } from "./ClientSelector";
import RichTextEditor from "./RichTextEditor";
import type { ProjectFormData } from "./ProjectBuilder";

interface ProjectDetailsTabProps {
  formData: ProjectFormData;
  onChange: (updates: Partial<ProjectFormData>) => void;
  mode: "create" | "edit";
  sessionId: string;
  organizationId: Id<"organizations">;
  disabled?: boolean;
}

export function ProjectDetailsTab({
  formData,
  onChange,
  mode,
  sessionId,
  organizationId,
  disabled = false,
}: ProjectDetailsTabProps) {
  return (
    <div className="space-y-6">
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
            value={formData.name}
            onChange={(e) => onChange({ name: e.target.value })}
            required
            maxLength={100}
            className="w-full px-3 py-2 text-sm border-2 focus:outline-none focus:border-black"
            style={{
              borderColor: "var(--win95-border)",
              background: "var(--win95-bg)",
              color: "var(--win95-text)",
            }}
            placeholder="Enter project name"
            disabled={disabled}
          />
        </div>

        {/* Short Description */}
        <div className="mb-4">
          <label className="block text-xs font-bold mb-1" style={{ color: "var(--win95-text)" }}>
            Short Description
          </label>
          <input
            type="text"
            value={formData.description}
            onChange={(e) => onChange({ description: e.target.value })}
            maxLength={200}
            className="w-full px-3 py-2 text-sm border-2 focus:outline-none focus:border-black"
            style={{
              borderColor: "var(--win95-border)",
              background: "var(--win95-bg)",
              color: "var(--win95-text)",
            }}
            placeholder="Brief project summary"
            disabled={disabled}
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
              value={formData.subtype}
              onChange={(e) => onChange({ subtype: e.target.value })}
              required
              className="w-full px-3 py-2 text-sm border-2 focus:outline-none focus:border-black"
              style={{
                borderColor: "var(--win95-border)",
                background: "var(--win95-bg)",
                color: "var(--win95-text)",
              }}
              disabled={disabled}
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
              value={formData.priority}
              onChange={(e) => onChange({ priority: e.target.value })}
              required
              className="w-full px-3 py-2 text-sm border-2 focus:outline-none focus:border-black"
              style={{
                borderColor: "var(--win95-border)",
                background: "var(--win95-bg)",
                color: "var(--win95-text)",
              }}
              disabled={disabled}
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
              value={formData.status}
              onChange={(e) => onChange({ status: e.target.value })}
              required
              className="w-full px-3 py-2 text-sm border-2 focus:outline-none focus:border-black"
              style={{
                borderColor: "var(--win95-border)",
                background: "var(--win95-bg)",
                color: "var(--win95-text)",
              }}
              disabled={disabled}
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
              Progress: {formData.progress}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={formData.progress}
              onChange={(e) => onChange({ progress: parseInt(e.target.value) })}
              className="w-full"
              disabled={disabled}
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
            value={formData.clientOrgId}
            onChange={(value) => onChange({ clientOrgId: value })}
            disabled={disabled}
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
              value={formData.startDate}
              onChange={(e) => onChange({ startDate: e.target.value })}
              className="w-full px-3 py-2 text-sm border-2 focus:outline-none focus:border-black"
              style={{
                borderColor: "var(--win95-border)",
                background: "var(--win95-bg)",
                color: "var(--win95-text)",
              }}
              disabled={disabled}
            />
          </div>

          {/* Target End Date */}
          <div>
            <label className="block text-xs font-bold mb-1" style={{ color: "var(--win95-text)" }}>
              Target End Date
            </label>
            <input
              type="date"
              value={formData.targetEndDate}
              onChange={(e) => onChange({ targetEndDate: e.target.value })}
              className="w-full px-3 py-2 text-sm border-2 focus:outline-none focus:border-black"
              style={{
                borderColor: "var(--win95-border)",
                background: "var(--win95-bg)",
                color: "var(--win95-text)",
              }}
              disabled={disabled}
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
              value={formData.budgetAmount}
              onChange={(e) => onChange({ budgetAmount: e.target.value })}
              className="w-full px-3 py-2 text-sm border-2 focus:outline-none focus:border-black"
              style={{
                borderColor: "var(--win95-border)",
                background: "var(--win95-bg)",
                color: "var(--win95-text)",
              }}
              placeholder="0.00"
              disabled={disabled}
            />
          </div>

          {/* Currency */}
          <div>
            <label className="block text-xs font-bold mb-1" style={{ color: "var(--win95-text)" }}>
              Currency
            </label>
            <select
              value={formData.budgetCurrency}
              onChange={(e) => onChange({ budgetCurrency: e.target.value })}
              className="w-full px-3 py-2 text-sm border-2 focus:outline-none focus:border-black"
              style={{
                borderColor: "var(--win95-border)",
                background: "var(--win95-bg)",
                color: "var(--win95-text)",
              }}
              disabled={disabled}
            >
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
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
          value={formData.detailedDescription}
          onChange={(value) => onChange({ detailedDescription: value })}
          placeholder="Enter detailed project description, requirements, notes, etc."
          disabled={disabled}
        />
      </div>
    </div>
  );
}
