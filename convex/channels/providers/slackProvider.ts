/**
 * SLACK CHANNEL PROVIDER
 *
 * Slack provider implementation for channel runtime parity.
 */

import type {
  ChannelProvider,
  ChannelProviderCapabilities,
  ProviderCredentials,
  NormalizedInboundMessage,
  OutboundMessage,
  SendResult,
} from "../types";

const SLACK_SIGNATURE_VERSION = "v0";
const SLACK_REPLAY_WINDOW_SECONDS = 60 * 5;
const SLACK_API_BASE = "https://slack.com/api";
const SLACK_TS_PATTERN = /^\d{10}\.\d+$/;
const SLACK_ISO_DATE_PATTERN = /\b\d{4}-\d{2}-\d{2}\b/g;
const SLACK_US_DATE_PATTERN = /\b(0?[1-9]|1[0-2])[/-](0?[1-9]|[12]\d|3[01])[/-](\d{4})\b/g;
const SLACK_THIS_WEEK_PATTERN = /\bthis\s+week\b/i;
const SLACK_NEXT_WEEK_PATTERN = /\bnext\s+week\b/i;
const SLACK_NEXT_MONTH_PATTERN = /\bnext\s+month\b/i;
const SLACK_UTC_OFFSET_PATTERN =
  /\b(?:tz|timezone)\s*[:=]\s*(utc(?:[+-](?:[01]?\d|2[0-3])(?::?[0-5]\d)?)?)\b|\b(utc(?:[+-](?:[01]?\d|2[0-3])(?::?[0-5]\d)?)?)\b/i;
const SLACK_VACATION_INTENT_PATTERN =
  /\b(vacation|pto|time[\s_-]*off|out[\s_-]*of[\s_-]*office|ooo|away)\b/i;
const SLACK_VACATION_PARSER_VERSION = 3;

export type SlackVacationRequestSource = "mention" | "message" | "slash_command";
export type SlackVacationRequestStatus = "parsed" | "blocked";

export interface SlackVacationRequestParseResult {
  intent: "vacation_request";
  parserVersion: number;
  source: SlackVacationRequestSource;
  status: SlackVacationRequestStatus;
  rawText: string;
  requestedStartDate?: string;
  requestedEndDate?: string;
  blockedReasons: string[];
  commandName?: string;
}

const capabilities: ChannelProviderCapabilities = {
  supportedChannels: ["slack"],
  supportsInbound: true,
  supportsOutbound: true,
  supportsWebhooks: true,
  supportsAttachments: true,
  supportsTemplates: false,
  supportsConversationThreading: true,
};

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value
    : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function buildSignatureBaseString(body: string, timestamp: number): string {
  return `${SLACK_SIGNATURE_VERSION}:${timestamp}:${body}`;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

async function computeSlackSignature(
  signingSecret: string,
  body: string,
  timestamp: number
): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(signingSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(buildSignatureBaseString(body, timestamp))
  );
  return `${SLACK_SIGNATURE_VERSION}=${toHex(new Uint8Array(signatureBuffer))}`;
}

export function buildSlackConversationIdentifier(
  channelId: string,
  threadTs: string
): string {
  return `slack:${channelId}:${threadTs}`;
}

export function buildSlackTopLevelConversationIdentifier(
  channelId: string,
  senderId?: string
): string {
  const normalizedChannelId = channelId.trim();
  const normalizedSenderId = senderId?.trim();
  if (!normalizedSenderId) {
    return `slack:${normalizedChannelId}`;
  }
  return `slack:${normalizedChannelId}:user:${normalizedSenderId}`;
}

export function parseSlackConversationIdentifier(recipientIdentifier: string): {
  channelId: string;
  defaultThreadTs?: string;
} | null {
  const normalized = recipientIdentifier.trim();
  if (!normalized) return null;

  if (normalized.startsWith("slack:")) {
    const segments = normalized.split(":");
    const channelId = segments[1];
    if (channelId) {
      const threadCandidate = segments[2];
      const defaultThreadTs =
        threadCandidate && SLACK_TS_PATTERN.test(threadCandidate)
          ? threadCandidate
          : undefined;
      return {
        channelId,
        defaultThreadTs,
      };
    }
  }

  // Fallback for direct channel IDs (e.g. C123ABC, D456XYZ).
  if (/^[CDG][A-Z0-9]+$/i.test(normalized)) {
    return { channelId: normalized };
  }

  return null;
}

