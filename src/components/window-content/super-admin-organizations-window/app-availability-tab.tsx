"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
// Dynamic require to avoid TS2589 deep type instantiation on generated Convex API types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { api } = require("../../../../convex/_generated/api") as { api: any };
import { useAuth } from "@/hooks/use-auth";
import { Shield, Check, X, Loader2, AlertCircle, Key, ToggleLeft, ToggleRight, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Id } from "../../../../convex/_generated/dataModel";
import { ProductOSReleaseStageTab } from "../org-owner-manage-window/product-os-release-stage-tab";

/**
 * App Availability Tab
 *
 * Super admin UI to manage which apps are available to which organizations.
 * Displays a matrix: rows = organizations, columns = apps, cells = toggle buttons.
 */
const EMPTY_AVAILABILITY_BY_APP = new Map<string, boolean>();
const TABLE_BORDER_STYLE = { borderColor: "var(--window-document-border)" } as const;
const TABLE_HEADER_STYLE = {
  backgroundColor: "var(--desktop-shell-accent)",
  borderColor: "var(--window-document-border)",
} as const;
const MUTED_TEXT_STYLE = { color: "var(--desktop-menu-text-muted)" } as const;
const SURFACE_STYLE = {
  borderColor: "var(--window-document-border)",
  backgroundColor: "var(--window-document-bg-elevated)",
} as const;

