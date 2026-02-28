"use client";

/**
 * Agent trust cockpit.
 * Consolidates drift, guardrails, approvals, escalations, and handoffs into one explainable view.
 */

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
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
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import type { AgentCustomProps } from "./types";
import { isPlatformManagedL2Soul } from "./platform-soul-scope";
import {
  deriveMemoryProvenanceEvidence,
  deriveRetrievalCitationEvidence,
} from "./intervention-evidence";
import {
  compactUnifiedCorrelationId,
  compareTimelineEventsDeterministically,
  resolveUnifiedTimelineMarkerLabel,
  resolveUnifiedTimelineMarkerType,
  type UnifiedTimelineMarkerType,
} from "@/lib/operator-collaboration-timeline";
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

interface ReceiptAgingDiagnostic {
  receiptId: Id<"agentInboxReceipts">;
  agentId: Id<"objects">;
  channel: string;
  externalContactIdentifier: string;
  status: string;
  turnId?: Id<"agentTurns">;
  idempotencyKey: string;
  ageMs: number;
  duplicateCount: number;
  firstSeenAt: number;
  lastSeenAt: number;
}

interface ReceiptDuplicateDiagnostic {
  receiptId: Id<"agentInboxReceipts">;
  agentId: Id<"objects">;
  channel: string;
  externalContactIdentifier: string;
  status: string;
  turnId?: Id<"agentTurns">;
  idempotencyKey: string;
  duplicateCount: number;
  firstSeenAt: number;
  lastSeenAt: number;
}

interface ReceiptStuckDiagnostic {
  receiptId: Id<"agentInboxReceipts">;
  agentId: Id<"objects">;
  channel: string;
  externalContactIdentifier: string;
  status: string;
  turnId?: Id<"agentTurns">;
  idempotencyKey: string;
  processingAgeMs: number;
  startedAt: number;
  duplicateCount: number;
  lastSeenAt: number;
}

interface ReplaySafeReceiptDebug {
  receiptId: Id<"agentInboxReceipts">;
  agentId: Id<"objects">;
  channel: string;
  externalContactIdentifier: string;
  status: string;
  turnId?: Id<"agentTurns">;
  idempotencyKey: string;
  duplicateCount: number;
  queueConcurrencyKey?: string;
  queueOrderingKey?: string;
  canReplay: boolean;
  replayMetadata: {
    replayOfReceiptId: Id<"agentInboxReceipts">;
    debugReplay: boolean;
    idempotencyKey: string;
  } | null;
}

type ReliabilityDiagnosticCategory = "stuck" | "aging" | "duplicate";

