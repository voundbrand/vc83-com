type ShellTelemetryValue = string | number | boolean

export type ShellTelemetryEventName =
  | "shell_window_opened"
  | "shell_window_focused"
  | "shell_window_minimized"
  | "shell_window_closed"
  | "shell_deeplink_entry"
  | "shell_nav_select"

const SHELL_TELEMETRY_SCHEMA: Record<ShellTelemetryEventName, readonly string[]> = {
  shell_window_opened: ["windowId", "source", "viewportMode", "activeWindowCount"],
  shell_window_focused: ["windowId", "viewportMode", "activeWindowCount"],
  shell_window_minimized: ["windowId", "viewportMode", "activeWindowCount"],
  shell_window_closed: ["windowId", "viewportMode", "activeWindowCount"],
  shell_deeplink_entry: ["windowId", "context", "panel", "entity", "viewportMode"],
  shell_nav_select: ["menuLabel", "itemId", "itemLabel", "hasHref", "interactionType"],
}

const PII_MARKERS = ["@", "http://", "https://", "tel:", "mailto:"]
const MAX_TELEMETRY_STRING_LENGTH = 64

function sanitizeShellTelemetryString(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  const lower = trimmed.toLowerCase()
  if (PII_MARKERS.some((marker) => lower.includes(marker))) {
    return "[redacted]"
  }

  return trimmed.slice(0, MAX_TELEMETRY_STRING_LENGTH)
}

function sanitizeShellTelemetryValue(value: unknown): ShellTelemetryValue | null {
  if (typeof value === "string") {
    return sanitizeShellTelemetryString(value)
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null
  }

  if (typeof value === "boolean") {
    return value
  }

  return null
}

export function buildShellTelemetryPayload(
  event: ShellTelemetryEventName,
  payload: Record<string, unknown>
): Record<string, ShellTelemetryValue> {
  const allowedKeys = SHELL_TELEMETRY_SCHEMA[event]
  const sanitized: Record<string, ShellTelemetryValue> = {}

  for (const key of allowedKeys) {
    if (!(key in payload)) {
      continue
    }

    const sanitizedValue = sanitizeShellTelemetryValue(payload[key])
    if (sanitizedValue === null) {
      continue
    }

    sanitized[key] = sanitizedValue
  }

  return sanitized
}
