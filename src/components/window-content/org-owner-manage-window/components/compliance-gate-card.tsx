"use client";

import { useQuery } from "convex/react";
import { AlertCircle, Loader2, Shield, ShieldCheck } from "lucide-react";
import { Id } from "../../../../../convex/_generated/dataModel";
import { InteriorButton } from "@/components/window-content/shared/interior-primitives";

// Dynamic require to avoid TS2589 deep type instantiation on generated Convex API types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { api: apiAny } = require("../../../../../convex/_generated/api") as { api: any };

type ComplianceGateSnapshot = {
  gate: {
    effectiveGateStatus: "GO" | "NO_GO";
    blockerIds: string[];
    blockerCount: number;
    ownerGateDecision: "GO" | "NO_GO";
    ownerGateDecidedAt: number | null;
  };
};

interface ComplianceGateCardProps {
  sessionId: string;
  organizationId: Id<"organizations">;
  visible: boolean;
  onOpenComplianceCenter: () => void;
}

function formatDate(timestamp: number | null | undefined): string {
  if (typeof timestamp !== "number" || !Number.isFinite(timestamp)) {
    return "n/a";
  }
  return new Date(timestamp).toLocaleString();
}

function gateBadgeStyles(status: "GO" | "NO_GO"): { background: string; color: string } {
  if (status === "GO") {
    return { background: "var(--success-bg)", color: "var(--success)" };
  }
  return { background: "var(--color-error-subtle)", color: "var(--error)" };
}

export function ComplianceGateCard({
  sessionId,
  organizationId,
  visible,
  onOpenComplianceCenter,
}: ComplianceGateCardProps) {
  const snapshot = useQuery(
    apiAny.complianceControlPlane.getOrgComplianceGate,
    visible ? { sessionId, organizationId } : "skip",
  ) as ComplianceGateSnapshot | undefined;

  if (!visible) {
    return null;
  }

  return (
    <div className="desktop-interior-panel border" style={{ borderColor: "var(--window-document-border)" }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-bold" style={{ color: "var(--window-document-text)" }}>
            <Shield size={14} />
            Compliance Gate
          </p>
          <p className="mt-1 text-xs" style={{ color: "var(--desktop-menu-text-muted)" }}>
            Owner-driven DSGVO gate summary (R-002 to R-005).
          </p>
        </div>
        {snapshot?.gate ? (
          <span
            className="inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-semibold"
            style={{
              borderColor: "var(--window-document-border)",
              ...gateBadgeStyles(snapshot.gate.effectiveGateStatus),
            }}
          >
            <ShieldCheck size={10} className="mr-1" />
            {snapshot.gate.effectiveGateStatus}
          </span>
        ) : null}
      </div>

      {snapshot === undefined ? (
        <div className="mt-3 flex items-center gap-2 text-xs" style={{ color: "var(--desktop-menu-text-muted)" }}>
          <Loader2 size={12} className="animate-spin" />
          Loading compliance gate...
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
          <div className="rounded border px-2 py-1.5" style={{ borderColor: "var(--window-document-border)" }}>
            <p className="text-[11px]" style={{ color: "var(--desktop-menu-text-muted)" }}>Open blockers</p>
            <p className="text-xs font-semibold" style={{ color: "var(--window-document-text)" }}>
              {snapshot.gate.blockerCount}
            </p>
          </div>
          <div className="rounded border px-2 py-1.5" style={{ borderColor: "var(--window-document-border)" }}>
            <p className="text-[11px]" style={{ color: "var(--desktop-menu-text-muted)" }}>Owner decision</p>
            <p className="text-xs font-semibold" style={{ color: "var(--window-document-text)" }}>
              {snapshot.gate.ownerGateDecision}
            </p>
          </div>
          <div className="rounded border px-2 py-1.5" style={{ borderColor: "var(--window-document-border)" }}>
            <p className="text-[11px]" style={{ color: "var(--desktop-menu-text-muted)" }}>Last decision</p>
            <p className="text-xs font-semibold" style={{ color: "var(--window-document-text)" }}>
              {formatDate(snapshot.gate.ownerGateDecidedAt)}
            </p>
          </div>
        </div>
      )}

      {snapshot?.gate?.blockerIds?.length ? (
        <div className="mt-2 flex items-start gap-1 text-xs" style={{ color: "var(--desktop-menu-text-muted)" }}>
          <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
          <span>Blockers: {snapshot.gate.blockerIds.join(", ")}</span>
        </div>
      ) : null}

      <div className="mt-3">
        <InteriorButton variant="primary" size="sm" onClick={onOpenComplianceCenter}>
          Open Compliance Center
        </InteriorButton>
      </div>
    </div>
  );
}
