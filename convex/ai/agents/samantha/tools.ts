import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js/max";

import type { AgentToolResult } from "../../agentToolOrchestration";
import {
  extractSessionContactMemoryCandidates,
  type SessionContactMemoryRecord,
} from "../../memoryComposer";
import {
  AUDIT_DELIVERABLE_OUTCOME_KEY,
  AUDIT_DELIVERABLE_TOOL_NAME,
  SAMANTHA_RUNTIME_MODULE_ADAPTER,
  type SamanthaAuditAutoDispatchPlan,
  type SamanthaAuditDispatchDecision,
  type SamanthaAuditRequiredField,
  type SamanthaAutoDispatchInvocationStatus,
  type SamanthaAutoDispatchSkipReasonCode,
  type SamanthaClaimRecoveryDecision,
} from "../../samanthaAuditContract";
import {
  isSamanthaLeadCaptureRuntime,
  resolveSamanthaAuditSessionContextFailure,
} from "./policy";

export interface SamanthaActionCompletionEnforcementPayloadLike {
  reasonCode?: string;
  outcome?: string;
  requiredTools: string[];
}

export interface SamanthaDispatchEnforcementPayloadLike {
  reasonCode?: string;
}

export type SamanthaAutoDispatchPromptLanguage = "en" | "de";

function normalizeExecutionString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeDeterministicExecutionToolNames(toolNames: string[]): string[] {
  return Array.from(
    new Set(
      toolNames
        .map((toolName) => normalizeExecutionString(toolName))
        .filter((toolName): toolName is string => Boolean(toolName)),
    ),
  ).sort((left, right) => left.localeCompare(right));
}

function extractFirstEmailAddress(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const matched = value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  if (!matched || matched.length === 0) {
    return undefined;
  }
  const normalized = normalizeExecutionString(matched[0]);
  return normalized ? normalized.toLowerCase() : undefined;
}

const SAMANTHA_FOUNDER_CONTACT_LABEL_HINTS = [
  "foundercontact",
  "foundercontactpreference",
  "foundercontactrequested",
  "contactfounder",
  "founderkontakt",
  "gruenderkontakt",
  "grunderkontakt",
  "fondateur",
] as const;

const SAMANTHA_BOOLEAN_TRUE_TOKENS = new Set([
  "yes",
  "y",
  "ja",
  "oui",
  "si",
  "true",
  "1",
  "ok",
  "okay",
  "requested",
  "gewuenscht",
  "gewunscht",
]);

const SAMANTHA_BOOLEAN_FALSE_TOKENS = new Set([
  "no",
  "n",
  "nein",
  "non",
  "false",
  "0",
  "not",
  "kein",
  "keine",
  "keinen",
]);

const SAMANTHA_PHONE_DIRECT_INPUT_PATTERN = /^[+()\d.\-\s]{8,28}$/;
const SAMANTHA_PHONE_CONTEXT_HINT_PATTERN =
  /\b(?:phone|phone number|contact number|my number|number|mobile|telephone|tel|call|text|sms|whatsapp|telefon|telefonnummer|handy|nummer)\b/i;
const SAMANTHA_PHONE_EMBEDDED_PATTERN = /(?:\+?\d[\d().\-\s]{6,24}\d)/g;
const SAMANTHA_COMMA_LEAD_PAYLOAD_SPLIT_PATTERN = /[\n,;|/]+/g;
const SAMANTHA_NANP_DIGIT_PATTERN = /^(?:1)?\d{10}$/;
const SAMANTHA_PHONE_GERMAN_CONTEXT_PATTERN =
  /\b(?:vorname|nachname|telefon|telefonnummer|handy|nummer|kontakt|bitte|ja|nein)\b/i;
const SAMANTHA_PHONE_ENGLISH_CONTEXT_PATTERN =
  /\b(?:first name|last name|my number|phone|phone number|call me|text me|yes|no)\b/i;
const SAMANTHA_PHONE_DEFAULT_COUNTRY_HINTS: CountryCode[] = [
  "DE",
  "AT",
  "CH",
  "US",
  "CA",
  "GB",
  "FR",
  "NL",
  "BE",
  "IT",
  "ES",
  "PT",
];
const SAMANTHA_FALLBACK_NAME_SEGMENT_SPLIT_PATTERN = /[\n,;|/]+/g;
const SAMANTHA_FALLBACK_NAME_STOPWORD_TOKENS = new Set([
  "and",
  "or",
  "email",
  "mail",
  "phone",
  "telefon",
  "telefonnummer",
  "nummer",
  "contact",
  "kontakt",
  "founder",
  "budget",
  "umsatz",
  "revenue",
  "industry",
  "branche",
  "company",
  "firma",
  "ki",
  "ai",
  "yes",
  "no",
  "ja",
  "nein",
]);
const SAMANTHA_FOUNDER_CONTACT_PERMISSION_PATTERN =
  /\b(?:contact me|reach me|reach out to me|call me|text me|email me|can contact me|can call me|kann mich kontaktieren|mich kontaktieren|mich anrufen|mich erreichen|me contacter|peut me contacter)\b/i;

function normalizeSamanthaToken(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase();
}

type SamanthaPhoneConfidence = "high" | "medium";

interface SamanthaPhoneResolution {
  phone?: string;
  provisionalPhone?: string;
  confidence?: SamanthaPhoneConfidence;
}

