"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import { ShoppingCart, Plus, Edit, Eye, Trash2, Loader2, AlertCircle, CheckCircle, ExternalLink, Copy, Check } from "lucide-react";
import { Id } from "../../../../convex/_generated/dataModel";
import { ConfirmationModal } from "@/components/confirmation-modal";
import { useNotification } from "@/hooks/use-notification";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";

/**
 * Checkouts List Tab
 *
 * Shows all checkout instances (published and draft) for the organization.
 * Similar to the Pages tab in Web Publishing.
 */

interface CheckoutsListTabProps {
  onCreateNew: () => void;
  onEdit: (instanceId: Id<"objects">) => void;
}

export function CheckoutsListTab({ onCreateNew, onEdit }: CheckoutsListTabProps) {
  const { sessionId } = useAuth();
  const currentOrg = useCurrentOrganization();
  const notification = useNotification();
  const { t, isLoading: translationsLoading } = useNamespaceTranslations("ui.checkout_window");
  const [deletingId, setDeletingId] = useState<Id<"objects"> | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: Id<"objects">; name: string } | null>(null);
  const [copiedId, setCopiedId] = useState<Id<"objects"> | null>(null);

  // Fetch checkout instances
  const checkoutInstances = useQuery(
    api.checkoutOntology.getCheckoutInstances,
    sessionId && currentOrg?.id
      ? {
          sessionId,
          organizationId: currentOrg.id as Id<"organizations">,
        }
      : "skip"
  );

  // Mutations
  const publishCheckout = useMutation(api.checkoutOntology.publishCheckoutInstance);
  const unpublishCheckout = useMutation(api.checkoutOntology.unpublishCheckoutInstance);
  const deleteCheckout = useMutation(api.checkoutOntology.deleteCheckoutInstance);

  // Handle publish/unpublish
  const handleTogglePublish = async (instanceId: Id<"objects">, currentStatus: string) => {
    if (!sessionId) return;

    try {
      if (currentStatus === "published") {
        await unpublishCheckout({ sessionId, instanceId });
        notification.success("Unpublished", "Checkout has been unpublished successfully.");
      } else {
        await publishCheckout({ sessionId, instanceId });
        notification.success("Published", "Checkout is now live and accessible via its public URL.");
      }
    } catch (error) {
      console.error("Failed to toggle publish status:", error);
      const errorTitle = translationsLoading ? "Failed to Update" : t("ui.checkout_window.list.notifications.update_failed");
      const errorMessage = translationsLoading
        ? `Could not ${currentStatus === "published" ? "unpublish" : "publish"} checkout. Please try again.`
        : t("ui.checkout_window.list.notifications.update_error", { action: currentStatus === "published" ? "unpublish" : "publish" });
      notification.error(errorTitle, errorMessage);
    }
  };

  // Handle delete confirmation
  const handleDeleteClick = (instanceId: Id<"objects">, checkoutName: string) => {
    setConfirmDelete({ id: instanceId, name: checkoutName });
  };

  // Handle delete execution
  const handleDeleteConfirm = async () => {
    if (!sessionId || !confirmDelete) return;

    setDeletingId(confirmDelete.id);
    try {
      await deleteCheckout({ sessionId, instanceId: confirmDelete.id });
      const title = translationsLoading ? "Deleted" : t("ui.checkout_window.list.actions.delete");
      const message = translationsLoading
        ? `"${confirmDelete.name}" has been deleted successfully.`
        : t("ui.checkout_window.list.notifications.deleted", { name: confirmDelete.name });
      notification.success(title, message);
      setConfirmDelete(null);
    } catch (error) {
      console.error("Failed to delete checkout:", error);
      const errorTitle = translationsLoading ? "Delete Failed" : t("ui.checkout_window.list.notifications.delete_failed");
      const errorMessage = translationsLoading ? "Could not delete checkout. Please try again." : t("ui.checkout_window.list.notifications.delete_error");
      notification.error(errorTitle, errorMessage);
    } finally {
      setDeletingId(null);
    }
  };

  // Handle copy ID to clipboard
  const handleCopyId = async (instanceId: Id<"objects">) => {
    try {
      await navigator.clipboard.writeText(instanceId);
      setCopiedId(instanceId);
      notification.success("Copied!", "Checkout ID copied to clipboard");
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error("Failed to copy ID:", error);
      notification.error("Copy Failed", "Could not copy ID to clipboard");
    }
  };

  // Generate preview URL
  const getPreviewUrl = (publicSlug: string) => {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    return `${baseUrl}/checkout/${currentOrg?.slug}/${publicSlug}`;
  };

  if (!sessionId || !currentOrg) {
    return (
      <div className="p-4">
        <div className="border-2 p-4" style={{ borderColor: 'var(--error)', background: 'rgba(239, 68, 68, 0.1)' }}>
          <div className="flex items-start gap-2">
            <AlertCircle size={20} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--error)' }} />
            <div>
              <h4 className="font-bold text-sm" style={{ color: 'var(--error)' }}>
                {translationsLoading ? "Authentication Required" : t("ui.checkout_window.error.auth_required_title")}
              </h4>
              <p className="text-xs mt-1" style={{ color: 'var(--error)' }}>
                {translationsLoading ? "Please log in to view your checkouts." : t("ui.checkout_window.error.auth_required_list")}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (checkoutInstances === undefined) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 size={32} className="animate-spin" style={{ color: 'var(--shell-accent)' }} />
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--shell-text)' }}>
            <ShoppingCart size={16} />
            {translationsLoading ? "Your Checkouts" : t("ui.checkout_window.list.title")}
          </h3>
          <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
            {translationsLoading
              ? `${checkoutInstances.length} checkout${checkoutInstances.length !== 1 ? 's' : ''} created`
              : t("ui.checkout_window.list.count", { count: checkoutInstances.length, plural: checkoutInstances.length !== 1 ? 's' : '' })
            }
          </p>
        </div>
        <button
          onClick={onCreateNew}
          className="px-3 py-2 text-xs font-bold border-2 transition-colors flex items-center gap-1"
          style={{
            borderColor: 'var(--shell-accent)',
            background: 'var(--shell-accent)',
            color: 'var(--shell-titlebar-text)'
          }}
        >
          <Plus size={14} />
          {translationsLoading ? "Create Checkout" : t("ui.checkout_window.list.create_checkout")}
        </button>
      </div>

      {/* Empty State */}
      {checkoutInstances.length === 0 ? (
        <div className="border-2 p-8 text-center" style={{ borderColor: 'var(--shell-border)', background: 'var(--shell-surface)' }}>
          <div className="mb-4" style={{ color: 'var(--neutral-gray)' }}>
            <ShoppingCart size={64} className="mx-auto" />
          </div>
          <h4 className="font-bold text-sm mb-2" style={{ color: 'var(--shell-text)' }}>
            {translationsLoading ? "No Checkouts Yet" : t("ui.checkout_window.list.empty.title")}
          </h4>
          <p className="text-xs mb-4" style={{ color: 'var(--neutral-gray)' }}>
            {translationsLoading ? "Create your first checkout page to start accepting payments." : t("ui.checkout_window.list.empty.description")}
          </p>
          <button
            onClick={onCreateNew}
            className="px-4 py-2 text-xs font-bold border-2 transition-colors inline-flex items-center gap-2"
            style={{
              borderColor: 'var(--shell-accent)',
              background: 'var(--shell-accent)',
              color: 'var(--shell-titlebar-text)'
            }}
          >
            <Plus size={14} />
            {translationsLoading ? "Create Your First Checkout" : t("ui.checkout_window.list.empty.action")}
          </button>
        </div>
      ) : (
        /* Checkouts Table */
        <div className="border-2" style={{ borderColor: 'var(--shell-border)', background: 'var(--shell-surface-elevated)' }}>
          <table className="w-full">
            <thead>
              <tr className="border-b-2" style={{ borderColor: 'var(--shell-border)', background: 'var(--shell-surface)' }}>
                <th className="text-left p-3 text-xs font-bold" style={{ color: 'var(--shell-text)' }}>
                  {translationsLoading ? "Name" : t("ui.checkout_window.list.table.name")}
                </th>
                <th className="text-left p-3 text-xs font-bold" style={{ color: 'var(--shell-text)' }}>
                  {translationsLoading ? "Template" : t("ui.checkout_window.list.table.template")}
                </th>
                <th className="text-left p-3 text-xs font-bold" style={{ color: 'var(--shell-text)' }}>
                  {translationsLoading ? "Status" : t("ui.checkout_window.list.table.status")}
                </th>
                <th className="text-left p-3 text-xs font-bold" style={{ color: 'var(--shell-text)' }}>
                  {translationsLoading ? "Products" : t("ui.checkout_window.list.table.products")}
                </th>
                <th className="text-left p-3 text-xs font-bold" style={{ color: 'var(--shell-text)' }}>
                  {translationsLoading ? "Updated" : t("ui.checkout_window.list.table.updated")}
                </th>
                <th className="text-right p-3 text-xs font-bold" style={{ color: 'var(--shell-text)' }}>
                  {translationsLoading ? "Actions" : t("ui.checkout_window.list.table.actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {checkoutInstances.map((instance) => {
                const config = instance.customProperties || {};
                const linkedProducts = (config.linkedProducts as Id<"objects">[]) || [];
                const status = instance.status as string;

                return (
                  <tr
                    key={instance._id}
                    className="border-b transition-colors"
                    style={{ borderColor: 'var(--shell-border)' }}
                  >
                    {/* Name */}
                    <td className="p-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-bold" style={{ color: 'var(--shell-text)' }}>{instance.name}</div>
                          <button
                            onClick={() => handleCopyId(instance._id)}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono border transition-colors hover:bg-opacity-20"
                            style={{
                              borderColor: 'var(--neutral-gray)',
                              color: 'var(--neutral-gray)',
                              background: copiedId === instance._id ? 'rgba(34, 197, 94, 0.1)' : 'transparent'
                            }}
                            title="Click to copy checkout ID"
                          >
                            {copiedId === instance._id ? (
                              <>
                                <Check size={10} style={{ color: 'var(--success)' }} />
                                <span style={{ color: 'var(--success)' }}>ID</span>
                              </>
                            ) : (
                              <>
                                <Copy size={10} />
                                <span>ID</span>
                              </>
                            )}
                          </button>
                        </div>
                        {instance.description && (
                          <div className="text-xs mt-0.5 line-clamp-1" style={{ color: 'var(--neutral-gray)' }}>
                            {instance.description}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Template */}
                    <td className="p-3">
                      <div className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
                        {(config.templateCode as string) || 'Unknown'}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="p-3">
                      <span
                        className="inline-block px-2 py-0.5 text-xs font-bold rounded"
                        style={{
                          backgroundColor:
                            status === "published"
                              ? "var(--success)"
                              : status === "draft"
                              ? "var(--warning)"
                              : "var(--neutral-gray)",
                          color: "var(--shell-titlebar-text)",
                        }}
                      >
                        {translationsLoading
                          ? status
                          : status === "published"
                            ? t("ui.checkout_window.list.status.published")
                            : status === "draft"
                              ? t("ui.checkout_window.list.status.draft")
                              : status
                        }
                      </span>
                    </td>

                    {/* Products */}
                    <td className="p-3">
                      <div className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
                        {translationsLoading
                          ? `${linkedProducts.length} product${linkedProducts.length !== 1 ? 's' : ''}`
                          : t("ui.checkout_window.common.product_count", { count: linkedProducts.length, plural: linkedProducts.length !== 1 ? 's' : '' })
                        }
                      </div>
                    </td>

                    {/* Updated */}
                    <td className="p-3">
                      <div className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
                        {new Date(instance.updatedAt).toLocaleDateString()}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="p-3">
                      <div className="flex items-center justify-end gap-1">
                        {/* Publish/Unpublish Button */}
                        <button
                          onClick={() => handleTogglePublish(instance._id, status)}
                          className="p-1.5 transition-colors rounded"
                          style={{ background: 'var(--shell-button-surface)' }}
                          title={translationsLoading
                            ? (status === "published" ? "Unpublish" : "Publish")
                            : (status === "published" ? t("ui.checkout_window.list.actions.unpublish") : t("ui.checkout_window.list.actions.publish"))
                          }
                        >
                          <CheckCircle
                            size={14}
                            style={{ color: status === "published" ? "var(--success)" : "var(--neutral-gray)" }}
                          />
                        </button>

                        {/* Preview Button - only for published checkouts */}
                        {status === "published" && config.publicSlug && (
                          <button
                            onClick={() => window.open(getPreviewUrl(config.publicSlug as string), "_blank")}
                            className="p-1.5 transition-colors rounded"
                            style={{ background: 'var(--shell-button-surface)' }}
                            title={translationsLoading ? "View live checkout" : t("ui.checkout_window.list.actions.preview")}
                          >
                            <ExternalLink size={14} style={{ color: 'var(--info)' }} />
                          </button>
                        )}

                        {/* Preview in Editor - for draft checkouts */}
                        {status === "draft" && (
                          <button
                            onClick={() => onEdit(instance._id)}
                            className="p-1.5 transition-colors rounded"
                            style={{ background: 'var(--shell-button-surface)' }}
                            title={translationsLoading ? "Preview in editor" : t("ui.checkout_window.list.actions.preview_editor")}
                          >
                            <Eye size={14} style={{ color: 'var(--neutral-gray)' }} />
                          </button>
                        )}

                        {/* Edit Button */}
                        <button
                          onClick={() => onEdit(instance._id)}
                          className="p-1.5 transition-colors rounded"
                          style={{ background: 'var(--shell-button-surface)' }}
                          title={translationsLoading ? "Edit configuration" : t("ui.checkout_window.list.actions.edit")}
                        >
                          <Edit size={14} style={{ color: 'var(--neutral-gray)' }} />
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => handleDeleteClick(instance._id, instance.name)}
                          disabled={deletingId === instance._id}
                          className="p-1.5 transition-colors rounded disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{ background: 'rgba(239, 68, 68, 0.1)' }}
                          title={translationsLoading ? "Delete" : t("ui.checkout_window.list.actions.delete")}
                        >
                          {deletingId === instance._id ? (
                            <Loader2 size={14} className="animate-spin" style={{ color: 'var(--error)' }} />
                          ) : (
                            <Trash2 size={14} style={{ color: 'var(--error)' }} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Help Section */}
      {checkoutInstances.length > 0 && (
        <div className="mt-4 p-4 border-2" style={{ borderColor: 'var(--info-border)', background: 'rgba(147, 51, 234, 0.1)' }}>
          <h4 className="font-bold text-sm mb-2 flex items-center gap-2" style={{ color: 'var(--shell-text)' }}>
            <AlertCircle size={16} />
            {translationsLoading ? "Quick Actions" : t("ui.checkout_window.list.help.title")}
          </h4>
          <ul className="text-xs space-y-1" style={{ color: 'var(--shell-text)' }}>
            <li>• <CheckCircle size={12} className="inline" style={{ color: 'var(--success)' }} /> <strong>{translationsLoading ? "Publish/Unpublish - Toggle checkout availability" : t("ui.checkout_window.list.help.publish")}</strong></li>
            <li>• <ExternalLink size={12} className="inline" style={{ color: 'var(--info)' }} /> <strong>{translationsLoading ? "Preview - View published checkout in new tab" : t("ui.checkout_window.list.help.preview")}</strong></li>
            <li>• <Edit size={12} className="inline" style={{ color: 'var(--neutral-gray)' }} /> <strong>{translationsLoading ? "Edit - Modify checkout configuration" : t("ui.checkout_window.list.help.edit")}</strong></li>
            <li>• <Trash2 size={12} className="inline" style={{ color: 'var(--error)' }} /> <strong>{translationsLoading ? "Delete - Remove checkout (with confirmation)" : t("ui.checkout_window.list.help.delete")}</strong></li>
          </ul>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDeleteConfirm}
        title={translationsLoading ? "Delete Checkout" : t("ui.checkout_window.list.confirm.delete_title")}
        message={translationsLoading
          ? `Are you sure you want to delete "${confirmDelete?.name}"?\n\nThis action cannot be undone.`
          : t("ui.checkout_window.list.confirm.delete_message", { name: confirmDelete?.name || "" })
        }
        confirmText={translationsLoading ? "Delete" : t("ui.checkout_window.list.confirm.delete_button")}
        cancelText={translationsLoading ? "Cancel" : t("ui.checkout_window.list.confirm.cancel_button")}
        variant="danger"
        isLoading={!!deletingId}
      />
    </div>
  );
}
