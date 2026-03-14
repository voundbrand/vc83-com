"use client";

/**
 * AGENTS WINDOW — Unified agent management dashboard
 *
 * Master-detail layout: agent list sidebar (left) + tabbed detail panel (right).
 * Accessible as a window in the desktop manager and as a full-screen page at /agents.
 */

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Bot,
  Maximize2,
  MessageSquare,
  Shield,
  Sparkles,
  Terminal,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { useConvex, useMutation, useQuery } from "convex/react";
import { useAuth, useCurrentOrganization } from "@/hooks/use-auth";
import { useNamespaceTranslations } from "@/hooks/use-namespace-translations";
import { useWindowManager } from "@/hooks/use-window-manager";
import { CreditWall } from "@/components/credit-wall";
import { CreditBalance } from "@/components/credit-balance";
import type { Id } from "../../../convex/_generated/dataModel";
import type { AgentTab } from "./agents/types";
import { AgentListPanel } from "./agents/agent-list-panel";
import { AgentDetailPanel } from "./agents/agent-detail-panel";
import { AgentCreateForm } from "./agents/agent-create-form";
import { AgentStorePanel, type AgentCatalogCard } from "./agents/agent-store-panel";
import { AgentToolSetupPanel } from "./agents/agent-tool-setup-panel";
import {
  AGENT_NEED_OUTCOME_OPTIONS,
  SPECIALIST_ROLE_CONTRACTS,
  buildAgentNeedRecommendation,
  type CoverageBlueprintId,
  type AgentIntegrationReadiness,
  type AgentNeedOutcomeId,
  type SpecialistRoleId,
} from "./agents/agent-recommender";
import { AIChatWindow } from "./ai-chat-window";
import { getVoiceAssistantWindowContract } from "./ai-chat-window/voice-assistant-contract";
import { TerminalWindow } from "./terminal-window";

interface AgentsWindowApi {
  credits: {
    index: {
      getCreditBalance: unknown;
    };
  };
  agentOntology: {
    getAgents: unknown;
  };
  oauth: {
    microsoft: {
      getUserMicrosoftConnection: unknown;
    };
    google: {
      getGoogleConnectionStatus: unknown;
    };
    slack: {
      getSlackConnectionStatus: unknown;
    };
    whatsapp: {
      getWhatsAppConnectionStatus: unknown;
    };
  };
  integrations: {
    telegram: {
      getTelegramIntegrationStatus: unknown;
    };
  };
  ai: {
    agentStoreCatalog: {
      getCatalogAgentProductContext: unknown;
    };
    agentSessions: {
      getAgentStats: unknown;
      getControlCenterThreadRows: unknown;
      getAgentOpsScopeOptions: unknown;
      getAgentOpsIncidentWorkspace: unknown;
      getActionCompletionMismatchTelemetry: unknown;
      getActionCompletionMismatchTelemetryDiagnostic: unknown;
      syncAgentOpsThresholdIncidents: unknown;
      transitionAgentOpsIncidentState: unknown;
    };
  };
  terminal: {
    terminalFeed: {
      checkLayerScopeAvailable: unknown;
    };
  };
}

const apiAny = require("../../../convex/_generated/api").api as AgentsWindowApi;

interface AgentsWindowProps {
  fullScreen?: boolean;
}

interface AgentRecord {
  _id: Id<"objects">;
  name: string;
  subtype?: string;
  customProperties?: {
    displayName?: string;
  };
}

interface AgentStatRecord {
  agentId: string;
  totalSessions: number;
  activeSessions: number;
  totalMessages: number;
  totalCostUsd: number;
}

interface ControlCenterThreadSummary {
  organizationId: string;
  organizationName?: string;
  organizationSlug?: string;
  organizationLayer?: number;
  templateAgentId: string;
  templateAgentName: string;
  waitingOnHuman: boolean;
  escalationCountOpen: number;
  deliveryState: "queued" | "running" | "done" | "blocked" | "failed";
  channel: string;
  externalContactIdentifier: string;
  updatedAt: number;
}

interface AgentOpsHotspot {
  agentId: Id<"objects">;
  agentName: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  organizationLayer: number;
  canOpenTrust: boolean;
  threadCount: number;
  waitingOnHumanCount: number;
  escalationCount: number;
  deliveryIssues: number;
  latestUpdateAt: number;
  latestChannel: string;
  latestContact: string;
}

type AgentOpsVisibilityScope = "org_owner" | "super_admin";
type AgentOpsScopeMode = "org" | "layer";

interface AgentOpsScopeOption {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  layer: number;
  hasChildren: boolean;
}

interface AgentOpsThresholdSnapshotRecord {
  metric: "fallback_spike" | "tool_failure_spike" | "ingress_failure_spike";
  ruleId: string;
  displayName: string;
  description: string;
  windowHours: number;
  observedValue: number;
  warningThreshold: number;
  criticalThreshold: number;
  thresholdValue: number | null;
  severity: "ok" | "warning" | "critical";
  sampleSize: number;
  rollbackCriteria: string;
  escalationOwner: "runtime_oncall" | "ops_owner" | "platform_admin";
}

interface AgentOpsIncidentLogEntryRecord {
  at: number;
  actorUserId: string;
  note: string;
}

interface AgentOpsIncidentRecord {
  incidentId: string;
  title: string;
  description?: string;
  organizationId: string;
  scopeOrganizationId: string;
  scopeOrganizationName?: string;
  scope: AgentOpsScopeMode;
  metric: "fallback_spike" | "tool_failure_spike" | "ingress_failure_spike" | "manual";
  ruleId?: string;
  state: "open" | "acknowledged" | "mitigated" | "closed";
  severity: "critical" | "high" | "medium" | "low";
  ownerUserId?: string;
  openedAt: number;
  acknowledgedAt?: number;
  mitigatedAt?: number;
  closedAt?: number;
  mitigationLog: AgentOpsIncidentLogEntryRecord[];
  closureEvidence?: {
    summary: string;
    references: string[];
    closedByUserId: string;
    closedAt: number;
  };
  thresholdSnapshot?: AgentOpsThresholdSnapshotRecord;
  updatedAt: number;
}

interface AgentOpsIncidentWorkspaceRecord {
  visibilityScope: AgentOpsVisibilityScope;
  scope: AgentOpsScopeMode;
  scopeOrganizationId: string;
  scopeOrganizationName: string;
  thresholds: AgentOpsThresholdSnapshotRecord[];
  incidents: AgentOpsIncidentRecord[];
}

type CoverageAvailability = "available_now" | "blocked";
type SpecialistSubtype = "booking_agent" | "customer_support" | "general" | "sales_assistant";
type CoverageIntegrationPrerequisite = "calendar_connected" | "messaging_connected";

interface SpecialistCoverageBlueprint {
  id: CoverageBlueprintId;
  packId: CoverageBlueprintId;
  primarySpecialistRoleId: SpecialistRoleId;
  specialistName: string;
  objective: string;
  recommendationHint: string;
  requiredSubtypes: SpecialistSubtype[];
  defaultSubtype: SpecialistSubtype;
  integrationPrerequisites: CoverageIntegrationPrerequisite[];
  unknownPrerequisites: string[];
  unknownUnblockingSteps: string[];
}

const SPECIALIST_COVERAGE_BLUEPRINTS: SpecialistCoverageBlueprint[] = [
  {
    id: "pack_personal_inbox_defense",
    packId: "pack_personal_inbox_defense",
    primarySpecialistRoleId: "provider_outreach_specialist",
    specialistName: "Email Inbox Defense",
    objective: "Email spam filtering and urgent-priority triage with approval-gated rule changes.",
    recommendationHint: "One visible operator routes hidden inbox specialists and asks before persisting new rules.",
    requiredSubtypes: ["customer_support", "sales_assistant"],
    defaultSubtype: "customer_support",
    integrationPrerequisites: ["messaging_connected"],
    unknownPrerequisites: ["Inbox provider connection status is not visible in Agent Ops yet."],
    unknownUnblockingSteps: [
      "Connect Gmail or Microsoft inbox in Integrations and confirm allow/deny spam policy baseline.",
    ],
  },
  {
    id: "pack_wearable_operator_companion",
    packId: "pack_wearable_operator_companion",
    primarySpecialistRoleId: "personal_schedule_coordinator",
    specialistName: "Wearable Operator Companion",
    objective: "Work-with-me guidance from pocket + Meta glasses context while preserving one-operator continuity.",
    recommendationHint: "Hidden specialist routing stays default while operator confirms learned preferences.",
    requiredSubtypes: ["general"],
    defaultSubtype: "general",
    integrationPrerequisites: [],
    unknownPrerequisites: ["Live camera/microphone permission state is not visible in this window."],
    unknownUnblockingSteps: [
      "Grant camera and microphone permissions on mobile/glasses and start an active live session.",
    ],
  },
  {
    id: "pack_exec_daily_checkup",
    packId: "pack_exec_daily_checkup",
    primarySpecialistRoleId: "personal_schedule_coordinator",
    specialistName: "Executive Daily Checkup",
    objective: "Actionable business administration with proactive daily priorities, risks, and owners.",
    recommendationHint: "Outbound follow-ups remain trust-gated while internal summaries can run automatically.",
    requiredSubtypes: ["general", "sales_assistant"],
    defaultSubtype: "general",
    integrationPrerequisites: ["calendar_connected", "messaging_connected"],
    unknownPrerequisites: [],
    unknownUnblockingSteps: [],
  },
  {
    id: "pack_visual_todo_shopping",
    packId: "pack_visual_todo_shopping",
    primarySpecialistRoleId: "personal_schedule_coordinator",
    specialistName: "Visual Todo + Shopping",
    objective: "Convert Meta glasses or iPhone camera captures into structured todo and shopping actions.",
    recommendationHint: "Ambiguous captures stay blocked until clarified; no silent list mutation path.",
    requiredSubtypes: ["general"],
    defaultSubtype: "general",
    integrationPrerequisites: [],
    unknownPrerequisites: ["Visual-capture permissions and camera pipeline readiness are not visible in Agent Ops."],
    unknownUnblockingSteps: [
      "Enable camera capture permissions on the active device and verify visual extraction pipeline health.",
    ],
  },
  {
    id: "pack_note_capture_memory",
    packId: "pack_note_capture_memory",
    primarySpecialistRoleId: "personal_schedule_coordinator",
    specialistName: "Note Capture Memory",
    objective: "Capture notes, extract decisions/actions, and keep retrieval hooks deterministic.",
    recommendationHint: "Structured note capture is available now when a general specialist is active.",
    requiredSubtypes: ["general"],
    defaultSubtype: "general",
    integrationPrerequisites: [],
    unknownPrerequisites: [],
    unknownUnblockingSteps: [],
  },
  {
    id: "pack_vacation_delegate_guard",
    packId: "pack_vacation_delegate_guard",
    primarySpecialistRoleId: "provider_outreach_specialist",
    specialistName: "Vacation Delegate Guard",
    objective: "First-wave defense while away with escalation through the user-selected channel.",
    recommendationHint: "Low-risk responses can run delegated-auto; policy changes and high-risk actions stay ask-gated.",
    requiredSubtypes: ["customer_support", "sales_assistant"],
    defaultSubtype: "customer_support",
    integrationPrerequisites: ["messaging_connected"],
    unknownPrerequisites: ["Escalation policy and severity thresholds are not visible in Agent Ops."],
    unknownUnblockingSteps: [
      "Configure vacation delegate policy with severity thresholds and selected escalation channel (SMS/WhatsApp/Slack/Email).",
    ],
  },
];

