/** A single compliance rule within a framework */
export interface Rule {
  id: string;
  description: string;
  severity: "block" | "warn" | "info";
  condition: RuleCondition;
  action: RuleAction;
}

/** Condition types that the evaluator understands */
export type RuleCondition =
  | RequiresFieldCondition
  | RequiresConsentCondition
  | FieldMatchesCondition
  | ProviderRequiresCondition
  | CompoundCondition
  | AlwaysDenyCondition;

export interface RequiresFieldCondition {
  type: "requires_field";
  field: string;
}

export interface RequiresConsentCondition {
  type: "requires_consent";
  consent_type: string;
  legal_basis?: string[];
}

export interface FieldMatchesCondition {
  type: "field_matches";
  field: string;
  pattern?: string;
  values?: string[];
  negate?: boolean;
}

export interface ProviderRequiresCondition {
  type: "provider_requires";
  requirement: "dpa_signed" | "eu_located" | "active";
}

export interface CompoundCondition {
  type: "all_of" | "any_of";
  conditions: RuleCondition[];
}

export interface AlwaysDenyCondition {
  type: "always_deny";
}

export interface RuleAction {
  type: "deny" | "warn" | "log";
  message: string;
}

export type DeploymentRequirements = Record<
  string,
  Record<string, string | string[] | boolean>
>;

/** Metadata for a compliance framework */
export interface FrameworkMeta {
  id: string;
  name: string;
  version: string;
  description: string;
  jurisdiction?: string;
  effective_date?: string;
  deployment_requirements?: DeploymentRequirements;
}

/** A loaded framework with all its rules */
export interface Framework {
  meta: FrameworkMeta;
  rules: Rule[];
}

/** Input context for policy evaluation */
export interface EvaluationContext {
  /** The action being evaluated (e.g., "process_data", "transfer_data") */
  action: string;
  /** Subject whose data is being processed */
  subject_id?: string;
  /** Actor performing the action */
  actor?: string;
  /** Provider being used (for transfer checks) */
  provider_id?: string;
  /** Arbitrary fields for condition matching */
  fields: Record<string, unknown>;
}

/** Result of evaluating a single rule */
export interface RuleResult {
  rule_id: string;
  framework: string;
  description: string;
  severity: "block" | "warn" | "info";
  passed: boolean;
  message?: string;
}

/** Aggregate evaluation result */
export interface EvaluationResult {
  allowed: boolean;
  results: RuleResult[];
  blocked_by: RuleResult[];
  warnings: RuleResult[];
}
