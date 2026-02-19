import type { Id } from "../_generated/dataModel";

export interface TurnTerminalDeliverablePointer {
  pointerType: string;
  pointerId: string;
  status: "success" | "failed";
  recordedAt: number;
}

export interface TurnLeaseMutationResult {
  success: boolean;
  error?: string;
  transitionVersion?: number;
  leaseToken?: string;
  leaseExpiresAt?: number;
}

export interface TurnLeaseReleaseArgs {
  turnId: Id<"agentTurns">;
  expectedVersion: number;
  leaseToken: string;
  nextState?: "suspended" | "completed" | "cancelled";
}

export interface TurnLeaseFailArgs {
  turnId: Id<"agentTurns">;
  expectedVersion: number;
  leaseToken?: string;
  reason: string;
}

export interface TurnTerminalDeliverableWriteArgs {
  turnId: Id<"agentTurns">;
  pointerType: string;
  pointerId: string;
  status: "success" | "failed";
  metadata?: Record<string, unknown>;
}

export interface InboundReceiptCompletionArgs {
  receiptId: Id<"agentInboxReceipts">;
  status: "accepted" | "processing" | "completed" | "failed";
  turnId?: Id<"agentTurns">;
  failureReason?: string;
  terminalDeliverable?: TurnTerminalDeliverablePointer;
}

interface TurnWriteResult {
  success?: boolean;
  error?: string;
}

export function resolveTurnLeaseAcquireFailureReason(error?: string): string {
  return `turn_lease_acquire_failed:${error ?? "unknown"}`;
}

export function buildLeaseAcquireFailureDeliverable(
  turnId: Id<"agentTurns">
): TurnTerminalDeliverablePointer {
  return {
    pointerType: "lease_acquire_failed",
    pointerId: `turn:${turnId}`,
    status: "failed",
    recordedAt: Date.now(),
  };
}

export function buildRuntimeExitDeliverable(args: {
  turnId: Id<"agentTurns">;
  runtimeError: string | null;
}): TurnTerminalDeliverablePointer {
  return {
    pointerType: args.runtimeError ? "runtime_error" : "runtime_exit",
    pointerId: `turn:${args.turnId}`,
    status: args.runtimeError ? "failed" : "success",
    recordedAt: Date.now(),
  };
}

export function resolveReceiptFinalizeStatus(
  runtimeError: string | null
): "completed" | "failed" {
  return runtimeError ? "failed" : "completed";
}

function resolveTurnLeaseSettleMode(runtimeError: string | null): "release" | "fail" {
  return runtimeError ? "fail" : "release";
}

export async function handleTurnLeaseAcquireFailure(args: {
  turnId: Id<"agentTurns">;
  receiptId: Id<"agentInboxReceipts">;
  expectedVersion: number;
  leaseAcquireError?: string;
  duplicateTurn: boolean;
  failTurnLease: (
    failArgs: TurnLeaseFailArgs
  ) => Promise<TurnLeaseMutationResult>;
  recordTurnTerminalDeliverable: (
    writeArgs: TurnTerminalDeliverableWriteArgs
  ) => Promise<TurnWriteResult | null>;
  completeInboundReceipt: (
    completeArgs: InboundReceiptCompletionArgs
  ) => Promise<TurnWriteResult | null>;
}): Promise<{
  failureReason: string;
  terminalDeliverable: TurnTerminalDeliverablePointer;
}> {
  const failureReason = resolveTurnLeaseAcquireFailureReason(args.leaseAcquireError);
  if (!args.duplicateTurn) {
    await args.failTurnLease({
      turnId: args.turnId,
      expectedVersion: args.expectedVersion,
      reason: failureReason,
    });
  }

  const terminalDeliverable = buildLeaseAcquireFailureDeliverable(args.turnId);
  await args.recordTurnTerminalDeliverable({
    turnId: args.turnId,
    pointerType: terminalDeliverable.pointerType,
    pointerId: terminalDeliverable.pointerId,
    status: terminalDeliverable.status,
    metadata: {
      error: args.leaseAcquireError,
    },
  });
  await args.completeInboundReceipt({
    receiptId: args.receiptId,
    status: "failed",
    turnId: args.turnId,
    failureReason,
    terminalDeliverable,
  });

  return {
    failureReason,
    terminalDeliverable,
  };
}

