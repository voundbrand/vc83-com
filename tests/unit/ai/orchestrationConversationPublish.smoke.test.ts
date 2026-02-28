import { afterEach, describe, expect, it, vi } from "vitest";
import { createExperience } from "../../../convex/ai/tools/orchestrationRuntimeActions";
import { createEventExperienceTool } from "../../../convex/ai/tools/orchestrationTools";

type RuntimeHandler = (
  ctx: {
    runQuery: (ref: unknown, args: Record<string, unknown>) => Promise<unknown>;
    runMutation: (ref: unknown, args: Record<string, unknown>) => Promise<unknown>;
  },
  args: Record<string, unknown>
) => Promise<Record<string, unknown>>;

function getRuntimeHandler(): RuntimeHandler {
  return (createExperience as unknown as { _handler: RuntimeHandler })._handler;
}

function buildToolArgs(overrides: Record<string, unknown> = {}) {
  return {
    experienceName: "Launch Summit 2026",
    summary: "Create a launch event experience from one conversation.",
    event: {
      title: "Launch Summit 2026",
      description: "One-day product launch summit with keynotes.",
      startDate: 1765000000000,
      endDate: 1765007200000,
      location: "San Francisco",
      timezone: "America/Los_Angeles",
      eventType: "conference",
      published: true,
    },
    products: [
      {
        name: "General Admission",
        description: "Access to all talks and demos.",
        price: 129,
        currency: "USD",
        subtype: "ticket",
      },
    ],
    form: {
      name: "Attendee Intake",
      description: "Collect attendee details.",
    },
    includeForm: true,
    checkout: {
      name: "Launch Summit Checkout",
      paymentMode: "b2c",
      paymentProviders: ["stripe"],
      published: true,
    },
    idempotencyKey: "conv-launch-summit-2026",
    ...overrides,
  };
}

