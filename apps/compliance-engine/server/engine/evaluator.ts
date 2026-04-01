import type Database from "better-sqlite3";
import type {
  Framework,
  Rule,
  RuleCondition,
  EvaluationContext,
  EvaluationResult,
  RuleResult,
} from "./types.js";

/**
 * Evaluate an action context against all loaded framework rules.
 *
 * Design principle: **fail-closed**.
 * If evaluation throws or a condition is unknown, the action is denied.
 */
export function evaluate(
  frameworks: Framework[],
  ctx: EvaluationContext,
  db: Database.Database,
): EvaluationResult {
  const results: RuleResult[] = [];

  for (const fw of frameworks) {
    for (const rule of fw.rules) {
      const result = evaluateRule(rule, fw.meta.id, ctx, db);
      results.push(result);
    }
  }

  const blocked_by = results.filter((r) => !r.passed && r.severity === "block");
  const warnings = results.filter((r) => !r.passed && r.severity === "warn");

  return {
    allowed: blocked_by.length === 0,
    results,
    blocked_by,
    warnings,
  };
}

function evaluateRule(
  rule: Rule,
  frameworkId: string,
  ctx: EvaluationContext,
  db: Database.Database,
): RuleResult {
  try {
    const passed = evaluateCondition(rule.condition, ctx, db);
    return {
      rule_id: rule.id,
      framework: frameworkId,
      description: rule.description,
      severity: rule.severity,
      passed,
      message: passed ? undefined : rule.action.message,
    };
  } catch {
    // Fail-closed: if we can't evaluate, deny
    return {
      rule_id: rule.id,
      framework: frameworkId,
      description: rule.description,
      severity: rule.severity,
      passed: false,
      message: `Evaluation error (fail-closed): ${rule.action.message}`,
    };
  }
}

function evaluateCondition(
  condition: RuleCondition,
  ctx: EvaluationContext,
  db: Database.Database,
): boolean {
  switch (condition.type) {
    case "requires_field":
      return evaluateRequiresField(condition.field, ctx);

    case "requires_consent":
      return evaluateRequiresConsent(
        condition.consent_type,
        condition.legal_basis,
        ctx,
        db,
      );

    case "field_matches":
      return evaluateFieldMatches(condition, ctx);

    case "provider_requires":
      return evaluateProviderRequires(condition.requirement, ctx, db);

    case "all_of":
      return condition.conditions.every((c) =>
        evaluateCondition(c, ctx, db),
      );

    case "any_of":
      return condition.conditions.some((c) =>
        evaluateCondition(c, ctx, db),
      );

    case "always_deny":
      return false;

    default:
      // Unknown condition type → fail-closed
      return false;
  }
}

function evaluateRequiresField(field: string, ctx: EvaluationContext): boolean {
  const value = ctx.fields[field];
  return value !== undefined && value !== null && value !== "";
}

function evaluateRequiresConsent(
  consentType: string,
  legalBasis: string[] | undefined,
  ctx: EvaluationContext,
  db: Database.Database,
): boolean {
  if (!ctx.subject_id) return false;

  // Check for active consent in the database
  const row = db
    .prepare(
      `SELECT granted, legal_basis, expires_at
       FROM consent_records
       WHERE subject_id = ? AND consent_type = ?
       ORDER BY recorded_at DESC, rowid DESC
       LIMIT 1`,
    )
    .get(ctx.subject_id, consentType) as {
    granted: number;
    legal_basis: string;
    expires_at: string | null;
  } | undefined;

  if (!row) return false;
  if (row.granted !== 1) return false;

  // Check expiry
  if (row.expires_at && new Date(row.expires_at) < new Date()) {
    return false;
  }

  // Check legal basis if specified
  if (legalBasis && legalBasis.length > 0) {
    if (!legalBasis.includes(row.legal_basis)) {
      return false;
    }
  }

  return true;
}

function evaluateFieldMatches(
  condition: {
    field: string;
    pattern?: string;
    values?: string[];
    negate?: boolean;
  },
  ctx: EvaluationContext,
): boolean {
  const value = ctx.fields[condition.field];
  if (value === undefined || value === null) return !!condition.negate;

  const strValue = String(value);
  let matches = false;

  if (condition.pattern) {
    matches = new RegExp(condition.pattern).test(strValue);
  } else if (condition.values) {
    matches = condition.values.includes(strValue);
  } else {
    matches = strValue !== "";
  }

  return condition.negate ? !matches : matches;
}

function evaluateProviderRequires(
  requirement: string,
  ctx: EvaluationContext,
  db: Database.Database,
): boolean {
  const providerId = ctx.provider_id ?? (ctx.fields.provider_id as string);
  if (!providerId) return false;

  const provider = db
    .prepare("SELECT * FROM provider_registry WHERE id = ?")
    .get(providerId) as Record<string, unknown> | undefined;

  if (!provider) return false;

  switch (requirement) {
    case "dpa_signed":
      return provider.dpa_status === "signed";
    case "eu_located":
      return (
        typeof provider.data_location === "string" &&
        isEuLocation(provider.data_location)
      );
    case "active":
      return provider.active === 1;
    default:
      return false;
  }
}

const EU_EEA_CODES = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR",
  "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL",
  "PL", "PT", "RO", "SK", "SI", "ES", "SE",
  // EEA
  "IS", "LI", "NO",
  // Adequacy decisions
  "CH", "GB", "JP", "KR", "NZ", "IL", "AD", "AR", "CA", "FO",
  "GG", "IM", "JE", "UY",
]);

function isEuLocation(location: string): boolean {
  return EU_EEA_CODES.has(location.toUpperCase().trim());
}
