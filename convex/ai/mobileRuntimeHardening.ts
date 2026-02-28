export const MOBILE_SOURCE_ATTESTATION_CONTRACT_VERSION =
  "tcg_mobile_source_attestation_v1" as const;
export const MOBILE_NODE_COMMAND_POLICY_CONTRACT_VERSION =
  "tcg_mobile_node_command_policy_v1" as const;

export const MOBILE_SOURCE_ATTESTATION_MAX_AGE_MS = 5 * 60_000;
export const MOBILE_SOURCE_ATTESTATION_MAX_FUTURE_SKEW_MS = 30_000;

const DEFAULT_AV_ATTESTATION_SECRET = "local_dev_av_attestation_secret_v1";
const DEFAULT_ALLOWED_NODE_COMMANDS = [
  "capture_frame",
  "capture_audio",
  "transcribe_audio",
  "extract_entities",
  "assemble_concierge_payload",
  "preview_meeting_concierge",
  "execute_meeting_concierge",
] as const;
const DEFAULT_BLOCKED_NODE_COMMAND_PATTERNS = [
  "rm ",
  "sudo",
  "chmod",
  "chown",
  "mv ",
  "cp ",
  "curl",
  "bash",
  "sh ",
  "powershell",
  "python",
  "node ",
] as const;
const MOBILE_ATTESTATION_SOURCE_CLASS_PREFIXES = [
  "iphone_camera",
  "iphone_microphone",
  "meta_glasses",
  "mobile_stream_ios",
  "mobile_stream_android",
  "glasses_stream_meta",
] as const;

type SourceRuntimeKey = "cameraRuntime" | "voiceRuntime";

export type MobileSourceAttestationVerificationStatus =
  | "not_required"
  | "verified"
  | "missing"
  | "unknown_contract"
  | "malformed"
  | "source_mismatch"
  | "challenge_mismatch"
  | "invalid_signature"
  | "expired"
  | "future_timestamp";

export interface MobileSourceAttestationEvidence {
  runtimeKey: SourceRuntimeKey;
  sourceId: string;
  sourceClass: string;
  providerId?: string;
  verificationStatus: MobileSourceAttestationVerificationStatus;
  reasonCode: string;
  challengeNoncePresent: boolean;
  signaturePresent: boolean;
  quarantined: boolean;
}

export interface MobileSourceAttestationContract {
  contractVersion: typeof MOBILE_SOURCE_ATTESTATION_CONTRACT_VERSION;
  verificationRequired: boolean;
  verified: boolean;
  verificationStatus: MobileSourceAttestationVerificationStatus;
  verifiedSourceCount: number;
  quarantinedSourceIds: string[];
  reasonCodes: string[];
  evidences: MobileSourceAttestationEvidence[];
}

export type MobileNodeCommandPolicyStatus =
  | "not_required"
  | "allowed"
  | "blocked";

export interface MobileNodeCommandPolicyDecision {
  contractVersion: typeof MOBILE_NODE_COMMAND_POLICY_CONTRACT_VERSION;
  policyRequired: boolean;
  status: MobileNodeCommandPolicyStatus;
  allowed: boolean;
  reasonCode:
    | "not_required"
    | "missing_policy_contract"
    | "unknown_policy_contract"
    | "command_not_allowlisted"
    | "unsafe_command_pattern"
    | "allowed";
  policyVersion?: string;
  evaluatedCommands: string[];
  observedAttemptedCommands: string[];
  blockedCommand?: string;
}

interface MobileSourceContext {
  runtimeKey: SourceRuntimeKey;
  sourceId: string;
  sourceClass: string;
  providerId?: string;
  liveSessionId: string;
  attestation?: Record<string, unknown>;
}

function normalizeRequiredString(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : "";
}

