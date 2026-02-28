import {
  AV_APPROVAL_INVARIANT,
  AV_RUNTIME_AUTHORITY_PRECEDENCE,
} from "./avFallbackPolicy";
import type {
  MediaSessionTransportDiagnostics,
  MediaSessionTransportFallbackReason,
} from "./transportAdapters";

export const TRANSPORT_DOWNGRADE_PROFILE_VALUES = [
  "full_av",
  "video_low_fps",
  "audio_only",
] as const;
export type TransportDowngradeProfile =
  (typeof TRANSPORT_DOWNGRADE_PROFILE_VALUES)[number];

export const TRANSPORT_OPERATOR_REASON_CODE_VALUES = [
  "stable_full_av",
  "recovered_full_av",
  "network_degraded_video_low_fps",
  "network_degraded_audio_only",
  "capture_backpressure_video_low_fps",
  "capture_backpressure_audio_only",
  "provider_failover_video_low_fps",
  "device_unavailable_audio_only",
  "policy_restricted_audio_only",
  "session_lease_expired_audio_only",
  "relay_publish_error_audio_only",
] as const;
export type TransportOperatorReasonCode =
  (typeof TRANSPORT_OPERATOR_REASON_CODE_VALUES)[number];

export interface TransportDowngradePolicyInput {
  fallbackReason: MediaSessionTransportFallbackReason;
  diagnostics: MediaSessionTransportDiagnostics;
  captureDroppedFrameCount?: number;
  captureLateFrameCount?: number;
  previousProfile?: TransportDowngradeProfile;
  runtimeAuthorityPrecedence?: string;
  approvalInvariant?: string;
}

export interface TransportDowngradePolicyResolution {
  profile: TransportDowngradeProfile;
  operatorReasonCode: TransportOperatorReasonCode;
  changed: boolean;
  nativePolicyPrecedence: typeof AV_RUNTIME_AUTHORITY_PRECEDENCE;
  approvalInvariant: typeof AV_APPROVAL_INVARIANT;
}

const SEVERE_NETWORK_LATENCY_MS_P95 = 900;
const SEVERE_NETWORK_JITTER_MS_P95 = 220;
const SEVERE_NETWORK_PACKET_LOSS_PCT = 12;
const SEVERE_CAPTURE_DROPPED_FRAME_COUNT = 8;
const SEVERE_CAPTURE_LATE_FRAME_COUNT = 12;

function normalizeNonNegativeNumber(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return 0;
  }
  return Math.floor(value);
}

function normalizeRequiredPolicyToken(value: string | undefined): string {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized;
}

function isSevereNetworkDegradation(
  diagnostics: MediaSessionTransportDiagnostics
): boolean {
  const latencyMsP95 = normalizeNonNegativeNumber(diagnostics.latencyMsP95);
  if (latencyMsP95 >= SEVERE_NETWORK_LATENCY_MS_P95) {
    return true;
  }

  const jitterMsP95 = normalizeNonNegativeNumber(diagnostics.jitterMsP95);
  if (jitterMsP95 >= SEVERE_NETWORK_JITTER_MS_P95) {
    return true;
  }

  const packetLossPct = normalizeNonNegativeNumber(diagnostics.packetLossPct);
  return packetLossPct >= SEVERE_NETWORK_PACKET_LOSS_PCT;
}

function isSevereCaptureBackpressure(args: {
  captureDroppedFrameCount?: number;
  captureLateFrameCount?: number;
}): boolean {
  const captureDroppedFrameCount = normalizeNonNegativeNumber(
    args.captureDroppedFrameCount
  );
  if (captureDroppedFrameCount >= SEVERE_CAPTURE_DROPPED_FRAME_COUNT) {
    return true;
  }

  const captureLateFrameCount = normalizeNonNegativeNumber(
    args.captureLateFrameCount
  );
  return captureLateFrameCount >= SEVERE_CAPTURE_LATE_FRAME_COUNT;
}

