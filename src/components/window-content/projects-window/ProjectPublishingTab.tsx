/**
 * PROJECT PUBLISHING TAB
 * Configure public project page settings
 */

"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { ExternalLink, Loader2, Save, Globe, Lock, Palette, Layout } from "lucide-react";
import type { PublicPageConfig } from "./ProjectBuilder";
import { CustomDomainSection } from "./CustomDomainSection";

interface ProjectPublishingTabProps {
  projectId: Id<"objects">;
  sessionId: string;
  organizationId: Id<"organizations">;
  publicPage: PublicPageConfig;
  onChange: (config: PublicPageConfig) => void;
}

export function ProjectPublishingTab({
  projectId,
  sessionId,
  organizationId,
  publicPage,
  onChange,
}: ProjectPublishingTabProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const updatePublicPage = useMutation(api.projectOntology.updateProjectPublicPage);

  const handleSave = async () => {
    if (!publicPage.slug || publicPage.slug.length < 3) {
      setError("URL slug must be at least 3 characters");
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await updatePublicPage({
        sessionId,
        projectId,
        publicPage: {
          enabled: publicPage.enabled,
          slug: publicPage.slug,
          password: publicPage.password || undefined,
          theme: publicPage.theme,
          template: publicPage.template,
        },
      });
      setSuccessMessage("Publishing settings saved!");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save publishing settings");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div
        className="p-4 border-2"
        style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg-elevated)" }}
      >
        <div className="flex items-center gap-2 mb-2">
          <Globe size={18} style={{ color: "var(--tone-accent)" }} />
          <h3 className="text-sm font-bold" style={{ color: "var(--window-document-text)" }}>
            Public Project Page
          </h3>
        </div>
        <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
          Create a public-facing page for this project that clients can access via a unique URL.
          Perfect for sharing project status, meeting recordings, and documents with external stakeholders.
        </p>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div
          className="p-3 border-2"
          style={{ borderColor: "var(--error)", background: "#FEE", color: "var(--error)" }}
        >
          <span className="text-sm font-bold">{error}</span>
        </div>
      )}
      {successMessage && (
        <div
          className="p-3 border-2"
          style={{ borderColor: "var(--success)", background: "#EFE", color: "var(--success)" }}
        >
          <span className="text-sm font-bold">{successMessage}</span>
        </div>
      )}

      {/* Enable Toggle */}
      <div
        className="p-4 border-2"
        style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg-elevated)" }}
      >
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={publicPage.enabled}
            onChange={(e) => onChange({ ...publicPage, enabled: e.target.checked })}
            className="w-5 h-5"
            disabled={isSaving}
          />
          <div>
            <span className="text-sm font-bold" style={{ color: "var(--window-document-text)" }}>
              Enable Public Page
            </span>
            <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
              When enabled, the page will be accessible at the URL below
            </p>
          </div>
        </label>
      </div>

      {publicPage.enabled && (
        <>
          {/* URL Configuration */}
          <div
            className="p-4 border-2"
            style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg-elevated)" }}
          >
            <div className="flex items-center gap-2 mb-3">
              <ExternalLink size={14} style={{ color: "var(--tone-accent)" }} />
              <h4 className="text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
                URL Configuration
              </h4>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-bold mb-1" style={{ color: "var(--window-document-text)" }}>
                URL Slug <span style={{ color: "var(--error)" }}>*</span>
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-2 border-2" style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg)", color: "var(--neutral-gray)" }}>
                  l4yercak3.com/project/
                </span>
                <input
                  type="text"
                  value={publicPage.slug}
                  onChange={(e) =>
                    onChange({
                      ...publicPage,
                      slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                    })
                  }
                  placeholder="my-project"
                  className="flex-1 px-3 py-2 text-sm border-2 focus:outline-none focus:border-black"
                  style={{
                    borderColor: "var(--window-document-border)",
                    background: "var(--window-document-bg)",
                    color: "var(--window-document-text)",
                  }}
                  disabled={isSaving}
                  maxLength={50}
                />
              </div>
              <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
                Only lowercase letters, numbers, and hyphens. 3-50 characters.
              </p>
            </div>

            {publicPage.slug && publicPage.slug.length >= 3 && (
              <a
                href={`/project/${publicPage.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs hover:underline"
                style={{ color: "var(--tone-accent)" }}
              >
                <ExternalLink size={12} />
                Preview: l4yercak3.com/project/{publicPage.slug}
              </a>
            )}
          </div>

          {/* Password Protection */}
          <div
            className="p-4 border-2"
            style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg-elevated)" }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Lock size={14} style={{ color: "var(--tone-accent)" }} />
              <h4 className="text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
                Password Protection
              </h4>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1" style={{ color: "var(--window-document-text)" }}>
                Password
              </label>
              <input
                type="text"
                value={publicPage.password}
                onChange={(e) => onChange({ ...publicPage, password: e.target.value })}
                placeholder="Leave empty for no password"
                className="w-full px-3 py-2 text-sm border-2 focus:outline-none focus:border-black"
                style={{
                  borderColor: "var(--window-document-border)",
                  background: "var(--window-document-bg)",
                  color: "var(--window-document-text)",
                }}
                disabled={isSaving}
              />
              <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
                Visitors will need to enter this password to view the page. Leave empty for public access.
              </p>
            </div>
          </div>

          {/* Appearance */}
          <div
            className="p-4 border-2"
            style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg-elevated)" }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Palette size={14} style={{ color: "var(--tone-accent)" }} />
              <h4 className="text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
                Appearance
              </h4>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Theme */}
              <div>
                <label className="block text-xs font-bold mb-1" style={{ color: "var(--window-document-text)" }}>
                  Theme Color
                </label>
                <select
                  value={publicPage.theme}
                  onChange={(e) => onChange({ ...publicPage, theme: e.target.value })}
                  className="w-full px-3 py-2 text-sm border-2 focus:outline-none focus:border-black"
                  style={{
                    borderColor: "var(--window-document-border)",
                    background: "var(--window-document-bg)",
                    color: "var(--window-document-text)",
                  }}
                  disabled={isSaving}
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
                <label className="block text-xs font-bold mb-1" style={{ color: "var(--window-document-text)" }}>
                  Page Template
                </label>
                <select
                  value={publicPage.template}
                  onChange={(e) => onChange({ ...publicPage, template: e.target.value })}
                  className="w-full px-3 py-2 text-sm border-2 focus:outline-none focus:border-black"
                  style={{
                    borderColor: "var(--window-document-border)",
                    background: "var(--window-document-bg)",
                    color: "var(--window-document-text)",
                  }}
                  disabled={isSaving}
                >
                  <option value="simple">Simple (Meetings Only)</option>
                  <option value="proposal">Proposal (Full Landing Page)</option>
                  <option value="rikscha">Rikscha (Hamburg Pedicab)</option>
                  <option value="gerrit">Gerrit (Sailing School)</option>
                  <option value="portfolio">Portfolio (Project Showcase)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Template Preview Info */}
          <div
            className="p-4 border-2"
            style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg-elevated)" }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Layout size={14} style={{ color: "var(--tone-accent)" }} />
              <h4 className="text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
                Template Info
              </h4>
            </div>

            <div className="text-xs space-y-2" style={{ color: "var(--neutral-gray)" }}>
              {publicPage.template === "simple" && (
                <p>A clean, minimal template that focuses on meeting content. Ideal for ongoing projects where you want to share recordings and documents.</p>
              )}
              {publicPage.template === "proposal" && (
                <p>A full landing page template with hero section, features, and call-to-action. Great for presenting proposals to clients.</p>
              )}
              {publicPage.template === "rikscha" && (
                <p>Custom template designed for Hamburg pedicab advertising services with booking integration.</p>
              )}
              {publicPage.template === "gerrit" && (
                <p>Custom template designed for sailing school with maritime theme and interactive door animation.</p>
              )}
              {publicPage.template === "portfolio" && (
                <p>Showcase your project work with gallery and case study sections. Perfect for creative agencies.</p>
              )}
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={isSaving || !publicPage.slug || publicPage.slug.length < 3}
              className="px-4 py-2 text-xs font-bold flex items-center gap-2 border-2 transition-colors hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                borderColor: "var(--window-document-border)",
                background: "var(--tone-accent)",
                color: "white",
              }}
            >
              {isSaving ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={14} />
                  Save Publishing Settings
                </>
              )}
            </button>
          </div>

          {/* Custom Domain Section - only show when slug is valid */}
          {publicPage.slug && publicPage.slug.length >= 3 && (
            <CustomDomainSection
              sessionId={sessionId}
              organizationId={organizationId}
              projectId={projectId}
              projectSlug={publicPage.slug}
            />
          )}
        </>
      )}
    </div>
  );
}