function resolveSamanthaPhoneCountryHints(args: {
  message: string;
  rawCandidate: string;
}): CountryCode[] {
  const digits = args.rawCandidate.replace(/[^\d]/g, "");
  const hasGermanContext = SAMANTHA_PHONE_GERMAN_CONTEXT_PATTERN.test(args.message);
  const hasEnglishContext = SAMANTHA_PHONE_ENGLISH_CONTEXT_PATTERN.test(args.message);
  if (SAMANTHA_NANP_DIGIT_PATTERN.test(digits) && hasEnglishContext && !hasGermanContext) {
    return [
      "US",
      "CA",
      ...SAMANTHA_PHONE_DEFAULT_COUNTRY_HINTS.filter(
        (country) => country !== "US" && country !== "CA",
      ),
    ];
  }
  if (hasGermanContext) {
    return [
      "DE",
      "AT",
      "CH",
      ...SAMANTHA_PHONE_DEFAULT_COUNTRY_HINTS.filter(
        (country) => country !== "DE" && country !== "AT" && country !== "CH",
      ),
    ];
  }
  return SAMANTHA_PHONE_DEFAULT_COUNTRY_HINTS;
}

function normalizeSamanthaPhoneCandidate(
  value: unknown,
  args?: {
    minDigits?: number;
    allowPossible?: boolean;
    countryHints?: CountryCode[];
  },
): string | undefined {
  const normalized = normalizeExecutionString(value);
  if (!normalized) {
    return undefined;
  }
  const digits = normalized.replace(/[^\d]/g, "");
  const minDigits = args?.minDigits ?? 8;
  if (digits.length < minDigits || digits.length > 15) {
    return undefined;
  }
  const allowPossible = args?.allowPossible ?? false;

  const tryResolvedCandidate = (
    candidate: ReturnType<typeof parsePhoneNumberFromString> | undefined,
  ): string | undefined => {
    if (!candidate) {
      return undefined;
    }
    if (candidate.isValid()) {
      return candidate.number;
    }
    if (allowPossible && candidate.isPossible()) {
      return candidate.number;
    }
    return undefined;
  };

  const directCandidate = tryResolvedCandidate(parsePhoneNumberFromString(normalized));
  if (directCandidate) {
    return directCandidate;
  }

  const countryHints = args?.countryHints && args.countryHints.length > 0
    ? args.countryHints
    : SAMANTHA_PHONE_DEFAULT_COUNTRY_HINTS;
  for (const countryHint of countryHints) {
    const localizedCandidate = tryResolvedCandidate(
      parsePhoneNumberFromString(normalized, countryHint),
    );
    if (localizedCandidate) {
      return localizedCandidate;
    }
  }

  return undefined;
}

function resolveFallbackSamanthaPreferredName(messages: string[]): string | undefined {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = normalizeExecutionString(messages[index]);
    if (!message) {
      continue;
    }
    const candidates: string[] = [];
    const segments = message
      .split(SAMANTHA_FALLBACK_NAME_SEGMENT_SPLIT_PATTERN)
      .map((segment) => normalizeExecutionString(segment))
      .filter((segment): segment is string => Boolean(segment));
    if (segments.length > 0) {
      candidates.push(segments[0]);
    }
    const messageEmailMatch = message.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    if (messageEmailMatch?.index && messageEmailMatch.index > 0) {
      const beforeEmail = message
        .slice(0, messageEmailMatch.index)
        .split(SAMANTHA_FALLBACK_NAME_SEGMENT_SPLIT_PATTERN)
        .map((segment) => normalizeExecutionString(segment))
        .filter((segment): segment is string => Boolean(segment));
      if (beforeEmail.length > 0) {
        candidates.push(beforeEmail[beforeEmail.length - 1]);
      }
    }

    for (const candidate of candidates) {
      if (!candidate || candidate.includes("@") || /\d/.test(candidate)) {
        continue;
      }
      const rawTokens = candidate.split(/\s+/g);
      const normalizedTokens = rawTokens
        .map((token) => normalizeSamanthaNamePart(token))
        .filter((token): token is string => Boolean(token));
      if (normalizedTokens.length < 2 || normalizedTokens.length > 4) {
        continue;
      }
      if (rawTokens.length !== normalizedTokens.length) {
        continue;
      }
      const hasStopword = normalizedTokens.some((token) =>
        SAMANTHA_FALLBACK_NAME_STOPWORD_TOKENS.has(normalizeSamanthaToken(token)),
      );
      if (hasStopword) {
        continue;
      }
      return normalizedTokens.join(" ");
    }
  }
  return undefined;
}

