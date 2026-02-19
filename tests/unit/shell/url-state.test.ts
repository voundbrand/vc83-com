import { describe, expect, it } from "vitest"
import {
  buildShellWindowProps,
  isLegacyManageOAuthCallback,
  parseShellUrlState,
  serializeShellUrlState,
  stripShellQueryParams,
} from "@/lib/shell/url-state"

describe("shell url state codec", () => {
  it("parses canonical app/panel/entity/context keys", () => {
    const params = new URLSearchParams("app=store&panel=plans&entity=plan_pro&context=webchat")

    expect(parseShellUrlState(params)).toEqual({
      app: "store",
      panel: "plans",
      entity: "plan_pro",
      context: "webchat",
    })
  })

  it("keeps canonical keys authoritative over legacy aliases", () => {
    const params = new URLSearchParams("app=store&openWindow=crm&panel=plans&tab=contacts")

    expect(parseShellUrlState(params)).toEqual({
      app: "store",
      panel: "plans",
      entity: undefined,
      context: undefined,
    })
  })

  it("falls back to legacy aliases when canonical keys are absent", () => {
    const params = new URLSearchParams("openWindow=templates&tab=email")

    expect(parseShellUrlState(params)).toEqual({
      app: "templates",
      panel: "email",
      entity: undefined,
      context: undefined,
    })
  })

  it("serializes canonical keys in deterministic order", () => {
    const serialized = serializeShellUrlState(
      { app: "store", panel: "plans", entity: "plan_pro", context: "cli" },
      "/"
    )

    expect(serialized).toBe("/?app=store&panel=plans&entity=plan_pro&context=cli")
  })

  it("strips shell and upgrade keys while preserving non-shell query params", () => {
    const params = new URLSearchParams(
      "app=store&panel=plans&openWindow=crm&window=manage&tab=integrations&upgradeReason=credits&upgradeResource=runner&utm_source=newsletter&oauthProvider=google"
    )

    const cleaned = stripShellQueryParams(params)

    expect(cleaned.get("app")).toBeNull()
    expect(cleaned.get("panel")).toBeNull()
    expect(cleaned.get("openWindow")).toBeNull()
    expect(cleaned.get("window")).toBeNull()
    expect(cleaned.get("tab")).toBeNull()
    expect(cleaned.get("upgradeReason")).toBeNull()
    expect(cleaned.get("upgradeResource")).toBeNull()
    expect(cleaned.get("utm_source")).toBe("newsletter")
    expect(cleaned.get("oauthProvider")).toBe("google")
  })

  it("maps shell url state into deterministic window props", () => {
    const props = buildShellWindowProps({
      app: "store",
      panel: "plans",
      entity: "plan_pro",
      context: "webchat",
    })

    expect(props).toEqual({
      initialPanel: "plans",
      initialTab: "plans",
      initialSection: "plans",
      entity: "plan_pro",
      initialEntity: "plan_pro",
      context: "webchat",
      openContext: "webchat",
    })
  })

  it("detects legacy oauth callbacks routed through window/tab", () => {
    const params = new URLSearchParams("window=manage&tab=integrations")
    const nonLegacy = new URLSearchParams("app=manage&panel=integrations")

    expect(isLegacyManageOAuthCallback(params)).toBe(true)
    expect(isLegacyManageOAuthCallback(nonLegacy)).toBe(false)
  })
})
