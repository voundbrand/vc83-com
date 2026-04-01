import { describe, expect, it } from "vitest";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  DER_TERMINMACHER_AGENT_RUNTIME_MODULE_KEY,
  resolveDerTerminmacherRuntimeContract,
} from "../../../convex/ai/agents/der_terminmacher/runtimeModule";
import {
  injectAutoPreviewMeetingConciergeToolCall,
  resolveInboundMeetingConciergeIntent,
} from "../../../convex/ai/agents/der_terminmacher/meetingConcierge";
import { enforceDerTerminmacherPreviewFirstToolPolicy } from "../../../convex/ai/agents/der_terminmacher/tools";
import {
  applyDerTerminmacherToolCallAdjustments,
  resolveDerTerminmacherToolScopeManifest,
} from "../../../convex/ai/agents/der_terminmacher/orchestration";
import {
  applyDerTerminmacherToolCallAdjustments as applyDerTerminmacherToolCallAdjustmentsFromAgentExecution,
  resolveDerTerminmacherToolScopeManifest as resolveDerTerminmacherToolScopeManifestFromAgentExecution,
} from "../../../convex/ai/kernel/agentExecution";
import { MOBILE_NODE_COMMAND_POLICY_CONTRACT_VERSION } from "../../../convex/ai/mobileRuntimeHardening";

const ORG_ID = "org_1" as Id<"organizations">;
const PREVIEW_COMMAND_POLICY = {
  contractVersion: MOBILE_NODE_COMMAND_POLICY_CONTRACT_VERSION,
  attemptedCommands: ["assemble_concierge_payload", "preview_meeting_concierge"],
};

function normalizePreviewInjectedToolCallIds(
  toolCalls: Array<Record<string, unknown>>,
): Array<Record<string, unknown>> {
  return toolCalls.map((toolCall) => {
    if (
      typeof toolCall.id === "string"
      && toolCall.id.startsWith("mobile_concierge_preview_")
    ) {
      return {
        ...toolCall,
        id: "mobile_concierge_preview_<deterministic>",
      };
    }
    return toolCall;
  });
}

