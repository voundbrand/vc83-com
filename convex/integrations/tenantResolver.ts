/**
 * Provider-agnostic tenant resolution helper contracts.
 *
 * Resolution is fail-closed: ambiguous or missing matches do not route.
 */

export type IntegrationTenantResolution<T> =
  | {
      status: "resolved";
      context: T;
    }
  | {
      status: "missing";
      reason: "no_matching_installation";
    }
  | {
      status: "ambiguous";
      reason: "ambiguous_installation_match";
      candidateCount: number;
    };

export function resolveSingleTenantContext<T>(
  candidates: T[]
): IntegrationTenantResolution<T> {
  if (candidates.length === 0) {
    return {
      status: "missing",
      reason: "no_matching_installation",
    };
  }

  if (candidates.length > 1) {
    return {
      status: "ambiguous",
      reason: "ambiguous_installation_match",
      candidateCount: candidates.length,
    };
  }

  return {
    status: "resolved",
    context: candidates[0],
  };
}

