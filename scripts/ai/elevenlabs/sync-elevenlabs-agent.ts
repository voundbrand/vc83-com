#!/usr/bin/env tsx

import {
  ACTIVE_AGENT_KEYS,
  AGENT_KEYS,
  formatAgent,
  type LandingDemoAgentKey,
} from "./lib/catalog";
import {
  ElevenLabsClient,
  type ElevenLabsAgentPrompt,
  type ElevenLabsCreatedKnowledgeBaseDocument,
  type ElevenLabsKnowledgeBaseDocumentRef,
} from "./lib/elevenlabs-api";
import { loadLandingDemoEnv, requireEnv } from "./lib/env";
import { readLocalAgentSource } from "./lib/source-of-truth";
import { relativeToRepo, stableSerialize } from "./lib/utils";

interface SyncOptions {
  agentKeys: LandingDemoAgentKey[];
  write: boolean;
  selectionMode: "default_active" | "all" | "explicit";
}

type JsonRecord = Record<string, unknown>;
type AgentPlatformSettings = Record<string, unknown> & {
  guardrails?: unknown;
};

interface RemoteKnowledgeBaseState {
  refs: ElevenLabsKnowledgeBaseDocumentRef[];
  documents: Array<{
    content: string;
    name: string;
  }>;
}

async function main(): Promise<void> {
  loadLandingDemoEnv();

  const options = parseArgs(process.argv.slice(2));
  const client = new ElevenLabsClient(requireEnv("ELEVENLABS_API_KEY"));

  console.log("ElevenLabs landing-demo sync");
  console.log(`Mode: ${options.write ? "write" : "dry-run"}`);
  if (options.selectionMode === "default_active") {
    console.log("Selection: active subset (default)");
  } else if (options.selectionMode === "all") {
    console.log("Selection: full catalog (--all)");
  } else {
    console.log("Selection: explicit agents (--agent)");
  }
  console.log(`Agents: ${options.agentKeys.map((agentKey) => formatAgent(agentKey)).join(", ")}`);
  console.log("");

  let hasChanges = false;

  for (const agentKey of options.agentKeys) {
    const source = readLocalAgentSource(agentKey);
    const remoteAgent = await client.getAgent(source.agentId);
    const remotePrompt = remoteAgent.conversation_config.agent.prompt;
    const remoteFirstMessage = remoteAgent.conversation_config.agent.first_message ?? null;
    const remoteKnowledgeBase = source.knowledgeBase
      ? await readRemoteKnowledgeBaseState(client, remotePrompt.knowledge_base)
      : undefined;
    const desiredPrompt = buildDesiredPrompt(
      remotePrompt,
      source.prompt,
      source.managedBuiltInTools,
      undefined,
      source.enforceManagedBuiltInToolsOnly
    );
    const promptChanged = stableSerialize(remotePrompt.prompt ?? null) !== stableSerialize(source.prompt);
    const firstMessageChanged =
      source.firstMessage !== undefined &&
      stableSerialize(remoteFirstMessage) !== stableSerialize(source.firstMessage);
    const builtInToolsChanged =
      stableSerialize(normalizeBuiltInToolsForComparison(remotePrompt.built_in_tools)) !==
      stableSerialize(normalizeBuiltInToolsForComparison(desiredPrompt.built_in_tools));
    const toolIdsChanged =
      stableSerialize(remotePrompt.tool_ids ?? null) !== stableSerialize(desiredPrompt.tool_ids ?? null);
    const knowledgeBaseChanged =
      source.knowledgeBase !== undefined &&
      stableSerialize(
        remoteKnowledgeBase?.documents.map((document) => ({
          name: document.name,
          content: document.content,
        })) ?? []
      ) !==
        stableSerialize([
          {
            name: source.knowledgeBase.name,
            content: source.knowledgeBase.content,
          },
        ]);
    const workflowChanged =
      source.workflow !== undefined &&
      stableSerialize(remoteAgent.workflow ?? null) !== stableSerialize(source.workflow);
    const guardrailsChanged =
      source.guardrails !== undefined &&
      stableSerialize(remoteAgent.platform_settings?.guardrails ?? null) !== stableSerialize(source.guardrails);

    const needsUpdate =
      promptChanged ||
      firstMessageChanged ||
      builtInToolsChanged ||
      toolIdsChanged ||
      knowledgeBaseChanged ||
      workflowChanged ||
      guardrailsChanged;
    hasChanges = hasChanges || needsUpdate;

    console.log(`${needsUpdate ? "CHANGE" : "OK"} ${formatAgent(agentKey)} (${source.agentId})`);
    console.log(`  prompt: ${promptChanged ? "out of sync" : "in sync"} (${relativeToRepo(source.promptPath)})`);
    if (source.firstMessagePath) {
      console.log(
        `  first message: ${firstMessageChanged ? "out of sync" : "in sync"} (${relativeToRepo(
          source.firstMessagePath
        )})`
      );
    }
    if (source.knowledgeBase) {
      console.log(
        `  knowledge base: ${knowledgeBaseChanged ? "out of sync" : "in sync"} (${relativeToRepo(
          source.knowledgeBase.path
        )})`
      );
    }
    console.log(
      `  tools: ${builtInToolsChanged ? "out of sync" : "in sync"} (${source.managedToolPaths
        .map((toolPath) => relativeToRepo(toolPath))
        .join(", ")})`
    );

    if (source.workflowPath) {
      console.log(
        `  workflow: ${workflowChanged ? "out of sync" : "in sync"} (${relativeToRepo(
          source.workflowPath
        )})`
      );
    }
    if (source.guardrailsPath) {
      console.log(
        `  guardrails: ${guardrailsChanged ? "out of sync" : "in sync"} (${relativeToRepo(
          source.guardrailsPath
        )})`
      );
    }

    if (!needsUpdate) {
      console.log("");
      continue;
    }

    if (!options.write) {
      console.log("  action: skipped (dry-run)");
      console.log("");
      continue;
    }

    let desiredKnowledgeBase = remoteKnowledgeBase?.refs;
    let staleKnowledgeBaseIds: string[] = [];

    if (knowledgeBaseChanged && source.knowledgeBase) {
      const createdKnowledgeBase = await client.createTextKnowledgeBaseDocument(
        source.knowledgeBase.name,
        source.knowledgeBase.content
      );
      desiredKnowledgeBase = [toKnowledgeBaseRef(createdKnowledgeBase, source.knowledgeBase.name)];
      staleKnowledgeBaseIds = remoteKnowledgeBase?.refs.map((ref) => ref.id).filter(Boolean) ?? [];
    }

    const payload = {
      conversation_config: {
        ...remoteAgent.conversation_config,
        agent: {
          ...remoteAgent.conversation_config.agent,
          ...(source.firstMessage !== undefined ? { first_message: source.firstMessage } : {}),
          prompt: buildDesiredPrompt(
            remotePrompt,
            source.prompt,
            source.managedBuiltInTools,
            desiredKnowledgeBase,
            source.enforceManagedBuiltInToolsOnly
          ),
        },
      },
      ...(source.guardrails !== undefined
        ? {
            platform_settings: {
              ...(remoteAgent.platform_settings as AgentPlatformSettings | undefined),
              guardrails: source.guardrails,
            },
          }
        : {}),
      ...(source.workflow !== undefined ? { workflow: source.workflow } : {}),
    };

    await client.updateAgent(source.agentId, payload);

    for (const documentId of staleKnowledgeBaseIds) {
      try {
        await client.deleteKnowledgeBaseDocument(documentId, true);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`  warning: failed to delete stale knowledge-base doc ${documentId}: ${message}`);
      }
    }

    console.log("  action: updated staging agent");
    console.log("");
  }

  if (!hasChanges) {
    console.log("No staging drift detected.");
    return;
  }

  if (!options.write) {
    console.log("Drift detected. Re-run with --write to push local source-of-truth files to staging.");
  }
}