interface ReliabilityDiagnosticItem {
  receiptId: Id<"agentInboxReceipts">;
  category: ReliabilityDiagnosticCategory;
  status: string;
  channel: string;
  externalContactIdentifier: string;
  idempotencyKey: string;
  ageLabel: string;
  duplicateCount: number;
  observedAt: number;
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
  | "ingress"
  | "routing"
  | "execution"
  | "delivery"
  | "proposal"
  | "commit"
  | "tool"
  | "memory"
  | "soul"
  | "operator";

type EscalationGate = "pre_llm" | "post_llm" | "tool_failure" | "not_applicable";
type TimelinePipelineStage = "ingress" | "routing" | "execution" | "delivery";
type TimelineVisibilityScope = "org_owner" | "super_admin";
type TimelineThreadType = "group_thread" | "dm_thread" | "session_thread";

interface ControlCenterTimelineEvent {
  eventId: string;
  eventOrdinal: number;
  sessionId: string;
  turnId?: string;
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
  pipelineStage?: TimelinePipelineStage;
  threadType?: TimelineThreadType;
  lineageId?: string;
  groupThreadId?: string;
  dmThreadId?: string;
  workflowKey?: string;
  authorityIntentType?: string;
  correlationId: string;
  visibilityScope: TimelineVisibilityScope;
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

interface ControlCenterRouteIdentity {
  bindingId?: string;
  providerId?: string;
  providerConnectionId?: string;
  providerAccountId?: string;
  providerInstallationId?: string;
  providerProfileId?: string;
  providerProfileType?: "platform" | "organization";
  routeKey?: string;
}

interface ControlCenterThreadContext {
  sessionId: string;
  organizationId: string;
  channel: string;
  externalContactIdentifier: string;
  route: {
    sessionRoutingKey: string;
    routeIdentity?: ControlCenterRouteIdentity;
  };
  selectedAgent: {
    instanceAgentId: string;
    templateAgentId: string;
    roleLabel: string;
    displayName?: string;
    templateDisplayName?: string;
  };
  delivery: {
    lifecycleState: AgentLifecycleState;
    deliveryState: ThreadDeliveryState;
  };
  latestTurn?: {
    turnId: string;
    state?: string;
    updatedAt?: number;
    transitionPolicyVersion?: string;
    replayInvariantStatus?: string;
  };
}

interface ControlCenterThreadDrillDown {
  threadId: string;
  visibilityScope: TimelineVisibilityScope;
  context: ControlCenterThreadContext;
  timelineEvents: ControlCenterTimelineEvent[];
  lineage: AgentInstanceSummary[];
}

interface ModelFallbackAggregation {
  windowHours: number;
  since: number;
  actionsScanned: number;
  actionsWithModelResolution: number;
  fallbackCount: number;
  fallbackRate: number;
  fallbackReasons: Array<{ reason: string; count: number }>;
}

interface ToolSuccessFailureAggregation {
  windowHours: number;
  since: number;
  toolResultsScanned: number;
  successCount: number;
  failureCount: number;
  pendingCount: number;
  ignoredCount: number;
  successRate: number;
  failureRate: number;
  statusBreakdown: Array<{ status: string; count: number }>;
}

interface RetrievalAggregation {
  windowHours: number;
  since: number;
  messagesScanned: number;
  messagesWithRetrieval: number;
  avgDocsInjectedPerMessage: number;
  avgCitationsPerMessage: number;
  avgChunkCitationsPerMessage: number;
  fallbackRate: number;
  fallbackReasons: Array<{ reason: string; count: number }>;
  retrievalModes: Array<{ mode: string; count: number }>;
}

interface ToolScopingAuditAggregation {
  windowHours: number;
  since: number;
  totalMessages: number;
  auditedMessages: number;
  records: Array<{
    performedAt: number;
    sessionId?: string;
    policySource?: string;
    orgAllowListCount?: number;
    orgDenyListCount?: number;
    finalToolCount?: number;
    removedByOrgAllow?: number;
    removedByOrgDeny?: number;
    removedByIntegration?: number;
    finalToolNames?: string[];
  }>;
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

const RUNTIME_KPI_WINDOW_HOURS = 24;

export function AgentTrustCockpit({ agentId, sessionId, organizationId }: AgentTrustCockpitProps) {
  const { t } = useNamespaceTranslations("ui.agents.trust_cockpit");
  const tx = (
    key: string,
    fallback: string,
    params?: Record<string, string | number>
  ): string => {
    const translated = t(key, params);
    return translated === key ? fallback : translated;
  };
  const unsafeUseQuery = useQuery as unknown as (
    queryRef: unknown,
    args: unknown
  ) => unknown;
  // Avoid deep generated Convex type expansion for this query path.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const agent = unsafeUseQuery(apiAny.agentOntology.getAgent, { sessionId, agentId }) as any | undefined;
  const agentCustomProperties =
    (agent?.customProperties as Record<string, unknown> | undefined) ?? undefined;
  const isPlatformManagedSoul = isPlatformManagedL2Soul(agentCustomProperties);

  const standardSoulProposals = unsafeUseQuery(
    apiAny.ai.soulEvolution.getSoulProposals,
    agent
      ? (isPlatformManagedSoul
          ? "skip"
          : {
              sessionId,
              organizationId,
              agentId,
            })
      : "skip",
  ) as SoulProposal[] | undefined;
  const proposals = isPlatformManagedSoul ? [] : standardSoulProposals;

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
  const agingReceipts = unsafeUseQuery(apiAny.ai.agentSessions.getAgingReceipts, {
    sessionId,
    organizationId,
    agentId,
    minAgeMinutes: 15,
    limit: 12,
  }) as ReceiptAgingDiagnostic[] | undefined;
  const duplicateReceipts = unsafeUseQuery(apiAny.ai.agentSessions.getDuplicateReceipts, {
    sessionId,
    organizationId,
    agentId,
    minDuplicateCount: 1,
    limit: 12,
  }) as ReceiptDuplicateDiagnostic[] | undefined;
  const stuckReceipts = unsafeUseQuery(apiAny.ai.agentSessions.getStuckReceipts, {
    sessionId,
    organizationId,
    agentId,
    staleMinutes: 10,
    limit: 12,
  }) as ReceiptStuckDiagnostic[] | undefined;
  const modelFallbackRate = unsafeUseQuery(apiAny.ai.agentSessions.getModelFallbackRate, {
    sessionId,
    organizationId,
    agentId,
    hours: RUNTIME_KPI_WINDOW_HOURS,
  }) as ModelFallbackAggregation | undefined;
  const toolSuccessFailureRatio = unsafeUseQuery(
    apiAny.ai.agentSessions.getToolSuccessFailureRatio,
    {
      sessionId,
      organizationId,
      agentId,
      hours: RUNTIME_KPI_WINDOW_HOURS,
    },
  ) as ToolSuccessFailureAggregation | undefined;
  const retrievalTelemetry = unsafeUseQuery(apiAny.ai.agentSessions.getRetrievalTelemetry, {
    sessionId,
    organizationId,
    agentId,
    hours: RUNTIME_KPI_WINDOW_HOURS,
  }) as RetrievalAggregation | undefined;
  const toolScopingAudit = unsafeUseQuery(apiAny.ai.agentSessions.getToolScopingAudit, {
    sessionId,
    organizationId,
    agentId,
    hours: RUNTIME_KPI_WINDOW_HOURS,
    limit: 40,
  }) as ToolScopingAuditAggregation | undefined;

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
  const [selectedReliabilityReceiptId, setSelectedReliabilityReceiptId] = useState<Id<"agentInboxReceipts"> | null>(null);
  const [reliabilityActionMessage, setReliabilityActionMessage] = useState<string | null>(null);
  const [isRequestingReplay, setIsRequestingReplay] = useState(false);

  const approveAction = useMutation(apiAny.ai.agentApprovals.approveAction);
  const rejectAction = useMutation(apiAny.ai.agentApprovals.rejectAction);
  const takeOverEscalation = useMutation(apiAny.ai.escalation.takeOverEscalation);
  const dismissEscalation = useMutation(apiAny.ai.escalation.dismissEscalation);
  const resolveEscalation = useMutation(apiAny.ai.escalation.resolveEscalation);
  const requestReplaySafeReceipt = useMutation(apiAny.ai.agentSessions.requestReplaySafeReceipt);

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
  const selectedReliabilityReceiptDebug = useQuery(
    apiAny.ai.agentSessions.getReplaySafeReceiptDebug,
    selectedReliabilityReceiptId
      ? {
        sessionId,
        organizationId,
        receiptId: selectedReliabilityReceiptId,
      }
      : "skip"
  ) as ReplaySafeReceiptDebug | null | undefined;

  const props = (agent?.customProperties || {}) as AgentCustomProps;
  const agentDisplayName = useMemo(() => {
    const customProperties = (agent?.customProperties || {}) as Record<string, unknown>;
    const customName = readString(customProperties.displayName);
    const defaultName = readString((agent as { name?: unknown } | undefined)?.name);
    return customName || defaultName || compactId(String(agentId));
  }, [agent, agentId]);
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

  const reliabilityDiagnostics = useMemo<ReliabilityDiagnosticItem[]>(() => {
    const rows: ReliabilityDiagnosticItem[] = [];
    for (const receipt of stuckReceipts || []) {
      rows.push({
        receiptId: receipt.receiptId,
        category: "stuck",
        status: receipt.status,
        channel: receipt.channel,
        externalContactIdentifier: receipt.externalContactIdentifier,
        idempotencyKey: receipt.idempotencyKey,
        ageLabel: formatDurationMs(receipt.processingAgeMs),
        duplicateCount: receipt.duplicateCount,
        observedAt: receipt.lastSeenAt,
      });
    }
    for (const receipt of agingReceipts || []) {
      rows.push({
        receiptId: receipt.receiptId,
        category: "aging",
        status: receipt.status,
        channel: receipt.channel,
        externalContactIdentifier: receipt.externalContactIdentifier,
        idempotencyKey: receipt.idempotencyKey,
        ageLabel: formatDurationMs(receipt.ageMs),
        duplicateCount: receipt.duplicateCount,
        observedAt: receipt.lastSeenAt,
      });
    }
    for (const receipt of duplicateReceipts || []) {
      rows.push({
        receiptId: receipt.receiptId,
        category: "duplicate",
        status: receipt.status,
        channel: receipt.channel,
        externalContactIdentifier: receipt.externalContactIdentifier,
        idempotencyKey: receipt.idempotencyKey,
        ageLabel: `x${receipt.duplicateCount}`,
        duplicateCount: receipt.duplicateCount,
        observedAt: receipt.lastSeenAt,
      });
    }
    rows.sort((a, b) => {
      const categoryDiff =
        reliabilityCategoryRank(a.category) - reliabilityCategoryRank(b.category);
      if (categoryDiff !== 0) {
        return categoryDiff;
      }
      return b.observedAt - a.observedAt;
    });
    const uniqueByReceipt = new Map<string, ReliabilityDiagnosticItem>();
    for (const row of rows) {
      if (!uniqueByReceipt.has(row.receiptId)) {
        uniqueByReceipt.set(row.receiptId, row);
      }
    }
    return Array.from(uniqueByReceipt.values()).slice(0, 10);
  }, [agingReceipts, duplicateReceipts, stuckReceipts]);

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
    if (reliabilityDiagnostics.length === 0) {
      if (selectedReliabilityReceiptId !== null) {
        setSelectedReliabilityReceiptId(null);
      }
      return;
    }

    if (
      !selectedReliabilityReceiptId
      || !reliabilityDiagnostics.some((item) => item.receiptId === selectedReliabilityReceiptId)
    ) {
      setSelectedReliabilityReceiptId(reliabilityDiagnostics[0].receiptId);
    }
  }, [reliabilityDiagnostics, selectedReliabilityReceiptId]);

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
  const toolScopingSummary = useMemo(() => {
    const records = toolScopingAudit?.records || [];
    if (records.length === 0) {
      return {
        averageFinalToolCount: 0,
        policySource: "n/a",
        removedByPolicy: 0,
        removedByIntegration: 0,
      };
    }

    let finalToolCountTotal = 0;
    let finalToolCountSamples = 0;
    let removedByPolicy = 0;
    let removedByIntegration = 0;
    const policySourceCounts = new Map<string, number>();

    for (const record of records) {
      if (typeof record.finalToolCount === "number") {
        finalToolCountTotal += record.finalToolCount;
        finalToolCountSamples += 1;
      }
      removedByPolicy += (record.removedByOrgAllow || 0) + (record.removedByOrgDeny || 0);
      removedByIntegration += record.removedByIntegration || 0;
      if (record.policySource) {
        policySourceCounts.set(
          record.policySource,
          (policySourceCounts.get(record.policySource) || 0) + 1,
        );
      }
    }

    const topPolicySource = Array.from(policySourceCounts.entries()).sort((a, b) => b[1] - a[1])[0];
    return {
      averageFinalToolCount:
        finalToolCountSamples > 0
          ? Number((finalToolCountTotal / finalToolCountSamples).toFixed(2))
          : 0,
      policySource: topPolicySource?.[0] || "n/a",
      removedByPolicy,
      removedByIntegration,
    };
  }, [toolScopingAudit]);
  const runtimeWindowHours =
    modelFallbackRate?.windowHours
    || toolSuccessFailureRatio?.windowHours
    || retrievalTelemetry?.windowHours
    || toolScopingAudit?.windowHours
    || RUNTIME_KPI_WINDOW_HOURS;
  const runtimeSince =
    modelFallbackRate?.since
    || toolSuccessFailureRatio?.since
    || retrievalTelemetry?.since
    || toolScopingAudit?.since
    || (Date.now() - runtimeWindowHours * 60 * 60 * 1000);
  const runtimeScopeLabel = `Agent ${agentDisplayName} · organization scope`;

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

