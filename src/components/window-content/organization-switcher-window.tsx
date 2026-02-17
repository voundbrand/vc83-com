"use client";

import { useState } from "react";
import { useOrganizations, useCurrentOrganization, useAuth } from "@/hooks/use-auth";
import { useQuery, useAction } from "convex/react";
import { Building2, Check, ChevronRight, Plus, Loader2 } from "lucide-react";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
const generatedApi = require("../../../convex/_generated/api");

interface OrganizationSwitcherWindowProps {
  onClose?: () => void;
}

export function OrganizationSwitcherWindow({ onClose }: OrganizationSwitcherWindowProps) {
  const { t } = useNamespaceTranslations("ui.start_menu");
  const organizations = useOrganizations();
  const currentOrg = useCurrentOrganization();
  const { switchOrganization, sessionId, canPerform } = useAuth();

  // State for create org modal
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createMode, setCreateMode] = useState<"platform" | "sub">("sub");
  const [newOrgName, setNewOrgName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get current org's license to check if sub-orgs are enabled
  const license = useQuery(
    generatedApi.api.licensing.helpers.getLicense,
    currentOrg?.id ? { organizationId: currentOrg.id } : "skip"
  ) as { features?: { subOrgsEnabled?: boolean } } | undefined;

  const createSubOrg = useAction(generatedApi.api.organizations.createSubOrganization);
  const createPlatformOrg = useAction(generatedApi.api.organizations.createOrganization);

  const canCreateSubOrg = license?.features?.subOrgsEnabled === true;
  const canCreatePlatformOrg = canPerform("create_system_organization");
  const canCreateAnyOrg = canCreateSubOrg || canCreatePlatformOrg;

  // Filter to only show active organizations
  const activeOrganizations = organizations.filter(org => org.isActive);

  const handleSwitch = async (orgId: string) => {
    if (orgId !== currentOrg?.id) {
      await switchOrganization(orgId);
    }
    onClose?.();
  };

  const openCreateForm = (mode: "platform" | "sub") => {
    setCreateMode(mode);
    setShowCreateForm(true);
    setError(null);
    setNewOrgName("");
  };

  const handleCreateOrganization = async () => {
    if (!newOrgName.trim() || !sessionId) return;
    const parentOrganizationId = currentOrg?.id;
    if (createMode === "sub" && !parentOrganizationId) return;

    setIsCreating(true);
    setError(null);

    try {
      const result = createMode === "sub"
        ? await createSubOrg({
            sessionId,
            parentOrganizationId,
            businessName: newOrgName.trim(),
          })
        : await createPlatformOrg({
            sessionId,
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
      setError(
        err instanceof Error
          ? err.message
          : createMode === "sub"
            ? t("ui.start_menu.org_switcher.error_create_sub")
            : t("ui.start_menu.org_switcher.error_create_org")
      );
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
            {t("ui.start_menu.org_switcher.currently", { orgName: currentOrg.name })}
          </p>
        )}
      </div>

      {/* Organization List */}
      <div className="flex-1 overflow-y-auto space-y-1">
        {activeOrganizations.length === 0 ? (
          <p className="text-xs text-center py-4" style={{ color: "var(--neutral-gray)" }}>
            {t("ui.start_menu.org_switcher.no_organizations_available")}
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

      {/* Create Organization Section */}
      {canCreateAnyOrg && (
        <div
          className="pt-3 mt-4 border-t-2"
          style={{ borderColor: "var(--win95-border)" }}
        >
          {showCreateForm ? (
            <div className="space-y-2">
              {canCreateSubOrg && canCreatePlatformOrg && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setCreateMode("platform")}
                    disabled={isCreating}
                    className="flex-1 px-2 py-1 text-xs border-2"
                    style={{
                      borderColor: createMode === "platform" ? "var(--win95-highlight)" : "var(--win95-border)",
                      background: createMode === "platform" ? "var(--win95-bg-light)" : "var(--win95-bg)",
                      color: createMode === "platform" ? "var(--win95-highlight)" : "var(--win95-text)",
                    }}
                  >
                    {t("ui.start_menu.org_switcher.mode_platform")}
                  </button>
                  <button
                    onClick={() => setCreateMode("sub")}
                    disabled={isCreating}
                    className="flex-1 px-2 py-1 text-xs border-2"
                    style={{
                      borderColor: createMode === "sub" ? "var(--win95-highlight)" : "var(--win95-border)",
                      background: createMode === "sub" ? "var(--win95-bg-light)" : "var(--win95-bg)",
                      color: createMode === "sub" ? "var(--win95-highlight)" : "var(--win95-text)",
                    }}
                  >
                    {t("ui.start_menu.org_switcher.mode_sub")}
                  </button>
                </div>
              )}
              <input
                type="text"
                value={newOrgName}
                onChange={(e) => setNewOrgName(e.target.value)}
                placeholder={
                  createMode === "sub"
                    ? t("ui.start_menu.org_switcher.placeholder_sub_name")
                    : t("ui.start_menu.org_switcher.placeholder_org_name")
                }
                className="w-full px-2 py-1.5 text-sm border-2"
                style={{
                  borderColor: "var(--win95-border)",
                  background: "var(--win95-input-bg)",
                  color: "var(--win95-text)",
                }}
                disabled={isCreating}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateOrganization();
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
                  onClick={handleCreateOrganization}
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
                  {createMode === "sub"
                    ? t("ui.start_menu.org_switcher.create_sub_short")
                    : t("ui.start_menu.org_switcher.create_org")}
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
                  {t("ui.start_menu.org_switcher.cancel")}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {canCreatePlatformOrg && (
                <button
                  onClick={() => openCreateForm("platform")}
                  className="w-full px-3 py-2 text-sm font-semibold border-2 flex items-center justify-center gap-2 hover:opacity-80 transition-opacity"
                  style={{
                    borderColor: "var(--win95-highlight)",
                    background: "transparent",
                    color: "var(--win95-highlight)",
                  }}
                >
                  <Plus size={16} />
                  {t("ui.start_menu.org_switcher.create_org")}
                </button>
              )}
              {canCreateSubOrg && (
                <button
                  onClick={() => openCreateForm("sub")}
                  className="w-full px-3 py-2 text-sm font-semibold border-2 flex items-center justify-center gap-2 hover:opacity-80 transition-opacity"
                  style={{
                    borderColor: "var(--win95-highlight)",
                    background: "transparent",
                    color: "var(--win95-highlight)",
                  }}
                >
                  <Plus size={16} />
                  {t("ui.start_menu.org_switcher.create_sub")}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Footer hint */}
      <div
        className="pt-3 mt-4 border-t-2 text-center"
        style={{ borderColor: "var(--win95-border)" }}
      >
        <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
          {canCreateSubOrg && canCreatePlatformOrg
            ? t("ui.start_menu.org_switcher.footer_switch_or_new_org")
            : canCreateSubOrg
              ? t("ui.start_menu.org_switcher.footer_switch_or_sub")
              : canCreatePlatformOrg
                ? t("ui.start_menu.org_switcher.footer_switch_or_platform")
                : t("ui.start_menu.org_switcher.footer_switch_only")}
        </p>
      </div>
    </div>
  );
}
