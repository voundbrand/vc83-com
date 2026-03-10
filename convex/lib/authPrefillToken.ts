import type { LoginAuthMode } from "./authLinks";

type AuthPrefillTokenPayload = {
  v: 1;
  email: string;
  firstName?: string;
  lastName?: string;
  organizationName?: string;
  betaCode?: string;
  authMode?: LoginAuthMode;
  autoCheck?: boolean;
  iat: number;
  exp: number;
};

const DEFAULT_AUTH_PREFILL_TTL_MS = 14 * 24 * 60 * 60 * 1000;
let warnedFallbackSecret = false;

function normalizeOptionalString(value: string | null | undefined): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function getAuthPrefillSecret(): string {
  const configured =
    process.env.AUTH_PREFILL_TOKEN_SECRET ||
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.JWT_SECRET;

  if (configured && configured.length > 0) {
    return configured;
  }

  if (!warnedFallbackSecret) {
    warnedFallbackSecret = true;
    console.warn(
      "[authPrefillToken] AUTH_PREFILL_TOKEN_SECRET not set; using deterministic fallback secret. Set a strong secret in production."
    );
  }

  return `fallback-auth-prefill-${process.env.PLATFORM_ORG_ID || process.env.TEST_ORG_ID || "local-dev"}`;
}

function bytesToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }

  if (typeof btoa === "function") {
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]!);
    }
    return btoa(binary);
  }

  throw new Error("Base64 encoding is not available in this runtime");
}

function base64ToBytes(base64: string): Uint8Array {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(base64, "base64"));
  }

  if (typeof atob === "function") {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index++) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  }

  throw new Error("Base64 decoding is not available in this runtime");
}

function toBase64UrlFromBytes(bytes: Uint8Array): string {
  return bytesToBase64(bytes)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64UrlToBytes(input: string): Uint8Array {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return base64ToBytes(padded);
}

function encodeBase64Url(input: string): string {
  return toBase64UrlFromBytes(new TextEncoder().encode(input));
}

function decodeBase64Url(input: string): string {
  return new TextDecoder().decode(fromBase64UrlToBytes(input));
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i]! ^ b[i]!;
  }
  return diff === 0;
}

async function signInput(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const secretBytes = encoder.encode(getAuthPrefillSecret());
  const key = await crypto.subtle.importKey(
    "raw",
    secretBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(input));
  return toBase64UrlFromBytes(new Uint8Array(signature));
}

async function verifySignature(input: string, signature: string): Promise<boolean> {
  try {
    const expected = fromBase64UrlToBytes(await signInput(input));
    const provided = fromBase64UrlToBytes(signature);
    return timingSafeEqual(expected, provided);
  } catch {
    return false;
  }
}

function normalizeAuthMode(value: unknown): LoginAuthMode | undefined {
  if (
    value === "check" ||
    value === "signin" ||
    value === "setup" ||
    value === "signup"
  ) {
    return value;
  }
  return undefined;
}

export async function createAuthPrefillToken(args: {
  email: string;
  firstName?: string;
  lastName?: string;
  organizationName?: string;
  betaCode?: string;
  authMode?: LoginAuthMode;
  autoCheck?: boolean;
  ttlMs?: number;
}): Promise<string> {
  const email = normalizeOptionalString(args.email);
  if (!email) {
    throw new Error("Auth prefill token requires a non-empty email");
  }

  const now = Date.now();
  const ttlMs = typeof args.ttlMs === "number" && args.ttlMs > 0
    ? Math.floor(args.ttlMs)
    : DEFAULT_AUTH_PREFILL_TTL_MS;

  const payload: AuthPrefillTokenPayload = {
    v: 1,
    email,
    firstName: normalizeOptionalString(args.firstName),
    lastName: normalizeOptionalString(args.lastName),
    organizationName: normalizeOptionalString(args.organizationName),
    betaCode: normalizeOptionalString(args.betaCode),
    authMode: args.authMode,
    autoCheck: args.autoCheck === true ? true : undefined,
    iat: now,
    exp: now + ttlMs,
  };

  const payloadSegment = encodeBase64Url(JSON.stringify(payload));
  const signature = await signInput(payloadSegment);
  return `${payloadSegment}.${signature}`;
}

export async function decodeAndVerifyAuthPrefillToken(
  signedToken: string
): Promise<{ payload: AuthPrefillTokenPayload } | null> {
  const [payloadSegment, signature] = signedToken.split(".");
  if (!payloadSegment || !signature) {
    return null;
  }

  const signatureOk = await verifySignature(payloadSegment, signature);
  if (!signatureOk) {
    return null;
  }

  try {
    const payload = JSON.parse(decodeBase64Url(payloadSegment)) as Partial<AuthPrefillTokenPayload>;
    const email = normalizeOptionalString(payload.email);
    const authMode = normalizeAuthMode(payload.authMode);

    if (payload.v !== 1) {
      return null;
    }
    if (!email || typeof payload.iat !== "number" || typeof payload.exp !== "number") {
      return null;
    }
    if (Date.now() > payload.exp) {
      return null;
    }

    return {
      payload: {
        v: 1,
        email,
        firstName: normalizeOptionalString(payload.firstName),
        lastName: normalizeOptionalString(payload.lastName),
        organizationName: normalizeOptionalString(payload.organizationName),
        betaCode: normalizeOptionalString(payload.betaCode),
        authMode,
        autoCheck: payload.autoCheck === true ? true : undefined,
        iat: payload.iat,
        exp: payload.exp,
      },
    };
  } catch {
    return null;
  }
}
