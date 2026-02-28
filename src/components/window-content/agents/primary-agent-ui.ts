export interface PrimaryAwareAgentRecord {
  status?: string
  customProperties?: {
    isPrimary?: boolean
  }
}

export function isPrimaryAgentRecord(agent: PrimaryAwareAgentRecord): boolean {
  return agent.customProperties?.isPrimary === true
}

export function countActiveAgents(agents: PrimaryAwareAgentRecord[]): number {
  return agents.filter((agent) => agent.status === "active").length
}

export function canPauseAgentInUi(
  agent: PrimaryAwareAgentRecord,
  activeAgentCount: number
): boolean {
  if (agent.status !== "active") {
    return false
  }
  if (!isPrimaryAgentRecord(agent)) {
    return true
  }
  return activeAgentCount > 1
}

export function canMakePrimaryInUi(agent: PrimaryAwareAgentRecord): boolean {
  return agent.status === "active" && !isPrimaryAgentRecord(agent)
}