export async function verifySlackRequestSignature(args: {
  body: string;
  signatureHeader?: string | null;
  timestampHeader?: string | null;
  signingSecret?: string;
  signingSecrets?: string[];
  nowMs?: number;
  replayWindowSeconds?: number;
}): Promise<{
  valid: boolean;
  reason?: string;
  timestampSeconds?: number;
}> {
  const signingSecrets = Array.from(
    new Set(
      [
        args.signingSecret,
        ...(args.signingSecrets || []),
      ]
        .map((secret) => secret?.trim())
        .filter((secret): secret is string => Boolean(secret))
    )
  );
  if (signingSecrets.length === 0) {
    return { valid: false, reason: "missing_signing_secret" };
  }

  const signature = asString(args.signatureHeader);
  const timestampRaw = asString(args.timestampHeader);
  if (!signature || !timestampRaw) {
    return { valid: false, reason: "missing_signature_headers" };
  }

  const timestampSeconds = Number.parseInt(timestampRaw, 10);
  if (!Number.isFinite(timestampSeconds)) {
    return { valid: false, reason: "invalid_signature_timestamp" };
  }

  const nowSeconds = Math.floor((args.nowMs ?? Date.now()) / 1000);
  const replayWindow = args.replayWindowSeconds ?? SLACK_REPLAY_WINDOW_SECONDS;
  if (Math.abs(nowSeconds - timestampSeconds) > replayWindow) {
    return {
      valid: false,
      reason: "stale_signature_timestamp",
      timestampSeconds,
    };
  }

  for (const signingSecret of signingSecrets) {
    const expectedSignature = await computeSlackSignature(
      signingSecret,
      args.body,
      timestampSeconds
    );
    if (timingSafeEqual(expectedSignature, signature)) {
      return { valid: true, timestampSeconds };
    }
  }

  return {
    valid: false,
    reason: "signature_mismatch",
    timestampSeconds,
  };
}

