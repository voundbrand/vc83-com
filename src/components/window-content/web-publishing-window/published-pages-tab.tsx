"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import { FileText, ExternalLink, Eye, EyeOff, Trash2, Loader2, AlertCircle, Edit } from "lucide-react";
import { useState } from "react";
import { Id } from "../../../../convex/_generated/dataModel";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";

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
export function PublishedPagesTab({ onEditPage }: PublishedPagesTabProps) {
  const { sessionId } = useAuth();
  const currentOrg = useCurrentOrganization();
  const { t } = useNamespaceTranslations("ui.web_publishing");

  // Default to showing only "active" (non-archived) pages
  const [selectedStatus, setSelectedStatus] = useState<string | undefined>("active");

  // Fetch org's published pages
  const pages = useQuery(
    api.publishingOntology.getPublishedPages,
    sessionId && currentOrg?.id
      ? { sessionId, organizationId: currentOrg.id as Id<"organizations">, status: selectedStatus }
      : "skip"
  );

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

  return (
    <div className="p-4">
      {/* Header with filters */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold" style={{ color: 'var(--win95-text)' }}>
            {t("ui.web_publishing.pages.your_pages")}
          </h3>
          <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
            {pages.length} {pages.length !== 1 ? t("ui.web_publishing.pages.count_plural").replace('{count}', String(pages.length)) : t("ui.web_publishing.pages.count").replace('{count}', String(pages.length))} {t("ui.web_publishing.pages.total")}
          </p>
        </div>

        {/* Status filter */}
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
            <option value="draft">{t("ui.web_publishing.pages.filter.draft")}</option>
            <option value="review">{t("ui.web_publishing.pages.filter.review")}</option>
            <option value="published">{t("ui.web_publishing.pages.filter.published")}</option>
            <option value="unpublished">{t("ui.web_publishing.pages.filter.unpublished")}</option>
            <option value="archived">{t("ui.web_publishing.pages.filter.archived")}</option>
          </select>
        </div>
      </div>

      {/* Pages list */}
      <div className="space-y-2">
        {pages.map((page) => (
          <PageCard key={page._id} page={page} onEditPage={onEditPage} />
        ))}
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
  page: { _id: Id<"objects">; name: string; status?: string; customProperties?: { publicUrl?: string; metaTitle?: string; metaDescription?: string; slug?: string; templateCode?: string; themeCode?: string; templateContent?: Record<string, unknown>; viewCount?: number; publishedAt?: number }; template?: { name: string; code?: string } | null };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onEditPage: (page: any) => void;
}) {
  const { sessionId } = useAuth();
  const { t } = useNamespaceTranslations("ui.web_publishing");
  const [isLoading, setIsLoading] = useState(false);

  const publishPage = useMutation(api.publishingOntology.setPublishingStatus);
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
    } catch (error) {
      console.error("Failed to publish page:", error);
      alert(`Failed to publish: ${error instanceof Error ? error.message : "Unknown error"}`);
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
    } catch (error) {
      console.error("Failed to unpublish page:", error);
      alert(`Failed to unpublish: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!sessionId) return;
    const confirmMessage = t("ui.web_publishing.page_card.delete_confirm").replace("{name}", page.name);
    if (!confirm(confirmMessage)) return;

    setIsLoading(true);
    try {
      await deletePage({
        sessionId,
        publishedPageId: page._id
      });
    } catch (error) {
      console.error("Failed to delete page:", error);
      alert(`Failed to delete: ${error instanceof Error ? error.message : "Unknown error"}`);
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

          {/* Delete button */}
          <button
            onClick={handleDelete}
            disabled={isLoading}
            className="px-2 py-1 text-xs border-2 flex items-center gap-1 disabled:opacity-50 transition-colors"
            style={{
              borderColor: 'var(--win95-border)',
              background: 'var(--win95-bg-light)',
              color: 'var(--error)'
            }}
            title={t("ui.web_publishing.page_card.action.delete")}
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
    </div>
  );
}
