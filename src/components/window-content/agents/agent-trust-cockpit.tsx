"use client";

/**
 * Agent trust cockpit.
 * Consolidates drift, guardrails, approvals, escalations, and handoffs into one explainable view.
 */

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bot,
  CheckCircle,
  Clock,
  MessageSquare,
  Shield,
  User,
  UserCheck,
  XCircle,
} from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { AgentCustomProps } from "./types";
import {
  deriveMemoryProvenanceEvidence,
  deriveRetrievalCitationEvidence,
} from "./intervention-evidence";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const apiAny: any = require("../../../../convex/_generated/api").api;

interface AgentTrustCockpitProps {
  agentId: Id<"objects">;
  sessionId: string;
  organizationId: Id<"organizations">;
}

interface SoulProposal {
  _id: string;
  status: string;
  proposalType: string;
  targetField: string;
  reason: string;
  proposedValue: string;
  createdAt: number;
  reviewedAt?: number;
  triggerType?: string;
  driftSummary?: string;
  driftSignalSource?: string;
  driftScores?: {
    identity: number;
    scope: number;
    boundary: number;
    performance: number;
    overall: number;
  };
}

interface AgentApproval {
  _id: Id<"objects">;
  status: string;
  subtype?: string;
  createdAt: number;
  customProperties?: Record<string, unknown>;
}

interface TeamHandoffHistoryEntry {
  fromAgentId: Id<"objects">;
  toAgentId: Id<"objects">;
  reason: string;
  summary: string;
  goal: string;
  timestamp: number;
}

interface AgentSessionEscalationState {
  status: "pending" | "taken_over" | "resolved" | "dismissed" | "timed_out";
  reason: string;
  urgency: "low" | "normal" | "high";
  triggerType: string;
  escalatedAt: number;
  respondedAt?: number;
  resolutionSummary?: string;
}

interface AgentSessionRecord {
  _id: Id<"agentSessions">;
  agentId: Id<"objects">;
  status: string;
  channel: string;
  externalContactIdentifier: string;
  lastMessageAt: number;
  escalationState?: AgentSessionEscalationState;
  teamSession?: {
    handoffHistory?: TeamHandoffHistoryEntry[];
  };
}

interface EscalationMetrics {
  totalEscalations: number;
  resolutionRate: number;
  falsePositiveRate: number;
  takeoverRate: number;
  periodDays: number;
}

interface EscalationQueueEntry {
  _id: Id<"agentSessions">;
  agentId: Id<"objects">;
  agentName: string;
  channel: string;
  contactIdentifier: string;
  messageCount: number;
  lastMessageAt: number;
  escalationState?: AgentSessionEscalationState;
  harnessContext?: unknown;
}

type HarnessContextSource = "approval" | "escalation";

interface HarnessContextLayer {
  index: 1 | 2 | 3 | 4;
  name: string;
}

interface HarnessContextHandoffEdge {
  fromAgentId: string;
  toAgentId: string;
  reason: string;
  summary?: string;
  goal?: string;
  timestamp: number;
}

interface HarnessContextEnvelope {
  source: HarnessContextSource;
  layer: HarnessContextLayer;
  toolsUsed: string[];
  handoffEdge: HarnessContextHandoffEdge | null;
}

interface SessionMessageItem {
  _id: string;
  role: "assistant" | "user" | "system";
  content: string;
  timestamp: number;
  agentName?: string;
}

type AgentLifecycleState =
  | "draft"
  | "active"
  | "paused"
  | "escalated"
  | "takeover"
  | "resolved";

type ThreadDeliveryState =
  | "queued"
  | "running"
  | "done"
  | "blocked"
  | "failed";

interface ControlCenterThreadRow {
  threadId: string;
  sessionId: string;
  templateAgentId: string;
  templateAgentName: string;
  lifecycleState: AgentLifecycleState;
  deliveryState: ThreadDeliveryState;
  escalationCountOpen: number;
  escalationUrgency: "low" | "normal" | "high" | null;
  waitingOnHuman: boolean;
  activeInstanceCount: number;
  channel: string;
  externalContactIdentifier: string;
  lastMessagePreview: string;
  updatedAt: number;
  sortScore: number;
}

type InterventionKind = "escalation" | "approval";

interface InterventionQueueItem {
  id: string;
  kind: InterventionKind;
  severity: TimelineSeverity;
  status: string;
  title: string;
  blockerReason: string;
  context: string;
  createdAt: number;
  sessionId?: Id<"agentSessions">;
  approvalId?: Id<"objects">;
  escalationStatus?: AgentSessionEscalationState["status"];
  harnessContext?: HarnessContextEnvelope;
}

type TimelineSeverity = "low" | "medium" | "high";

type TimelineEventKind =
  | "lifecycle"
  | "approval"
  | "escalation"
  | "handoff"
  | "tool"
  | "memory"
  | "soul"
  | "operator";

type EscalationGate = "pre_llm" | "post_llm" | "tool_failure" | "not_applicable";

interface ControlCenterTimelineEvent {
  eventId: string;
  sessionId: string;
  threadId: string;
  kind: TimelineEventKind;
  occurredAt: number;
  actorType: "agent" | "operator" | "system";
  actorId: string;
  fromState?: AgentLifecycleState;
  toState?: AgentLifecycleState;
  checkpoint?: string;
  escalationGate: EscalationGate;
  title: string;
  summary: string;
  reason?: string;
  trustEventName?: string;
  trustEventId?: string;
  sourceObjectIds?: string[];
  metadata?: Record<string, unknown>;
}

interface AgentInstanceSummary {
  instanceAgentId: string;
  templateAgentId: string;
  sessionId: string;
  roleLabel: string;
  spawnedAt: number;
  parentInstanceAgentId?: string;
  handoffReason?: string;
  active: boolean;
  displayName?: string;
}

interface ControlCenterThreadDrillDown {
  threadId: string;
  timelineEvents: ControlCenterTimelineEvent[];
  lineage: AgentInstanceSummary[];
}

interface ActionItem {
  id: string;
  severity: TimelineSeverity;
  label: string;
  action: string;
}

type InterventionTemplateId =
  | "send_file"
  | "override_draft"
  | "handoff_back_to_agent";

interface InterventionTemplatePayload {
  templateId: InterventionTemplateId;
  note?: string;
  fileName?: string;
  fileUrl?: string;
}

interface InterventionTemplateDefinition {
  id: InterventionTemplateId;
  label: string;
  description: string;
  supportedKinds: InterventionKind[];
}

const INTERVENTION_TEMPLATE_DEFINITIONS: InterventionTemplateDefinition[] = [
  {
    id: "send_file",
    label: "Send File",
    description:
      "Attach a concrete file reference (for example PDF deck) and continue with a logged intervention trail.",
    supportedKinds: ["approval", "escalation"],
  },
  {
    id: "override_draft",
    label: "Override Draft",
    description:
      "Operator overrides the pending draft decision and approves/rejects with an auditable rationale.",
    supportedKinds: ["approval"],
  },
  {
    id: "handoff_back_to_agent",
    label: "Handoff Back",
    description:
      "Operator marks takeover complete and resumes autonomous handling with a structured checkpoint.",
    supportedKinds: ["escalation"],
  },
];

const DEFAULT_TEMPLATE_FOR_KIND: Record<InterventionKind, InterventionTemplateId> = {
  approval: "override_draft",
  escalation: "send_file",
};

const DEFAULT_ESCALATION_TRIGGER_NAMES = [
  "explicit request",
  "negative sentiment",
  "response loop",
  "blocked topic",
  "uncertainty",
  "tool failures",
];

