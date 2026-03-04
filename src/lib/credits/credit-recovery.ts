"use client";

const DEFAULT_CREDITS_ACTION_URL = "/?openWindow=store&panel=credits&context=credit_exhausted";
const DEFAULT_CREDITS_ACTION_LABEL = "Buy Credits";

type CreditErrorCode =
  | "CREDITS_EXHAUSTED"
  | "CHILD_CREDIT_CAP_REACHED"
  | "SHARED_POOL_EXHAUSTED";

export type CreditRecoveryAction = {
  code: CreditErrorCode;
  message?: string;
  actionLabel: string;
  actionUrl: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function asNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function asCreditErrorCode(value: unknown): CreditErrorCode | null {
  if (
    value === "CREDITS_EXHAUSTED"
    || value === "CHILD_CREDIT_CAP_REACHED"
    || value === "SHARED_POOL_EXHAUSTED"
  ) {
    return value;
  }
  return null;
}

function parseJsonFromMessage(message: string): Record<string, unknown> | null {
  const candidates: string[] = [];
  const trimmed = message.trim();
  if (trimmed.length > 0) {
    candidates.push(trimmed);
  }

  const marker = "ConvexError:";
  const markerIndex = trimmed.indexOf(marker);
  if (markerIndex >= 0) {
    const afterMarker = trimmed.slice(markerIndex + marker.length).trim();
    if (afterMarker.length > 0) {
      candidates.push(afterMarker);
    }
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    candidates.push(trimmed.slice(firstBrace, lastBrace + 1));
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      const asObj = asRecord(parsed);
      if (asObj) {
        return asObj;
      }
    } catch {
      // Ignore parse errors and keep trying.
    }
  }

  return null;
}

export function getCreditRecoveryAction(error: unknown): CreditRecoveryAction | null {
  const candidates: Record<string, unknown>[] = [];
  const errorRecord = asRecord(error);
  if (errorRecord) {
    candidates.push(errorRecord);
    const errorData = asRecord(errorRecord.data);
    if (errorData) {
      candidates.push(errorData);
    }
  }

  const sourceMessage =
    error instanceof Error
      ? error.message
      : asNonEmptyString(errorRecord?.message);
  if (sourceMessage) {
    const parsed = parseJsonFromMessage(sourceMessage);
    if (parsed) {
      candidates.push(parsed);
    }
  }

  for (const candidate of candidates) {
    const code = asCreditErrorCode(candidate.code);
    if (!code) {
      continue;
    }
    return {
      code,
      message: asNonEmptyString(candidate.message),
      actionLabel: asNonEmptyString(candidate.actionLabel) || DEFAULT_CREDITS_ACTION_LABEL,
      actionUrl: asNonEmptyString(candidate.actionUrl) || DEFAULT_CREDITS_ACTION_URL,
    };
  }

  if (sourceMessage) {
    const normalized = sourceMessage.toLowerCase();
    if (
      normalized.includes("credits_exhausted")
      || (normalized.includes("not enough") && normalized.includes("credit"))
    ) {
      return {
        code: "CREDITS_EXHAUSTED",
        message: sourceMessage,
        actionLabel: DEFAULT_CREDITS_ACTION_LABEL,
        actionUrl: DEFAULT_CREDITS_ACTION_URL,
      };
    }
  }

  return null;
}

export function openCreditRecoveryAction(actionUrl?: string): void {
  if (typeof window === "undefined") {
    return;
  }

  const normalized = asNonEmptyString(actionUrl) || DEFAULT_CREDITS_ACTION_URL;
  if (/^https?:\/\//i.test(normalized)) {
    window.location.href = normalized;
    return;
  }

  if (normalized.startsWith("/")) {
    window.location.href = normalized;
    return;
  }

  window.location.href = DEFAULT_CREDITS_ACTION_URL;
}