const COVERAGE_INTEGRATION_RULES: Record<
  CoverageIntegrationPrerequisite,
  { gap: string; step: string; isMet: (readiness: AgentIntegrationReadiness) => boolean }
> = {
  calendar_connected: {
    gap: "Calendar integration prerequisite missing (connect Google Calendar or Microsoft Calendar).",
    step: "Connect Google Calendar or Microsoft Calendar in Integrations before enabling calendar mutations.",
    isMet: (readiness) =>
      readiness.googleCalendarConnected || readiness.microsoftCalendarConnected,
  },
  messaging_connected: {
    gap: "Messaging integration prerequisite missing (connect Telegram, WhatsApp, or Slack).",
    step: "Connect Telegram, WhatsApp, or Slack in Integrations before enabling escalation/outreach flows.",
    isMet: (readiness) =>
      readiness.telegramConnected
      || readiness.whatsappConnected
      || readiness.slackConnected,
  },
};

export function AgentsWindow({ fullScreen }: AgentsWindowProps) {
  const { sessionId, isSuperAdmin } = useAuth();
  const { t } = useNamespaceTranslations("ui.agents_window");
  const currentOrg = useCurrentOrganization();
  const convex = useConvex();
  const { openWindow } = useWindowManager();
  const tx = (
    key: string,
    fallback: string,
    params?: Record<string, string | number>
  ): string => {
    const translated = t(key, params);
    return translated === key ? fallback : translated;
  };
  const [selectedAgentId, setSelectedAgentId] = useState<Id<"objects"> | null>(null);
  const [activeTab, setActiveTab] = useState<AgentTab>("trust");
  const [showCreate, setShowCreate] = useState(false);
  const [editingAgentId, setEditingAgentId] = useState<Id<"objects"> | null>(null);
  const [showAgentOps, setShowAgentOps] = useState(true);
  const [showCatalog, setShowCatalog] = useState(false);
  const [showToolSetup, setShowToolSetup] = useState(false);
  const [opsScopeMode, setOpsScopeMode] = useState<AgentOpsScopeMode>("org");
  const [opsScopeOrganizationId, setOpsScopeOrganizationId] = useState<Id<"organizations"> | null>(null);
  const [incidentActionMessage, setIncidentActionMessage] = useState<string | null>(null);
  const [incidentActionError, setIncidentActionError] = useState<string | null>(null);
  const [incidentActionLoadingId, setIncidentActionLoadingId] = useState<string | null>(null);
  const unsafeUseQuery = useQuery as unknown as (
    queryRef: unknown,
    args: unknown
  ) => unknown;
  const unsafeUseMutation = useMutation as unknown as (
    mutationRef: unknown
  ) => (args: unknown) => Promise<unknown>;
  const syncAgentOpsThresholdIncidents = unsafeUseMutation(
    apiAny.ai.agentSessions.syncAgentOpsThresholdIncidents
  );
  const transitionAgentOpsIncidentState = unsafeUseMutation(
    apiAny.ai.agentSessions.transitionAgentOpsIncidentState
  );

  useEffect(() => {
    if (!currentOrg?.id) {
      return;
    }
    setOpsScopeOrganizationId((previous) =>
      previous ?? (currentOrg.id as Id<"organizations">)
    );
  }, [currentOrg?.id]);

  const creditBalance = unsafeUseQuery(
    apiAny.credits.index.getCreditBalance,
    currentOrg?.id
      ? { organizationId: currentOrg.id as Id<"organizations"> }
      : "skip"
  ) as {
    totalCredits: number;
    dailyCredits: number;
    monthlyCredits: number;
    monthlyCreditsTotal: number;
    purchasedCredits: number;
    planTier?: string;
  } | null | undefined;

  const hasZeroCredits = creditBalance !== undefined && creditBalance !== null && creditBalance.totalCredits <= 0;
  const isUnlimited = creditBalance?.monthlyCreditsTotal === -1;
  const microsoftConnection = unsafeUseQuery(
    apiAny.oauth.microsoft.getUserMicrosoftConnection,
    sessionId ? {} : "skip"
  ) as { status?: string } | undefined;
  const googleConnection = unsafeUseQuery(
    apiAny.oauth.google.getGoogleConnectionStatus,
    sessionId ? { sessionId } : "skip"
  ) as {
    personal?: {
      status?: string;
    } | null;
  } | undefined;
  const slackConnection = unsafeUseQuery(
    apiAny.oauth.slack.getSlackConnectionStatus,
    sessionId ? { sessionId } : "skip"
  ) as { connected?: boolean } | undefined;
  const whatsappConnection = unsafeUseQuery(
    apiAny.oauth.whatsapp.getWhatsAppConnectionStatus,
    sessionId ? { sessionId } : "skip"
  ) as { connected?: boolean } | undefined;
  const telegramStatus = unsafeUseQuery(
    apiAny.integrations.telegram.getTelegramIntegrationStatus,
    sessionId ? { sessionId } : "skip"
  ) as {
    platformBot?: {
      connected?: boolean;
    } | null;
    customBot?: {
      deployed?: boolean;
    } | null;
  } | undefined;
  const integrationReadiness = useMemo<AgentIntegrationReadiness>(() => {
    return {
      googleCalendarConnected: googleConnection?.personal?.status === "active",
      microsoftCalendarConnected: microsoftConnection?.status === "active",
      telegramConnected:
        telegramStatus?.platformBot?.connected === true
        || telegramStatus?.customBot?.deployed === true,
      whatsappConnected: whatsappConnection?.connected === true,
      slackConnected: slackConnection?.connected === true,
    };
  }, [
    googleConnection?.personal?.status,
    microsoftConnection?.status,
    telegramStatus?.platformBot?.connected,
    telegramStatus?.customBot?.deployed,
    whatsappConnection?.connected,
    slackConnection?.connected,
  ]);

  const scopeOptionsPayload = unsafeUseQuery(
    apiAny.ai.agentSessions.getAgentOpsScopeOptions,
    sessionId && currentOrg?.id
      ? { sessionId, organizationId: currentOrg.id as Id<"organizations"> }
      : "skip"
  ) as {
    visibilityScope: AgentOpsVisibilityScope;
    canCrossOrg: boolean;
    defaultOrganizationId: string;
    organizations: AgentOpsScopeOption[];
  } | undefined;

  const canCrossOrg = Boolean(scopeOptionsPayload?.canCrossOrg);
  const visibilityScope: AgentOpsVisibilityScope = scopeOptionsPayload?.visibilityScope
    ?? (isSuperAdmin ? "super_admin" : "org_owner");
  const scopeOrganizations = scopeOptionsPayload?.organizations || [];

  const effectiveScopeOrganizationId = useMemo(() => {
    const currentOrganizationId = currentOrg?.id as Id<"organizations"> | undefined;
    if (!currentOrganizationId) {
      return undefined;
    }
    if (!canCrossOrg) {
      return currentOrganizationId;
    }
    if (!opsScopeOrganizationId) {
      return currentOrganizationId;
    }
    const isKnownScope = scopeOrganizations.some(
      (option) => option.organizationId === String(opsScopeOrganizationId)
    );
    return isKnownScope ? opsScopeOrganizationId : currentOrganizationId;
  }, [canCrossOrg, currentOrg?.id, opsScopeOrganizationId, scopeOrganizations]);

  const layerScopeAvailability = unsafeUseQuery(
    apiAny.terminal.terminalFeed.checkLayerScopeAvailable,
    sessionId && currentOrg?.id && effectiveScopeOrganizationId
      ? {
          sessionId,
          organizationId: currentOrg.id as Id<"organizations">,
          scopeOrganizationId: effectiveScopeOrganizationId,
        }
      : "skip"
  ) as {
    available: boolean;
    visibilityScope: AgentOpsVisibilityScope;
    scopeOrganizationId: string;
  } | undefined;

  const layerScopeAvailable = Boolean(
    canCrossOrg
    && visibilityScope === "super_admin"
    && layerScopeAvailability?.available
  );

  useEffect(() => {
    if (!canCrossOrg && opsScopeMode !== "org") {
      setOpsScopeMode("org");
    }
  }, [canCrossOrg, opsScopeMode]);

  useEffect(() => {
    if (opsScopeMode === "layer" && !layerScopeAvailable) {
      setOpsScopeMode("org");
    }
  }, [layerScopeAvailable, opsScopeMode]);

  const agents = unsafeUseQuery(
    apiAny.agentOntology.getAgents,
    sessionId && currentOrg?.id
      ? { sessionId, organizationId: currentOrg.id as Id<"organizations"> }
      : "skip"
  ) as AgentRecord[] | undefined;

  useEffect(() => {
    if (!selectedAgentId || !agents) {
      return;
    }
    const stillExists = agents.some((agent) => agent._id === selectedAgentId);
    if (!stillExists) {
      setSelectedAgentId(null);
    }
  }, [agents, selectedAgentId]);

  const stats = unsafeUseQuery(
    apiAny.ai.agentSessions.getAgentStats,
    sessionId && currentOrg?.id
      ? { sessionId, organizationId: currentOrg.id as Id<"organizations"> }
      : "skip"
  ) as AgentStatRecord[] | undefined;
  const controlCenterThreads = unsafeUseQuery(
    apiAny.ai.agentSessions.getControlCenterThreadRows,
    sessionId && currentOrg?.id && effectiveScopeOrganizationId
      ? {
          sessionId,
          organizationId: currentOrg.id as Id<"organizations">,
          scope: canCrossOrg ? opsScopeMode : "org",
          scopeOrganizationId: effectiveScopeOrganizationId,
          limit: 120,
        }
      : "skip"
  ) as ControlCenterThreadSummary[] | undefined;
  const incidentWorkspace = unsafeUseQuery(
    apiAny.ai.agentSessions.getAgentOpsIncidentWorkspace,
    sessionId && currentOrg?.id && effectiveScopeOrganizationId
      ? {
          sessionId,
          organizationId: currentOrg.id as Id<"organizations">,
          scope: canCrossOrg ? opsScopeMode : "org",
          scopeOrganizationId: effectiveScopeOrganizationId,
        }
      : "skip"
  ) as AgentOpsIncidentWorkspaceRecord | undefined;
  const waitingOnHumanCount = controlCenterThreads?.filter((thread) => thread.waitingOnHuman).length || 0;
  const activeThreadCount = controlCenterThreads?.length || 0;
  const openEscalationCount = controlCenterThreads?.reduce(
    (sum, thread) => sum + thread.escalationCountOpen,
    0
  ) || 0;
  const deliveryIssueCount = controlCenterThreads?.filter(
    (thread) => thread.deliveryState === "blocked" || thread.deliveryState === "failed"
  ).length || 0;

  const agentLookup = useMemo(() => {
    const lookup = new Map<string, { id: Id<"objects">; name: string }>();
    for (const agent of agents || []) {
      const displayName = agent.customProperties?.displayName?.trim();
      lookup.set(String(agent._id), {
        id: agent._id,
        name: displayName && displayName.length > 0 ? displayName : agent.name || "Unnamed agent",
      });
    }
    return lookup;
  }, [agents]);

  const agentOpsHotspots = useMemo(() => {
    const byAgent = new Map<string, AgentOpsHotspot>();
    for (const thread of controlCenterThreads || []) {
      const lookupEntry = agentLookup.get(thread.templateAgentId);
      const agentName =
        lookupEntry?.name
        || thread.templateAgentName
        || "Unknown agent";
      const hotspotKey = `${thread.organizationId}:${thread.templateAgentId}`;
      const canOpenTrust = currentOrg?.id
        ? thread.organizationId === String(currentOrg.id)
        : false;

      const current = byAgent.get(hotspotKey) || {
        agentId:
          lookupEntry?.id
          || (thread.templateAgentId as Id<"objects">),
        agentName,
        organizationId: thread.organizationId,
        organizationName: thread.organizationName || "Unknown organization",
        organizationSlug: thread.organizationSlug || "",
        organizationLayer: thread.organizationLayer || 2,
        canOpenTrust,
        threadCount: 0,
        waitingOnHumanCount: 0,
        escalationCount: 0,
        deliveryIssues: 0,
        latestUpdateAt: 0,
        latestChannel: thread.channel,
        latestContact: thread.externalContactIdentifier,
      };

      current.threadCount += 1;
      if (thread.waitingOnHuman) {
        current.waitingOnHumanCount += 1;
      }
      current.escalationCount += thread.escalationCountOpen;
      if (thread.deliveryState === "blocked" || thread.deliveryState === "failed") {
        current.deliveryIssues += 1;
      }
      if (thread.updatedAt >= current.latestUpdateAt) {
        current.latestUpdateAt = thread.updatedAt;
        current.latestChannel = thread.channel;
        current.latestContact = thread.externalContactIdentifier;
      }

      byAgent.set(hotspotKey, current);
    }

    return Array.from(byAgent.values()).sort((a, b) => {
      if (a.waitingOnHumanCount !== b.waitingOnHumanCount) {
        return b.waitingOnHumanCount - a.waitingOnHumanCount;
      }
      if (a.escalationCount !== b.escalationCount) {
        return b.escalationCount - a.escalationCount;
      }
      if (a.deliveryIssues !== b.deliveryIssues) {
        return b.deliveryIssues - a.deliveryIssues;
      }
      if (a.organizationName !== b.organizationName) {
        return a.organizationName.localeCompare(b.organizationName);
      }
      return b.latestUpdateAt - a.latestUpdateAt;
    });
  }, [agentLookup, controlCenterThreads, currentOrg?.id]);

  const selectedScopeOption = scopeOrganizations.find(
    (option) => option.organizationId === String(effectiveScopeOrganizationId)
  );
  const scopeOrganizationLabel = selectedScopeOption?.organizationName
    || currentOrg?.name
    || "Current organization";
  const incidentThresholds = incidentWorkspace?.thresholds || [];
  const incidentRows = incidentWorkspace?.incidents || [];

  const runIncidentThresholdSync = async () => {
    if (!sessionId || !currentOrg?.id || !effectiveScopeOrganizationId) {
      return;
    }
    setIncidentActionError(null);
    setIncidentActionMessage(null);
    setIncidentActionLoadingId("threshold-sync");
    try {
      const result = await syncAgentOpsThresholdIncidents({
        sessionId,
        organizationId: currentOrg.id as Id<"organizations">,
        scope: canCrossOrg ? opsScopeMode : "org",
        scopeOrganizationId: effectiveScopeOrganizationId,
      }) as {
        createdIncidentIds: string[];
        updatedIncidentIds: string[];
      };
      setIncidentActionMessage(
        `Threshold sync complete: ${result.createdIncidentIds.length} opened, ${result.updatedIncidentIds.length} updated.`
      );
    } catch (error) {
      setIncidentActionError(error instanceof Error ? error.message : "Failed to sync threshold incidents.");
    } finally {
      setIncidentActionLoadingId(null);
    }
  };

  const transitionIncidentState = async (
    incident: AgentOpsIncidentRecord,
    nextState: "acknowledged" | "mitigated" | "closed"
  ) => {
    if (!sessionId || !currentOrg?.id) {
      return;
    }
    const payload: {
      sessionId: string;
      organizationId: Id<"organizations">;
      incidentId: Id<"objects">;
      nextState: "acknowledged" | "mitigated" | "closed";
      ownerUserId?: string;
      note?: string;
      closureSummary?: string;
      closureEvidenceReferences?: string[];
    } = {
      sessionId,
      organizationId: currentOrg.id as Id<"organizations">,
      incidentId: incident.incidentId as Id<"objects">,
      nextState,
    };

    if (nextState === "acknowledged") {
      const ownerInput = window.prompt(
        tx(
          "incident_workspace.prompts.owner_user_id",
          "Incident owner user ID (leave blank to assign to your user):"
        ),
        incident.ownerUserId || ""
      );
      if (ownerInput === null) {
        return;
      }
      const trimmedOwner = ownerInput.trim();
      if (trimmedOwner.length > 0) {
        payload.ownerUserId = trimmedOwner;
      }
    }

    if (nextState === "mitigated") {
      const mitigationNote = window.prompt(
        tx("incident_workspace.prompts.mitigation_note", "Mitigation note (required):"),
        "Mitigation applied in Agent Ops workspace."
      );
      if (!mitigationNote || mitigationNote.trim().length === 0) {
        return;
      }
      payload.note = mitigationNote.trim();
    }

    if (nextState === "closed") {
      const closureSummary = window.prompt(
        tx("incident_workspace.prompts.closure_summary", "Closure summary (required):"),
        "Threshold recovered and mitigation verified."
      );
      const closureReference = window.prompt(
        tx(
          "incident_workspace.prompts.closure_reference",
          "Closure evidence reference (required):"
        ),
        incident.ruleId ? `rule:${incident.ruleId}` : "evidence:manual-check"
      );
      if (
        !closureSummary
        || closureSummary.trim().length === 0
        || !closureReference
        || closureReference.trim().length === 0
      ) {
        return;
      }
      payload.closureSummary = closureSummary.trim();
      payload.closureEvidenceReferences = [closureReference.trim()];
    }

    setIncidentActionError(null);
    setIncidentActionMessage(null);
    setIncidentActionLoadingId(incident.incidentId);
    try {
      await transitionAgentOpsIncidentState(payload);
      setIncidentActionMessage(
        `Incident ${incident.title} moved to ${nextState}.`
      );
    } catch (error) {
      setIncidentActionError(error instanceof Error ? error.message : "Failed to transition incident state.");
    } finally {
      setIncidentActionLoadingId(null);
    }
  };

  const focusTrustCockpit = (agentId: Id<"objects">) => {
    setSelectedAgentId(agentId);
    setShowCreate(false);
    setEditingAgentId(null);
    setShowCatalog(false);
    setShowToolSetup(false);
    setShowAgentOps(false);
    setActiveTab("trust");
  };

  const openAgentOpsDashboard = () => {
    setSelectedAgentId(null);
    setShowCreate(false);
    setEditingAgentId(null);
    setShowCatalog(false);
    setShowToolSetup(false);
    setShowAgentOps(true);
    setActiveTab("trust");
  };

  const openAgentCatalog = () => {
    setShowCreate(false);
    setEditingAgentId(null);
    setShowToolSetup(false);
    setShowAgentOps(false);
    setShowCatalog(true);
  };

  const openAgentToolSetup = () => {
    setSelectedAgentId(null);
    setShowCreate(false);
    setEditingAgentId(null);
    setShowCatalog(false);
    setShowAgentOps(false);
    setShowToolSetup(true);
  };

  const openAgentCreationAssistant = (openContext: string) => {
    if (!sessionId || !currentOrg?.id) {
      return;
    }

    const aiAssistantWindowContract = getVoiceAssistantWindowContract("ai-assistant");
    const sourceOrganizationId = String(currentOrg.id);

    openWindow(
      aiAssistantWindowContract.windowId,
      aiAssistantWindowContract.title,
      <AIChatWindow
        initialLayoutMode="slick"
        initialPanel="agent-creation"
        openContext={openContext}
        sourceSessionId={sessionId}
        sourceOrganizationId={sourceOrganizationId}
      />,
      aiAssistantWindowContract.position,
      aiAssistantWindowContract.size,
      aiAssistantWindowContract.titleKey,
      aiAssistantWindowContract.iconId,
      {
        openContext,
        initialLayoutMode: "slick",
        initialPanel: "agent-creation",
        sourceSessionId: sessionId,
        sourceOrganizationId,
      }
    );
  };

  const openCatalogAssistant = async (card: AgentCatalogCard) => {
    let payload: Record<string, unknown> = {
      catalogAgentNumber: card.catalogAgentNumber,
      displayName: card.displayName,
      category: card.verticalCategory,
      tier: card.tier,
      runtimeAvailability: card.runtimeAvailability,
      autonomyDefault: card.autonomyDefault,
      published: card.published,
      templateReady: card.templateAvailability.hasTemplate,
      supportedAccessModes: card.supportedAccessModes,
      channelAffinity: card.channelAffinity,
      abilityTags: card.abilityTags,
      toolTags: card.toolTags.map((tag) => `${tag.key}:${tag.status}:${tag.requirementLevel}`),
      frameworkTags: card.frameworkTags,
      integrationTags: card.integrationTags.map((tag) => `${tag.key}:${tag.status}`),
    };

    if (sessionId && currentOrg?.id) {
      try {
        const productContext = await convex.query(
          apiAny.ai.agentStoreCatalog.getCatalogAgentProductContext as any,
          {
            sessionId,
            organizationId: currentOrg.id,
            catalogAgentNumber: card.catalogAgentNumber,
          },
        ) as { askAiContextPayload?: Record<string, unknown> } | null;
        if (productContext?.askAiContextPayload) {
          payload = productContext.askAiContextPayload;
        }
      } catch {
        // Keep fallback payload so Ask AI remains non-blocking if the query fails.
      }
    }

    const openContextPayload = encodeURIComponent(JSON.stringify(payload));
    openAgentCreationAssistant(`agent_catalog:${openContextPayload}`);
  };

  const openPrimaryOperatorCreation = () => {
    setShowCreate(false);
    setSelectedAgentId(null);
    setEditingAgentId(null);
    setShowCatalog(false);
    setShowToolSetup(false);
    setShowAgentOps(true);
    openAgentCreationAssistant("agent_creation:primary_operator");
  };

  const addRecommendedSpecialist = (blueprint: SpecialistCoverageBlueprint) => {
    if (!sessionId || !currentOrg?.id) {
      return;
    }

    const openContext = `agent_coverage:${blueprint.primarySpecialistRoleId}:${blueprint.defaultSubtype}`;
    openAgentCreationAssistant(openContext);
  };

  const openTerminalTimeline = () => {
    const terminalScope: AgentOpsScopeMode = canCrossOrg ? opsScopeMode : "org";
    if (fullScreen) {
      window.location.assign("/?app=terminal");
      return;
    }
    openWindow(
      "terminal",
      "Terminal",
      <TerminalWindow
        initialScope={terminalScope}
        scopeOrganizationId={effectiveScopeOrganizationId}
      />,
      { x: 120, y: 80 },
      { width: 900, height: 550 }
    );
  };

  if (!currentOrg || !sessionId) {
    return (
      <div className="h-full flex items-center justify-center" style={{ background: "var(--win95-bg)" }}>
        <p className="text-sm" style={{ color: "var(--win95-text)" }}>
          {tx("auth.required", "Sign in and select an organization to manage agents.")}
        </p>
      </div>
    );
  }

  const organizationId = currentOrg.id as Id<"organizations">;

  return (
    <div
      className={`flex flex-col ${fullScreen ? "min-h-screen" : "h-full"}`}
      style={{ background: "var(--win95-bg)" }}
    >
      {/* Header bar */}
      <div
        className="flex items-center justify-between px-4 py-2 border-b-2"
        style={{ borderColor: "var(--win95-border)" }}
      >
        <div className="flex items-center gap-2">
          {fullScreen && (
            <Link
              href="/"
              className="px-3 py-1.5 text-xs font-bold flex items-center gap-2 border-2 transition-colors mr-1"
              style={{
                borderColor: "var(--win95-border)",
                background: "var(--win95-button-face)",
                color: "var(--win95-text)",
              }}
              title={tx("header.back_to_desktop", "Back to Desktop")}
            >
              <ArrowLeft size={14} />
            </Link>
          )}
          <Bot size={16} />
          <span className="text-sm font-bold" style={{ color: "var(--win95-text)" }}>
            {tx("header.title", "AI Agents")}
          </span>
          {agents && (
            <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "var(--win95-bg-dark)", color: "var(--neutral-gray)" }}>
              {agents.length}{" "}
              {agents.length === 1
                ? tx("header.agent_count.singular", "agent")
                : tx("header.agent_count.plural", "agents")}
            </span>
          )}
          {controlCenterThreads && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded"
              style={{
                background: waitingOnHumanCount > 0 ? "#fee2e2" : "var(--win95-bg-dark)",
                color: waitingOnHumanCount > 0 ? "#991b1b" : "var(--neutral-gray)",
              }}
            >
              {waitingOnHumanCount} {tx("header.waiting_on_human", "waiting on human")}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={openAgentOpsDashboard}
            className="px-3 py-1.5 text-xs font-bold flex items-center gap-2 border transition-colors"
            style={{
              borderColor: "var(--win95-border)",
              background: showAgentOps ? "var(--desktop-shell-accent)" : "var(--win95-button-face)",
              color: "var(--win95-text)",
            }}
            title={tx("header.open_agent_ops", "Open Agent Ops")}
          >
            <Activity size={14} />
            {tx("header.agent_ops", "Agent Ops")}
          </button>
          <button
            onClick={openAgentCatalog}
            className="px-3 py-1.5 text-xs font-bold flex items-center gap-2 border transition-colors"
            style={{
              borderColor: "var(--win95-border)",
              background: showCatalog ? "var(--desktop-shell-accent)" : "var(--win95-button-face)",
              color: "var(--win95-text)",
            }}
            title={tx("header.open_agent_catalog", "Open Agent Catalog")}
          >
            <Sparkles size={14} />
            {tx("header.agent_catalog", "Agent Catalog")}
          </button>
          <button
            onClick={openAgentToolSetup}
            className="px-3 py-1.5 text-xs font-bold flex items-center gap-2 border transition-colors"
            style={{
              borderColor: "var(--win95-border)",
              background: showToolSetup ? "var(--desktop-shell-accent)" : "var(--win95-button-face)",
              color: "var(--win95-text)",
            }}
            title="Open Agent Tool Setup"
          >
            <Wrench size={14} />
            Tool Setup
          </button>
          {creditBalance && !hasZeroCredits && (
            <CreditBalance
              dailyCredits={creditBalance.dailyCredits}
              monthlyCredits={creditBalance.monthlyCredits}
              monthlyCreditsTotal={creditBalance.monthlyCreditsTotal}
              purchasedCredits={creditBalance.purchasedCredits}
              totalCredits={creditBalance.totalCredits}
              isUnlimited={isUnlimited}
              variant="compact"
            />
          )}
          {!fullScreen && (
            <Link
              href="/agents"
              className="px-3 py-1.5 text-xs font-bold flex items-center gap-2 border-2 transition-colors"
              style={{
                borderColor: "var(--win95-border)",
                background: "var(--win95-button-face)",
                color: "var(--win95-text)",
              }}
              title={tx("header.open_full_screen", "Open Full Screen")}
            >
              <Maximize2 size={14} />
            </Link>
          )}
        </div>
      </div>

      {/* Credit wall */}
      {hasZeroCredits && (
        <CreditWall
          currentTier={creditBalance?.planTier || "free"}
          creditsAvailable={0}
          variant="notification"
        />
      )}

      {/* Main content: master-detail */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Agent list */}
        <AgentListPanel
          agents={agents || []}
          stats={stats || []}
          selectedAgentId={selectedAgentId}
          onSelect={(id) => {
            setSelectedAgentId(id);
            setShowCreate(false);
            setEditingAgentId(null);
            setShowCatalog(false);
            setShowToolSetup(false);
            setShowAgentOps(false);
            setActiveTab("trust");
          }}
          onOpenCatalog={openAgentCatalog}
          sessionId={sessionId}
        />

        {/* Right: Detail or Create */}
        <div className="flex-1 overflow-y-auto">
          {showCreate && (
            <AgentCreateForm
              sessionId={sessionId}
              organizationId={organizationId}
              editingAgentId={editingAgentId}
              onSaved={(agentId) => {
                setShowCreate(false);
                setShowCatalog(false);
                setShowToolSetup(false);
                if (agentId) {
                  setSelectedAgentId(agentId);
                  setShowAgentOps(false);
                } else {
                  setShowAgentOps(true);
                }
              }}
              onCancel={() => {
                setShowCreate(false);
                if (!selectedAgentId) {
                  setShowAgentOps(true);
                }
              }}
            />
          )}
          {!showCreate && showCatalog && (
            <AgentStorePanel
              sessionId={sessionId}
              organizationId={organizationId}
              onBack={openAgentOpsDashboard}
              onOpenAssistant={openCatalogAssistant}
              onRequestCustomOrder={() => openAgentCreationAssistant("agent_catalog:custom_concierge")}
            />
          )}
          {!showCreate && !showCatalog && !showAgentOps && showToolSetup && (
            <AgentToolSetupPanel onBack={openAgentOpsDashboard} />
          )}
          {!showCreate && !showCatalog && showAgentOps && (
            <AgentOpsSection
              agents={agents || []}
              activeThreadCount={activeThreadCount}
              waitingOnHumanCount={waitingOnHumanCount}
              openEscalationCount={openEscalationCount}
              deliveryIssueCount={deliveryIssueCount}
              hotspots={agentOpsHotspots}
              visibilityScope={visibilityScope}
              canCrossOrg={canCrossOrg}
              scopeMode={opsScopeMode}
              onScopeModeChange={setOpsScopeMode}
              scopeOrganizationId={
                effectiveScopeOrganizationId
                  ? String(effectiveScopeOrganizationId)
                  : undefined
              }
              scopeOrganizationLabel={scopeOrganizationLabel}
              scopeOrganizations={scopeOrganizations}
              onScopeOrganizationChange={(organizationId) =>
                setOpsScopeOrganizationId(
                  organizationId as Id<"organizations">
                )
              }
              layerScopeAvailable={layerScopeAvailable}
              thresholds={incidentThresholds}
              incidents={incidentRows}
              incidentActionMessage={incidentActionMessage}
              incidentActionError={incidentActionError}
              incidentActionLoadingId={incidentActionLoadingId}
              onSyncThresholdIncidents={runIncidentThresholdSync}
              onTransitionIncidentState={transitionIncidentState}
              onOpenTerminal={openTerminalTimeline}
              onOpenTrust={focusTrustCockpit}
              onAddRecommendedSpecialist={addRecommendedSpecialist}
              integrationReadiness={integrationReadiness}
              onOpenPrimaryOperatorCreation={openPrimaryOperatorCreation}
              tx={tx}
            />
          )}
          {!showCreate && !showCatalog && !showAgentOps && !showToolSetup && selectedAgentId && (
            <AgentDetailPanel
              agentId={selectedAgentId}
              sessionId={sessionId}
              organizationId={organizationId}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onOpenAgentOps={openAgentOpsDashboard}
              onOpenAgentCatalog={openAgentCatalog}
              onEdit={() => {
                setEditingAgentId(selectedAgentId);
                setShowCreate(true);
              }}
            />
          )}
          {!showCreate && !showCatalog && !showAgentOps && !showToolSetup && !selectedAgentId && (
            <div className="h-full flex flex-col items-center justify-center gap-4">
              <Bot size={64} className="opacity-20" />
              <p className="text-sm" style={{ color: "var(--neutral-gray)" }}>
                {tx("empty.select_or_create", "Select an agent or create a specialist")}
              </p>
              <button
                onClick={openPrimaryOperatorCreation}
                className="flex items-center gap-2 px-4 py-2 text-xs font-medium border-2 transition-colors"
                style={{
                  background: "var(--win95-bg-light)",
                  borderColor: "var(--win95-border-light)",
                  color: "var(--win95-text)",
                }}
              >
                <Sparkles size={14} style={{ color: "var(--warning)" }} />
                {tx("empty.create_specialist", "Create Specialist")}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface AgentOpsSectionProps {
  agents: AgentRecord[];
  activeThreadCount: number;
  waitingOnHumanCount: number;
  openEscalationCount: number;
  deliveryIssueCount: number;
  hotspots: AgentOpsHotspot[];
  visibilityScope: AgentOpsVisibilityScope;
  canCrossOrg: boolean;
  scopeMode: AgentOpsScopeMode;
  onScopeModeChange: (scope: AgentOpsScopeMode) => void;
  scopeOrganizationId?: string;
  scopeOrganizationLabel: string;
  scopeOrganizations: AgentOpsScopeOption[];
  onScopeOrganizationChange: (organizationId: string) => void;
  layerScopeAvailable: boolean;
  thresholds: AgentOpsThresholdSnapshotRecord[];
  incidents: AgentOpsIncidentRecord[];
  incidentActionMessage: string | null;
  incidentActionError: string | null;
  incidentActionLoadingId: string | null;
  onSyncThresholdIncidents: () => void;
  onTransitionIncidentState: (
    incident: AgentOpsIncidentRecord,
    nextState: "acknowledged" | "mitigated" | "closed"
  ) => void;
  onOpenTerminal: () => void;
  onOpenTrust: (agentId: Id<"objects">) => void;
  onAddRecommendedSpecialist: (blueprint: SpecialistCoverageBlueprint) => void;
  integrationReadiness: AgentIntegrationReadiness;
  onOpenPrimaryOperatorCreation: () => void;
  tx: (key: string, fallback: string, params?: Record<string, string | number>) => string;
}

function AgentOpsSection({
  agents,
  activeThreadCount,
  waitingOnHumanCount,
  openEscalationCount,
  deliveryIssueCount,
  hotspots,
  visibilityScope,
  canCrossOrg,
  scopeMode,
  onScopeModeChange,
  scopeOrganizationId,
  scopeOrganizationLabel,
  scopeOrganizations,
  onScopeOrganizationChange,
  layerScopeAvailable,
  thresholds,
  incidents,
  incidentActionMessage,
  incidentActionError,
  incidentActionLoadingId,
  onSyncThresholdIncidents,
  onTransitionIncidentState,
  onOpenTerminal,
  onOpenTrust,
  onAddRecommendedSpecialist,
  integrationReadiness,
  onOpenPrimaryOperatorCreation,
  tx,
}: AgentOpsSectionProps) {
  const topTrustHotspot = hotspots.find((hotspot) => hotspot.canOpenTrust) || null;
  const scopeBadgeLabel =
    visibilityScope === "super_admin"
      ? `${scopeMode === "layer"
        ? tx("agent_ops.scope_badge.layer_scope", "Layer scope")
        : tx("agent_ops.scope_badge.org_scope", "Org scope")} · ${scopeOrganizationLabel}`
      : tx("agent_ops.scope_badge.org_scope", "Org scope");
  const currentAgents = useMemo(() => {
    return agents
      .map((agent) => {
        const displayName = agent.customProperties?.displayName?.trim();
        const fallbackName = agent.name?.trim();
          const resolvedName = displayName && displayName.length > 0
            ? displayName
            : fallbackName && fallbackName.length > 0
              ? fallbackName
              : tx("agent_coverage.current_agents.unnamed", "Unnamed agent");

        const rawSubtype = agent.subtype?.toLowerCase();
        const subtype: SpecialistSubtype =
          rawSubtype === "booking_agent"
          || rawSubtype === "customer_support"
          || rawSubtype === "sales_assistant"
            ? rawSubtype
            : "general";

        return {
          id: String(agent._id),
          name: resolvedName,
          subtype,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [agents]);

  const coverageRows = useMemo(() => {
    return SPECIALIST_COVERAGE_BLUEPRINTS.map((blueprint) => {
      const matchedAgents = currentAgents
        .filter((agent) => blueprint.requiredSubtypes.includes(agent.subtype))
        .map((agent) => agent.name);
      const coverageCount = matchedAgents.length;
      const isCovered = coverageCount > 0;

      const integrationGapRules = blueprint.integrationPrerequisites
        .map((requirementId) => COVERAGE_INTEGRATION_RULES[requirementId])
        .filter((rule) => !rule.isMet(integrationReadiness));
      const integrationGaps = integrationGapRules.map((rule) => rule.gap);
      const integrationUnblockingSteps = integrationGapRules.map((rule) => rule.step);

      const blockingGaps: string[] = [];
      const unblockingSteps: string[] = [];

      if (!isCovered) {
        blockingGaps.push("Coverage gap: no active specialist currently maps to this capability pack.");
        unblockingSteps.push(
          `Create a ${blueprint.defaultSubtype.replace(/_/g, " ")} specialist so hidden routing can execute this pack.`,
        );
      }

      if (integrationGaps.length > 0) {
        blockingGaps.push(...integrationGaps);
        unblockingSteps.push(...integrationUnblockingSteps);
      }

      if (blueprint.unknownPrerequisites.length > 0) {
        blockingGaps.push(
          ...blueprint.unknownPrerequisites.map(
            (prerequisite) => `Unknown prerequisite: ${prerequisite}`,
          ),
        );
        unblockingSteps.push(...blueprint.unknownUnblockingSteps);
      }

      const availability: CoverageAvailability =
        blockingGaps.length === 0 ? "available_now" : "blocked";

      return {
        ...blueprint,
        coverageCount,
        availability,
        isCovered,
        matchedAgents,
        blockingGaps,
        unblockingSteps: Array.from(new Set(unblockingSteps)),
      };
    });
  }, [currentAgents, integrationReadiness]);
  const [selectedOutcomeId, setSelectedOutcomeId] =
    useState<AgentNeedOutcomeId>("book_appointment");
  const specialistCoverageRows = useMemo(() => {
    const roleIds = Object.keys(SPECIALIST_ROLE_CONTRACTS) as SpecialistRoleId[];

    return roleIds.map((roleId) => {
      const roleContract = SPECIALIST_ROLE_CONTRACTS[roleId];
      const mappedBlueprints = coverageRows.filter((row) =>
        roleContract.coverageBlueprintIds.includes(row.id)
      );

      if (mappedBlueprints.length === 0) {
        return {
          id: roleId,
          specialistName: roleContract.roleName,
          availability: "planned" as const,
          isCovered: false,
        };
      }

      const hasBlockedBlueprint = mappedBlueprints.some(
        (row) => row.availability === "blocked",
      );
      const isCovered = mappedBlueprints.some((row) => row.isCovered);

      return {
        id: roleId,
        specialistName: roleContract.roleName,
        availability: hasBlockedBlueprint ? ("planned" as const) : ("available_now" as const),
        isCovered,
      };
    });
  }, [coverageRows]);
  const outcomeRecommendation = useMemo(() => {
    return buildAgentNeedRecommendation({
      outcomeId: selectedOutcomeId,
      coverageRows: specialistCoverageRows,
      readiness: integrationReadiness,
    });
  }, [integrationReadiness, selectedOutcomeId, specialistCoverageRows]);

  const blockedCapabilityCount = coverageRows.filter(
    (row) => row.availability === "blocked"
  ).length;

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      <section
        className="border p-3 space-y-3"
        style={{
          borderColor: "var(--window-document-border)",
          background: "var(--window-document-surface, var(--desktop-shell-accent))",
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div
              className="text-xs font-bold flex items-center gap-1.5"
              style={{ color: "var(--window-document-text)" }}
            >
              <Shield size={12} />
              {tx("agent_ops.title", "Agent Ops")}
            </div>
            <p className="mt-1 text-xs" style={{ color: "var(--neutral-gray)" }}>
              {tx(
                "agent_ops.description",
                "Triage scoped agent operations here, then drill into each agent's Trust tab for control-center queue, lineage, and checkpoint timeline."
              )}
            </p>
          </div>
          <span
            className="text-xs px-2 py-1 border rounded"
            style={{ borderColor: "var(--window-document-border)", color: "var(--neutral-gray)" }}
          >
            {scopeBadgeLabel}
          </span>
        </div>
        {canCrossOrg && (
          <div className="border p-2 space-y-2" style={{ borderColor: "var(--window-document-border)" }}>
            <div className="grid gap-2 md:grid-cols-2">
              <label className="text-xs font-medium" style={{ color: "var(--window-document-text)" }}>
                {tx("agent_ops.scope.organization_label", "Scope organization")}
                <select
                  value={scopeOrganizationId || ""}
                  onChange={(event) => onScopeOrganizationChange(event.target.value)}
                  disabled={scopeOrganizations.length === 0}
                  className="mt-1 w-full border px-2 py-1 text-xs"
                  style={{
                    borderColor: "var(--window-document-border)",
                    background: "var(--window-document-card-bg, var(--window-document-bg))",
                    color: "var(--window-document-text)",
                  }}
                >
                  {scopeOrganizations.map((organization) => (
                    <option key={organization.organizationId} value={organization.organizationId}>
                      {tx("agent_ops.scope.layer_prefix", "L")}
                      {organization.layer} · {organization.organizationName}
                    </option>
                  ))}
                </select>
              </label>
              <div className="text-xs">
                <div className="font-medium" style={{ color: "var(--window-document-text)" }}>
                  {tx("agent_ops.scope.depth_label", "Scope depth")}
                </div>
                <div className="mt-1 inline-flex border" style={{ borderColor: "var(--window-document-border)" }}>
                  <button
                    onClick={() => onScopeModeChange("org")}
                    className="px-2 py-1 text-xs"
                    style={{
                      background: scopeMode === "org" ? "var(--window-document-border)" : "transparent",
                      color: "var(--window-document-text)",
                    }}
                  >
                    {tx("agent_ops.scope.org_button", "Org")}
                  </button>
                  <button
                    onClick={() => onScopeModeChange("layer")}
                    disabled={!layerScopeAvailable}
                    className="px-2 py-1 text-xs disabled:opacity-50"
                    style={{
                      background: scopeMode === "layer" ? "var(--window-document-border)" : "transparent",
                      color: "var(--window-document-text)",
                    }}
                    title={layerScopeAvailable
                      ? tx(
                        "agent_ops.scope.layer_available_title",
                        "Include selected org and child orgs"
                      )
                      : tx(
                        "agent_ops.scope.layer_unavailable_title",
                        "Layer scope unavailable for selected org"
                      )}
                  >
                    {tx("agent_ops.scope.layer_button", "Layer")}
                  </button>
                </div>
                {!layerScopeAvailable && (
                  <div className="mt-1" style={{ color: "var(--neutral-gray)" }}>
                    {tx(
                      "agent_ops.scope.layer_unavailable_description",
                      "Layer scope unavailable for selected organization."
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={onOpenTerminal}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border transition-colors"
            style={{
              borderColor: "var(--window-document-border)",
              background: "var(--window-document-card-bg, var(--window-document-bg))",
              color: "var(--window-document-text)",
            }}
          >
            <Terminal size={13} />
            {tx("agent_ops.actions.open_terminal_timeline", "Open Terminal Timeline")}
          </button>
          <button
            onClick={() => {
              if (topTrustHotspot) {
                onOpenTrust(topTrustHotspot.agentId);
              }
            }}
            disabled={!topTrustHotspot}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border transition-colors disabled:opacity-60"
            style={{
              borderColor: "var(--window-document-border)",
              background: "var(--window-document-card-bg, var(--window-document-bg))",
              color: "var(--window-document-text)",
            }}
          >
            <Activity size={13} />
            {tx("agent_ops.actions.open_top_trust_cockpit", "Open Top Trust Cockpit")}
          </button>
          <button
            onClick={onOpenPrimaryOperatorCreation}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border transition-colors"
            style={{
              borderColor: "var(--window-document-border)",
              background: "var(--window-document-card-bg, var(--window-document-bg))",
              color: "var(--window-document-text)",
            }}
          >
            <Sparkles size={13} />
            {tx("agent_ops.actions.create_specialist", "Create Specialist")}
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <OpsMetric
          icon={<MessageSquare size={13} />}
          label={tx("metrics.active_threads", "Active threads")}
          value={String(activeThreadCount)}
          tone="var(--tone-info)"
        />
        <OpsMetric
          icon={<AlertTriangle size={13} />}
          label={tx("metrics.waiting_on_human", "Waiting on human")}
          value={String(waitingOnHumanCount)}
          tone={waitingOnHumanCount > 0 ? "var(--tone-danger)" : "var(--tone-success)"}
        />
        <OpsMetric
          icon={<Shield size={13} />}
          label={tx("metrics.open_escalations", "Open escalations")}
          value={String(openEscalationCount)}
          tone={openEscalationCount > 0 ? "var(--tone-warning)" : "var(--tone-success)"}
        />
        <OpsMetric
          icon={<Activity size={13} />}
          label={tx("metrics.delivery_issues", "Delivery issues")}
          value={String(deliveryIssueCount)}
          tone={deliveryIssueCount > 0 ? "var(--tone-danger)" : "var(--tone-success)"}
        />
      </section>

      <section
        className="border p-3 space-y-3"
        style={{
          borderColor: "var(--window-document-border)",
          background: "var(--window-document-surface, var(--desktop-shell-accent))",
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
              {tx("recommender.title", "Which agent do I need now?")}
            </div>
            <p className="mt-1 text-xs" style={{ color: "var(--neutral-gray)" }}>
              {tx(
                "recommender.description",
                "Outcome-first recommender based on active coverage plus connected integrations. Gaps are listed before any activation suggestion."
              )}
            </p>
          </div>
          <label className="text-xs" style={{ color: "var(--window-document-text)" }}>
            {tx("recommender.requested_outcome", "Requested outcome")}
            <select
              value={selectedOutcomeId}
              onChange={(event) =>
                setSelectedOutcomeId(event.target.value as AgentNeedOutcomeId)
              }
              className="mt-1 w-full border px-2 py-1 text-xs"
              style={{
                borderColor: "var(--window-document-border)",
                background: "var(--window-document-card-bg, var(--window-document-bg))",
                color: "var(--window-document-text)",
              }}
            >
              {AGENT_NEED_OUTCOME_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="text-xs" style={{ color: "var(--neutral-gray)" }}>
          {outcomeRecommendation.outcome.description}
        </div>

        <div className="border p-2 space-y-2" style={{ borderColor: "var(--window-document-border)" }}>
          <div className="text-xs font-medium" style={{ color: "var(--window-document-text)" }}>
            {tx("recommender.enabled_integrations", "Enabled integrations")}
          </div>
          {outcomeRecommendation.enabledIntegrationLabels.length === 0 ? (
            <div className="text-xs" style={{ color: "var(--tone-warning)" }}>
              {tx(
                "recommender.no_integrations",
                "No relevant integrations detected yet. Connect integrations in the Integrations window first."
              )}
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {outcomeRecommendation.enabledIntegrationLabels.map((label) => (
                <span
                  key={label}
                  className="rounded border px-1.5 py-0.5 text-xs"
                  style={{
                    borderColor: "var(--window-document-border)",
                    color: "var(--window-document-text)",
                    background: "var(--window-document-card-bg, var(--window-document-bg))",
                  }}
                >
                  {label}
                </span>
              ))}
            </div>
          )}
        </div>

        {outcomeRecommendation.integrationGaps.length > 0 && (
          <div className="border p-2" style={{ borderColor: "var(--tone-warning)" }}>
            <div className="text-xs font-medium" style={{ color: "var(--tone-warning)" }}>
              {tx("recommender.integration_gaps", "Integration gaps to close first")}
            </div>
            <ul className="mt-1 list-disc pl-4 text-xs" style={{ color: "var(--neutral-gray)" }}>
              {outcomeRecommendation.integrationGaps.map((gap) => (
                <li key={gap}>{gap}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-2">
          {outcomeRecommendation.cards.map((card) => {
            const coverageBlueprint = coverageRows.find(
              (row) => row.id === card.coverageId
            );
            const capabilityStatus: CoverageAvailability =
              coverageBlueprint?.availability
              || (card.availability === "available_now" ? "available_now" : "blocked");
            const cardGaps = Array.from(
              new Set([
                ...(coverageBlueprint?.blockingGaps || []),
                ...card.integrationGaps,
                ...card.toolGaps,
              ]),
            );
            const cardUnblockingSteps = Array.from(
              new Set([
                ...(coverageBlueprint?.unblockingSteps || []),
              ]),
            );
            const statusLabel = capabilityStatus === "available_now" ? "available_now" : "blocked";
            const statusColor =
              capabilityStatus === "available_now" ? "var(--tone-success)" : "var(--tone-warning)";
            const canAddSpecialist = Boolean(coverageBlueprint && !coverageBlueprint.isCovered);

            return (
              <div
                key={card.coverageId}
                className="border p-2 space-y-2"
                style={{
                  borderColor: "var(--window-document-border)",
                  background: "var(--window-document-card-bg, var(--window-document-bg))",
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="text-xs font-medium" style={{ color: "var(--window-document-text)" }}>
                    {card.specialistName}
                  </div>
                  <span
                    className="rounded border px-1.5 py-0.5 text-xs"
                    style={{ borderColor: statusColor, color: statusColor }}
                  >
                    {statusLabel}
                  </span>
                </div>

                {cardGaps.length > 0 ? (
                  <ul className="list-disc pl-4 text-xs" style={{ color: "var(--neutral-gray)" }}>
                    {cardGaps.map((gap) => (
                      <li key={`${card.coverageId}:${gap}`}>{gap}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-xs" style={{ color: "var(--tone-success)" }}>
                    {tx(
                      "recommender.no_blocking_gaps",
                      "No blocking gaps detected for this outcome."
                    )}
                  </div>
                )}

                {cardUnblockingSteps.length > 0 && capabilityStatus === "blocked" && (
                  <div className="border p-2" style={{ borderColor: "var(--window-document-border)" }}>
                    <div className="text-xs font-medium" style={{ color: "var(--window-document-text)" }}>
                      {tx("recommender.unblocking_steps", "Unblocking steps")}
                    </div>
                    <ul className="mt-1 list-disc pl-4 text-xs" style={{ color: "var(--neutral-gray)" }}>
                      {cardUnblockingSteps.map((step) => (
                        <li key={`${card.coverageId}:${step}`}>{step}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {canAddSpecialist && coverageBlueprint && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                      {tx(
                        "recommender.one_click_description",
                        "One-click action opens guided specialist creation in AI Assistant."
                      )}
                    </span>
                    <button
                      onClick={() => onAddRecommendedSpecialist(coverageBlueprint)}
                      className="border px-2 py-1 text-xs font-medium"
                      style={{
                        borderColor: "var(--window-document-border)",
                        color: "var(--window-document-text)",
                        background: "var(--window-document-card-bg, var(--window-document-bg))",
                      }}
                    >
                      {tx("recommender.add_recommended_specialist", "Add recommended specialist")}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section
        className="border p-3 space-y-3"
        style={{
          borderColor: "var(--window-document-border)",
          background: "var(--window-document-surface, var(--desktop-shell-accent))",
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
              {tx("agent_coverage.title", "Agent Coverage")}
            </div>
            <p className="mt-1 text-xs" style={{ color: "var(--neutral-gray)" }}>
              {tx(
                "agent_coverage.description",
                "Capability-pack contract for founder demos. Status is deterministic: `available_now` or `blocked`."
              )}
            </p>
          </div>
          <span
            className="text-xs px-2 py-1 border rounded"
            style={{
              borderColor: "var(--window-document-border)",
              color: blockedCapabilityCount > 0 ? "var(--tone-warning)" : "var(--tone-success)",
            }}
          >
            {blockedCapabilityCount}{" "}
            {blockedCapabilityCount === 1
              ? tx("agent_coverage.blocked_pack.singular", "blocked capability pack")
              : tx("agent_coverage.blocked_pack.plural", "blocked capability packs")}
          </span>
        </div>

        <div className="border p-2" style={{ borderColor: "var(--window-document-border)" }}>
          <div className="text-xs font-medium" style={{ color: "var(--window-document-text)" }}>
            {tx("agent_coverage.current_agents", "Current agents")} ({currentAgents.length})
          </div>
          {currentAgents.length === 0 ? (
            <div className="mt-1 text-xs" style={{ color: "var(--neutral-gray)" }}>
              {tx(
                "agent_coverage.no_agents",
                "No agents yet. Add your first recommended specialist below."
              )}
            </div>
          ) : (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {currentAgents.map((agent) => (
                <span
                  key={agent.id}
                  className="rounded border px-1.5 py-0.5 text-xs"
                  style={{
                    borderColor: "var(--window-document-border)",
                    color: "var(--window-document-text)",
                    background: "var(--window-document-card-bg, var(--window-document-bg))",
                  }}
                >
                  {agent.name} · {agent.subtype.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          {coverageRows.map((row) => {
            const isBlocked = row.availability === "blocked";
            return (
              <div
                key={row.id}
                className="border p-2"
                style={{
                  borderColor: "var(--window-document-border)",
                  background: "var(--window-document-card-bg, var(--window-document-bg))",
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs font-medium" style={{ color: "var(--window-document-text)" }}>
                      {row.specialistName}
                    </div>
                    <div className="mt-0.5 text-xs" style={{ color: "var(--neutral-gray)" }}>
                      {row.objective}
                    </div>
                    <div className="mt-0.5 text-xs" style={{ color: "var(--neutral-gray)" }}>
                      {tx("agent_coverage.pack", "Pack:")} {row.packId}
                    </div>
                  </div>
                  <span
                    className="rounded border px-1.5 py-0.5 text-xs"
                    style={{
                      borderColor: isBlocked ? "var(--tone-warning)" : "var(--tone-success)",
                      color: isBlocked ? "var(--tone-warning)" : "var(--tone-success)",
                    }}
                  >
                    {row.availability}
                  </span>
                </div>

                {row.matchedAgents.length > 0 && (
                  <div className="mt-1 text-xs" style={{ color: "var(--neutral-gray)" }}>
                    {tx("agent_coverage.covered_by", "Covered by:")} {row.matchedAgents.join(", ")}
                  </div>
                )}

                <div className="mt-1 text-xs" style={{ color: "var(--neutral-gray)" }}>
                  {row.recommendationHint}
                </div>

                {isBlocked && row.blockingGaps.length > 0 && (
                  <div className="mt-2 border p-2" style={{ borderColor: "var(--window-document-border)" }}>
                    <div className="text-xs font-medium" style={{ color: "var(--window-document-text)" }}>
                      {tx("agent_coverage.blocking_reasons", "Blocking reasons")}
                    </div>
                    <ul className="mt-1 list-disc pl-4 text-xs" style={{ color: "var(--neutral-gray)" }}>
                      {row.blockingGaps.map((gap) => (
                        <li key={`${row.id}:${gap}`}>{gap}</li>
                      ))}
                    </ul>
                    {row.unblockingSteps.length > 0 && (
                      <>
                        <div className="mt-2 text-xs font-medium" style={{ color: "var(--window-document-text)" }}>
                          {tx("agent_coverage.unblocking_steps", "Unblocking steps")}
                        </div>
                        <ul className="mt-1 list-disc pl-4 text-xs" style={{ color: "var(--neutral-gray)" }}>
                          {row.unblockingSteps.map((step) => (
                            <li key={`${row.id}:${step}`}>{step}</li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                )}

                {!row.isCovered && (
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="text-xs" style={{ color: "var(--neutral-gray)" }}>
                      {tx(
                        "agent_coverage.one_click_description",
                        "One-click action opens guided specialist creation in AI Assistant."
                      )}
                    </span>
                    <button
                      onClick={() => onAddRecommendedSpecialist(row)}
                      className="border px-2 py-1 text-xs font-medium"
                      style={{
                        borderColor: "var(--window-document-border)",
                        color: "var(--window-document-text)",
                        background: "var(--window-document-card-bg, var(--window-document-bg))",
                      }}
                    >
                      {tx("agent_coverage.add_recommended_specialist", "Add recommended specialist")}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section
        className="border p-3 space-y-2"
        style={{
          borderColor: "var(--window-document-border)",
          background: "var(--window-document-surface, var(--desktop-shell-accent))",
        }}
      >
        <div className="text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
          {tx("control_center_queue.title", "Control-Center Agent Queue")}
        </div>
        <p className="text-xs" style={{ color: "var(--neutral-gray)" }}>
          {tx(
            "control_center_queue.description",
            "Prioritized by waiting-on-human, escalation pressure, and latest activity. Use \"Open Trust\" to continue in the linked trust/control-center drilldown."
          )}
        </p>

        {hotspots.length === 0 && (
          <div className="border p-3 text-xs" style={{ borderColor: "var(--window-document-border)", color: "var(--neutral-gray)" }}>
            {tx(
              "control_center_queue.empty",
              "No active control-center threads in this scope."
            )}
          </div>
        )}

        <div className="space-y-2">
          {hotspots.map((hotspot) => (
            <div
              key={`${hotspot.organizationId}:${hotspot.agentId}`}
              className="border p-2"
              style={{ borderColor: "var(--window-document-border)", background: "var(--window-document-card-bg, var(--window-document-bg))" }}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs font-medium" style={{ color: "var(--window-document-text)" }}>
                    {hotspot.agentName}
                  </div>
                  <div className="mt-0.5 text-xs" style={{ color: "var(--neutral-gray)" }}>
                    {tx("control_center_queue.last", "Last:")} {hotspot.latestChannel} · {hotspot.latestContact}
                  </div>
                  {visibilityScope === "super_admin" && (
                    <div className="mt-0.5 text-xs" style={{ color: "var(--neutral-gray)" }}>
                      {tx("control_center_queue.scope_org", "Scope org:")}{" "}
                      {tx("control_center_queue.layer_prefix", "L")}
                      {hotspot.organizationLayer} · {hotspot.organizationName}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => onOpenTrust(hotspot.agentId)}
                  disabled={!hotspot.canOpenTrust}
                  className="border px-2 py-1 text-xs font-medium disabled:opacity-50"
                  style={{ borderColor: "var(--window-document-border)", color: "var(--window-document-text)" }}
                  title={
                    hotspot.canOpenTrust
                      ? tx("control_center_queue.open_trust_cockpit", "Open trust cockpit")
                      : tx(
                        "control_center_queue.switch_org_required",
                        "Switch active organization to drill into this agent trust cockpit."
                      )
                  }
                >
                  {tx("control_center_queue.open_trust", "Open Trust")}
                </button>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-1 text-xs" style={{ color: "var(--neutral-gray)" }}>
                <div>{tx("control_center_queue.threads", "Threads:")} {hotspot.threadCount}</div>
                <div>{tx("control_center_queue.waiting", "Waiting:")} {hotspot.waitingOnHumanCount}</div>
                <div>{tx("control_center_queue.escalations", "Escalations:")} {hotspot.escalationCount}</div>
                <div>{tx("control_center_queue.delivery_issues", "Delivery issues:")} {hotspot.deliveryIssues}</div>
              </div>
              <div className="mt-1 text-xs" style={{ color: "var(--neutral-gray)" }}>
                {tx("control_center_queue.updated", "Updated")} {timeAgo(hotspot.latestUpdateAt)}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section
        className="border p-3 space-y-3"
        style={{
          borderColor: "var(--window-document-border)",
          background: "var(--window-document-surface, var(--desktop-shell-accent))",
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-xs font-bold" style={{ color: "var(--window-document-text)" }}>
              {tx("incident_workspace.title", "Incident Workspace")}
            </div>
            <p className="mt-1 text-xs" style={{ color: "var(--neutral-gray)" }}>
              {tx(
                "incident_workspace.description",
                "Deterministic states: open, acknowledged, mitigated, closed with required evidence."
              )}
            </p>
          </div>
          <button
            onClick={onSyncThresholdIncidents}
            disabled={incidentActionLoadingId === "threshold-sync"}
            className="border px-2 py-1 text-xs font-medium disabled:opacity-50"
            style={{
              borderColor: "var(--window-document-border)",
              color: "var(--window-document-text)",
            }}
          >
            {incidentActionLoadingId === "threshold-sync"
              ? tx("incident_workspace.syncing", "Syncing...")
              : tx("incident_workspace.sync_threshold_incidents", "Sync Threshold Incidents")}
          </button>
        </div>

        {incidentActionMessage && (
          <div
            className="border p-2 text-xs"
            style={{
              borderColor: "var(--color-success)",
              color: "var(--color-success)",
              background: "var(--color-success-subtle)",
            }}
          >
            {incidentActionMessage}
          </div>
        )}
        {incidentActionError && (
          <div
            className="border p-2 text-xs"
            style={{
              borderColor: "var(--color-error)",
              color: "var(--color-error)",
              background: "var(--color-error-subtle)",
            }}
          >
            {incidentActionError}
          </div>
        )}

        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          {thresholds.map((threshold) => (
            <div
              key={threshold.metric}
              className="border p-2"
              style={{
                borderColor: "var(--window-document-border)",
                background: "var(--window-document-card-bg, var(--window-document-bg))",
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-medium" style={{ color: "var(--window-document-text)" }}>
                  {threshold.displayName}
                </div>
                <span
                  className="rounded border px-1.5 py-0.5 text-xs"
                  style={{
                    borderColor: severityToneColor(threshold.severity),
                    color: severityToneColor(threshold.severity),
                  }}
                >
                  {threshold.severity}
                </span>
              </div>
              <div className="mt-1 text-xs" style={{ color: "var(--neutral-gray)" }}>
                {tx(
                  "incident_workspace.threshold_summary",
                  "observed {{observed}}% · warn {{warn}}% · critical {{critical}}%",
                  {
                    observed: (threshold.observedValue * 100).toFixed(1),
                    warn: (threshold.warningThreshold * 100).toFixed(1),
                    critical: (threshold.criticalThreshold * 100).toFixed(1),
                  }
                )}
              </div>
              <div className="mt-1 text-xs" style={{ color: "var(--neutral-gray)" }}>
                {tx(
                  "incident_workspace.threshold_rule_sample",
                  "rule {{ruleId}} · sample {{sampleSize}}",
                  { ruleId: threshold.ruleId, sampleSize: threshold.sampleSize }
                )}
              </div>
            </div>
          ))}
        </div>

        {incidents.length === 0 && (
          <div className="border p-3 text-xs" style={{ borderColor: "var(--window-document-border)", color: "var(--neutral-gray)" }}>
            {tx(
              "incident_workspace.empty",
              "No incidents recorded for this scope yet."
            )}
          </div>
        )}

        <div className="space-y-2">
          {incidents.map((incident) => {
            const nextState =
              incident.state === "open"
                ? "acknowledged"
                : incident.state === "acknowledged"
                  ? "mitigated"
                  : incident.state === "mitigated"
                    ? "closed"
                    : null;
            return (
              <div
                key={incident.incidentId}
                className="border p-2"
                style={{
                  borderColor: "var(--window-document-border)",
                  background: "var(--window-document-card-bg, var(--window-document-bg))",
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs font-medium" style={{ color: "var(--window-document-text)" }}>
                      {incident.title}
                    </div>
                    <div className="mt-0.5 text-xs" style={{ color: "var(--neutral-gray)" }}>
                      {tx(
                        "incident_workspace.state_severity",
                        "state {{state}} · severity {{severity}}",
                        { state: incident.state, severity: incident.severity }
                      )}
                      {incident.ruleId ? ` · ${incident.ruleId}` : ""}
                    </div>
                    <div className="mt-0.5 text-xs" style={{ color: "var(--neutral-gray)" }}>
                      {tx(
                        "incident_workspace.owner_updated",
                        "owner {{owner}} · updated {{updatedAt}}",
                        {
                          owner: incident.ownerUserId || tx("incident_workspace.unassigned", "unassigned"),
                          updatedAt: timeAgo(incident.updatedAt),
                        }
                      )}
                    </div>
                  </div>
                  {nextState && (
                    <button
                      onClick={() => onTransitionIncidentState(incident, nextState)}
                      disabled={incidentActionLoadingId === incident.incidentId}
                      className="border px-2 py-1 text-xs font-medium disabled:opacity-50"
                      style={{
                        borderColor: "var(--window-document-border)",
                        color: "var(--window-document-text)",
                      }}
                    >
                      {incidentActionLoadingId === incident.incidentId
                        ? tx("incident_workspace.updating", "Updating...")
                        : tx("incident_workspace.mark_state", "Mark {{state}}", {
                          state: nextState,
                        })}
                    </button>
                  )}
                </div>
                {incident.mitigationLog.length > 0 && (
                  <div className="mt-2 text-xs" style={{ color: "var(--neutral-gray)" }}>
                    {tx("incident_workspace.last_mitigation", "Last mitigation:")}{" "}
                    {incident.mitigationLog[incident.mitigationLog.length - 1]?.note}
                  </div>
                )}
                {incident.closureEvidence && (
                  <div className="mt-2 text-xs" style={{ color: "var(--neutral-gray)" }}>
                    {tx("incident_workspace.closure_evidence", "Closure evidence:")}{" "}
                    {incident.closureEvidence.summary}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

interface OpsMetricProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: string;
}

function OpsMetric({ icon, label, value, tone }: OpsMetricProps) {
  return (
    <div
      className="border p-3"
      style={{
        borderColor: "var(--window-document-border)",
        background: "var(--window-document-surface, var(--desktop-shell-accent))",
      }}
    >
      <div className="flex items-center gap-1.5 text-xs" style={{ color: tone }}>
        {icon}
        {label}
      </div>
      <div className="mt-1 text-xl font-bold" style={{ color: "var(--window-document-text)" }}>
        {value}
      </div>
    </div>
  );
}

function severityToneColor(severity: "ok" | "warning" | "critical"): string {
  if (severity === "critical") {
    return "var(--tone-danger)";
  }
  if (severity === "warning") {
    return "var(--tone-warning)";
  }
  return "var(--tone-success)";
}

function timeAgo(timestamp: number): string {
  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return "n/a";
  }

  const deltaSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (deltaSeconds < 60) return `${deltaSeconds}s ago`;
  const deltaMinutes = Math.floor(deltaSeconds / 60);
  if (deltaMinutes < 60) return `${deltaMinutes}m ago`;
  const deltaHours = Math.floor(deltaMinutes / 60);
  if (deltaHours < 24) return `${deltaHours}h ago`;
  const deltaDays = Math.floor(deltaHours / 24);
  return `${deltaDays}d ago`;
}