function buildDesiredPrompt(
  remotePrompt: ElevenLabsAgentPrompt,
  localPrompt: string,
  managedBuiltInTools: Record<string, unknown>,
  knowledgeBase?: ElevenLabsKnowledgeBaseDocumentRef[],
  enforceManagedBuiltInToolsOnly = false
): ElevenLabsAgentPrompt {
  const remoteBuiltInTools = asRecord(remotePrompt.built_in_tools);
  const mergedBuiltInTools: JsonRecord = enforceManagedBuiltInToolsOnly
    ? {}
    : { ...remoteBuiltInTools };

  for (const [toolName, localToolDefinition] of Object.entries(managedBuiltInTools)) {
    mergedBuiltInTools[toolName] = mergeBuiltInTool(
      remoteBuiltInTools[toolName],
      normalizeBuiltInTool(localToolDefinition)
    );
  }

  const desiredPrompt: ElevenLabsAgentPrompt = {
    ...remotePrompt,
    prompt: localPrompt,
    built_in_tools: mergedBuiltInTools,
    ...(knowledgeBase !== undefined ? { knowledge_base: knowledgeBase } : {}),
  };

  delete desiredPrompt.tools;
  if (enforceManagedBuiltInToolsOnly) {
    delete desiredPrompt.tool_ids;
  }
  return desiredPrompt;
}

