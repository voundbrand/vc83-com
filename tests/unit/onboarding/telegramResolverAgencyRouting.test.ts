import { afterEach, describe, expect, it, vi } from "vitest";
import type { Id } from "../../../convex/_generated/dataModel";
import { resolveChatToOrg } from "../../../convex/onboarding/telegramResolver";

const PLATFORM_ORG_ID = "org_platform_tg" as Id<"organizations">;
const CHILD_ORG_ID = "org_child_tg" as Id<"organizations">;
const PARENT_ORG_ID = "org_parent_tg" as Id<"organizations">;
const CUSTOMER_AGENT_ID = "agent_customer_tg" as Id<"objects">;
const ORIGINAL_TEST_ORG_ID = process.env.TEST_ORG_ID;

afterEach(() => {
  vi.restoreAllMocks();
  if (ORIGINAL_TEST_ORG_ID === undefined) {
    delete process.env.TEST_ORG_ID;
  } else {
    process.env.TEST_ORG_ID = ORIGINAL_TEST_ORG_ID;
  }
});

describe("telegram resolver agency child-org routing", () => {
  it("routes child-org deep links to the explicit customer-facing specialist and persists that target on the mapping", async () => {
    process.env.TEST_ORG_ID = PLATFORM_ORG_ID;
    const mutations: Array<Record<string, unknown>> = [];
    const runQuery = vi
      .fn()
      .mockResolvedValueOnce({
        organizationId: CHILD_ORG_ID,
        targetAgentId: CUSTOMER_AGENT_ID,
      })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        _id: CHILD_ORG_ID,
        parentOrganizationId: PARENT_ORG_ID,
      });
    const runMutation = vi.fn(async (_ref: unknown, payload: Record<string, unknown>) => {
      mutations.push(payload);
      return { success: true };
    });

    const result = await (resolveChatToOrg as any)._handler(
      { runQuery, runMutation },
      {
        telegramChatId: "tg_child_customer",
        senderName: "Customer",
        startParam: "apotheke-adler",
      }
    );

    expect(result).toMatchObject({
      organizationId: CHILD_ORG_ID,
      routeToSystemBot: false,
      isNew: true,
      isExternalCustomer: true,
      resolvedAgentId: CUSTOMER_AGENT_ID,
    });
    expect(mutations).toContainEqual({
      telegramChatId: "tg_child_customer",
      organizationId: CHILD_ORG_ID,
      senderName: "Customer",
      targetAgentId: CUSTOMER_AGENT_ID,
    });
    expect(mutations).toContainEqual({
      telegramChatId: "tg_child_customer",
      organizationId: CHILD_ORG_ID,
      targetAgentId: CUSTOMER_AGENT_ID,
    });
  });

  it("keeps agency-owner testing traffic on the child org customer-facing specialist via the testing override", async () => {
    process.env.TEST_ORG_ID = PLATFORM_ORG_ID;
    const mutations: Array<Record<string, unknown>> = [];
    const runQuery = vi
      .fn()
      .mockResolvedValueOnce({
        organizationId: CHILD_ORG_ID,
        targetAgentId: CUSTOMER_AGENT_ID,
      })
      .mockResolvedValueOnce({
        organizationId: PARENT_ORG_ID,
        status: "active",
      })
      .mockResolvedValueOnce({
        _id: CHILD_ORG_ID,
        parentOrganizationId: PARENT_ORG_ID,
      });
    const runMutation = vi.fn(async (_ref: unknown, payload: Record<string, unknown>) => {
      mutations.push(payload);
      return { success: true };
    });

    const startResult = await (resolveChatToOrg as any)._handler(
      { runQuery, runMutation },
      {
        telegramChatId: "tg_agency_owner",
        senderName: "Agency Owner",
        startParam: "apotheke-adler",
      }
    );

    expect(startResult).toMatchObject({
      organizationId: CHILD_ORG_ID,
      routeToSystemBot: false,
      testingMode: true,
      isExternalCustomer: false,
      resolvedAgentId: CUSTOMER_AGENT_ID,
    });
    expect(mutations[0]).toMatchObject({
      telegramChatId: "tg_agency_owner",
      organizationId: CHILD_ORG_ID,
      targetAgentId: CUSTOMER_AGENT_ID,
    });

    const activeRunQuery = vi.fn(async () => ({
      organizationId: PARENT_ORG_ID,
      status: "active",
      testingOrganizationId: CHILD_ORG_ID,
      testingTargetAgentId: CUSTOMER_AGENT_ID,
    }));
    const activeMutations: Array<Record<string, unknown>> = [];
    const activeRunMutation = vi.fn(async (_ref: unknown, payload: Record<string, unknown>) => {
      activeMutations.push(payload);
      return { success: true };
    });

    const followupResult = await (resolveChatToOrg as any)._handler(
      { runQuery: activeRunQuery, runMutation: activeRunMutation },
      {
        telegramChatId: "tg_agency_owner",
        senderName: "Agency Owner",
      }
    );

    expect(followupResult).toMatchObject({
      organizationId: CHILD_ORG_ID,
      routeToSystemBot: false,
      testingMode: true,
      isExternalCustomer: false,
      resolvedAgentId: CUSTOMER_AGENT_ID,
    });
    expect(activeMutations.some((entry) => entry.organizationId === CHILD_ORG_ID)).toBe(true);
  });
});
