import { describe, expect, it } from "vitest";
import { isSalesMailbox, resolveSupportRecipient } from "../../../convex/lib/supportRouting";

describe("support routing primitives", () => {
  it("prefers organization support mailbox when valid", () => {
    const resolved = resolveSupportRecipient({
      organizationSupportEmail: "help@acme.com",
      envSupportEmail: "support@l4yercak3.com",
      envSalesEmail: "sales@l4yercak3.com",
    });

    expect(resolved).toEqual({
      email: "help@acme.com",
      source: "organization_contact",
      preventedSalesRoute: false,
    });
  });

  it("falls back to support env mailbox when organization support email is missing", () => {
    const resolved = resolveSupportRecipient({
      envSupportEmail: "support@l4yercak3.com",
      envSalesEmail: "sales@l4yercak3.com",
    });

    expect(resolved).toEqual({
      email: "support@l4yercak3.com",
      source: "support_env",
      preventedSalesRoute: false,
    });
  });

  it("prevents sales mailbox routing and falls back to support", () => {
    const resolved = resolveSupportRecipient({
      organizationSupportEmail: "sales@acme.com",
      envSupportEmail: "support@l4yercak3.com",
      envSalesEmail: "sales@l4yercak3.com",
    });

    expect(resolved.email).toBe("support@l4yercak3.com");
    expect(resolved.source).toBe("support_env");
    expect(resolved.preventedSalesRoute).toBe(true);
  });

  it("matches explicit sales mailbox aliases", () => {
    expect(isSalesMailbox("Sales@l4yercak3.com", "sales@l4yercak3.com")).toBe(true);
    expect(isSalesMailbox("support@l4yercak3.com", "sales@l4yercak3.com")).toBe(false);
  });
});
