"use client"

export interface OperatorCollaborationSpecialistSurface {
  agentId: string
  displayName: string
  dmThreadId: string
  roleLabel: "specialist" | "active_specialist"
  visibilityScope: "operator_orchestrator_specialist"
  active: boolean
}

export interface OperatorCollaborationSyncCheckpointState {
  status: "issued" | "resumed" | "aborted" | "expired"
  tokenId: string
  token: string
  lineageId: string
  dmThreadId: string
  groupThreadId: string
  issuedForEventId: string
  issuedAt: number
  expiresAt: number
  abortReason?: string
}

export interface OperatorCollaborationContextPayload {
  threadId: string
  sessionId: string
  groupThreadId: string
  lineageId: string
  orchestratorAgentId: string
  orchestratorLabel: string
  activeSpecialistAgentId?: string
  specialists: OperatorCollaborationSpecialistSurface[]
  syncCheckpoint?: OperatorCollaborationSyncCheckpointState
}

export type OperatorCollaborationTimelineKind =
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
  | "operator"

export type OperatorCollaborationTimelineThreadType =
  | "group_thread"
  | "dm_thread"
  | "session_thread"

export interface OperatorCollaborationTimelineEvent {
  eventId: string
  eventOrdinal: number
  kind: OperatorCollaborationTimelineKind
  occurredAt: number
  title: string
  summary: string
  correlationId: string
  threadType?: OperatorCollaborationTimelineThreadType
  groupThreadId?: string
  dmThreadId?: string
  lineageId?: string
  workflowKey?: string
  authorityIntentType?: string
}

export interface OperatorCollaborationThreadDrillDown {
  threadId: string
  timelineEvents: OperatorCollaborationTimelineEvent[]
}

export type CollaborationSurfaceSelection =
  | {
      kind: "group"
    }
  | {
      kind: "dm"
      dmThreadId: string
      specialistAgentId: string
      specialistLabel: string
    }
