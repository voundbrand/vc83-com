const PAGERDUTY_EVENTS_V2_URL = "https://events.pagerduty.com/v2/enqueue";

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function readEnvKey(key: string): string | undefined {
  try {
    return process.env[key];
  } catch {
    return undefined;
  }
}

function appendRunbookHint(message: string, runbookUrl?: string | null): string {
  const normalizedRunbookUrl = normalizeOptionalString(runbookUrl);
  if (!normalizedRunbookUrl) {
    return message;
  }
  return `${message} Runbook: ${normalizedRunbookUrl}`;
}

type TemplateCertificationPagerDutyRoutingKeySource =
  | "inline_target"
  | "routing_map_env"
  | "global_env"
  | "missing";

function resolvePagerDutyRoutingKey(
  target: string,
): {
  routingKey: string | null;
  source: TemplateCertificationPagerDutyRoutingKeySource;
} {
  const normalizedTarget = normalizeOptionalString(target);
  if (!normalizedTarget) {
    return {
      routingKey: null,
      source: "missing",
    };
  }
  if (normalizedTarget.startsWith("routing_key:")) {
    return {
      routingKey: normalizeOptionalString(normalizedTarget.slice("routing_key:".length)),
      source: "inline_target",
    };
  }
  const globalRoutingKey = normalizeOptionalString(
    readEnvKey("TEMPLATE_CERT_ALERT_PD_ROUTING_KEY")
    ?? readEnvKey("TEMPLATE_CERT_ALERT_PAGERDUTY_ROUTING_KEY")
    ?? readEnvKey("TEMPLATE_CERTIFICATION_ALERT_PAGERDUTY_ROUTING_KEY"),
  );
  const mapRaw = normalizeOptionalString(
    readEnvKey("TEMPLATE_CERT_ALERT_PD_ROUTING_MAP_JSON")
    ?? readEnvKey("TEMPLATE_CERT_ALERT_PAGERDUTY_ROUTING_MAP_JSON")
    ?? readEnvKey("TEMPLATE_CERTIFICATION_ALERT_PAGERDUTY_ROUTING_MAP_JSON"),
  );
  if (mapRaw) {
    try {
      const parsed = JSON.parse(mapRaw) as Record<string, unknown>;
      const mapped = normalizeOptionalString(parsed[normalizedTarget]);
      if (mapped) {
        return {
          routingKey: mapped,
          source: "routing_map_env",
        };
      }
    } catch {
      // Fail closed below if no explicit routing key can be resolved.
    }
  }
  if (/^[a-z0-9_-]{20,}$/i.test(normalizedTarget)) {
    return {
      routingKey: normalizedTarget,
      source: "inline_target",
    };
  }
  if (globalRoutingKey) {
    return {
      routingKey: globalRoutingKey,
      source: "global_env",
    };
  }
  return {
    routingKey: null,
    source: "missing",
  };
}

function normalizePagerDutySeverity(
  severity: "critical" | "warning",
): "critical" | "warning" {
  return severity === "critical" ? "critical" : "warning";
}

export interface TemplateCertificationPagerDutyCredentialGovernancePolicy {
  allowInlineTargetCredentials?: boolean;
  runbookUrl?: string | null;
}

type NormalizedTemplateCertificationPagerDutyCredentialGovernancePolicy = {
  allowInlineTargetCredentials: boolean;
  runbookUrl: string | null;
};

export interface TemplateCertificationPagerDutyCredentialState {
  ready: boolean;
  policyCompliant: boolean;
  target: string | null;
  credentialSource: TemplateCertificationPagerDutyRoutingKeySource;
  routingKey?: string;
  reasonCode?: string;
  message: string;
  runbookUrl?: string;
}

function normalizeTemplateCertificationPagerDutyCredentialGovernancePolicy(
  policy?: TemplateCertificationPagerDutyCredentialGovernancePolicy | null,
): NormalizedTemplateCertificationPagerDutyCredentialGovernancePolicy {
  return {
    allowInlineTargetCredentials: policy?.allowInlineTargetCredentials !== false,
    runbookUrl: normalizeOptionalString(policy?.runbookUrl) ?? null,
  };
}

export function buildTemplateCertificationPagerDutyStrictCredentialGovernancePolicy(
  policy?: TemplateCertificationPagerDutyCredentialGovernancePolicy | null,
): TemplateCertificationPagerDutyCredentialGovernancePolicy {
  const normalized = normalizeTemplateCertificationPagerDutyCredentialGovernancePolicy(policy);
  return {
    allowInlineTargetCredentials: false,
    ...(normalized.runbookUrl ? { runbookUrl: normalized.runbookUrl } : {}),
  };
}

export function isTemplateCertificationPagerDutyCredentialGovernanceStrict(
  policy?: TemplateCertificationPagerDutyCredentialGovernancePolicy | null,
): boolean {
  const normalized = normalizeTemplateCertificationPagerDutyCredentialGovernancePolicy(policy);
  return normalized.allowInlineTargetCredentials === false;
}