function extractSamanthaStructuredRows(message: string): Array<{ label: string; value: string }> {
  const rows: Array<{ label: string; value: string }> = [];
  const linePattern = /^\s*([^:\n]{1,80})\s*:\s*(.+?)\s*$/gm;
  linePattern.lastIndex = 0;
  let matched: RegExpExecArray | null = null;
  while ((matched = linePattern.exec(message)) !== null) {
    const label = normalizeExecutionString(matched[1]);
    const rawValue = normalizeExecutionString(matched[2]);
    if (!label || !rawValue) {
      continue;
    }
    const value = rawValue.replace(/^['"]/, "").replace(/['"]$/, "").trim();
    if (!value) {
      continue;
    }
    rows.push({ label, value });
  }
  return rows;
}

function resolveFirstSessionContactMemoryValue(
  records: SessionContactMemoryRecord[] | undefined,
  field: SessionContactMemoryRecord["field"],
): string | undefined {
  for (const record of records || []) {
    if (record.field !== field || record.status !== "active") {
      continue;
    }
    const normalized = normalizeExecutionString(record.value);
    if (normalized) {
      return normalized;
    }
  }
  return undefined;
}

function normalizeSamanthaNamePart(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.replace(/\s+/g, " ").trim().replace(/^['"]|['"]$/g, "");
  if (!/^\p{L}[\p{L}'-]{0,79}$/u.test(normalized)) {
    return undefined;
  }
  return normalized;
}

const SAMANTHA_FOUNDER_CONTACT_CONFIDENCE_THRESHOLD = 0.8;

function splitSamanthaPreferredName(value: unknown): {
  firstName?: string;
  lastName?: string;
  mononym?: string;
  inputTokenCount: number;
} {
  if (typeof value !== "string") {
    return { inputTokenCount: 0 };
  }
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return { inputTokenCount: 0 };
  }
  const rawTokens = normalized.split(" ");
  const tokens = rawTokens.map((token) => normalizeSamanthaNamePart(token));
  const validTokens = tokens.filter((token): token is string => Boolean(token));
  if (validTokens.length === 1) {
    return {
      mononym: validTokens[0],
      inputTokenCount: rawTokens.length,
    };
  }
  if (validTokens.length < 2) {
    return { inputTokenCount: rawTokens.length };
  }
  return {
    firstName: validTokens[0],
    lastName: validTokens.slice(1).join(" "),
    inputTokenCount: rawTokens.length,
  };
}

function normalizeSamanthaLabelToken(value: string): string {
  return normalizeSamanthaToken(value).replace(/[^a-z0-9]/g, "");
}

interface SamanthaResolvedNameParts {
  firstName?: string;
  lastName?: string;
  ambiguousName: boolean;
}

function resolveSamanthaNameParts(args: { resolvedName?: string }): SamanthaResolvedNameParts {
  const splitName = splitSamanthaPreferredName(args.resolvedName);
  if (splitName.firstName && splitName.lastName) {
    return {
      firstName: splitName.firstName,
      lastName: splitName.lastName,
      ambiguousName: false,
    };
  }
  if (splitName.mononym) {
    if (splitName.inputTokenCount === 1) {
      return {
        firstName: splitName.mononym,
        lastName: splitName.mononym,
        ambiguousName: false,
      };
    }
    return {
      ambiguousName: true,
    };
  }
  if (typeof args.resolvedName === "string" && args.resolvedName.trim().length > 0) {
    return {
      ambiguousName: true,
    };
  }
  return {
    ambiguousName: false,
  };
}

function parseSamanthaBooleanToken(value: string): {
  parsed?: boolean;
  ambiguous: boolean;
} {
  const normalized = normalizeSamanthaToken(value)
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) {
    return { ambiguous: false };
  }
  const tokens = normalized.split(" ");
  let seenTrue = false;
  let seenFalse = false;
  for (const token of tokens) {
    if (SAMANTHA_BOOLEAN_TRUE_TOKENS.has(token)) {
      seenTrue = true;
    }
    if (SAMANTHA_BOOLEAN_FALSE_TOKENS.has(token)) {
      seenFalse = true;
    }
  }
  if (seenTrue && seenFalse) {
    return { ambiguous: true };
  }
  if (seenTrue && !seenFalse) {
    return { parsed: true, ambiguous: false };
  }
  if (seenFalse && !seenTrue) {
    return { parsed: false, ambiguous: false };
  }
  return { ambiguous: false };
}

function isFounderContactLabel(label: string): boolean {
  const normalized = normalizeSamanthaLabelToken(label);
  if (!normalized) {
    return false;
  }
  if (SAMANTHA_FOUNDER_CONTACT_LABEL_HINTS.some((hint) => normalized.includes(hint))) {
    return true;
  }
  return normalized.includes("founder")
    && (normalized.includes("contact") || normalized.includes("kontakt"));
}

interface SamanthaFounderContactResolution {
  founderContactRequested?: boolean;
  ambiguous: boolean;
  confidence: number;
}

function extractFounderContactInlineSegments(message: string): string[] {
  const sentenceSegments = message
    .split(/[\n\r.!?;]+/g)
    .map((segment) => normalizeExecutionString(segment))
    .filter((segment): segment is string => Boolean(segment));
  const matchedSegments: string[] = [];
  for (const sentenceSegment of sentenceSegments) {
    const clauseSegments = sentenceSegment
      .split(/[,]+/g)
      .map((segment) => normalizeExecutionString(segment))
      .filter((segment): segment is string => Boolean(segment));
    for (const clause of clauseSegments) {
      if (
        isFounderContactLabel(clause)
        || SAMANTHA_FOUNDER_CONTACT_PERMISSION_PATTERN.test(clause)
      ) {
        matchedSegments.push(clause);
      }
    }
  }
  return matchedSegments;
}

function resolveFounderContactPreference(messages: string[]): SamanthaFounderContactResolution {
  let resolved: boolean | undefined;
  let confidence = 0;
  let sawConflictingSignals = false;

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    const structuredRows = extractSamanthaStructuredRows(message);
    let sawFounderContactStructuredRow = false;
    for (let rowIndex = structuredRows.length - 1; rowIndex >= 0; rowIndex -= 1) {
      const row = structuredRows[rowIndex];
      if (!isFounderContactLabel(row.label)) {
        continue;
      }
      sawFounderContactStructuredRow = true;
      const parsed = parseSamanthaBooleanToken(row.value);
      if (parsed.ambiguous) {
        sawConflictingSignals = true;
      } else if (typeof parsed.parsed === "boolean") {
        if (typeof resolved === "boolean" && resolved !== parsed.parsed) {
          sawConflictingSignals = true;
        }
        resolved = parsed.parsed;
        confidence = Math.max(confidence, 1);
      }
    }

    // Prefer structured founder-contact rows when present; full-message parsing can
    // falsely absorb unrelated yes/no tokens from other fields in the same payload.
    if (sawFounderContactStructuredRow) {
      continue;
    }

    const hasExplicitFounderContext =
      /\b(founder|gruender|grunder|fondateur)\b/i.test(message)
      || SAMANTHA_FOUNDER_CONTACT_PERMISSION_PATTERN.test(message);
    if (isLikelyCommaDelimitedLeadPayload(message) && !hasExplicitFounderContext) {
      const commaSegments = extractSamanthaDelimitedLeadSegments(message);
      for (let segmentIndex = commaSegments.length - 1; segmentIndex >= 0; segmentIndex -= 1) {
        const segment = commaSegments[segmentIndex];
        if (segment.includes("@") || /\d/.test(segment)) {
          continue;
        }
        const normalizedSegment = normalizeSamanthaToken(segment)
          .replace(/[^a-z0-9\s]/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        if (!normalizedSegment) {
          continue;
        }
        const normalizedTokens = normalizedSegment.split(" ");
        if (normalizedTokens.length > 2) {
          continue;
        }
        const parsedSegment = parseSamanthaBooleanToken(segment);
        if (parsedSegment.ambiguous) {
          sawConflictingSignals = true;
          continue;
        }
        if (typeof parsedSegment.parsed === "boolean") {
          if (typeof resolved === "boolean" && resolved !== parsedSegment.parsed) {
            sawConflictingSignals = true;
          }
          resolved = parsedSegment.parsed;
          confidence = Math.max(confidence, 0.9);
          break;
        }
      }
      if (typeof resolved === "boolean" && confidence >= 0.9) {
        continue;
      }
    }

    const inlineSegments = extractFounderContactInlineSegments(message);
    for (const segment of inlineSegments) {
      const parsedInline = parseSamanthaBooleanToken(segment);
      if (parsedInline.ambiguous) {
        sawConflictingSignals = true;
      } else if (typeof parsedInline.parsed === "boolean") {
        if (typeof resolved === "boolean" && resolved !== parsedInline.parsed) {
          sawConflictingSignals = true;
        }
        resolved = parsedInline.parsed;
        confidence = Math.max(confidence, 0.85);
      }
    }
  }

  if (sawConflictingSignals) {
    return {
      founderContactRequested: undefined,
      ambiguous: true,
      confidence,
    };
  }
  if (typeof resolved === "boolean" && confidence >= SAMANTHA_FOUNDER_CONTACT_CONFIDENCE_THRESHOLD) {
    return {
      founderContactRequested: resolved,
      ambiguous: false,
      confidence,
    };
  }
  return {
    founderContactRequested: undefined,
    ambiguous: false,
    confidence,
  };
}

export interface SamanthaAuditResolvedLeadData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  provisionalPhone?: string;
  founderContactRequested?: boolean;
  workflowRecommendation?: string;
  ambiguousName: boolean;
  ambiguousFounderContact: boolean;
  missingRequiredFields: SamanthaAuditRequiredField[];
}

function resolveFallbackSamanthaEmail(messages: string[]): string | undefined {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const email = extractFirstEmailAddress(messages[index]);
    if (email) {
      return email;
    }
  }
  return undefined;
}

function extractSamanthaDelimitedLeadSegments(message: string): string[] {
  return message
    .split(SAMANTHA_COMMA_LEAD_PAYLOAD_SPLIT_PATTERN)
    .map((segment) => normalizeExecutionString(segment))
    .filter((segment): segment is string => Boolean(segment));
}

function isLikelyCommaDelimitedLeadPayload(message: string): boolean {
  if (!message.includes(",")) {
    return false;
  }
  const segments = extractSamanthaDelimitedLeadSegments(message);
  if (segments.length < 3) {
    return false;
  }
  const hasEmailSegment = segments.some((segment) => Boolean(extractFirstEmailAddress(segment)));
  if (!hasEmailSegment) {
    return false;
  }
  const hasFounderPreferenceSignal = segments.some((segment) => {
    const parsed = parseSamanthaBooleanToken(segment);
    return !parsed.ambiguous && typeof parsed.parsed === "boolean";
  });
  return hasFounderPreferenceSignal;
}

function resolveFallbackSamanthaPhone(messages: string[]): SamanthaPhoneResolution {
  let provisionalPhone: string | undefined;
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = normalizeExecutionString(messages[index]);
    if (!message) {
      continue;
    }

    if (SAMANTHA_PHONE_DIRECT_INPUT_PATTERN.test(message)) {
      const direct = normalizeSamanthaPhoneCandidate(message, {
        minDigits: 10,
        countryHints: resolveSamanthaPhoneCountryHints({
          message,
          rawCandidate: message,
        }),
      });
      if (direct) {
        return {
          phone: direct,
          confidence: "high",
        };
      }
    }

    const isCommaDelimitedLeadPayload = isLikelyCommaDelimitedLeadPayload(message);
    const embeddedMatches = message.match(SAMANTHA_PHONE_EMBEDDED_PATTERN);
    if (!embeddedMatches || embeddedMatches.length === 0) {
      continue;
    }
    for (let matchIndex = embeddedMatches.length - 1; matchIndex >= 0; matchIndex -= 1) {
      const rawMatch = embeddedMatches[matchIndex];
      const countryHints = resolveSamanthaPhoneCountryHints({
        message,
        rawCandidate: rawMatch,
      });
      const phone = normalizeSamanthaPhoneCandidate(rawMatch, {
        minDigits: 8,
        countryHints,
      });
      if (phone) {
        const explicitPhoneContext =
          SAMANTHA_PHONE_CONTEXT_HINT_PATTERN.test(message)
          || rawMatch.trim().startsWith("+");
        if (explicitPhoneContext || isCommaDelimitedLeadPayload) {
          return {
            phone,
            confidence: "high",
          };
        }
        if (!provisionalPhone) {
          const mediumConfidenceCandidate = normalizeSamanthaPhoneCandidate(rawMatch, {
            minDigits: 8,
            allowPossible: true,
            countryHints,
          });
          if (mediumConfidenceCandidate) {
            provisionalPhone = mediumConfidenceCandidate;
          }
        }
      }
    }
  }
  if (provisionalPhone) {
    return {
      provisionalPhone,
      confidence: "medium",
    };
  }
  return {};
}

