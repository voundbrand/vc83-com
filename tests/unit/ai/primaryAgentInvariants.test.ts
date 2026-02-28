import { describe, expect, it } from "vitest";
import { planPrimaryAgentRepairs } from "../../../convex/agentOntology";

type Candidate = {
  _id: string;
  type?: string;
  status: string;
  createdAt: number;
  createdBy?: string;
  customProperties?: Record<string, unknown>;
};

describe("planPrimaryAgentRepairs", () => {
  it("enforces one primary per operator context", () => {
    const plans = planPrimaryAgentRepairs<Candidate>([
      {
        _id: "agent_1",
        type: "org_agent",
        status: "active",
        createdAt: 10,
        customProperties: { operatorId: "op_1", isPrimary: true },
      },
      {
        _id: "agent_2",
        type: "org_agent",
        status: "active",
        createdAt: 20,
        customProperties: { operatorId: "op_1", isPrimary: true },
      },
    ]);

    expect(plans).toHaveLength(1);
    expect(plans[0].operatorId).toBe("op_1");
    expect(plans[0].primaryAgentId).toBe("agent_1");
    expect(plans[0].hadMultiplePrimaries).toBe(true);
    expect(plans[0].patches).toEqual([
      {
        agentId: "agent_2",
        operatorId: "op_1",
        isPrimary: false,
      },
    ]);
  });

  it("supports explicit reassignment to a forced primary agent", () => {
    const plans = planPrimaryAgentRepairs<Candidate>(
      [
        {
          _id: "agent_1",
          type: "org_agent",
          status: "active",
          createdAt: 10,
          customProperties: { operatorId: "op_1", isPrimary: true },
        },
        {
          _id: "agent_2",
          type: "org_agent",
          status: "active",
          createdAt: 20,
          customProperties: { operatorId: "op_1", isPrimary: false },
        },
      ],
      {
        operatorId: "op_1",
        forcePrimaryAgentId: "agent_2",
      }
    );

    expect(plans).toHaveLength(1);
    expect(plans[0].primaryAgentId).toBe("agent_2");
    expect(plans[0].patches).toEqual([
      {
        agentId: "agent_1",
        operatorId: "op_1",
        isPrimary: false,
      },
      {
        agentId: "agent_2",
        operatorId: "op_1",
        isPrimary: true,
      },
    ]);
  });

  it("repairs zero-primary legacy data by promoting the first viable agent", () => {
    const plans = planPrimaryAgentRepairs<Candidate>([
      {
        _id: "legacy_archived_primary",
        type: "org_agent",
        status: "archived",
        createdAt: 5,
        customProperties: { operatorId: "op_1", isPrimary: true },
      },
      {
        _id: "agent_1",
        type: "org_agent",
        status: "draft",
        createdAt: 10,
        customProperties: { operatorId: "op_1", isPrimary: false },
      },
      {
        _id: "agent_2",
        type: "org_agent",
        status: "active",
        createdAt: 20,
        customProperties: { operatorId: "op_1", isPrimary: false },
      },
    ]);

    expect(plans).toHaveLength(1);
    expect(plans[0].hadZeroPrimary).toBe(true);
    expect(plans[0].primaryAgentId).toBe("agent_1");
    expect(plans[0].patches).toEqual([
      {
        agentId: "legacy_archived_primary",
        operatorId: "op_1",
        isPrimary: false,
      },
      {
        agentId: "agent_1",
        operatorId: "op_1",
        isPrimary: true,
      },
    ]);
  });

  it("normalizes contexts independently by operatorId", () => {
    const plans = planPrimaryAgentRepairs<Candidate>([
      {
        _id: "op1_agent_1",
        type: "org_agent",
        status: "active",
        createdAt: 10,
        customProperties: { operatorId: "op_1", isPrimary: true },
      },
      {
        _id: "op1_agent_2",
        type: "org_agent",
        status: "active",
        createdAt: 20,
        customProperties: { operatorId: "op_1", isPrimary: true },
      },
      {
        _id: "op2_agent_1",
        type: "org_agent",
        status: "active",
        createdAt: 30,
        customProperties: { operatorId: "op_2", isPrimary: false },
      },
    ]);

    const planByOperator = new Map(plans.map((plan) => [plan.operatorId, plan]));
    expect(planByOperator.get("op_1")?.primaryAgentId).toBe("op1_agent_1");
    expect(planByOperator.get("op_2")?.primaryAgentId).toBe("op2_agent_1");
    expect(planByOperator.get("op_2")?.hadZeroPrimary).toBe(true);
  });
});