async function readRemoteKnowledgeBaseState(
  client: ElevenLabsClient,
  knowledgeBase: ElevenLabsKnowledgeBaseDocumentRef[] | undefined
): Promise<RemoteKnowledgeBaseState> {
  const refs = normalizeKnowledgeBaseRefs(knowledgeBase);
  const documents = await Promise.all(
    refs.map(async (ref) => ({
      name: ref.name ?? "",
      content: (await client.getKnowledgeBaseDocumentContent(ref.id)).trim(),
    }))
  );

  return {
    refs,
    documents,
  };
}

function normalizeKnowledgeBaseRefs(
  knowledgeBase: ElevenLabsKnowledgeBaseDocumentRef[] | undefined
): ElevenLabsKnowledgeBaseDocumentRef[] {
  if (!Array.isArray(knowledgeBase)) {
    return [];
  }

  return knowledgeBase.filter(
    (entry): entry is ElevenLabsKnowledgeBaseDocumentRef =>
      Boolean(entry) && typeof entry.id === "string" && entry.id.trim().length > 0
  );
}

function toKnowledgeBaseRef(
  document: ElevenLabsCreatedKnowledgeBaseDocument,
  fallbackName: string
): ElevenLabsKnowledgeBaseDocumentRef {
  return {
    id: document.id,
    name: document.name || fallbackName,
    type: "text",
    usage_mode: "auto",
  };
}

function normalizeBuiltInToolsForComparison(value: unknown): JsonRecord {
  return Object.fromEntries(
    Object.entries(asRecord(value)).map(([toolName, toolDefinition]) => [
      toolName,
      normalizeBuiltInTool(toolDefinition),
    ])
  );
}

function normalizeBuiltInTool(value: unknown): unknown {
  if (!isJsonRecord(value)) {
    return value;
  }

  const tool = deepClone(value);
  const dynamicVariables = asOptionalRecord(tool.dynamic_variables);

  if (
    dynamicVariables &&
    isEmptyRecord(asOptionalRecord(dynamicVariables.dynamic_variable_placeholders))
  ) {
    delete tool.dynamic_variables;
  }

  const params = asOptionalRecord(tool.params);
  if (params?.system_tool_type === "end_call" && isEmptyArray(params.transfers)) {
    delete params.transfers;
  }

  if (Array.isArray(params?.transfers)) {
    params.transfers = params.transfers.map((transfer) => normalizeTransferDefinition(transfer));
  }

  return tool;
}