export function resolveSamanthaAuditLeadData(args: {
  inboundMessage: string;
  recentUserMessages: string[];
  capturedEmail?: string | null;
  capturedName?: string | null;
  contactMemory?: SessionContactMemoryRecord[];
  auditSessionWorkflowRecommendation?: string | null;
}): SamanthaAuditResolvedLeadData {
  const candidateMessages = [...args.recentUserMessages, args.inboundMessage]
    .map((message) => message.trim())
    .filter((message) => message.length > 0);
  const extractedByField = new Map<"preferred_name" | "email" | "phone", string>();
  for (let index = candidateMessages.length - 1; index >= 0; index -= 1) {
    const message = candidateMessages[index];
    const messageCandidates = extractSessionContactMemoryCandidates({
      userMessage: message,
    });
    for (const candidate of messageCandidates) {
      if (
        candidate.field !== "preferred_name"
        && candidate.field !== "email"
        && candidate.field !== "phone"
      ) {
        continue;
      }
      const normalized =
        candidate.field === "phone"
          ? normalizeSamanthaPhoneCandidate(candidate.value, {
              minDigits: 8,
              allowPossible: true,
            })
          : normalizeExecutionString(candidate.value);
      if (!normalized || extractedByField.has(candidate.field)) {
        continue;
      }
      extractedByField.set(candidate.field, normalized);
    }
  }
  const combinedExtraction = extractSessionContactMemoryCandidates({
    userMessage: candidateMessages.join("\n"),
  });
  for (const candidate of combinedExtraction) {
    if (
      candidate.field !== "preferred_name"
      && candidate.field !== "email"
      && candidate.field !== "phone"
    ) {
      continue;
    }
    const normalized =
      candidate.field === "phone"
        ? normalizeSamanthaPhoneCandidate(candidate.value, {
            minDigits: 8,
            allowPossible: true,
          })
        : normalizeExecutionString(candidate.value);
    if (!normalized || extractedByField.has(candidate.field)) {
      continue;
    }
    extractedByField.set(candidate.field, normalized);
  }

  const contactMemoryName = resolveFirstSessionContactMemoryValue(
    args.contactMemory,
    "preferred_name",
  );
  const contactMemoryEmail = resolveFirstSessionContactMemoryValue(
    args.contactMemory,
    "email",
  );
  const contactMemoryPhone = resolveFirstSessionContactMemoryValue(
    args.contactMemory,
    "phone",
  );
  const resolvedName = extractedByField.get("preferred_name")
    || normalizeExecutionString(args.capturedName)
    || contactMemoryName
    || resolveFallbackSamanthaPreferredName(candidateMessages);
  const resolvedNameParts = resolveSamanthaNameParts({ resolvedName });
  const fallbackEmail = resolveFallbackSamanthaEmail(candidateMessages);
  const fallbackPhoneResolution = resolveFallbackSamanthaPhone(candidateMessages);
  const email = extractFirstEmailAddress(extractedByField.get("email"))
    || extractFirstEmailAddress(args.capturedEmail)
    || extractFirstEmailAddress(contactMemoryEmail)
    || fallbackEmail;
  const phone =
    normalizeSamanthaPhoneCandidate(extractedByField.get("phone"), {
      minDigits: 8,
      allowPossible: true,
    })
    || normalizeSamanthaPhoneCandidate(contactMemoryPhone, {
      minDigits: 8,
      allowPossible: true,
    })
    || fallbackPhoneResolution.phone;
  const provisionalPhone = fallbackPhoneResolution.provisionalPhone;
  const founderContact = resolveFounderContactPreference(candidateMessages);

  const missing: SamanthaAuditRequiredField[] = [];
  if (!resolvedNameParts.firstName) {
    missing.push("first_name");
  }
  if (!resolvedNameParts.lastName) {
    missing.push("last_name");
  }
  if (!email) {
    missing.push("email");
  }
  if (!phone) {
    missing.push("phone");
  }
  if (typeof founderContact.founderContactRequested !== "boolean") {
    missing.push("founder_contact_preference");
  }

  return {
    firstName: resolvedNameParts.firstName,
    lastName: resolvedNameParts.lastName,
    email,
    phone,
    provisionalPhone,
    founderContactRequested: founderContact.founderContactRequested,
    workflowRecommendation:
      normalizeExecutionString(args.auditSessionWorkflowRecommendation) || undefined,
    ambiguousName: resolvedNameParts.ambiguousName,
    ambiguousFounderContact: founderContact.ambiguous,
    missingRequiredFields: missing.sort((left, right) => left.localeCompare(right)),
  };
}

