"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { AlertCircle, CheckCircle2, Clock3, Link2, Loader2, Mail, MessageSquareWarning } from "lucide-react";
import { Id } from "../../../convex/_generated/dataModel";

// Dynamic require avoids TS2589 deep instantiation on generated Convex API types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { api: apiAny } = require("../../../convex/_generated/api") as { api: any };

type AvvOutreachState =
  | "draft"
  | "pending_confirmation"
  | "queued"
  | "sent"
  | "awaiting_response"
  | "response_received"
  | "approved"
  | "rejected"
  | "escalated"
  | "closed_blocked";

type AvvOutreachRow = {
  dossierObjectId: string;
  providerName: string | null;
  providerEmail: string | null;
  state: AvvOutreachState;
  stateReason: string | null;
  slaFirstDueAt: number | null;
  slaReminderAt: number | null;
  slaEscalationAt: number | null;
  lastContactedAt: number | null;
  respondedAt: number | null;
  approvedAt: number | null;
  rejectedAt: number | null;
  reminderAlertCount: number;
  lastReminderAlertAt: number | null;
  nextReminderAlertAt: number | null;
  escalationAlertedAt: number | null;
  linkedEvidenceObjectIds: string[];
  contractValid: boolean;
  validationErrors: string[];
  updatedAt: number;
  createdAt: number;
};

type AvvOutreachSummary = {
  total: number;
  invalidCount: number;
  openCount: number;
  overdueCount: number;
  awaitingResponseCount: number;
  reminderDueCount: number;
  escalationDueCount: number;
  nextDueAt: number | null;
  byState: Record<AvvOutreachState, number>;
};

type AvvEvidenceRow = {
  evidenceObjectId: string;
  title: string;
  contractValid: boolean;
  subtype: string | null;
  lifecycleStatus: string | null;
};

type AvvEvidenceListResult = {
  rows: AvvEvidenceRow[];
};

interface ComplianceAvvOutreachPanelProps {
  sessionId: string;
  organizationId: Id<"organizations">;
  canEdit: boolean;
  rows: AvvOutreachRow[];
  summary: AvvOutreachSummary;
}

type RowAction = {
  label: string;
  detail: string;
};

function formatDate(value: number | null): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "n/a";
  }
  return new Date(value).toLocaleString();
}

function stateStyles(state: AvvOutreachState): { background: string; color: string } {
  if (state === "approved") {
    return { background: "var(--success-bg)", color: "var(--success)" };
  }
  if (state === "rejected" || state === "escalated" || state === "closed_blocked") {
    return { background: "var(--color-error-subtle)", color: "var(--error)" };
  }
  if (state === "awaiting_response" || state === "pending_confirmation") {
    return { background: "var(--warning-bg)", color: "var(--warning)" };
  }
  return { background: "var(--desktop-shell-accent)", color: "var(--desktop-menu-text-muted)" };
}

function describeNextAction(row: AvvOutreachRow): RowAction {
  if (!row.contractValid) {
    return {
      label: "Repair dossier metadata",
      detail: `Missing: ${row.validationErrors.join(", ")}`,
    };
  }

  switch (row.state) {
    case "draft":
      return {
        label: "Move dossier to confirmation",
        detail: "Transition to pending confirmation before outreach can be sent.",
      };
    case "pending_confirmation":
      return {
        label: "Confirm and queue outreach email",
        detail: "Explicit operator confirmation is required before send.",
      };
    case "queued":
      return {
        label: "Wait for queue delivery",
        detail: "Outbound email is queued; delivery worker will transition status.",
      };
    case "sent":
      return {
        label: "Mark awaiting provider response",
        detail: "Advance state to awaiting_response while waiting for inbound reply.",
      };
    case "awaiting_response":
      return {
        label: "Capture inbound response",
        detail: "Capture provider response and map supporting evidence.",
      };
    case "response_received":
      return {
        label: "Finalize response classification",
        detail: "Review evidence and transition dossier to approved or rejected.",
      };
    case "rejected":
      return {
        label: "Re-open outreach",
        detail: "Re-open workflow for another outreach attempt when ready.",
      };
    case "escalated":
      return {
        label: "Resolve escalation",
        detail: "Capture response evidence or close blocked with explicit reason.",
      };
    case "approved":
      return {
        label: "No immediate action",
        detail: "Provider response is approved and linked evidence is recorded.",
      };
    default:
      return {
        label: "Review blocked workflow",
        detail: "Re-open dossier only when required evidence and context are available.",
      };
  }
}

