function asNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let index = 0; index < a.length; index += 1) {
    mismatch |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return mismatch === 0;
}

async function computeHmacSha256Hex(
  secret: string,
  payload: string
): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return toHex(new Uint8Array(digest));
}

export function normalizeWhatsAppSignatureHeader(
  signatureHeader: string | null | undefined
): string | undefined {
  const normalizedHeader = asNonEmptyString(signatureHeader);
  if (!normalizedHeader) {
    return undefined;
  }

  const signature = normalizedHeader.startsWith("sha256=")
    ? normalizedHeader.slice("sha256=".length)
    : normalizedHeader;
  if (!/^[0-9a-f]{64}$/i.test(signature)) {
    return undefined;
  }
  return signature.toLowerCase();
}

export async function verifyWhatsAppWebhookSignature(args: {
  payload: string;
  signatureHeader: string | null | undefined;
  appSecret: string | undefined;
}): Promise<boolean> {
  if (!args.appSecret) {
    return false;
  }

  const signature = normalizeWhatsAppSignatureHeader(args.signatureHeader);
  if (!signature) {
    return false;
  }

  const expected = await computeHmacSha256Hex(args.appSecret, args.payload);
  return timingSafeEqualHex(signature, expected);
}
