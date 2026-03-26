export interface AgentModule<Contract = unknown> {
  key: string;
  resolveContract: (
    config: Record<string, unknown> | null | undefined
  ) => Contract | null;
  buildPromptContext?: (contract: Contract) => string | null;
}

export interface ResolvedAgentModule<Contract = unknown> {
  module: AgentModule<Contract>;
  contract: Contract;
}