function deriveSlaAlertStatus(row: AvvOutreachRow): {
  reminderDue: boolean;
  escalationDue: boolean;
  reminderAt: number | null;
  escalationAt: number | null;
} {
  const now = Date.now();
  const reminderAt = row.nextReminderAlertAt ?? row.slaReminderAt ?? row.slaFirstDueAt;
  const baseSlaAt = row.slaReminderAt ?? row.slaFirstDueAt;
  let escalationAt: number | null = row.slaEscalationAt;
  if (escalationAt === null && typeof baseSlaAt === "number" && Number.isFinite(baseSlaAt)) {
    escalationAt = baseSlaAt + 72 * 60 * 60 * 1000;
  }
  const reminderEligible = row.state === "sent" || row.state === "awaiting_response";
  const escalationEligible = reminderEligible || row.state === "escalated";
  const escalationDue =
    escalationEligible
    && typeof escalationAt === "number"
    && Number.isFinite(escalationAt)
    && now >= escalationAt;
  const reminderDue =
    reminderEligible
    && !escalationDue
    && typeof reminderAt === "number"
    && Number.isFinite(reminderAt)
    && now >= reminderAt;

  return {
    reminderDue,
    escalationDue,
    reminderAt: typeof reminderAt === "number" && Number.isFinite(reminderAt) ? reminderAt : null,
    escalationAt: typeof escalationAt === "number" && Number.isFinite(escalationAt) ? escalationAt : null,
  };
}

function buildTimeline(row: AvvOutreachRow): Array<{ label: string; at: number }> {
  const events: Array<{ label: string; at: number | null }> = [
    { label: "Created", at: row.createdAt },
    { label: "Last contact", at: row.lastContactedAt },
    { label: "Response", at: row.respondedAt },
    { label: "Approved", at: row.approvedAt },
    { label: "Rejected", at: row.rejectedAt },
    { label: "Updated", at: row.updatedAt },
  ];
  return events
    .filter((event): event is { label: string; at: number } => typeof event.at === "number")
    .sort((left, right) => left.at - right.at);
}