  const handleRequestReplay = async () => {
    if (!selectedReliabilityReceiptId) return;
    setIsRequestingReplay(true);
    setReliabilityActionMessage(null);
    try {
      const result = await requestReplaySafeReceipt({
        sessionId,
        organizationId,
        receiptId: selectedReliabilityReceiptId,
        reason: "agent_ops_receipt_reliability_panel",
      }) as {
        accepted: boolean;
        reason: string;
        replayMetadata?: { idempotencyKey?: string } | null;
      };
      if (result.accepted) {
        const replayKey = result.replayMetadata?.idempotencyKey || "generated";
        setReliabilityActionMessage(`Replay intent queued (${replayKey}).`);
      } else {
        setReliabilityActionMessage(`Replay not queued: ${humanizeText(result.reason)}.`);
      }
    } catch (error) {
      setReliabilityActionMessage(
        error instanceof Error ? error.message : "Replay request failed."
      );
    } finally {
      setIsRequestingReplay(false);
    }
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
    || !agingReceipts
    || !duplicateReceipts
    || !stuckReceipts
  ) {
    return (
      <div className="p-4 text-xs" style={{ color: "var(--window-document-text)" }}>
        {tx("loading", "Loading trust cockpit...")}
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
        <Card title={tx("cards.trust_health.title", "Trust Health")}>
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
            <MetricLine label={tx("cards.trust_health.pending_escalations", "Pending escalations")} value={String(pendingEscalations)} />
            <MetricLine label={tx("cards.trust_health.waiting_on_human_threads", "Threads waiting on human")} value={String(waitingOnHumanThreads)} />
            <MetricLine label={tx("cards.trust_health.pending_approvals", "Pending approvals")} value={String(pendingApprovals)} />
            <MetricLine label={tx("cards.trust_health.pending_soul_proposals", "Pending soul proposals")} value={String(pendingProposals)} />
          </div>
        </Card>

        <Card title={tx("cards.immediate_actions.title", "Immediate Actions")}>
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

        <Card title={tx("cards.guardrail_map.title", "Guardrail Map")}>
          <div className="space-y-1.5 text-[11px]" style={{ color: "var(--window-document-text)" }}>
            <MetricLine
              label={tx("cards.guardrail_map.autonomy", "Autonomy")}
              value={humanizeText(props.autonomyLevel || "supervised")}
            />
            <MetricLine label={tx("cards.guardrail_map.blocked_topics", "Blocked topics")} value={String(blockedTopics.length)} />
            <MetricLine label={tx("cards.guardrail_map.approval_only_tools", "Approval-only tools")} value={String(approvalScopedTools.length)} />
            <MetricLine label={tx("cards.guardrail_map.disabled_tools", "Disabled tools")} value={String(disabledTools.length)} />
            <MetricLine label={tx("cards.guardrail_map.never_do_rules", "Never-do rules")} value={String(neverDo.length)} />
            <MetricLine label={tx("cards.guardrail_map.escalation_triggers", "Escalation triggers")} value={String(enabledEscalationTriggers.length)} />
          </div>
          {blockedTopics.length > 0 && (
            <p className="mt-2 text-[10px]" style={{ color: "var(--neutral-gray)" }}>
              {tx("cards.guardrail_map.blocked_topics_prefix", "Blocked topics:")}{" "}
              {blockedTopics.slice(0, 3).join(", ")}
              {blockedTopics.length > 3 ? "..." : ""}
            </p>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <Card title={tx("cards.drift_signals.title", "Drift Signals")}>
          <div className="space-y-1 text-[11px]" style={{ color: "var(--window-document-text)" }}>
            <MetricLine label={tx("cards.drift_signals.proposals_with_telemetry", "Proposals with drift telemetry")} value={String(driftProposals.length)} />
            <MetricLine label={tx("cards.drift_signals.avg_overall_drift", "Avg overall drift")} value={avgDrift.toFixed(2)} />
            <MetricLine label={tx("cards.drift_signals.max_overall_drift", "Max overall drift")} value={highestDrift.toFixed(2)} />
            <MetricLine label={tx("cards.drift_signals.high_drift_pending", "High-drift proposals pending")} value={String(highDriftPending)} />
            <MetricLine label={tx("cards.drift_signals.pending_alignment", "Pending alignment proposals")} value={String(pendingAlignmentProposals)} />
          </div>
          {latestDriftProposal && (
            <p className="mt-2 text-[10px]" style={{ color: "var(--neutral-gray)" }}>
              {tx("cards.drift_signals.latest_summary", "Latest drift summary")} ({timeAgo(latestDriftProposal.createdAt)}):{" "}
              {latestDriftProposal.driftSummary || tx("cards.drift_signals.no_summary", "No summary provided.")}
            </p>
          )}
        </Card>

        <Card title={tx("cards.approval_escalation_narrative.title", "Approval + Escalation Narrative")}>
          <div className="space-y-1 text-[11px]" style={{ color: "var(--window-document-text)" }}>
            <MetricLine label={tx("cards.approval_escalation_narrative.active_escalations", "Active escalations")} value={String(pendingEscalations + takenOverEscalations)} />
            <MetricLine label={tx("cards.approval_escalation_narrative.takeover_rate", "Takeover rate (30d)")} value={`${escalationMetrics.takeoverRate}%`} />
            <MetricLine label={tx("cards.approval_escalation_narrative.resolution_rate", "Resolution rate (30d)")} value={`${escalationMetrics.resolutionRate}%`} />
            <MetricLine label={tx("cards.approval_escalation_narrative.false_positive_rate", "False-positive rate (30d)")} value={`${escalationMetrics.falsePositiveRate}%`} />
            <MetricLine label={tx("cards.approval_escalation_narrative.team_handoffs", "Team handoffs tracked")} value={String(teamHandoffs.length)} />
          </div>
          <p className="mt-2 text-[10px]" style={{ color: "var(--neutral-gray)" }}>
            {tx("cards.approval_escalation_narrative.last_days_prefix", "Last")} {escalationMetrics.periodDays}{" "}
            {tx("cards.approval_escalation_narrative.days_label", "days:")} {escalationMetrics.totalEscalations}{" "}
            {tx("cards.approval_escalation_narrative.escalation_singular", "escalation")}
            {escalationMetrics.totalEscalations === 1 ? "" : tx("cards.approval_escalation_narrative.plural_suffix", "s")}.
          </p>
        </Card>

        <Card title={tx("cards.receipt_reliability.title", "Receipt Reliability")}>
          <div className="space-y-1 text-xs" style={{ color: "var(--window-document-text)" }}>
            <MetricLine label={tx("cards.receipt_reliability.aging_receipts", "Aging receipts (>=15m)")} value={String(agingReceipts.length)} />
            <MetricLine label={tx("cards.receipt_reliability.duplicate_receipts", "Duplicate receipts")} value={String(duplicateReceipts.length)} />
            <MetricLine label={tx("cards.receipt_reliability.stuck_receipts", "Stuck receipts (>=10m)")} value={String(stuckReceipts.length)} />
          </div>

          {reliabilityDiagnostics.length === 0 ? (
            <p className="mt-2 text-xs" style={{ color: "var(--neutral-gray)" }}>
              {tx("cards.receipt_reliability.empty", "No receipt reliability issues detected in this org scope.")}
            </p>
          ) : (
            <div className="mt-2 space-y-1.5">
              {reliabilityDiagnostics.map((item) => (
                <button
                  key={item.receiptId}
                  onClick={() => {
                    setSelectedReliabilityReceiptId(item.receiptId);
                    setReliabilityActionMessage(null);
                  }}
                  className="w-full border p-2 text-left"
                  style={{
                    borderColor: "var(--window-document-border)",
                    borderLeft: `var(--border-thick) solid ${
                      selectedReliabilityReceiptId === item.receiptId
                        ? "var(--tone-info)"
                        : item.category === "stuck"
                          ? "var(--tone-danger)"
                          : item.category === "aging"
                            ? "var(--tone-warning)"
                            : "var(--tone-success)"
                    }`,
                    background:
                      selectedReliabilityReceiptId === item.receiptId
                        ? "var(--desktop-shell-accent)"
                        : "var(--window-document-card-bg, var(--window-document-bg))",
                  }}
                >
                  <div className="text-xs font-medium" style={{ color: "var(--window-document-text)" }}>
                    {humanizeText(item.category)} · {item.channel}
                  </div>
                  <div className="mt-0.5 text-xs" style={{ color: "var(--neutral-gray)" }}>
                    {item.externalContactIdentifier}
                  </div>
                  <div className="mt-1 text-xs" style={{ color: "var(--neutral-gray)" }}>
                    {item.category === "duplicate"
                      ? tx("cards.receipt_reliability.duplicates_age", "Duplicates {{ageLabel}}", {
                        ageLabel: item.ageLabel,
                      })
                      : tx("cards.receipt_reliability.age", "Age {{ageLabel}}", {
                        ageLabel: item.ageLabel,
                      })}{" "}
                    · {tx("cards.receipt_reliability.status", "status")} {item.status}
                  </div>
                </button>
              ))}
            </div>
          )}

          <div
            className="mt-2 border p-2"
            style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-panel-bg, var(--window-document-bg))" }}
          >
            {!selectedReliabilityReceiptId && (
              <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                {tx("cards.receipt_reliability.select_receipt", "Select a diagnostic receipt to inspect replay-safe pointers.")}
              </div>
            )}
            {selectedReliabilityReceiptId && selectedReliabilityReceiptDebug === undefined && (
              <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                {tx("cards.receipt_reliability.loading_pointer", "Loading replay-safe pointer...")}
              </div>
            )}
            {selectedReliabilityReceiptId && selectedReliabilityReceiptDebug === null && (
              <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                {tx("cards.receipt_reliability.pointer_unavailable", "Receipt pointer is unavailable for this selection.")}
              </div>
            )}
            {selectedReliabilityReceiptDebug && (
              <div className="space-y-1">
                <MetricLine label={tx("cards.receipt_reliability.status_label", "Status")} value={selectedReliabilityReceiptDebug.status} />
                <MetricLine
                  label={tx("cards.receipt_reliability.can_replay", "Can replay")}
                  value={selectedReliabilityReceiptDebug.canReplay ? "Yes" : "No"}
                />
                <MetricLine
                  label={tx("cards.receipt_reliability.idempotency", "Idempotency")}
                  value={compactId(selectedReliabilityReceiptDebug.idempotencyKey)}
                />
                <MetricLine
                  label={tx("cards.receipt_reliability.concurrency_key", "Concurrency key")}
                  value={selectedReliabilityReceiptDebug.queueConcurrencyKey || "n/a"}
                />
                <MetricLine
                  label={tx("cards.receipt_reliability.ordering_key", "Ordering key")}
                  value={selectedReliabilityReceiptDebug.queueOrderingKey || "n/a"}
                />
                {selectedReliabilityReceiptDebug.canReplay && (
                  <button
                    onClick={() => { void handleRequestReplay(); }}
                    disabled={isRequestingReplay}
                    className="mt-1 border px-2 py-1 text-xs disabled:opacity-60"
                    style={{ borderColor: "var(--window-document-border)" }}
                  >
                    {isRequestingReplay
                      ? tx("cards.receipt_reliability.queueing_replay", "Queueing replay...")
                      : tx("cards.receipt_reliability.queue_replay_intent", "Queue Replay Intent")}
                  </button>
                )}
              </div>
            )}
            {reliabilityActionMessage && (
              <div className="mt-2 text-xs" style={{ color: "var(--neutral-gray)" }}>
                {reliabilityActionMessage}
              </div>
            )}
          </div>
        </Card>
      </div>

      <Card title={tx("cards.runtime_kpis.title", "Runtime KPIs")}>
        <div className="mb-2 text-xs" style={{ color: "var(--neutral-gray)" }}>
          {tx("cards.runtime_kpis.scope", "Scope:")} {runtimeScopeLabel}{" "}
          · {tx("cards.runtime_kpis.period_last", "Period: last")} {runtimeWindowHours}
          {tx("cards.runtime_kpis.hours_suffix", "h since")} {formatDateTime(runtimeSince)}
        </div>
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          <div
            className="border p-2.5"
            style={{
              borderColor: "var(--window-document-border)",
              background: "var(--window-document-panel-bg, var(--window-document-bg))",
            }}
          >
            <div className="text-xs font-medium" style={{ color: "var(--window-document-text)" }}>
              {tx("cards.runtime_kpis.model_fallback", "Model fallback")}
            </div>
            {!modelFallbackRate && (
              <div className="mt-1 text-xs" style={{ color: "var(--neutral-gray)" }}>
                {tx("cards.runtime_kpis.loading_fallback", "Loading fallback telemetry...")}
              </div>
            )}
            {modelFallbackRate && (
              <div className="mt-1 space-y-1 text-xs" style={{ color: "var(--window-document-text)" }}>
                <MetricLine label={tx("cards.runtime_kpis.fallback_rate", "Fallback rate")} value={formatRatePercent(modelFallbackRate.fallbackRate)} />
                <MetricLine
                  label={tx("cards.runtime_kpis.fallback_count", "Fallback count")}
                  value={`${modelFallbackRate.fallbackCount}/${modelFallbackRate.actionsWithModelResolution}`}
                />
                <MetricLine
                  label={tx("cards.runtime_kpis.coverage", "Coverage")}
                  value={formatCountRatio(
                    modelFallbackRate.actionsWithModelResolution,
                    modelFallbackRate.actionsScanned,
                  )}
                />
                <MetricLine
                  label={tx("cards.runtime_kpis.top_reason", "Top reason")}
                  value={modelFallbackRate.fallbackReasons[0]
                    ? `${humanizeText(modelFallbackRate.fallbackReasons[0].reason)} (${modelFallbackRate.fallbackReasons[0].count})`
                    : "none"}
                />
              </div>
            )}
          </div>

          <div
            className="border p-2.5"
            style={{
              borderColor: "var(--window-document-border)",
              background: "var(--window-document-panel-bg, var(--window-document-bg))",
            }}
          >
            <div className="text-xs font-medium" style={{ color: "var(--window-document-text)" }}>
              {tx("cards.runtime_kpis.tool_success_ratio", "Tool success ratio")}
            </div>
            {!toolSuccessFailureRatio && (
              <div className="mt-1 text-xs" style={{ color: "var(--neutral-gray)" }}>
                {tx("cards.runtime_kpis.loading_tool_telemetry", "Loading tool telemetry...")}
              </div>
            )}
            {toolSuccessFailureRatio && (
              <div className="mt-1 space-y-1 text-xs" style={{ color: "var(--window-document-text)" }}>
                <MetricLine label={tx("cards.runtime_kpis.success_rate", "Success rate")} value={formatRatePercent(toolSuccessFailureRatio.successRate)} />
                <MetricLine label={tx("cards.runtime_kpis.failure_rate", "Failure rate")} value={formatRatePercent(toolSuccessFailureRatio.failureRate)} />
                <MetricLine
                  label={tx("cards.runtime_kpis.scanned_outcomes", "Scanned outcomes")}
                  value={String(toolSuccessFailureRatio.toolResultsScanned)}
                />
                <MetricLine
                  label={tx("cards.runtime_kpis.pending_outcomes", "Pending outcomes")}
                  value={String(toolSuccessFailureRatio.pendingCount)}
                />
                <MetricLine
                  label={tx("cards.runtime_kpis.top_status", "Top status")}
                  value={toolSuccessFailureRatio.statusBreakdown[0]
                    ? `${humanizeText(toolSuccessFailureRatio.statusBreakdown[0].status)} (${toolSuccessFailureRatio.statusBreakdown[0].count})`
                    : "none"}
                />
              </div>
            )}
          </div>

          <div
            className="border p-2.5"
            style={{
              borderColor: "var(--window-document-border)",
              background: "var(--window-document-panel-bg, var(--window-document-bg))",
            }}
          >
            <div className="text-xs font-medium" style={{ color: "var(--window-document-text)" }}>
              {tx("cards.runtime_kpis.retrieval_quality", "Retrieval quality")}
            </div>
            {!retrievalTelemetry && (
              <div className="mt-1 text-xs" style={{ color: "var(--neutral-gray)" }}>
                {tx("cards.runtime_kpis.loading_retrieval_telemetry", "Loading retrieval telemetry...")}
              </div>
            )}
            {retrievalTelemetry && (
              <div className="mt-1 space-y-1 text-xs" style={{ color: "var(--window-document-text)" }}>
                <MetricLine label={tx("cards.runtime_kpis.retrieval_fallback_rate", "Fallback rate")} value={formatRatePercent(retrievalTelemetry.fallbackRate)} />
                <MetricLine
                  label={tx("cards.runtime_kpis.avg_citations_per_message", "Avg citations/msg")}
                  value={retrievalTelemetry.avgCitationsPerMessage.toFixed(2)}
                />
                <MetricLine
                  label={tx("cards.runtime_kpis.avg_chunk_citations_per_message", "Avg chunk citations/msg")}
                  value={retrievalTelemetry.avgChunkCitationsPerMessage.toFixed(2)}
                />
                <MetricLine
                  label={tx("cards.runtime_kpis.messages_with_retrieval", "Messages with retrieval")}
                  value={formatCountRatio(
                    retrievalTelemetry.messagesWithRetrieval,
                    retrievalTelemetry.messagesScanned,
                  )}
                />
                <MetricLine
                  label={tx("cards.runtime_kpis.top_mode", "Top mode")}
                  value={retrievalTelemetry.retrievalModes[0]
                    ? `${humanizeText(retrievalTelemetry.retrievalModes[0].mode)} (${retrievalTelemetry.retrievalModes[0].count})`
                    : "none"}
                />
              </div>
            )}
          </div>

          <div
            className="border p-2.5"
            style={{
              borderColor: "var(--window-document-border)",
              background: "var(--window-document-panel-bg, var(--window-document-bg))",
            }}
          >
            <div className="text-xs font-medium" style={{ color: "var(--window-document-text)" }}>
              {tx("cards.runtime_kpis.tool_scoping_audit", "Tool scoping audit")}
            </div>
            {!toolScopingAudit && (
              <div className="mt-1 text-xs" style={{ color: "var(--neutral-gray)" }}>
                {tx("cards.runtime_kpis.loading_scoping_audit", "Loading scoping audit...")}
              </div>
            )}
            {toolScopingAudit && (
              <div className="mt-1 space-y-1 text-xs" style={{ color: "var(--window-document-text)" }}>
                <MetricLine
                  label={tx("cards.runtime_kpis.audit_coverage", "Audit coverage")}
                  value={formatCountRatio(toolScopingAudit.auditedMessages, toolScopingAudit.totalMessages)}
                />
                <MetricLine
                  label={tx("cards.runtime_kpis.avg_final_tool_count", "Avg final tool count")}
                  value={toolScopingSummary.averageFinalToolCount.toFixed(2)}
                />
                <MetricLine
                  label={tx("cards.runtime_kpis.policy_source", "Policy source")}
                  value={humanizeText(toolScopingSummary.policySource)}
                />
                <MetricLine
                  label={tx("cards.runtime_kpis.removed_by_policy", "Removed by policy")}
                  value={String(toolScopingSummary.removedByPolicy)}
                />
                <MetricLine
                  label={tx("cards.runtime_kpis.removed_by_integration", "Removed by integration")}
                  value={String(toolScopingSummary.removedByIntegration)}
                />
              </div>
            )}
          </div>
        </div>
      </Card>

      <Card title={tx("cards.thread_queue.title", "Thread Queue")}>
        {sortedThreadRows.length === 0 && (
          <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
            {tx("cards.thread_queue.empty", "No active threads mapped to this agent.")}
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
                  label={tx("cards.thread_queue.lifecycle", "Lifecycle: {{state}}", {
                    state: threadRow.lifecycleState,
                  })}
                  tone={lifecycleBadgeTone(threadRow.lifecycleState)}
                />
                <StatusPill
                  label={tx("cards.thread_queue.delivery", "Delivery: {{state}}", {
                    state: threadRow.deliveryState,
                  })}
                  tone={deliveryBadgeTone(threadRow.deliveryState)}
                />
                {threadRow.escalationCountOpen > 0 && (
                  <StatusPill
                    label={tx(
                      "cards.thread_queue.escalations",
                      "Escalations: {{count}}{{urgency}}",
                      {
                        count: threadRow.escalationCountOpen,
                        urgency: threadRow.escalationUrgency
                          ? ` (${humanizeText(threadRow.escalationUrgency)})`
                          : "",
                      }
                    )}
                    tone={{ background: "#fef3c7", border: "#f59e0b", color: "#92400e" }}
                  />
                )}
                <StatusPill
                  label={tx("cards.thread_queue.active_instances", "Active instances: {{count}}", {
                    count: threadRow.activeInstanceCount,
                  })}
                  tone={{ background: "#e2e8f0", border: "#94a3b8", color: "#334155" }}
                />
                {threadRow.waitingOnHuman && (
                  <StatusPill
                    label={tx("cards.thread_queue.waiting_on_human", "Waiting on human")}
                    tone={{ background: "#fee2e2", border: "#dc2626", color: "#991b1b" }}
                  />
                )}
              </div>
            </button>
          ))}
        </div>
      </Card>

      <Card title={tx("cards.instance_lineage.title", "Instance Lineage Drill-Down")}>
        {!selectedThreadRow && (
          <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
            {tx("cards.instance_lineage.select_thread", "Select a thread to inspect instance lineage.")}
          </div>
        )}

        {selectedThreadRow && lineageLoading && (
          <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
            {tx("cards.instance_lineage.loading", "Loading lineage...")}
          </div>
        )}

        {selectedThreadRow && !lineageLoading && threadLineage.length === 0 && (
          <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
            {tx("cards.instance_lineage.empty", "No instance lineage is available for this thread yet.")}
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
                {tx("cards.instance_lineage.instances", "Instances")} ({threadLineage.length})
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
                      {instance.active ? ` · ${tx("cards.instance_lineage.active", "Active")}` : ""}
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
                  {tx("cards.instance_lineage.select_instance", "Select an instance to inspect lineage metadata.")}
                </div>
              )}

              {selectedLineageInstance && (
                <div className="space-y-2 text-[11px]" style={{ color: "var(--window-document-text)" }}>
                  <div className="font-medium">
                    {selectedLineageInstance.displayName || compactId(selectedLineageInstance.instanceAgentId)}
                  </div>
                  <MetricLine label={tx("cards.instance_lineage.role", "Role")} value={selectedLineageInstance.roleLabel} />
                  <MetricLine label={tx("cards.instance_lineage.active_label", "Active")} value={selectedLineageInstance.active ? "Yes" : "No"} />
                  <MetricLine label={tx("cards.instance_lineage.spawned", "Spawned")} value={formatDateTime(selectedLineageInstance.spawnedAt)} />
                  <MetricLine
                    label={tx("cards.instance_lineage.template", "Template")}
                    value={compactId(selectedLineageInstance.templateAgentId)}
                  />
                  <MetricLine
                    label={tx("cards.instance_lineage.parent", "Parent")}
                    value={selectedLineageInstance.parentInstanceAgentId
                      ? compactId(selectedLineageInstance.parentInstanceAgentId)
                      : "Root"}
                  />
                  {selectedLineageInstance.handoffReason && (
                    <div className="text-[10px]" style={{ color: "var(--neutral-gray)" }}>
                      {tx("cards.instance_lineage.handoff_reason", "Handoff reason:")} {selectedLineageInstance.handoffReason}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </Card>

      <Card title={tx("cards.intervention_drilldown.title", "Intervention Drill-Down")}>
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[280px,1fr]">
          <div
            className="border p-2"
            style={{
              borderColor: "var(--window-document-border)",
              background: "var(--window-document-panel-bg, #fff)",
            }}
          >
            <div className="mb-2 text-[11px] font-medium" style={{ color: "var(--window-document-text)" }}>
              {tx("cards.intervention_drilldown.queue", "Queue")} ({interventionQueue.length})
            </div>
            {interventionQueue.length === 0 && (
              <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                {tx("cards.intervention_drilldown.empty", "No active interventions. Pending items will appear here.")}
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
                {tx("cards.intervention_drilldown.select_queue_item", "Select a queue item to inspect blocker context and take action.")}
              </div>
            )}

            {selectedIntervention && (
              <>
                <div
                  className="border p-3"
                  style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-panel-bg, #fff)" }}
                >
                  <div className="text-[11px] font-medium" style={{ color: "var(--window-document-text)" }}>
                    {tx("cards.intervention_drilldown.blocker_reason", "Blocker Reason")}
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
                      {tx("cards.intervention_drilldown.harness_context", "Harness Context")}
                    </div>
                    <div className="space-y-1 text-[11px]" style={{ color: "var(--window-document-text)" }}>
                      <MetricLine
                        label={tx("cards.intervention_drilldown.layer", "Layer")}
                        value={`${selectedIntervention.harnessContext.layer.name} (L${selectedIntervention.harnessContext.layer.index})`}
                      />
                      <MetricLine
                        label={tx("cards.intervention_drilldown.tools_used", "Tools used")}
                        value={
                          selectedIntervention.harnessContext.toolsUsed.length > 0
                            ? selectedIntervention.harnessContext.toolsUsed.join(", ")
                            : "none captured"
                        }
                      />
                      <MetricLine
                        label={tx("cards.intervention_drilldown.handoff_edge", "Handoff edge")}
                        value={
                          selectedIntervention.harnessContext.handoffEdge
                            ? `${compactId(selectedIntervention.harnessContext.handoffEdge.fromAgentId)} -> ${compactId(selectedIntervention.harnessContext.handoffEdge.toAgentId)}`
                            : "none captured"
                        }
                      />
                    </div>
                    {selectedIntervention.harnessContext.handoffEdge && (
                      <div className="mt-2 space-y-1 text-[10px]" style={{ color: "var(--neutral-gray)" }}>
                        <div>{tx("cards.intervention_drilldown.reason", "Reason:")} {selectedIntervention.harnessContext.handoffEdge.reason}</div>
                        {selectedIntervention.harnessContext.handoffEdge.summary && (
                          <div>{tx("cards.intervention_drilldown.summary", "Summary:")} {selectedIntervention.harnessContext.handoffEdge.summary}</div>
                        )}
                        {selectedIntervention.harnessContext.handoffEdge.goal && (
                          <div>{tx("cards.intervention_drilldown.goal", "Goal:")} {selectedIntervention.harnessContext.handoffEdge.goal}</div>
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
                      {tx("cards.intervention_drilldown.memory_provenance", "Memory Provenance")}
                    </div>
                    {!selectedIntervention.sessionId && (
                      <div className="text-[10px]" style={{ color: "var(--neutral-gray)" }}>
                        {tx("cards.intervention_drilldown.no_session_context_escalation", "No session context attached to this escalation.")}
                      </div>
                    )}
                    {selectedIntervention.sessionId && selectedInterventionDrillDown === undefined && (
                      <div className="text-[10px]" style={{ color: "var(--neutral-gray)" }}>
                        {tx("cards.intervention_drilldown.loading_memory_provenance", "Loading memory provenance...")}
                      </div>
                    )}
                    {selectedIntervention.sessionId
                      && selectedInterventionDrillDown
                      && !memoryProvenanceEvidence && (
                      <div className="text-[10px]" style={{ color: "var(--neutral-gray)" }}>
                        {tx("cards.intervention_drilldown.no_memory_provenance", "No memory consent/provenance checkpoints captured for this session.")}
                      </div>
                    )}
                    {memoryProvenanceEvidence && (
                      <>
                        <div className="space-y-1 text-[11px]" style={{ color: "var(--window-document-text)" }}>
                          <MetricLine label={tx("cards.intervention_drilldown.consent_scope", "Consent scope")} value={humanizeText(memoryProvenanceEvidence.consentScope)} />
                          <MetricLine label={tx("cards.intervention_drilldown.consent_decision", "Consent decision")} value={humanizeText(memoryProvenanceEvidence.consentDecision)} />
                          <MetricLine label={tx("cards.intervention_drilldown.candidate_count", "Candidate count")} value={String(memoryProvenanceEvidence.memoryCandidateIds.length)} />
                          <MetricLine label={tx("cards.intervention_drilldown.checkpoint_events", "Checkpoint events")} value={String(memoryProvenanceEvidence.eventCount)} />
                          <MetricLine
                            label={tx("cards.intervention_drilldown.blocked_without_consent", "Blocked without consent")}
                            value={memoryProvenanceEvidence.blockedNoConsent ? "Yes" : "No"}
                          />
                        </div>
                        <div className="mt-2 text-[10px]" style={{ color: "var(--neutral-gray)" }}>
                          {tx("cards.intervention_drilldown.latest_checkpoint", "Latest checkpoint:")}{" "}
                          {humanizeText(memoryProvenanceEvidence.eventName)} ({formatDateTime(memoryProvenanceEvidence.occurredAt)})
                        </div>
                        {memoryProvenanceEvidence.consentPromptVersion && (
                          <div className="mt-1 text-[10px]" style={{ color: "var(--neutral-gray)" }}>
                            {tx("cards.intervention_drilldown.prompt_version", "Prompt version:")} {memoryProvenanceEvidence.consentPromptVersion}
                          </div>
                        )}
                        {memoryProvenanceEvidence.memoryCandidateIds.length > 0 && (
                          <div className="mt-2">
                            <div className="text-[10px] font-medium" style={{ color: "var(--window-document-text)" }}>
                              {tx("cards.intervention_drilldown.candidate_attribution", "Candidate attribution")}
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
                      {tx("cards.intervention_drilldown.retrieval_citation_provenance", "Retrieval Citation Provenance")}
                    </div>
                    {!selectedIntervention.sessionId && (
                      <div className="text-[10px]" style={{ color: "var(--neutral-gray)" }}>
                        {tx("cards.intervention_drilldown.no_session_context_escalation", "No session context attached to this escalation.")}
                      </div>
                    )}
                    {selectedIntervention.sessionId && selectedInterventionDrillDown === undefined && (
                      <div className="text-[10px]" style={{ color: "var(--neutral-gray)" }}>
                        {tx("cards.intervention_drilldown.loading_retrieval_provenance", "Loading retrieval provenance...")}
                      </div>
                    )}
                    {selectedIntervention.sessionId
                      && selectedInterventionDrillDown
                      && !retrievalCitationEvidence && (
                      <div className="text-[10px]" style={{ color: "var(--neutral-gray)" }}>
                        {tx("cards.intervention_drilldown.no_retrieval_provenance", "No retrieval citation telemetry captured for this session.")}
                      </div>
                    )}
                    {retrievalCitationEvidence && (
                      <>
                        <div className="space-y-1 text-[11px]" style={{ color: "var(--window-document-text)" }}>
                          <MetricLine label={tx("cards.intervention_drilldown.mode", "Mode")} value={retrievalCitationEvidence.mode || "unknown"} />
                          <MetricLine label={tx("cards.intervention_drilldown.path", "Path")} value={retrievalCitationEvidence.path || "unknown"} />
                          <MetricLine label={tx("cards.intervention_drilldown.citations", "Citations")} value={String(retrievalCitationEvidence.citationCount)} />
                          <MetricLine label={tx("cards.intervention_drilldown.chunk_citations", "Chunk citations")} value={String(retrievalCitationEvidence.chunkCitationCount)} />
                          <MetricLine label={tx("cards.intervention_drilldown.bridge_citations", "Bridge citations")} value={String(retrievalCitationEvidence.bridgeCitationCount)} />
                          <MetricLine label={tx("cards.intervention_drilldown.snapshot_events", "Snapshot events")} value={String(retrievalCitationEvidence.eventCount)} />
                        </div>
                        <div className="mt-2 text-[10px]" style={{ color: "var(--neutral-gray)" }}>
                          {tx("cards.intervention_drilldown.latest_snapshot", "Latest snapshot:")} {formatDateTime(retrievalCitationEvidence.occurredAt)}
                        </div>
                        {retrievalCitationEvidence.fallbackUsed && (
                          <div className="mt-1 text-[10px]" style={{ color: "#92400e" }}>
                            {tx("cards.intervention_drilldown.fallback_used", "Fallback used:")}{" "}
                            {retrievalCitationEvidence.fallbackReason
                              || tx("cards.intervention_drilldown.reason_not_captured", "reason not captured")}
                          </div>
                        )}
                        {retrievalCitationEvidence.sourceKindCounts.length > 0 && (
                          <div className="mt-1 text-[10px]" style={{ color: "var(--neutral-gray)" }}>
                            {tx("cards.intervention_drilldown.source_kinds", "Source kinds:")}{" "}
                            {retrievalCitationEvidence.sourceKindCounts
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
                                  {tx("cards.intervention_drilldown.path_prefix", "Path:")} {citation.sourcePath}
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
                    {tx("cards.intervention_drilldown.session_timeline", "Session Timeline")}
                  </div>
                  {!selectedIntervention.sessionId && (
                    <div className="text-[10px]" style={{ color: "var(--neutral-gray)" }}>
                      {tx("cards.intervention_drilldown.no_session_context_queue", "No session context attached to this queue item.")}
                    </div>
                  )}
                  {selectedIntervention.sessionId && !interventionMessages && (
                    <div className="text-[10px]" style={{ color: "var(--neutral-gray)" }}>
                      {tx("cards.intervention_drilldown.loading_session_timeline", "Loading session timeline...")}
                    </div>
                  )}
                  {selectedIntervention.sessionId && interventionMessages && interventionMessages.length === 0 && (
                    <div className="text-[10px]" style={{ color: "var(--neutral-gray)" }}>
                      {tx("cards.intervention_drilldown.session_empty", "This session has no messages yet.")}
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
                    {tx("cards.intervention_drilldown.action_panel", "Intervention Action Panel")}
                  </div>

                  {shouldRenderTemplateControls && selectedTemplate && (
                    <div
                      className="mb-3 space-y-2 border p-2"
                      style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-card-bg, #fff)" }}
                    >
                      <div className="text-[10px] font-medium" style={{ color: "var(--window-document-text)" }}>
                        {tx("cards.intervention_drilldown.action_template", "Action Template")}
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
                            placeholder={tx("cards.intervention_drilldown.file_name_placeholder", "File name (for example pricing-deck.pdf)")}
                            className="border px-2 py-1 text-[10px]"
                            style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-card-bg, #fff)" }}
                          />
                          <input
                            value={templateFileUrl}
                            onChange={(event) => setTemplateFileUrl(event.target.value)}
                            placeholder={tx("cards.intervention_drilldown.file_url_placeholder", "File URL (optional if name is enough)")}
                            className="border px-2 py-1 text-[10px]"
                            style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-card-bg, #fff)" }}
                          />
                        </div>
                      )}
                      <textarea
                        value={templateNote}
                        onChange={(event) => setTemplateNote(event.target.value)}
                        placeholder={tx("cards.intervention_drilldown.template_note_placeholder", "Template note for audit log (optional)")}
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
                        placeholder={tx("cards.intervention_drilldown.rejection_reason_placeholder", "Optional rejection reason")}
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
                            ? tx("cards.intervention_drilldown.approving", "Approving...")
                            : selectedTemplateId === "send_file"
                              ? tx("cards.intervention_drilldown.approve_send_file", "Approve + Send File")
                              : tx("cards.intervention_drilldown.approve_override", "Approve Override")}
                        </button>
                        <button
                          onClick={() => { void handleReject(); }}
                          disabled={isIntervening || !selectedIntervention.approvalId}
                          className="flex items-center gap-1 border px-3 py-1 text-[11px] disabled:opacity-60"
                          style={{ borderColor: "var(--window-document-border)" }}
                        >
                          <XCircle size={12} />
                          {isIntervening
                            ? tx("cards.intervention_drilldown.rejecting", "Rejecting...")
                            : tx("cards.intervention_drilldown.reject", "Reject")}
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
                            {isIntervening
                              ? tx("cards.intervention_drilldown.taking_over", "Taking Over...")
                              : tx("cards.intervention_drilldown.take_over", "Take Over")}
                          </button>
                          <button
                            onClick={() => { void handleDismiss(); }}
                            disabled={isIntervening || !selectedIntervention.sessionId}
                            className="flex items-center gap-1 border px-3 py-1 text-[11px] disabled:opacity-60"
                            style={{ borderColor: "var(--window-document-border)" }}
                          >
                            <XCircle size={12} />
                            {isIntervening
                              ? tx("cards.intervention_drilldown.dismissing", "Dismissing...")
                              : tx("cards.intervention_drilldown.dismiss", "Dismiss")}
                          </button>
                        </div>
                      )}

                      {selectedIntervention.escalationStatus === "taken_over" && (
                        <>
                          <textarea
                            value={resolutionSummary}
                            onChange={(event) => setResolutionSummary(event.target.value)}
                            placeholder={tx("cards.intervention_drilldown.resolution_summary_placeholder", "Resolution summary (required to resume agent)")}
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
                              ? tx("cards.intervention_drilldown.resolving", "Resolving...")
                              : selectedTemplateId === "send_file"
                                ? tx("cards.intervention_drilldown.send_file_resume", "Send File + Resume Agent")
                                : tx("cards.intervention_drilldown.handoff_back_to_agent", "Handoff Back To Agent")}
                          </button>
                        </>
                      )}

                      {selectedIntervention.escalationStatus !== "pending"
                        && selectedIntervention.escalationStatus !== "taken_over" && (
                        <div className="text-[10px]" style={{ color: "var(--neutral-gray)" }}>
                          {tx("cards.intervention_drilldown.already_state", "This escalation is already {{state}}.", {
                            state: humanizeText(selectedIntervention.escalationStatus),
                          })}
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

      <Card title={tx("cards.checkpoint_timeline.title", "Checkpoint Timeline")}>
        {!selectedThreadRow && (
          <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
            {tx("cards.checkpoint_timeline.select_thread", "Select a thread to inspect checkpoint-grouped timeline events.")}
          </div>
        )}

        {selectedThreadRow && timelineLoading && (
          <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
            {tx("cards.checkpoint_timeline.loading", "Loading thread timeline...")}
          </div>
        )}

        {selectedThreadRow && selectedThreadMissing && (
          <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
            {tx("cards.checkpoint_timeline.unavailable", "Timeline data is unavailable for the selected thread.")}
          </div>
        )}

        {selectedThreadRow && !timelineLoading && !selectedThreadMissing && !hasTimelineEvents && (
          <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
            {tx("cards.checkpoint_timeline.empty", "No checkpoint transitions recorded for this thread yet.")}
          </div>
        )}

        {selectedThreadRow && !timelineLoading && !selectedThreadMissing && hasTimelineEvents && (
          <div className="space-y-3">
            {controlCenterThreadDrillDown?.visibilityScope && (
              <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                {tx("cards.checkpoint_timeline.trace_scope", "Trace scope:")}{" "}
                {controlCenterThreadDrillDown.visibilityScope === "super_admin"
                  ? tx("cards.checkpoint_timeline.super_admin", "Super admin")
                  : tx("cards.checkpoint_timeline.org_owner_member", "Organization owner/member")}
              </div>
            )}
            {controlCenterThreadDrillDown?.context && (
              <div
                className="border p-2.5"
                style={{
                  borderColor: "var(--window-document-border)",
                  background: "var(--window-document-panel-bg, var(--window-document-bg))",
                }}
                >
                <div className="text-xs font-medium" style={{ color: "var(--window-document-text)" }}>
                  {tx("cards.checkpoint_timeline.session_turn_context", "Session + Turn Context")}
                </div>
                <div className="mt-2 grid grid-cols-1 gap-1.5 text-xs md:grid-cols-2">
                  <MetricLine
                    label={tx("cards.checkpoint_timeline.session", "Session")}
                    value={compactId(controlCenterThreadDrillDown.context.sessionId)}
                  />
                  <MetricLine
                    label={tx("cards.checkpoint_timeline.route_key", "Route key")}
                    value={controlCenterThreadDrillDown.context.route.sessionRoutingKey}
                  />
                  <MetricLine
                    label={tx("cards.checkpoint_timeline.channel", "Channel")}
                    value={controlCenterThreadDrillDown.context.channel}
                  />
                  <MetricLine
                    label={tx("cards.checkpoint_timeline.contact", "Contact")}
                    value={controlCenterThreadDrillDown.context.externalContactIdentifier}
                  />
                  <MetricLine
                    label={tx("cards.checkpoint_timeline.selected_agent", "Selected agent")}
                    value={
                      controlCenterThreadDrillDown.context.selectedAgent.displayName
                      || compactId(controlCenterThreadDrillDown.context.selectedAgent.instanceAgentId)
                    }
                  />
                  <MetricLine
                    label={tx("cards.checkpoint_timeline.agent_role", "Agent role")}
                    value={controlCenterThreadDrillDown.context.selectedAgent.roleLabel}
                  />
                  <MetricLine
                    label={tx("cards.checkpoint_timeline.lifecycle", "Lifecycle")}
                    value={humanizeText(controlCenterThreadDrillDown.context.delivery.lifecycleState)}
                  />
                  <MetricLine
                    label={tx("cards.checkpoint_timeline.delivery", "Delivery")}
                    value={humanizeText(controlCenterThreadDrillDown.context.delivery.deliveryState)}
                  />
                  <MetricLine
                    label={tx("cards.checkpoint_timeline.latest_turn", "Latest turn")}
                    value={controlCenterThreadDrillDown.context.latestTurn
                      ? compactId(controlCenterThreadDrillDown.context.latestTurn.turnId)
                      : "n/a"}
                  />
                  <MetricLine
                    label={tx("cards.checkpoint_timeline.route_identity", "Route identity")}
                    value={formatRouteIdentity(controlCenterThreadDrillDown.context.route.routeIdentity)}
                  />
                </div>
                <div className="mt-2 text-xs" style={{ color: "var(--neutral-gray)" }}>
                  {tx(
                    "cards.checkpoint_timeline.shared_identifiers_note",
                    "Shared identifiers (`sessionId`, `turnId`, `correlationId`, `lineageId`) match terminal timeline and trust timeline rows."
                  )}
                </div>
              </div>
            )}
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
        {title === "Receipt Reliability" && <AlertTriangle size={12} />}
        {title === "Runtime KPIs" && <Activity size={12} />}
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

function resolveTrustTimelineMarkerTone(markerType: UnifiedTimelineMarkerType): StatusPillTone {
  if (markerType === "handoff") {
    return { background: "var(--color-warn-subtle)", border: "var(--color-warn)", color: "var(--color-warn)" };
  }
  if (markerType === "proposal") {
    return { background: "var(--color-info-subtle)", border: "var(--color-info)", color: "var(--color-info)" };
  }
  if (markerType === "commit") {
    return { background: "var(--color-success-subtle)", border: "var(--color-success)", color: "var(--color-success)" };
  }
  if (markerType === "dm") {
    return { background: "var(--color-accent-subtle)", border: "var(--color-accent)", color: "var(--color-accent)" };
  }
  return { background: "var(--color-surface-hover)", border: "var(--color-border-hover)", color: "var(--color-text-secondary)" };
}

function resolveTimelineMarker(event: ControlCenterTimelineEvent): {
  label: string;
  tone: StatusPillTone;
} | null {
  const markerType = resolveUnifiedTimelineMarkerType(event);
  if (!markerType) {
    return null;
  }
  return {
    label: resolveUnifiedTimelineMarkerLabel(markerType),
    tone: resolveTrustTimelineMarkerTone(markerType),
  };
}

function formatCorrelationLabel(correlationId: string): string {
  const compact = compactUnifiedCorrelationId(correlationId);
  if (compact === correlationId) {
    return compact;
  }
  return `${compact} (${correlationId})`;
}

function ControlCenterTimelineRow({ event }: { event: ControlCenterTimelineEvent }) {
  const { t } = useNamespaceTranslations("ui.agents.trust_cockpit");
  const tx = (
    key: string,
    fallback: string,
    params?: Record<string, string | number>
  ): string => {
    const translated = t(key, params);
    return translated === key ? fallback : translated;
  };
  const tone = escalationGateTone(event.escalationGate);
  const marker = resolveTimelineMarker(event);
  const actorLabel = `${humanizeText(event.actorType)}:${compactId(event.actorId)}`;
  const checkpointLabel = event.checkpoint
    ? humanizeText(event.checkpoint)
    : tx("timeline.no_checkpoint", "No checkpoint");
  const stageLabel = event.pipelineStage ? humanizeText(event.pipelineStage) : null;
  const visibilityLabel = event.visibilityScope === "super_admin"
    ? tx("timeline.super_admin_trace", "Super admin trace")
    : tx("timeline.org_owner_trace", "Org-owner trace");
  const turnPointer = event.turnId || readString(event.metadata?.turnId);
  const correlationLabel = formatCorrelationLabel(event.correlationId);

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
        <div className="flex items-center gap-1.5">
          <div className="text-xs font-medium" style={{ color: "var(--window-document-text)" }}>
            {event.title}
          </div>
          {marker && <StatusPill label={marker.label} tone={marker.tone} />}
        </div>
        <div className="text-[10px]" style={{ color: "var(--neutral-gray)" }} title={formatDateTime(event.occurredAt)}>
          {timeAgo(event.occurredAt)}
        </div>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]" style={{ color: "var(--neutral-gray)" }}>
        <span>{humanizeText(event.kind)}</span>
        {stageLabel && (
          <>
            <span>·</span>
            <span>{stageLabel}</span>
          </>
        )}
        <span>·</span>
        <span>{checkpointLabel}</span>
        <span>·</span>
        <span>{actorLabel}</span>
        <span>·</span>
        <span>#{event.eventOrdinal}</span>
      </div>
      {(event.fromState || event.toState) && (
        <div className="mt-1 text-[10px]" style={{ color: "var(--neutral-gray)" }}>
          {tx("timeline.state", "State:")} {event.fromState || tx("timeline.unknown", "unknown")}{" -> "}
          {event.toState || tx("timeline.unknown", "unknown")}
        </div>
      )}
      <div className="mt-1 text-xs" style={{ color: "var(--neutral-gray)" }}>
        {tx("timeline.session", "Session:")} {compactId(event.sessionId)}
        {turnPointer
          ? ` · ${tx("timeline.turn", "Turn:")} ${compactId(turnPointer)}`
          : ""}
      </div>
      <div className="mt-1 text-xs" style={{ color: "var(--neutral-gray)" }} title={event.correlationId}>
        {tx("timeline.correlation", "Correlation:")} {correlationLabel}
      </div>
      {(event.lineageId || event.threadType || event.workflowKey || event.authorityIntentType) && (
        <div className="mt-1 text-xs" style={{ color: "var(--neutral-gray)" }}>
          {event.lineageId
            ? tx("timeline.lineage_value", "Lineage {{lineageId}}", { lineageId: event.lineageId })
            : tx("timeline.lineage_na", "Lineage n/a")}
          {event.threadType ? ` · ${humanizeText(event.threadType)}` : ""}
          {event.workflowKey
            ? ` · ${tx("timeline.workflow", "workflow")} ${event.workflowKey}`
            : ""}
          {event.authorityIntentType
            ? ` · ${tx("timeline.intent", "intent")} ${event.authorityIntentType}`
            : ""}
        </div>
      )}
      <div className="text-[10px] mt-1" style={{ color: "var(--neutral-gray)" }}>
        {event.summary}
      </div>
      {event.reason && (
        <div className="text-[10px] mt-1" style={{ color: "var(--window-document-text)" }}>
          {tx("timeline.reason", "Reason:")} {event.reason}
        </div>
      )}
      {event.trustEventName && (
        <div className="text-[10px] mt-1" style={{ color: "#1d4ed8" }}>
          {tx("timeline.trust_event", "Trust event:")} {event.trustEventName}
        </div>
      )}
      <div className="mt-1 text-xs" style={{ color: "var(--neutral-gray)" }}>
        {visibilityLabel}
      </div>
    </div>
  );
}

function severityRank(severity: TimelineSeverity): number {
  if (severity === "high") return 0;
  if (severity === "medium") return 1;
  return 2;
}

function reliabilityCategoryRank(category: ReliabilityDiagnosticCategory): number {
  if (category === "stuck") return 0;
  if (category === "aging") return 1;
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
      .sort(compareTimelineEventsDeterministically),
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

function formatRatePercent(rate: number): string {
  if (!Number.isFinite(rate)) {
    return "0.0%";
  }
  return `${(rate * 100).toFixed(1)}%`;
}

function formatCountRatio(numerator: number, denominator: number): string {
  const safeNumerator = Number.isFinite(numerator) ? numerator : 0;
  const safeDenominator = Number.isFinite(denominator) ? denominator : 0;
  const ratio = safeDenominator > 0 ? safeNumerator / safeDenominator : 0;
  return `${safeNumerator}/${safeDenominator} (${formatRatePercent(ratio)})`;
}

function formatRouteIdentity(identity: ControlCenterRouteIdentity | undefined): string {
  if (!identity) {
    return "legacy";
  }
  const parts = [
    identity.providerId,
    identity.providerConnectionId,
    identity.providerProfileId,
    identity.bindingId,
  ].filter((value): value is string => typeof value === "string" && value.trim().length > 0);
  return parts.length > 0 ? parts.join(" · ") : "legacy";
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

function formatDurationMs(value: number): string {
  if (!Number.isFinite(value) || value <= 0) {
    return "0s";
  }
  const totalSeconds = Math.floor(value / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const totalMinutes = Math.floor(totalSeconds / 60);
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const totalHours = Math.floor(totalMinutes / 60);
  if (totalHours < 24) return `${totalHours}h`;
  const totalDays = Math.floor(totalHours / 24);
  return `${totalDays}d`;
}
