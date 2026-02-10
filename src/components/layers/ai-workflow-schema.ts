/**
 * AI WORKFLOW SCHEMA & PARSER
 *
 * Zod schema for validating AI-generated workflow JSON.
 * Includes multi-strategy JSON extraction from AI responses.
 */

import { z } from "zod";
import { getNodeDefinition } from "../../../convex/layers/nodeRegistry";

// ============================================================================
// SCHEMA
// ============================================================================

const aiWorkflowNodeSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  label: z.string().optional(),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  config: z.record(z.string(), z.unknown()).optional(),
});

const aiWorkflowEdgeSchema = z.object({
  source: z.string().min(1),
  target: z.string().min(1),
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional(),
});

export const aiWorkflowResponseSchema = z.object({
  nodes: z.array(aiWorkflowNodeSchema).min(1),
  edges: z.array(aiWorkflowEdgeSchema),
  description: z.string().optional(),
});

export type AIWorkflowResponse = z.infer<typeof aiWorkflowResponseSchema>;

// ============================================================================
// JSON EXTRACTION
// ============================================================================

/**
 * Extract JSON string from an AI response using multiple strategies.
 */
function extractJSON(response: string): string | null {
  // Strategy 1: ```json ... ``` code block
  const jsonBlockMatch = response.match(/```json\s*([\s\S]*?)```/);
  if (jsonBlockMatch?.[1]) return jsonBlockMatch[1].trim();

  // Strategy 2: Any ``` ... ``` code block
  const codeBlockMatch = response.match(/```\s*([\s\S]*?)```/);
  if (codeBlockMatch?.[1]) {
    const content = codeBlockMatch[1].trim();
    if (content.startsWith("{") || content.startsWith("[")) return content;
  }

  // Strategy 3: Direct JSON object detection
  const objectMatch = response.match(/(\{[\s\S]*"nodes"\s*:\s*\[[\s\S]*\})/);
  if (objectMatch?.[1]) return objectMatch[1].trim();

  return null;
}

/**
 * Attempt to repair truncated JSON by closing unclosed brackets/braces.
 */
function attemptRepair(json: string): string {
  let openBraces = 0;
  let openBrackets = 0;
  let inString = false;
  let escaped = false;

  for (const char of json) {
    if (escaped) { escaped = false; continue; }
    if (char === "\\") { escaped = true; continue; }
    if (char === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (char === "{") openBraces++;
    if (char === "}") openBraces--;
    if (char === "[") openBrackets++;
    if (char === "]") openBrackets--;
  }

  let repaired = json;
  while (openBrackets > 0) { repaired += "]"; openBrackets--; }
  while (openBraces > 0) { repaired += "}"; openBraces--; }

  return repaired;
}

// ============================================================================
// PARSER
// ============================================================================

export interface ParseResult {
  data: AIWorkflowResponse | null;
  error?: string;
  warnings?: string[];
  description?: string;
}

/**
 * Parse an AI response and extract + validate the workflow JSON.
 */
export function parseLayersAIResponse(response: string): ParseResult {
  const jsonStr = extractJSON(response);

  if (!jsonStr) {
    return { data: null };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    // Attempt repair for truncated responses
    try {
      parsed = JSON.parse(attemptRepair(jsonStr));
    } catch {
      return { data: null, error: "Could not parse workflow JSON from AI response." };
    }
  }

  // Validate with Zod
  const result = aiWorkflowResponseSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues.map((i) => i.message).join(", ");
    return { data: null, error: `Invalid workflow format: ${issues}` };
  }

  // Cross-check node types against registry
  const warnings: string[] = [];
  const validNodes = result.data.nodes.filter((node) => {
    const def = getNodeDefinition(node.type);
    if (!def) {
      warnings.push(`Unknown node type "${node.type}" removed`);
      return false;
    }
    return true;
  });

  // Filter edges that reference removed nodes
  const validNodeIds = new Set(validNodes.map((n) => n.id));
  const validEdges = result.data.edges.filter(
    (e) => validNodeIds.has(e.source) && validNodeIds.has(e.target)
  );

  if (validNodes.length === 0) {
    return { data: null, error: "No valid node types found in AI response.", warnings };
  }

  return {
    data: { nodes: validNodes, edges: validEdges, description: result.data.description },
    warnings: warnings.length > 0 ? warnings : undefined,
    description: result.data.description,
  };
}
