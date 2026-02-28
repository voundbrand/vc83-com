import { describe, expect, it } from "vitest";
import { resolveSupportRecipient } from "../../../convex/lib/supportRouting";

describe("feedback support routing boundary", () => {
  it("fails closed to platform support when both org and env addresses are sales", () => {
    const resolved = resolveSupportRecipient({
      organizationSupportEmail: "sales@customer.com",
      envSupportEmail: "sales@l4yercak3.com",
      envSalesEmail: "sales@l4yercak3.com",
    });

    expect(resolved).toEqual({
      email: "support@l4yercak3.com",
      source: "fallback",
      preventedSalesRoute: true,
    });
  });

  it("keeps the first valid non-sales support target deterministically", () => {
    const resolved = resolveSupportRecipient({
      organizationSupportEmail: "support@customer.com",
      envSupportEmail: "support@l4yercak3.com",
      envSalesEmail: "sales@l4yercak3.com",
    });

    expect(resolved).toEqual({
      email: "support@customer.com",
      source: "organization_contact",
      preventedSalesRoute: false,
    });
  });

  it("marks preventedSalesRoute when the org recipient is blocked before fallback", () => {
    const resolved = resolveSupportRecipient({
      organizationSupportEmail: "sales@customer.com",
      envSupportEmail: "support@customer.com",
      envSalesEmail: "sales@customer.com",
    });

    expect(resolved.email).toBe("support@customer.com");
    expect(resolved.source).toBe("support_env");
    expect(resolved.preventedSalesRoute).toBe(true);
  });
});