export async function settleRuntimeTurnLease(args: {
  turnId: Id<"agentTurns">;
  expectedVersion: number;
  leaseToken?: string;
  runtimeError: string | null;
  releaseTurnLease: (
    releaseArgs: TurnLeaseReleaseArgs
  ) => Promise<TurnLeaseMutationResult>;
  failTurnLease: (
    failArgs: TurnLeaseFailArgs
  ) => Promise<TurnLeaseMutationResult>;
  onSettleFailure?: (args: { mode: "release" | "fail"; error?: string }) => void;
}): Promise<number> {
  if (!args.leaseToken) {
    return args.expectedVersion;
  }

  const settleMode = resolveTurnLeaseSettleMode(args.runtimeError);
  if (settleMode === "fail") {
    const failResult = await args.failTurnLease({
      turnId: args.turnId,
      expectedVersion: args.expectedVersion,
      leaseToken: args.leaseToken,
      reason: (args.runtimeError ?? "runtime_failure").slice(0, 500),
    });
    if (!failResult.success) {
      args.onSettleFailure?.({ mode: "fail", error: failResult.error });
      return args.expectedVersion;
    }
    return typeof failResult.transitionVersion === "number"
      ? failResult.transitionVersion
      : args.expectedVersion;
  }

  const releaseResult = await args.releaseTurnLease({
    turnId: args.turnId,
    expectedVersion: args.expectedVersion,
    leaseToken: args.leaseToken,
    nextState: "completed",
  });
  if (!releaseResult.success) {
    args.onSettleFailure?.({ mode: "release", error: releaseResult.error });
    return args.expectedVersion;
  }
  return typeof releaseResult.transitionVersion === "number"
    ? releaseResult.transitionVersion
    : args.expectedVersion;
}

export async function persistRuntimeTurnArtifacts(args: {
  receiptId: Id<"agentInboxReceipts">;
  turnId: Id<"agentTurns">;
  runtimeError: string | null;
  terminalDeliverable?: TurnTerminalDeliverablePointer;
  recordTurnTerminalDeliverable: (
    writeArgs: TurnTerminalDeliverableWriteArgs
  ) => Promise<TurnWriteResult | null>;
  completeInboundReceipt: (
    completeArgs: InboundReceiptCompletionArgs
  ) => Promise<TurnWriteResult | null>;
  onTerminalPersistFailure?: (error: unknown) => void;
  onReceiptFinalizeFailure?: (error: unknown) => void;
}): Promise<TurnTerminalDeliverablePointer> {
  const resolvedTerminalDeliverable =
    args.terminalDeliverable
    ?? buildRuntimeExitDeliverable({
      turnId: args.turnId,
      runtimeError: args.runtimeError,
    });

  try {
    const terminalWrite = await args.recordTurnTerminalDeliverable({
      turnId: args.turnId,
      pointerType: resolvedTerminalDeliverable.pointerType,
      pointerId: resolvedTerminalDeliverable.pointerId,
      status: resolvedTerminalDeliverable.status,
      metadata: {
        runtimeError: args.runtimeError ?? undefined,
      },
    });
    if (
      !terminalWrite?.success
      && terminalWrite?.error !== "terminal_deliverable_already_recorded"
    ) {
      args.onTerminalPersistFailure?.(terminalWrite?.error);
    }
  } catch (error) {
    args.onTerminalPersistFailure?.(error);
  }

  try {
    const receiptFinalize = await args.completeInboundReceipt({
      receiptId: args.receiptId,
      status: resolveReceiptFinalizeStatus(args.runtimeError),
      turnId: args.turnId,
      failureReason: args.runtimeError?.slice(0, 500),
      terminalDeliverable: resolvedTerminalDeliverable,
    });
    if (!receiptFinalize?.success) {
      args.onReceiptFinalizeFailure?.(receiptFinalize?.error);
    }
  } catch (error) {
    args.onReceiptFinalizeFailure?.(error);
  }

  return resolvedTerminalDeliverable;
}
