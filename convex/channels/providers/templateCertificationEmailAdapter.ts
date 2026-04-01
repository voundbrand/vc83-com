import { resendProvider } from "./resendProvider";
import type { OutboundMessage, ProviderCredentials } from "../types";

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

function parseRecipientList(target: string): string[] {
  return Array.from(
    new Set(
      target
        .split(/[\n,;]+/)
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0),
    ),
  );
}

function appendRunbookHint(message: string, runbookUrl?: string | null): string {
  const normalizedRunbookUrl = normalizeOptionalString(runbookUrl);
  if (!normalizedRunbookUrl) {
    return message;
  }
  return `${message} Runbook: ${normalizedRunbookUrl}`;
}

type TemplateCertificationEmailCredentialSource =
  | "dedicated_env"
  | "fallback_env"
  | "mixed"
  | "missing";

type TemplateCertificationEmailCredentials = ProviderCredentials & {
  resendSenderEmail?: string;
  resendReplyToEmail?: string;
};

function resolveEmailCredentials(): {
  credentials: TemplateCertificationEmailCredentials;
  apiKeySource: TemplateCertificationEmailCredentialSource;
  senderSource: TemplateCertificationEmailCredentialSource;
} {
  const dedicatedApiKey = normalizeOptionalString(
    readEnvKey("TEMPLATE_CERT_ALERT_EMAIL_API_KEY")
    ?? readEnvKey("TEMPLATE_CERTIFICATION_ALERT_EMAIL_API_KEY"),
  );
  const fallbackApiKey = normalizeOptionalString(process.env.RESEND_API_KEY);
  const dedicatedSender = normalizeOptionalString(
    readEnvKey("TEMPLATE_CERT_ALERT_EMAIL_FROM")
    ?? readEnvKey("TEMPLATE_CERTIFICATION_ALERT_EMAIL_FROM"),
  );
  const fallbackSender = normalizeOptionalString(process.env.AUTH_RESEND_FROM);
  return {
    credentials: {
      providerId: "resend",
      resendApiKey: dedicatedApiKey || fallbackApiKey || undefined,
      resendSenderEmail: dedicatedSender || fallbackSender || undefined,
      resendReplyToEmail:
        normalizeOptionalString(
          readEnvKey("TEMPLATE_CERT_ALERT_EMAIL_REPLY_TO")
          ?? readEnvKey("TEMPLATE_CERTIFICATION_ALERT_EMAIL_REPLY_TO"),
        )
        || undefined,
    },
    apiKeySource: dedicatedApiKey
      ? "dedicated_env"
      : fallbackApiKey
        ? "fallback_env"
        : "missing",
    senderSource: dedicatedSender
      ? "dedicated_env"
      : fallbackSender
        ? "fallback_env"
        : "missing",
  };
}

export interface TemplateCertificationEmailCredentialGovernancePolicy {
  requireDedicatedCredentials?: boolean;
  runbookUrl?: string | null;
}

type NormalizedTemplateCertificationEmailCredentialGovernancePolicy = {
  requireDedicatedCredentials: boolean;
  runbookUrl: string | null;
};

export interface TemplateCertificationEmailCredentialState {
  ready: boolean;
  policyCompliant: boolean;
  target: string | null;
  recipients: string[];
  credentialSource: TemplateCertificationEmailCredentialSource;
  reasonCode?: string;
  message: string;
  runbookUrl?: string;
  credentials?: TemplateCertificationEmailCredentials;
}

function normalizeTemplateCertificationEmailCredentialGovernancePolicy(
  policy?: TemplateCertificationEmailCredentialGovernancePolicy | null,
): NormalizedTemplateCertificationEmailCredentialGovernancePolicy {
  return {
    requireDedicatedCredentials: policy?.requireDedicatedCredentials === true,
    runbookUrl: normalizeOptionalString(policy?.runbookUrl) ?? null,
  };
}

export function buildTemplateCertificationEmailStrictCredentialGovernancePolicy(
  policy?: TemplateCertificationEmailCredentialGovernancePolicy | null,
): TemplateCertificationEmailCredentialGovernancePolicy {
  const normalized = normalizeTemplateCertificationEmailCredentialGovernancePolicy(policy);
  return {
    requireDedicatedCredentials: true,
    ...(normalized.runbookUrl ? { runbookUrl: normalized.runbookUrl } : {}),
  };
}

export function isTemplateCertificationEmailCredentialGovernanceStrict(
  policy?: TemplateCertificationEmailCredentialGovernancePolicy | null,
): boolean {
  const normalized = normalizeTemplateCertificationEmailCredentialGovernancePolicy(policy);
  return normalized.requireDedicatedCredentials === true;
}

function resolveEmailCredentialSource(args: {
  apiKeySource: TemplateCertificationEmailCredentialSource;
  senderSource: TemplateCertificationEmailCredentialSource;
}): TemplateCertificationEmailCredentialSource {
  if (args.apiKeySource === "missing" || args.senderSource === "missing") {
    return "missing";
  }
  if (args.apiKeySource === "dedicated_env" && args.senderSource === "dedicated_env") {
    return "dedicated_env";
  }
  if (args.apiKeySource === "fallback_env" && args.senderSource === "fallback_env") {
    return "fallback_env";
  }
  return "mixed";
}

