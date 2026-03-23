import { resolve } from "node:path";

export type LandingDemoAgentKey =
  | "clara"
  | "maren"
  | "jonas"
  | "tobias"
  | "lina"
  | "kai"
  | "nora"
  | "samantha"
  | "veronica"
  | "anne_becker";

export interface LandingDemoAgentDefinition {
  key: LandingDemoAgentKey;
  name: string;
  envVar: string;
  defaultAgentId: string;
  promptPath: string;
  firstMessagePath?: string;
  knowledgeBasePath?: string;
  knowledgeBaseName?: string;
  workflowPath?: string;
  managedToolPaths: string[];
}

export const REPO_ROOT = resolve(__dirname, "../../../../../");
export const LANDING_APP_ROOT = resolve(REPO_ROOT, "apps/one-of-one-landing");
export const ME_IMMO_APP_ROOT = resolve(REPO_ROOT, "apps/me-immo");
export const ELEVENLABS_FIXTURES_ROOT = resolve(LANDING_APP_ROOT, "fixtures/elevenlabs");
export const LANDING_DEMO_AGENTS_ROOT = resolve(
  REPO_ROOT,
  "docs/reference_projects/elevenlabs/implementation-eleven-agents-rollout/landing-demo-agents"
);
export const ME_IMMO_ELEVENLABS_AGENTS_ROOT = resolve(
  ME_IMMO_APP_ROOT,
  "elevenlabs/agents"
);

const SHARED_TOOL_PATHS = {
  endCall: resolve(LANDING_DEMO_AGENTS_ROOT, "end_call.json"),
  transferToClara: resolve(LANDING_DEMO_AGENTS_ROOT, "transfer_to_clara.json"),
  transferToHuman: resolve(LANDING_DEMO_AGENTS_ROOT, "transfer_to_human.json"),
};

const DEFAULT_AGENT_IDS: Record<LandingDemoAgentKey, string> = {
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
    promptPath: resolve(agentDir("clara"), "system-prompt.md"),
    firstMessagePath: resolve(agentDir("clara"), "first-message.md"),
    knowledgeBasePath: resolve(agentDir("clara"), "knowledge-base.md"),
    knowledgeBaseName: "Clara Knowledge Base",
    workflowPath: resolve(agentDir("clara"), "workflow.json"),
    managedToolPaths: [
      SHARED_TOOL_PATHS.endCall,
      resolve(agentDir("clara"), "tools.json"),
      resolve(agentDir("clara"), "transfer_to_human.json"),
    ],
  },
  maren: {
    key: "maren",
    name: "Maren",
    envVar: "MAREN_ELEVENLABS_AGENT_ID",
    defaultAgentId: DEFAULT_AGENT_IDS.maren,
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
    promptPath: resolve(agentDir("veronica"), "system-prompt.md"),
    firstMessagePath: resolve(agentDir("veronica"), "first-message.md"),
    knowledgeBasePath: resolve(agentDir("veronica"), "knowledge-base.md"),
    knowledgeBaseName: "Veronica Knowledge Base",
    managedToolPaths: [
      SHARED_TOOL_PATHS.endCall,
      SHARED_TOOL_PATHS.transferToClara,
      SHARED_TOOL_PATHS.transferToHuman,
    ],
  },
  anne_becker: {
    key: "anne_becker",
    name: "Anne Becker",
    envVar: "ANNE_BECKER_ELEVENLABS_AGENT_ID",
    defaultAgentId: DEFAULT_AGENT_IDS.anne_becker,
    promptPath: resolve(ME_IMMO_ELEVENLABS_AGENTS_ROOT, "anne-becker", "system-prompt.md"),
    firstMessagePath: resolve(ME_IMMO_ELEVENLABS_AGENTS_ROOT, "anne-becker", "first-message.md"),
    knowledgeBasePath: resolve(ME_IMMO_ELEVENLABS_AGENTS_ROOT, "anne-becker", "knowledge-base.md"),
    knowledgeBaseName: "Anne Becker Knowledge Base",
    managedToolPaths: [
      SHARED_TOOL_PATHS.endCall,
      resolve(ME_IMMO_ELEVENLABS_AGENTS_ROOT, "anne-becker", "transfer_to_human.json"),
    ],
  },
};

export const AGENT_KEYS = Object.keys(AGENT_CATALOG) as LandingDemoAgentKey[];

export function resolveAgentId(agentKey: LandingDemoAgentKey): string {
  const { envVar, defaultAgentId } = AGENT_CATALOG[agentKey];
  return process.env[envVar]?.trim() || defaultAgentId;
}

export function resolveAgentKeyById(agentId: string | null | undefined): LandingDemoAgentKey | null {
  if (!agentId) {
    return null;
  }

  for (const agentKey of AGENT_KEYS) {
    if (resolveAgentId(agentKey) === agentId || AGENT_CATALOG[agentKey].defaultAgentId === agentId) {
      return agentKey;
    }
  }

  return null;
}

export function formatAgent(agentKey: LandingDemoAgentKey): string {
  return AGENT_CATALOG[agentKey].name;
}
