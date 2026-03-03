interface KickoffMessageShape {
  role?: string
  content?: string
}

const INTERNAL_KICKOFF_PREFIXES = [
  "Route this conversation through Samantha commercial intake.",
  "Route this conversation through one-visible-operator activation.",
  "Route this conversation through the platform support intake workflow.",
  "You are now the frontline product partner in this same conversation.",
] as const

const INTERNAL_KICKOFF_MARKERS = [
  "commercial_contract:",
  "response_contract:",
  "required_lead_fields=",
  "required_sequence=triage.v1 -> troubleshooting.v1 -> escalation_decision.v1",
  "coverage_specialist_hint=",
  "entry_context=",
  "trigger=manual_intake",
  "trigger=manual_feedback",
  "trigger=tool_failure",
  "operator_original_request=",
] as const

export function isInternalKickoffContractContent(content: string | undefined): boolean {
  if (typeof content !== "string") {
    return false
  }

  const normalized = content.trim()
  if (!normalized) {
    return false
  }

  if (INTERNAL_KICKOFF_PREFIXES.some((prefix) => normalized.startsWith(prefix))) {
    return true
  }

  const markerMatches = INTERNAL_KICKOFF_MARKERS.reduce((count, marker) => {
    return normalized.includes(marker) ? count + 1 : count
  }, 0)
  return markerMatches >= 3
}

export function shouldHideInternalKickoffMessage(message: KickoffMessageShape): boolean {
  return message.role === "user" && isInternalKickoffContractContent(message.content)
}
