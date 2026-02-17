import { getCriticalToolContract } from "../convex/ai/tools/contracts";

export interface ToolCallLike {
  name: string;
  arguments?: unknown;
}

export interface ContractValidationResult {
  passed: boolean;
  contractVersion?: string;
  missingFields: string[];
  message: string;
}

export function parseToolCallArguments(
  rawArguments: unknown
): Record<string, unknown> {
  if (!rawArguments) return {};

  if (typeof rawArguments === "string") {
    try {
      const parsed = JSON.parse(rawArguments) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
      return {};
    } catch {
      return {};
    }
  }

  if (typeof rawArguments === "object" && !Array.isArray(rawArguments)) {
    return rawArguments as Record<string, unknown>;
  }

  return {};
}

function hasFieldValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

export function validateToolCallAgainstContract(
  toolCall: ToolCallLike
): ContractValidationResult {
  const contract = getCriticalToolContract(toolCall.name);
  if (!contract) {
    return {
      passed: false,
      missingFields: [],
      message: `No critical contract metadata found for tool ${toolCall.name}`,
    };
  }

  const parsedArguments = parseToolCallArguments(toolCall.arguments);
  const missingFields = contract.requiredFields.filter(
    (field) => !hasFieldValue(parsedArguments[field])
  );

  if (missingFields.length > 0) {
    return {
      passed: false,
      contractVersion: contract.version,
      missingFields,
      message: `Tool ${toolCall.name} violated contract ${contract.version}: missing required fields ${missingFields.join(", ")}`,
    };
  }

  return {
    passed: true,
    contractVersion: contract.version,
    missingFields: [],
    message: `Tool ${toolCall.name} satisfied contract ${contract.version}`,
  };
}
