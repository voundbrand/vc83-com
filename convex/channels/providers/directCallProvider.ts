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
import {
  ELEVEN_TELEPHONY_ROUTE_KEY_PREFIX,
  TWILIO_VOICE_ROUTE_KEY_PREFIX,
} from "../types";

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
  if (identity === "twilio_voice") {
    return {
      ok: true,
      providerIdentity: "twilio_voice",
    };
  }
  return {
    ok: false,
    providerIdentity: "direct",
    code: "invalid_provider_identity",
    reason: `Unsupported telephonyProviderIdentity: ${identity}`,
  };
}

function deriveManagedRouteKey(
  providerIdentity: Exclude<TelephonyProviderIdentity, "direct">,
  providerConnectionId: string,
  providerInstallationId: string
): string {
  return [
    providerIdentity === "twilio_voice"
      ? TWILIO_VOICE_ROUTE_KEY_PREFIX
      : ELEVEN_TELEPHONY_ROUTE_KEY_PREFIX,
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
      providerIdentity: identityResult.providerIdentity,
      routeKeyPolicy:
        identityResult.providerIdentity === "twilio_voice"
          ? "twilio_voice_v1"
          : "eleven_route_v1",
      code: "missing_provider_connection_id",
      reason: `${identityResult.providerIdentity} requires providerConnectionId`,
    };
  }

  const providerInstallationId = normalizeOptionalString(
    credentials.providerInstallationId
  );
  if (!providerInstallationId) {
    return {
      ok: false,
      providerIdentity: identityResult.providerIdentity,
      routeKeyPolicy:
        identityResult.providerIdentity === "twilio_voice"
          ? "twilio_voice_v1"
          : "eleven_route_v1",
      code: "missing_provider_installation_id",
      reason: `${identityResult.providerIdentity} requires providerInstallationId`,
    };
  }

  if (credentials.providerProfileType !== "organization") {
    return {
      ok: false,
      providerIdentity: identityResult.providerIdentity,
      routeKeyPolicy:
        identityResult.providerIdentity === "twilio_voice"
          ? "twilio_voice_v1"
          : "eleven_route_v1",
      code: "invalid_profile_type",
      reason: `${identityResult.providerIdentity} requires providerProfileType=organization`,
    };
  }

  const expectedRouteKey = deriveManagedRouteKey(
    identityResult.providerIdentity,
    providerConnectionId,
    providerInstallationId
  );
  const routeKey = normalizeOptionalString(credentials.bindingRouteKey);
  if (!routeKey) {
    return {
      ok: false,
      providerIdentity: identityResult.providerIdentity,
      routeKeyPolicy:
        identityResult.providerIdentity === "twilio_voice"
          ? "twilio_voice_v1"
          : "eleven_route_v1",
      expectedRouteKey,
      code: "missing_route_key",
      reason: `${identityResult.providerIdentity} requires bindingRouteKey=${expectedRouteKey}`,
    };
  }

  if (routeKey !== expectedRouteKey) {
    return {
      ok: false,
      providerIdentity: identityResult.providerIdentity,
      routeKeyPolicy:
        identityResult.providerIdentity === "twilio_voice"
          ? "twilio_voice_v1"
          : "eleven_route_v1",
      routeKey,
      expectedRouteKey,
      code: "invalid_route_key",
      reason: `${identityResult.providerIdentity} bindingRouteKey mismatch (${routeKey} != ${expectedRouteKey})`,
    };
  }

  return {
    ok: true,
    providerIdentity: identityResult.providerIdentity,
    routeKeyPolicy:
      identityResult.providerIdentity === "twilio_voice"
        ? "twilio_voice_v1"
        : "eleven_route_v1",
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
  if (providerIdentity === "twilio_voice") {
    return undefined;
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
  if (providerIdentity === "twilio_voice") {
    return undefined;
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
  if (providerIdentity === "twilio_voice") {
    return (
      normalizeOptionalString(credentials.twilioVoiceFromNumber) ||
      normalizeOptionalString(credentials.directCallFromNumber) ||
      normalizeOptionalString(credentials.elevenTelephonyFromNumber)
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
  if (providerIdentity === "twilio_voice") {
    return (
      normalizeOptionalString(credentials.twilioVoiceWebhookSecret) ||
      normalizeOptionalString(credentials.directCallWebhookSecret) ||
      normalizeOptionalString(credentials.elevenTelephonyWebhookSecret) ||
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

function resolveTwilioAccountSid(credentials: ProviderCredentials): string | undefined {
  return normalizeOptionalString(credentials.twilioAccountSid);
}

function resolveTwilioAuthToken(credentials: ProviderCredentials): string | undefined {
  return normalizeOptionalString(credentials.twilioAuthToken);
}

function buildBasicAuthHeader(username: string, password: string): string {
  return `Basic ${btoa(`${username}:${password}`)}`;
}

function resolveTelephonyWebhookBaseUrl(): string | undefined {
  return (
    normalizeOptionalString(process.env.CONVEX_SITE_URL) ||
    normalizeOptionalString(process.env.NEXT_PUBLIC_API_ENDPOINT_URL) ||
    normalizeOptionalString(process.env.NEXT_PUBLIC_CONVEX_SITE_URL)
  );
}

function buildTwilioVoiceCallbackUrl(args: {
  path: "/webhooks/twilio/voice/status";
  routeKey?: string;
  webhookSecret?: string;
}): string | undefined {
  const baseUrl = resolveTelephonyWebhookBaseUrl();
  if (!baseUrl || !args.routeKey) {
    return undefined;
  }
  const url = new URL(args.path, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
  url.searchParams.set("routeKey", args.routeKey);
  if (args.webhookSecret) {
    url.searchParams.set("secret", args.webhookSecret);
  }
  return url.toString();
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildTwilioOutboundTwiml(script: string): string {
  return [
    "<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
    "<Response>",
    `<Say>${escapeXml(script)}</Say>`,
    "<Pause length=\"1\"/>",
    "<Hangup/>",
    "</Response>",
  ].join("");
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

    if (contract.providerIdentity === "twilio_voice") {
      const accountSid = resolveTwilioAccountSid(credentials);
      const authToken = resolveTwilioAuthToken(credentials);
      const fromNumber = resolveProviderFromNumber(credentials, contract.providerIdentity);
      const metadata = (message.metadata || {}) as Record<string, unknown>;
      const idempotencyKey = normalizeOptionalString(metadata.idempotencyKey);
      const webhookSecret = resolveProviderWebhookSecret(
        credentials,
        contract.providerIdentity,
      );
      const statusCallbackUrl = buildTwilioVoiceCallbackUrl({
        path: "/webhooks/twilio/voice/status",
        routeKey: contract.routeKey,
        webhookSecret,
      });

      if (!accountSid || !authToken || !fromNumber || !webhookSecret) {
        return {
          success: false,
          error: "Twilio voice provider credentials are incomplete",
          retryable: false,
        };
      }

      if (!statusCallbackUrl) {
        return {
          success: false,
          error:
            "Twilio voice status callback URL is unavailable. Set CONVEX_SITE_URL or NEXT_PUBLIC_API_ENDPOINT_URL.",
          retryable: false,
        };
      }

      const form = new URLSearchParams();
      form.set("To", message.recipientIdentifier);
      form.set("From", fromNumber);
      form.set("Twiml", buildTwilioOutboundTwiml(message.content));
      form.set("StatusCallback", statusCallbackUrl);
      form.set("StatusCallbackMethod", "POST");
      form.set("Timeout", "20");

      try {
        const response = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`,
          {
            method: "POST",
            headers: {
              Authorization: buildBasicAuthHeader(accountSid, authToken),
              "Content-Type": "application/x-www-form-urlencoded",
              ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
            },
            body: form.toString(),
          }
        );

        const json = await safeReadJson(response);
        if (!response.ok) {
          const text = await safeReadText(response);
          const fromBody =
            normalizeOptionalString(json?.message) ||
            normalizeOptionalString(json?.detail) ||
            normalizeOptionalString(json?.code);
          return buildRetryableHttpFailure(response, fromBody ?? text);
        }

        const providerCallId =
          normalizeOptionalString(json?.sid) ||
          normalizeOptionalString(json?.callSid);
        const outcome =
          normalizeOptionalString(json?.status) ||
          normalizeOptionalString(json?.direction) ||
          "queued";

        if (!providerCallId) {
          return {
            success: false,
            error: "Twilio voice response missing call SID",
            retryable: true,
          };
        }

        return {
          success: true,
          providerMessageId: providerCallId,
          telephony: {
            providerCallId,
            outcome,
          },
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          retryable: true,
        };
      }
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

    if (contract.providerIdentity === "twilio_voice") {
      const accountSid = resolveTwilioAccountSid(credentials);
      const authToken = resolveTwilioAuthToken(credentials);
      if (!accountSid || !authToken) {
        return {
          success: false,
          error: "Twilio voice provider credentials are incomplete",
        };
      }

      try {
        const response = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`,
          {
            method: "GET",
            headers: {
              Authorization: buildBasicAuthHeader(accountSid, authToken),
            },
          }
        );
        if (!response.ok) {
          return {
            success: false,
            error: `HTTP ${response.status}`,
          };
        }

        const json = await safeReadJson(response);
        return {
          success: true,
          accountName:
            normalizeOptionalString(json?.friendly_name) ||
            normalizeOptionalString(json?.sid) ||
            "Twilio Voice",
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
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
