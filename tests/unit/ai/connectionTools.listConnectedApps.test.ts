import { describe, expect, it, vi } from "vitest";
import { listConnectedAppsTool } from "../../../convex/ai/tools/connectionTools";

describe("listConnectedAppsTool", () => {
  it("lists connected apps with normalized pagination and status filter", async () => {
    const runQuery = vi.fn().mockResolvedValue({
      applications: [
        {
          _id: "app_1",
          name: "Hub Gateway",
          status: "active",
          subtype: "nextjs",
          createdAt: 1700000000000,
          updatedAt: 1700003600000,
          customProperties: {
            source: { framework: "nextjs" },
            connection: { features: ["cms", "booking"] },
            cli: { lastActivityAt: 1700007200000 },
          },
        },
      ],
      total: 1,
      hasMore: false,
    });

    const result = await listConnectedAppsTool.execute(
      {
        organizationId: "org_1",
        runQuery,
      } as any,
      {
        status: " active ",
        limit: 500,
        offset: -3,
      }
    ) as Record<string, unknown>;

    expect(runQuery).toHaveBeenCalledWith(expect.anything(), {
      organizationId: "org_1",
      status: "active",
      limit: 100,
      offset: 0,
    });
    expect(result.success).toBe(true);
    expect(result.total).toBe(1);
    expect(result.returned).toBe(1);
    expect(result.hasMore).toBe(false);
    expect(result.nextOffset).toBeNull();
    expect(result.message).toBe("Found 1 connected app.");

    const apps = result.applications as Array<Record<string, unknown>>;
    expect(apps).toHaveLength(1);
    expect(apps[0]?.name).toBe("Hub Gateway");
    expect(apps[0]?.framework).toBe("nextjs");
    expect(apps[0]?.features).toEqual(["cms", "booking"]);
    expect(apps[0]?.lastActivityAt).toBe("2023-11-15T00:13:20.000Z");
  });

  it("returns a deterministic failure payload when query fails", async () => {
    const runQuery = vi.fn().mockRejectedValue(new Error("boom"));

    const result = await listConnectedAppsTool.execute(
      {
        organizationId: "org_1",
        runQuery,
      } as any,
      {}
    ) as Record<string, unknown>;

    expect(result.success).toBe(false);
    expect(result.error).toBe("Could not list connected apps: boom");
  });
});
