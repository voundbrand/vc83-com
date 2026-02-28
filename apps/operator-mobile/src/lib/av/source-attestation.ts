export const MOBILE_SOURCE_ATTESTATION_CONTRACT_VERSION =
  'tcg_mobile_source_attestation_v1' as const;
export const MOBILE_NODE_COMMAND_POLICY_CONTRACT_VERSION =
  'tcg_mobile_node_command_policy_v1' as const;

export interface MobileSourceAttestation {
  contractVersion: typeof MOBILE_SOURCE_ATTESTATION_CONTRACT_VERSION;
  challenge: string;
  nonce: string;
  issuedAtMs: number;
  liveSessionId: string;
  sourceId: string;
  sourceClass: string;
  providerId: string;
  signature: string;
}

export interface MobileNodeCommandPolicyContract {
  contractVersion: typeof MOBILE_NODE_COMMAND_POLICY_CONTRACT_VERSION;
  attemptedCommands: string[];
  sourceId?: string;
  sourceClass?: string;
}

function normalizeRequiredString(value: string, fieldName: string): string {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (!normalized) {
    throw new Error(`mobile source attestation requires ${fieldName}`);
  }
  return normalized;
}

function normalizeIdentityToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._:-]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function normalizeHex32(value: number): string {
  return (value >>> 0).toString(16).padStart(8, '0');
}

function hashDeterministic(seed: string): string {
  let hashA = 0x811c9dc5;
  let hashB = 0x811c9dc5;
  for (let index = 0; index < seed.length; index += 1) {
    const charCode = seed.charCodeAt(index);
    hashA ^= charCode;
    hashA = Math.imul(hashA, 0x01000193);
    hashB ^= charCode + ((index + 1) * 17);
    hashB = Math.imul(hashB, 0x01000193);
  }
  return `${normalizeHex32(hashA)}${normalizeHex32(hashB)}`;
}

function generateNonce(nowMs: number): string {
  const timestamp = nowMs.toString(36);
  const entropy = Math.random().toString(36).slice(2, 10);
  return `${timestamp}-${entropy}`;
}

export function buildMobileSourceAttestationChallenge(args: {
  liveSessionId: string;
  sourceId: string;
  nonce: string;
}): string {
  const liveSessionId = normalizeRequiredString(args.liveSessionId, 'liveSessionId');
  const sourceId = normalizeRequiredString(args.sourceId, 'sourceId');
  const nonce = normalizeRequiredString(args.nonce, 'nonce');
  return `attn:${normalizeIdentityToken(liveSessionId)}:${normalizeIdentityToken(sourceId)}:${normalizeIdentityToken(nonce)}`;
}

export function computeMobileSourceAttestationSignature(args: {
  secret: string;
  challenge: string;
  nonce: string;
  issuedAtMs: number;
  liveSessionId: string;
  sourceId: string;
  sourceClass: string;
  providerId: string;
}): string {
  const secret = normalizeRequiredString(args.secret, 'secret');
  const challenge = normalizeRequiredString(args.challenge, 'challenge');
  const nonce = normalizeRequiredString(args.nonce, 'nonce');
  const issuedAtMs =
    typeof args.issuedAtMs === 'number' && Number.isFinite(args.issuedAtMs)
      ? Math.floor(args.issuedAtMs)
      : 0;
  const payload = [
    MOBILE_SOURCE_ATTESTATION_CONTRACT_VERSION,
    challenge,
    nonce,
    issuedAtMs,
    normalizeIdentityToken(normalizeRequiredString(args.liveSessionId, 'liveSessionId')),
    normalizeIdentityToken(normalizeRequiredString(args.sourceId, 'sourceId')),
    normalizeIdentityToken(normalizeRequiredString(args.sourceClass, 'sourceClass')),
    normalizeIdentityToken(normalizeRequiredString(args.providerId, 'providerId')),
  ].join('|');
  return `sigv1_${hashDeterministic(`${secret}|${payload}`)}`;
}

export function buildSignedMobileSourceAttestation(args: {
  secret: string;
  liveSessionId: string;
  sourceId: string;
  sourceClass: string;
  providerId: string;
  nonce?: string;
  issuedAtMs?: number;
  now?: () => number;
}): MobileSourceAttestation {
  const now = args.now ?? Date.now;
  const issuedAtMs =
    typeof args.issuedAtMs === 'number' && Number.isFinite(args.issuedAtMs)
      ? Math.floor(args.issuedAtMs)
      : Math.floor(now());
  const nonce = normalizeRequiredString(args.nonce || generateNonce(issuedAtMs), 'nonce');
  const liveSessionId = normalizeRequiredString(args.liveSessionId, 'liveSessionId');
  const sourceId = normalizeRequiredString(args.sourceId, 'sourceId');
  const sourceClass = normalizeRequiredString(args.sourceClass, 'sourceClass');
  const providerId = normalizeRequiredString(args.providerId, 'providerId');
  const challenge = buildMobileSourceAttestationChallenge({
    liveSessionId,
    sourceId,
    nonce,
  });
  return {
    contractVersion: MOBILE_SOURCE_ATTESTATION_CONTRACT_VERSION,
    challenge,
    nonce,
    issuedAtMs,
    liveSessionId,
    sourceId,
    sourceClass,
    providerId,
    signature: computeMobileSourceAttestationSignature({
      secret: args.secret,
      challenge,
      nonce,
      issuedAtMs,
      liveSessionId,
      sourceId,
      sourceClass,
      providerId,
    }),
  };
}

export function buildMobileNodeCommandPolicyContract(args: {
  attemptedCommands: string[];
  sourceId?: string;
  sourceClass?: string;
}): MobileNodeCommandPolicyContract {
  const attemptedCommands = Array.from(
    new Set(
      (Array.isArray(args.attemptedCommands) ? args.attemptedCommands : [])
        .map((command) => (typeof command === 'string' ? command.trim().toLowerCase() : ''))
        .filter((command) => command.length > 0)
    )
  );
  return {
    contractVersion: MOBILE_NODE_COMMAND_POLICY_CONTRACT_VERSION,
    attemptedCommands,
    sourceId: args.sourceId?.trim(),
    sourceClass: args.sourceClass?.trim(),
  };
}
