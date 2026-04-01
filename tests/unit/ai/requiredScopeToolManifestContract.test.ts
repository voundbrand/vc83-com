import { describe, expect, it } from "vitest";
import { buildRequiredScopeToolManifestContract } from "../../../convex/ai/kernel/agentExecution";

describe("required scope tool manifest contract", () => {
  it("normalizes ordering and emits deterministic manifest hashes", () => {
    const manifestA = buildRequiredScopeToolManifestContract({
      finalToolNames: ["query_org_data", "create_ticket"],
      agentToolResolution: {
        source: "runtime_module_manifest",
        moduleKey: "one_of_one_samantha_runtime_module_v1",
        agentProfile: null,
        enabledTools: [
          "request_audit_deliverable_email",
          "generate_audit_workflow_deliverable",
        ],
        disabledTools: ["create_ticket"],
        manifestRequiredTools: ["generate_audit_workflow_deliverable"],
        manifestOptionalTools: ["request_audit_deliverable_email"],
        manifestDeniedTools: ["create_ticket"],
      },
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
      agentToolResolution: {
        source: "runtime_module_manifest",
        moduleKey: "one_of_one_samantha_runtime_module_v1",
        agentProfile: null,
        enabledTools: [
          "generate_audit_workflow_deliverable",
          "request_audit_deliverable_email",
        ],
        disabledTools: ["create_ticket"],
        manifestRequiredTools: ["generate_audit_workflow_deliverable"],
        manifestOptionalTools: ["request_audit_deliverable_email"],
        manifestDeniedTools: ["create_ticket"],
      },
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
    expect(manifestA.agentToolResolution).toMatchObject({
      source: "runtime_module_manifest",
      moduleKey: "one_of_one_samantha_runtime_module_v1",
      enabledTools: [
        "generate_audit_workflow_deliverable",
        "request_audit_deliverable_email",
      ],
    });
    expect(manifestA.manifestHash).toMatch(/^[0-9a-f]{8}$/);
  });
});