function buildSamanthaResolvedLeadSummaryLines(args: {
  leadData: SamanthaAuditResolvedLeadData;
  language: SamanthaAutoDispatchPromptLanguage;
}): string[] {
  const lines: string[] = [];
  if (args.leadData.firstName && args.leadData.lastName) {
    lines.push(
      args.language === "de"
        ? `- Name: ${args.leadData.firstName} ${args.leadData.lastName}`
        : `- Name: ${args.leadData.firstName} ${args.leadData.lastName}`,
    );
  }
  if (args.leadData.email) {
    lines.push(`- Email: ${args.leadData.email}`);
  }
  if (args.leadData.phone) {
    lines.push(`- Phone: ${args.leadData.phone}`);
  } else if (args.leadData.provisionalPhone) {
    lines.push(`- Phone (unconfirmed): ${args.leadData.provisionalPhone}`);
  }
  if (typeof args.leadData.founderContactRequested === "boolean") {
    const founderContactLabel = args.leadData.founderContactRequested
      ? (args.language === "de" ? "Ja" : "Yes")
      : (args.language === "de" ? "Nein" : "No");
    lines.push(
      args.language === "de"
        ? `- Founder-Kontakt: ${founderContactLabel}`
        : `- Founder contact: ${founderContactLabel}`,
    );
  }
  return lines;
}

