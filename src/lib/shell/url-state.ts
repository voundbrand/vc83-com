import { LEGACY_SHELL_URL_STATE_KEYS, SHELL_URL_STATE_KEYS } from "@/hooks/window-registry"

export interface ShellUrlState {
  app?: string
  panel?: string
  entity?: string
  context?: string
}

export const SHELL_QUERY_KEYS = Object.freeze([
  SHELL_URL_STATE_KEYS.app,
  SHELL_URL_STATE_KEYS.panel,
  SHELL_URL_STATE_KEYS.entity,
  SHELL_URL_STATE_KEYS.context,
  LEGACY_SHELL_URL_STATE_KEYS.openWindow,
  LEGACY_SHELL_URL_STATE_KEYS.window,
  LEGACY_SHELL_URL_STATE_KEYS.tab,
])

export const SHELL_UPGRADE_QUERY_KEYS = Object.freeze(["upgradeReason", "upgradeResource"])

const STORE_PANEL_SECTIONS = new Set(["plans", "credits"])

const getNonEmptyParam = (params: URLSearchParams, key: string): string | undefined => {
  const value = params.get(key)
  return value && value.length > 0 ? value : undefined
}

export function parseShellUrlState(params: URLSearchParams): ShellUrlState {
  return {
    app:
      getNonEmptyParam(params, SHELL_URL_STATE_KEYS.app) ||
      getNonEmptyParam(params, LEGACY_SHELL_URL_STATE_KEYS.openWindow) ||
      getNonEmptyParam(params, LEGACY_SHELL_URL_STATE_KEYS.window),
    panel:
      getNonEmptyParam(params, SHELL_URL_STATE_KEYS.panel) ||
      getNonEmptyParam(params, LEGACY_SHELL_URL_STATE_KEYS.tab),
    entity: getNonEmptyParam(params, SHELL_URL_STATE_KEYS.entity),
    context: getNonEmptyParam(params, SHELL_URL_STATE_KEYS.context),
  }
}

export function serializeShellUrlState(state: ShellUrlState, pathname: string = "/"): string {
  const params = new URLSearchParams()

  if (state.app) {
    params.set(SHELL_URL_STATE_KEYS.app, state.app)
  }
  if (state.panel) {
    params.set(SHELL_URL_STATE_KEYS.panel, state.panel)
  }
  if (state.entity) {
    params.set(SHELL_URL_STATE_KEYS.entity, state.entity)
  }
  if (state.context) {
    params.set(SHELL_URL_STATE_KEYS.context, state.context)
  }

  return pathname + (params.toString() ? `?${params.toString()}` : "")
}

export function stripShellQueryParams(
  params: URLSearchParams,
  options: { includeUpgradeKeys?: boolean } = {}
): URLSearchParams {
  const includeUpgradeKeys = options.includeUpgradeKeys ?? true
  const next = new URLSearchParams(params)

  SHELL_QUERY_KEYS.forEach((key) => next.delete(key))
  if (includeUpgradeKeys) {
    SHELL_UPGRADE_QUERY_KEYS.forEach((key) => next.delete(key))
  }

  return next
}

export function buildShellWindowProps(state: ShellUrlState): Record<string, unknown> | undefined {
  const props: Record<string, unknown> = {}

  if (state.panel) {
    props.initialPanel = state.panel
    props.initialTab = state.panel

    if (state.app === "store" && STORE_PANEL_SECTIONS.has(state.panel)) {
      props.initialSection = state.panel
    }
  }

  if (state.entity) {
    props.entity = state.entity
    props.initialEntity = state.entity
  }

  if (state.context) {
    props.context = state.context
    props.openContext = state.context
  }

  if (state.app === "manage" && state.panel === "users" && state.context === "current-user") {
    props.initialUserContext = "current-user"
    props.initialUserEntity = state.entity || "self"
  }

  return Object.keys(props).length > 0 ? props : undefined
}

export function isLegacyManageOAuthCallback(params: URLSearchParams): boolean {
  return (
    getNonEmptyParam(params, LEGACY_SHELL_URL_STATE_KEYS.window) === "manage" &&
    getNonEmptyParam(params, LEGACY_SHELL_URL_STATE_KEYS.tab) === "integrations"
  )
}