function resolveProfileAndReason(args: {
  fallbackReason: MediaSessionTransportFallbackReason;
  diagnostics: MediaSessionTransportDiagnostics;
  captureDroppedFrameCount?: number;
  captureLateFrameCount?: number;
}): {
  profile: TransportDowngradeProfile;
  operatorReasonCode: TransportOperatorReasonCode;
} {
  switch (args.fallbackReason) {
    case "policy_restricted":
      return {
        profile: "audio_only",
        operatorReasonCode: "policy_restricted_audio_only",
      };
    case "device_unavailable":
      return {
        profile: "audio_only",
        operatorReasonCode: "device_unavailable_audio_only",
      };
    case "provider_failover":
      return {
        profile: "video_low_fps",
        operatorReasonCode: "provider_failover_video_low_fps",
      };
    case "session_lease_expired":
      return {
        profile: "audio_only",
        operatorReasonCode: "session_lease_expired_audio_only",
      };
    case "relay_publish_error":
      return {
        profile: "audio_only",
        operatorReasonCode: "relay_publish_error_audio_only",
      };
    case "capture_backpressure": {
      const severeCaptureBackpressure = isSevereCaptureBackpressure({
        captureDroppedFrameCount: args.captureDroppedFrameCount,
        captureLateFrameCount: args.captureLateFrameCount,
      });
      return severeCaptureBackpressure
        ? {
            profile: "audio_only",
            operatorReasonCode: "capture_backpressure_audio_only",
          }
        : {
            profile: "video_low_fps",
            operatorReasonCode: "capture_backpressure_video_low_fps",
          };
    }
    case "network_degraded": {
      const severeNetworkDegradation = isSevereNetworkDegradation(
        args.diagnostics
      );
      return severeNetworkDegradation
        ? {
            profile: "audio_only",
            operatorReasonCode: "network_degraded_audio_only",
          }
        : {
            profile: "video_low_fps",
            operatorReasonCode: "network_degraded_video_low_fps",
          };
    }
    case "none":
      return {
        profile: "full_av",
        operatorReasonCode: "stable_full_av",
      };
    default: {
      const unreachableFallbackReason: never = args.fallbackReason;
      throw new Error(
        `Unsupported transport fallback reason: ${unreachableFallbackReason}`
      );
    }
  }
}

export function evaluateTransportDowngradePolicy(
  input: TransportDowngradePolicyInput
): TransportDowngradePolicyResolution {
  const runtimeAuthorityPrecedence = normalizeRequiredPolicyToken(
    input.runtimeAuthorityPrecedence
  );
  const approvalInvariant = normalizeRequiredPolicyToken(input.approvalInvariant);
  const previousProfile = input.previousProfile ?? "full_av";

  if (
    runtimeAuthorityPrecedence &&
    runtimeAuthorityPrecedence !== AV_RUNTIME_AUTHORITY_PRECEDENCE
  ) {
    return {
      profile: "audio_only",
      operatorReasonCode: "policy_restricted_audio_only",
      changed: previousProfile !== "audio_only",
      nativePolicyPrecedence: AV_RUNTIME_AUTHORITY_PRECEDENCE,
      approvalInvariant: AV_APPROVAL_INVARIANT,
    };
  }

  if (approvalInvariant && approvalInvariant !== AV_APPROVAL_INVARIANT) {
    return {
      profile: "audio_only",
      operatorReasonCode: "policy_restricted_audio_only",
      changed: previousProfile !== "audio_only",
      nativePolicyPrecedence: AV_RUNTIME_AUTHORITY_PRECEDENCE,
      approvalInvariant: AV_APPROVAL_INVARIANT,
    };
  }

  const resolved = resolveProfileAndReason({
    fallbackReason: input.fallbackReason,
    diagnostics: input.diagnostics,
    captureDroppedFrameCount: input.captureDroppedFrameCount,
    captureLateFrameCount: input.captureLateFrameCount,
  });

  if (resolved.profile === "full_av" && previousProfile !== "full_av") {
    return {
      profile: "full_av",
      operatorReasonCode: "recovered_full_av",
      changed: true,
      nativePolicyPrecedence: AV_RUNTIME_AUTHORITY_PRECEDENCE,
      approvalInvariant: AV_APPROVAL_INVARIANT,
    };
  }

  return {
    profile: resolved.profile,
    operatorReasonCode: resolved.operatorReasonCode,
    changed: previousProfile !== resolved.profile,
    nativePolicyPrecedence: AV_RUNTIME_AUTHORITY_PRECEDENCE,
    approvalInvariant: AV_APPROVAL_INVARIANT,
  };
}
