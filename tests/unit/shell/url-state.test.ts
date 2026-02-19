import { describe, expect, it } from "vitest"
import {
  buildStoreAuthReturnPath,
  buildShellWindowProps,
  getStoreSectionFromQueryParams,
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

  it("maps store section alias into panel when panel is absent", () => {
    const params = new URLSearchParams("app=store&section=credits")

    expect(parseShellUrlState(params)).toEqual({
      app: "store",
      panel: "credits",
      entity: undefined,
      context: undefined,
    })
  })

  it("keeps canonical panel authoritative over store section alias", () => {
    const params = new URLSearchParams("app=store&panel=plans&section=credits")

    expect(parseShellUrlState(params)).toEqual({
      app: "store",
      panel: "plans",
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
      "app=store&panel=plans&section=credits&openWindow=crm&window=manage&tab=integrations&upgradeReason=credits&upgradeResource=runner&utm_source=newsletter&oauthProvider=google"
    )

    const cleaned = stripShellQueryParams(params)

    expect(cleaned.get("app")).toBeNull()
    expect(cleaned.get("panel")).toBeNull()
    expect(cleaned.get("section")).toBeNull()
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

  it("resolves store section from panel/tab aliases and section alias", () => {
    const panelParams = new URLSearchParams("panel=plans")
    const tabParams = new URLSearchParams("tab=credits")
    const sectionAliasParams = new URLSearchParams("section=calculator")
    const invalidParams = new URLSearchParams("panel=invalid&section=unknown")

    expect(getStoreSectionFromQueryParams(panelParams)).toBe("plans")
    expect(getStoreSectionFromQueryParams(tabParams)).toBe("credits")
    expect(getStoreSectionFromQueryParams(sectionAliasParams)).toBe("calculator")
    expect(getStoreSectionFromQueryParams(invalidParams)).toBeUndefined()
  })

  it("builds desktop store auth-return path with panel deep-link and checkout intent", () => {
    const returnPath = buildStoreAuthReturnPath({
      fullScreen: false,
      section: "credits",
      checkoutIntent: { tier: "pro", billingPeriod: "annual" },
    })

    expect(returnPath).toBe(
      "/?openWindow=store&panel=credits&autostartCheckout=1&tier=pro&period=annual"
    )

    const parsed = new URL(returnPath, "https://example.com")
    const state = parseShellUrlState(parsed.searchParams)
    const props = buildShellWindowProps(state)

    expect(state.app).toBe("store")
    expect(state.panel).toBe("credits")
    expect(props?.initialSection).toBe("credits")
  })

  it("builds full-screen store auth-return path with panel and section parity", () => {
    const returnPath = buildStoreAuthReturnPath({
      fullScreen: true,
      section: "calculator",
      checkoutIntent: { tier: "scale", billingPeriod: "monthly" },
    })

    expect(returnPath).toBe(
      "/store?panel=calculator&section=calculator&autostartCheckout=1&tier=scale&period=monthly"
    )

    const parsed = new URL(returnPath, "https://example.com")
    expect(getStoreSectionFromQueryParams(parsed.searchParams)).toBe("calculator")
  })
})
