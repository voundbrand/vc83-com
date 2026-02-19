/**
 * TOOL BROKER — Intent-based tool filtering
 *
 * Reduces the tool set sent to the LLM from 20-30 to 10-15 based on:
 * 1. Keyword-based intent detection (deterministic, no LLM needed)
 * 2. Recently used tools (conversation continuity)
 * 3. Universal tools (always included)
 *
 * Feature-flagged per org (off by default).
 *
 * See: docs/platform/implementation_plans/P2_TOOL_BROKER.md
 */

// ============================================================================
// TOOL ARGUMENT PARSING / NORMALIZATION ADAPTER
// ============================================================================

export interface ParseToolCallArgumentsOptions {
  strict?: boolean;
}

export interface ParsedToolCallArguments {
  args: Record<string, unknown>;
  normalizedArguments: string;
  isError: boolean;
  error?: string;
}

type ProviderToolCallEnvelope = {
  function?: {
    arguments?: string | null;
  };
};

export function normalizeToolArgumentString(rawArguments: unknown): string {
  if (typeof rawArguments === "string") {
    const trimmed = rawArguments.trim();
    if (
      trimmed === ""
      || trimmed === "undefined"
      || trimmed === "null"
    ) {
      return "{}";
    }
    return trimmed;
  }

  if (rawArguments && typeof rawArguments === "object") {
    try {
      return JSON.stringify(rawArguments);
    } catch {
      return "{}";
    }
  }

  return "{}";
}

export function parseToolCallArguments(
  rawArguments: unknown,
  options: ParseToolCallArgumentsOptions = {}
): ParsedToolCallArguments {
  const normalizedArguments = normalizeToolArgumentString(rawArguments);

  try {
    const parsed = JSON.parse(normalizedArguments);

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      const nonObjectError = "Tool arguments must be a JSON object";
      return {
        args: {},
        normalizedArguments,
        isError: options.strict === true,
        error: nonObjectError,
      };
    }

    return {
      args: parsed as Record<string, unknown>,
      normalizedArguments,
      isError: false,
    };
  } catch (error) {
    const parseError = error instanceof Error ? error.message : String(error);
    return {
      args: {},
      normalizedArguments,
      isError: options.strict === true,
      error: `Invalid tool arguments JSON: ${parseError}`,
    };
  }
}

export function normalizeToolCallsForProvider<T extends ProviderToolCallEnvelope>(
  toolCalls: T[]
): T[] {
  return toolCalls.map((toolCall) => ({
    ...toolCall,
    function: {
      ...(toolCall.function ?? {}),
      arguments: normalizeToolArgumentString(toolCall.function?.arguments),
    },
  }));
}

// ============================================================================
// INTENT PATTERNS (deterministic keyword matching)
// ============================================================================

const INTENT_PATTERNS: Record<string, RegExp[]> = {
  billing: [
    /invoice/i, /payment/i, /charge/i, /refund/i, /price/i, /cost/i, /bill/i,
    /checkout/i, /subscription/i, /receipt/i,
  ],
  scheduling: [
    /book/i, /schedule/i, /appointment/i, /event/i, /calendar/i, /meeting/i,
    /available/i, /webinar/i, /booking/i, /attendee/i, /register/i,
  ],
  support: [
    /ticket/i, /issue/i, /problem/i, /broken/i, /not working/i, /error/i,
    /bug/i, /help/i, /escalat/i, /human/i, /agent/i,
  ],
  products: [
    /product/i, /item/i, /catalog/i, /stock/i, /inventory/i, /benefit/i,
    /certificate/i, /activate/i, /deactivate/i,
  ],
  contact: [
    /contact/i, /customer/i, /client/i, /lead/i, /subscriber/i, /crm/i,
    /tag/i, /sync/i,
  ],
  email: [
    /email/i, /newsletter/i, /campaign/i, /template/i, /send.*mail/i,
    /bulk/i,
  ],
  content: [
    /page/i, /blog/i, /post/i, /image/i, /photo/i, /media/i, /upload/i,
    /publish/i, /form/i,
  ],
  workflow: [
    /workflow/i, /automat/i, /sequence/i, /trigger/i, /behavior/i,
    /protocol/i,
  ],
  project: [
    /project/i, /manage/i, /task/i, /activity/i,
  ],
  team: [
    /team/i, /specialist/i, /hand.?off/i, /tag.?in/i, /colleague/i,
  ],
};

// ============================================================================
// INTENT → TOOL MAPPING
// ============================================================================