describe("orchestration conversation-to-publish smoke flow", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("runs a full event playbook flow from conversation payload to published checkout", async () => {
    const runtimeHandler = getRuntimeHandler();
    const runQuery = vi.fn(async () => null);
    const runMutation = vi.fn(
      async (_ref: unknown, payload: Record<string, unknown>) => {
        if ("signature" in payload && "stepKey" in payload && "objectId" in payload) {
          return undefined;
        }
        if ("startDate" in payload && "endDate" in payload && "location" in payload) {
          return "event_1";
        }
        if ("price" in payload && "eventId" in payload) {
          return "product_1";
        }
        if (payload.subtype === "registration" && "name" in payload) {
          return "form_1";
        }
        if ("productIds" in payload && "paymentMode" in payload) {
          return { checkoutId: "checkout_1" };
        }
        if ("checkoutId" in payload && !("name" in payload)) {
          return {
            success: true,
            checkoutId: payload.checkoutId,
            previousStatus: "draft",
            publicUrl: `https://app.example.test/c/${String(payload.checkoutId)}`,
          };
        }
        throw new Error(`Unexpected mutation payload: ${JSON.stringify(payload)}`);
      }
    );

    const runAction = vi.fn(async (_ref: unknown, args: Record<string, unknown>) =>
      runtimeHandler({ runQuery, runMutation }, args)
    );

    const result = await createEventExperienceTool.execute(
      {
        organizationId: "org_1",
        userId: "user_1",
        conversationId: "conv_1",
        runAction,
      } as never,
      buildToolArgs()
    );

    expect(runAction).toHaveBeenCalledTimes(1);
    expect(runAction.mock.calls[0]?.[1]).toMatchObject({
      organizationId: "org_1",
      userId: "user_1",
      conversationId: "conv_1",
      playbook: "event",
    });

    expect(result.success).toBe(true);
    expect(result.artifactBundle).toEqual({
      eventId: "event_1",
      productIds: ["product_1"],
      formId: "form_1",
      checkoutId: "checkout_1",
    });
    expect(result.stepLog).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ stepKey: "event", status: "created" }),
        expect.objectContaining({ stepKey: "product:1", status: "created" }),
        expect.objectContaining({ stepKey: "form", status: "created" }),
        expect.objectContaining({ stepKey: "checkout", status: "created" }),
        expect.objectContaining({ stepKey: "checkout:publish", status: "created" }),
      ])
    );
    expect(result.summary).toEqual(
      expect.objectContaining({ created: 5, skipped: 0, failed: 0 })
    );
  });

  it("captures duplicate event detection when duplicateStrategy=fail_on_duplicate", async () => {
    const runtimeHandler = getRuntimeHandler();
    const runQuery = vi.fn(
      async (_ref: unknown, payload: Record<string, unknown>) => {
        if (payload.artifactType === "event" && typeof payload.signature === "string") {
          return null;
        }
        if (payload.artifactType === "event" && payload.name === "Duplicate Event") {
          return {
            _id: "event_existing",
            type: "event",
            name: "Duplicate Event",
            status: "published",
            matchedBySignature: false,
          };
        }
        return null;
      }
    );
    const runMutation = vi.fn(async () => {
      throw new Error("No mutation calls are expected when duplicate event is blocked.");
    });

    const runAction = vi.fn(async (_ref: unknown, args: Record<string, unknown>) =>
      runtimeHandler({ runQuery, runMutation }, args)
    );

    const result = await createEventExperienceTool.execute(
      {
        organizationId: "org_1",
        userId: "user_1",
        conversationId: "conv_2",
        runAction,
      } as never,
      buildToolArgs({
        event: {
          title: "Duplicate Event",
          startDate: 1765000000000,
          endDate: 1765007200000,
          location: "Remote",
        },
        duplicateStrategy: "fail_on_duplicate",
        failFast: true,
      })
    );

    expect(result.success).toBe(false);
    expect(result.stepLog).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          stepKey: "event",
          status: "failed",
          reason: expect.stringContaining("duplicateStrategy=\"fail_on_duplicate\""),
        }),
        expect.objectContaining({
          stepKey: "product:1",
          status: "skipped",
          reason: "Blocked because required event step failed.",
        }),
        expect.objectContaining({
          stepKey: "checkout",
          status: "skipped",
          reason: "Blocked because required event step failed.",
        }),
      ])
    );
    expect(result.summary).toEqual(
      expect.objectContaining({ failed: 1, skipped: 3 })
    );
    expect(runMutation).not.toHaveBeenCalled();
  });

  it("surfaces publish guardrail failures while keeping checkout artifact creation deterministic", async () => {
    const runtimeHandler = getRuntimeHandler();
    const runQuery = vi.fn(async () => null);
    const runMutation = vi.fn(
      async (_ref: unknown, payload: Record<string, unknown>) => {
        if ("signature" in payload && "stepKey" in payload && "objectId" in payload) {
          return undefined;
        }
        if ("startDate" in payload && "endDate" in payload && "location" in payload) {
          return "event_1";
        }
        if ("price" in payload && "eventId" in payload) {
          return "product_1";
        }
        if (payload.subtype === "registration" && "name" in payload) {
          return "form_1";
        }
        if ("productIds" in payload && "paymentMode" in payload) {
          return { checkoutId: "checkout_1" };
        }
        if ("checkoutId" in payload && !("name" in payload)) {
          throw new Error("Checkout not found");
        }
        throw new Error(`Unexpected mutation payload: ${JSON.stringify(payload)}`);
      }
    );

    const runAction = vi.fn(async (_ref: unknown, args: Record<string, unknown>) =>
      runtimeHandler({ runQuery, runMutation }, args)
    );

    const result = await createEventExperienceTool.execute(
      {
        organizationId: "org_1",
        userId: "user_1",
        conversationId: "conv_3",
        runAction,
      } as never,
      buildToolArgs()
    );

    expect(result.success).toBe(true);
    expect(result.artifactBundle?.checkoutId).toBe("checkout_1");
    expect(result.stepLog).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ stepKey: "checkout", status: "created" }),
        expect.objectContaining({
          stepKey: "checkout:publish",
          status: "failed",
          reason: "Checkout not found",
        }),
      ])
    );
    expect(result.summary).toEqual(
      expect.objectContaining({ created: 4, failed: 1 })
    );
  });
});
