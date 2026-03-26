import type { AgentRuntimeModuleMetadataV1 } from "../../agentSpecRegistry";
import type { AgentToolScopeManifestInput } from "../../toolScoping";
import {
  injectAutoPreviewMeetingConciergeToolCall,
  type InboundMeetingConciergeIntent,
} from "./meetingConcierge";
import type { DerTerminmacherRuntimeContract } from "./runtimeModule";
import { enforceDerTerminmacherPreviewFirstToolPolicy } from "./tools";

export function resolveDerTerminmacherToolScopeManifest(args: {
  derTerminmacherRuntimeContract: DerTerminmacherRuntimeContract | null | undefined;
  routedAuthorityRuntimeModuleMetadata: AgentRuntimeModuleMetadataV1 | null | undefined;
}): AgentToolScopeManifestInput | null {
  if (args.derTerminmacherRuntimeContract) {
    return {
      moduleKey: args.derTerminmacherRuntimeContract.moduleKey,
      requiredTools: args.derTerminmacherRuntimeContract.toolManifest.requiredTools,
      optionalTools: args.derTerminmacherRuntimeContract.toolManifest.optionalTools,
      deniedTools: args.derTerminmacherRuntimeContract.toolManifest.deniedTools,
    };
  }
  if (args.routedAuthorityRuntimeModuleMetadata) {
    return {
      moduleKey: args.routedAuthorityRuntimeModuleMetadata.key,
      requiredTools: args.routedAuthorityRuntimeModuleMetadata.toolManifest.requiredTools,
      optionalTools: args.routedAuthorityRuntimeModuleMetadata.toolManifest.optionalTools,
      deniedTools: args.routedAuthorityRuntimeModuleMetadata.toolManifest.deniedTools,
    };
  }
  return null;
}

export function applyDerTerminmacherToolCallAdjustments(args: {
  toolCalls: Array<Record<string, unknown>>;
  skipLlmExecutionForRequiredScopeFallback: boolean;
  derTerminmacherRuntimeContract: DerTerminmacherRuntimeContract | null | undefined;
  meetingConciergeIntent: InboundMeetingConciergeIntent;
}): Array<Record<string, unknown>> {
  if (args.skipLlmExecutionForRequiredScopeFallback) {
    return args.toolCalls;
  }
  const previewFirstAdjustedToolCalls = enforceDerTerminmacherPreviewFirstToolPolicy({
    toolCalls: args.toolCalls,
    runtimeContract: args.derTerminmacherRuntimeContract,
    explicitConfirmDetected: args.meetingConciergeIntent.explicitConfirmDetected,
  });
  return injectAutoPreviewMeetingConciergeToolCall({
    toolCalls: previewFirstAdjustedToolCalls,
    meetingConciergeIntent: args.meetingConciergeIntent,
  });
}
