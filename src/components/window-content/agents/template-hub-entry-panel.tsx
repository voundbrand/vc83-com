"use client";

import { CheckCircle2, Clock3, GitBranch, Layers, Rocket } from "lucide-react";

type DriftStatus = "in_sync" | "docs_drift" | "code_drift" | "registry_drift";
type TemplateHubEntrySection = "catalog" | "versions" | "rollout";

type TemplateHubEntryPanelProps = {
  totalCatalogAgents: number;
  publishedCatalogAgents: number;
  latestSyncCompletedAt?: number;
  driftStatus: DriftStatus;
  activeSection: TemplateHubEntrySection;
  onSelectSection: (section: TemplateHubEntrySection) => void;
};

function fmtDateTime(value?: number): string {
  if (!value) {
    return "n/a";
  }
  return new Date(value).toLocaleString();
}

function driftTone(status: DriftStatus): { color: string; bg: string; label: string } {
  if (status === "in_sync") {
    return { color: "#166534", bg: "#f0fdf4", label: "in sync" };
  }
  if (status === "docs_drift") {
    return { color: "#9a3412", bg: "#fff7ed", label: "docs drift" };
  }
  if (status === "code_drift") {
    return { color: "#991b1b", bg: "#fee2e2", label: "code drift" };
  }
  return { color: "#92400e", bg: "#fef3c7", label: "registry drift" };
}

export function TemplateHubEntryPanel(props: TemplateHubEntryPanelProps) {
  const tone = driftTone(props.driftStatus);

  return (
    <section
      className="border rounded p-3 space-y-2"
      style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-bg-elevated)" }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--window-document-text)" }}>
            <Layers size={15} />
            Template Hub
          </h4>
          <p className="text-xs mt-1" style={{ color: "var(--desktop-menu-text-muted)" }}>
            Entry point for global template catalog, version timeline, and rollout controls.
          </p>
        </div>
        <div className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px]" style={{ background: tone.bg, color: tone.color }}>
          <CheckCircle2 size={12} />
          Drift: {tone.label}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => props.onSelectSection("catalog")}
          className="text-left border rounded p-2"
          style={{
            borderColor: props.activeSection === "catalog" ? "var(--window-document-text)" : "var(--window-document-border)",
            background: props.activeSection === "catalog" ? "var(--window-document-bg)" : "transparent",
          }}
        >
          <p className="text-xs font-semibold flex items-center gap-1" style={{ color: "var(--window-document-text)" }}>
            <Rocket size={12} />
            Template Catalog
          </p>
          <p className="text-[11px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
            Published: {props.publishedCatalogAgents} / {props.totalCatalogAgents}
          </p>
        </button>

        <button
          type="button"
          onClick={() => props.onSelectSection("versions")}
          className="text-left border rounded p-2"
          style={{
            borderColor: props.activeSection === "versions" ? "var(--window-document-text)" : "var(--window-document-border)",
            background: props.activeSection === "versions" ? "var(--window-document-bg)" : "transparent",
          }}
        >
          <p className="text-xs font-semibold flex items-center gap-1" style={{ color: "var(--window-document-text)" }}>
            <Clock3 size={12} />
            Version History
          </p>
          <p className="text-[11px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
            Latest sync: {fmtDateTime(props.latestSyncCompletedAt)}
          </p>
        </button>

        <button
          type="button"
          onClick={() => props.onSelectSection("rollout")}
          className="text-left border rounded p-2"
          style={{
            borderColor: props.activeSection === "rollout" ? "var(--window-document-text)" : "var(--window-document-border)",
            background: props.activeSection === "rollout" ? "var(--window-document-bg)" : "transparent",
          }}
        >
          <p className="text-xs font-semibold flex items-center gap-1" style={{ color: "var(--window-document-text)" }}>
            <GitBranch size={12} />
            Rollout Actions
          </p>
          <p className="text-[11px]" style={{ color: "var(--desktop-menu-text-muted)" }}>
            Govern staged clone distribution and rollback.
          </p>
        </button>
      </div>
    </section>
  );
}

