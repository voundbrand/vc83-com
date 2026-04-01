"use node";

import { resolve } from "node:path";

export type LandingDemoAgentKey =
  | "clara"
  | "clara_v3"
  | "maren"
  | "jonas"
  | "tobias"
  | "lina"
  | "kai"
  | "nora"
  | "samantha"
  | "veronica"
  | "anne_becker";

export type LandingDemoAgentLifecycleStatus = "active" | "inactive";
export type LandingDemoDeploymentLane =
  | "clara_demo_roster"
  | "adjacent_runtime"
  | "client_owned";
export type LandingDemoClaraBoundaryMode =
  | "entrypoint"
  | "specialist"
  | "separate_line_receptionist"
  | "not_in_clara_flow";

export interface LandingDemoAgentDefinition {
  key: LandingDemoAgentKey;
  name: string;
  envVar: string;
  defaultAgentId?: string;
  requireEnvAgentId?: boolean;
  lifecycle: LandingDemoAgentLifecycleStatus;
  lifecycleReason?: string;
  deploymentLane: LandingDemoDeploymentLane;
  claraBoundaryMode: LandingDemoClaraBoundaryMode;
  promptPath: string;
  firstMessagePath?: string;
  knowledgeBasePath?: string;
  knowledgeBaseName?: string;
  guardrailsPath?: string;
  workflowPath?: string;
  managedToolPaths: string[];
  enforceManagedBuiltInToolsOnly?: boolean;
}

export const REPO_ROOT = resolve(__dirname, "../../../..");
export const LANDING_APP_ROOT = resolve(REPO_ROOT, "apps/one-of-one-landing");
export const ELEVENLABS_AGENTS_ROOT = resolve(REPO_ROOT, "convex/ai/agents/elevenlabs");
export const ELEVENLABS_FIXTURES_ROOT = resolve(LANDING_APP_ROOT, "fixtures/elevenlabs");
export const LANDING_DEMO_AGENTS_ROOT = resolve(ELEVENLABS_AGENTS_ROOT, "landing-demo-agents");
export const CLIENT_OWNED_ELEVENLABS_AGENTS_ROOT = resolve(ELEVENLABS_AGENTS_ROOT, "client_owned");

const SHARED_TOOL_PATHS = {
  endCall: resolve(LANDING_DEMO_AGENTS_ROOT, "end_call.json"),
  transferToClara: resolve(LANDING_DEMO_AGENTS_ROOT, "transfer_to_clara.json"),
  transferToHuman: resolve(LANDING_DEMO_AGENTS_ROOT, "transfer_to_human.json"),
};

const DEFAULT_AGENT_IDS = {
  clara: "agent_4501kkk9m4fdezp8hby997w5v630",
  maren: "agent_8601kknt8xcve37vyqnf4asktczh",
  jonas: "agent_7501kkntg09qegs8nx4fv8g1js1z",
  tobias: "agent_1301kknqwgvmezk90qcgmjqtwhr5",
  lina: "agent_4401kknv2pswe5mb5c8dzgf87bcq",
  kai: "agent_6301kknv5hd5fr89hby28wvrrzcb",
  nora: "agent_8301kknv8hc9e0pvdgyy7ve8h07t",
  samantha: "agent_9101kkkg56cde6hbf7k9mp86tp9h",
  veronica: "agent_4701kkxzwavkecps3rgsmhfwyswy",
  anne_becker: "agent_5801km2dzv9ye1btjthfeca9507k",
};

function agentDir(agentKey: LandingDemoAgentKey): string {
  return resolve(LANDING_DEMO_AGENTS_ROOT, agentKey);
}

