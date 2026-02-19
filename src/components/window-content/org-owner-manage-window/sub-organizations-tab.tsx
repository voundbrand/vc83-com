"use client";

import { useState } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import {
  Network,
  Plus,
  Building2,
  Users,
  Calendar,
  ExternalLink,
  AlertCircle,
  Loader2,
  Check,
  X
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface SubOrganizationsTabProps {
  organizationId: Id<"organizations">;
  sessionId: string;
  license: {
    planTier: string;
    limits: {
      maxSubOrganizations: number;
    };
    features: {
      subOrgsEnabled: boolean;
    };
  } | null | undefined;
}

interface CreateSubOrgFormData {
  businessName: string;
  description: string;
  contactEmail: string;
  contactPhone: string;
}

export function SubOrganizationsTab({ organizationId, sessionId, license }: SubOrganizationsTabProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateSubOrgFormData>({
    businessName: "",
    description: "",
    contactEmail: "",
    contactPhone: "",
  });

  const { switchOrganization } = useAuth();

  // Fetch sub-organizations
  const subOrganizations = useQuery(
    api.organizations.getSubOrganizations,
    { sessionId, parentOrganizationId: organizationId }
  );

  // Create sub-organization action
  const createSubOrg = useAction(api.organizations.createSubOrganization);

  const maxSubOrgs = license?.limits?.maxSubOrganizations ?? 0;
  const currentCount = subOrganizations?.length ?? 0;
  const canCreateMore = maxSubOrgs === -1 || currentCount < maxSubOrgs;

  const handleCreateSubOrg = async () => {
    if (!formData.businessName.trim()) {
      setCreateError("Business name is required");
      return;
    }

    setIsCreating(true);
    setCreateError(null);
    setCreateSuccess(null);

    try {
      const result = await createSubOrg({
        sessionId,
        parentOrganizationId: organizationId,
        businessName: formData.businessName.trim(),
        description: formData.description.trim() || undefined,
        contactEmail: formData.contactEmail.trim() || undefined,
        contactPhone: formData.contactPhone.trim() || undefined,
      });

      if (result.success) {
        setCreateSuccess(`Sub-organization "${formData.businessName}" created successfully!`);
        setFormData({
          businessName: "",
          description: "",
          contactEmail: "",
          contactPhone: "",
        });
        setShowCreateForm(false);
      }
    } catch (error) {
      console.error("Failed to create sub-organization:", error);
      setCreateError(error instanceof Error ? error.message : "Failed to create sub-organization");
    } finally {
      setIsCreating(false);
    }
  };

  const handleSwitchToOrg = async (orgId: Id<"organizations">) => {
    try {
      await switchOrganization(orgId as string);
    } catch (error) {
      console.error("Failed to switch organization:", error);
    }
  };

  // Loading state
  if (subOrganizations === undefined) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--primary)' }} />
        <span className="ml-2 text-sm" style={{ color: 'var(--window-document-text)' }}>
          Loading sub-organizations...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--window-document-text)' }}>
            <Network className="w-5 h-5" />
            Sub-Organizations
          </h3>
          <p className="text-xs mt-1" style={{ color: 'var(--neutral-gray)' }}>
            Manage child organizations under your account
          </p>
        </div>

        {/* Limit Badge */}
        <div
          className="px-3 py-1.5 text-xs font-semibold border-2"
          style={{
            backgroundColor: 'var(--window-document-bg-elevated)',
            borderColor: 'var(--window-document-border)',
            color: 'var(--window-document-text)',
          }}
        >
          {currentCount} / {maxSubOrgs === -1 ? "Unlimited" : maxSubOrgs} Sub-Orgs
        </div>
      </div>

      {/* Success Message */}
      {createSuccess && (
        <div
          className="p-3 border-2 flex items-center gap-2"
          style={{
            backgroundColor: '#d4edda',
            borderColor: '#28a745',
            color: '#155724',
          }}
        >
          <Check className="w-4 h-4" />
          <span className="text-sm">{createSuccess}</span>
          <button
            onClick={() => setCreateSuccess(null)}
            className="ml-auto p-1 hover:opacity-70"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Create Sub-Organization Button/Form */}
      {!showCreateForm ? (
        <button
          onClick={() => setShowCreateForm(true)}
          disabled={!canCreateMore}
          className="beveled-button px-4 py-2 text-sm font-semibold flex items-center gap-2"
          style={{
            backgroundColor: canCreateMore ? 'var(--success)' : 'var(--window-document-bg)',
            color: canCreateMore ? 'white' : 'var(--neutral-gray)',
            opacity: canCreateMore ? 1 : 0.6,
            cursor: canCreateMore ? 'pointer' : 'not-allowed',
          }}
        >
          <Plus className="w-4 h-4" />
          Create Sub-Organization
        </button>
      ) : (
        <div
          className="p-4 border-2"
          style={{
            backgroundColor: 'var(--window-document-bg-elevated)',
            borderColor: 'var(--window-document-border)',
          }}
        >
          <h4 className="text-sm font-bold mb-4" style={{ color: 'var(--window-document-text)' }}>
            Create New Sub-Organization
          </h4>

          {/* Error Message */}
          {createError && (
            <div
              className="mb-4 p-3 border-2 flex items-start gap-2"
              style={{
                backgroundColor: '#f8d7da',
                borderColor: '#dc3545',
                color: '#721c24',
              }}
            >
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span className="text-sm">{createError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--window-document-text)' }}>
                Business Name *
              </label>
              <input
                type="text"
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                placeholder="Enter business name"
                className="w-full px-2 py-1.5 text-sm border-2"
                style={{
                  backgroundColor: 'var(--window-document-bg)',
                  borderColor: 'var(--window-document-border)',
                  color: 'var(--window-document-text)',
                }}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--window-document-text)' }}>
                Contact Email
              </label>
              <input
                type="email"
                value={formData.contactEmail}
                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                placeholder="contact@example.com"
                className="w-full px-2 py-1.5 text-sm border-2"
                style={{
                  backgroundColor: 'var(--window-document-bg)',
                  borderColor: 'var(--window-document-border)',
                  color: 'var(--window-document-text)',
                }}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--window-document-text)' }}>
                Contact Phone
              </label>
              <input
                type="tel"
                value={formData.contactPhone}
                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                placeholder="+1 (555) 123-4567"
                className="w-full px-2 py-1.5 text-sm border-2"
                style={{
                  backgroundColor: 'var(--window-document-bg)',
                  borderColor: 'var(--window-document-border)',
                  color: 'var(--window-document-text)',
                }}
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--window-document-text)' }}>
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this sub-organization"
                rows={2}
                className="w-full px-2 py-1.5 text-sm border-2 resize-none"
                style={{
                  backgroundColor: 'var(--window-document-bg)',
                  borderColor: 'var(--window-document-border)',
                  color: 'var(--window-document-text)',
                }}
              />
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={handleCreateSubOrg}
              disabled={isCreating}
              className="beveled-button px-4 py-1.5 text-sm font-semibold flex items-center gap-2"
              style={{
                backgroundColor: 'var(--success)',
                color: 'white',
              }}
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Create
                </>
              )}
            </button>
            <button
              onClick={() => {
                setShowCreateForm(false);
                setCreateError(null);
                setFormData({
                  businessName: "",
                  description: "",
                  contactEmail: "",
                  contactPhone: "",
                });
              }}
              disabled={isCreating}
              className="beveled-button px-4 py-1.5 text-sm font-semibold flex items-center gap-2"
              style={{
                backgroundColor: 'var(--window-document-bg)',
                color: 'var(--window-document-text)',
              }}
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Limit Warning */}
      {!canCreateMore && (
        <div
          className="p-3 border-2 flex items-start gap-2"
          style={{
            backgroundColor: '#fff3cd',
            borderColor: '#ffc107',
            color: '#856404',
          }}
        >
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-semibold">Sub-organization limit reached</p>
            <p className="text-xs mt-1">
              Your plan allows a maximum of {maxSubOrgs} sub-organizations.
              Contact support to increase your limit or upgrade your plan.
            </p>
          </div>
        </div>
      )}

      {/* Sub-Organizations List */}
      <div
        className="border-2"
        style={{
          borderColor: 'var(--window-document-border)',
          backgroundColor: 'var(--window-document-bg-elevated)',
        }}
      >
        {/* Table Header */}
        <div
          className="grid grid-cols-12 gap-2 px-4 py-2 border-b-2 text-xs font-bold"
          style={{
            backgroundColor: 'var(--table-header-bg)',
            borderColor: 'var(--window-document-border)',
            color: 'var(--table-header-text)',
          }}
        >
          <div className="col-span-4 flex items-center gap-2">
            <Building2 className="w-3.5 h-3.5" />
            Organization
          </div>
          <div className="col-span-2 flex items-center gap-2">
            <Users className="w-3.5 h-3.5" />
            Members
          </div>
          <div className="col-span-3 flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5" />
            Created
          </div>
          <div className="col-span-3 text-right">
            Actions
          </div>
        </div>

        {/* Table Body */}
        {subOrganizations.length === 0 ? (
          <div className="px-4 py-8 text-center" style={{ color: 'var(--neutral-gray)' }}>
            <Network className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No sub-organizations yet</p>
            <p className="text-xs mt-1">
              Create your first sub-organization to manage separate teams or brands.
            </p>
          </div>
        ) : (
          <div>
            {subOrganizations.map((org, index) => (
              <div
                key={org._id}
                className="grid grid-cols-12 gap-2 px-4 py-3 border-b items-center"
                style={{
                  backgroundColor: index % 2 === 0 ? 'var(--table-row-even-bg)' : 'var(--table-row-odd-bg)',
                  borderColor: 'var(--window-document-border)',
                }}
              >
                <div className="col-span-4">
                  <p className="text-sm font-semibold" style={{ color: 'var(--window-document-text)' }}>
                    {org.name}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
                    /{org.slug}
                  </p>
                </div>
                <div className="col-span-2">
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold"
                    style={{
                      backgroundColor: 'var(--window-document-bg)',
                      border: '1px solid var(--window-document-border)',
                      color: 'var(--window-document-text)',
                    }}
                  >
                    <Users className="w-3 h-3" />
                    {org.memberCount}
                  </span>
                </div>
                <div className="col-span-3">
                  <span className="text-xs" style={{ color: 'var(--neutral-gray)' }}>
                    {org.createdAt ? new Date(org.createdAt).toLocaleDateString() : "—"}
                  </span>
                </div>
                <div className="col-span-3 flex justify-end gap-2">
                  <button
                    onClick={() => handleSwitchToOrg(org._id)}
                    className="beveled-button px-3 py-1 text-xs font-semibold flex items-center gap-1"
                    style={{
                      backgroundColor: 'var(--primary)',
                      color: 'white',
                    }}
                    title="Switch to this organization"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Switch
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Section */}
      <div
        className="p-4 border-2"
        style={{
          backgroundColor: 'var(--window-document-bg)',
          borderColor: 'var(--window-document-border)',
        }}
      >
        <h4 className="text-sm font-bold mb-2" style={{ color: 'var(--window-document-text)' }}>
          About Sub-Organizations
        </h4>
        <ul className="text-xs space-y-1" style={{ color: 'var(--neutral-gray)' }}>
          <li>• Sub-organizations operate independently with their own users and settings</li>
          <li>• You maintain ownership and can switch between organizations at any time</li>
          <li>• Each sub-organization can have its own branding, integrations, and workflows</li>
          <li>• Plan limits are inherited from the parent organization</li>
        </ul>
      </div>
    </div>
  );
}
