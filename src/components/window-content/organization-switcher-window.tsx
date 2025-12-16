"use client";

import { useOrganizations, useCurrentOrganization, useAuth } from "@/hooks/use-auth";
import { Building2, Check, ChevronRight } from "lucide-react";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";

interface OrganizationSwitcherWindowProps {
  onClose?: () => void;
}

export function OrganizationSwitcherWindow({ onClose }: OrganizationSwitcherWindowProps) {
  const { t } = useNamespaceTranslations("ui");
  const organizations = useOrganizations();
  const currentOrg = useCurrentOrganization();
  const { switchOrganization } = useAuth();

  // Filter to only show active organizations
  const activeOrganizations = organizations.filter(org => org.isActive);

  const handleSwitch = async (orgId: string) => {
    if (orgId !== currentOrg?.id) {
      await switchOrganization(orgId);
    }
    onClose?.();
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

      {/* Footer hint */}
      <div
        className="pt-3 mt-4 border-t-2 text-center"
        style={{ borderColor: "var(--win95-border)" }}
      >
        <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
          Click an organization to switch
        </p>
      </div>
    </div>
  );
}
