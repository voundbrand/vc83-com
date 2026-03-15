import { readFileSync } from "node:fs";
import { relative } from "node:path";
import {
  AGENT_CATALOG,
  type LandingDemoAgentKey,
  REPO_ROOT,
  resolveAgentId,
} from "./catalog";

export interface LocalAgentSource {
  key: LandingDemoAgentKey;
  name: string;
  agentId: string;
  prompt: string;
  promptPath: string;
  firstMessage?: string;
  firstMessagePath?: string;
  knowledgeBase?: {
    content: string;
    name: string;
    path: string;
  };
  workflow?: unknown;
  workflowPath?: string;
  managedBuiltInTools: Record<string, unknown>;
  managedToolPaths: string[];
}

function readTextFile(filePath: string): string {
  return readFileSync(filePath, "utf8").trim();
}

function readJsonFile(filePath: string): unknown {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function readToolDefinition(filePath: string): [string, unknown] {
  const tool = readJsonFile(filePath) as { name?: unknown };
  if (typeof tool.name !== "string" || tool.name.trim().length === 0) {
    throw new Error(`Tool definition is missing a valid name: ${relative(REPO_ROOT, filePath)}`);
  }
  return [tool.name, tool];
}

export function readLocalAgentSource(agentKey: LandingDemoAgentKey): LocalAgentSource {
  const definition = AGENT_CATALOG[agentKey];
  const managedBuiltInTools = Object.fromEntries(
    definition.managedToolPaths.map((toolPath) => readToolDefinition(toolPath))
  );

  return {
    key: agentKey,
    name: definition.name,
    agentId: resolveAgentId(agentKey),
    prompt: readTextFile(definition.promptPath),
    promptPath: definition.promptPath,
    firstMessage: definition.firstMessagePath ? readTextFile(definition.firstMessagePath) : undefined,
    firstMessagePath: definition.firstMessagePath,
    knowledgeBase: definition.knowledgeBasePath
      ? {
          content: readTextFile(definition.knowledgeBasePath),
          name: definition.knowledgeBaseName ?? `${definition.name} Knowledge Base`,
          path: definition.knowledgeBasePath,
        }
      : undefined,
    workflow: definition.workflowPath ? readJsonFile(definition.workflowPath) : undefined,
    workflowPath: definition.workflowPath,
    managedBuiltInTools,
    managedToolPaths: definition.managedToolPaths,
  };
}