export function AgentTrustCockpit({ agentId, sessionId, organizationId }: AgentTrustCockpitProps) {
  const unsafeUseQuery = useQuery as unknown as (
    queryRef: unknown,
    args: unknown
  ) => unknown;
  // Avoid deep generated Convex type expansion for this query path.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const agent = unsafeUseQuery(apiAny.agentOntology.getAgent, { sessionId, agentId }) as any | undefined;

  const proposals = unsafeUseQuery(apiAny.ai.soulEvolution.getSoulProposals, {
    sessionId,
    organizationId,
    agentId,
  }) as SoulProposal[] | undefined;

  const approvals = unsafeUseQuery(apiAny.ai.agentApprovals.getApprovals, {
    sessionId,
    organizationId,
    limit: 100,
  }) as AgentApproval[] | undefined;

  const activeSessions = unsafeUseQuery(apiAny.ai.agentSessions.getActiveSessions, {
    sessionId,
    organizationId,
    status: "active",
  }) as AgentSessionRecord[] | undefined;

  const closedSessions = unsafeUseQuery(apiAny.ai.agentSessions.getActiveSessions, {
    sessionId,
    organizationId,
    status: "closed",
  }) as AgentSessionRecord[] | undefined;

  const handedOffSessions = unsafeUseQuery(apiAny.ai.agentSessions.getActiveSessions, {
    sessionId,
    organizationId,
    status: "handed_off",
  }) as AgentSessionRecord[] | undefined;

  const escalationMetrics = unsafeUseQuery(apiAny.ai.escalation.getEscalationMetrics, {
    sessionId,
    organizationId,
    sinceDaysAgo: 30,
  }) as EscalationMetrics | undefined;

  const escalationQueue = unsafeUseQuery(apiAny.ai.escalation.getEscalationQueue, {
    sessionId,
    organizationId,
  }) as EscalationQueueEntry[] | undefined;
  const controlCenterThreads = unsafeUseQuery(apiAny.ai.agentSessions.getControlCenterThreadRows, {
    sessionId,
    organizationId,
    agentId,
    limit: 80,
  }) as ControlCenterThreadRow[] | undefined;

  const [selectedInterventionId, setSelectedInterventionId] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<InterventionTemplateId>("override_draft");
  const [templateNote, setTemplateNote] = useState("");
  const [templateFileName, setTemplateFileName] = useState("");
  const [templateFileUrl, setTemplateFileUrl] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [resolutionSummary, setResolutionSummary] = useState("");
  const [isIntervening, setIsIntervening] = useState(false);
  const [interventionError, setInterventionError] = useState<string | null>(null);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [selectedLineageInstanceId, setSelectedLineageInstanceId] = useState<string | null>(null);

  const approveAction = useMutation(apiAny.ai.agentApprovals.approveAction);
  const rejectAction = useMutation(apiAny.ai.agentApprovals.rejectAction);
  const takeOverEscalation = useMutation(apiAny.ai.escalation.takeOverEscalation);
  const dismissEscalation = useMutation(apiAny.ai.escalation.dismissEscalation);
  const resolveEscalation = useMutation(apiAny.ai.escalation.resolveEscalation);

  const controlCenterThreadDrillDown = useQuery(
    apiAny.ai.agentSessions.getControlCenterThreadDrillDown,
    selectedThreadId
      ? {
        sessionId,
        organizationId,
        threadId: selectedThreadId,
        limit: 80,
      }
      : "skip",
  ) as ControlCenterThreadDrillDown | null | undefined;

  const props = (agent?.customProperties || {}) as AgentCustomProps;
  const sessions = [...(activeSessions || []), ...(closedSessions || []), ...(handedOffSessions || [])];

  const agentApprovals = (approvals || []).filter((approval) => {
    const approvalProps = approval.customProperties || {};
    return approvalProps.agentId === agentId;
  });

  const agentEscalations = sessions.filter(
    (session) => session.agentId === agentId && session.escalationState
  );

  const teamHandoffs = sessions
    .filter((session) => session.agentId === agentId)
    .flatMap((session) =>
      (session.teamSession?.handoffHistory || []).map((handoff, index) => ({
        ...handoff,
        handoffId: `${session._id}-${handoff.timestamp}-${index}`,
        channel: session.channel,
        contact: session.externalContactIdentifier,
      }))
    );

  const sortedThreadRows = useMemo(() => {
    const rows = [...(controlCenterThreads || [])];
    rows.sort((a, b) => {
      if (a.waitingOnHuman !== b.waitingOnHuman) {
        return a.waitingOnHuman ? -1 : 1;
      }
      return b.sortScore - a.sortScore;
    });
    return rows;
  }, [controlCenterThreads]);

  const interventionQueue = useMemo(() => {
    const escalationItems: InterventionQueueItem[] = (escalationQueue || [])
      .filter((entry) => entry.agentId === agentId && entry.escalationState)
      .map((entry) => {
        const escalation = entry.escalationState as AgentSessionEscalationState;
        const harnessContext = parseHarnessContext(entry.harnessContext);
        const urgency = escalation.urgency || "low";
        const severity: TimelineSeverity =
          urgency === "high" || escalation.status === "pending"
            ? "high"
            : urgency === "normal"
              ? "medium"
              : "low";
        const harnessSummary = summarizeHarnessContext(harnessContext);
        const context = `Contact ${entry.contactIdentifier} on ${entry.channel}. Trigger: ${humanizeText(escalation.triggerType)}.${harnessSummary ? ` ${harnessSummary}` : ""}`;

        return {
          id: `escalation-${entry._id}`,
          kind: "escalation",
          severity,
          status: escalation.status,
          title: `Escalation ${humanizeText(escalation.status)} (${humanizeText(urgency)})`,
          blockerReason: escalation.reason || "Escalation reason not captured.",
          context,
          createdAt: escalation.escalatedAt,
          sessionId: entry._id,
          escalationStatus: escalation.status,
          harnessContext: harnessContext || undefined,
        };
      });

    const approvalItems: InterventionQueueItem[] = agentApprovals
      .filter((approval) => approval.status === "pending")
      .map((approval) => {
        const approvalProps = approval.customProperties || {};
        const harnessContext = parseHarnessContext(
          (approval as unknown as { harnessContext?: unknown }).harnessContext
          || approvalProps.harnessContext,
        );
        const actionType = readString(approvalProps.actionType)
          || approval.subtype
          || "agent action";
        const contextHint = summarizeInterventionPayload(approvalProps.actionPayload);
        const harnessSummary = summarizeHarnessContext(harnessContext);
        const context = [contextHint || "No structured action context captured.", harnessSummary]
          .filter(Boolean)
          .join(" ");

        return {
          id: `approval-${approval._id}`,
          kind: "approval",
          severity: classifyApprovalSeverity(actionType),
          status: approval.status,
          title: `Approval pending: ${humanizeText(actionType)}`,
          blockerReason: `Agent requested approval before executing ${humanizeText(actionType)}.`,
          context,
          createdAt: approval.createdAt,
          sessionId: readSessionId(approvalProps.sessionId),
          approvalId: approval._id,
          harnessContext: harnessContext || undefined,
        };
      });

    return [...escalationItems, ...approvalItems].sort((a, b) => {
      const severityDiff = severityRank(a.severity) - severityRank(b.severity);
      if (severityDiff !== 0) return severityDiff;
      return a.createdAt - b.createdAt;
    });
  }, [agentApprovals, escalationQueue, agentId]);

  useEffect(() => {
    if (interventionQueue.length === 0) {
      if (selectedInterventionId !== null) {
        setSelectedInterventionId(null);
      }
      return;
    }

    if (!selectedInterventionId || !interventionQueue.some((item) => item.id === selectedInterventionId)) {
      setSelectedInterventionId(interventionQueue[0].id);
    }
  }, [interventionQueue, selectedInterventionId]);

  const selectedIntervention = interventionQueue.find((item) => item.id === selectedInterventionId) || null;
  const selectedInterventionDrillDown = useQuery(
    apiAny.ai.agentSessions.getControlCenterThreadDrillDown,
    selectedIntervention?.sessionId
      ? {
        sessionId,
        organizationId,
        threadId: selectedIntervention.sessionId,
        limit: 120,
      }
      : "skip",
  ) as ControlCenterThreadDrillDown | null | undefined;
  const selectedInterventionTimelineEvents = useMemo(
    () => selectedInterventionDrillDown?.timelineEvents || [],
    [selectedInterventionDrillDown],
  );
  const memoryProvenanceEvidence = useMemo(
    () => deriveMemoryProvenanceEvidence(selectedInterventionTimelineEvents),
    [selectedInterventionTimelineEvents],
  );
  const retrievalCitationEvidence = useMemo(
    () => deriveRetrievalCitationEvidence(selectedInterventionTimelineEvents),
    [selectedInterventionTimelineEvents],
  );
  const selectedInterventionKind = selectedIntervention?.kind;
  const selectedInterventionKey = selectedIntervention?.id;

  useEffect(() => {
    if (!selectedInterventionKind) {
      return;
    }

    setSelectedTemplateId(DEFAULT_TEMPLATE_FOR_KIND[selectedInterventionKind]);
    setTemplateNote("");
    setTemplateFileName("");
    setTemplateFileUrl("");
    setRejectionReason("");
    setResolutionSummary("");
    setInterventionError(null);
  }, [selectedInterventionKey, selectedInterventionKind]);

  useEffect(() => {
    if (sortedThreadRows.length === 0) {
      if (selectedThreadId !== null) {
        setSelectedThreadId(null);
      }
      return;
    }

    if (!selectedThreadId || !sortedThreadRows.some((row) => row.threadId === selectedThreadId)) {
      setSelectedThreadId(sortedThreadRows[0].threadId);
    }
  }, [selectedThreadId, sortedThreadRows]);

  const selectedThreadRow = sortedThreadRows.find((row) => row.threadId === selectedThreadId) || null;
  const threadTimelineEvents = useMemo(
    () => controlCenterThreadDrillDown?.timelineEvents || [],
    [controlCenterThreadDrillDown]
  );
  const threadLineage = useMemo(
    () => controlCenterThreadDrillDown?.lineage || [],
    [controlCenterThreadDrillDown]
  );

  useEffect(() => {
    if (threadLineage.length === 0) {
      if (selectedLineageInstanceId !== null) {
        setSelectedLineageInstanceId(null);
      }
      return;
    }

    if (
      !selectedLineageInstanceId
      || !threadLineage.some((instance) => instance.instanceAgentId === selectedLineageInstanceId)
    ) {
      const activeInstance = threadLineage.find((instance) => instance.active) || threadLineage[0];
      setSelectedLineageInstanceId(activeInstance.instanceAgentId);
    }
  }, [selectedLineageInstanceId, threadLineage]);

  const selectedLineageInstance = threadLineage.find(
    (instance) => instance.instanceAgentId === selectedLineageInstanceId
  ) || null;

  const interventionMessages = useQuery(
    apiAny.ai.agentSessions.getSessionMessagesAuth,
    selectedIntervention?.sessionId
      ? {
        sessionId,
        agentSessionId: selectedIntervention.sessionId,
        limit: 80,
      }
      : "skip",
  ) as SessionMessageItem[] | undefined;

  const runIntervention = async (operation: () => Promise<unknown>) => {
    setInterventionError(null);
    setIsIntervening(true);
    try {
      await operation();
      setRejectionReason("");
      setResolutionSummary("");
      setTemplateNote("");
      setTemplateFileName("");
      setTemplateFileUrl("");
    } catch (error) {
      setInterventionError(error instanceof Error ? error.message : "Intervention failed.");
    } finally {
      setIsIntervening(false);
    }
  };

  const buildInterventionTemplate = (options?: {
    requireFileForSendTemplate?: boolean;
  }): InterventionTemplatePayload | null => {
    if (!selectedIntervention) {
      return null;
    }

    const definition = INTERVENTION_TEMPLATE_DEFINITIONS.find(
      (template) => template.id === selectedTemplateId
    );
    if (!definition || !definition.supportedKinds.includes(selectedIntervention.kind)) {
      setInterventionError("Select a valid action template for this intervention.");
      return null;
    }

    const note = templateNote.trim() || undefined;
    const fileName = templateFileName.trim() || undefined;
    const fileUrl = templateFileUrl.trim() || undefined;
    const requireFileForSendTemplate =
      options?.requireFileForSendTemplate ?? true;
    if (selectedTemplateId === "send_file" && requireFileForSendTemplate && !fileName && !fileUrl) {
      setInterventionError("Send file template requires a file name or file URL.");
      return null;
    }

    return {
      templateId: selectedTemplateId,
      note,
      fileName,
      fileUrl,
    };
  };

  const handleApprove = async () => {
    if (!selectedIntervention?.approvalId) return;
    const interventionTemplate = buildInterventionTemplate();
    if (!interventionTemplate) return;
    await runIntervention(() =>
      approveAction({
        sessionId,
        approvalId: selectedIntervention.approvalId as Id<"objects">,
        interventionTemplate,
      })
    );
  };

  const handleReject = async () => {
    if (!selectedIntervention?.approvalId) return;
    const interventionTemplate = buildInterventionTemplate({
      requireFileForSendTemplate: false,
    });
    if (!interventionTemplate) return;
    await runIntervention(() =>
      rejectAction({
        sessionId,
        approvalId: selectedIntervention.approvalId as Id<"objects">,
        reason: rejectionReason.trim() || undefined,
        interventionTemplate,
      })
    );
  };

  const handleTakeOver = async () => {
    if (!selectedIntervention?.sessionId) return;
    await runIntervention(() =>
      takeOverEscalation({
        sessionId,
        agentSessionId: selectedIntervention.sessionId as Id<"agentSessions">,
      })
    );
  };

  const handleDismiss = async () => {
    if (!selectedIntervention?.sessionId) return;
    await runIntervention(() =>
      dismissEscalation({
        sessionId,
        agentSessionId: selectedIntervention.sessionId as Id<"agentSessions">,
      })
    );
  };

  const handleResolve = async () => {
    if (!selectedIntervention?.sessionId) return;
    if (resolutionSummary.trim().length === 0) {
      setInterventionError("Add a resolution summary before resolving this escalation.");
      return;
    }
    const interventionTemplate = buildInterventionTemplate();
    if (!interventionTemplate) return;
    await runIntervention(() =>
      resolveEscalation({
        sessionId,
        agentSessionId: selectedIntervention.sessionId as Id<"agentSessions">,
        resolutionSummary: resolutionSummary.trim(),
        interventionTemplate,
      })
    );
  };

  if (
    !agent
    || !proposals
    || !approvals
    || !activeSessions
    || !closedSessions
    || !handedOffSessions
    || !escalationMetrics
    || !escalationQueue
    || !controlCenterThreads
  ) {
    return (
      <div className="p-4 text-xs" style={{ color: "var(--window-document-text)" }}>
        Loading trust cockpit...
      </div>
    );
  }

  const pendingApprovals = agentApprovals.filter((approval) => approval.status === "pending").length;
  const pendingProposals = proposals.filter((proposal) => proposal.status === "pending").length;
  const pendingEscalations = agentEscalations.filter(
    (session) => session.escalationState?.status === "pending"
  ).length;
  const takenOverEscalations = agentEscalations.filter(
    (session) => session.escalationState?.status === "taken_over"
  ).length;
  const waitingOnHumanThreads = sortedThreadRows.filter((row) => row.waitingOnHuman).length;

  const driftProposals = proposals.filter((proposal) =>
    typeof proposal.driftScores?.overall === "number"
  );

  const latestDriftProposal = [...driftProposals].sort((a, b) => b.createdAt - a.createdAt)[0];
  const highestDrift = driftProposals.reduce((max, proposal) => {
    const overall = proposal.driftScores?.overall || 0;
    return Math.max(max, overall);
  }, 0);

  const avgDrift = driftProposals.length > 0
    ? driftProposals.reduce((sum, proposal) => sum + (proposal.driftScores?.overall || 0), 0) / driftProposals.length
    : 0;

  const highDriftPending = proposals.filter(
    (proposal) =>
      proposal.status === "pending"
      && typeof proposal.driftScores?.overall === "number"
      && proposal.driftScores.overall >= 0.6
  ).length;

  const pendingAlignmentProposals = proposals.filter(
    (proposal) => proposal.status === "pending" && proposal.triggerType === "alignment"
  ).length;

  const trustScore = clamp(
    100
      - pendingEscalations * 22
      - takenOverEscalations * 12
      - pendingApprovals * 8
      - pendingProposals * 6
      - highDriftPending * 10
  );

  const trustLabel = trustScore >= 85 ? "Stable" : trustScore >= 65 ? "Watch" : "Attention Required";

  const availableTemplates = selectedIntervention
    ? INTERVENTION_TEMPLATE_DEFINITIONS.filter((template) =>
      template.supportedKinds.includes(selectedIntervention.kind)
    )
    : [];
  const selectedTemplate = availableTemplates.find(
    (template) => template.id === selectedTemplateId
  ) || availableTemplates[0];
  const shouldRenderTemplateControls =
    selectedIntervention?.kind === "approval"
    || selectedIntervention?.escalationStatus === "taken_over";

  const actionItems: ActionItem[] = [];
  if (pendingEscalations > 0) {
    actionItems.push({
      id: "pending-escalations",
      severity: "high",
      label: `${pendingEscalations} escalation${pendingEscalations === 1 ? "" : "s"} waiting for human response`,
      action: "Open Escalations and choose Take Over or Dismiss.",
    });
  }
  if (pendingApprovals > 0) {
    actionItems.push({
      id: "pending-approvals",
      severity: "medium",
      label: `${pendingApprovals} approval${pendingApprovals === 1 ? "" : "s"} awaiting decision`,
      action: "Open Approvals and approve/reject queued actions.",
    });
  }
  if (pendingProposals > 0) {
    actionItems.push({
      id: "pending-proposals",
      severity: highDriftPending > 0 ? "high" : "medium",
      label: `${pendingProposals} soul proposal${pendingProposals === 1 ? "" : "s"} pending review`,
      action: "Open Soul and review proposal rationale before approving.",
    });
  }
  if (actionItems.length === 0) {
    actionItems.push({
      id: "stable",
      severity: "low",
      label: "No immediate trust interventions are pending",
      action: "Monitor drift and escalations from this cockpit.",
    });
  }

  const groupedTimeline = buildTimelineGroups(threadTimelineEvents);
  const hasTimelineEvents = groupedTimeline.some((group) => group.events.length > 0);
  const timelineLoading = Boolean(selectedThreadId && controlCenterThreadDrillDown === undefined);
  const selectedThreadMissing = Boolean(selectedThreadId && controlCenterThreadDrillDown === null);
  const lineageLoading = Boolean(selectedThreadId && controlCenterThreadDrillDown === undefined);

  const enabledEscalationTriggers = getEnabledEscalationTriggers(props.escalationPolicy);
  const blockedTopics = props.blockedTopics || [];
  const disabledTools = props.disabledTools || [];
  const approvalScopedTools = props.requireApprovalFor || [];
  const neverDo = props.soul?.neverDo || [];

  return (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Card title="Trust Health">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold" style={{ color: trustScore >= 65 ? "#166534" : "#b91c1c" }}>
              {trustScore}
            </span>
            <span className="text-xs" style={{ color: "var(--neutral-gray)" }}>/100</span>
          </div>
          <p className="mt-1 text-xs" style={{ color: "var(--window-document-text)" }}>
            {trustLabel}
          </p>
          <div className="mt-3 space-y-1 text-[11px]" style={{ color: "var(--neutral-gray)" }}>
            <MetricLine label="Pending escalations" value={String(pendingEscalations)} />
            <MetricLine label="Threads waiting on human" value={String(waitingOnHumanThreads)} />
            <MetricLine label="Pending approvals" value={String(pendingApprovals)} />
            <MetricLine label="Pending soul proposals" value={String(pendingProposals)} />
          </div>
        </Card>

        <Card title="Immediate Actions">
          <div className="space-y-2">
            {actionItems.map((item) => (
              <div
                key={item.id}
                className="border p-2"
                style={{
                  borderColor: item.severity === "high" ? "#fecaca" : item.severity === "medium" ? "#fde68a" : "#bbf7d0",
                  background: item.severity === "high" ? "#fef2f2" : item.severity === "medium" ? "#fffbeb" : "#f0fdf4",
                }}
              >
                <div className="text-[11px] font-medium" style={{ color: "var(--window-document-text)" }}>
                  {item.label}
                </div>
                <div className="text-[10px] mt-1" style={{ color: "var(--neutral-gray)" }}>
                  {item.action}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Guardrail Map">
          <div className="space-y-1.5 text-[11px]" style={{ color: "var(--window-document-text)" }}>
            <MetricLine label="Autonomy" value={humanizeText(props.autonomyLevel || "supervised")} />
            <MetricLine label="Blocked topics" value={String(blockedTopics.length)} />
            <MetricLine label="Approval-only tools" value={String(approvalScopedTools.length)} />
            <MetricLine label="Disabled tools" value={String(disabledTools.length)} />
            <MetricLine label="Never-do rules" value={String(neverDo.length)} />
            <MetricLine label="Escalation triggers" value={String(enabledEscalationTriggers.length)} />
          </div>
          {blockedTopics.length > 0 && (
            <p className="mt-2 text-[10px]" style={{ color: "var(--neutral-gray)" }}>
              Blocked topics: {blockedTopics.slice(0, 3).join(", ")}
              {blockedTopics.length > 3 ? "..." : ""}
            </p>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card title="Drift Signals">
          <div className="space-y-1 text-[11px]" style={{ color: "var(--window-document-text)" }}>
            <MetricLine label="Proposals with drift telemetry" value={String(driftProposals.length)} />
            <MetricLine label="Avg overall drift" value={avgDrift.toFixed(2)} />
            <MetricLine label="Max overall drift" value={highestDrift.toFixed(2)} />
            <MetricLine label="High-drift proposals pending" value={String(highDriftPending)} />
            <MetricLine label="Pending alignment proposals" value={String(pendingAlignmentProposals)} />
          </div>
          {latestDriftProposal && (
            <p className="mt-2 text-[10px]" style={{ color: "var(--neutral-gray)" }}>
              Latest drift summary ({timeAgo(latestDriftProposal.createdAt)}): {latestDriftProposal.driftSummary || "No summary provided."}
            </p>
          )}
        </Card>

        <Card title="Approval + Escalation Narrative">
          <div className="space-y-1 text-[11px]" style={{ color: "var(--window-document-text)" }}>
            <MetricLine label="Active escalations" value={String(pendingEscalations + takenOverEscalations)} />
            <MetricLine label="Takeover rate (30d)" value={`${escalationMetrics.takeoverRate}%`} />
            <MetricLine label="Resolution rate (30d)" value={`${escalationMetrics.resolutionRate}%`} />
            <MetricLine label="False-positive rate (30d)" value={`${escalationMetrics.falsePositiveRate}%`} />
            <MetricLine label="Team handoffs tracked" value={String(teamHandoffs.length)} />
          </div>
          <p className="mt-2 text-[10px]" style={{ color: "var(--neutral-gray)" }}>
            Last {escalationMetrics.periodDays} days: {escalationMetrics.totalEscalations} escalation
            {escalationMetrics.totalEscalations === 1 ? "" : "s"}.
          </p>
        </Card>
      </div>

      <Card title="Thread Queue">
        {sortedThreadRows.length === 0 && (
          <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
            No active threads mapped to this agent.
          </div>
        )}

        <div className="space-y-2">
          {sortedThreadRows.map((threadRow) => (
            <button
              key={threadRow.threadId}
              onClick={() => setSelectedThreadId(threadRow.threadId)}
              className="w-full border p-2 text-left"
              style={{
                borderColor: "var(--window-document-border)",
                borderLeft: `3px solid ${
                  selectedThreadId === threadRow.threadId
                    ? "#2563eb"
                    : threadRow.waitingOnHuman
                      ? "#dc2626"
                      : "var(--window-document-border)"
                }`,
                background:
                  selectedThreadId === threadRow.threadId
                    ? "var(--desktop-shell-accent)"
                    : "var(--window-document-card-bg, #fff)",
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="text-[11px] font-medium" style={{ color: "var(--window-document-text)" }}>
                  {threadRow.externalContactIdentifier}
                </div>
                <div className="text-[10px]" style={{ color: "var(--neutral-gray)" }} title={formatDateTime(threadRow.updatedAt)}>
                  {timeAgo(threadRow.updatedAt)}
                </div>
              </div>

              <div className="mt-0.5 text-[10px]" style={{ color: "var(--neutral-gray)" }}>
                {threadRow.channel} · {threadRow.templateAgentName}
              </div>

              <div className="mt-1 text-[10px]" style={{ color: "var(--window-document-text)" }}>
                {threadRow.lastMessagePreview}
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <StatusPill
                  label={`Lifecycle: ${threadRow.lifecycleState}`}
                  tone={lifecycleBadgeTone(threadRow.lifecycleState)}
                />
                <StatusPill
                  label={`Delivery: ${threadRow.deliveryState}`}
                  tone={deliveryBadgeTone(threadRow.deliveryState)}
                />
                {threadRow.escalationCountOpen > 0 && (
                  <StatusPill
                    label={`Escalations: ${threadRow.escalationCountOpen}${threadRow.escalationUrgency ? ` (${humanizeText(threadRow.escalationUrgency)})` : ""}`}
                    tone={{ background: "#fef3c7", border: "#f59e0b", color: "#92400e" }}
                  />
                )}
                <StatusPill
                  label={`Active instances: ${threadRow.activeInstanceCount}`}
                  tone={{ background: "#e2e8f0", border: "#94a3b8", color: "#334155" }}
                />
                {threadRow.waitingOnHuman && (
                  <StatusPill
                    label="Waiting on human"
                    tone={{ background: "#fee2e2", border: "#dc2626", color: "#991b1b" }}
                  />
                )}
              </div>
            </button>
          ))}
        </div>
      </Card>

      <Card title="Instance Lineage Drill-Down">
        {!selectedThreadRow && (
          <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
            Select a thread to inspect instance lineage.
          </div>
        )}

        {selectedThreadRow && lineageLoading && (
          <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
            Loading lineage...
          </div>
        )}

        {selectedThreadRow && !lineageLoading && threadLineage.length === 0 && (
          <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
            No instance lineage is available for this thread yet.
          </div>
        )}

        {selectedThreadRow && !lineageLoading && threadLineage.length > 0 && (
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-[280px,1fr]">
            <div
              className="border p-2"
              style={{
                borderColor: "var(--window-document-border)",
                background: "var(--window-document-panel-bg, #fff)",
              }}
            >
              <div className="mb-2 text-[11px] font-medium" style={{ color: "var(--window-document-text)" }}>
                Instances ({threadLineage.length})
              </div>
              <div className="space-y-1.5">
                {threadLineage.map((instance) => (
                  <button
                    key={instance.instanceAgentId}
                    onClick={() => setSelectedLineageInstanceId(instance.instanceAgentId)}
                    className="w-full border p-2 text-left"
                    style={{
                      borderColor: "var(--window-document-border)",
                      borderLeft: `3px solid ${
                        instance.active
                          ? "#2563eb"
                          : selectedLineageInstanceId === instance.instanceAgentId
                            ? "#0f766e"
                            : "var(--window-document-border)"
                      }`,
                      background:
                        selectedLineageInstanceId === instance.instanceAgentId
                          ? "var(--desktop-shell-accent)"
                          : "var(--window-document-card-bg, #fff)",
                    }}
                  >
                    <div className="text-[10px] font-medium" style={{ color: "var(--window-document-text)" }}>
                      {instance.displayName || compactId(instance.instanceAgentId)}
                    </div>
                    <div className="mt-0.5 text-[10px]" style={{ color: "var(--neutral-gray)" }}>
                      {instance.roleLabel}
                      {instance.active ? " · Active" : ""}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div
              className="border p-3"
              style={{
                borderColor: "var(--window-document-border)",
                background: "var(--window-document-panel-bg, #fff)",
              }}
            >
              {!selectedLineageInstance && (
                <div className="text-[10px]" style={{ color: "var(--neutral-gray)" }}>
                  Select an instance to inspect lineage metadata.
                </div>
              )}

              {selectedLineageInstance && (
                <div className="space-y-2 text-[11px]" style={{ color: "var(--window-document-text)" }}>
                  <div className="font-medium">
                    {selectedLineageInstance.displayName || compactId(selectedLineageInstance.instanceAgentId)}
                  </div>
                  <MetricLine label="Role" value={selectedLineageInstance.roleLabel} />
                  <MetricLine label="Active" value={selectedLineageInstance.active ? "Yes" : "No"} />
                  <MetricLine label="Spawned" value={formatDateTime(selectedLineageInstance.spawnedAt)} />
                  <MetricLine
                    label="Template"
                    value={compactId(selectedLineageInstance.templateAgentId)}
                  />
                  <MetricLine
                    label="Parent"
                    value={selectedLineageInstance.parentInstanceAgentId
                      ? compactId(selectedLineageInstance.parentInstanceAgentId)
                      : "Root"}
                  />
                  {selectedLineageInstance.handoffReason && (
                    <div className="text-[10px]" style={{ color: "var(--neutral-gray)" }}>
                      Handoff reason: {selectedLineageInstance.handoffReason}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </Card>

      <Card title="Intervention Drill-Down">
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[280px,1fr]">
          <div
            className="border p-2"
            style={{
              borderColor: "var(--window-document-border)",
              background: "var(--window-document-panel-bg, #fff)",
            }}
          >
            <div className="mb-2 text-[11px] font-medium" style={{ color: "var(--window-document-text)" }}>
              Queue ({interventionQueue.length})
            </div>
            {interventionQueue.length === 0 && (
              <div className="text-[10px]" style={{ color: "var(--neutral-gray)" }}>
                No active interventions. Pending items will appear here.
              </div>
            )}
            <div className="space-y-1.5">
              {interventionQueue.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setSelectedInterventionId(item.id);
                    setInterventionError(null);
                  }}
                  className="w-full border p-2 text-left"
                  style={{
                    borderColor: "var(--window-document-border)",
                    borderLeft: `3px solid ${severityColor(item.severity)}`,
                    background:
                      selectedInterventionId === item.id
                        ? "var(--desktop-shell-accent)"
                        : "var(--window-document-card-bg, #fff)",
                  }}
                >
                  <div className="text-[10px] font-medium" style={{ color: "var(--window-document-text)" }}>
                    {item.title}
                  </div>
                  <div className="mt-0.5 text-[10px]" style={{ color: "var(--neutral-gray)" }}>
                    {timeAgo(item.createdAt)}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            {!selectedIntervention && (
              <div className="border p-3 text-[11px]" style={{ borderColor: "var(--window-document-border)", color: "var(--neutral-gray)" }}>
                Select a queue item to inspect blocker context and take action.
              </div>
            )}

            {selectedIntervention && (
              <>
                <div
                  className="border p-3"
                  style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-panel-bg, #fff)" }}
                >
                  <div className="text-[11px] font-medium" style={{ color: "var(--window-document-text)" }}>
                    Blocker Reason
                  </div>
                  <div className="mt-1 text-[11px]" style={{ color: "var(--window-document-text)" }}>
                    {selectedIntervention.blockerReason}
                  </div>
                  <div className="mt-1 text-[10px]" style={{ color: "var(--neutral-gray)" }}>
                    {selectedIntervention.context}
                  </div>
                </div>

                {selectedIntervention.harnessContext && (
                  <div
                    className="border p-3"
                    style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-panel-bg, #fff)" }}
                  >
                    <div className="mb-2 text-[11px] font-medium" style={{ color: "var(--window-document-text)" }}>
                      Harness Context
                    </div>
                    <div className="space-y-1 text-[11px]" style={{ color: "var(--window-document-text)" }}>
                      <MetricLine
                        label="Layer"
                        value={`${selectedIntervention.harnessContext.layer.name} (L${selectedIntervention.harnessContext.layer.index})`}
                      />
                      <MetricLine
                        label="Tools used"
                        value={
                          selectedIntervention.harnessContext.toolsUsed.length > 0
                            ? selectedIntervention.harnessContext.toolsUsed.join(", ")
                            : "none captured"
                        }
                      />
                      <MetricLine
                        label="Handoff edge"
                        value={
                          selectedIntervention.harnessContext.handoffEdge
                            ? `${compactId(selectedIntervention.harnessContext.handoffEdge.fromAgentId)} -> ${compactId(selectedIntervention.harnessContext.handoffEdge.toAgentId)}`
                            : "none captured"
                        }
                      />
                    </div>
                    {selectedIntervention.harnessContext.handoffEdge && (
                      <div className="mt-2 space-y-1 text-[10px]" style={{ color: "var(--neutral-gray)" }}>
                        <div>Reason: {selectedIntervention.harnessContext.handoffEdge.reason}</div>
                        {selectedIntervention.harnessContext.handoffEdge.summary && (
                          <div>Summary: {selectedIntervention.harnessContext.handoffEdge.summary}</div>
                        )}
                        {selectedIntervention.harnessContext.handoffEdge.goal && (
                          <div>Goal: {selectedIntervention.harnessContext.handoffEdge.goal}</div>
                        )}
                        <div>{formatDateTime(selectedIntervention.harnessContext.handoffEdge.timestamp)}</div>
                      </div>
                    )}
                  </div>
                )}

                {selectedIntervention.kind === "escalation" && (
                  <div
                    className="border p-3"
                    style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-panel-bg, #fff)" }}
                  >
                    <div className="mb-2 text-[11px] font-medium" style={{ color: "var(--window-document-text)" }}>
                      Memory Provenance
                    </div>
                    {!selectedIntervention.sessionId && (
                      <div className="text-[10px]" style={{ color: "var(--neutral-gray)" }}>
                        No session context attached to this escalation.
                      </div>
                    )}
                    {selectedIntervention.sessionId && selectedInterventionDrillDown === undefined && (
                      <div className="text-[10px]" style={{ color: "var(--neutral-gray)" }}>
                        Loading memory provenance...
                      </div>
                    )}
                    {selectedIntervention.sessionId
                      && selectedInterventionDrillDown
                      && !memoryProvenanceEvidence && (
                      <div className="text-[10px]" style={{ color: "var(--neutral-gray)" }}>
                        No memory consent/provenance checkpoints captured for this session.
                      </div>
                    )}
                    {memoryProvenanceEvidence && (
                      <>
                        <div className="space-y-1 text-[11px]" style={{ color: "var(--window-document-text)" }}>
                          <MetricLine label="Consent scope" value={humanizeText(memoryProvenanceEvidence.consentScope)} />
                          <MetricLine label="Consent decision" value={humanizeText(memoryProvenanceEvidence.consentDecision)} />
                          <MetricLine label="Candidate count" value={String(memoryProvenanceEvidence.memoryCandidateIds.length)} />
                          <MetricLine label="Checkpoint events" value={String(memoryProvenanceEvidence.eventCount)} />
                          <MetricLine
                            label="Blocked without consent"
                            value={memoryProvenanceEvidence.blockedNoConsent ? "Yes" : "No"}
                          />
                        </div>
                        <div className="mt-2 text-[10px]" style={{ color: "var(--neutral-gray)" }}>
                          Latest checkpoint: {humanizeText(memoryProvenanceEvidence.eventName)} ({formatDateTime(memoryProvenanceEvidence.occurredAt)})
                        </div>
                        {memoryProvenanceEvidence.consentPromptVersion && (
                          <div className="mt-1 text-[10px]" style={{ color: "var(--neutral-gray)" }}>
                            Prompt version: {memoryProvenanceEvidence.consentPromptVersion}
                          </div>
                        )}
                        {memoryProvenanceEvidence.memoryCandidateIds.length > 0 && (
                          <div className="mt-2">
                            <div className="text-[10px] font-medium" style={{ color: "var(--window-document-text)" }}>
                              Candidate attribution
                            </div>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {memoryProvenanceEvidence.memoryCandidateIds.slice(0, 8).map((candidateId) => (
                                <span
                                  key={candidateId}
                                  className="inline-flex items-center rounded border px-1.5 py-0.5 text-[10px]"
                                  style={{
                                    borderColor: "var(--window-document-border)",
                                    background: "var(--window-document-card-bg, #fff)",
                                    color: "var(--window-document-text)",
                                  }}
                                  title={candidateId}
                                >
                                  {compactId(candidateId)}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {selectedIntervention.kind === "escalation" && (
                  <div
                    className="border p-3"
                    style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-panel-bg, #fff)" }}
                  >
                    <div className="mb-2 text-[11px] font-medium" style={{ color: "var(--window-document-text)" }}>
                      Retrieval Citation Provenance
                    </div>
                    {!selectedIntervention.sessionId && (
                      <div className="text-[10px]" style={{ color: "var(--neutral-gray)" }}>
                        No session context attached to this escalation.
                      </div>
                    )}
                    {selectedIntervention.sessionId && selectedInterventionDrillDown === undefined && (
                      <div className="text-[10px]" style={{ color: "var(--neutral-gray)" }}>
                        Loading retrieval provenance...
                      </div>
                    )}
                    {selectedIntervention.sessionId
                      && selectedInterventionDrillDown
                      && !retrievalCitationEvidence && (
                      <div className="text-[10px]" style={{ color: "var(--neutral-gray)" }}>
                        No retrieval citation telemetry captured for this session.
                      </div>
                    )}
                    {retrievalCitationEvidence && (
                      <>
                        <div className="space-y-1 text-[11px]" style={{ color: "var(--window-document-text)" }}>
                          <MetricLine label="Mode" value={retrievalCitationEvidence.mode || "unknown"} />
                          <MetricLine label="Path" value={retrievalCitationEvidence.path || "unknown"} />
                          <MetricLine label="Citations" value={String(retrievalCitationEvidence.citationCount)} />
                          <MetricLine label="Chunk citations" value={String(retrievalCitationEvidence.chunkCitationCount)} />
                          <MetricLine label="Bridge citations" value={String(retrievalCitationEvidence.bridgeCitationCount)} />
                          <MetricLine label="Snapshot events" value={String(retrievalCitationEvidence.eventCount)} />
                        </div>
                        <div className="mt-2 text-[10px]" style={{ color: "var(--neutral-gray)" }}>
                          Latest snapshot: {formatDateTime(retrievalCitationEvidence.occurredAt)}
                        </div>
                        {retrievalCitationEvidence.fallbackUsed && (
                          <div className="mt-1 text-[10px]" style={{ color: "#92400e" }}>
                            Fallback used: {retrievalCitationEvidence.fallbackReason || "reason not captured"}
                          </div>
                        )}
                        {retrievalCitationEvidence.sourceKindCounts.length > 0 && (
                          <div className="mt-1 text-[10px]" style={{ color: "var(--neutral-gray)" }}>
                            Source kinds: {retrievalCitationEvidence.sourceKindCounts
                              .map((entry) => `${entry.sourceKind} (${entry.count})`)
                              .join(", ")}
                          </div>
                        )}
                        {retrievalCitationEvidence.citations.length > 0 && (
                          <div className="mt-2 space-y-1.5">
                            {retrievalCitationEvidence.citations.slice(0, 8).map((citation) => (
                              <div
                                key={`${citation.citationId}-${citation.sourcePath}`}
                                className="border p-2"
                                style={{
                                  borderColor: "var(--window-document-border)",
                                  background: "var(--window-document-card-bg, #fff)",
                                }}
                              >
                                <div className="text-[10px] font-medium" style={{ color: "var(--window-document-text)" }}>
                                  {citation.citationId}
                                </div>
                                <div className="text-[10px]" style={{ color: "var(--neutral-gray)" }}>
                                  {humanizeText(citation.provenanceType)} · {citation.sourceKind}
                                </div>
                                <div className="text-[10px]" style={{ color: "var(--window-document-text)" }}>
                                  Path: {citation.sourcePath}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                <div
                  className="border p-3"
                  style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-panel-bg, #fff)" }}
                >
                  <div className="mb-2 text-[11px] font-medium" style={{ color: "var(--window-document-text)" }}>
                    Session Timeline
                  </div>
                  {!selectedIntervention.sessionId && (
                    <div className="text-[10px]" style={{ color: "var(--neutral-gray)" }}>
                      No session context attached to this queue item.
                    </div>
                  )}
                  {selectedIntervention.sessionId && !interventionMessages && (
                    <div className="text-[10px]" style={{ color: "var(--neutral-gray)" }}>
                      Loading session timeline...
                    </div>
                  )}
                  {selectedIntervention.sessionId && interventionMessages && interventionMessages.length === 0 && (
                    <div className="text-[10px]" style={{ color: "var(--neutral-gray)" }}>
                      This session has no messages yet.
                    </div>
                  )}
                  {selectedIntervention.sessionId && interventionMessages && interventionMessages.length > 0 && (
                    <div className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
                      {interventionMessages.map((message) => (
                        <div
                          key={message._id}
                          className="border p-2"
                          style={{
                            borderColor: "var(--window-document-border)",
                            background: "var(--window-document-card-bg, #fff)",
                          }}
                        >
                          <div className="mb-1 flex items-center gap-1.5 text-[10px]" style={{ color: "var(--neutral-gray)" }}>
                            {message.role === "assistant" && <Bot size={11} />}
                            {message.role === "user" && <User size={11} />}
                            {message.role === "system" && <Clock size={11} />}
                            <span>{message.role}</span>
                            <span>·</span>
                            <span>{new Date(message.timestamp).toLocaleTimeString()}</span>
                          </div>
                          <div className="text-[11px] whitespace-pre-wrap break-words" style={{ color: "var(--window-document-text)" }}>
                            {message.content}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div
                  className="border p-3"
                  style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-panel-bg, #fff)" }}
                >
                  <div className="mb-2 text-[11px] font-medium" style={{ color: "var(--window-document-text)" }}>
                    Intervention Action Panel
                  </div>

                  {shouldRenderTemplateControls && selectedTemplate && (
                    <div
                      className="mb-3 space-y-2 border p-2"
                      style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-card-bg, #fff)" }}
                    >
                      <div className="text-[10px] font-medium" style={{ color: "var(--window-document-text)" }}>
                        Action Template
                      </div>
                      <select
                        value={selectedTemplateId}
                        onChange={(event) => {
                          setSelectedTemplateId(event.target.value as InterventionTemplateId);
                          setInterventionError(null);
                        }}
                        className="w-full border px-2 py-1 text-[10px]"
                        style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-card-bg, #fff)" }}
                      >
                        {availableTemplates.map((template) => (
                          <option key={template.id} value={template.id}>
                            {template.label}
                          </option>
                        ))}
                      </select>
                      <div className="text-[10px]" style={{ color: "var(--neutral-gray)" }}>
                        {selectedTemplate.description}
                      </div>
                      {selectedTemplateId === "send_file" && (
                        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                          <input
                            value={templateFileName}
                            onChange={(event) => setTemplateFileName(event.target.value)}
                            placeholder="File name (for example pricing-deck.pdf)"
                            className="border px-2 py-1 text-[10px]"
                            style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-card-bg, #fff)" }}
                          />
                          <input
                            value={templateFileUrl}
                            onChange={(event) => setTemplateFileUrl(event.target.value)}
                            placeholder="File URL (optional if name is enough)"
                            className="border px-2 py-1 text-[10px]"
                            style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-card-bg, #fff)" }}
                          />
                        </div>
                      )}
                      <textarea
                        value={templateNote}
                        onChange={(event) => setTemplateNote(event.target.value)}
                        placeholder="Template note for audit log (optional)"
                        className="h-14 w-full border px-2 py-1 text-[10px]"
                        style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-card-bg, #fff)" }}
                      />
                    </div>
                  )}

                  {selectedIntervention.kind === "approval" && (
                    <div className="space-y-2">
                      <textarea
                        value={rejectionReason}
                        onChange={(event) => setRejectionReason(event.target.value)}
                        placeholder="Optional rejection reason"
                        className="h-16 w-full border px-2 py-1 text-[11px]"
                        style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-card-bg, #fff)" }}
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => { void handleApprove(); }}
                          disabled={isIntervening || !selectedIntervention.approvalId}
                          className="flex items-center gap-1 border px-3 py-1 text-[11px] disabled:opacity-60"
                          style={{ borderColor: "var(--window-document-border)" }}
                        >
                          <CheckCircle size={12} />
                          {isIntervening
                            ? "Approving..."
                            : selectedTemplateId === "send_file"
                              ? "Approve + Send File"
                              : "Approve Override"}
                        </button>
                        <button
                          onClick={() => { void handleReject(); }}
                          disabled={isIntervening || !selectedIntervention.approvalId}
                          className="flex items-center gap-1 border px-3 py-1 text-[11px] disabled:opacity-60"
                          style={{ borderColor: "var(--window-document-border)" }}
                        >
                          <XCircle size={12} />
                          {isIntervening ? "Rejecting..." : "Reject"}
                        </button>
                      </div>
                    </div>
                  )}

                  {selectedIntervention.kind === "escalation" && (
                    <div className="space-y-2">
                      {selectedIntervention.escalationStatus === "pending" && (
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => { void handleTakeOver(); }}
                            disabled={isIntervening || !selectedIntervention.sessionId}
                            className="flex items-center gap-1 border px-3 py-1 text-[11px] disabled:opacity-60"
                            style={{ borderColor: "var(--window-document-border)" }}
                          >
                            <UserCheck size={12} />
                            {isIntervening ? "Taking Over..." : "Take Over"}
                          </button>
                          <button
                            onClick={() => { void handleDismiss(); }}
                            disabled={isIntervening || !selectedIntervention.sessionId}
                            className="flex items-center gap-1 border px-3 py-1 text-[11px] disabled:opacity-60"
                            style={{ borderColor: "var(--window-document-border)" }}
                          >
                            <XCircle size={12} />
                            {isIntervening ? "Dismissing..." : "Dismiss"}
                          </button>
                        </div>
                      )}

                      {selectedIntervention.escalationStatus === "taken_over" && (
                        <>
                          <textarea
                            value={resolutionSummary}
                            onChange={(event) => setResolutionSummary(event.target.value)}
                            placeholder="Resolution summary (required to resume agent)"
                            className="h-16 w-full border px-2 py-1 text-[11px]"
                            style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-card-bg, #fff)" }}
                          />
                          <button
                            onClick={() => { void handleResolve(); }}
                            disabled={isIntervening || !selectedIntervention.sessionId}
                            className="flex items-center gap-1 border px-3 py-1 text-[11px] disabled:opacity-60"
                            style={{ borderColor: "var(--window-document-border)" }}
                          >
                            <CheckCircle size={12} />
                            {isIntervening
                              ? "Resolving..."
                              : selectedTemplateId === "send_file"
                                ? "Send File + Resume Agent"
                                : "Handoff Back To Agent"}
                          </button>
                        </>
                      )}

                      {selectedIntervention.escalationStatus !== "pending"
                        && selectedIntervention.escalationStatus !== "taken_over" && (
                        <div className="text-[10px]" style={{ color: "var(--neutral-gray)" }}>
                          This escalation is already {humanizeText(selectedIntervention.escalationStatus)}.
                        </div>
                      )}
                    </div>
                  )}

                  {interventionError && (
                    <div className="mt-2 text-[10px]" style={{ color: "#b91c1c" }}>
                      {interventionError}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </Card>

      <Card title="Checkpoint Timeline">
        {!selectedThreadRow && (
          <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
            Select a thread to inspect checkpoint-grouped timeline events.
          </div>
        )}

        {selectedThreadRow && timelineLoading && (
          <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
            Loading thread timeline...
          </div>
        )}

        {selectedThreadRow && selectedThreadMissing && (
          <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
            Timeline data is unavailable for the selected thread.
          </div>
        )}

        {selectedThreadRow && !timelineLoading && !selectedThreadMissing && !hasTimelineEvents && (
          <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
            No checkpoint transitions recorded for this thread yet.
          </div>
        )}

        {selectedThreadRow && !timelineLoading && !selectedThreadMissing && hasTimelineEvents && (
          <div className="space-y-3">
            {groupedTimeline.map((group) => (
              group.events.length === 0
                ? null
                : (
                  <div key={group.gate} className="space-y-2">
                    <div className="text-[11px] font-medium" style={{ color: "var(--window-document-text)" }}>
                      {group.label}
                    </div>
                    {group.events.map((event) => (
                      <ControlCenterTimelineRow key={event.eventId} event={event} />
                    ))}
                  </div>
                )
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="border-2 p-3"
      style={{
        borderColor: "var(--window-document-border)",
        background: "var(--window-document-surface, var(--desktop-shell-accent))",
      }}
    >
      <div className="text-xs font-bold mb-2 flex items-center gap-1.5" style={{ color: "var(--window-document-text)" }}>
        {title === "Trust Health" && <Shield size={12} />}
        {title === "Immediate Actions" && <AlertTriangle size={12} />}
        {title === "Guardrail Map" && <CheckCircle size={12} />}
        {title === "Drift Signals" && <Clock size={12} />}
        {title === "Approval + Escalation Narrative" && <MessageSquare size={12} />}
        {title === "Thread Queue" && <MessageSquare size={12} />}
        {title === "Instance Lineage Drill-Down" && <Bot size={12} />}
        {title === "Intervention Drill-Down" && <AlertTriangle size={12} />}
        {title === "Checkpoint Timeline" && <Clock size={12} />}
        <span>{title}</span>
      </div>
      {children}
    </div>
  );
}

function MetricLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span style={{ color: "var(--neutral-gray)" }}>{label}</span>
      <span className="font-medium" style={{ color: "var(--window-document-text)" }}>{value}</span>
    </div>
  );
}

interface StatusPillTone {
  background: string;
  border: string;
  color: string;
}

function StatusPill({ label, tone }: { label: string; tone: StatusPillTone }) {
  return (
    <span
      className="inline-flex items-center rounded border px-1.5 py-0.5 text-[10px]"
      style={{
        background: tone.background,
        borderColor: tone.border,
        color: tone.color,
      }}
    >
      {label}
    </span>
  );
}

function ControlCenterTimelineRow({ event }: { event: ControlCenterTimelineEvent }) {
  const tone = escalationGateTone(event.escalationGate);
  const actorLabel = `${humanizeText(event.actorType)}:${compactId(event.actorId)}`;
  const checkpointLabel = event.checkpoint ? humanizeText(event.checkpoint) : "No checkpoint";

  return (
    <div
      className="border p-2.5"
      style={{
        borderColor: "var(--window-document-border)",
        borderLeft: `3px solid ${tone.border}`,
        background: "var(--window-document-card-bg, var(--window-document-panel-bg, #fff))",
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] font-medium" style={{ color: "var(--window-document-text)" }}>
          {event.title}
        </div>
        <div className="text-[10px]" style={{ color: "var(--neutral-gray)" }} title={formatDateTime(event.occurredAt)}>
          {timeAgo(event.occurredAt)}
        </div>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]" style={{ color: "var(--neutral-gray)" }}>
        <span>{humanizeText(event.kind)}</span>
        <span>·</span>
        <span>{checkpointLabel}</span>
        <span>·</span>
        <span>{actorLabel}</span>
      </div>
      {(event.fromState || event.toState) && (
        <div className="mt-1 text-[10px]" style={{ color: "var(--neutral-gray)" }}>
          State: {event.fromState || "unknown"}{" -> "}{event.toState || "unknown"}
        </div>
      )}
      <div className="text-[10px] mt-1" style={{ color: "var(--neutral-gray)" }}>
        {event.summary}
      </div>
      {event.reason && (
        <div className="text-[10px] mt-1" style={{ color: "var(--window-document-text)" }}>
          Reason: {event.reason}
        </div>
      )}
      {event.trustEventName && (
        <div className="text-[10px] mt-1" style={{ color: "#1d4ed8" }}>
          Trust event: {event.trustEventName}
        </div>
      )}
    </div>
  );
}

function severityRank(severity: TimelineSeverity): number {
  if (severity === "high") return 0;
  if (severity === "medium") return 1;
  return 2;
}

function lifecycleBadgeTone(state: AgentLifecycleState): StatusPillTone {
  if (state === "draft") {
    return { background: "#e5e7eb", border: "#9ca3af", color: "#374151" };
  }
  if (state === "active") {
    return { background: "#dbeafe", border: "#2563eb", color: "#1d4ed8" };
  }
  if (state === "paused") {
    return { background: "#fef3c7", border: "#f59e0b", color: "#92400e" };
  }
  if (state === "escalated") {
    return { background: "#fee2e2", border: "#dc2626", color: "#991b1b" };
  }
  if (state === "takeover") {
    return { background: "#ffedd5", border: "#ea580c", color: "#9a3412" };
  }
  return { background: "#dcfce7", border: "#16a34a", color: "#166534" };
}

function deliveryBadgeTone(state: ThreadDeliveryState): StatusPillTone {
  if (state === "queued") {
    return { background: "#eef2ff", border: "#6366f1", color: "#3730a3" };
  }
  if (state === "running") {
    return { background: "#ecfeff", border: "#0891b2", color: "#155e75" };
  }
  if (state === "done") {
    return { background: "#f8fafc", border: "#94a3b8", color: "#334155" };
  }
  if (state === "blocked") {
    return { background: "#fefce8", border: "#ca8a04", color: "#854d0e" };
  }
  return { background: "#ffe4e6", border: "#e11d48", color: "#9f1239" };
}

function severityColor(severity: TimelineSeverity): string {
  if (severity === "high") return "#ef4444";
  if (severity === "medium") return "#f59e0b";
  return "#22c55e";
}

function classifyApprovalSeverity(actionType: string): TimelineSeverity {
  const normalized = actionType.toLowerCase();
  if (normalized.includes("delete") || normalized.includes("remove") || normalized.includes("disconnect")) {
    return "high";
  }
  if (normalized.includes("deploy") || normalized.includes("publish")) {
    return "high";
  }
  if (normalized.includes("write") || normalized.includes("update") || normalized.includes("create")) {
    return "medium";
  }
  return "low";
}

function summarizeInterventionPayload(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    return "";
  }
  const record = payload as Record<string, unknown>;
  const hints = [
    readString(record.tool),
    readString(record.toolName),
    readString(record.target),
    readString(record.channel),
    readString(record.contactIdentifier),
    readString(record.recordId),
    readString(record.objectId),
    readString(record.url),
  ].filter((value): value is string => typeof value === "string" && value.trim().length > 0);

  return hints.slice(0, 3).join(" | ");
}

function summarizeHarnessContext(harnessContext: HarnessContextEnvelope | null): string {
  if (!harnessContext) {
    return "";
  }

  const parts: string[] = [];
  parts.push(`Layer: ${harnessContext.layer.name} (L${harnessContext.layer.index}).`);

  if (harnessContext.toolsUsed.length > 0) {
    parts.push(`Tools: ${harnessContext.toolsUsed.join(", ")}.`);
  } else {
    parts.push("Tools: none captured.");
  }

  if (harnessContext.handoffEdge) {
    parts.push(
      `Handoff: ${compactId(harnessContext.handoffEdge.fromAgentId)} -> ${compactId(harnessContext.handoffEdge.toAgentId)} (${harnessContext.handoffEdge.reason}).`,
    );
  }

  return parts.join(" ");
}

function parseHarnessContext(value: unknown): HarnessContextEnvelope | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const record = value as Record<string, unknown>;
  const source = record.source;
  if (source !== "approval" && source !== "escalation") {
    return null;
  }

  const layerRaw = record.layer;
  if (!layerRaw || typeof layerRaw !== "object") {
    return null;
  }
  const layerRecord = layerRaw as Record<string, unknown>;
  const layerIndex = layerRecord.index;
  const layerName = readString(layerRecord.name);
  if (
    typeof layerIndex !== "number"
    || !Number.isInteger(layerIndex)
    || layerIndex < 1
    || layerIndex > 4
    || !layerName
  ) {
    return null;
  }

  const handoffEdgeRaw = record.handoffEdge;
  let handoffEdge: HarnessContextHandoffEdge | null = null;
  if (handoffEdgeRaw && typeof handoffEdgeRaw === "object") {
    const handoffRecord = handoffEdgeRaw as Record<string, unknown>;
    const fromAgentId = readString(handoffRecord.fromAgentId);
    const toAgentId = readString(handoffRecord.toAgentId);
    const reason = readString(handoffRecord.reason);
    const summary = readString(handoffRecord.summary);
    const goal = readString(handoffRecord.goal);
    const timestamp = handoffRecord.timestamp;
    if (
      fromAgentId
      && toAgentId
      && reason
      && typeof timestamp === "number"
      && Number.isFinite(timestamp)
    ) {
      handoffEdge = {
        fromAgentId,
        toAgentId,
        reason,
        ...(summary ? { summary } : {}),
        ...(goal ? { goal } : {}),
        timestamp,
      };
    }
  }

  const toolsUsedRaw = record.toolsUsed;
  const toolsUsed = Array.isArray(toolsUsedRaw)
    ? toolsUsedRaw
      .map((tool) => (typeof tool === "string" ? tool.trim() : ""))
      .filter((tool): tool is string => tool.length > 0)
    : [];

  return {
    source,
    layer: {
      index: layerIndex as 1 | 2 | 3 | 4,
      name: layerName,
    },
    toolsUsed,
    handoffEdge,
  };
}

function readSessionId(value: unknown): Id<"agentSessions"> | undefined {
  return typeof value === "string" && value.length > 0
    ? (value as Id<"agentSessions">)
    : undefined;
}

function clamp(value: number): number {
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value);
}

function buildTimelineGroups(events: ControlCenterTimelineEvent[]): Array<{
  gate: EscalationGate;
  label: string;
  events: ControlCenterTimelineEvent[];
}> {
  const orderedGates: EscalationGate[] = [
    "pre_llm",
    "post_llm",
    "tool_failure",
    "not_applicable",
  ];
  const grouped = orderedGates.map((gate) => ({
    gate,
    label: timelineGateLabel(gate),
    events: events
      .filter((event) => event.escalationGate === gate)
      .sort((a, b) => b.occurredAt - a.occurredAt),
  }));
  return grouped;
}

function timelineGateLabel(gate: EscalationGate): string {
  if (gate === "pre_llm") return "Pre-LLM Checkpoints";
  if (gate === "post_llm") return "Post-LLM Checkpoints";
  if (gate === "tool_failure") return "Tool-Failure Checkpoints";
  return "Other Lifecycle Checkpoints";
}

function escalationGateTone(gate: EscalationGate): StatusPillTone {
  if (gate === "pre_llm") {
    return { background: "#fffbeb", border: "#f59e0b", color: "#92400e" };
  }
  if (gate === "post_llm") {
    return { background: "#eff6ff", border: "#2563eb", color: "#1d4ed8" };
  }
  if (gate === "tool_failure") {
    return { background: "#fef2f2", border: "#dc2626", color: "#991b1b" };
  }
  return { background: "#f8fafc", border: "#94a3b8", color: "#334155" };
}

function compactId(value: string): string {
  if (value.length <= 20) {
    return value;
  }
  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

function getEnabledEscalationTriggers(policy: AgentCustomProps["escalationPolicy"] | undefined): string[] {
  const configured = policy?.triggers;
  if (!configured) {
    return DEFAULT_ESCALATION_TRIGGER_NAMES;
  }

  return Object.entries(configured)
    .filter(([, trigger]) => trigger?.enabled !== false)
    .map(([trigger]) => humanizeText(trigger));
}

function humanizeText(value: string | undefined): string {
  if (!value) return "unknown";
  return value.replace(/_/g, " ").trim();
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
