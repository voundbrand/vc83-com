export interface ToolContractSuccessEnvelope {
  requiredKeys: string[];
  notes: string;
}

export interface ToolContractMetadata {
  version: string;
  requiredFields: string[];
  successEnvelope: ToolContractSuccessEnvelope;
  backwardCompatibilityNotes: string;
}

export const CRITICAL_TOOL_CONTRACTS = {
  manage_crm: {
    version: "1.0.0",
    requiredFields: ["action"],
    successEnvelope: {
      requiredKeys: ["success", "message"],
      notes: "Returns CRM operation outcome with action-specific payload.",
    },
    backwardCompatibilityNotes:
      "Keeps legacy action/mode semantics and optional search/create fields.",
  },
  search_contacts: {
    version: "1.0.0",
    requiredFields: ["query"],
    successEnvelope: {
      requiredKeys: ["success", "contacts", "count"],
      notes: "Read-only lookup returns normalized contact list and count.",
    },
    backwardCompatibilityNotes:
      "Preserves query-based search with optional limit parameter.",
  },
  create_event: {
    version: "1.0.0",
    requiredFields: ["title", "startDate", "location"],
    successEnvelope: {
      requiredKeys: ["success", "message", "eventId"],
      notes: "Successful create returns event identifier and summary details.",
    },
    backwardCompatibilityNotes:
      "Duplicate-detection response envelope remains supported for existing callers.",
  },
  create_form: {
    version: "1.0.0",
    requiredFields: ["title", "fields"],
    successEnvelope: {
      requiredKeys: ["success", "message", "formId"],
      notes: "Successful create returns form identifier and field summary.",
    },
    backwardCompatibilityNotes:
      "Validation failures continue returning explicit error/hint fields.",
  },
  list_forms: {
    version: "1.0.0",
    requiredFields: [],
    successEnvelope: {
      requiredKeys: ["success", "forms", "count"],
      notes: "Read-only listing returns forms array and total count.",
    },
    backwardCompatibilityNotes:
      "Optional status and limit inputs remain unchanged.",
  },
  create_product: {
    version: "1.0.0",
    requiredFields: ["name", "price"],
    successEnvelope: {
      requiredKeys: ["success", "message", "productId"],
      notes: "Successful create returns product identifier and normalized details.",
    },
    backwardCompatibilityNotes:
      "Ticket and booking subtypes keep optional subtype-specific parameters.",
  },
  create_checkout_page: {
    version: "1.0.0",
    requiredFields: ["name", "productIds"],
    successEnvelope: {
      requiredKeys: ["success", "message", "checkoutId"],
      notes: "Successful create returns checkout identifier and public URL metadata.",
    },
    backwardCompatibilityNotes:
      "Behavior-driven template response keeps existing duplicate-handling shape.",
  },
  create_invoice: {
    version: "1.0.0",
    requiredFields: ["items"],
    successEnvelope: {
      requiredKeys: ["success", "message", "invoiceId"],
      notes: "Successful create returns invoice id/number and billing totals.",
    },
    backwardCompatibilityNotes:
      "Customer identifiers remain optional for existing draft invoice flows.",
  },
  process_payment: {
    version: "1.0.0",
    requiredFields: ["amount"],
    successEnvelope: {
      requiredKeys: ["success", "message", "paymentId"],
      notes: "Successful payment recording returns payment id and amount details.",
    },
    backwardCompatibilityNotes:
      "Invoice-linked and standalone payment recording stay backward compatible.",
  },
  create_workflow: {
    version: "1.0.0",
    requiredFields: ["name", "trigger"],
    successEnvelope: {
      requiredKeys: ["success", "message", "workflowId"],
      notes: "Successful create returns workflow identifier and trigger metadata.",
    },
    backwardCompatibilityNotes:
      "Optional behaviors payload keeps existing defaults and execution order.",
  },
} as const satisfies Record<string, ToolContractMetadata>;

export type CriticalToolName = keyof typeof CRITICAL_TOOL_CONTRACTS;

export const CRITICAL_TOOL_NAMES = Object.keys(
  CRITICAL_TOOL_CONTRACTS
) as CriticalToolName[];

export function getCriticalToolContract(
  toolName: string
): ToolContractMetadata | null {
  return (
    (CRITICAL_TOOL_CONTRACTS as Record<string, ToolContractMetadata>)[toolName] ??
    null
  );
}

export function isCriticalToolName(toolName: string): toolName is CriticalToolName {
  return toolName in CRITICAL_TOOL_CONTRACTS;
}
