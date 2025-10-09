/**
 * Simple Connection Test - Just verify Convex is reachable
 */

import { describe, it, expect } from "vitest";
import { createTestHelper } from "./setup";

describe("Simple Connection Test", () => {
  it("should instantiate ConvexTestingHelper", () => {
    const t = createTestHelper();
    expect(t).toBeDefined();
    expect(t.query).toBeDefined();
    expect(t.mutation).toBeDefined();
  });

  it("should close connection", async () => {
    const t = createTestHelper();
    await t.close();
    expect(true).toBe(true);
  }, 5000);
});
