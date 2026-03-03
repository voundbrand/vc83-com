import { describe, expect, it } from "vitest";
import { normalizeAgentSpecV1 } from "../../../convex/ai/agentSpecRegistry";
import { compileRuntimeCapabilityManifest } from "../../../convex/ai/policyCompiler";
import {
  buildRuntimeCapabilityManifestArtifact,
  buildRuntimeCapabilityManifestStorageKey,
  normalizeRuntimeCapabilityManifestArtifact,
} from "../../../convex/ai/runtimeCapabilityManifestStore";

function buildSpec() {
  return normalizeAgentSpecV1({
    contractVersion: "agent_spec_v1",
    agent: {
      key: "one_of_one_samantha_warm",
      identity: {
        displayName: "Samantha Warm",
        role: "lead_capture_consultant",
      },
      channels: {
        allowed: ["webchat", "native_guest"],
        defaults: {
          primary: "native_guest",
        },
      },
      capabilities: [
        {
          key: "audit_delivery",
          outcomes: [
            {
              outcomeKey: "audit_workflow_deliverable_pdf",
              requiredTools: ["generate_audit_workflow_deliverable"],
              preconditions: {
                requiredFields: ["lastName", "firstName", "email"],
              },
            },
            {
              outcomeKey: "email_sent",
              requiredTools: ["send_email_from_template"],
              preconditions: {
                requiredFields: ["email"],
              },
            },
          ],
        },
      ],
      policyProfiles: {
        orgPolicyRef: "org_policy_default_v3",
        channelPolicyRef: "native_guest_policy_v2",
        runtimePolicyRef: "runtime_fail_closed_v5",
      },
    },
  });
}

describe("runtime capability manifest store", () => {
  it("builds deterministic hash-addressed artifact payloads", () => {
    const manifest = compileRuntimeCapabilityManifest({
      agentSpec: buildSpec(),
      orgPolicyProfile: {
        ref: "org_policy_default_v3",
        allowedTools: ["generate_audit_workflow_deliverable"],
        deniedTools: ["send_email_from_template"],
      },
      channelPolicyProfile: {
        ref: "native_guest_policy_v2",
        allowedChannels: ["native_guest"],
        deniedTools: ["generate_audit_workflow_deliverable"],
      },
      runtimeDefaultsProfile: {
        ref: "runtime_fail_closed_v5",
        denyCatalog: ["tool_unavailable", "context_invalid", "tool_unavailable"],
      },
      compiledAtMs: 1772448000000,
    });

    const artifactA = buildRuntimeCapabilityManifestArtifact(manifest);
    const artifactB = buildRuntimeCapabilityManifestArtifact({
      ...manifest,
      denyCatalog: [...manifest.denyCatalog].reverse(),
    });

    expect(artifactA).toEqual(artifactB);
    expect(artifactA.manifestHash).toBe(manifest.manifestHash);
    expect(artifactA.manifestKey).toBe(
      buildRuntimeCapabilityManifestStorageKey(manifest.manifestHash),
    );
    expect(artifactA.manifestKey).toMatch(
      /^runtime_capability_manifest_v1\/[0-9a-f]{8}$/,
    );
  });

  it("captures source-layer provenance and normalized deny catalog", () => {
    const manifest = compileRuntimeCapabilityManifest({
      agentSpec: buildSpec(),
      orgPolicyProfile: {
        ref: "org_policy_default_v3",
        allowedTools: ["generate_audit_workflow_deliverable"],
        deniedTools: ["send_email_from_template"],
      },
      channelPolicyProfile: {
        ref: "native_guest_policy_v2",
        allowedChannels: ["native_guest"],
        deniedTools: ["generate_audit_workflow_deliverable"],
      },
      runtimeDefaultsProfile: {
        ref: "runtime_fail_closed_v5",
        denyCatalog: ["tool_unavailable", "context_invalid"],
      },
      compiledAtMs: 1772448000000,
    });

    const artifact = buildRuntimeCapabilityManifestArtifact(manifest);

    expect(artifact.sourceLayerCatalog).toEqual(["channel", "org"]);
    expect(artifact.denyCatalog).toEqual([
      "channel_not_allowed",
      "context_invalid",
      "precondition_missing",
      "replay_duplicate",
      "tool_denied_channel",
      "tool_denied_org",
      "tool_not_allowlisted_org",
      "tool_unavailable",
    ]);
  });

  it("normalizes persisted artifact payloads from storage records", () => {
    const manifest = compileRuntimeCapabilityManifest({
      agentSpec: buildSpec(),
      orgPolicyProfile: {
        ref: "org_policy_default_v3",
        allowedTools: ["send_email_from_template", "generate_audit_workflow_deliverable"],
        deniedTools: [],
      },
      channelPolicyProfile: {
        ref: "native_guest_policy_v2",
        allowedChannels: ["native_guest", "webchat"],
        deniedTools: [],
      },
      runtimeDefaultsProfile: {
        ref: "runtime_fail_closed_v5",
        denyCatalog: ["context_invalid", "tool_unavailable"],
      },
      compiledAtMs: 1772448000000,
    });

    const normalized = normalizeRuntimeCapabilityManifestArtifact({
      contractVersion: "runtime_capability_manifest_artifact_v1",
      manifestHash: manifest.manifestHash,
      manifest: {
        ...manifest,
        denyCatalog: ["tool_unavailable", "context_invalid", "tool_unavailable"],
      },
    });

    expect(normalized).not.toBeNull();
    expect(normalized?.manifestHash).toBe(manifest.manifestHash);
    expect(normalized?.denyCatalog).toEqual([
      "channel_not_allowed",
      "context_invalid",
      "precondition_missing",
      "replay_duplicate",
      "tool_unavailable",
    ]);
  });
});
