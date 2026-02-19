import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  internalCreateEvent,
  internalPublishCheckout,
} from "../../../convex/ai/tools/internalToolMutations";
import { TOOL_REGISTRY } from "../../../convex/ai/tools/registry";
import { normalizeEventLifecycleStatus } from "../../../convex/orchestrationContract";

type InternalMutationHandler<TArgs, TResult> = (ctx: unknown, args: TArgs) => Promise<TResult>;

describe("publish/status transition guardrails", () => {
  const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = "https://app.example.test";
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
    vi.restoreAllMocks();
  });

  it("rejects legacy checkout object types in internalPublishCheckout", async () => {
    const handler = (internalPublishCheckout as unknown as {
      _handler: InternalMutationHandler<
        { organizationId: string; userId: string; checkoutId: string },
        unknown
      >;
    })._handler;

    const ctx = {
      db: {
        get: vi.fn().mockResolvedValue({
          _id: "checkout_legacy",
          type: "checkout",
          status: "draft",
          organizationId: "org_1",
          customProperties: {},
        }),
        patch: vi.fn(),
        insert: vi.fn(),
      },
    };

    await expect(
      handler(ctx, {
        organizationId: "org_1",
        userId: "user_1",
        checkoutId: "checkout_legacy",
      })
    ).rejects.toThrow("Checkout not found");

    expect(ctx.db.patch).not.toHaveBeenCalled();
  });

  it("publishes checkout_instance objects and records public URL metadata", async () => {
    const fixedNow = 1760000000000;
    vi.spyOn(Date, "now").mockReturnValue(fixedNow);

    const handler = (internalPublishCheckout as unknown as {
      _handler: InternalMutationHandler<
        { organizationId: string; userId: string; checkoutId: string },
        {
          success: boolean;
          checkoutId: string;
          previousStatus: string;
          publicUrl: string;
        }
      >;
    })._handler;

    const patch = vi.fn().mockResolvedValue(undefined);
    const insert = vi.fn().mockResolvedValue("action_1");
    const ctx = {
      db: {
        get: vi.fn().mockResolvedValue({
          _id: "checkout_instance_1",
          type: "checkout_instance",
          status: "draft",
          organizationId: "org_1",
          customProperties: { linkedProducts: [] },
        }),
        patch,
        insert,
      },
    };

    const result = await handler(ctx, {
      organizationId: "org_1",
      userId: "user_1",
      checkoutId: "checkout_instance_1",
    });

    expect(result.success).toBe(true);
    expect(result.publicUrl).toBe("https://app.example.test/c/checkout_instance_1");
    expect(patch).toHaveBeenCalledWith("checkout_instance_1", {
      status: "published",
      customProperties: {
        linkedProducts: [],
        publicUrl: "https://app.example.test/c/checkout_instance_1",
        publishedAt: fixedNow,
      },
      updatedAt: fixedNow,
    });
    expect(insert).toHaveBeenCalledTimes(1);
  });

  it("normalizes legacy event status aliases and keeps legacy create-event semantics on canonical status values", async () => {
    expect(normalizeEventLifecycleStatus("active")).toBe("published");

    const handler = (internalCreateEvent as unknown as {
      _handler: InternalMutationHandler<
        {
          organizationId: string;
          userId: string;
          subtype: string;
          name: string;
          description?: string;
          startDate: number;
          endDate: number;
          location: string;
          capacity?: number;
          timezone?: string;
          published?: boolean;
        },
        string
      >;
    })._handler;

    const insert = vi.fn().mockResolvedValue("event_1");
    const ctx = {
      db: {
        insert,
      },
    };

    await handler(ctx, {
      organizationId: "org_1",
      userId: "user_1",
      subtype: "meetup",
      name: "Platform Event",
      startDate: 1761000000000,
      endDate: 1761007200000,
      location: "Virtual",
    });

    await handler(ctx, {
      organizationId: "org_1",
      userId: "user_1",
      subtype: "meetup",
      name: "Draft Event",
      startDate: 1762000000000,
      endDate: 1762007200000,
      location: "Virtual",
      published: false,
    });

    expect(insert).toHaveBeenNthCalledWith(
      1,
      "objects",
      expect.objectContaining({
        type: "event",
        status: "published",
      })
    );
    expect(insert).toHaveBeenNthCalledWith(
      2,
      "objects",
      expect.objectContaining({
        type: "event",
        status: "draft",
      })
    );
  });

  it("uses canonical published semantics for events in publish_all", async () => {
    const runMutation = vi.fn(async (_ref: unknown, payload: Record<string, unknown>) => {
      if ("checkoutId" in payload) {
        return {
          success: true,
          checkoutId: payload.checkoutId,
          previousStatus: "draft",
          publicUrl: `https://app.example.test/c/${payload.checkoutId as string}`,
        };
      }
      return { success: true };
    });

    const result = await TOOL_REGISTRY.publish_all.execute(
      {
        organizationId: "org_1",
        userId: "user_1",
        runMutation,
      } as never,
      {
        eventIds: ["event_1"],
        productIds: ["product_1"],
        formIds: ["form_1"],
        checkoutIds: ["checkout_1"],
      }
    );

    const eventCall = runMutation.mock.calls.find(
      (_call) => _call[1]?.eventId === "event_1"
    );

    expect(eventCall?.[1]).toMatchObject({
      organizationId: "org_1",
      userId: "user_1",
      eventId: "event_1",
      status: "published",
    });
    expect(result.summary.events).toBe("1/1 published");
    expect(result.success).toBe(true);
  });
});