function buildSamanthaMissingFieldRecoveryPrompts(args: {
  leadData: SamanthaAuditResolvedLeadData;
  language: SamanthaAutoDispatchPromptLanguage;
}): string[] {
  const missing = new Set(args.leadData.missingRequiredFields);
  const prompts: string[] = [];

  if (
    args.leadData.ambiguousName
    || (missing.has("first_name") && missing.has("last_name"))
  ) {
    prompts.push(
      args.language === "de"
        ? "Bitte bestaetigen Sie Ihren vollstaendigen Namen (Vor- und Nachname)."
        : "Please confirm your full name (first and last name).",
    );
  } else if (missing.has("first_name")) {
    prompts.push(
      args.language === "de"
        ? "Bitte senden Sie nur Ihren Vornamen."
        : "Please share your first name.",
    );
  } else if (missing.has("last_name")) {
    prompts.push(
      args.language === "de"
        ? "Bitte senden Sie nur Ihren Nachnamen."
        : "Please share your last name.",
    );
  }

  if (missing.has("email")) {
    prompts.push(
      args.language === "de"
        ? "Bitte bestaetigen Sie Ihre E-Mail-Adresse."
        : "Please confirm your email address.",
    );
  }
  if (missing.has("phone")) {
    if (args.leadData.provisionalPhone) {
      prompts.push(
        args.language === "de"
          ? `Soll ich diese Nummer fuer die Zustellung verwenden: ${args.leadData.provisionalPhone}? (Ja/Nein)`
          : `Should I use this number for delivery: ${args.leadData.provisionalPhone}? (yes/no)`,
      );
    } else {
      prompts.push(
        args.language === "de"
          ? "Bitte bestaetigen Sie Ihre Telefonnummer."
          : "Please confirm your phone number.",
      );
    }
  }

  if (args.leadData.ambiguousFounderContact) {
    prompts.push(
      args.language === "de"
        ? "Ich habe widerspruechliche Founder-Kontakt-Signale erkannt. Bitte antworten Sie klar mit Ja oder Nein."
        : "I detected conflicting founder-contact signals. Please answer clearly with yes or no.",
    );
  } else if (missing.has("founder_contact_preference")) {
    prompts.push(
      args.language === "de"
        ? "Darf der Founder Sie direkt kontaktieren? (Ja/Nein)"
        : "May the founder contact you directly? (yes/no)",
    );
  }
  return prompts;
}

export function buildSamanthaMissingFieldRecoveryMessage(args: {
  leadData: SamanthaAuditResolvedLeadData;
  language: SamanthaAutoDispatchPromptLanguage;
  recoveryAttemptCount: number;
}): string {
  const attemptCount = Math.max(1, Math.floor(args.recoveryAttemptCount));
  const capturedLines = buildSamanthaResolvedLeadSummaryLines({
    leadData: args.leadData,
    language: args.language,
  });
  const promptLines = buildSamanthaMissingFieldRecoveryPrompts({
    leadData: args.leadData,
    language: args.language,
  });

  const lines: string[] = [];
  if (args.language === "de") {
    lines.push("Ich habe bisher folgende Angaben erfasst:");
    if (capturedLines.length > 0) {
      lines.push(...capturedLines);
    } else {
      lines.push("- Noch keine bestaetigten Kontaktdaten.");
    }
    if (promptLines.length > 0) {
      lines.push("");
      lines.push("Fuer den Versand der Audit-Ergebnisse per E-Mail brauche ich nur noch:");
      lines.push(...promptLines.map((prompt) => `- ${prompt}`));
    }
    lines.push("");
    if (attemptCount >= 3) {
      lines.push(
        'Falls es schneller ist: Antworten Sie in einer Zeile oder schreiben Sie "manuelles follow-up", dann leite ich es direkt an das Team weiter.',
      );
    } else {
      lines.push("Sie koennen frei, kurz oder stichpunktartig antworten.");
    }
  } else {
    lines.push("I captured these details so far:");
    if (capturedLines.length > 0) {
      lines.push(...capturedLines);
    } else {
      lines.push("- No confirmed contact details yet.");
    }
    if (promptLines.length > 0) {
      lines.push("");
      lines.push("To send your audit results email, I still need:");
      lines.push(...promptLines.map((prompt) => `- ${prompt}`));
    }
    lines.push("");
    if (attemptCount >= 3) {
      lines.push(
        'If it is easier, reply in one line or say "manual follow-up" and I will route this directly to the team.',
      );
    } else {
      lines.push("You can reply in freeform, shorthand, or bullets.");
    }
  }

  return lines.join("\n");
}