export function evaluateTemplateCertificationEmailCredentialState(args: {
  target?: string | null;
  policy?: TemplateCertificationEmailCredentialGovernancePolicy | null;
}): TemplateCertificationEmailCredentialState {
  const governance = normalizeTemplateCertificationEmailCredentialGovernancePolicy(args.policy);
  const target = normalizeOptionalString(args.target);
  if (!target) {
    return {
      ready: false,
      policyCompliant: false,
      target: null,
      recipients: [],
      credentialSource: "missing",
      reasonCode: "email_target_missing",
      message: appendRunbookHint("Email transport target is missing.", governance.runbookUrl),
      ...(governance.runbookUrl ? { runbookUrl: governance.runbookUrl } : {}),
    };
  }
  const recipients = parseRecipientList(target);
  if (recipients.length === 0) {
    return {
      ready: false,
      policyCompliant: false,
      target,
      recipients: [],
      credentialSource: "missing",
      reasonCode: "email_target_invalid",
      message: appendRunbookHint(
        "Email transport target has no valid recipients.",
        governance.runbookUrl,
      ),
      ...(governance.runbookUrl ? { runbookUrl: governance.runbookUrl } : {}),
    };
  }

  const credentialResolution = resolveEmailCredentials();
  const credentialSource = resolveEmailCredentialSource({
    apiKeySource: credentialResolution.apiKeySource,
    senderSource: credentialResolution.senderSource,
  });
  if (
    !credentialResolution.credentials.resendApiKey
    || !credentialResolution.credentials.resendSenderEmail
  ) {
    return {
      ready: false,
      policyCompliant: false,
      target,
      recipients,
      credentialSource,
      reasonCode: "email_transport_not_configured",
      message: appendRunbookHint(
        "Email transport credentials are incomplete. Configure TEMPLATE_CERT_ALERT_EMAIL_API_KEY/RESEND_API_KEY and TEMPLATE_CERT_ALERT_EMAIL_FROM/AUTH_RESEND_FROM.",
        governance.runbookUrl,
      ),
      ...(governance.runbookUrl ? { runbookUrl: governance.runbookUrl } : {}),
    };
  }
  if (governance.requireDedicatedCredentials && credentialSource !== "dedicated_env") {
    return {
      ready: false,
      policyCompliant: false,
      target,
      recipients,
      credentialSource,
      reasonCode: "email_transport_credential_policy_violation",
      message: appendRunbookHint(
        "Email transport requires dedicated TEMPLATE_CERT_ALERT_EMAIL_API_KEY and TEMPLATE_CERT_ALERT_EMAIL_FROM credentials.",
        governance.runbookUrl,
      ),
      ...(governance.runbookUrl ? { runbookUrl: governance.runbookUrl } : {}),
    };
  }
  return {
    ready: true,
    policyCompliant: true,
    target,
    recipients,
    credentialSource,
    message:
      credentialSource === "dedicated_env"
        ? "Email dedicated credentials are configured."
        : "Email fallback credentials are configured.",
    ...(governance.runbookUrl ? { runbookUrl: governance.runbookUrl } : {}),
    credentials: credentialResolution.credentials,
  };
}

export interface TemplateCertificationEmailDispatchResult {
  success: boolean;
  retryable: boolean;
  errorCode?: string;
  errorMessage?: string;
  providerMessageId?: string;
}

export async function dispatchTemplateCertificationEmailAlert(args: {
  target: string;
  dedupeKey: string;
  subject: string;
  text: string;
  credentialGovernance?: TemplateCertificationEmailCredentialGovernancePolicy;
}): Promise<TemplateCertificationEmailDispatchResult> {
  const credentialState = evaluateTemplateCertificationEmailCredentialState({
    target: args.target,
    policy: args.credentialGovernance,
  });
  if (!credentialState.ready || !credentialState.credentials) {
    return {
      success: false,
      retryable: false,
      errorCode: credentialState.reasonCode ?? "email_transport_not_configured",
      errorMessage: credentialState.message,
    };
  }
  const recipients = credentialState.recipients;
  const credentials = credentialState.credentials;

  const sendResults = [];
  for (const recipient of recipients) {
    const message: OutboundMessage = {
      channel: "email",
      recipientIdentifier: recipient,
      subject: args.subject,
      content: args.text,
      metadata: {
        idempotencyKey: `${args.dedupeKey}:${recipient}`,
      },
    };
    sendResults.push(await resendProvider.sendMessage(credentials, message));
  }

  const failed = sendResults.filter((result) => !result.success);
  if (failed.length > 0) {
    const retryable = failed.some((result) => result.retryable === true);
    const firstFailure = failed[0];
    return {
      success: false,
      retryable,
      errorCode: "email_dispatch_failed",
      errorMessage: firstFailure.error || "Email dispatch failed.",
    };
  }

  return {
    success: true,
    retryable: false,
    providerMessageId:
      sendResults
        .map((result) => normalizeOptionalString(result.providerMessageId))
        .filter((value): value is string => value !== null)[0] || args.dedupeKey,
  };
}
