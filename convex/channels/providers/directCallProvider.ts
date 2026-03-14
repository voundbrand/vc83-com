/**
 * DIRECT OUTBOUND TELEPHONY PROVIDER
 *
 * Generic HTTP adapter for appointment outbound calling.
 * Designed as an additive provider that can be bound per organization via
 * `direct_settings` in the objects table.
 */

import type {
  ChannelProvider,
  ChannelProviderCapabilities,
  ProviderCredentials,
  NormalizedInboundMessage,
  OutboundMessage,
  SendResult,
  TelephonyProviderIdentity,
  TelephonyRouteKeyPolicy,
} from "../types";
import { ELEVEN_TELEPHONY_ROUTE_KEY_PREFIX } from "../types";

const capabilities: ChannelProviderCapabilities = {
  supportedChannels: ["phone_call"],
  supportsInbound: true,
  supportsOutbound: true,
  supportsWebhooks: true,
  supportsAttachments: false,
  supportsTemplates: false,
  supportsConversationThreading: false,
};

type TelephonyContractFailureCode =
  | "invalid_provider_identity"
  | "missing_provider_connection_id"
  | "missing_provider_installation_id"
  | "missing_route_key"
  | "invalid_route_key"
  | "invalid_profile_type";

interface ResolvedTelephonyContract {
  ok: boolean;
  providerIdentity: TelephonyProviderIdentity;
  routeKeyPolicy: TelephonyRouteKeyPolicy;
  routeKey?: string;
  expectedRouteKey?: string;
  code?: TelephonyContractFailureCode;
  reason?: string;
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function extractObject(
  value: unknown
): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

async function safeReadJson(response: Response): Promise<Record<string, unknown> | null> {
  try {
    const payload = (await response.json()) as unknown;
    return extractObject(payload);
  } catch {
    return null;
  }
}

async function safeReadText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

function resolveBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function resolveTelephonyProviderIdentity(
  credentials: ProviderCredentials
): {
  ok: boolean;
  providerIdentity: TelephonyProviderIdentity;
  code?: TelephonyContractFailureCode;
  reason?: string;
} {
  const identity = normalizeOptionalString(credentials.telephonyProviderIdentity);
  if (!identity || identity === "direct") {
    return {
      ok: true,
      providerIdentity: "direct",
    };
  }
  if (identity === "eleven_telephony") {
    return {
      ok: true,
      providerIdentity: "eleven_telephony",
    };
  }
  return {
    ok: false,
    providerIdentity: "direct",
    code: "invalid_provider_identity",
    reason: `Unsupported telephonyProviderIdentity: ${identity}`,
  };
}

function deriveElevenRouteKey(
  providerConnectionId: string,
  providerInstallationId: string
): string {
  return [
    ELEVEN_TELEPHONY_ROUTE_KEY_PREFIX,
    providerConnectionId,
    providerInstallationId,
  ].join(":");
}

function validateTelephonyContract(
  credentials: ProviderCredentials
): ResolvedTelephonyContract {
  const identityResult = resolveTelephonyProviderIdentity(credentials);
  if (!identityResult.ok) {
    return {
      ok: false,
      providerIdentity: "direct",
      routeKeyPolicy: "legacy_direct_optional",
      code: identityResult.code,
      reason: identityResult.reason,
    };
  }

  if (identityResult.providerIdentity === "direct") {
    return {
      ok: true,
      providerIdentity: "direct",
      routeKeyPolicy: "legacy_direct_optional",
      routeKey: normalizeOptionalString(credentials.bindingRouteKey),
    };
  }

  const providerConnectionId = normalizeOptionalString(
    credentials.providerConnectionId
  );
  if (!providerConnectionId) {
    return {
      ok: false,
      providerIdentity: "eleven_telephony",
      routeKeyPolicy: "eleven_route_v1",
      code: "missing_provider_connection_id",
      reason: "eleven_telephony requires providerConnectionId",
    };
  }

  const providerInstallationId = normalizeOptionalString(
    credentials.providerInstallationId
  );
  if (!providerInstallationId) {
    return {
      ok: false,
      providerIdentity: "eleven_telephony",
      routeKeyPolicy: "eleven_route_v1",
      code: "missing_provider_installation_id",
      reason: "eleven_telephony requires providerInstallationId",
    };
  }

  if (credentials.providerProfileType !== "organization") {
    return {
      ok: false,
      providerIdentity: "eleven_telephony",
      routeKeyPolicy: "eleven_route_v1",
      code: "invalid_profile_type",
      reason: "eleven_telephony requires providerProfileType=organization",
    };
  }

  const expectedRouteKey = deriveElevenRouteKey(
    providerConnectionId,
    providerInstallationId
  );
  const routeKey = normalizeOptionalString(credentials.bindingRouteKey);
  if (!routeKey) {
    return {
      ok: false,
      providerIdentity: "eleven_telephony",
      routeKeyPolicy: "eleven_route_v1",
      expectedRouteKey,
      code: "missing_route_key",
      reason: `eleven_telephony requires bindingRouteKey=${expectedRouteKey}`,
    };
  }

  if (routeKey !== expectedRouteKey) {
    return {
      ok: false,
      providerIdentity: "eleven_telephony",
      routeKeyPolicy: "eleven_route_v1",
      routeKey,
      expectedRouteKey,
      code: "invalid_route_key",
      reason: `eleven_telephony bindingRouteKey mismatch (${routeKey} != ${expectedRouteKey})`,
    };
  }

  return {
    ok: true,
    providerIdentity: "eleven_telephony",
    routeKeyPolicy: "eleven_route_v1",
    routeKey,
    expectedRouteKey,
  };
}

function resolveProviderBaseUrl(
  credentials: ProviderCredentials,
  providerIdentity: TelephonyProviderIdentity
): string | undefined {
  if (providerIdentity === "eleven_telephony") {
    return (
      normalizeOptionalString(credentials.elevenTelephonyBaseUrl) ||
      normalizeOptionalString(credentials.directCallBaseUrl)
    );
  }
  return normalizeOptionalString(credentials.directCallBaseUrl);
}

function resolveProviderApiKey(
  credentials: ProviderCredentials,
  providerIdentity: TelephonyProviderIdentity
): string | undefined {
  if (providerIdentity === "eleven_telephony") {
    return (
      normalizeOptionalString(credentials.elevenTelephonyApiKey) ||
      normalizeOptionalString(credentials.directCallApiKey)
    );
  }
  return normalizeOptionalString(credentials.directCallApiKey);
}

function resolveProviderFromNumber(
  credentials: ProviderCredentials,
  providerIdentity: TelephonyProviderIdentity
): string | undefined {
  if (providerIdentity === "eleven_telephony") {
    return (
      normalizeOptionalString(credentials.elevenTelephonyFromNumber) ||
      normalizeOptionalString(credentials.directCallFromNumber)
    );
  }
  return normalizeOptionalString(credentials.directCallFromNumber);
}

function resolveProviderWebhookSecret(
  credentials: ProviderCredentials,
  providerIdentity: TelephonyProviderIdentity
): string | undefined {
  if (providerIdentity === "eleven_telephony") {
    return (
      normalizeOptionalString(credentials.elevenTelephonyWebhookSecret) ||
      normalizeOptionalString(credentials.directCallWebhookSecret) ||
      normalizeOptionalString(process.env.ELEVEN_TELEPHONY_WEBHOOK_SECRET) ||
      normalizeOptionalString(process.env.DIRECT_CALL_WEBHOOK_SECRET)
    );
  }
  return (
    normalizeOptionalString(credentials.directCallWebhookSecret) ||
    normalizeOptionalString(process.env.DIRECT_CALL_WEBHOOK_SECRET)
  );
}

function resolvePresentedRouteKey(headers: Record<string, string>): string | undefined {
  return (
    normalizeOptionalString(headers["x-telephony-route-key"]) ||
    normalizeOptionalString(headers["x-provider-route-key"]) ||
    normalizeOptionalString(headers["x-eleven-route-key"])
  );
}

function buildRetryableHttpFailure(response: Response, errorText: string): SendResult {
  const sanitizedError =
    errorText.trim().length > 0
      ? errorText.trim().slice(0, 400)
      : `Direct call provider HTTP ${response.status}`;
  return {
    success: false,
    error: sanitizedError,
    statusCode: response.status,
    retryable: response.status === 429 || response.status >= 500,
  };
}

export const directCallProvider: ChannelProvider = {
  id: "direct",
  name: "Direct Telephony",
  capabilities,

  normalizeInbound(
    rawPayload: Record<string, unknown>,
    _credentials: ProviderCredentials
  ): NormalizedInboundMessage | null {
    const callId =
      normalizeOptionalString(rawPayload.callId) ||
      normalizeOptionalString(rawPayload.providerCallId) ||
      normalizeOptionalString(rawPayload.id);
    const to =
      normalizeOptionalString(rawPayload.to) ||
      normalizeOptionalString(rawPayload.recipient) ||
      normalizeOptionalString(rawPayload.phoneNumber);
    const transcriptText =
      normalizeOptionalString(rawPayload.transcriptText) ||
      normalizeOptionalString(rawPayload.transcript);
    const telephonyProviderIdentity =
      normalizeOptionalString(rawPayload.telephonyProviderIdentity) ||
      normalizeOptionalString(rawPayload.providerIdentity) ||
      "direct";
    const routeKey =
      normalizeOptionalString(rawPayload.routeKey) ||
      normalizeOptionalString(rawPayload.bindingRouteKey) ||
      normalizeOptionalString(rawPayload.providerRouteKey);

    if (!to || !callId || !transcriptText) {
      return null;
    }

    return {
      organizationId: "",
      channel: "phone_call",
      externalContactIdentifier: to,
      message: transcriptText,
      messageType: "text",
      metadata: {
        providerId: "direct",
        providerMessageId: callId,
        providerEventId: normalizeOptionalString(rawPayload.eventId),
        telephonyProviderIdentity,
        routeKey,
        raw: rawPayload,
      },
    };
  },

  async sendMessage(
    credentials: ProviderCredentials,
    message: OutboundMessage
  ): Promise<SendResult> {
    const contract = validateTelephonyContract(credentials);
    if (!contract.ok) {
      return {
        success: false,
        error: `Telephony provider contract validation failed: ${contract.reason || contract.code || "invalid_contract"}`,
        retryable: false,
      };
    }

    const baseUrl = resolveProviderBaseUrl(credentials, contract.providerIdentity);
    const apiKey = resolveProviderApiKey(credentials, contract.providerIdentity);

    if (!baseUrl || !apiKey) {
      return {
        success: false,
        error:
          contract.providerIdentity === "eleven_telephony"
            ? "Eleven telephony provider credentials are incomplete"
            : "Direct telephony provider credentials are incomplete",
        retryable: false,
      };
    }

    const endpoint = `${baseUrl.replace(/\/$/, "")}/calls/outbound`;
    const metadata = (message.metadata || {}) as Record<string, unknown>;
    const idempotencyKey = normalizeOptionalString(metadata.idempotencyKey);

    const payload: Record<string, unknown> = {
      to: message.recipientIdentifier,
      from: resolveProviderFromNumber(credentials, contract.providerIdentity),
      script: message.content,
      metadata: {
        ...metadata,
        telephonyProviderIdentity: contract.providerIdentity,
        telephonyRouteKeyPolicy: contract.routeKeyPolicy,
        providerConnectionId: normalizeOptionalString(
          credentials.providerConnectionId
        ),
        providerInstallationId: normalizeOptionalString(
          credentials.providerInstallationId
        ),
        providerProfileType: credentials.providerProfileType,
        routeKey: contract.routeKey,
      },
    };

    const headers: Record<string, string> = {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    };
    if (idempotencyKey) {
      headers["Idempotency-Key"] = idempotencyKey;
    }

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const json = await safeReadJson(response);
      if (!response.ok) {
        const text = await safeReadText(response);
        const fromBody =
          normalizeOptionalString(json?.error) ||
          normalizeOptionalString(json?.message);
        return buildRetryableHttpFailure(response, fromBody ?? text);
      }

      const providerCallId =
        normalizeOptionalString(json?.callId) ||
        normalizeOptionalString(json?.providerCallId) ||
        normalizeOptionalString(json?.id);
      const outcome =
        normalizeOptionalString(json?.outcome) ||
        normalizeOptionalString(json?.status) ||
        "queued";

      if (!providerCallId) {
        return {
          success: false,
          error: "Direct telephony response missing call identifier",
          retryable: true,
        };
      }

      return {
        success: true,
        providerMessageId: providerCallId,
        telephony: {
          providerCallId,
          outcome,
          voicemailDetected: resolveBoolean(json?.voicemailDetected),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        retryable: true,
      };
    }
  },

  verifyWebhook(
    _body: string,
    headers: Record<string, string>,
    credentials: ProviderCredentials
  ): boolean {
    const contract = validateTelephonyContract(credentials);
    if (!contract.ok) {
      return false;
    }

    const expectedSecret = resolveProviderWebhookSecret(
      credentials,
      contract.providerIdentity
    );
    if (!expectedSecret) {
      return false;
    }

    const presented =
      normalizeOptionalString(headers["x-direct-call-secret"]) ||
      normalizeOptionalString(headers["x-telephony-webhook-secret"]) ||
      normalizeOptionalString(headers["x-eleven-webhook-secret"]) ||
      normalizeOptionalString(headers.authorization)?.replace(/^Bearer\s+/i, "");
    if (presented !== expectedSecret) {
      return false;
    }

    if (contract.providerIdentity === "eleven_telephony") {
      const presentedRouteKey = resolvePresentedRouteKey(headers);
      if (!presentedRouteKey || !contract.routeKey) {
        return false;
      }
      if (presentedRouteKey !== contract.routeKey) {
        return false;
      }
    }

    return true;
  },

  async testConnection(
    credentials: ProviderCredentials
  ): Promise<{ success: boolean; accountName?: string; error?: string }> {
    const contract = validateTelephonyContract(credentials);
    if (!contract.ok) {
      return {
        success: false,
        error: `Telephony provider contract validation failed: ${contract.reason || contract.code || "invalid_contract"}`,
      };
    }

    const baseUrl = resolveProviderBaseUrl(credentials, contract.providerIdentity);
    const apiKey = resolveProviderApiKey(credentials, contract.providerIdentity);

    if (!baseUrl || !apiKey) {
      return {
        success: false,
        error:
          contract.providerIdentity === "eleven_telephony"
            ? "Eleven telephony provider credentials are incomplete"
            : "Direct telephony provider credentials are incomplete",
      };
    }

    const endpoint = `${baseUrl.replace(/\/$/, "")}/health`;

    try {
      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });
      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}`,
        };
      }

      return {
        success: true,
        accountName:
          contract.providerIdentity === "eleven_telephony"
            ? "Eleven Telephony"
            : "Direct Telephony",
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};