export const AGENT_CATALOG: Record<LandingDemoAgentKey, LandingDemoAgentDefinition> = {
  clara: {
    key: "clara",
    name: "Clara",
    envVar: "CLARA_ELEVENLABS_AGENT_ID",
    defaultAgentId: DEFAULT_AGENT_IDS.clara,
    lifecycle: "active",
    lifecycleReason: "primary_legal_front_office_voice_concierge",
    deploymentLane: "clara_demo_roster",
    claraBoundaryMode: "entrypoint",
    promptPath: resolve(agentDir("clara"), "system-prompt.md"),
    firstMessagePath: resolve(agentDir("clara"), "first-message.md"),
    knowledgeBasePath: resolve(agentDir("clara"), "knowledge-base.md"),
    knowledgeBaseName: "Clara Knowledge Base",
    guardrailsPath: resolve(agentDir("clara"), "guardrails.json"),
    workflowPath: resolve(agentDir("clara"), "workflow.json"),
    managedToolPaths: [
      SHARED_TOOL_PATHS.endCall,
      resolve(agentDir("clara"), "tools.json"),
      resolve(agentDir("clara"), "transfer_to_human.json"),
    ],
  },
  clara_v3: {
    key: "clara_v3",
    name: "Clara V3 Candidate",
    envVar: "CLARA_V3_ELEVENLABS_AGENT_ID",
    requireEnvAgentId: true,
    lifecycle: "inactive",
    lifecycleReason: "parallel_candidate_requires_dedicated_agent_id",
    deploymentLane: "clara_demo_roster",
    claraBoundaryMode: "entrypoint",
    promptPath: resolve(agentDir("clara_v3"), "system-prompt.md"),
    firstMessagePath: resolve(agentDir("clara_v3"), "first-message.md"),
    knowledgeBasePath: resolve(agentDir("clara_v3"), "knowledge-base.md"),
    knowledgeBaseName: "Clara V3 Candidate Knowledge Base",
    guardrailsPath: resolve(agentDir("clara_v3"), "guardrails.json"),
    managedToolPaths: [SHARED_TOOL_PATHS.endCall],
    enforceManagedBuiltInToolsOnly: true,
  },
  maren: {
    key: "maren",
    name: "Maren",
    envVar: "MAREN_ELEVENLABS_AGENT_ID",
    defaultAgentId: DEFAULT_AGENT_IDS.maren,
    lifecycle: "inactive",
    lifecycleReason: "specialist_preserved_inactive_by_default",
    deploymentLane: "clara_demo_roster",
    claraBoundaryMode: "specialist",
    promptPath: resolve(agentDir("maren"), "system-prompt.md"),
    knowledgeBasePath: resolve(agentDir("maren"), "knowledge-base.md"),
    knowledgeBaseName: "Maren Knowledge Base",
    managedToolPaths: [
      SHARED_TOOL_PATHS.endCall,
      SHARED_TOOL_PATHS.transferToClara,
      SHARED_TOOL_PATHS.transferToHuman,
    ],
  },
  jonas: {
    key: "jonas",
    name: "Jonas",
    envVar: "JONAS_ELEVENLABS_AGENT_ID",
    defaultAgentId: DEFAULT_AGENT_IDS.jonas,
    lifecycle: "inactive",
    lifecycleReason: "specialist_preserved_inactive_by_default",
    deploymentLane: "clara_demo_roster",
    claraBoundaryMode: "specialist",
    promptPath: resolve(agentDir("jonas"), "system-prompt.md"),
    knowledgeBasePath: resolve(agentDir("jonas"), "knowledge-base.md"),
    knowledgeBaseName: "Jonas Knowledge Base",
    managedToolPaths: [
      SHARED_TOOL_PATHS.endCall,
      SHARED_TOOL_PATHS.transferToClara,
      SHARED_TOOL_PATHS.transferToHuman,
    ],
  },
  tobias: {
    key: "tobias",
    name: "Tobias",
    envVar: "TOBIAS_ELEVENLABS_AGENT_ID",
    defaultAgentId: DEFAULT_AGENT_IDS.tobias,
    lifecycle: "inactive",
    lifecycleReason: "specialist_preserved_inactive_by_default",
    deploymentLane: "clara_demo_roster",
    claraBoundaryMode: "specialist",
    promptPath: resolve(agentDir("tobias"), "system-prompt.md"),
    knowledgeBasePath: resolve(agentDir("tobias"), "knowledge-base.md"),
    knowledgeBaseName: "Tobias Knowledge Base",
    managedToolPaths: [
      SHARED_TOOL_PATHS.endCall,
      SHARED_TOOL_PATHS.transferToClara,
      SHARED_TOOL_PATHS.transferToHuman,
    ],
  },
  lina: {
    key: "lina",
    name: "Lina",
    envVar: "LINA_ELEVENLABS_AGENT_ID",
    defaultAgentId: DEFAULT_AGENT_IDS.lina,
    lifecycle: "inactive",
    lifecycleReason: "specialist_preserved_inactive_by_default",
    deploymentLane: "clara_demo_roster",
    claraBoundaryMode: "specialist",
    promptPath: resolve(agentDir("lina"), "system-prompt.md"),
    knowledgeBasePath: resolve(agentDir("lina"), "knowledge-base.md"),
    knowledgeBaseName: "Lina Knowledge Base",
    managedToolPaths: [
      SHARED_TOOL_PATHS.endCall,
      SHARED_TOOL_PATHS.transferToClara,
      SHARED_TOOL_PATHS.transferToHuman,
    ],
  },
  kai: {
    key: "kai",
    name: "Kai",
    envVar: "KAI_ELEVENLABS_AGENT_ID",
    defaultAgentId: DEFAULT_AGENT_IDS.kai,
    lifecycle: "inactive",
    lifecycleReason: "specialist_preserved_inactive_by_default",
    deploymentLane: "clara_demo_roster",
    claraBoundaryMode: "specialist",
    promptPath: resolve(agentDir("kai"), "system-prompt.md"),
    firstMessagePath: resolve(agentDir("kai"), "first-message.md"),
    knowledgeBasePath: resolve(agentDir("kai"), "knowledge-base.md"),
    knowledgeBaseName: "Kai Knowledge Base",
    managedToolPaths: [
      SHARED_TOOL_PATHS.endCall,
      SHARED_TOOL_PATHS.transferToClara,
      SHARED_TOOL_PATHS.transferToHuman,
    ],
  },
  nora: {
    key: "nora",
    name: "Nora",
    envVar: "NORA_ELEVENLABS_AGENT_ID",
    defaultAgentId: DEFAULT_AGENT_IDS.nora,
    lifecycle: "inactive",
    lifecycleReason: "specialist_preserved_inactive_by_default",
    deploymentLane: "clara_demo_roster",
    claraBoundaryMode: "specialist",
    promptPath: resolve(agentDir("nora"), "system-prompt.md"),
    knowledgeBasePath: resolve(agentDir("nora"), "knowledge-base.md"),
    knowledgeBaseName: "Nora Knowledge Base",
    managedToolPaths: [
      SHARED_TOOL_PATHS.endCall,
      SHARED_TOOL_PATHS.transferToClara,
      SHARED_TOOL_PATHS.transferToHuman,
    ],
  },
  samantha: {
    key: "samantha",
    name: "Samantha",
    envVar: "SAMANTHA_ELEVENLABS_AGENT_ID",
    defaultAgentId: DEFAULT_AGENT_IDS.samantha,
    lifecycle: "active",
    lifecycleReason: "web_diagnostic_layer",
    deploymentLane: "adjacent_runtime",
    claraBoundaryMode: "not_in_clara_flow",
    promptPath: resolve(agentDir("samantha"), "system-prompt.md"),
    knowledgeBasePath: resolve(agentDir("samantha"), "knowledge-base.md"),
    knowledgeBaseName: "Samantha Knowledge Base",
    managedToolPaths: [SHARED_TOOL_PATHS.endCall, SHARED_TOOL_PATHS.transferToHuman],
  },
  veronica: {
    key: "veronica",
    name: "Veronica",
    envVar: "VERONICA_ELEVENLABS_AGENT_ID",
    defaultAgentId: DEFAULT_AGENT_IDS.veronica,
    lifecycle: "active",
    lifecycleReason: "receptionist_boundary_channel",
    deploymentLane: "adjacent_runtime",
    claraBoundaryMode: "separate_line_receptionist",
    promptPath: resolve(agentDir("veronica"), "system-prompt.md"),
    firstMessagePath: resolve(agentDir("veronica"), "first-message.md"),
    knowledgeBasePath: resolve(agentDir("veronica"), "knowledge-base.md"),
    knowledgeBaseName: "Veronica Knowledge Base",
    managedToolPaths: [
      SHARED_TOOL_PATHS.endCall,
      resolve(agentDir("veronica"), "transfer_to_clara.json"),
      SHARED_TOOL_PATHS.transferToHuman,
    ],
  },
  anne_becker: {
    key: "anne_becker",
    name: "Anne Becker",
    envVar: "ANNE_BECKER_ELEVENLABS_AGENT_ID",
    defaultAgentId: DEFAULT_AGENT_IDS.anne_becker,
    lifecycle: "active",
    lifecycleReason: "client_owned_me_immo_path",
    deploymentLane: "client_owned",
    claraBoundaryMode: "not_in_clara_flow",
    promptPath: resolve(CLIENT_OWNED_ELEVENLABS_AGENTS_ROOT, "anne_becker", "system-prompt.md"),
    firstMessagePath: resolve(CLIENT_OWNED_ELEVENLABS_AGENTS_ROOT, "anne_becker", "first-message.md"),
    knowledgeBasePath: resolve(CLIENT_OWNED_ELEVENLABS_AGENTS_ROOT, "anne_becker", "knowledge-base.md"),
    knowledgeBaseName: "Anne Becker Knowledge Base",
    managedToolPaths: [
      SHARED_TOOL_PATHS.endCall,
      resolve(CLIENT_OWNED_ELEVENLABS_AGENTS_ROOT, "anne_becker", "transfer_to_human.json"),
    ],
  },
};

