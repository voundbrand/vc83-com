/**
 * Vitest Test Setup
 *
 * Global setup for all tests including:
 * - Test environment configuration
 * - Global test utilities
 * - Mock setup
 */

import { beforeAll, afterAll, afterEach } from "vitest";
import { ConvexTestingHelper } from "convex-helpers/testing";

// Mock Convex environment
process.env.CONVEX_DEPLOYMENT = "test";
process.env.NODE_ENV = "test";

beforeAll(async () => {
  // Global setup before all tests
  console.log("🧪 Starting RBAC test suite...");
});

afterAll(async () => {
  // Global cleanup after all tests
  console.log("✅ RBAC test suite completed");
});

afterEach(async () => {
  // Cleanup after each test
  // Reset any global state if needed
});

// Global test utilities
export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const createMockContext = () => {
  return {
    db: {} as any,
    auth: {} as any,
    storage: {} as any,
  };
};

/**
 * Create a ConvexTestingHelper configured to connect to your cloud deployment
 * Uses CONVEX_URL from .env.local (loaded by vitest.config.ts)
 */
export function createTestHelper() {
  const convexUrl = process.env.CONVEX_URL;

  if (!convexUrl) {
    throw new Error(
      "CONVEX_URL not found in environment. Make sure .env.local exists with CONVEX_URL set."
    );
  }

  return new ConvexTestingHelper({
    backendUrl: convexUrl,
  });
}