describe("Der Terminmacher orchestration helpers", () => {
  it("prefers Der Terminmacher runtime contract manifest when present", () => {
    const runtimeContract = resolveDerTerminmacherRuntimeContract({
      runtimeModuleKey: DER_TERMINMACHER_AGENT_RUNTIME_MODULE_KEY,
    });
    expect(runtimeContract).not.toBeNull();

    const resolved = resolveDerTerminmacherToolScopeManifest({
      derTerminmacherRuntimeContract: runtimeContract,
      routedAuthorityRuntimeModuleMetadata: {
        key: "fallback_runtime_module",
        toolManifest: {
          requiredTools: ["fallback_required"],
          optionalTools: ["fallback_optional"],
          deniedTools: ["fallback_denied"],
        },
      } as any,
    });

    expect(resolved).toEqual({
      moduleKey: DER_TERMINMACHER_AGENT_RUNTIME_MODULE_KEY,
      requiredTools: runtimeContract!.toolManifest.requiredTools,
      optionalTools: runtimeContract!.toolManifest.optionalTools,
      deniedTools: runtimeContract!.toolManifest.deniedTools,
    });
  });

  it("falls back to routed runtime-module metadata when Der Terminmacher contract is absent", () => {
    const resolved = resolveDerTerminmacherToolScopeManifest({
      derTerminmacherRuntimeContract: null,
      routedAuthorityRuntimeModuleMetadata: {
        key: "fallback_runtime_module",
        toolManifest: {
          requiredTools: ["fallback_required"],
          optionalTools: ["fallback_optional"],
          deniedTools: ["fallback_denied"],
        },
      } as any,
    });

    expect(resolved).toEqual({
      moduleKey: "fallback_runtime_module",
      requiredTools: ["fallback_required"],
      optionalTools: ["fallback_optional"],
      deniedTools: ["fallback_denied"],
    });
  });

  it("returns null manifest when neither contract nor routed metadata exists", () => {
    expect(
      resolveDerTerminmacherToolScopeManifest({
        derTerminmacherRuntimeContract: null,
        routedAuthorityRuntimeModuleMetadata: null,
      }),
    ).toBeNull();
  });

  it("applies preview-first and auto-preview injection adjustments when fallback skip is disabled", () => {
    const runtimeContract = resolveDerTerminmacherRuntimeContract({
      runtimeModuleKey: DER_TERMINMACHER_AGENT_RUNTIME_MODULE_KEY,
    });
    expect(runtimeContract).not.toBeNull();
    const meetingConciergeIntent = resolveInboundMeetingConciergeIntent({
      organizationId: ORG_ID,
      channel: "desktop",
      message: "Go ahead and book it with Jordan at jordan@example.com.",
      metadata: {
        liveSessionId: "live_session_orchestration_1",
        commandPolicy: PREVIEW_COMMAND_POLICY,
        voiceRuntime: {
          transcript: "Jordan email is jordan@example.com.",
        },
      },
      runtimeModuleKey: DER_TERMINMACHER_AGENT_RUNTIME_MODULE_KEY,
      now: 1_701_010_000_000,
    });

    const initialToolCalls = [
      {
        id: "llm_execute_1",
        type: "function",
        function: {
          name: "manage_bookings",
          arguments: JSON.stringify({
            action: "run_meeting_concierge_demo",
            mode: "execute",
            personEmail: "jordan@example.com",
          }),
        },
      },
    ];

    const expected = injectAutoPreviewMeetingConciergeToolCall({
      toolCalls: enforceDerTerminmacherPreviewFirstToolPolicy({
        toolCalls: initialToolCalls,
        runtimeContract,
        explicitConfirmDetected: meetingConciergeIntent.explicitConfirmDetected,
      }),
      meetingConciergeIntent,
    });
    const actual = applyDerTerminmacherToolCallAdjustments({
      toolCalls: initialToolCalls,
      skipLlmExecutionForRequiredScopeFallback: false,
      derTerminmacherRuntimeContract: runtimeContract,
      meetingConciergeIntent,
    });

    expect(
      normalizePreviewInjectedToolCallIds(actual as Array<Record<string, unknown>>),
    ).toEqual(
      normalizePreviewInjectedToolCallIds(expected as Array<Record<string, unknown>>),
    );
  });

  it("returns original tool call array unchanged when fallback skip is enabled", () => {
    const initialToolCalls: Array<Record<string, unknown>> = [
      {
        id: "llm_execute_skip_1",
        type: "function",
        function: {
          name: "manage_bookings",
          arguments: JSON.stringify({
            action: "run_meeting_concierge_demo",
            mode: "execute",
            personEmail: "jordan@example.com",
          }),
        },
      },
    ];
    const meetingConciergeIntent = resolveInboundMeetingConciergeIntent({
      organizationId: ORG_ID,
      channel: "desktop",
      message: "Go ahead and book it with Jordan at jordan@example.com.",
      metadata: {
        liveSessionId: "live_session_orchestration_2",
        commandPolicy: PREVIEW_COMMAND_POLICY,
        voiceRuntime: {
          transcript: "Jordan email is jordan@example.com.",
        },
      },
      runtimeModuleKey: DER_TERMINMACHER_AGENT_RUNTIME_MODULE_KEY,
      now: 1_701_010_100_000,
    });

    const adjusted = applyDerTerminmacherToolCallAdjustments({
      toolCalls: initialToolCalls,
      skipLlmExecutionForRequiredScopeFallback: true,
      derTerminmacherRuntimeContract: resolveDerTerminmacherRuntimeContract({
        runtimeModuleKey: DER_TERMINMACHER_AGENT_RUNTIME_MODULE_KEY,
      }),
      meetingConciergeIntent,
    });

    expect(adjusted).toBe(initialToolCalls);
    expect(adjusted).toEqual(initialToolCalls);
  });

  it("preserves backward-compatible exports via agentExecution", () => {
    expect(resolveDerTerminmacherToolScopeManifestFromAgentExecution).toBe(
      resolveDerTerminmacherToolScopeManifest,
    );
    expect(applyDerTerminmacherToolCallAdjustmentsFromAgentExecution).toBe(
      applyDerTerminmacherToolCallAdjustments,
    );
  });
});
