import { describe, expect, it } from "vitest";
import { buildRequiredScopeToolManifestContract } from "../../../convex/ai/agentExecution";

describe("required scope tool manifest contract", () => {
  it("normalizes ordering and emits deterministic manifest hashes", () => {
    const manifestA = buildRequiredScopeToolManifestContract({
      finalToolNames: ["query_org_data", "create_ticket"],
      removedByLayer: {
        platform: [],
        orgAllow: [],
        orgDeny: ["create_invoice", "create_ticket"],
        integration: ["send_email_from_template"],
        agentProfile: [],
        agentEnable: [],
        agentDisable: [],
        autonomy: [],
        session: [],
        channel: [],
      },
    });
    const manifestB = buildRequiredScopeToolManifestContract({
      finalToolNames: ["create_ticket", "query_org_data"],
      removedByLayer: {
        platform: [],
        orgAllow: [],
        orgDeny: ["create_ticket", "create_invoice"],
        integration: ["send_email_from_template"],
        agentProfile: [],
        agentEnable: [],
        agentDisable: [],
        autonomy: [],
        session: [],
        channel: [],
      },
    });

    expect(manifestA).toEqual(manifestB);
    expect(manifestA.contractVersion).toBe("aoh_required_scope_tool_manifest_v1");
    expect(manifestA.manifestHash).toMatch(/^[0-9a-f]{8}$/);
  });
});
