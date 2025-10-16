"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import { ShoppingCart, Plus, Edit, Eye, Trash2, Loader2, AlertCircle, CheckCircle, ExternalLink } from "lucide-react";
import { Id } from "../../../../convex/_generated/dataModel";
import { ConfirmationModal } from "@/components/confirmation-modal";
import { useNotification } from "@/hooks/use-notification";

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
  const [deletingId, setDeletingId] = useState<Id<"objects"> | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: Id<"objects">; name: string } | null>(null);

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
      notification.error(
        "Failed to Update",
        `Could not ${currentStatus === "published" ? "unpublish" : "publish"} checkout. Please try again.`
      );
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
      notification.success("Deleted", `"${confirmDelete.name}" has been deleted successfully.`);
      setConfirmDelete(null);
    } catch (error) {
      console.error("Failed to delete checkout:", error);
      notification.error("Delete Failed", "Could not delete checkout. Please try again.");
    } finally {
      setDeletingId(null);
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
        <div className="border-2 border-red-600 bg-red-50 p-4">
          <div className="flex items-start gap-2">
            <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm text-red-900">Authentication Required</h4>
              <p className="text-xs text-red-800 mt-1">
                Please log in to view your checkouts.
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
        <Loader2 size={32} className="animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold flex items-center gap-2">
            <ShoppingCart size={16} />
            Your Checkouts
          </h3>
          <p className="text-xs text-gray-600 mt-1">
            {checkoutInstances.length} checkout{checkoutInstances.length !== 1 ? 's' : ''} created
          </p>
        </div>
        <button
          onClick={onCreateNew}
          className="px-3 py-2 text-xs font-bold border-2 border-purple-600 bg-purple-600 text-white hover:bg-purple-700 transition-colors flex items-center gap-1"
        >
          <Plus size={14} />
          Create Checkout
        </button>
      </div>

      {/* Empty State */}
      {checkoutInstances.length === 0 ? (
        <div className="border-2 border-gray-400 bg-gray-50 p-8 text-center">
          <div className="text-gray-400 mb-4">
            <ShoppingCart size={64} className="mx-auto" />
          </div>
          <h4 className="font-bold text-sm text-gray-700 mb-2">No Checkouts Yet</h4>
          <p className="text-xs text-gray-600 mb-4">
            Create your first checkout page to start accepting payments.
          </p>
          <button
            onClick={onCreateNew}
            className="px-4 py-2 text-xs font-bold border-2 border-purple-600 bg-purple-600 text-white hover:bg-purple-700 transition-colors inline-flex items-center gap-2"
          >
            <Plus size={14} />
            Create Your First Checkout
          </button>
        </div>
      ) : (
        /* Checkouts Table */
        <div className="border-2 border-gray-400 bg-white">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-400 bg-gray-100">
                <th className="text-left p-3 text-xs font-bold">Name</th>
                <th className="text-left p-3 text-xs font-bold">Template</th>
                <th className="text-left p-3 text-xs font-bold">Status</th>
                <th className="text-left p-3 text-xs font-bold">Products</th>
                <th className="text-left p-3 text-xs font-bold">Updated</th>
                <th className="text-right p-3 text-xs font-bold">Actions</th>
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
                    className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    {/* Name */}
                    <td className="p-3">
                      <div>
                        <div className="text-sm font-bold">{instance.name}</div>
                        {instance.description && (
                          <div className="text-xs text-gray-600 mt-0.5 line-clamp-1">
                            {instance.description}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Template */}
                    <td className="p-3">
                      <div className="text-xs text-gray-600">
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
                              ? "#10B981"
                              : status === "draft"
                              ? "#F59E0B"
                              : "#6B7280",
                          color: "white",
                        }}
                      >
                        {status}
                      </span>
                    </td>

                    {/* Products */}
                    <td className="p-3">
                      <div className="text-xs text-gray-600">
                        {linkedProducts.length} product{linkedProducts.length !== 1 ? 's' : ''}
                      </div>
                    </td>

                    {/* Updated */}
                    <td className="p-3">
                      <div className="text-xs text-gray-600">
                        {new Date(instance.updatedAt).toLocaleDateString()}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="p-3">
                      <div className="flex items-center justify-end gap-1">
                        {/* Publish/Unpublish Button */}
                        <button
                          onClick={() => handleTogglePublish(instance._id, status)}
                          className="p-1.5 hover:bg-gray-200 transition-colors rounded"
                          title={status === "published" ? "Unpublish" : "Publish"}
                        >
                          <CheckCircle
                            size={14}
                            className={status === "published" ? "text-green-600" : "text-gray-400"}
                          />
                        </button>

                        {/* Preview Button - only for published checkouts */}
                        {status === "published" && config.publicSlug && (
                          <button
                            onClick={() => window.open(getPreviewUrl(config.publicSlug as string), "_blank")}
                            className="p-1.5 hover:bg-gray-200 transition-colors rounded"
                            title="View live checkout"
                          >
                            <ExternalLink size={14} className="text-blue-600" />
                          </button>
                        )}

                        {/* Preview in Editor - for draft checkouts */}
                        {status === "draft" && (
                          <button
                            onClick={() => onEdit(instance._id)}
                            className="p-1.5 hover:bg-gray-200 transition-colors rounded"
                            title="Preview in editor"
                          >
                            <Eye size={14} className="text-gray-600" />
                          </button>
                        )}

                        {/* Edit Button */}
                        <button
                          onClick={() => onEdit(instance._id)}
                          className="p-1.5 hover:bg-gray-200 transition-colors rounded"
                          title="Edit configuration"
                        >
                          <Edit size={14} className="text-gray-600" />
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => handleDeleteClick(instance._id, instance.name)}
                          disabled={deletingId === instance._id}
                          className="p-1.5 hover:bg-red-100 transition-colors rounded disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Delete"
                        >
                          {deletingId === instance._id ? (
                            <Loader2 size={14} className="text-red-600 animate-spin" />
                          ) : (
                            <Trash2 size={14} className="text-red-600" />
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
        <div className="mt-4 p-4 border-2 border-purple-300 bg-purple-50">
          <h4 className="font-bold text-sm text-purple-900 mb-2 flex items-center gap-2">
            <AlertCircle size={16} />
            Quick Actions
          </h4>
          <ul className="text-xs text-purple-800 space-y-1">
            <li>• <CheckCircle size={12} className="inline text-green-600" /> <strong>Publish/Unpublish</strong> - Toggle checkout availability</li>
            <li>• <ExternalLink size={12} className="inline text-blue-600" /> <strong>Preview</strong> - View published checkout in new tab</li>
            <li>• <Edit size={12} className="inline text-gray-600" /> <strong>Edit</strong> - Modify checkout configuration</li>
            <li>• <Trash2 size={12} className="inline text-red-600" /> <strong>Delete</strong> - Remove checkout (with confirmation)</li>
          </ul>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Checkout"
        message={`Are you sure you want to delete "${confirmDelete?.name}"?\n\nThis action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={!!deletingId}
      />
    </div>
  );
}