export function AppAvailabilityTab() {
  const { sessionId } = useAuth();
  const [cursor, setCursor] = useState<string | null>(null);
  const [cursorHistory, setCursorHistory] = useState<Array<string | null>>([]);
  const [pageSize, setPageSize] = useState(25);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch availability matrix data with error handling
  const matrixData = useQuery(
    api.appAvailability.getAvailabilityMatrix,
    sessionId
      ? {
          sessionId,
          cursor: cursor ?? undefined,
          pageSize,
          search: searchTerm || undefined,
        }
      : "skip"
  ) as
    | {
        organizations: { _id: Id<"organizations">; name: string; slug?: string; isActive?: boolean }[];
        apps: { _id: Id<"apps">; name: string; icon?: string }[];
        availabilities: { organizationId: Id<"organizations">; appId: Id<"apps">; isAvailable: boolean }[];
        apiSettings: { organizationId: Id<"organizations">; apiKeysEnabled: boolean }[];
        pageInfo: { continueCursor: string; isDone: boolean };
      }
    | null
    | undefined;

  const availabilityByOrg = useMemo(() => {
    const availabilities = matrixData?.availabilities ?? [];
    const byOrg = new Map<string, Map<string, boolean>>();
    for (const row of availabilities) {
      let orgMap = byOrg.get(row.organizationId);
      if (!orgMap) {
        orgMap = new Map<string, boolean>();
        byOrg.set(row.organizationId, orgMap);
      }
      orgMap.set(row.appId, row.isAvailable);
    }
    return byOrg;
  }, [matrixData?.availabilities]);

  const apiSettingsByOrg = useMemo(() => {
    const byOrg = new Map<string, boolean>();
    for (const row of matrixData?.apiSettings ?? []) {
      byOrg.set(row.organizationId, row.apiKeysEnabled);
    }
    return byOrg;
  }, [matrixData?.apiSettings]);

  if (!sessionId) {
    return (
      <div className="p-4">
        <div
          className="border-2 p-4"
          style={{
            borderColor: "var(--error)",
            backgroundColor: "var(--error-bg)",
          }}
        >
          <div className="flex items-start gap-2">
            <AlertCircle size={20} className="flex-shrink-0 mt-0.5" style={{ color: "var(--error)" }} />
            <div>
              <h4 className="font-bold text-sm" style={{ color: "var(--error)" }}>Access Denied</h4>
              <p className="text-xs mt-1" style={{ color: "var(--window-document-text)" }}>
                You don&apos;t have permission to view app availability settings. This feature is only available to super administrators.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (matrixData === undefined) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 size={32} className="animate-spin" style={{ color: "var(--tone-accent)" }} />
      </div>
    );
  }

  if (matrixData === null) {
    return (
      <div className="p-4">
        <div
          className="border-2 p-4"
          style={{
            borderColor: "var(--error)",
            backgroundColor: "var(--error-bg)",
          }}
        >
          <div className="flex items-start gap-2">
            <AlertCircle size={20} className="flex-shrink-0 mt-0.5" style={{ color: "var(--error)" }} />
            <div>
              <h4 className="font-bold text-sm" style={{ color: "var(--error)" }}>Access Denied</h4>
              <p className="text-xs mt-1" style={{ color: "var(--window-document-text)" }}>
                You don&apos;t have permission to view app availability settings. This feature is only available to super administrators.
              </p>
              <p className="text-xs mt-2" style={{ color: "var(--desktop-menu-text-muted)" }}>
                If you recently switched users or organizations, please close this window and refresh the page.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { organizations, apps } = matrixData;
  const currentPage = cursorHistory.length + 1;

  const applySearch = (value: string) => {
    setSearchTerm(value);
    setCursor(null);
    setCursorHistory([]);
  };

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    applySearch(searchInput.trim());
  };

  const handleClearSearch = () => {
    setSearchInput("");
    applySearch("");
  };

  const handleNextPage = () => {
    if (matrixData.pageInfo.isDone) {
      return;
    }
    setCursorHistory((prev) => [...prev, cursor]);
    setCursor(matrixData.pageInfo.continueCursor);
  };

  const handlePreviousPage = () => {
    setCursorHistory((prev) => {
      if (prev.length === 0) {
        return prev;
      }
      const next = [...prev];
      const previousCursor = next.pop() ?? null;
      setCursor(previousCursor);
      return next;
    });
  };

  if (organizations.length === 0 || apps.length === 0) {
    return (
      <div className="p-4">
        <div
          className="border-2 p-4"
          style={{
            borderColor: "var(--warning)",
            backgroundColor: "var(--warning-bg)",
          }}
        >
          <div className="flex items-start gap-2">
            <AlertCircle size={20} className="flex-shrink-0 mt-0.5" style={{ color: "var(--warning)" }} />
            <div>
              <h4 className="font-bold text-sm" style={{ color: "var(--warning)" }}>No Apps or Organizations Found</h4>
              <p className="text-xs mt-1" style={{ color: "var(--window-document-text)" }}>
                {apps.length === 0 && "No apps have been registered yet. Run the seed script to create system apps."}
                {organizations.length === 0 && "No organizations exist yet."}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-8">
      {/* App Availability Section */}
      <div>
        {/* Header */}
        <div className="mb-4">
          <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--window-document-text)" }}>
            <Shield size={16} />
            App Availability Management
          </h3>
          <p className="text-xs mt-1" style={MUTED_TEXT_STYLE}>
            Control which apps are visible to each organization. Click checkboxes to enable/disable.
          </p>
          <p className="text-xs mt-1" style={MUTED_TEXT_STYLE}>
            Use the <strong>Product Rollout Badges</strong> section below to set app labels like New, Beta, or WIP.
          </p>
        </div>

        <div className="mb-4 border-2 p-3" style={SURFACE_STYLE}>
          <div className="flex flex-wrap items-center gap-3">
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--desktop-menu-text-muted)" }}
                />
                <input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Search organizations by name"
                  className="pl-8 pr-2 py-1.5 text-xs border min-w-[220px]"
                  style={{
                    borderColor: "var(--window-document-border)",
                    backgroundColor: "var(--window-document-bg)",
                    color: "var(--window-document-text)",
                  }}
                />
              </div>
              <button
                type="submit"
                className="beveled-button px-2.5 py-1.5 text-xs font-semibold"
                style={{
                  backgroundColor: "var(--window-document-bg)",
                  color: "var(--window-document-text)",
                }}
              >
                Search
              </button>
              {searchTerm ? (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="beveled-button px-2.5 py-1.5 text-xs font-semibold"
                  style={{
                    backgroundColor: "var(--window-document-bg)",
                    color: "var(--window-document-text)",
                  }}
                >
                  Clear
                </button>
              ) : null}
            </form>

            <div className="flex items-center gap-2 text-xs" style={{ color: "var(--window-document-text)" }}>
              <span className="font-semibold">Rows</span>
              <select
                value={pageSize}
                onChange={(event) => {
                  const nextPageSize = Number(event.target.value);
                  setPageSize(nextPageSize);
                  setCursor(null);
                  setCursorHistory([]);
                }}
                className="px-2 py-1 border"
                style={{
                  borderColor: "var(--window-document-border)",
                  backgroundColor: "var(--window-document-bg)",
                  color: "var(--window-document-text)",
                }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={handlePreviousPage}
                disabled={cursorHistory.length === 0}
                className="beveled-button inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: "var(--window-document-bg)",
                  color: "var(--window-document-text)",
                }}
              >
                <ChevronLeft size={12} />
                Prev
              </button>
              <span className="text-xs font-semibold" style={{ color: "var(--window-document-text)" }}>Page {currentPage}</span>
              <button
                type="button"
                onClick={handleNextPage}
                disabled={matrixData.pageInfo.isDone}
                className="beveled-button inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: "var(--window-document-bg)",
                  color: "var(--window-document-text)",
                }}
              >
                Next
                <ChevronRight size={12} />
              </button>
            </div>
          </div>
        </div>

        {/* Matrix Table */}
        <div className="border-2 overflow-x-auto" style={TABLE_BORDER_STYLE}>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b-2" style={TABLE_HEADER_STYLE}>
                <th className="px-3 py-2 text-left font-bold sticky left-0 z-10" style={TABLE_HEADER_STYLE}>
                  Organization
                </th>
                {apps.map((app) => (
                  <th key={app._id} className="px-3 py-2 text-center font-bold min-w-[100px]">
                    <div className="flex flex-col items-center gap-1">
                      <span>{app.icon || ""}</span>
                      <span>{app.name}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {organizations.map((org) => (
                <OrganizationRow
                  key={org._id}
                  organization={org}
                  apps={apps}
                  availabilityByApp={availabilityByOrg.get(org._id) ?? EMPTY_AVAILABILITY_BY_APP}
                  sessionId={sessionId!}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="mt-4 flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div
              className="w-4 h-4 border-2 flex items-center justify-center"
              style={{ borderColor: "var(--window-document-border)", backgroundColor: "var(--success)" }}
            >
              <Check size={10} className="text-white" />
            </div>
            <span style={{ color: "var(--window-document-text)" }}>Available</span>
          </div>
          <div className="flex items-center gap-1">
            <div
              className="w-4 h-4 border-2 flex items-center justify-center"
              style={{ borderColor: "var(--window-document-border)", backgroundColor: "var(--error)" }}
            >
              <X size={10} className="text-white" />
            </div>
            <span style={{ color: "var(--window-document-text)" }}>Not Available</span>
          </div>
          <div className="flex items-center gap-1">
            <div
              className="w-4 h-4 border-2 flex items-center justify-center"
              style={{ borderColor: "var(--window-document-border)", backgroundColor: "var(--desktop-shell-accent)" }}
            >
              <Loader2 size={10} className="animate-spin" />
            </div>
            <span style={{ color: "var(--window-document-text)" }}>Updating...</span>
          </div>
        </div>
      </div>

      {/* Security & API Section */}
      <SecurityAndApiSection organizations={organizations} sessionId={sessionId} apiSettingsByOrg={apiSettingsByOrg} />

      {/* Product rollout badges */}
      <div className="border-2 p-4" style={SURFACE_STYLE}>
        <ProductOSReleaseStageTab />
      </div>
    </div>
  );
}

/**
 * Individual organization row with app availability toggles
 */
function OrganizationRow({
  organization,
  apps,
  availabilityByApp,
  sessionId,
}: {
  organization: { _id: Id<"organizations">; name: string; slug?: string };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  apps: any[];
  availabilityByApp: ReadonlyMap<string, boolean>;
  sessionId: string;
}) {
  const [loadingAppId, setLoadingAppId] = useState<Id<"apps"> | null>(null);
  const setAvailability = useMutation(api.appAvailability.setAppAvailability);

  const handleToggle = async (appId: Id<"apps">, currentState: boolean) => {
    try {
      setLoadingAppId(appId);
      await setAvailability({
        sessionId,
        organizationId: organization._id,
        appId,
        isAvailable: !currentState,
      });
    } catch (error) {
      console.error("Failed to toggle app availability:", error);
      alert(`Failed to update: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setLoadingAppId(null);
    }
  };

  return (
    <tr
      className="border-b"
      style={{
        borderColor: "var(--window-document-border)",
        backgroundColor: "var(--window-document-bg)",
      }}
    >
      <td
        className="px-3 py-2 font-semibold sticky left-0 z-10"
        style={{
          backgroundColor: "var(--window-document-bg)",
          color: "var(--window-document-text)",
        }}
      >
        <div>
          <div>{organization.name}</div>
          <div className="text-xs font-normal" style={MUTED_TEXT_STYLE}>
            {organization.slug}
          </div>
        </div>
      </td>
      {apps.map((app) => {
        const isAvailable = availabilityByApp.get(app._id) ?? false;
        const isLoading = loadingAppId === app._id;

        return (
          <td key={app._id} className="px-3 py-2 text-center">
            <button
              onClick={() => handleToggle(app._id, isAvailable)}
              disabled={isLoading}
              className="w-8 h-8 border-2 flex items-center justify-center transition-colors hover:opacity-80 disabled:opacity-50"
              style={{
                borderColor: "var(--window-document-border)",
                backgroundColor: isLoading
                  ? "var(--desktop-shell-accent)"
                  : isAvailable
                    ? "var(--success)"
                    : "var(--error)",
              }}
              title={
                isLoading
                  ? "Updating..."
                  : isAvailable
                  ? `Click to disable ${app.name} for ${organization.name}`
                  : `Click to enable ${app.name} for ${organization.name}`
              }
            >
              {isLoading ? (
                <Loader2 size={14} className="animate-spin" style={{ color: "var(--window-document-text-muted)" }} />
              ) : isAvailable ? (
                <Check size={16} className="text-white" />
              ) : (
                <X size={16} className="text-white" />
              )}
            </button>
          </td>
        );
      })}
    </tr>
  );
}

/**
 * Security & API Section
 * Allows super admin to enable/disable API key generation for organizations
 */
function SecurityAndApiSection({
  organizations,
  sessionId,
  apiSettingsByOrg,
}: {
  organizations: { _id: Id<"organizations">; name: string; slug?: string }[];
  sessionId: string;
  apiSettingsByOrg: ReadonlyMap<string, boolean>;
}) {
  return (
    <div>
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: "var(--window-document-text)" }}>
          <Key size={16} />
          Security & API Management
        </h3>
        <p className="text-xs mt-1" style={MUTED_TEXT_STYLE}>
          Control which organizations can generate API keys for external integrations.
        </p>
      </div>

      {/* API Access Control Table */}
      <div className="border-2 overflow-x-auto" style={TABLE_BORDER_STYLE}>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b-2" style={TABLE_HEADER_STYLE}>
              <th className="px-3 py-2 text-left font-bold sticky left-0 z-10" style={TABLE_HEADER_STYLE}>
                Organization
              </th>
              <th className="px-3 py-2 text-center font-bold min-w-[150px]">
                API Keys Access
              </th>
              <th className="px-3 py-2 text-left font-bold min-w-[200px]">
                Description
              </th>
            </tr>
          </thead>
          <tbody>
            {organizations.map((org) => (
              <ApiAccessRow
                key={org._id}
                organization={org}
                isEnabled={apiSettingsByOrg.get(org._id) ?? false}
                sessionId={sessionId}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1">
          <div
            className="w-4 h-4 border-2 flex items-center justify-center"
            style={{ borderColor: "var(--window-document-border)", backgroundColor: "var(--success)" }}
          >
            <Check size={10} className="text-white" />
          </div>
          <span style={{ color: "var(--window-document-text)" }}>API Keys Enabled</span>
        </div>
        <div className="flex items-center gap-1">
          <div
            className="w-4 h-4 border-2 flex items-center justify-center"
            style={{ borderColor: "var(--window-document-border)", backgroundColor: "var(--error)" }}
          >
            <X size={10} className="text-white" />
          </div>
          <span style={{ color: "var(--window-document-text)" }}>API Keys Disabled</span>
        </div>
      </div>
    </div>
  );
}

/**
 * API Access Row Component
 * Shows toggle for enabling/disabling API key access per organization
 */
function ApiAccessRow({
  organization,
  isEnabled,
  sessionId,
}: {
  organization: { _id: Id<"organizations">; name: string; slug?: string };
  isEnabled: boolean;
  sessionId: string;
}) {
  const [isToggling, setIsToggling] = useState(false);
  const toggleApiKeys = useMutation(api.organizationApiSettings.toggleApiKeys);

  const handleToggle = async () => {
    try {
      setIsToggling(true);
      await toggleApiKeys({
        sessionId,
        organizationId: organization._id,
        enabled: !isEnabled,
      });
    } catch (error) {
      console.error("Failed to toggle API keys:", error);
      alert(`Failed to update: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <tr
      className="border-b"
      style={{
        borderColor: "var(--window-document-border)",
        backgroundColor: "var(--window-document-bg)",
      }}
    >
      <td
        className="px-3 py-2 font-semibold sticky left-0 z-10"
        style={{
          backgroundColor: "var(--window-document-bg)",
          color: "var(--window-document-text)",
        }}
      >
        <div>
          <div>{organization.name}</div>
          <div className="text-xs font-normal" style={MUTED_TEXT_STYLE}>
            {organization.slug}
          </div>
        </div>
      </td>
      <td className="px-3 py-2 text-center">
        <button
          onClick={handleToggle}
          disabled={isToggling}
          className="inline-flex items-center gap-2 px-3 py-1.5 border-2 transition-colors hover:opacity-80 disabled:opacity-50"
          style={{
            borderColor: "var(--window-document-border)",
            backgroundColor: isToggling
              ? "var(--desktop-shell-accent)"
              : isEnabled
                ? "var(--success)"
                : "var(--error)",
            color: "white",
          }}
          title={
            isToggling
              ? "Updating..."
              : isEnabled
              ? `Click to disable API keys for ${organization.name}`
              : `Click to enable API keys for ${organization.name}`
          }
        >
          {isToggling ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              <span className="text-xs font-bold">Updating...</span>
            </>
          ) : isEnabled ? (
            <>
              <ToggleRight size={16} />
              <span className="text-xs font-bold">Enabled</span>
            </>
          ) : (
            <>
              <ToggleLeft size={16} />
              <span className="text-xs font-bold">Disabled</span>
            </>
          )}
        </button>
      </td>
      <td className="px-3 py-2 text-xs" style={MUTED_TEXT_STYLE}>
        {isEnabled
          ? "Organization can generate and manage API keys"
          : "Organization cannot access API key features"}
      </td>
    </tr>
  );
}