function enforcementPayloadTargetsSamanthaAuditDeliverable(
  payload: SamanthaActionCompletionEnforcementPayloadLike | null,
): boolean {
  if (!payload) {
    return false;
  }
  return (
    payload.outcome === AUDIT_DELIVERABLE_OUTCOME_KEY
    && payload.requiredTools.includes(AUDIT_DELIVERABLE_TOOL_NAME)
  );
}

export function shouldAttemptSamanthaClaimRecoveryAutoDispatch(args: {
  plan: SamanthaAuditAutoDispatchPlan | null;
  alreadyAttempted: boolean;
  enforcementPayload: SamanthaActionCompletionEnforcementPayloadLike | null;
}): boolean {
  return SAMANTHA_RUNTIME_MODULE_ADAPTER.shouldAttemptClaimRecoveryAutoDispatch({
    plan: args.plan,
    alreadyAttempted: args.alreadyAttempted,
    enforcementReasonCode: args.enforcementPayload?.reasonCode,
    enforcementTargetsAuditDeliverable:
      enforcementPayloadTargetsSamanthaAuditDeliverable(args.enforcementPayload),
  });
}

export function resolveSamanthaClaimRecoveryDecision(args: {
  plan: SamanthaAuditAutoDispatchPlan | null;
  alreadyAttempted: boolean;
  enforcementPayload: SamanthaActionCompletionEnforcementPayloadLike | null;
}): SamanthaClaimRecoveryDecision {
  return SAMANTHA_RUNTIME_MODULE_ADAPTER.resolveClaimRecoveryDecision({
    plan: args.plan,
    alreadyAttempted: args.alreadyAttempted,
    enforcementReasonCode: args.enforcementPayload?.reasonCode,
    enforcementTargetsAuditDeliverable:
      enforcementPayloadTargetsSamanthaAuditDeliverable(args.enforcementPayload),
  });
}

export function isLikelyAuditDeliverableInvocationRequest(
  inboundMessage: string,
): boolean {
  const normalized = normalizeExecutionString(inboundMessage)?.toLowerCase();
  if (!normalized) {
    return false;
  }
  if (normalized.includes(AUDIT_DELIVERABLE_TOOL_NAME)) {
    return true;
  }
  const mentionsDeliverableTarget =
    /\b(pdf|docx)\b/i.test(normalized)
    || /\b(implementierungsplan|workflow report|workflow brief|workflow summary|implementation plan|audit results|results email|report email|rapport|plan de mise en œuvre|plan de mise en oeuvre)\b/i.test(
      normalized,
    );
  if (!mentionsDeliverableTarget) {
    return false;
  }
  return /\b(generate|generer|g[eé]n[eé]rer|erstell(?:e|en|t|st)?|send|senden|envoyer|create|c[ré]er|export|bereitstell(?:e|en|t|st)?|download|telecharger|t[eé]l[eé]charger)\b/i.test(
    normalized,
  );
}

