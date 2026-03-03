import { ConvexError } from "convex/values";

export const TOOL_FOUNDRY_INTEGRITY_CONTRACT_VERSION =
  "tool_foundry_integrity_contract_v1" as const;
export const TOOL_FOUNDRY_MUTATING_POLICY_VERSION =
  "tool_foundry_mutating_policy_v1" as const;

export const TOOL_FOUNDRY_ADMIN_OPERATIONS = [
  "register",
  "publish",
  "promote",
  "deprecate",
] as const;
export type ToolFoundryAdminOperation =
  (typeof TOOL_FOUNDRY_ADMIN_OPERATIONS)[number];

export const TOOL_FOUNDRY_TOOL_CLASSES = [
  "read",
  "mutate",
  "external_network",
  "secret_access",
] as const;
export type ToolFoundryToolClass = (typeof TOOL_FOUNDRY_TOOL_CLASSES)[number];

export const CORE_TOOL_CLASS_ALLOWLIST = {
  manage_crm: "mutate",
  search_contacts: "read",
  create_event: "mutate",
  create_form: "mutate",
  list_forms: "read",
  create_product: "mutate",
  create_checkout_page: "mutate",
  create_invoice: "mutate",
  process_payment: "mutate",
  create_workflow: "mutate",
  platform_soul_admin: "secret_access",
  query_org_data: "read",
} as const satisfies Record<string, ToolFoundryToolClass>;

export type CoreToolId = keyof typeof CORE_TOOL_CLASS_ALLOWLIST;
export const CORE_TOOL_IDS = Object.freeze(
  Object.keys(CORE_TOOL_CLASS_ALLOWLIST) as CoreToolId[],
);
const CORE_TOOL_ID_SET = new Set<string>(CORE_TOOL_IDS);

const TOOL_ALIAS_TO_CANONICAL = Object.freeze({
  managecrm: "manage_crm",
  manage_crm_tool: "manage_crm",
  searchcontacts: "search_contacts",
  search_contacts_tool: "search_contacts",
  createevent: "create_event",
  create_event_tool: "create_event",
  createform: "create_form",
  listforms: "list_forms",
  createproduct: "create_product",
  createcheckoutpage: "create_checkout_page",
  createinvoice: "create_invoice",
  processpayment: "process_payment",
  createworkflow: "create_workflow",
  platformsouladmin: "platform_soul_admin",
  queryorgdata: "query_org_data",
} as const satisfies Record<string, string>);

export type ToolFoundryIntegrityErrorCode =
  | "TF_FORBIDDEN_SUPER_ADMIN_REQUIRED"
  | "TF_FAIL_CLOSED_UNKNOWN_ROLE"
  | "TF_FAIL_CLOSED_UNKNOWN_TOOL_CLASS"
  | "TF_FAIL_CLOSED_POLICY_MISSING"
  | "TF_FAIL_CLOSED_POLICY_PARSE_ERROR"
  | "TF_FAIL_CLOSED_APPROVAL_REQUIRED"
  | "TF_CORE_TOOL_IMMUTABLE"
  | "TF_ALIAS_OVERRIDE_FORBIDDEN"
  | "TF_TOOL_NOT_FOUND";

export type ToolFoundryApprovalMetadata = {
  policyId: string;
  policyVersion: string;
  requestedBy: string;
  state: "pending" | "approved" | "denied";
  approvedBy?: string;
  approvedAt?: number;
};

export type ToolFoundryClassPolicy = {
  mutating: boolean;
  approvalRequired: boolean;
};

export const TOOL_FOUNDRY_CLASS_POLICY_MAP = Object.freeze({
  read: { mutating: false, approvalRequired: false },
  mutate: { mutating: true, approvalRequired: true },
  external_network: { mutating: true, approvalRequired: true },
  secret_access: { mutating: true, approvalRequired: true },
} as const satisfies Record<ToolFoundryToolClass, ToolFoundryClassPolicy>);

