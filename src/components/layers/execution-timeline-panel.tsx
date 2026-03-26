"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Node } from "@xyflow/react";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";

interface ExecutionTimelinePanelProps {
  open: boolean;
  onToggle: () => void;
  executionId: string | null;
  executionDetails?: ExecutionDetails | null;
  isRunning: boolean;
  nodes: Node[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
}

interface ExecutionDetails {
  status?: string;
  mode?: string;
  startedAt?: number;
  completedAt?: number;
  durationMs?: number;
  nodeExecutions?: NodeExecutionRecord[];
}

interface NodeExecutionRecord {
  _id?: string;
  nodeId: string;
  nodeName?: string;
  nodeType?: string;
  status: string;
  durationMs?: number;
  startedAt?: number;
  completedAt?: number;
  error?: string;
}

const MAX_TIMELINE_ITEMS = 80;

export function ExecutionTimelinePanel({
  open,
  onToggle,
  executionId,
  executionDetails,
  isRunning,
  nodes,
  selectedNodeId,
  onSelectNode,
}: ExecutionTimelinePanelProps) {
  const { tWithFallback } = useNamespaceTranslations("ui.app.layers");
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackIndex, setPlaybackIndex] = useState(0);
  const playbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const nodeLabelById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const node of nodes) {
      const data = node.data as { label?: unknown; definition?: { name?: string } };
      const label = typeof data.label === "string" && data.label.trim().length > 0 ? data.label : data.definition?.name;
      map[node.id] = label ?? node.id;
    }
    return map;
  }, [nodes]);

  const timelineSteps = useMemo(() => {
    const records = (executionDetails?.nodeExecutions ?? [])
      .slice()
      .sort((a, b) => {
        const aTime = a.startedAt ?? a.completedAt ?? 0;
        const bTime = b.startedAt ?? b.completedAt ?? 0;
        if (aTime !== bTime) return aTime - bTime;
        return a.nodeId.localeCompare(b.nodeId);
      });
    return records.slice(0, MAX_TIMELINE_ITEMS);
  }, [executionDetails]);

  const statusSummary = useMemo(() => {
    const summary: Record<string, number> = {
      pending: 0,
      running: 0,
      completed: 0,
      failed: 0,
      skipped: 0,
      retrying: 0,
    };
    for (const step of timelineSteps) {
      summary[step.status] = (summary[step.status] ?? 0) + 1;
    }
    return summary;
  }, [timelineSteps]);

  useEffect(() => {
    setIsPlaying(false);
    setPlaybackIndex(0);
  }, [executionId]);

  useEffect(() => {
    if (!isPlaying || timelineSteps.length === 0) return;
    const currentIndex = Math.min(playbackIndex, timelineSteps.length - 1);
    const currentStep = timelineSteps[currentIndex];
    onSelectNode(currentStep.nodeId);

    if (currentIndex >= timelineSteps.length - 1) {
      setIsPlaying(false);
      return;
    }

    const delay = clamp(currentStep.durationMs ?? 900, 450, 1800);
    playbackTimer.current = setTimeout(() => {
      setPlaybackIndex((prev) => prev + 1);
    }, delay);

    return () => {
      if (playbackTimer.current) clearTimeout(playbackTimer.current);
    };
  }, [isPlaying, playbackIndex, timelineSteps, onSelectNode]);

  if (!executionId) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-x-4 bottom-4 z-40 flex justify-end">
      <section className="pointer-events-auto w-full max-w-2xl rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
        <header className="flex items-center justify-between border-b border-[var(--color-border)] px-3 py-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
              {tWithFallback("ui.app.layers.execution_timeline.title", "Execution timeline")}
            </p>
            <p className="text-xs text-[var(--color-text-secondary)]">
              {formatModeLabel(tWithFallback, executionDetails?.mode ?? "manual")} · {formatStatusLabel(tWithFallback, executionDetails?.status ?? (isRunning ? "running" : "idle"))}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {open && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    if (timelineSteps.length === 0) return;
                    setPlaybackIndex(0);
                    setIsPlaying(true);
                  }}
                  disabled={timelineSteps.length === 0}
                  className="rounded-md border border-[var(--color-border)] px-2 py-1 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] disabled:opacity-50"
                  title={tWithFallback("ui.app.layers.execution_timeline.play_title", "Play node-by-node")}
                >
                  {tWithFallback("ui.app.layers.execution_timeline.play", "Play")}
                </button>
                <button
                  type="button"
                  onClick={() => setIsPlaying(false)}
                  className="rounded-md border border-[var(--color-border)] px-2 py-1 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
                  title={tWithFallback("ui.app.layers.execution_timeline.pause_title", "Pause playback")}
                >
                  {tWithFallback("ui.app.layers.execution_timeline.pause", "Pause")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (timelineSteps.length === 0) return;
                    const next = Math.max(0, playbackIndex - 1);
                    setIsPlaying(false);
                    setPlaybackIndex(next);
                    onSelectNode(timelineSteps[next].nodeId);
                  }}
                  disabled={timelineSteps.length === 0}
                  className="rounded-md border border-[var(--color-border)] px-2 py-1 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] disabled:opacity-50"
                  title={tWithFallback("ui.app.layers.execution_timeline.prev_title", "Previous step")}
                >
                  {tWithFallback("ui.app.layers.execution_timeline.prev", "Prev")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (timelineSteps.length === 0) return;
                    const next = Math.min(timelineSteps.length - 1, playbackIndex + 1);
                    setIsPlaying(false);
                    setPlaybackIndex(next);
                    onSelectNode(timelineSteps[next].nodeId);
                  }}
                  disabled={timelineSteps.length === 0}
                  className="rounded-md border border-[var(--color-border)] px-2 py-1 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] disabled:opacity-50"
                  title={tWithFallback("ui.app.layers.execution_timeline.next_title", "Next step")}
                >
                  {tWithFallback("ui.app.layers.execution_timeline.next", "Next")}
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onToggle}
              className="rounded-md border border-[var(--color-border)] px-2 py-1 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
              title={open
                ? tWithFallback("ui.app.layers.execution_timeline.collapse_title", "Collapse timeline")
                : tWithFallback("ui.app.layers.execution_timeline.expand_title", "Expand timeline")}
            >
              {open
                ? tWithFallback("ui.app.layers.execution_timeline.hide", "Hide")
                : tWithFallback("ui.app.layers.execution_timeline.show", "Show")}
            </button>
          </div>
        </header>

        {open && (
          <div className="grid grid-cols-1 gap-2 p-3">
            <div className="grid grid-cols-3 gap-2">
              <StatusChip label={tWithFallback("ui.app.layers.execution_timeline.status.completed", "Completed")} value={statusSummary.completed} tone="success" />
              <StatusChip label={tWithFallback("ui.app.layers.execution_timeline.status.running", "Running")} value={statusSummary.running} tone="info" />
              <StatusChip label={tWithFallback("ui.app.layers.execution_timeline.status.failed", "Failed")} value={statusSummary.failed} tone="error" />
            </div>

            <div className="max-h-48 overflow-y-auto rounded-md border border-[var(--color-border)] bg-[var(--color-surface-raised)]">
              {timelineSteps.length === 0 ? (
                <p className="px-3 py-3 text-xs text-[var(--color-text-secondary)]">
                  {tWithFallback(
                    "ui.app.layers.execution_timeline.empty",
                    "No steps recorded yet. Run or test the workflow to populate timeline steps.",
                  )}
                </p>
              ) : (
                <ul className="divide-y divide-[var(--color-border)]">
                  {timelineSteps.map((step, index) => {
                    const isSelected = selectedNodeId === step.nodeId;
                    const isPlaybackFocus = isPlaying && index === playbackIndex;
                    const label = step.nodeName ?? nodeLabelById[step.nodeId] ?? step.nodeId;
                    return (
                      <li key={step._id ?? `${step.nodeId}_${index}`}>
                        <button
                          type="button"
                          onClick={() => {
                            setIsPlaying(false);
                            setPlaybackIndex(index);
                            onSelectNode(step.nodeId);
                          }}
                          className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs ${
                            isSelected || isPlaybackFocus
                              ? "bg-[var(--color-accent-subtle)] text-[var(--color-text)]"
                              : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
                          }`}
                        >
                          <span className="truncate">
                            {index + 1}. {label}
                          </span>
                          <span className={`rounded-md border px-2 py-0.5 text-xs ${statusToneClass(step.status)}`}>
                            {formatStatusLabel(tWithFallback, step.status)}
                          </span>
                        </button>
                        {(step.durationMs || step.error) && (
                          <div className="flex items-center justify-between gap-2 px-3 pb-2 text-xs text-[var(--color-text-secondary)]">
                            <span>{step.durationMs ? `${step.durationMs}ms` : ""}</span>
                            {step.error ? <span className="truncate text-[var(--color-error)]">{step.error}</span> : null}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function formatModeLabel(tWithFallback: (key: string, fallback: string) => string, mode: string): string {
  if (mode === "test") return tWithFallback("ui.app.layers.execution_timeline.mode.test", "test");
  if (mode === "manual") return tWithFallback("ui.app.layers.execution_timeline.mode.manual", "manual");
  return mode;
}

function formatStatusLabel(tWithFallback: (key: string, fallback: string) => string, status: string): string {
  if (status === "completed") return tWithFallback("ui.app.layers.execution_timeline.status.completed", "completed");
  if (status === "failed") return tWithFallback("ui.app.layers.execution_timeline.status.failed", "failed");
  if (status === "running") return tWithFallback("ui.app.layers.execution_timeline.status.running", "running");
  if (status === "idle") return tWithFallback("ui.app.layers.execution_timeline.status.idle", "idle");
  if (status === "pending") return tWithFallback("ui.app.layers.execution_timeline.status.pending", "pending");
  if (status === "retrying") return tWithFallback("ui.app.layers.execution_timeline.status.retrying", "retrying");
  if (status === "skipped") return tWithFallback("ui.app.layers.execution_timeline.status.skipped", "skipped");
  return status;
}

function StatusChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "success" | "info" | "error";
}) {
  const toneClass =
    tone === "success"
      ? "border-[var(--color-success)] bg-[var(--color-success-subtle)] text-[var(--color-success)]"
      : tone === "error"
        ? "border-[var(--color-error)] bg-[var(--color-error-subtle)] text-[var(--color-error)]"
        : "border-[var(--color-info)] bg-[var(--color-info-subtle)] text-[var(--color-info)]";

  return (
    <div className={`rounded-md border px-3 py-2 ${toneClass}`}>
      <p className="text-xs font-semibold">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}

function statusToneClass(status: string): string {
  if (status === "completed") return "border-[var(--color-success)] bg-[var(--color-success-subtle)] text-[var(--color-success)]";
  if (status === "failed") return "border-[var(--color-error)] bg-[var(--color-error-subtle)] text-[var(--color-error)]";
  if (status === "running") return "border-[var(--color-info)] bg-[var(--color-info-subtle)] text-[var(--color-info)]";
  if (status === "skipped") return "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)]";
  if (status === "retrying") return "border-[var(--color-warn)] bg-[var(--color-warn-subtle)] text-[var(--color-warn)]";
  return "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-secondary)]";
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