function normalizeIdentityToken(value: unknown): string {
  const normalized = normalizeRequiredString(value);
  if (!normalized) {
    return "";
  }
  return normalized
    .toLowerCase()
    .replace(/[^a-z0-9._:-]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeHex32(value: number): string {
  return (value >>> 0).toString(16).padStart(8, "0");
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

export function buildMobileSourceAttestationChallenge(args: {
  liveSessionId: string;
  sourceId: string;
  nonce: string;
}): string {
  return `attn:${normalizeIdentityToken(args.liveSessionId)}:${normalizeIdentityToken(args.sourceId)}:${normalizeIdentityToken(args.nonce)}`;
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
  const secret = normalizeRequiredString(args.secret);
  const challenge = normalizeRequiredString(args.challenge);
  const nonce = normalizeRequiredString(args.nonce);
  const issuedAtMs =
    typeof args.issuedAtMs === "number" && Number.isFinite(args.issuedAtMs)
      ? Math.floor(args.issuedAtMs)
      : 0;
  const payload = [
    MOBILE_SOURCE_ATTESTATION_CONTRACT_VERSION,
    challenge,
    nonce,
    issuedAtMs,
    normalizeIdentityToken(args.liveSessionId),
    normalizeIdentityToken(args.sourceId),
    normalizeIdentityToken(args.sourceClass),
    normalizeIdentityToken(args.providerId),
  ].join("|");
  return `sigv1_${hashDeterministic(`${secret}|${payload}`)}`;
}

function normalizeSourceClassFromSourceId(sourceId: string): string {
  const firstToken = normalizeIdentityToken(sourceId.split(":")[0] || "");
  return firstToken || "unknown";
}

function isMobileAttestedSourceClass(sourceClass: string): boolean {
  return MOBILE_ATTESTATION_SOURCE_CLASS_PREFIXES.includes(
    sourceClass as (typeof MOBILE_ATTESTATION_SOURCE_CLASS_PREFIXES)[number]
  );
}

function normalizeRuntimeObject(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

function normalizeTimestamp(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }
  return Math.floor(value);
}

function collectMobileSourceContexts(metadata: Record<string, unknown>): MobileSourceContext[] {
  const contexts: MobileSourceContext[] = [];
  const liveSessionId =
    normalizeRequiredString(metadata.liveSessionId)
    || normalizeRequiredString(
      normalizeRuntimeObject(metadata.cameraRuntime)?.liveSessionId
    )
    || normalizeRequiredString(
      normalizeRuntimeObject(metadata.voiceRuntime)?.liveSessionId
    )
    || "live";

  const runtimeKeys: SourceRuntimeKey[] = ["cameraRuntime", "voiceRuntime"];
  for (const runtimeKey of runtimeKeys) {
    const runtime = normalizeRuntimeObject(metadata[runtimeKey]);
    if (!runtime) {
      continue;
    }
    const sourceId = normalizeRequiredString(runtime.sourceId);
    if (!sourceId) {
      continue;
    }
    const sourceClass =
      normalizeIdentityToken(runtime.sourceClass)
      || normalizeSourceClassFromSourceId(sourceId);
    const providerId = normalizeRequiredString(runtime.providerId) || undefined;
    const attestation =
      normalizeRuntimeObject(runtime.sourceAttestation)
      || normalizeRuntimeObject(metadata.sourceAttestation);
    contexts.push({
      runtimeKey,
      sourceId,
      sourceClass,
      providerId,
      liveSessionId,
      attestation,
    });
  }
  return contexts;
}

function resolveAttestationSecret(): string {
  return (
    normalizeRequiredString(process.env.AV_SOURCE_ATTESTATION_SECRET)
    || normalizeRequiredString(process.env.EXPO_PUBLIC_AV_ATTESTATION_SECRET)
    || DEFAULT_AV_ATTESTATION_SECRET
  );
}

function verifyMobileSourceAttestation(args: {
  context: MobileSourceContext;
  nowMs: number;
  secret: string;
}): MobileSourceAttestationEvidence {
  const defaultEvidenceBase = {
    runtimeKey: args.context.runtimeKey,
    sourceId: args.context.sourceId,
    sourceClass: args.context.sourceClass,
    providerId: args.context.providerId,
  } as const;
  const attestation = args.context.attestation;
  if (!attestation) {
    return {
      ...defaultEvidenceBase,
      verificationStatus: "missing",
      reasonCode: "missing_attestation",
      challengeNoncePresent: false,
      signaturePresent: false,
      quarantined: true,
    };
  }

  const challenge = normalizeRequiredString(attestation.challenge);
  const nonce = normalizeRequiredString(attestation.nonce);
  const signature = normalizeRequiredString(attestation.signature);
  const contractVersion =
    normalizeRequiredString(attestation.contractVersion)
    || normalizeRequiredString(attestation.version);
  const attestedSourceId = normalizeRequiredString(attestation.sourceId);
  const attestedSourceClass =
    normalizeIdentityToken(attestation.sourceClass) || args.context.sourceClass;
  const attestedProviderId = normalizeRequiredString(attestation.providerId)
    || args.context.providerId
    || "unknown_provider";
  const issuedAtMs = normalizeTimestamp(attestation.issuedAtMs);

  const challengeNoncePresent = challenge.length > 0 && nonce.length > 0;
  const signaturePresent = signature.length > 0;

  if (contractVersion !== MOBILE_SOURCE_ATTESTATION_CONTRACT_VERSION) {
    return {
      ...defaultEvidenceBase,
      verificationStatus: "unknown_contract",
      reasonCode: "unknown_attestation_contract",
      challengeNoncePresent,
      signaturePresent,
      quarantined: true,
    };
  }

  if (!challengeNoncePresent || !signaturePresent || issuedAtMs === undefined) {
    return {
      ...defaultEvidenceBase,
      verificationStatus: "malformed",
      reasonCode: "malformed_attestation",
      challengeNoncePresent,
      signaturePresent,
      quarantined: true,
    };
  }

  if (
    normalizeIdentityToken(attestedSourceId) !==
    normalizeIdentityToken(args.context.sourceId)
  ) {
    return {
      ...defaultEvidenceBase,
      verificationStatus: "source_mismatch",
      reasonCode: "attested_source_mismatch",
      challengeNoncePresent,
      signaturePresent,
      quarantined: true,
    };
  }

  const expectedChallenge = buildMobileSourceAttestationChallenge({
    liveSessionId: args.context.liveSessionId,
    sourceId: args.context.sourceId,
    nonce,
  });
  if (challenge !== expectedChallenge) {
    return {
      ...defaultEvidenceBase,
      verificationStatus: "challenge_mismatch",
      reasonCode: "challenge_mismatch",
      challengeNoncePresent,
      signaturePresent,
      quarantined: true,
    };
  }

  if (issuedAtMs > args.nowMs + MOBILE_SOURCE_ATTESTATION_MAX_FUTURE_SKEW_MS) {
    return {
      ...defaultEvidenceBase,
      verificationStatus: "future_timestamp",
      reasonCode: "attestation_timestamp_in_future",
      challengeNoncePresent,
      signaturePresent,
      quarantined: true,
    };
  }
  if (args.nowMs - issuedAtMs > MOBILE_SOURCE_ATTESTATION_MAX_AGE_MS) {
    return {
      ...defaultEvidenceBase,
      verificationStatus: "expired",
      reasonCode: "attestation_expired",
      challengeNoncePresent,
      signaturePresent,
      quarantined: true,
    };
  }

  const expectedSignature = computeMobileSourceAttestationSignature({
    secret: args.secret,
    challenge,
    nonce,
    issuedAtMs,
    liveSessionId: args.context.liveSessionId,
    sourceId: args.context.sourceId,
    sourceClass: attestedSourceClass,
    providerId: normalizeIdentityToken(attestedProviderId) || "unknown_provider",
  });
  if (signature !== expectedSignature) {
    return {
      ...defaultEvidenceBase,
      verificationStatus: "invalid_signature",
      reasonCode: "invalid_signature",
      challengeNoncePresent,
      signaturePresent,
      quarantined: true,
    };
  }

  return {
    ...defaultEvidenceBase,
    verificationStatus: "verified",
    reasonCode: "verified",
    challengeNoncePresent,
    signaturePresent,
    quarantined: false,
  };
}

function parseNodeCommandList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return Array.from(
    new Set(
      value
        .map((entry) => (typeof entry === "string" ? entry.trim().toLowerCase() : ""))
        .filter((entry) => entry.length > 0)
    )
  );
}

function parseNodeCommandAllowlistFromEnv(): Set<string> {
  const envValue = normalizeRequiredString(process.env.AV_ALLOWED_NODE_COMMANDS);
  const source = envValue.length > 0
    ? envValue.split(",")
    : [...DEFAULT_ALLOWED_NODE_COMMANDS];
  return new Set(
    source
      .map((entry) => normalizeRequiredString(entry).toLowerCase())
      .filter((entry) => entry.length > 0)
  );
}

function parseNodeCommandBlockedPatternsFromEnv(): RegExp[] {
  const envValue = normalizeRequiredString(process.env.AV_BLOCKED_NODE_COMMAND_PATTERNS);
  const source = envValue.length > 0
    ? envValue.split(",")
    : [...DEFAULT_BLOCKED_NODE_COMMAND_PATTERNS];
  return source
    .map((entry) => normalizeRequiredString(entry))
    .filter((entry) => entry.length > 0)
    .map((entry) => new RegExp(entry.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
}

export function resolveMobileSourceAttestationContract(args: {
  metadata: Record<string, unknown>;
  nowMs?: number;
  secret?: string;
}): MobileSourceAttestationContract {
  const nowMs =
    typeof args.nowMs === "number" && Number.isFinite(args.nowMs)
      ? Math.floor(args.nowMs)
      : Date.now();
  const secret = args.secret || resolveAttestationSecret();
  const contexts = collectMobileSourceContexts(args.metadata);
  const attestedContexts = contexts.filter((context) =>
    isMobileAttestedSourceClass(context.sourceClass)
  );
  if (attestedContexts.length === 0) {
    return {
      contractVersion: MOBILE_SOURCE_ATTESTATION_CONTRACT_VERSION,
      verificationRequired: false,
      verified: true,
      verificationStatus: "not_required",
      verifiedSourceCount: 0,
      quarantinedSourceIds: [],
      reasonCodes: [],
      evidences: [],
    };
  }

  const evidences = attestedContexts.map((context) =>
    verifyMobileSourceAttestation({
      context,
      nowMs,
      secret,
    })
  );
  const quarantinedSourceIds = evidences
    .filter((evidence) => evidence.quarantined)
    .map((evidence) => evidence.sourceId);
  const verifiedSourceCount = evidences.filter(
    (evidence) => evidence.verificationStatus === "verified"
  ).length;
  const verified = quarantinedSourceIds.length === 0;
  const reasonCodes = Array.from(
    new Set(
      evidences
        .filter((evidence) => evidence.reasonCode !== "verified")
        .map((evidence) => evidence.reasonCode)
    )
  ).sort();

  return {
    contractVersion: MOBILE_SOURCE_ATTESTATION_CONTRACT_VERSION,
    verificationRequired: true,
    verified,
    verificationStatus: verified ? "verified" : evidences[0]?.verificationStatus ?? "missing",
    verifiedSourceCount,
    quarantinedSourceIds,
    reasonCodes,
    evidences,
  };
}

export function resolveMobileNodeCommandPolicyDecision(args: {
  metadata: Record<string, unknown>;
  requiredCommands: string[];
  enforceForLiveIngress: boolean;
}): MobileNodeCommandPolicyDecision {
  const evaluatedCommands = Array.from(
    new Set(
      args.requiredCommands
        .map((command) => normalizeRequiredString(command).toLowerCase())
        .filter((command) => command.length > 0)
    )
  );

  if (!args.enforceForLiveIngress) {
    return {
      contractVersion: MOBILE_NODE_COMMAND_POLICY_CONTRACT_VERSION,
      policyRequired: false,
      status: "not_required",
      allowed: true,
      reasonCode: "not_required",
      evaluatedCommands,
      observedAttemptedCommands: [],
    };
  }

  const policy =
    normalizeRuntimeObject(args.metadata.commandPolicy)
    || normalizeRuntimeObject(normalizeRuntimeObject(args.metadata.concierge)?.commandPolicy);
  if (!policy) {
    return {
      contractVersion: MOBILE_NODE_COMMAND_POLICY_CONTRACT_VERSION,
      policyRequired: true,
      status: "blocked",
      allowed: false,
      reasonCode: "missing_policy_contract",
      evaluatedCommands,
      observedAttemptedCommands: [],
    };
  }

  const policyVersion =
    normalizeRequiredString(policy.contractVersion)
    || normalizeRequiredString(policy.version);
  if (policyVersion !== MOBILE_NODE_COMMAND_POLICY_CONTRACT_VERSION) {
    return {
      contractVersion: MOBILE_NODE_COMMAND_POLICY_CONTRACT_VERSION,
      policyRequired: true,
      status: "blocked",
      allowed: false,
      reasonCode: "unknown_policy_contract",
      policyVersion: policyVersion || undefined,
      evaluatedCommands,
      observedAttemptedCommands: parseNodeCommandList(policy.attemptedCommands),
    };
  }

  const attemptedCommands = parseNodeCommandList(
    policy.attemptedCommands || policy.commands
  );
  const candidateCommands = Array.from(
    new Set([...evaluatedCommands, ...attemptedCommands])
  );
  const allowlist = parseNodeCommandAllowlistFromEnv();
  const blockedPatterns = parseNodeCommandBlockedPatternsFromEnv();

  for (const command of candidateCommands) {
    const blockedPattern = blockedPatterns.find((pattern) => pattern.test(command));
    if (blockedPattern) {
      return {
        contractVersion: MOBILE_NODE_COMMAND_POLICY_CONTRACT_VERSION,
        policyRequired: true,
        status: "blocked",
        allowed: false,
        reasonCode: "unsafe_command_pattern",
        policyVersion,
        evaluatedCommands,
        observedAttemptedCommands: attemptedCommands,
        blockedCommand: command,
      };
    }
    if (!allowlist.has(command)) {
      return {
        contractVersion: MOBILE_NODE_COMMAND_POLICY_CONTRACT_VERSION,
        policyRequired: true,
        status: "blocked",
        allowed: false,
        reasonCode: "command_not_allowlisted",
        policyVersion,
        evaluatedCommands,
        observedAttemptedCommands: attemptedCommands,
        blockedCommand: command,
      };
    }
  }

  return {
    contractVersion: MOBILE_NODE_COMMAND_POLICY_CONTRACT_VERSION,
    policyRequired: true,
    status: "allowed",
    allowed: true,
    reasonCode: "allowed",
    policyVersion,
    evaluatedCommands,
    observedAttemptedCommands: attemptedCommands,
  };
}