function mergeBuiltInTool(remoteTool: unknown, localTool: unknown): unknown {
  if (!isJsonRecord(remoteTool)) {
    return localTool;
  }

  if (!isJsonRecord(localTool)) {
    return localTool;
  }

  const merged: JsonRecord = { ...remoteTool };

  for (const [key, localValue] of Object.entries(localTool)) {
    const remoteValue = remoteTool[key];
    if (isJsonRecord(remoteValue) && isJsonRecord(localValue)) {
      merged[key] = mergeBuiltInTool(remoteValue, localValue);
      continue;
    }

    merged[key] = localValue;
  }

  return merged;
}

function asRecord(value: unknown): JsonRecord {
  return isJsonRecord(value) ? value : {};
}

function asOptionalRecord(value: unknown): JsonRecord | undefined {
  return isJsonRecord(value) ? value : undefined;
}

function deepClone(value: JsonRecord): JsonRecord {
  return JSON.parse(JSON.stringify(value)) as JsonRecord;
}

function isJsonRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isEmptyArray(value: unknown): value is [] {
  return Array.isArray(value) && value.length === 0;
}

function isEmptyRecord(value: JsonRecord | undefined): boolean {
  return !value || Object.keys(value).length === 0;
}

function normalizeTransferDefinition(value: unknown): unknown {
  if (!isJsonRecord(value)) {
    return value;
  }

  const transfer = deepClone(value);
  if (transfer.is_workflow_node_transfer === false) {
    delete transfer.is_workflow_node_transfer;
  }

  return transfer;
}

function parseArgs(argv: string[]): SyncOptions {
  if (argv.includes("--help") || argv.includes("-h")) {
    printHelp();
    process.exit(0);
  }

  const agentKeys = new Set<LandingDemoAgentKey>();
  let write = false;
  let selectionMode: SyncOptions["selectionMode"] | null = null;

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === "--all") {
      AGENT_KEYS.forEach((agentKey) => agentKeys.add(agentKey));
      selectionMode = "all";
      continue;
    }

    if (token === "--write") {
      write = true;
      continue;
    }

    if (token === "--agent") {
      const rawValue = argv[index + 1];
      if (!rawValue) {
        throw new Error("Missing value for --agent");
      }
      index += 1;
      for (const agentName of rawValue.split(",")) {
        agentKeys.add(parseAgentKey(agentName));
      }
      selectionMode = "explicit";
      continue;
    }

    throw new Error(`Unknown argument: ${token}`);
  }

  if (agentKeys.size === 0) {
    ACTIVE_AGENT_KEYS.forEach((agentKey) => agentKeys.add(agentKey));
    selectionMode = "default_active";
  }

  return {
    agentKeys: Array.from(agentKeys),
    write,
    selectionMode: selectionMode ?? "explicit",
  };
}

function parseAgentKey(value: string): LandingDemoAgentKey {
  const normalized = value.trim().toLowerCase();
  if ((AGENT_KEYS as string[]).includes(normalized)) {
    return normalized as LandingDemoAgentKey;
  }
  throw new Error(`Unknown agent key: ${value}`);
}

function printHelp(): void {
  console.log(`Usage:
  npx tsx scripts/ai/elevenlabs/sync-elevenlabs-agent.ts [--all] [--agent clara,kai] [--write]

Examples:
  npx tsx scripts/ai/elevenlabs/sync-elevenlabs-agent.ts
  npx tsx scripts/ai/elevenlabs/sync-elevenlabs-agent.ts --all
  npx tsx scripts/ai/elevenlabs/sync-elevenlabs-agent.ts --agent clara --write
  npm run landing:elevenlabs:sync -- --all --write

Notes:
  default without --all/--agent syncs the active lifecycle subset only.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