export function evaluateTemplateCertificationPagerDutyCredentialState(args: {
  target?: string | null;
  policy?: TemplateCertificationPagerDutyCredentialGovernancePolicy | null;
}): TemplateCertificationPagerDutyCredentialState {
  const governance = normalizeTemplateCertificationPagerDutyCredentialGovernancePolicy(args.policy);
  const target = normalizeOptionalString(args.target);
  if (!target) {
    return {
      ready: false,
      policyCompliant: false,
      target: null,
      credentialSource: "missing",
      reasonCode: "pagerduty_target_missing",
      message: appendRunbookHint(
        "PagerDuty alert transport target is missing.",
        governance.runbookUrl,
      ),
      ...(governance.runbookUrl ? { runbookUrl: governance.runbookUrl } : {}),
    };
  }

  const routing = resolvePagerDutyRoutingKey(target);
  if (!routing.routingKey) {
    return {
      ready: false,
      policyCompliant: false,
      target,
      credentialSource: routing.source,
      reasonCode: "pagerduty_transport_not_configured",
      message: appendRunbookHint(
        "PagerDuty transport is missing a routing key. Set target to routing_key:<key> or configure TEMPLATE_CERT_ALERT_PD_ROUTING_KEY / TEMPLATE_CERT_ALERT_PD_ROUTING_MAP_JSON.",
        governance.runbookUrl,
      ),
      ...(governance.runbookUrl ? { runbookUrl: governance.runbookUrl } : {}),
    };
  }
  if (!governance.allowInlineTargetCredentials && routing.source === "inline_target") {
    return {
      ready: false,
      policyCompliant: false,
      target,
      credentialSource: routing.source,
      reasonCode: "pagerduty_inline_target_disallowed",
      message: appendRunbookHint(
        "PagerDuty inline routing_key targets are disallowed by credential governance policy.",
        governance.runbookUrl,
      ),
      ...(governance.runbookUrl ? { runbookUrl: governance.runbookUrl } : {}),
    };
  }
  return {
    ready: true,
    policyCompliant: true,
    target,
    credentialSource: routing.source,
    routingKey: routing.routingKey,
    message:
      routing.source === "inline_target"
        ? "PagerDuty inline routing key target is configured."
        : routing.source === "routing_map_env"
          ? "PagerDuty routing map credential is configured."
          : "PagerDuty global routing credential is configured.",
    ...(governance.runbookUrl ? { runbookUrl: governance.runbookUrl } : {}),
  };
}

export interface TemplateCertificationPagerDutyDispatchResult {
  success: boolean;
  retryable: boolean;
  errorCode?: string;
  errorMessage?: string;
  providerMessageId?: string;
}

export async function dispatchTemplateCertificationPagerDutyAlert(args: {
  target: string;
  dedupeKey: string;
  summary: string;
  severity: "critical" | "warning";
  details: Record<string, unknown>;
  credentialGovernance?: TemplateCertificationPagerDutyCredentialGovernancePolicy;
}): Promise<TemplateCertificationPagerDutyDispatchResult> {
  const credentialState = evaluateTemplateCertificationPagerDutyCredentialState({
    target: args.target,
    policy: args.credentialGovernance,
  });
  if (!credentialState.ready || !credentialState.routingKey) {
    return {
      success: false,
      retryable: false,
      errorCode: credentialState.reasonCode ?? "pagerduty_transport_not_configured",
      errorMessage: credentialState.message,
    };
  }
  const routingKey = credentialState.routingKey;

  try {
    const response = await fetch(PAGERDUTY_EVENTS_V2_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        routing_key: routingKey,
        event_action: "trigger",
        dedup_key: args.dedupeKey,
        payload: {
          summary: args.summary,
          source: "template-certification-alert-worker",
          severity: normalizePagerDutySeverity(args.severity),
          custom_details: args.details,
        },
      }),
    });
    const payload = (await response
      .json()
      .catch(() => ({}))) as Record<string, unknown>;
    const status = normalizeOptionalString(payload.status);
    if (!response.ok || (status && status !== "success")) {
      return {
        success: false,
        retryable: response.status === 429 || response.status >= 500,
        errorCode: `pagerduty_http_${response.status}`,
        errorMessage:
          normalizeOptionalString(payload.message)
          || normalizeOptionalString(payload.error)
          || `PagerDuty Events API returned HTTP ${response.status}.`,
      };
    }
    return {
      success: true,
      retryable: false,
      providerMessageId:
        normalizeOptionalString(payload.dedup_key)
        || normalizeOptionalString(payload.message)
        || args.dedupeKey,
    };
  } catch (error) {
    return {
      success: false,
      retryable: true,
      errorCode: "pagerduty_network_error",
      errorMessage: error instanceof Error ? error.message : String(error),
    };
  }
}
