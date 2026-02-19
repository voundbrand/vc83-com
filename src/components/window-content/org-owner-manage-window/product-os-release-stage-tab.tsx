"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { AlertCircle, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getProductAppIconByCode } from "@/components/icons/shell-icons";
import {
  PRODUCT_OS_CATALOG_BY_CODE,
  getProductOSBadgeLabel,
  normalizeProductOSReleaseStage,
  type ProductOSReleaseStage,
} from "@/lib/product-os/catalog";

// Dynamic require to avoid TS2589 deep type instantiation on generated Convex API types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { api } = require("../../../../convex/_generated/api") as { api: any };

type ReleaseStageRow = {
  _id: string;
  code: string;
  name: string;
  category?: string;
  releaseStage?: ProductOSReleaseStage | string;
};

const RELEASE_STAGE_OPTIONS: Array<{ value: ProductOSReleaseStage; label: string }> = [
  { value: "none", label: "None" },
  { value: "new", label: "New" },
  { value: "beta", label: "Beta" },
  { value: "wip", label: "WIP" },
];

function badgeStyles(stage: ProductOSReleaseStage): { background: string; color: string } {
  if (stage === "new") {
    return { background: "var(--success-bg)", color: "var(--success)" };
  }

  if (stage === "beta") {
    return { background: "var(--info-bg)", color: "var(--info)" };
  }

  if (stage === "wip") {
    return { background: "var(--warning-bg)", color: "var(--warning)" };
  }

  return { background: "var(--desktop-shell-accent)", color: "var(--desktop-menu-text-muted)" };
}

export function ProductOSReleaseStageTab() {
  const { sessionId, isSuperAdmin } = useAuth();
  const [savingAppId, setSavingAppId] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const releaseRows = useQuery(
    api.appAvailability.listAppReleaseStages,
    sessionId ? { sessionId } : "skip",
  ) as ReleaseStageRow[] | undefined;

  const setAppReleaseStage = useMutation(api.appAvailability.setAppReleaseStage);

  const rows = useMemo(() => {
    return (releaseRows ?? [])
      .map((row) => {
        const catalogEntry = PRODUCT_OS_CATALOG_BY_CODE.get(row.code);
        return {
          appId: row._id,
          code: row.code,
          name: catalogEntry?.displayName ?? row.name,
          category: catalogEntry?.category ?? "Utilities & Tools",
          releaseStage: normalizeProductOSReleaseStage(
            row.releaseStage ?? catalogEntry?.releaseStage ?? "none",
          ),
        };
      })
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [releaseRows]);

  const handleChange = async (appId: string, releaseStage: ProductOSReleaseStage) => {
    if (!sessionId) {
      return;
    }

    setSavingAppId(appId);
    setSaveMessage(null);
    setSaveError(null);

    try {
      await setAppReleaseStage({
        sessionId,
        appId,
        releaseStage,
      });
      const badge = getProductOSBadgeLabel(releaseStage) ?? "None";
      setSaveMessage(`Updated release stage to ${badge}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setSaveError(`Failed to update release stage: ${message}`);
    } finally {
      setSavingAppId(null);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="desktop-interior-panel border p-4" style={{ borderColor: "var(--warning)" }}>
        <div className="flex items-start gap-2">
          <AlertCircle size={16} className="mt-0.5" style={{ color: "var(--warning)" }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--window-document-text)" }}>
              Super admin access required
            </p>
            <p className="mt-1 text-xs" style={{ color: "var(--desktop-menu-text-muted)" }}>
              Product rollout stages can only be edited by system administrators.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!sessionId || releaseRows === undefined) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 size={24} className="animate-spin" style={{ color: "var(--tone-accent)" }} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold" style={{ color: "var(--window-document-text)" }}>
            <Sparkles size={15} />
            Product Rollout Badges
          </h3>
          <p className="mt-1 text-xs" style={{ color: "var(--desktop-menu-text-muted)" }}>
            Set stage badges used by Product OS menu and All Applications surfaces.
          </p>
        </div>
      </div>

      {saveMessage ? (
        <div className="desktop-interior-panel border p-3" style={{ borderColor: "var(--success)" }}>
          <p className="flex items-center gap-2 text-xs" style={{ color: "var(--success)" }}>
            <CheckCircle2 size={14} />
            {saveMessage}
          </p>
        </div>
      ) : null}

      {saveError ? (
        <div className="desktop-interior-panel border p-3" style={{ borderColor: "var(--error)" }}>
          <p className="flex items-center gap-2 text-xs" style={{ color: "var(--error)" }}>
            <AlertCircle size={14} />
            {saveError}
          </p>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg border" style={{ borderColor: "var(--window-document-border)" }}>
        <table className="w-full text-left text-xs">
          <thead style={{ background: "var(--desktop-shell-accent)" }}>
            <tr>
              <th className="px-3 py-2 font-semibold">App</th>
              <th className="px-3 py-2 font-semibold">Category</th>
              <th className="px-3 py-2 font-semibold">Badge</th>
              <th className="px-3 py-2 font-semibold">Release Stage</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const badge = getProductOSBadgeLabel(row.releaseStage);
              const isSaving = savingAppId === row.appId;

              return (
                <tr key={row.appId} className="border-t" style={{ borderColor: "var(--window-document-border)" }}>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded border" style={{ borderColor: "var(--window-document-border)" }}>
                        {getProductAppIconByCode(row.code, undefined, 16)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-semibold" style={{ color: "var(--window-document-text)" }}>
                          {row.name}
                        </p>
                        <p className="truncate" style={{ color: "var(--desktop-menu-text-muted)" }}>
                          {row.code}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-3 py-2" style={{ color: "var(--desktop-menu-text-muted)" }}>
                    {row.category}
                  </td>

                  <td className="px-3 py-2">
                    <span
                      className="inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold"
                      style={badgeStyles(row.releaseStage)}
                    >
                      {badge ?? "None"}
                    </span>
                  </td>

                  <td className="px-3 py-2">
                    <select
                      value={row.releaseStage}
                      onChange={(event) => handleChange(row.appId, event.target.value as ProductOSReleaseStage)}
                      disabled={isSaving}
                      className="desktop-interior-select min-w-[110px] text-xs"
                    >
                      {RELEASE_STAGE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
