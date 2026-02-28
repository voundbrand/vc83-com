import { describe, expect, it } from "vitest"
import { buildShellTelemetryPayload } from "@/lib/shell/telemetry"

describe("shell telemetry payload guardrails", () => {
  it("keeps only schema-approved keys for each event", () => {
    const payload = buildShellTelemetryPayload("shell_nav_select", {
      menuLabel: "Product",
      itemId: "app-ai-assistant",
      itemLabel: "AI Assistant",
      hasHref: false,
      interactionType: "action",
      ignored: "should-not-pass",
    })

    expect(payload).toEqual({
      menuLabel: "Product",
      itemId: "app-ai-assistant",
      itemLabel: "AI Assistant",
      hasHref: false,
      interactionType: "action",
    })
  })

  it("redacts obvious PII-like string values", () => {
    const payload = buildShellTelemetryPayload("shell_deeplink_entry", {
      windowId: "store",
      context: "user@example.com",
      panel: "plans",
      entity: "https://private.example.com",
      viewportMode: "compact",
    })

    expect(payload).toEqual({
      windowId: "store",
      context: "[redacted]",
      panel: "plans",
      entity: "[redacted]",
      viewportMode: "compact",
    })
  })

  it("drops unsupported value types and non-finite numbers", () => {
    const payload = buildShellTelemetryPayload("shell_window_opened", {
      windowId: "finder",
      source: { nested: "object" },
      viewportMode: "desktop",
      activeWindowCount: Number.NaN,
    })

    expect(payload).toEqual({
      windowId: "finder",
      viewportMode: "desktop",
    })
  })

  it("sanitizes deep-link cleanup payload keys for cleanup diagnostics", () => {
    const payload = buildShellTelemetryPayload("shell_deeplink_cleanup", {
      windowId: "does-not-exist",
      reason: "unknown_app_preflight",
      isRestored: true,
      authLoading: false,
      isSignedIn: false,
      guestAllowed: false,
      isRegistered: false,
      ignored: "not-allowed",
    })

    expect(payload).toEqual({
      windowId: "does-not-exist",
      reason: "unknown_app_preflight",
      isRestored: true,
      authLoading: false,
      isSignedIn: false,
      guestAllowed: false,
      isRegistered: false,
    })
  })
})
