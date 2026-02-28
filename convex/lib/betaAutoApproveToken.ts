type BetaAutoApproveTokenPayload = {
  v: 1;
  userId: string;
  email: string;
  iat: number;
  exp: number;
};

const DEFAULT_BETA_AUTO_APPROVE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
let warnedFallbackSecret = false;

function getBetaAutoApproveSecret(): string {
  const configured =
    process.env.BETA_AUTO_APPROVE_TOKEN_SECRET ||
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.JWT_SECRET;

  if (configured && configured.length > 0) {
    return configured;
  }

  if (!warnedFallbackSecret) {
    warnedFallbackSecret = true;
    console.warn(
      "[betaAutoApproveToken] BETA_AUTO_APPROVE_TOKEN_SECRET not set; using deterministic fallback secret. Set a strong secret in production."
    );
  }

  return `fallback-beta-auto-approve-${process.env.PLATFORM_ORG_ID || process.env.TEST_ORG_ID || "local-dev"}`;
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
  const secretBytes = encoder.encode(getBetaAutoApproveSecret());
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

export async function createBetaAutoApproveToken(args: {
  userId: string;
  email: string;
  ttlMs?: number;
}): Promise<string> {
  const now = Date.now();
  const ttlMs = args.ttlMs ?? DEFAULT_BETA_AUTO_APPROVE_TTL_MS;
  const payload: BetaAutoApproveTokenPayload = {
    v: 1,
    userId: args.userId,
    email: args.email.trim().toLowerCase(),
    iat: now,
    exp: now + ttlMs,
  };

  const payloadSegment = encodeBase64Url(JSON.stringify(payload));
  const signature = await signInput(payloadSegment);
  return `${payloadSegment}.${signature}`;
}

export async function decodeAndVerifyBetaAutoApproveToken(
  signedToken: string
): Promise<{ payload: BetaAutoApproveTokenPayload } | null> {
  const [payloadSegment, signature] = signedToken.split(".");
  if (!payloadSegment || !signature) {
    return null;
  }

  const signatureOk = await verifySignature(payloadSegment, signature);
  if (!signatureOk) {
    return null;
  }

  try {
    const payload = JSON.parse(decodeBase64Url(payloadSegment)) as BetaAutoApproveTokenPayload;
    if (payload.v !== 1) {
      return null;
    }
    if (!payload.userId || !payload.email || typeof payload.iat !== "number" || typeof payload.exp !== "number") {
      return null;
    }
    if (Date.now() > payload.exp) {
      return null;
    }
    return { payload };
  } catch {
    return null;
  }
}