export const AGENT_KEYS = Object.keys(AGENT_CATALOG) as LandingDemoAgentKey[];
export const ACTIVE_AGENT_KEYS = AGENT_KEYS.filter(
  (agentKey) => AGENT_CATALOG[agentKey].lifecycle === "active"
);
export const INACTIVE_AGENT_KEYS = AGENT_KEYS.filter(
  (agentKey) => AGENT_CATALOG[agentKey].lifecycle === "inactive"
);
export const CLARA_DEMO_ROSTER_AGENT_KEYS = AGENT_KEYS.filter(
  (agentKey) => AGENT_CATALOG[agentKey].deploymentLane === "clara_demo_roster"
);
export const ADJACENT_RUNTIME_AGENT_KEYS = AGENT_KEYS.filter(
  (agentKey) => AGENT_CATALOG[agentKey].deploymentLane === "adjacent_runtime"
);

export function resolveAgentId(agentKey: LandingDemoAgentKey): string {
  const { envVar, defaultAgentId, requireEnvAgentId } = AGENT_CATALOG[agentKey];
  const fromEnv = process.env[envVar]?.trim();
  if (fromEnv) {
    return fromEnv;
  }
  if (defaultAgentId) {
    return defaultAgentId;
  }
  if (requireEnvAgentId) {
    throw new Error(
      `Missing required env var ${envVar} for ${formatAgent(agentKey)}. Set a dedicated ElevenLabs agent ID before syncing this candidate.`
    );
  }
  throw new Error(`No agent id configured for ${formatAgent(agentKey)}.`);
}

export function resolveAgentKeyById(agentId: string | null | undefined): LandingDemoAgentKey | null {
  if (!agentId) {
    return null;
  }

  for (const agentKey of AGENT_KEYS) {
    const defaultAgentId = AGENT_CATALOG[agentKey].defaultAgentId;
    let resolvedAgentId: string | null = null;
    try {
      resolvedAgentId = resolveAgentId(agentKey);
    } catch {
      resolvedAgentId = null;
    }
    if (resolvedAgentId === agentId || defaultAgentId === agentId) {
      return agentKey;
    }
  }

  return null;
}

export function formatAgent(agentKey: LandingDemoAgentKey): string {
  return AGENT_CATALOG[agentKey].name;
}
