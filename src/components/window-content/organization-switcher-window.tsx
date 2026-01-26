"use client";

import { useState } from "react";
import { useOrganizations, useCurrentOrganization, useAuth } from "@/hooks/use-auth";
import { useQuery, useAction } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { Building2, Check, ChevronRight, Plus, Loader2 } from "lucide-react";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";

interface OrganizationSwitcherWindowProps {
  onClose?: () => void;
}

export function OrganizationSwitcherWindow({ onClose }: OrganizationSwitcherWindowProps) {
  const { t } = useNamespaceTranslations("ui.start_menu");
  const organizations = useOrganizations();
  const currentOrg = useCurrentOrganization();
  const { switchOrganization, sessionId } = useAuth();

  // State for create sub-org modal
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get current org's license to check if sub-orgs are enabled
  const license = useQuery(
    api.licensing.helpers.getLicense,
    currentOrg?.id ? { organizationId: currentOrg.id as Id<"organizations"> } : "skip"
  );

  const createSubOrg = useAction(api.organizations.createSubOrganization);

  const canCreateSubOrg = license?.features?.subOrgsEnabled === true;

  // Filter to only show active organizations
  const activeOrganizations = organizations.filter(org => org.isActive);

  const handleSwitch = async (orgId: string) => {
    if (orgId !== currentOrg?.id) {
      await switchOrganization(orgId);
    }
    onClose?.();
  };

  const handleCreateSubOrg = async () => {
    if (!newOrgName.trim() || !sessionId || !currentOrg?.id) return;

    setIsCreating(true);
    setError(null);

    try {
      const result = await createSubOrg({
        sessionId,
        parentOrganizationId: currentOrg.id as Id<"organizations">,
        businessName: newOrgName.trim(),
      });

      if (result.success) {
        // Switch to the new organization
        await switchOrganization(result.organizationId);
        setShowCreateForm(false);
        setNewOrgName("");
        onClose?.();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create sub-organization");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="p-4 h-full flex flex-col" style={{ background: "var(--win95-bg)" }}>
      {/* Header */}
      <div
        className="pb-3 mb-4 border-b-2"
        style={{ borderColor: "var(--win95-border)" }}
      >
        <h2
          className="text-sm font-bold flex items-center gap-2"
          style={{ color: "var(--win95-text)" }}
        >
          <Building2 size={18} style={{ color: "var(--win95-highlight)" }} />
          {t("ui.start_menu.organizations")}
        </h2>
        {currentOrg && (
          <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
            Currently: <strong style={{ color: "var(--win95-highlight)" }}>{currentOrg.name}</strong>
          </p>
        )}
      </div>

      {/* Organization List */}
      <div className="flex-1 overflow-y-auto space-y-1">
        {activeOrganizations.length === 0 ? (
          <p className="text-xs text-center py-4" style={{ color: "var(--neutral-gray)" }}>
            No organizations available
          </p>
        ) : (
          activeOrganizations.map((org) => {
            const isCurrent = currentOrg?.id === org.id;
            return (
              <button
                key={org.id}
                onClick={() => handleSwitch(org.id)}
                className="w-full px-3 py-2.5 flex items-center gap-3 border-2 transition-all"
                style={{
                  borderColor: isCurrent ? "var(--win95-highlight)" : "var(--win95-border)",
                  background: isCurrent ? "var(--win95-bg-light)" : "var(--win95-input-bg)",
                }}
              >
                {/* Status indicator */}
                <div
                  className="w-5 h-5 flex items-center justify-center rounded-sm"
                  style={{
                    background: isCurrent ? "var(--win95-highlight)" : "transparent",
                    border: isCurrent ? "none" : "1px solid var(--win95-border)",
                  }}
                >
                  {isCurrent && <Check size={14} color="white" strokeWidth={3} />}
                </div>

                {/* Organization info */}
                <div className="flex-1 text-left">
                  <p
                    className="text-sm font-semibold truncate"
                    style={{ color: isCurrent ? "var(--win95-highlight)" : "var(--win95-text)" }}
                  >
                    {org.name}
                  </p>
                  {org.slug && (
                    <p className="text-xs truncate" style={{ color: "var(--neutral-gray)" }}>
                      /{org.slug}
                    </p>
                  )}
                </div>

                {/* Arrow for non-current */}
                {!isCurrent && (
                  <ChevronRight size={16} style={{ color: "var(--neutral-gray)" }} />
                )}
              </button>
            );
          })
        )}
      </div>

      {/* Create Sub-Organization Section */}
      {canCreateSubOrg && (
        <div
          className="pt-3 mt-4 border-t-2"
          style={{ borderColor: "var(--win95-border)" }}
        >
          {showCreateForm ? (
            <div className="space-y-2">
              <input
                type="text"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                placeholder="Sub-organization name..."
                className="w-full px-2 py-1.5 text-sm border-2"
                style={{
                  borderColor: "var(--win95-border)",
                  background: "var(--win95-input-bg)",
                  color: "var(--win95-text)",
                }}
                disabled={isCreating}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateSubOrg();
                  if (e.key === "Escape") {
                    setShowCreateForm(false);
                    setNewOrgName("");
                    setError(null);
                  }
                }}
                autoFocus
              />
              {error && (
                <p className="text-xs" style={{ color: "var(--error-red, #c00)" }}>
                  {error}
                </p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleCreateSubOrg}
                  disabled={isCreating || !newOrgName.trim()}
                  className="flex-1 px-3 py-1.5 text-xs font-semibold border-2 flex items-center justify-center gap-1"
                  style={{
                    borderColor: "var(--win95-highlight)",
                    background: "var(--win95-highlight)",
                    color: "white",
                    opacity: isCreating || !newOrgName.trim() ? 0.5 : 1,
                  }}
                >
                  {isCreating ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Plus size={12} />
                  )}
                  Create
                </button>
                <button
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewOrgName("");
                    setError(null);
                  }}
                  disabled={isCreating}
                  className="px-3 py-1.5 text-xs border-2"
                  style={{
                    borderColor: "var(--win95-border)",
                    background: "var(--win95-bg)",
                    color: "var(--win95-text)",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowCreateForm(true)}
              className="w-full px-3 py-2 text-sm font-semibold border-2 flex items-center justify-center gap-2 hover:opacity-80 transition-opacity"
              style={{
                borderColor: "var(--win95-highlight)",
                background: "transparent",
                color: "var(--win95-highlight)",
              }}
            >
              <Plus size={16} />
              Create Sub-Organization
            </button>
          )}
        </div>
      )}

      {/* Footer hint */}
      <div
        className="pt-3 mt-4 border-t-2 text-center"
        style={{ borderColor: "var(--win95-border)" }}
      >
        <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
          {canCreateSubOrg
            ? "Switch organizations or create a new sub-organization"
            : "Click an organization to switch"}
        </p>
      </div>
    </div>
  );
}
