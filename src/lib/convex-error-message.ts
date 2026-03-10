function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function parseConvexMessagePayload(message: string): string | null {
  const trimmed = message.trim();
  if (trimmed.length === 0) {
    return null;
  }

  const candidates: string[] = [trimmed];
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
      const parsedRecord = asRecord(parsed);
      if (!parsedRecord) {
        continue;
      }
      if (typeof parsedRecord.message === "string" && parsedRecord.message.trim().length > 0) {
        return parsedRecord.message.trim();
      }
    } catch {
      // Keep trying with the next candidate.
    }
  }

  return null;
}

export function getConvexErrorMessage(error: unknown, fallback: string): string {
  const errorRecord = asRecord(error);
  const errorData = asRecord(errorRecord?.data);

  if (typeof errorData?.message === "string" && errorData.message.trim().length > 0) {
    return errorData.message.trim();
  }

  const errorMessage =
    error instanceof Error
      ? error.message
      : typeof errorRecord?.message === "string"
        ? errorRecord.message
        : "";
  const parsedMessage = parseConvexMessagePayload(errorMessage);
  if (parsedMessage) {
    return parsedMessage;
  }

  if (errorMessage.trim().length > 0) {
    return errorMessage.trim();
  }

  return fallback;
}
