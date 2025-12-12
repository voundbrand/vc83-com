"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import { FileText, ExternalLink, Eye, EyeOff, Trash2, Loader2, AlertCircle, Edit, Settings2, Archive, Download } from "lucide-react";
import { useState } from "react";
import { Id } from "../../../../convex/_generated/dataModel";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import { ContentRulesModal } from "./content-rules-modal";
import { useNotification } from "@/hooks/use-notification";
import { useRetroConfirm } from "@/components/retro-confirm-dialog";
import { VercelDeploymentModal } from "./vercel-deployment-modal";

interface PublishedPagesTabProps {
  onEditPage: (page: {
    _id: Id<"objects">;
    name: string;
    customProperties?: {
      slug: string;
      metaTitle: string;
      metaDescription?: string;
      templateCode?: string;
      themeCode?: string;
      templateContent?: Record<string, unknown>;
    };
  }) => void;
}

/**
 * Published Pages Tab
 *
 * Shows list of organization's published pages with status badges and actions.
 * Org owners can view, edit, publish/unpublish, and delete pages.
 */
type PageSubTab = "drafts" | "published";

export function PublishedPagesTab({ onEditPage }: PublishedPagesTabProps) {
  const { sessionId } = useAuth();
  const currentOrg = useCurrentOrganization();
  const { t } = useNamespaceTranslations("ui.web_publishing");

  // Default to showing drafts
  const [subTab, setSubTab] = useState<PageSubTab>("drafts");
  // Default to showing only "active" (non-archived) pages
  const [selectedStatus, setSelectedStatus] = useState<string | undefined>("active");

  // Fetch org's published pages
  const pages = useQuery(
    api.publishingOntology.getPublishedPages,
    sessionId && currentOrg?.id
      ? { sessionId, organizationId: currentOrg.id as Id<"organizations">, status: selectedStatus }
      : "skip"
  );

  // Separate pages by status for tabs
  const draftPages = pages?.filter(p => ["draft", "review"].includes(p.status || "draft")) || [];
  const publishedPages = pages?.filter(p => ["published", "unpublished", "archived"].includes(p.status || "draft")) || [];

  if (!sessionId || !currentOrg) {
    return (
      <div className="p-4">
        <div
          className="border-2 p-4"
          style={{
            borderColor: 'var(--error)',
            background: 'var(--win95-bg-light)'
          }}
        >
          <div className="flex items-start gap-2">
            <AlertCircle size={20} style={{ color: 'var(--error)' }} className="flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm" style={{ color: 'var(--win95-text)' }}>
                {t("ui.web_publishing.pages.auth_required")}
              </h4>
              <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
                {t("ui.web_publishing.pages.auth_required_desc")}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (pages === undefined) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 size={32} className="animate-spin" style={{ color: 'var(--win95-highlight)' }} />
      </div>
    );
  }

  if (pages.length === 0) {
    return (
      <div className="p-4">
        <div
          className="border-2 p-8 text-center"
          style={{
            borderColor: 'var(--win95-border)',
            background: 'var(--win95-bg-light)'
          }}
        >
          <FileText size={48} className="mx-auto mb-4" style={{ color: 'var(--neutral-gray)' }} />
          <h4 className="font-bold text-sm mb-2" style={{ color: 'var(--win95-text)' }}>
            {t("ui.web_publishing.pages.no_pages_title")}
          </h4>
          <p className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
            {t("ui.web_publishing.pages.no_pages_desc")}
          </p>
        </div>
      </div>
    );
  }

  const currentPages = subTab === "drafts" ? draftPages : publishedPages;

  return (
    <div className="flex flex-col h-full">
      {/* Sub-tabs for Drafts/Published */}
      <div className="flex border-b-2 px-4 pt-4" style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg)" }}>
        <button
          onClick={() => setSubTab("drafts")}
          className={`px-4 py-2 text-xs font-semibold border-2 border-b-0 transition-colors flex items-center gap-2 ${
            subTab === "drafts" ? "-mb-0.5" : ""
          }`}
          style={{
            backgroundColor: subTab === "drafts" ? "var(--win95-bg-light)" : "var(--win95-bg)",
            color: subTab === "drafts" ? "var(--win95-highlight)" : "var(--neutral-gray)",
            borderColor: subTab === "drafts" ? "var(--win95-border)" : "transparent",
          }}
        >
          <Edit size={12} />
          {t("ui.web_publishing.subtabs.drafts")} ({draftPages.length})
        </button>
        <button
          onClick={() => setSubTab("published")}
          className={`px-4 py-2 text-xs font-semibold border-2 border-b-0 transition-colors flex items-center gap-2 ${
            subTab === "published" ? "-mb-0.5" : ""
          }`}
          style={{
            backgroundColor: subTab === "published" ? "var(--win95-bg-light)" : "var(--win95-bg)",
            color: subTab === "published" ? "var(--win95-highlight)" : "var(--neutral-gray)",
            borderColor: subTab === "published" ? "var(--win95-border)" : "transparent",
          }}
        >
          <Eye size={12} />
          {t("ui.web_publishing.subtabs.published")} ({publishedPages.length})
        </button>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {currentPages.length === 0 ? (
          <div className="text-center py-12" style={{ color: "var(--neutral-gray)" }}>
            <div className="text-4xl mb-4">{subTab === "drafts" ? "📝" : "🌐"}</div>
            <h3 className="text-sm font-semibold mb-2">
              {subTab === "drafts"
                ? t("ui.web_publishing.empty_drafts_title")
                : t("ui.web_publishing.empty_published_title")}
            </h3>
            <p className="text-xs">
              {subTab === "drafts"
                ? t("ui.web_publishing.empty_drafts_description")
                : t("ui.web_publishing.empty_published_description")}
            </p>
          </div>
        ) : (
          <div className="p-4">
            {/* Header with filters */}
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold" style={{ color: 'var(--win95-text)' }}>
                  {subTab === "drafts" ? t("ui.web_publishing.pages.your_drafts") : t("ui.web_publishing.pages.your_published")}
                </h3>
                <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
                  {currentPages.length} {currentPages.length !== 1 ? t("ui.web_publishing.pages.count_plural").replace('{count}', String(currentPages.length)) : t("ui.web_publishing.pages.count").replace('{count}', String(currentPages.length))} {t("ui.web_publishing.pages.total")}
                </p>
              </div>

              {/* Status filter - only show in published tab */}
              {subTab === "published" && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold" style={{ color: 'var(--win95-text)' }}>
                    {t("ui.web_publishing.pages.status_label")}
                  </span>
                  <select
                    className="px-2 py-1 text-xs border-2"
                    style={{
                      borderColor: 'var(--win95-border)',
                      background: 'var(--win95-bg-light)',
                      color: 'var(--win95-text)'
                    }}
                    value={selectedStatus || "all"}
                    onChange={(e) => setSelectedStatus(e.target.value === "all" ? undefined : e.target.value)}
                  >
                    <option value="active">{t("ui.web_publishing.pages.filter.active")}</option>
                    <option value="all">{t("ui.web_publishing.pages.filter.all")}</option>
                    <option value="published">{t("ui.web_publishing.pages.filter.published")}</option>
                    <option value="unpublished">{t("ui.web_publishing.pages.filter.unpublished")}</option>
                    <option value="archived">{t("ui.web_publishing.pages.filter.archived")}</option>
                  </select>
                </div>
              )}
            </div>

            {/* Pages list */}
            <div className="space-y-2">
              {currentPages.map((page) => (
                <PageCard key={page._id} page={page} onEditPage={onEditPage} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Individual page card with status and actions
 */
function PageCard({
  page,
  onEditPage,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  page: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onEditPage: (page: any) => void;
}) {
  const { sessionId } = useAuth();
  const { t } = useNamespaceTranslations("ui.web_publishing");
  const notification = useNotification();
  const confirmDialog = useRetroConfirm();
  const [isLoading, setIsLoading] = useState(false);
  const [showContentRules, setShowContentRules] = useState(false);
  const [showDeploymentModal, setShowDeploymentModal] = useState(false);

  const publishPage = useMutation(api.publishingOntology.setPublishingStatus);
  const archivePage = useMutation(api.publishingOntology.archivePublishedPage);
  const deletePage = useMutation(api.publishingOntology.deletePublishedPage);

  const publicUrl = page.customProperties?.publicUrl || "";
  const status = page.status || "draft";
  const template = page.template;
  const viewCount = page.customProperties?.viewCount || 0;
  const publishedAt = page.customProperties?.publishedAt;

  const handlePublish = async () => {
    if (!sessionId) return;
    setIsLoading(true);
    try {
      await publishPage({
        sessionId,
        publishedPageId: page._id,
        status: "published"
      });
      notification.success("Published", "Page has been published successfully");
    } catch (error) {
      console.error("Failed to publish page:", error);
      notification.error("Publish Failed", error instanceof Error ? error.message : "Unknown error", false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnpublish = async () => {
    if (!sessionId) return;
    setIsLoading(true);
    try {
      await publishPage({
        sessionId,
        publishedPageId: page._id,
        status: "unpublished"
      });
      notification.success("Unpublished", "Page has been unpublished successfully");
    } catch (error) {
      console.error("Failed to unpublish page:", error);
      notification.error("Unpublish Failed", error instanceof Error ? error.message : "Unknown error", false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleArchive = async () => {
    if (!sessionId) return;

    const confirmed = await confirmDialog.confirm({
      title: "Archive Page",
      message: `Are you sure you want to archive "${page.name}"? The page will be hidden but can be restored later.`,
      confirmText: "Archive",
      cancelText: "Cancel",
      confirmVariant: "secondary",
    });

    if (!confirmed) return;

    setIsLoading(true);
    try {
      await archivePage({
        sessionId,
        publishedPageId: page._id
      });
      notification.success("Archived", "Page has been archived successfully");
    } catch (error) {
      console.error("Failed to archive page:", error);
      notification.error("Archive Failed", error instanceof Error ? error.message : "Unknown error", false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!sessionId) return;

    const confirmed = await confirmDialog.confirm({
      title: "Permanently Delete Page",
      message: `Are you sure you want to PERMANENTLY delete "${page.name}"? This action cannot be undone. Consider archiving instead.`,
      confirmText: "Delete Forever",
      cancelText: "Cancel",
      confirmVariant: "primary",
    });

    if (!confirmed) return;

    setIsLoading(true);
    try {
      await deletePage({
        sessionId,
        publishedPageId: page._id
      });
      notification.success("Deleted", "Page has been permanently deleted");
    } catch (error) {
      console.error("Failed to delete page:", error);
      notification.error("Delete Failed", error instanceof Error ? error.message : "Unknown error", false);
    } finally {
      setIsLoading(false);
    }
  };

  // Status badge styling - using theme variables
  const statusColors: Record<string, { bg: string; text: string; label: string }> = {
    draft: { bg: "var(--neutral-gray)", text: "white", label: t("ui.web_publishing.page_card.status.draft") },
    review: { bg: "var(--warning)", text: "white", label: t("ui.web_publishing.page_card.status.review") },
    published: { bg: "var(--success)", text: "white", label: t("ui.web_publishing.page_card.status.live") },
    unpublished: { bg: "var(--neutral-gray)", text: "white", label: t("ui.web_publishing.page_card.status.unpublished") },
    archived: { bg: "var(--error)", text: "white", label: t("ui.web_publishing.page_card.status.archived") },
  };

  const statusStyle = statusColors[status] || statusColors.draft;

  return (
    <div
      className="border-2 p-3 transition-colors"
      style={{
        borderColor: 'var(--win95-border)',
        background: 'var(--win95-bg-light)'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--win95-hover-light)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'var(--win95-bg-light)';
      }}
    >
      <div className="flex items-start justify-between">
        {/* Left: Page info */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-bold text-sm" style={{ color: 'var(--win95-text)' }}>
              {page.name}
            </h4>
            <span
              className="px-2 py-0.5 text-xs font-bold"
              style={{ backgroundColor: statusStyle.bg, color: statusStyle.text }}
            >
              {statusStyle.label}
            </span>
          </div>

          {/* Template badge */}
          {template && (
            <div className="text-xs mb-1" style={{ color: 'var(--neutral-gray)' }}>
              {t("ui.web_publishing.page_card.template")} <span className="font-bold">{template.name}</span>
              {template.code && (
                <code className="ml-1 px-1" style={{ background: 'var(--win95-bg)', color: 'var(--win95-text)' }}>
                  ({template.code})
                </code>
              )}
            </div>
          )}

          {/* Meta info */}
          <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--neutral-gray)' }}>
            {status === "published" && (
              <>
                <span className="flex items-center gap-1">
                  <Eye size={12} />
                  {t("ui.web_publishing.page_card.views").replace("{count}", String(viewCount))}
                </span>
                {publishedAt && (
                  <span>
                    {t("ui.web_publishing.page_card.published_on").replace("{date}", new Date(publishedAt).toLocaleDateString())}
                  </span>
                )}
              </>
            )}
            {status !== "published" && (
              <span>{t("ui.web_publishing.page_card.not_published")}</span>
            )}
          </div>

          {/* Public URL */}
          {publicUrl && (
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs hover:underline mt-1 flex items-center gap-1"
              style={{ color: 'var(--win95-highlight)' }}
            >
              {publicUrl}
              <ExternalLink size={10} />
            </a>
          )}
        </div>

        {/* Right: Action buttons */}
        <div className="flex items-center gap-1">
          {/* Deploy to Vercel button (only for external_app subtype) */}
          {page.subtype === "external_app" && (
            <button
              className="px-2 py-1 text-xs border-2 flex items-center gap-1 transition-colors"
              style={{
                borderColor: 'var(--win95-border)',
                background: 'var(--win95-bg-light)',
                color: 'var(--win95-highlight)'
              }}
              title="Deploy to Vercel"
              disabled={isLoading}
              onClick={() => setShowDeploymentModal(true)}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--win95-hover-light)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--win95-bg-light)';
              }}
            >
              <Download size={12} />
            </button>
          )}

          {/* Content Rules button */}
          <button
            className="px-2 py-1 text-xs border-2 flex items-center gap-1 transition-colors"
            style={{
              borderColor: 'var(--win95-border)',
              background: 'var(--win95-bg-light)',
              color: 'var(--win95-highlight)'
            }}
            title="Configure content rules for external frontend"
            disabled={isLoading}
            onClick={() => setShowContentRules(true)}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--win95-hover-light)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--win95-bg-light)';
            }}
          >
            <Settings2 size={12} />
          </button>

          {/* Edit button */}
          <button
            className="px-2 py-1 text-xs border-2 flex items-center gap-1 transition-colors"
            style={{
              borderColor: 'var(--win95-border)',
              background: 'var(--win95-bg-light)',
              color: 'var(--info)'
            }}
            title={t("ui.web_publishing.page_card.action.edit")}
            disabled={isLoading}
            onClick={() => onEditPage(page)}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--win95-hover-light)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--win95-bg-light)';
            }}
          >
            <Edit size={12} />
          </button>

          {/* Publish/Unpublish button */}
          {status === "published" && (
            <button
              onClick={handleUnpublish}
              disabled={isLoading}
              className="px-2 py-1 text-xs border-2 flex items-center gap-1 disabled:opacity-50 transition-colors"
              style={{
                borderColor: 'var(--win95-border)',
                background: 'var(--win95-bg-light)',
                color: 'var(--win95-text)'
              }}
              title={t("ui.web_publishing.page_card.action.unpublish")}
              onMouseEnter={(e) => {
                if (!isLoading) e.currentTarget.style.background = 'var(--win95-hover-light)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--win95-bg-light)';
              }}
            >
              {isLoading ? <Loader2 size={12} className="animate-spin" /> : <EyeOff size={12} />}
            </button>
          )}
          {status !== "published" && status !== "archived" && (
            <button
              onClick={handlePublish}
              disabled={isLoading}
              className="px-2 py-1 text-xs border-2 flex items-center gap-1 disabled:opacity-50 transition-colors"
              style={{
                borderColor: 'var(--win95-border)',
                background: 'var(--win95-bg-light)',
                color: 'var(--success)'
              }}
              title={t("ui.web_publishing.page_card.action.publish")}
              onMouseEnter={(e) => {
                if (!isLoading) e.currentTarget.style.background = 'var(--win95-hover-light)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--win95-bg-light)';
              }}
            >
              {isLoading ? <Loader2 size={12} className="animate-spin" /> : <Eye size={12} />}
            </button>
          )}

          {/* Archive button (for non-archived pages) */}
          {status !== "archived" && (
            <button
              onClick={handleArchive}
              disabled={isLoading}
              className="px-2 py-1 text-xs border-2 flex items-center gap-1 disabled:opacity-50 transition-colors"
              style={{
                borderColor: 'var(--win95-border)',
                background: 'var(--win95-bg-light)',
                color: 'var(--warning)'
              }}
              title="Archive page (can be restored later)"
              onMouseEnter={(e) => {
                if (!isLoading) e.currentTarget.style.background = 'var(--win95-hover-light)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--win95-bg-light)';
              }}
            >
              {isLoading ? <Loader2 size={12} className="animate-spin" /> : <Archive size={12} />}
            </button>
          )}

          {/* Delete button (permanent) */}
          <button
            onClick={handleDelete}
            disabled={isLoading}
            className="px-2 py-1 text-xs border-2 flex items-center gap-1 disabled:opacity-50 transition-colors"
            style={{
              borderColor: 'var(--win95-border)',
              background: 'var(--win95-bg-light)',
              color: 'var(--error)'
            }}
            title="Permanently delete page (cannot be undone)"
            onMouseEnter={(e) => {
              if (!isLoading) e.currentTarget.style.background = 'var(--win95-hover-light)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--win95-bg-light)';
            }}
          >
            {isLoading ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
          </button>
        </div>
      </div>

      {/* Deployment Modal */}
      {showDeploymentModal && (
        <VercelDeploymentModal
          page={page}
          onClose={() => setShowDeploymentModal(false)}
          onEditPage={() => {
            setShowDeploymentModal(false);
            onEditPage(page);
          }}
        />
      )}

      {/* Content Rules Modal */}
      {showContentRules && (
        <ContentRulesModal
          page={page}
          onClose={() => setShowContentRules(false)}
        />
      )}

      {/* Confirmation Dialog */}
      <confirmDialog.Dialog />
    </div>
  );
}