export function ComplianceAvvOutreachPanel({
  sessionId,
  organizationId,
  canEdit,
  rows,
  summary,
}: ComplianceAvvOutreachPanelProps) {
  const evidenceResult = useQuery(
    apiAny.complianceEvidenceVault.listEvidenceMetadata,
    {
      sessionId,
      organizationId,
      subtype: "avv_provider",
      includeInherited: false,
    },
  ) as AvvEvidenceListResult | undefined;

  const transitionState = useMutation(apiAny.complianceOutreachAgent.transitionAvvOutreachState) as (args: {
    sessionId: string;
    organizationId: Id<"organizations">;
    dossierObjectId: Id<"objects">;
    nextState: AvvOutreachState;
    stateReason?: string;
  }) => Promise<unknown>;
  const confirmAndQueue = useMutation(apiAny.complianceOutreachAgent.confirmAndQueueAvvOutreachEmail) as (args: {
    sessionId: string;
    organizationId: Id<"organizations">;
    dossierObjectId: Id<"objects">;
    operatorConfirmed: boolean;
    confirmationNote?: string;
  }) => Promise<unknown>;
  const linkEvidence = useMutation(apiAny.complianceOutreachAgent.linkEvidenceToAvvOutreachDossier) as (args: {
    sessionId: string;
    organizationId: Id<"organizations">;
    dossierObjectId: Id<"objects">;
    evidenceObjectId: Id<"objects">;
    note?: string;
  }) => Promise<unknown>;

  const [busyDossierId, setBusyDossierId] = useState<string | null>(null);
  const [errorByDossierId, setErrorByDossierId] = useState<Record<string, string>>({});
  const [linkSelectionByDossierId, setLinkSelectionByDossierId] = useState<Record<string, string>>({});

  const activeEvidenceRows = useMemo(
    () => (evidenceResult?.rows ?? []).filter((row) => row.contractValid && row.lifecycleStatus === "active"),
    [evidenceResult],
  );

  const runDossierAction = async (dossierObjectId: string, action: () => Promise<unknown>) => {
    if (!canEdit) {
      return;
    }
    setBusyDossierId(dossierObjectId);
    setErrorByDossierId((current) => ({ ...current, [dossierObjectId]: "" }));
    try {
      await action();
    } catch (error) {
      setErrorByDossierId((current) => ({
        ...current,
        [dossierObjectId]: error instanceof Error ? error.message : "Operation failed.",
      }));
    } finally {
      setBusyDossierId(null);
    }
  };

  return (
    <div className="rounded border p-3" style={{ borderColor: "var(--win95-border)", background: "var(--win95-surface)" }}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold" style={{ color: "var(--win95-text)" }}>
            AVV outreach inbox
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
            Provider response operations, timeline visibility, and one-click evidence linking.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded border px-2 py-0.5" style={{ borderColor: "var(--win95-border)" }}>
            Open: {summary.openCount}
          </span>
          <span className="rounded border px-2 py-0.5" style={{ borderColor: "var(--win95-border)" }}>
            Awaiting response: {summary.awaitingResponseCount}
          </span>
          <span className="rounded border px-2 py-0.5" style={{ borderColor: "var(--win95-border)" }}>
            Reminders due: {summary.reminderDueCount}
          </span>
          <span className="rounded border px-2 py-0.5" style={{ borderColor: "var(--win95-border)" }}>
            Escalations due: {summary.escalationDueCount}
          </span>
          <span className="rounded border px-2 py-0.5" style={{ borderColor: "var(--win95-border)" }}>
            Overdue: {summary.overdueCount}
          </span>
          <span className="rounded border px-2 py-0.5" style={{ borderColor: "var(--win95-border)" }}>
            Invalid: {summary.invalidCount}
          </span>
        </div>
      </div>

      <p className="mt-2 text-xs" style={{ color: "var(--neutral-gray)" }}>
        Next due: {formatDate(summary.nextDueAt)}
      </p>
      {!canEdit ? (
        <p className="mt-2 text-xs" style={{ color: "var(--warning)" }}>
          Read-only access: only organization owners can mutate AVV outreach state.
        </p>
      ) : null}

      {rows.length === 0 ? (
        <div className="mt-3 rounded border p-3 text-xs" style={{ borderColor: "var(--success)", background: "var(--success-bg)", color: "var(--success)" }}>
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle2 size={14} />
            No AVV dossiers are currently queued.
          </div>
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          {rows.map((row) => {
            const nextAction = describeNextAction(row);
            const slaAlertStatus = deriveSlaAlertStatus(row);
            const timeline = buildTimeline(row);
            const isBusy = busyDossierId === row.dossierObjectId;
            const errorMessage = errorByDossierId[row.dossierObjectId];
            const selectedEvidenceId = linkSelectionByDossierId[row.dossierObjectId] ?? "";
            const availableEvidence = activeEvidenceRows.filter(
              (evidence) => !row.linkedEvidenceObjectIds.includes(evidence.evidenceObjectId),
            );

            return (
              <div
                key={row.dossierObjectId}
                className="rounded border p-3"
                style={{ borderColor: "var(--win95-border)", background: "var(--win95-bg-light)" }}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--win95-text)" }}>
                      {row.providerName ?? "Unnamed provider"}
                    </p>
                    <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                      {row.providerEmail ?? "No provider email"} · Due {formatDate(row.slaFirstDueAt)}
                    </p>
                  </div>
                  <span
                    className="rounded border px-2 py-0.5 text-xs font-semibold"
                    style={{ borderColor: "var(--win95-border)", ...stateStyles(row.state) }}
                  >
                    {row.state}
                  </span>
                </div>

                <div className="mt-2 rounded border p-2" style={{ borderColor: "var(--win95-border)", background: "var(--win95-surface)" }}>
                  <p className="text-xs font-semibold flex items-center gap-2" style={{ color: "var(--win95-text)" }}>
                    <Mail size={12} />
                    {nextAction.label}
                  </p>
                  <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
                    {nextAction.detail}
                  </p>
                  {row.stateReason ? (
                    <p className="text-[11px] mt-1" style={{ color: "var(--neutral-gray)" }}>
                      State reason: {row.stateReason}
                    </p>
                  ) : null}
                </div>

                <div className="mt-2 rounded border p-2" style={{ borderColor: "var(--win95-border)", background: "var(--win95-surface)" }}>
                  <p className="text-xs font-semibold flex items-center gap-2" style={{ color: "var(--win95-text)" }}>
                    <Clock3 size={12} />
                    SLA cadence
                  </p>
                  <div className="mt-1 flex flex-wrap gap-2 text-[11px]">
                    <span className="rounded border px-2 py-0.5" style={{ borderColor: "var(--win95-border)", color: "var(--neutral-gray)" }}>
                      Reminder at: {formatDate(slaAlertStatus.reminderAt)}
                    </span>
                    <span className="rounded border px-2 py-0.5" style={{ borderColor: "var(--win95-border)", color: "var(--neutral-gray)" }}>
                      Escalation at: {formatDate(slaAlertStatus.escalationAt)}
                    </span>
                    <span className="rounded border px-2 py-0.5" style={{ borderColor: "var(--win95-border)", color: "var(--neutral-gray)" }}>
                      Reminder count: {row.reminderAlertCount}
                    </span>
                    <span className="rounded border px-2 py-0.5" style={{ borderColor: "var(--win95-border)", color: "var(--neutral-gray)" }}>
                      Last reminder: {formatDate(row.lastReminderAlertAt)}
                    </span>
                  </div>
                  {slaAlertStatus.reminderDue ? (
                    <p className="mt-1 text-xs inline-flex items-center gap-1" style={{ color: "var(--warning)" }}>
                      <AlertCircle size={12} />
                      Reminder alert is due for non-response follow-up.
                    </p>
                  ) : null}
                  {slaAlertStatus.escalationDue ? (
                    <p className="mt-1 text-xs inline-flex items-center gap-1" style={{ color: "var(--error)" }}>
                      <AlertCircle size={12} />
                      Escalation alert threshold has been breached.
                    </p>
                  ) : null}
                </div>

                <div className="mt-2">
                  <p className="text-xs font-semibold" style={{ color: "var(--win95-text)" }}>
                    Provider status timeline
                  </p>
                  {timeline.length === 0 ? (
                    <p className="text-xs mt-1" style={{ color: "var(--neutral-gray)" }}>
                      No timeline events yet.
                    </p>
                  ) : (
                    <div className="mt-1 flex flex-wrap gap-2">
                      {timeline.map((event) => (
                        <span
                          key={`${row.dossierObjectId}:${event.label}:${event.at}`}
                          className="rounded border px-2 py-0.5 text-[11px]"
                          style={{ borderColor: "var(--win95-border)", color: "var(--neutral-gray)" }}
                        >
                          {event.label}: {formatDate(event.at)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-2 grid gap-2 md:grid-cols-[auto_auto_auto_1fr]">
                  {row.state === "draft" ? (
                    <button
                      onClick={() => runDossierAction(row.dossierObjectId, async () => {
                        await transitionState({
                          sessionId,
                          organizationId,
                          dossierObjectId: row.dossierObjectId as Id<"objects">,
                          nextState: "pending_confirmation",
                          stateReason: "Moved to pending confirmation from outreach panel.",
                        });
                      })}
                      disabled={!canEdit || isBusy}
                      className="rounded border px-2 py-1 text-xs font-semibold"
                      style={{ borderColor: "var(--win95-border)", color: "var(--win95-text)" }}
                    >
                      Move to confirmation
                    </button>
                  ) : null}

                  {row.state === "pending_confirmation" ? (
                    <button
                      onClick={() => runDossierAction(row.dossierObjectId, async () => {
                        await confirmAndQueue({
                          sessionId,
                          organizationId,
                          dossierObjectId: row.dossierObjectId as Id<"objects">,
                          operatorConfirmed: true,
                          confirmationNote: "Queued from AVV outreach inbox panel.",
                        });
                      })}
                      disabled={!canEdit || isBusy}
                      className="rounded border px-2 py-1 text-xs font-semibold"
                      style={{ borderColor: "var(--win95-border)", color: "var(--win95-text)" }}
                    >
                      Confirm + queue email
                    </button>
                  ) : null}

                  {row.state === "sent" ? (
                    <button
                      onClick={() => runDossierAction(row.dossierObjectId, async () => {
                        await transitionState({
                          sessionId,
                          organizationId,
                          dossierObjectId: row.dossierObjectId as Id<"objects">,
                          nextState: "awaiting_response",
                          stateReason: "Awaiting provider response after outbound send.",
                        });
                      })}
                      disabled={!canEdit || isBusy}
                      className="rounded border px-2 py-1 text-xs font-semibold"
                      style={{ borderColor: "var(--win95-border)", color: "var(--win95-text)" }}
                    >
                      Mark awaiting response
                    </button>
                  ) : null}

                  {row.state === "rejected" ? (
                    <button
                      onClick={() => runDossierAction(row.dossierObjectId, async () => {
                        await transitionState({
                          sessionId,
                          organizationId,
                          dossierObjectId: row.dossierObjectId as Id<"objects">,
                          nextState: "pending_confirmation",
                          stateReason: "Re-opened for renewed outreach attempt.",
                        });
                      })}
                      disabled={!canEdit || isBusy}
                      className="rounded border px-2 py-1 text-xs font-semibold"
                      style={{ borderColor: "var(--win95-border)", color: "var(--win95-text)" }}
                    >
                      Re-open outreach
                    </button>
                  ) : null}

                  <div className="flex items-center gap-2">
                    <select
                      value={selectedEvidenceId}
                      onChange={(event) =>
                        setLinkSelectionByDossierId((current) => ({
                          ...current,
                          [row.dossierObjectId]: event.target.value,
                        }))
                      }
                      className="rounded border px-2 py-1 text-xs"
                      style={{ borderColor: "var(--win95-border)", background: "var(--win95-surface)" }}
                    >
                      <option value="">Select AVV evidence</option>
                      {availableEvidence.map((evidence) => (
                        <option key={evidence.evidenceObjectId} value={evidence.evidenceObjectId}>
                          {evidence.title}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => runDossierAction(row.dossierObjectId, async () => {
                        await linkEvidence({
                          sessionId,
                          organizationId,
                          dossierObjectId: row.dossierObjectId as Id<"objects">,
                          evidenceObjectId: selectedEvidenceId as Id<"objects">,
                          note: "One-click evidence link from AVV outreach inbox panel.",
                        });
                        setLinkSelectionByDossierId((current) => ({ ...current, [row.dossierObjectId]: "" }));
                      })}
                      disabled={!canEdit || isBusy || selectedEvidenceId.length === 0}
                      className="rounded border px-2 py-1 text-xs font-semibold"
                      style={{ borderColor: "var(--win95-border)", color: "var(--win95-text)" }}
                    >
                      <span className="inline-flex items-center gap-1">
                        <Link2 size={12} />
                        Link evidence
                      </span>
                    </button>
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs" style={{ color: "var(--neutral-gray)" }}>
                  <span className="inline-flex items-center gap-1">
                    <Clock3 size={12} />
                    Updated {formatDate(row.updatedAt)}
                  </span>
                  <span>Linked evidence: {row.linkedEvidenceObjectIds.length}</span>
                </div>

                {isBusy ? (
                  <p className="mt-2 text-xs inline-flex items-center gap-1" style={{ color: "var(--neutral-gray)" }}>
                    <Loader2 size={12} className="animate-spin" />
                    Processing action...
                  </p>
                ) : null}

                {errorMessage ? (
                  <p className="mt-2 text-xs inline-flex items-center gap-1" style={{ color: "var(--error)" }}>
                    <MessageSquareWarning size={12} />
                    {errorMessage}
                  </p>
                ) : null}

                {!row.contractValid ? (
                  <p className="mt-2 text-xs inline-flex items-center gap-1" style={{ color: "var(--warning)" }}>
                    <AlertCircle size={12} />
                    Dossier is invalid and remains fail-closed until metadata is repaired.
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
