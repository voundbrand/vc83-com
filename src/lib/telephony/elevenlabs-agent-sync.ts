import type {
  ElevenLabsAgent,
  ElevenLabsAgentPrompt,
  ElevenLabsCreatedKnowledgeBaseDocument,
  ElevenLabsKnowledgeBaseDocumentRef,
} from "../../../scripts/ai/elevenlabs/lib/elevenlabs-api";

type JsonRecord = Record<string, unknown>;

export interface ElevenLabsDesiredAgentSource {
  prompt: string;
  firstMessage?: string;
  knowledgeBase?: {
    content: string;
    name: string;
  };
  managedBuiltInTools: Record<string, unknown>;
  workflow?: unknown;
}

export interface ElevenLabsRemoteKnowledgeBaseState {
  refs: ElevenLabsKnowledgeBaseDocumentRef[];
  documents: Array<{
    content: string;
    name: string;
  }>;
}

export interface ElevenLabsAgentSyncDrift {
  promptChanged: boolean;
  firstMessageChanged: boolean;
  builtInToolsChanged: boolean;
  knowledgeBaseChanged: boolean;
  workflowChanged: boolean;
}

export function buildElevenLabsAgentCreatePayload(args: {
  name?: string;
  desired: ElevenLabsDesiredAgentSource;
  knowledgeBase?: ElevenLabsKnowledgeBaseDocumentRef[];
}): Record<string, unknown> {
  return {
    ...(typeof args.name === "string" && args.name.trim().length > 0
      ? { name: args.name.trim() }
      : {}),
    conversation_config: {
      agent: {
        ...(args.desired.firstMessage !== undefined
          ? { first_message: args.desired.firstMessage }
          : {}),
        prompt: {
          prompt: args.desired.prompt,
          built_in_tools: normalizeBuiltInToolsForComparison(
            args.desired.managedBuiltInTools,
          ),
          ...(args.knowledgeBase !== undefined
            ? { knowledge_base: args.knowledgeBase }
            : {}),
        },
      },
    },
    ...(args.desired.workflow !== undefined ? { workflow: args.desired.workflow } : {}),
  };
}

export function stableSerialize(value: unknown): string {
  return JSON.stringify(sortKeysRecursively(value));
}

export function buildDesiredPrompt(
  remotePrompt: ElevenLabsAgentPrompt,
  localPrompt: string,
  managedBuiltInTools: Record<string, unknown>,
  knowledgeBase?: ElevenLabsKnowledgeBaseDocumentRef[],
): ElevenLabsAgentPrompt {
  const remoteBuiltInTools = asRecord(remotePrompt.built_in_tools);
  const mergedBuiltInTools: JsonRecord = { ...remoteBuiltInTools };

  for (const [toolName, localToolDefinition] of Object.entries(managedBuiltInTools)) {
    mergedBuiltInTools[toolName] = mergeBuiltInTool(
      remoteBuiltInTools[toolName],
      normalizeBuiltInTool(localToolDefinition),
    );
  }

  const desiredPrompt: ElevenLabsAgentPrompt = {
    ...remotePrompt,
    prompt: localPrompt,
    built_in_tools: mergedBuiltInTools,
    ...(knowledgeBase !== undefined ? { knowledge_base: knowledgeBase } : {}),
  };

  delete desiredPrompt.tools;
  return desiredPrompt;
}

export function computeAgentSyncDrift(args: {
  remoteAgent: ElevenLabsAgent;
  remoteKnowledgeBase?: ElevenLabsRemoteKnowledgeBaseState;
  desired: ElevenLabsDesiredAgentSource;
}): ElevenLabsAgentSyncDrift {
  const remotePrompt = args.remoteAgent.conversation_config.agent.prompt;
  const remoteFirstMessage = args.remoteAgent.conversation_config.agent.first_message ?? null;
  const desiredPrompt = buildDesiredPrompt(
    remotePrompt,
    args.desired.prompt,
    args.desired.managedBuiltInTools,
  );

  return {
    promptChanged:
      stableSerialize(remotePrompt.prompt ?? null) !== stableSerialize(args.desired.prompt),
    firstMessageChanged:
      args.desired.firstMessage !== undefined
        && stableSerialize(remoteFirstMessage) !== stableSerialize(args.desired.firstMessage),
    builtInToolsChanged:
      stableSerialize(normalizeBuiltInToolsForComparison(remotePrompt.built_in_tools))
      !== stableSerialize(normalizeBuiltInToolsForComparison(desiredPrompt.built_in_tools)),
    knowledgeBaseChanged:
      args.desired.knowledgeBase !== undefined
        && stableSerialize(
          args.remoteKnowledgeBase?.documents.map((document) => ({
            name: document.name,
            content: document.content,
          })) ?? [],
        )
        !== stableSerialize([
          {
            name: args.desired.knowledgeBase.name,
            content: args.desired.knowledgeBase.content,
          },
        ]),
    workflowChanged:
      args.desired.workflow !== undefined
        && stableSerialize(args.remoteAgent.workflow ?? null) !== stableSerialize(args.desired.workflow),
  };
}

export function normalizeKnowledgeBaseRefs(
  knowledgeBase: ElevenLabsKnowledgeBaseDocumentRef[] | undefined,
): ElevenLabsKnowledgeBaseDocumentRef[] {
  if (!Array.isArray(knowledgeBase)) {
    return [];
  }

  return knowledgeBase.filter(
    (entry): entry is ElevenLabsKnowledgeBaseDocumentRef =>
      Boolean(entry) && typeof entry.id === "string" && entry.id.trim().length > 0,
  );
}

export function toKnowledgeBaseRef(
  document: ElevenLabsCreatedKnowledgeBaseDocument,
  fallbackName: string,
): ElevenLabsKnowledgeBaseDocumentRef {
  return {
    id: document.id,
    name: document.name || fallbackName,
    type: "text",
    usage_mode: "auto",
  };
}

export function normalizeBuiltInToolsForComparison(value: unknown): JsonRecord {
  return Object.fromEntries(
    Object.entries(asRecord(value)).map(([toolName, toolDefinition]) => [
      toolName,
      normalizeBuiltInTool(toolDefinition),
    ]),
  );
}

function normalizeBuiltInTool(value: unknown): unknown {
  if (!isJsonRecord(value)) {
    return value;
  }

  const tool = deepClone(value);
  const dynamicVariables = asOptionalRecord(tool.dynamic_variables);

  if (
    dynamicVariables
    && isEmptyRecord(asOptionalRecord(dynamicVariables.dynamic_variable_placeholders))
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

function sortKeysRecursively(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sortKeysRecursively(item));
  }

  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((accumulator, key) => {
        accumulator[key] = sortKeysRecursively((value as Record<string, unknown>)[key]);
        return accumulator;
      }, {});
  }

  return value;
}
