"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import { FileText, ExternalLink, Eye, EyeOff, Trash2, Loader2, AlertCircle, Edit } from "lucide-react";
import { useState } from "react";
import { Id } from "../../../../convex/_generated/dataModel";

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
  const [selectedStatus, setSelectedStatus] = useState<string | undefined>(undefined);

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
        <div className="border-2 border-red-600 bg-red-50 p-4">
          <div className="flex items-start gap-2">
            <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm text-red-900">Authentication Required</h4>
              <p className="text-xs text-red-800 mt-1">
                Please log in to view published pages.
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
        <Loader2 size={32} className="animate-spin text-purple-600" />
      </div>
    );
  }

  if (pages.length === 0) {
    return (
      <div className="p-4">
        <div className="border-2 border-gray-400 bg-gray-50 p-8 text-center">
          <FileText size={48} className="mx-auto text-gray-400 mb-4" />
          <h4 className="font-bold text-sm text-gray-700 mb-2">No Published Pages Yet</h4>
          <p className="text-xs text-gray-600 mb-4">
            Create your first published page using the &quot;Create Page&quot; tab.
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
          <h3 className="text-sm font-bold">Your Published Pages</h3>
          <p className="text-xs text-gray-600 mt-1">
            {pages.length} page{pages.length !== 1 ? 's' : ''} total
          </p>
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold">Status:</span>
          <select
            className="border-2 border-gray-400 px-2 py-1 text-xs"
            value={selectedStatus || "all"}
            onChange={(e) => setSelectedStatus(e.target.value === "all" ? undefined : e.target.value)}
          >
            <option value="all">All</option>
            <option value="draft">Draft</option>
            <option value="review">Review</option>
            <option value="published">Published</option>
            <option value="unpublished">Unpublished</option>
            <option value="archived">Archived</option>
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
    if (!confirm(`Are you sure you want to delete "${page.name}"? This will archive the page.`)) return;

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

  // Status badge styling
  const statusColors: Record<string, { bg: string; text: string; label: string }> = {
    draft: { bg: "#9CA3AF", text: "white", label: "Draft" },
    review: { bg: "#F59E0B", text: "white", label: "Review" },
    published: { bg: "#10B981", text: "white", label: "Live" },
    unpublished: { bg: "#6B7280", text: "white", label: "Unpublished" },
    archived: { bg: "#EF4444", text: "white", label: "Archived" },
  };

  const statusStyle = statusColors[status] || statusColors.draft;

  return (
    <div className="border-2 border-gray-400 p-3 bg-white hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between">
        {/* Left: Page info */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-bold text-sm">{page.name}</h4>
            <span
              className="px-2 py-0.5 text-xs font-bold"
              style={{ backgroundColor: statusStyle.bg, color: statusStyle.text }}
            >
              {statusStyle.label}
            </span>
          </div>

          {/* Template badge */}
          {template && (
            <div className="text-xs text-gray-600 mb-1">
              Template: <span className="font-bold">{template.name}</span>
              {template.code && (
                <code className="ml-1 bg-gray-100 px-1">({template.code})</code>
              )}
            </div>
          )}

          {/* Meta info */}
          <div className="flex items-center gap-4 text-xs text-gray-500">
            {status === "published" && (
              <>
                <span className="flex items-center gap-1">
                  <Eye size={12} />
                  {viewCount} views
                </span>
                {publishedAt && (
                  <span>
                    Published {new Date(publishedAt).toLocaleDateString()}
                  </span>
                )}
              </>
            )}
            {status !== "published" && (
              <span className="text-gray-400">Not yet published</span>
            )}
          </div>

          {/* Public URL */}
          {publicUrl && (
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-purple-600 hover:underline mt-1 flex items-center gap-1"
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
            className="px-2 py-1 text-xs border-2 border-gray-400 bg-white hover:bg-blue-50 flex items-center gap-1 text-blue-600"
            title="Edit page content"
            disabled={isLoading}
            onClick={() => onEditPage(page)}
          >
            <Edit size={12} />
          </button>

          {/* Publish/Unpublish button */}
          {status === "published" && (
            <button
              onClick={handleUnpublish}
              disabled={isLoading}
              className="px-2 py-1 text-xs border-2 border-gray-400 bg-white hover:bg-gray-100 flex items-center gap-1 disabled:opacity-50"
              title="Unpublish"
            >
              {isLoading ? <Loader2 size={12} className="animate-spin" /> : <EyeOff size={12} />}
            </button>
          )}
          {status !== "published" && status !== "archived" && (
            <button
              onClick={handlePublish}
              disabled={isLoading}
              className="px-2 py-1 text-xs border-2 border-gray-400 bg-white hover:bg-green-50 flex items-center gap-1 text-green-600 disabled:opacity-50"
              title="Publish"
            >
              {isLoading ? <Loader2 size={12} className="animate-spin" /> : <Eye size={12} />}
            </button>
          )}

          {/* Delete button */}
          <button
            onClick={handleDelete}
            disabled={isLoading}
            className="px-2 py-1 text-xs border-2 border-gray-400 bg-white hover:bg-red-50 flex items-center gap-1 text-red-600 disabled:opacity-50"
            title="Delete (archive)"
          >
            {isLoading ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
          </button>
        </div>
      </div>
    </div>
  );
}
