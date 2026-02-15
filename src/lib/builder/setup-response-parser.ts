/**
 * SETUP RESPONSE PARSER
 *
 * Parses AI setup mode responses to extract generated files.
 * The setup AI generates agent-config.json + kb/*.md files as fenced code blocks
 * with filename annotations. This parser extracts them for persistence.
 *
 * Expected format:
 *   ```json agent-config.json
 *   { "name": "...", ... }
 *   ```
 *
 *   ```markdown kb/hero-profile.md
 *   # Hero Profile
 *   ...
 *   ```
 */

export interface ParsedSetupFile {
  path: string;
  content: string;
  language: string;
}

export interface AgentConfigJson {
  name: string;
  subtype?: string;
  displayName?: string;
  personality?: string;
  language?: string;
  additionalLanguages?: string[];
  brandVoiceInstructions?: string;
  systemPrompt?: string;
  faqEntries?: Array<{ q: string; a: string }>;
  knowledgeBaseTags?: string[];
  enabledTools?: string[];
  disabledTools?: string[];
  autonomyLevel?: "supervised" | "autonomous" | "draft_only";
  maxMessagesPerDay?: number;
  maxCostPerDay?: number;
  requireApprovalFor?: string[];
  blockedTopics?: string[];
  modelProvider?: string;
  modelId?: string;
  temperature?: number;
  maxTokens?: number;
  channelBindings?: Array<{ channel: string; enabled: boolean }>;
}

/**
 * Parse the AI's setup mode response for generated files.
 * Looks for fenced code blocks with filename annotations:
 *   ```json agent-config.json
 *   ```markdown kb/hero-profile.md
 *   ```json:agent-config.json  (colon separator)
 */
export function parseSetupResponse(aiResponse: string): ParsedSetupFile[] {
  const files: ParsedSetupFile[] = [];

  // Match fenced code blocks with language + filename
  // Patterns: ```lang filename\n or ```lang:filename\n
  const codeBlockRegex = /```(\w+)[\s:]+([\w./-]+(?:\.\w+))\n([\s\S]*?)```/g;
  let match;

  while ((match = codeBlockRegex.exec(aiResponse)) !== null) {
    const language = match[1];
    const rawPath = match[2].trim();
    const content = match[3].trim();

    // Validate path looks like a real file path
    if (rawPath.includes(".") && content.length > 0) {
      files.push({ path: rawPath, language, content });
    }
  }

  return files;
}

/**
 * Validate parsed files contain a valid agent-config.json.
 * Returns the parsed config or null if invalid/missing.
 */
export function validateAgentConfig(files: ParsedSetupFile[]): AgentConfigJson | null {
  const configFile = files.find(
    (f) => f.path === "agent-config.json" || f.path.endsWith("/agent-config.json")
  );

  if (!configFile) return null;

  try {
    const parsed = JSON.parse(configFile.content) as AgentConfigJson;
    // Basic shape validation: name is required
    if (!parsed.name || typeof parsed.name !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}