function normalizeSlackMessageText(
  text: string | undefined,
  eventType: string | undefined
): string | undefined {
  const base = text?.trim();
  if (!base) return undefined;

  if (eventType === "app_mention") {
    const mentionStripped = base.replace(/<@[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    return mentionStripped || base;
  }

  return base;
}

export function normalizeSlackCommandName(command: string): string {
  const trimmed = command.trim();
  if (!trimmed) return "command";
  return trimmed.startsWith("/") ? trimmed.slice(1) : trimmed;
}

export function buildSlackSlashCommandMessage(command: string, text?: string): string {
  const normalizedText = text?.trim();
  if (normalizedText && normalizedText.length > 0) {
    return normalizedText;
  }
  return normalizeSlackCommandName(command);
}

function normalizeIsoCalendarDate(value: string): string | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return undefined;
  }

  const year = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const day = Number.parseInt(match[3], 10);
  const utc = new Date(Date.UTC(year, month - 1, day));
  const valid =
    utc.getUTCFullYear() === year &&
    utc.getUTCMonth() === month - 1 &&
    utc.getUTCDate() === day;
  if (!valid) {
    return undefined;
  }

  return `${year.toString().padStart(4, "0")}-${month
    .toString()
    .padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
}

function normalizeUsCalendarDate(value: string): string | undefined {
  const match = /^(0?[1-9]|1[0-2])[/-](0?[1-9]|[12]\d|3[01])[/-](\d{4})$/.exec(value);
  if (!match) {
    return undefined;
  }

  const month = Number.parseInt(match[1], 10);
  const day = Number.parseInt(match[2], 10);
  const year = Number.parseInt(match[3], 10);
  const utc = new Date(Date.UTC(year, month - 1, day));
  const valid =
    utc.getUTCFullYear() === year &&
    utc.getUTCMonth() === month - 1 &&
    utc.getUTCDate() === day;
  if (!valid) {
    return undefined;
  }

  return `${year.toString().padStart(4, "0")}-${month
    .toString()
    .padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
}

function extractDeterministicDatesFromText(text: string): string[] {
  const datedMatches: Array<{ index: number; date: string }> = [];

  for (const match of text.matchAll(SLACK_ISO_DATE_PATTERN)) {
    const candidate = match[0];
    const normalized = normalizeIsoCalendarDate(candidate);
    if (!normalized) continue;
    datedMatches.push({ index: match.index ?? 0, date: normalized });
  }

  for (const match of text.matchAll(SLACK_US_DATE_PATTERN)) {
    const candidate = match[0];
    const normalized = normalizeUsCalendarDate(candidate);
    if (!normalized) continue;
    datedMatches.push({ index: match.index ?? 0, date: normalized });
  }

  datedMatches.sort((a, b) => a.index - b.index);
  return datedMatches.map((entry) => entry.date);
}

function parseUtcOffsetMinutes(token: string): number | undefined {
  const normalized = token.trim().toUpperCase();
  const match = /^UTC(?:([+-])(\d{1,2})(?::?(\d{2}))?)?$/.exec(normalized);
  if (!match) {
    return undefined;
  }
  if (!match[1]) {
    return 0;
  }

  const sign = match[1] === "-" ? -1 : 1;
  const hours = Number.parseInt(match[2], 10);
  const minutes = match[3] ? Number.parseInt(match[3], 10) : 0;
  if (hours > 23 || minutes > 59) {
    return undefined;
  }
  return sign * (hours * 60 + minutes);
}

function resolveUtcOffsetMinutesFromText(text: string): number | undefined {
  const match = SLACK_UTC_OFFSET_PATTERN.exec(text);
  if (!match) {
    return undefined;
  }
  const token = match[1] || match[2];
  if (!token) {
    return undefined;
  }
  return parseUtcOffsetMinutes(token);
}

function toIsoDateAtUtcOffset(epochMs: number, offsetMinutes: number): string {
  const shifted = new Date(epochMs + offsetMinutes * 60_000);
  return `${shifted.getUTCFullYear().toString().padStart(4, "0")}-${(shifted.getUTCMonth() + 1)
    .toString()
    .padStart(2, "0")}-${shifted.getUTCDate().toString().padStart(2, "0")}`;
}

function resolveNextWeekDateRange(args: {
  referenceEpochMs: number;
  utcOffsetMinutes: number;
}): { startDate: string; endDate: string } {
  const shifted = new Date(args.referenceEpochMs + args.utcOffsetMinutes * 60_000);
  const currentLocalMidnightUtcMs = Date.UTC(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth(),
    shifted.getUTCDate()
  );
  const dayOfWeek = shifted.getUTCDay();
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  const currentWeekMondayUtcMs =
    currentLocalMidnightUtcMs - daysSinceMonday * 24 * 60 * 60 * 1000;
  const nextWeekMondayUtcMs = currentWeekMondayUtcMs + 7 * 24 * 60 * 60 * 1000;
  const nextWeekSundayUtcMs = nextWeekMondayUtcMs + 6 * 24 * 60 * 60 * 1000;

  return {
    startDate: toIsoDateAtUtcOffset(nextWeekMondayUtcMs, 0),
    endDate: toIsoDateAtUtcOffset(nextWeekSundayUtcMs, 0),
  };
}

function resolveThisWeekDateRange(args: {
  referenceEpochMs: number;
  utcOffsetMinutes: number;
}): { startDate: string; endDate: string } {
  const shifted = new Date(args.referenceEpochMs + args.utcOffsetMinutes * 60_000);
  const currentLocalMidnightUtcMs = Date.UTC(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth(),
    shifted.getUTCDate()
  );
  const dayOfWeek = shifted.getUTCDay();
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  const currentWeekMondayUtcMs =
    currentLocalMidnightUtcMs - daysSinceMonday * 24 * 60 * 60 * 1000;
  const currentWeekSundayUtcMs = currentWeekMondayUtcMs + 6 * 24 * 60 * 60 * 1000;

  return {
    startDate: toIsoDateAtUtcOffset(currentWeekMondayUtcMs, 0),
    endDate: toIsoDateAtUtcOffset(currentWeekSundayUtcMs, 0),
  };
}

function resolveNextMonthDateRange(args: {
  referenceEpochMs: number;
  utcOffsetMinutes: number;
}): { startDate: string; endDate: string } {
  const shifted = new Date(args.referenceEpochMs + args.utcOffsetMinutes * 60_000);
  const year = shifted.getUTCFullYear();
  const month = shifted.getUTCMonth();
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextMonthYear = month === 11 ? year + 1 : year;

  const nextMonthStartUtcMs = Date.UTC(nextMonthYear, nextMonth, 1);
  const nextMonthEndUtcMs = Date.UTC(nextMonthYear, nextMonth + 1, 0);

  return {
    startDate: toIsoDateAtUtcOffset(nextMonthStartUtcMs, 0),
    endDate: toIsoDateAtUtcOffset(nextMonthEndUtcMs, 0),
  };
}

function hasVacationIntent(args: {
  text: string;
  source: SlackVacationRequestSource;
  commandName?: string;
}): boolean {
  if (args.source === "slash_command") {
    const normalizedCommand = args.commandName
      ? normalizeSlackCommandName(args.commandName)
      : "";
    const compactCommand = normalizedCommand
      .toLowerCase()
      .replace(/[\s_-]+/g, "");
    if (
      compactCommand.includes("vacation") ||
      compactCommand === "pto" ||
      compactCommand.includes("timeoff")
    ) {
      return true;
    }
  }

  return SLACK_VACATION_INTENT_PATTERN.test(args.text);
}

export function parseSlackVacationRequestIntent(args: {
  text?: string;
  source: SlackVacationRequestSource;
  commandName?: string;
  referenceEpochMs?: number;
}): SlackVacationRequestParseResult | null {
  const rawText = asString(args.text);
  if (!rawText) {
    return null;
  }
  if (
    !hasVacationIntent({
      text: rawText,
      source: args.source,
      commandName: args.commandName,
    })
  ) {
    return null;
  }

  const blockedReasons: string[] = [];
  const parsedDates = extractDeterministicDatesFromText(rawText);
  let requestedStartDate: string | undefined;
  let requestedEndDate: string | undefined;

  if (parsedDates.length === 0) {
    const relativeRangeType = SLACK_THIS_WEEK_PATTERN.test(rawText)
      ? "this_week"
      : SLACK_NEXT_WEEK_PATTERN.test(rawText)
        ? "next_week"
        : SLACK_NEXT_MONTH_PATTERN.test(rawText)
          ? "next_month"
          : null;
    if (relativeRangeType) {
      const utcOffsetMinutes = resolveUtcOffsetMinutesFromText(rawText);
      if (utcOffsetMinutes === undefined) {
        blockedReasons.push("missing_relative_timezone");
      }
      if (args.referenceEpochMs === undefined) {
        blockedReasons.push("missing_relative_anchor_time");
      }
      if (
        utcOffsetMinutes !== undefined &&
        args.referenceEpochMs !== undefined
      ) {
        const relativeRange =
          relativeRangeType === "this_week"
            ? resolveThisWeekDateRange({
                referenceEpochMs: args.referenceEpochMs,
                utcOffsetMinutes,
              })
            : relativeRangeType === "next_week"
              ? resolveNextWeekDateRange({
                  referenceEpochMs: args.referenceEpochMs,
                  utcOffsetMinutes,
                })
              : resolveNextMonthDateRange({
                  referenceEpochMs: args.referenceEpochMs,
                  utcOffsetMinutes,
                });
        requestedStartDate = relativeRange.startDate;
        requestedEndDate = relativeRange.endDate;
      }
      if (!requestedStartDate || !requestedEndDate) {
        blockedReasons.push("missing_iso_date");
      }
    } else {
      blockedReasons.push("missing_iso_date");
    }
  } else if (parsedDates.length > 2) {
    blockedReasons.push("ambiguous_date_range");
  } else {
    requestedStartDate = parsedDates[0];
    requestedEndDate = parsedDates.length === 2 ? parsedDates[1] : parsedDates[0];
    if (requestedEndDate < requestedStartDate) {
      blockedReasons.push("date_range_out_of_order");
    }
  }

  return {
    intent: "vacation_request",
    parserVersion: SLACK_VACATION_PARSER_VERSION,
    source: args.source,
    status: blockedReasons.length > 0 ? "blocked" : "parsed",
    rawText,
    requestedStartDate,
    requestedEndDate,
    blockedReasons,
    commandName:
      args.source === "slash_command" && args.commandName
        ? normalizeSlackCommandName(args.commandName)
        : undefined,
  };
}

function buildSlackVacationRequestMetadata(
  vacationRequest: SlackVacationRequestParseResult | null
): Record<string, unknown> {
  if (!vacationRequest) {
    return { slackVacationRequestDetected: false };
  }

  return {
    slackVacationRequestDetected: true,
    slackVacationRequestStatus: vacationRequest.status,
    slackVacationRequestStartDate: vacationRequest.requestedStartDate,
    slackVacationRequestEndDate: vacationRequest.requestedEndDate,
    slackVacationRequestBlockedReasons: vacationRequest.blockedReasons,
    slackVacationRequest: vacationRequest,
  };
}

function normalizeSlackInteractionMode(
  value: unknown
): "mentions_only" | "mentions_and_dm" {
  return value === "mentions_and_dm" ? "mentions_and_dm" : "mentions_only";
}

function extractSlackAssistantThreadMetadata(
  event: Record<string, unknown>
): {
  assistantThreadTs?: string;
  assistantThreadTitle?: string;
  assistantContextChannelId?: string;
  assistantContextTeamId?: string;
  assistantContextEnterpriseId?: string;
  hasActionToken: boolean;
} {
  const assistantThread = event.assistant_thread as Record<string, unknown> | undefined;
  if (!assistantThread || typeof assistantThread !== "object") {
    return { hasActionToken: false };
  }

  const context = assistantThread.context as Record<string, unknown> | undefined;
  const rawThreadTs = asString(assistantThread.thread_ts);

  return {
    assistantThreadTs:
      rawThreadTs && SLACK_TS_PATTERN.test(rawThreadTs) ? rawThreadTs : undefined,
    assistantThreadTitle: asString(assistantThread.title),
    assistantContextChannelId: asString(context?.channel_id),
    assistantContextTeamId: asString(context?.team_id),
    assistantContextEnterpriseId: asString(context?.enterprise_id),
    hasActionToken: Boolean(asString(assistantThread.action_token)),
  };
}

function sanitizeSlackRawPayload(
  rawPayload: Record<string, unknown>
): Record<string, unknown> {
  const event = rawPayload.event as Record<string, unknown> | undefined;
  if (!event || typeof event !== "object") {
    return rawPayload;
  }

  const assistantThread = event.assistant_thread as Record<string, unknown> | undefined;
  if (!assistantThread || typeof assistantThread !== "object") {
    return rawPayload;
  }

  if (!asString(assistantThread.action_token)) {
    return rawPayload;
  }

  return {
    ...rawPayload,
    event: {
      ...event,
      assistant_thread: {
        ...assistantThread,
        action_token: "[REDACTED]",
      },
    },
  };
}

function isSlackDirectMessageChannel(
  event: Record<string, unknown>,
  channelId: string
): boolean {
  const channelType = asString(event.channel_type);
  if (channelType === "im") {
    return true;
  }
  return channelId.toUpperCase().startsWith("D");
}

function parseSlackInboundPayload(
  rawPayload: Record<string, unknown>,
  credentials: ProviderCredentials
): NormalizedInboundMessage | null {
  if (rawPayload.type === "slash_command") {
    return parseSlackSlashCommandInboundPayload(rawPayload, credentials);
  }
  if (rawPayload.type !== "event_callback") return null;

  const event = rawPayload.event as Record<string, unknown> | undefined;
  if (!event) return null;

  const eventType = asString(event.type);
  if (eventType !== "app_mention" && eventType !== "message") {
    return null;
  }
  const interactionMode = normalizeSlackInteractionMode(
    credentials.slackInteractionMode
  );
  if (eventType === "message" && interactionMode !== "mentions_and_dm") {
    return null;
  }

  const subtype = asString(event.subtype);
  if (subtype && subtype !== "thread_broadcast") {
    return null;
  }

  // Ignore bot-originated events to prevent feedback loops.
  if (asString(event.bot_id)) {
    return null;
  }

  const channelId = asString(event.channel);
  const eventTs = asString(event.ts);
  const explicitThreadTs = asString(event.thread_ts);
  const assistantThread = extractSlackAssistantThreadMetadata(event);
  const threadTs =
    explicitThreadTs && SLACK_TS_PATTERN.test(explicitThreadTs)
      ? explicitThreadTs
      : assistantThread.assistantThreadTs;
  const isDmMessage =
    eventType === "message" && channelId
      ? isSlackDirectMessageChannel(event, channelId)
      : undefined;
  const senderId = asString(event.user);
  const text = normalizeSlackMessageText(asString(event.text), eventType);
  const vacationRequest = parseSlackVacationRequestIntent({
    text,
    source: eventType === "app_mention" ? "mention" : "message",
    referenceEpochMs: Number.parseFloat(eventTs) * 1000,
  });

  if (!channelId || !eventTs || !senderId || !text) {
    return null;
  }
  if (eventType === "message" && !isDmMessage) {
    return null;
  }

  if (credentials.slackBotUserId && senderId === credentials.slackBotUserId) {
    return null;
  }

  const externalContactIdentifier = threadTs
    ? buildSlackConversationIdentifier(channelId, threadTs)
    : buildSlackTopLevelConversationIdentifier(channelId, senderId);
  const sanitizedRawPayload = sanitizeSlackRawPayload(rawPayload);
  const hasAssistantThreadEnvelope = Boolean(
    assistantThread.assistantThreadTs ||
      assistantThread.assistantThreadTitle ||
      assistantThread.assistantContextChannelId ||
      assistantThread.assistantContextTeamId ||
      assistantThread.assistantContextEnterpriseId ||
      assistantThread.hasActionToken
  );

  return {
    organizationId: "",
    channel: "slack",
    externalContactIdentifier,
    message: text,
    messageType: "text",
    metadata: {
      providerId: "slack",
      providerMessageId: asString(event.client_msg_id) || eventTs,
      providerEventId: asString(rawPayload.event_id),
      providerConversationId: threadTs,
      senderName: senderId,
      slackResponseMode: threadTs ? "thread" : "top_level",
      slackInvocationType: eventType === "app_mention" ? "mention" : "message",
      slackChannelId: channelId,
      slackChannelType: asString(event.channel_type),
      slackInteractionMode: interactionMode,
      slackUserId: senderId,
      slackAiAppMessage: hasAssistantThreadEnvelope,
      slackAssistantThreadTs: assistantThread.assistantThreadTs,
      slackAssistantThreadTitle: assistantThread.assistantThreadTitle,
      slackAssistantContextChannelId: assistantThread.assistantContextChannelId,
      slackAssistantContextTeamId: assistantThread.assistantContextTeamId,
      slackAssistantContextEnterpriseId:
        assistantThread.assistantContextEnterpriseId,
      slackAssistantHasActionToken: assistantThread.hasActionToken,
      ...buildSlackVacationRequestMetadata(vacationRequest),
      raw: sanitizedRawPayload,
    },
  };
}

function parseSlackSlashCommandInboundPayload(
  rawPayload: Record<string, unknown>,
  credentials: ProviderCredentials
): NormalizedInboundMessage | null {
  const teamId = asString(rawPayload.team_id);
  const channelId = asString(rawPayload.channel_id);
  const userId = asString(rawPayload.user_id);
  const command = asString(rawPayload.command);
  if (!teamId || !channelId || !userId || !command) {
    return null;
  }

  const commandText = asString(rawPayload.text);
  const message = buildSlackSlashCommandMessage(command, commandText);
  const providerEventId =
    asString(rawPayload.trigger_id) || asString(rawPayload.event_id);
  const vacationRequest = parseSlackVacationRequestIntent({
    text: commandText || message,
    source: "slash_command",
    commandName: command,
    referenceEpochMs: asNumber(rawPayload.received_at_ms),
  });

  return {
    organizationId: "",
    channel: "slack",
    externalContactIdentifier: buildSlackTopLevelConversationIdentifier(
      channelId,
      userId
    ),
    message,
    messageType: "text",
    metadata: {
      providerId: "slack",
      providerMessageId:
        providerEventId || `slash:${teamId}:${channelId}:${userId}`,
      providerEventId,
      senderName: asString(rawPayload.user_name) || userId,
      slackResponseMode: "top_level",
      slackInvocationType: "slash_command",
      slackCommand: normalizeSlackCommandName(command),
      slackCommandText: commandText || "",
      slackUserId: userId,
      slackChannelId: channelId,
      slackTeamId: teamId,
      slackInteractionMode: normalizeSlackInteractionMode(
        credentials.slackInteractionMode
      ),
      ...buildSlackVacationRequestMetadata(vacationRequest),
      raw: rawPayload,
    },
  };
}

export const slackProvider: ChannelProvider = {
  id: "slack",
  name: "Slack",
  capabilities,

  normalizeInbound(
    rawPayload: Record<string, unknown>,
    credentials: ProviderCredentials
  ): NormalizedInboundMessage | null {
    return parseSlackInboundPayload(rawPayload, credentials);
  },

  async sendMessage(
    credentials: ProviderCredentials,
    message: OutboundMessage
  ): Promise<SendResult> {
    const token = credentials.slackBotToken;
    if (!token) {
      return {
        success: false,
        error: "Slack bot token not configured",
        retryable: false,
      };
    }

    const destination = parseSlackConversationIdentifier(
      message.recipientIdentifier
    );
    if (!destination) {
      return {
        success: false,
        error: "Invalid Slack recipient identifier",
        retryable: false,
      };
    }

    const threadTs =
      message.metadata?.providerConversationId || destination.defaultThreadTs;
    const payload: Record<string, unknown> = {
      channel: destination.channelId,
      text: message.content,
    };
    if (threadTs) {
      payload.thread_ts = threadTs;
    }

    try {
      const response = await fetch(`${SLACK_API_BASE}/chat.postMessage`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify(payload),
      });

      const responseJson = (await response
        .json()
        .catch(() => ({}))) as Record<string, unknown>;
      const retryAfterRaw = response.headers.get("retry-after");
      const retryAfterSeconds = retryAfterRaw
        ? Number.parseInt(retryAfterRaw, 10)
        : Number.NaN;
      const retryAfterMs = Number.isFinite(retryAfterSeconds)
        ? retryAfterSeconds * 1000
        : undefined;

      const slackOk = responseJson.ok === true;
      const slackError = asString(responseJson.error);
      const normalizedStatus =
        response.status === 200 && slackError === "ratelimited"
          ? 429
          : response.status;

      if (!response.ok || !slackOk) {
        const retryableErrorCodes = new Set([
          "ratelimited",
          "internal_error",
          "fatal_error",
          "request_timeout",
          "service_unavailable",
        ]);
        return {
          success: false,
          error: slackError || `Slack API ${normalizedStatus}`,
          retryable:
            normalizedStatus === 429 ||
            normalizedStatus >= 500 ||
            (slackError ? retryableErrorCodes.has(slackError) : false),
          statusCode: normalizedStatus,
          retryAfterMs,
        };
      }

      return {
        success: true,
        providerMessageId:
          asString(responseJson.ts) || asString(responseJson.message_ts),
      };
    } catch (error) {
      return {
        success: false,
        error: String(error),
        retryable: true,
      };
    }
  },

  verifyWebhook(
    _body: string,
    headers: Record<string, string>,
    credentials: ProviderCredentials
  ): boolean {
    // Full signature validation is done at the HTTP boundary with raw body.
    // Keep lightweight guardrails here so provider contract remains coherent.
    if (!credentials.slackSigningSecret) return false;
    return Boolean(
      asString(headers["x-slack-signature"]) &&
      asString(headers["x-slack-request-timestamp"])
    );
  },

  async testConnection(
    credentials: ProviderCredentials
  ): Promise<{ success: boolean; accountName?: string; error?: string }> {
    const token = credentials.slackBotToken;
    if (!token) {
      return { success: false, error: "Missing Slack bot token" };
    }

    try {
      const response = await fetch(`${SLACK_API_BASE}/auth.test`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = (await response
        .json()
        .catch(() => ({}))) as Record<string, unknown>;
      if (!response.ok || data.ok !== true) {
        return {
          success: false,
          error: asString(data.error) || `Slack API ${response.status}`,
        };
      }

      const team = asString(data.team);
      return {
        success: true,
        accountName: team || credentials.slackTeamId,
      };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  },
};
