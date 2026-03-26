import type { OrgAgentActionItemStatus } from "../schemas/orgAgentActionRuntimeSchemas";

export const ORG_ACTION_APPROVAL_TRANSITION_CONTRACT_VERSION =
  "org_action_approval_transition_v1" as const;
export const ORG_ACTION_APPROVAL_PACKET_CONTRACT_VERSION =
  "org_action_approval_packet_v1" as const;

export type OrgActionApprovalEvent =
  | "approve"
  | "reject"
  | "assign"
  | "expire"
  | "take_over";

export interface OrgActionApprovalTransitionResult {
  contractVersion: typeof ORG_ACTION_APPROVAL_TRANSITION_CONTRACT_VERSION;
  allowed: boolean;
  nextStatus: OrgAgentActionItemStatus;
  reasonCode: string;
}

export interface OrgActionApprovalPacket {
  contractVersion: typeof ORG_ACTION_APPROVAL_PACKET_CONTRACT_VERSION;
  actionItemObjectId: string;
  organizationId: string;
  sessionId?: string;
  sourceActivityObjectId?: string;
  requestedAt: number;
  requestedBy: string;
  policySnapshotId?: string;
  state: "pending";
}

export function buildOrgActionApprovalPacket(args: {
  actionItemObjectId: string;
  organizationId: string;
  sessionId?: string;
  sourceActivityObjectId?: string;
  requestedAt: number;
  requestedBy: string;
  policySnapshotId?: string;
}): OrgActionApprovalPacket {
  return {
    contractVersion: ORG_ACTION_APPROVAL_PACKET_CONTRACT_VERSION,
    actionItemObjectId: args.actionItemObjectId,
    organizationId: args.organizationId,
    sessionId: args.sessionId,
    sourceActivityObjectId: args.sourceActivityObjectId,
    requestedAt: args.requestedAt,
    requestedBy: args.requestedBy,
    policySnapshotId: args.policySnapshotId,
    state: "pending",
  };
}

export function resolveOrgActionApprovalTransition(args: {
  currentStatus: OrgAgentActionItemStatus;
  event: OrgActionApprovalEvent;
}): OrgActionApprovalTransitionResult {
  const failClosed = (
    nextStatus: OrgAgentActionItemStatus,
    reasonCode: string,
  ): OrgActionApprovalTransitionResult => ({
    contractVersion: ORG_ACTION_APPROVAL_TRANSITION_CONTRACT_VERSION,
    allowed: false,
    nextStatus,
    reasonCode,
  });

  if (args.currentStatus === "completed" || args.currentStatus === "cancelled") {
    return failClosed(args.currentStatus, "terminal_status_locked");
  }

  switch (args.event) {
    case "approve":
      if (args.currentStatus === "pending_review" || args.currentStatus === "assigned") {
        return {
          contractVersion: ORG_ACTION_APPROVAL_TRANSITION_CONTRACT_VERSION,
          allowed: true,
          nextStatus: "approved",
          reasonCode: "approved",
        };
      }
      return failClosed(args.currentStatus, "approve_requires_pending_or_assigned");
    case "reject":
      if (
        args.currentStatus === "pending_review" ||
        args.currentStatus === "assigned" ||
        args.currentStatus === "approved"
      ) {
        return {
          contractVersion: ORG_ACTION_APPROVAL_TRANSITION_CONTRACT_VERSION,
          allowed: true,
          nextStatus: "failed",
          reasonCode: "rejected",
        };
      }
      return failClosed(args.currentStatus, "reject_requires_review_state");
    case "assign":
      if (args.currentStatus === "pending_review") {
        return {
          contractVersion: ORG_ACTION_APPROVAL_TRANSITION_CONTRACT_VERSION,
          allowed: true,
          nextStatus: "assigned",
          reasonCode: "assigned",
        };
      }
      return failClosed(args.currentStatus, "assign_requires_pending_review");
    case "expire":
      if (
        args.currentStatus === "pending_review" ||
        args.currentStatus === "assigned" ||
        args.currentStatus === "approved"
      ) {
        return {
          contractVersion: ORG_ACTION_APPROVAL_TRANSITION_CONTRACT_VERSION,
          allowed: true,
          nextStatus: "failed",
          reasonCode: "expired",
        };
      }
      return failClosed(args.currentStatus, "expire_requires_review_state");
    case "take_over":
      if (
        args.currentStatus === "pending_review" ||
        args.currentStatus === "assigned" ||
        args.currentStatus === "approved"
      ) {
        return {
          contractVersion: ORG_ACTION_APPROVAL_TRANSITION_CONTRACT_VERSION,
          allowed: true,
          nextStatus: "assigned",
          reasonCode: "taken_over",
        };
      }
      return failClosed(args.currentStatus, "take_over_requires_review_state");
    default:
      return failClosed(args.currentStatus, "unsupported_event");
  }
}
