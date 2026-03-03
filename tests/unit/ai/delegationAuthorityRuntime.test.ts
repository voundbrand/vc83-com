import { describe, expect, it } from "vitest";
import { resolveDelegationAuthorityRuntimeContract } from "../../../convex/ai/agentExecution";

describe("delegation authority runtime contract", () => {
  it("keeps tool/autonomy/approval authority anchored to the primary agent in direct mode", () => {
    const contract = resolveDelegationAuthorityRuntimeContract({
      primaryAgentId: "agent_primary",
      primaryAgentSubtype: "pm",
      primaryConfig: {
        autonomyLevel: "supervised",
        requireApprovalFor: ["process_payment", "process_payment"],
        toolProfile: "operations",
        enabledTools: ["list_forms", "create_invoice"],
        disabledTools: ["process_payment"],
        useToolBroker: true,
        activeSoulMode: "private",
        modeChannelBindings: { webchat: "private" },
        activeArchetype: "life_coach",
        enabledArchetypes: ["life_coach"],
      },
      speakerAgentId: "agent_specialist",
    });

    expect(contract.authorityAgentId).toBe("agent_primary");
    expect(contract.speakerAgentId).toBe("agent_specialist");
    expect(contract.authorityAutonomyLevel).toBe("supervised");
    expect(contract.authorityRequireApprovalFor).toEqual(["process_payment"]);
    expect(contract.authorityToolProfile).toBe("operations");
    expect(contract.authorityEnabledTools).toEqual(["create_invoice", "list_forms"]);
    expect(contract.authorityDisabledTools).toEqual(["process_payment"]);
    expect(contract.authorityUseToolBroker).toBe(true);
  });

  it("falls back to the primary authority defaults when no explicit profile is provided", () => {
    const contract = resolveDelegationAuthorityRuntimeContract({
      primaryAgentId: "agent_primary",
      primaryAgentSubtype: "unknown_specialist",
      primaryConfig: {
        autonomyLevel: "autonomous",
      },
      speakerAgentId: "agent_specialist",
    });

    expect(contract.authorityAgentId).toBe("agent_primary");
    expect(contract.speakerAgentId).toBe("agent_specialist");
    expect(contract.authorityAutonomyLevel).toBe("autonomous");
    expect(contract.authorityToolProfile).toBe("general");
    expect(contract.authorityRequireApprovalFor).toBeUndefined();
    expect(contract.authorityEnabledTools).toEqual([]);
    expect(contract.authorityDisabledTools).toEqual([]);
    expect(contract.authorityUseToolBroker).toBe(false);
  });

  it("normalizes legacy draft_only to sandbox and preserves delegation level", () => {
    const legacyContract = resolveDelegationAuthorityRuntimeContract({
      primaryAgentId: "agent_primary",
      primaryAgentSubtype: "pm",
      primaryConfig: {
        autonomyLevel: "draft_only",
      },
      speakerAgentId: "agent_specialist",
    });
    expect(legacyContract.authorityAutonomyLevel).toBe("sandbox");

    const delegationContract = resolveDelegationAuthorityRuntimeContract({
      primaryAgentId: "agent_primary",
      primaryAgentSubtype: "pm",
      primaryConfig: {
        autonomyLevel: "delegation",
      },
      speakerAgentId: "agent_specialist",
    });
    expect(delegationContract.authorityAutonomyLevel).toBe("delegation");
  });
});