export function normalizeToolId(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function resolveCanonicalToolId(rawToolId: string): {
  canonicalToolId: string;
  normalizedInputToolId: string;
  aliasMatched: boolean;
} {
  const normalizedInputToolId = normalizeToolId(rawToolId);
  const aliasResolved =
    TOOL_ALIAS_TO_CANONICAL[normalizedInputToolId as keyof typeof TOOL_ALIAS_TO_CANONICAL]
    || (!normalizedInputToolId.includes("_")
      ? TOOL_ALIAS_TO_CANONICAL[
        normalizedInputToolId.replace(/_/g, "") as keyof typeof TOOL_ALIAS_TO_CANONICAL
      ]
      : undefined);
  const canonicalToolId = aliasResolved || normalizedInputToolId;
  return {
    canonicalToolId,
    normalizedInputToolId,
    aliasMatched: Boolean(aliasResolved),
  };
}

export function isCoreToolId(toolId: string): toolId is CoreToolId {
  return CORE_TOOL_ID_SET.has(toolId);
}

function buildIntegrityError(args: {
  code: ToolFoundryIntegrityErrorCode;
  message: string;
  details?: Record<string, unknown>;
}) {
  return {
    code: args.code,
    message: args.message,
    ...(args.details ? { details: args.details } : {}),
  };
}

export function throwToolFoundryIntegrityError(args: {
  code: ToolFoundryIntegrityErrorCode;
  message: string;
  details?: Record<string, unknown>;
}): never {
  throw new ConvexError(buildIntegrityError(args) as any);
}

export function assertToolFoundrySuperAdmin(userContext: {
  isGlobal?: boolean;
  roleName?: string;
}) {
  const normalizedRole =
    typeof userContext.roleName === "string"
      ? userContext.roleName.trim().toLowerCase()
      : "";
  if (!normalizedRole) {
    throwToolFoundryIntegrityError({
      code: "TF_FAIL_CLOSED_UNKNOWN_ROLE",
      message:
        "Tool Foundry operation denied: actor role missing (fail-closed).",
    });
  }
  if (!(userContext.isGlobal === true && normalizedRole === "super_admin")) {
    throwToolFoundryIntegrityError({
      code: "TF_FORBIDDEN_SUPER_ADMIN_REQUIRED",
      message: "Tool Foundry operation denied: super_admin role required.",
      details: {
        roleName: normalizedRole,
        isGlobal: userContext.isGlobal === true,
      },
    });
  }
}

export function resolveToolClassPolicy(
  rawToolClass: unknown,
  policyMap: Partial<Record<string, ToolFoundryClassPolicy>> = TOOL_FOUNDRY_CLASS_POLICY_MAP,
): { toolClass: ToolFoundryToolClass; policy: ToolFoundryClassPolicy } {
  const normalized =
    typeof rawToolClass === "string"
      ? rawToolClass.trim().toLowerCase()
      : "";

  if (!normalized) {
    throwToolFoundryIntegrityError({
      code: "TF_FAIL_CLOSED_UNKNOWN_TOOL_CLASS",
      message:
        "Tool Foundry operation denied: missing tool class (fail-closed).",
    });
  }

  if (
    !(TOOL_FOUNDRY_TOOL_CLASSES as readonly string[]).includes(normalized)
  ) {
    throwToolFoundryIntegrityError({
      code: "TF_FAIL_CLOSED_UNKNOWN_TOOL_CLASS",
      message:
        "Tool Foundry operation denied: unknown tool class (fail-closed).",
      details: { toolClass: normalized },
    });
  }

  const toolClass = normalized as ToolFoundryToolClass;
  const policy = policyMap[toolClass];
  if (!policy) {
    throwToolFoundryIntegrityError({
      code: "TF_FAIL_CLOSED_POLICY_MISSING",
      message:
        "Tool Foundry operation denied: policy missing for tool class (fail-closed).",
      details: { toolClass },
    });
  }

  return { toolClass, policy };
}

export function parseApprovalMetadata(
  rawApprovalMetadata: unknown,
): ToolFoundryApprovalMetadata {
  if (!rawApprovalMetadata || typeof rawApprovalMetadata !== "object") {
    throwToolFoundryIntegrityError({
      code: "TF_FAIL_CLOSED_POLICY_PARSE_ERROR",
      message:
        "Tool Foundry operation denied: approval metadata missing or malformed (fail-closed).",
    });
  }

  const record = rawApprovalMetadata as Record<string, unknown>;
  const policyId =
    typeof record.policyId === "string" ? record.policyId.trim() : "";
  const policyVersion =
    typeof record.policyVersion === "string" ? record.policyVersion.trim() : "";
  const requestedBy =
    typeof record.requestedBy === "string" ? record.requestedBy.trim() : "";
  const state = typeof record.state === "string" ? record.state.trim() : "";
  const approvedBy =
    typeof record.approvedBy === "string" && record.approvedBy.trim().length > 0
      ? record.approvedBy.trim()
      : undefined;
  const approvedAt =
    typeof record.approvedAt === "number" && Number.isFinite(record.approvedAt)
      ? Math.floor(record.approvedAt)
      : undefined;

  if (!policyId || !policyVersion || !requestedBy) {
    throwToolFoundryIntegrityError({
      code: "TF_FAIL_CLOSED_POLICY_PARSE_ERROR",
      message:
        "Tool Foundry operation denied: approval metadata missing required fields (fail-closed).",
      details: {
        hasPolicyId: Boolean(policyId),
        hasPolicyVersion: Boolean(policyVersion),
        hasRequestedBy: Boolean(requestedBy),
      },
    });
  }
  if (
    state !== "pending" &&
    state !== "approved" &&
    state !== "denied"
  ) {
    throwToolFoundryIntegrityError({
      code: "TF_FAIL_CLOSED_POLICY_PARSE_ERROR",
      message:
        "Tool Foundry operation denied: approval state malformed (fail-closed).",
      details: { state },
    });
  }

  return {
    policyId,
    policyVersion,
    requestedBy,
    state,
    approvedBy,
    approvedAt,
  };
}

export function enforceMutatingClassApprovalGate(args: {
  operation: ToolFoundryAdminOperation | "execute";
  toolClass: ToolFoundryToolClass;
  approvalMetadata?: unknown;
}): ToolFoundryApprovalMetadata | null {
  const { policy } = resolveToolClassPolicy(args.toolClass);
  if (!policy.mutating || !policy.approvalRequired) {
    return null;
  }

  const approvalMetadata = parseApprovalMetadata(args.approvalMetadata);
  if (approvalMetadata.state !== "approved") {
    throwToolFoundryIntegrityError({
      code: "TF_FAIL_CLOSED_APPROVAL_REQUIRED",
      message:
        "Tool Foundry operation denied: mutating class requires approved policy state.",
      details: {
        operation: args.operation,
        toolClass: args.toolClass,
        state: approvalMetadata.state,
      },
    });
  }

  return approvalMetadata;
}

export function enforceCoreToolImmutability(args: {
  operation: ToolFoundryAdminOperation;
  canonicalToolId: string;
  isExistingCoreTool?: boolean;
  aliasMatched?: boolean;
}) {
  if (
    args.aliasMatched === true &&
    isCoreToolId(args.canonicalToolId)
  ) {
    throwToolFoundryIntegrityError({
      code: "TF_ALIAS_OVERRIDE_FORBIDDEN",
      message:
        "Tool Foundry operation denied: alias cannot override canonical core tool ID.",
      details: {
        operation: args.operation,
        canonicalToolId: args.canonicalToolId,
      },
    });
  }

  if (
    isCoreToolId(args.canonicalToolId) ||
    args.isExistingCoreTool === true
  ) {
    throwToolFoundryIntegrityError({
      code: "TF_CORE_TOOL_IMMUTABLE",
      message:
        "Tool Foundry operation denied: core tool definitions are immutable at runtime.",
      details: {
        operation: args.operation,
        canonicalToolId: args.canonicalToolId,
      },
    });
  }
}