export function resolveSamanthaAuditAutoDispatchPlan(args: {
  authorityConfig: Record<string, unknown> | null | undefined;
  inboundMessage: string;
  availableToolNames: string[];
  toolResults: AgentToolResult[];
  requestedToolNames?: string[];
  recentUserMessages?: string[];
  capturedEmail?: string | null;
  capturedName?: string | null;
  contactMemory?: SessionContactMemoryRecord[];
  auditSessionWorkflowRecommendation?: string | null;
}): SamanthaAuditAutoDispatchPlan {
  const eligible = isSamanthaLeadCaptureRuntime(args.authorityConfig);
  const requestedToolNames = normalizeDeterministicExecutionToolNames(
    args.requestedToolNames ?? [],
  );
  const toolAvailable = args.availableToolNames.some(
    (toolName) => normalizeExecutionString(toolName) === AUDIT_DELIVERABLE_TOOL_NAME,
  );
  const preexistingDispatchToolResults = args.toolResults.filter(
    (result) => normalizeExecutionString(result.tool) === AUDIT_DELIVERABLE_TOOL_NAME,
  );
  const requestDetected =
    isLikelyAuditDeliverableInvocationRequest(args.inboundMessage)
    || requestedToolNames.includes(AUDIT_DELIVERABLE_TOOL_NAME)
    || preexistingDispatchToolResults.length > 0;
  const alreadyAttempted = preexistingDispatchToolResults.length > 0;
  const preexistingInvocationStatus = resolveSamanthaAutoDispatchInvocationStatus({
    attempted: alreadyAttempted,
    toolResults: preexistingDispatchToolResults,
  });
  const leadData = resolveSamanthaAuditLeadData({
    inboundMessage: args.inboundMessage,
    recentUserMessages: args.recentUserMessages ?? [],
    capturedEmail: args.capturedEmail,
    capturedName: args.capturedName,
    contactMemory: args.contactMemory,
    auditSessionWorkflowRecommendation: args.auditSessionWorkflowRecommendation,
  });
  const retryEligibleAfterFailure =
    alreadyAttempted
    && (preexistingInvocationStatus === "attempted_without_result"
      || preexistingInvocationStatus === "executed_error")
    && leadData.missingRequiredFields.length === 0
    && !leadData.ambiguousName
    && !leadData.ambiguousFounderContact;
  const shouldTreatAsAlreadyAttempted = alreadyAttempted && !retryEligibleAfterFailure;
  const canAutoDispatchWithLeadData =
    eligible
    && toolAvailable
    && !shouldTreatAsAlreadyAttempted
    && !leadData.ambiguousName
    && !leadData.ambiguousFounderContact
    && leadData.missingRequiredFields.length === 0;

  const toolArgs = canAutoDispatchWithLeadData
    && leadData.email
    && leadData.firstName
    && leadData.lastName
    && leadData.phone
    && typeof leadData.founderContactRequested === "boolean"
      ? {
          email: leadData.email,
          firstName: leadData.firstName,
          lastName: leadData.lastName,
          phone: leadData.phone,
          founderContactRequested: leadData.founderContactRequested,
          sales_call: leadData.founderContactRequested,
          clientName: `${leadData.firstName} ${leadData.lastName}`.trim(),
          workflowRecommendation: leadData.workflowRecommendation,
        }
      : undefined;
  const shouldDispatch = requestDetected && Boolean(toolArgs);
  const skipReasonCodes: SamanthaAutoDispatchSkipReasonCode[] = [];
  if (!eligible) {
    skipReasonCodes.push("not_samantha_runtime");
  }
  if (!requestDetected) {
    skipReasonCodes.push("request_not_detected");
  }
  if (!toolAvailable) {
    skipReasonCodes.push("tool_unavailable_in_scope");
  }
  if (shouldTreatAsAlreadyAttempted) {
    skipReasonCodes.push("tool_already_attempted");
  }
  if (leadData.ambiguousName) {
    skipReasonCodes.push("ambiguous_name");
  }
  if (leadData.ambiguousFounderContact) {
    skipReasonCodes.push("ambiguous_founder_contact");
  }
  if (leadData.missingRequiredFields.length > 0) {
    skipReasonCodes.push("missing_required_fields");
  }

  return {
    eligible,
    requestDetected,
    toolAvailable,
    alreadyAttempted,
    preexistingInvocationStatus,
    retryEligibleAfterFailure,
    ambiguousName: leadData.ambiguousName,
    ambiguousFounderContact: leadData.ambiguousFounderContact,
    missingRequiredFields: leadData.missingRequiredFields,
    skipReasonCodes,
    shouldDispatch,
    toolArgs,
  };
}

function resolveSamanthaAutoDispatchExecutionSucceeded(toolResults: AgentToolResult[]): boolean {
  return toolResults.some(
    (result) =>
      normalizeExecutionString(result.tool) === AUDIT_DELIVERABLE_TOOL_NAME
      && result.status === "success",
  );
}

export function resolveSamanthaAuditDispatchDecision(args: {
  plan: SamanthaAuditAutoDispatchPlan | null;
  autoDispatchToolResults: AgentToolResult[];
  allToolResults: AgentToolResult[];
  enforcementPayload: SamanthaDispatchEnforcementPayloadLike | null;
  invocationStatus: SamanthaAutoDispatchInvocationStatus;
}): SamanthaAuditDispatchDecision | undefined {
  return SAMANTHA_RUNTIME_MODULE_ADAPTER.resolveDispatchDecision({
    plan: args.plan,
    executionSucceeded: resolveSamanthaAutoDispatchExecutionSucceeded(
      args.autoDispatchToolResults,
    ),
    sessionContextFailure: resolveSamanthaAuditSessionContextFailure(args.allToolResults),
    enforcementReasonCode: args.enforcementPayload?.reasonCode,
    invocationStatus: args.invocationStatus,
  });
}

export function resolveSamanthaAutoDispatchInvocationStatus(args: {
  attempted: boolean;
  toolResults: AgentToolResult[];
}): SamanthaAutoDispatchInvocationStatus {
  return SAMANTHA_RUNTIME_MODULE_ADAPTER.resolveAutoDispatchInvocationStatus({
    attempted: args.attempted,
    toolResults: args.toolResults,
  });
}

export function resolveSamanthaDispatchTerminalReasonCode(args: {
  runtimeCapabilityGapBlocked: boolean;
  plan: SamanthaAuditAutoDispatchPlan | null;
  dispatchDecision?: SamanthaAuditDispatchDecision;
  invocationStatus: SamanthaAutoDispatchInvocationStatus;
  preflightLookupTargetOk: boolean;
  preflightAuditSessionFound?: boolean;
}): string {
  return SAMANTHA_RUNTIME_MODULE_ADAPTER.resolveDispatchTerminalReasonCode(args);
}
