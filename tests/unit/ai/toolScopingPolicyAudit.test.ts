import { describe, expect, it } from "vitest";
import { resolveActiveToolsWithAudit } from "../../../convex/ai/toolScoping";

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
});
