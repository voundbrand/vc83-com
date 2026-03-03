import { describe, expect, it } from "vitest";
import {
  resolveActiveToolsWithAudit,
  validateRequiredSpecialistScopeContract,
} from "../../../convex/ai/toolScoping";

describe("tool scoping org policy audit", () => {
  it("enforces org allow/deny precedence and reports layer removals", () => {
    const result = resolveActiveToolsWithAudit({
      allTools: [
        { name: "create_contact" },
        { name: "search_contacts", readOnly: true },
        { name: "list_forms", readOnly: true },
        { name: "query_org_data", readOnly: true },
      ],
      platformBlocked: [],
      orgEnabled: ["create_contact", "search_contacts"],
      orgDisabled: ["create_contact"],
      connectedIntegrations: [],
      agentProfile: "admin",
      agentEnabled: [],
      agentDisabled: [],
      autonomyLevel: "autonomous",
      sessionDisabled: [],
      channel: "webchat",
    });

    const names = result.tools.map((tool) => tool.name);
    expect(names).toEqual(["search_contacts", "query_org_data"]);
    expect(result.audit.removedByOrgAllow).toContain("list_forms");
    expect(result.audit.removedByOrgDeny).toContain("create_contact");
  });

  it("removes integration-gated tools when integrations are unavailable", () => {
    const result = resolveActiveToolsWithAudit({
      allTools: [
        { name: "create_invoice" },
        { name: "query_org_data", readOnly: true },
      ],
      platformBlocked: [],
      orgEnabled: [],
      orgDisabled: [],
      connectedIntegrations: [],
      agentProfile: "admin",
      agentEnabled: [],
      agentDisabled: [],
      autonomyLevel: "autonomous",
      sessionDisabled: [],
      channel: "webchat",
    });

    expect(result.tools.map((tool) => tool.name)).toEqual(["query_org_data"]);
    expect(result.audit.removedByIntegration).toContain("create_invoice");
  });

  it("retains query_org_data under restrictive policies", () => {
    const result = resolveActiveToolsWithAudit({
      allTools: [
        { name: "query_org_data", readOnly: true },
        { name: "create_ticket" },
      ],
      platformBlocked: ["create_ticket"],
      orgEnabled: ["create_ticket"],
      orgDisabled: ["create_ticket"],
      connectedIntegrations: [],
      agentProfile: "readonly",
      agentEnabled: [],
      agentDisabled: ["create_ticket"],
      autonomyLevel: "draft_only",
      sessionDisabled: ["create_ticket"],
      channel: "sms",
    });

    expect(result.tools.map((tool) => tool.name)).toEqual(["query_org_data"]);
    expect(result.audit.finalToolNames).toEqual(["query_org_data"]);
  });

  it("passes required specialist scope contract when required tools remain available", () => {
    const scoped = resolveActiveToolsWithAudit({
      allTools: [
        { name: "search_contacts", readOnly: true },
        { name: "create_ticket" },
        { name: "query_org_data", readOnly: true },
      ],
      platformBlocked: [],
      orgEnabled: [],
      orgDisabled: [],
      connectedIntegrations: ["resend"],
      agentProfile: "admin",
      agentEnabled: [],
      agentDisabled: [],
      autonomyLevel: "autonomous",
      sessionDisabled: [],
      channel: "webchat",
    });

    const validation = validateRequiredSpecialistScopeContract({
      requiredTools: ["create_ticket"],
      requiredCapabilities: ["integration:resend", "tool:create_ticket"],
      scopedToolNames: scoped.audit.finalToolNames,
      connectedIntegrations: ["resend"],
      removedByLayer: {
        platform: scoped.audit.removedByPlatform,
        orgAllow: scoped.audit.removedByOrgAllow,
        orgDeny: scoped.audit.removedByOrgDeny,
        integration: scoped.audit.removedByIntegration,
        agentProfile: scoped.audit.removedByAgentProfile,
        agentEnable: scoped.audit.removedByAgentEnable,
        agentDisable: scoped.audit.removedByAgentDisable,
        autonomy: scoped.audit.removedByAutonomy,
        session: scoped.audit.removedBySession,
        channel: scoped.audit.removedByChannel,
      },
    });

    expect(validation.blocked).toBe(false);
  });

  it("fails closed when layered scope removes required tools", () => {
    const scoped = resolveActiveToolsWithAudit({
      allTools: [
        { name: "create_ticket" },
        { name: "query_org_data", readOnly: true },
      ],
      platformBlocked: [],
      orgEnabled: [],
      orgDisabled: ["create_ticket"],
      connectedIntegrations: [],
      agentProfile: "admin",
      agentEnabled: [],
      agentDisabled: [],
      autonomyLevel: "autonomous",
      sessionDisabled: [],
      channel: "webchat",
    });

    const validation = validateRequiredSpecialistScopeContract({
      requiredTools: ["create_ticket"],
      requiredCapabilities: ["tool:create_ticket"],
      scopedToolNames: scoped.audit.finalToolNames,
      connectedIntegrations: [],
      removedByLayer: {
        platform: scoped.audit.removedByPlatform,
        orgAllow: scoped.audit.removedByOrgAllow,
        orgDeny: scoped.audit.removedByOrgDeny,
        integration: scoped.audit.removedByIntegration,
        agentProfile: scoped.audit.removedByAgentProfile,
        agentEnable: scoped.audit.removedByAgentEnable,
        agentDisable: scoped.audit.removedByAgentDisable,
        autonomy: scoped.audit.removedByAutonomy,
        session: scoped.audit.removedBySession,
        channel: scoped.audit.removedByChannel,
      },
    });

    expect(validation.blocked).toBe(true);
    expect(validation.contract).toEqual({
      requiredTools: ["create_ticket"],
      requiredCapabilities: ["tool:create_ticket"],
      enforced: true,
    });
    expect(validation.gap).toMatchObject({
      reasonCode: "required_scope_contract_missing",
      missingTools: ["create_ticket"],
      missingCapabilities: ["tool:create_ticket"],
      missingCapabilityKinds: ["tool"],
      missingByLayer: {
        orgDeny: ["create_ticket"],
      },
    });
  });

  it("keeps legacy agents without required contract compatible", () => {
    const scoped = resolveActiveToolsWithAudit({
      allTools: [{ name: "query_org_data", readOnly: true }],
      platformBlocked: [],
      orgEnabled: [],
      orgDisabled: [],
      connectedIntegrations: [],
      agentProfile: "readonly",
      agentEnabled: [],
      agentDisabled: [],
      autonomyLevel: "draft_only",
      sessionDisabled: [],
      channel: "webchat",
    });

    const validation = validateRequiredSpecialistScopeContract({
      requiredTools: undefined,
      requiredCapabilities: undefined,
      scopedToolNames: scoped.audit.finalToolNames,
      connectedIntegrations: [],
      removedByLayer: {
        platform: scoped.audit.removedByPlatform,
        orgAllow: scoped.audit.removedByOrgAllow,
        orgDeny: scoped.audit.removedByOrgDeny,
        integration: scoped.audit.removedByIntegration,
        agentProfile: scoped.audit.removedByAgentProfile,
        agentEnable: scoped.audit.removedByAgentEnable,
        agentDisable: scoped.audit.removedByAgentDisable,
        autonomy: scoped.audit.removedByAutonomy,
        session: scoped.audit.removedBySession,
        channel: scoped.audit.removedByChannel,
      },
    });

    expect(validation).toEqual({
      blocked: false,
      contract: {
        requiredTools: [],
        requiredCapabilities: [],
        enforced: false,
      },
    });
  });
});