const INTENT_TOOL_MAPPING: Record<string, string[]> = {
  billing: [
    "create_invoice", "send_invoice", "process_payment",
    "create_checkout_page", "publish_checkout", "set_product_price",
    "list_products",
  ],
  scheduling: [
    "create_event", "list_events", "update_event", "register_attendee",
    "manage_bookings", "manage_webinars", "configure_booking_workflow",
  ],
  support: [
    "create_ticket", "update_ticket_status", "list_tickets",
    "escalate_to_human", "search_contacts",
  ],
  products: [
    "create_product", "list_products", "set_product_price",
    "activate_product", "deactivate_product", "set_product_form",
    "manage_benefits", "generate_certificate",
  ],
  contact: [
    "manage_crm", "sync_contacts", "create_contact", "search_contacts",
    "update_contact", "tag_contacts", "send_bulk_crm_email",
  ],
  email: [
    "create_template", "send_email_from_template", "send_bulk_crm_email",
    "search_contacts",
  ],
  content: [
    "create_page", "publish_page", "create_form", "list_forms",
    "publish_form", "get_form_responses", "manage_forms",
    "upload_media", "search_media", "publish_all",
  ],
  workflow: [
    "create_workflow", "enable_workflow", "list_workflows",
    "add_behavior_to_workflow", "remove_behavior_from_workflow",
    "manage_sequences", "manage_activity_protocol",
  ],
  project: [
    "manage_projects", "manage_activity_protocol",
  ],
  team: [
    "tag_in_specialist", "list_team_agents", "escalate_to_human",
  ],
};

// Tools always included regardless of intent
const UNIVERSAL_TOOLS = new Set([
  "request_feature",
  "escalate_to_human",
]);

// Minimum tools to return (prevents over-filtering)
const MIN_TOOL_COUNT = 5;

// ============================================================================
// INTENT DETECTION
// ============================================================================

/**
 * Detect intents from a user message using keyword matching.
 * Returns matched intent categories (e.g. ["billing", "contact"]).
 */
export function detectIntents(message: string): string[] {
  const matched: string[] = [];

  for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(message)) {
        matched.push(intent);
        break; // One match per intent is sufficient
      }
    }
  }

  return matched;
}

// ============================================================================
// BROKER FILTER
// ============================================================================

export interface ToolSchema {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface BrokerMetrics {
  toolsOffered: number;
  toolsBeforeBroker: number;
  intentsDetected: string[];
  brokered: boolean;
}

/**
 * Filter tools based on detected intent + recent tool usage.
 *
 * @param message - The user's message
 * @param activeToolSchemas - All tool schemas after layered scoping
 * @param recentToolNames - Names of tools used in recent conversation turns
 * @returns Filtered tool schemas + broker metrics
 */
export function brokerTools(
  message: string,
  activeToolSchemas: ToolSchema[],
  recentToolNames: string[],
): { tools: ToolSchema[]; metrics: BrokerMetrics } {
  const intents = detectIntents(message);
  const totalBefore = activeToolSchemas.length;

  // If no specific intent detected, return full set (general conversation)
  if (intents.length === 0) {
    return {
      tools: activeToolSchemas,
      metrics: {
        toolsOffered: totalBefore,
        toolsBeforeBroker: totalBefore,
        intentsDetected: [],
        brokered: false,
      },
    };
  }

  // Collect tool names: intent-specific + recent + universal
  const selected = new Set<string>(UNIVERSAL_TOOLS);

  for (const intent of intents) {
    const intentTools = INTENT_TOOL_MAPPING[intent];
    if (intentTools) {
      for (const t of intentTools) {
        selected.add(t);
      }
    }
  }

  // Include last 5 recently used tools for conversation continuity
  for (const t of recentToolNames.slice(-5)) {
    selected.add(t);
  }

  const brokered = activeToolSchemas.filter(
    (s) => selected.has(s.function.name),
  );

  // Don't over-filter — minimum tool count
  if (brokered.length < MIN_TOOL_COUNT) {
    return {
      tools: activeToolSchemas,
      metrics: {
        toolsOffered: totalBefore,
        toolsBeforeBroker: totalBefore,
        intentsDetected: intents,
        brokered: false, // Fell below minimum, returned full set
      },
    };
  }

  return {
    tools: brokered,
    metrics: {
      toolsOffered: brokered.length,
      toolsBeforeBroker: totalBefore,
      intentsDetected: intents,
      brokered: true,
    },
  };
}

// ============================================================================
// RECENT TOOL EXTRACTION
// ============================================================================

/**
 * Extract tool names from recent session messages.
 * Reads the `toolCalls` field from assistant messages.
 */
export function extractRecentToolNames(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  messages: Array<{ role: string; toolCalls?: any }>,
): string[] {
  const names: string[] = [];

  for (const msg of messages) {
    if (msg.role !== "assistant" || !msg.toolCalls) continue;

    // toolCalls is stored as array of { tool: string, status: string, ... }
    const calls = Array.isArray(msg.toolCalls) ? msg.toolCalls : [];
    for (const call of calls) {
      if (typeof call?.tool === "string") {
        names.push(call.tool);
      }
    }
  }

  return names;
}
