import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { v } from "convex/values";
import { requireAuthenticatedUser } from "../rbacHelpers";
import { OpenRouterClient } from "./openrouter";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const generatedApi: any = require("../_generated/api");

export const WEEKEND_MODE_CONTRACT_VERSION = "yai_weekend_mode_v1" as const;
export const WEEKEND_PIPELINE_CONTRACT_VERSION =
  "yai_weekend_pipeline_v1" as const;
export const WEEKEND_REPORT_CONTRACT_VERSION =
  "yai_weekend_report_v1" as const;
export const WEEKEND_TASK_EXTRACTION_CONTRACT_VERSION =
  "yai_weekend_task_extraction_v1" as const;
export const AGENT_TOOL_SETUP_CONTRACT_VERSION =
  "yai_agent_tool_setup_v1" as const;

const DEFAULT_WEEKEND_TIMEZONE = "UTC";
const DEFAULT_FRIDAY_START = "18:00";
const DEFAULT_MONDAY_END = "08:00";
const DEFAULT_REPORT_LOOKBACK_HOURS = 72;
const DEFAULT_TOOL_SETUP_ALLOWED_HOURS_START = "09:00";
const DEFAULT_TOOL_SETUP_ALLOWED_HOURS_END = "17:00";
const PERSONAL_OPERATOR_TEMPLATE_ROLE = "personal_life_operator_template";
const PERSONAL_OPERATOR_TEMPLATE_LAYER = "personal_operator";
const PERSONAL_OPERATOR_TEMPLATE_PLAYBOOK = "personal_operator";

type WeekendReportChannel = "in_app" | "email" | "telegram";
type WeekendSuggestedStageKey =
  | "new_call"
  | "needs_follow_up"
  | "appointment_set"
  | "resolved"
  | "escalated";
type WeekendUrgency = "low" | "normal" | "high";
type AgentClass = "internal_operator" | "external_customer_facing";
type ToolSetupPreferredChannel = "sms" | "email" | "telegram" | "phone_call";
type ToolSetupFallbackChannel = "none" | "sms" | "email" | "telegram";
type ToolSetupDeploymentChoice = "webchat" | "telegram" | "both";
type ToolSetupOperatingMode = "work" | "private";

interface WeekendModeConfig {
  enabled: boolean;
  timezone: string;
  fridayStart: string;
  mondayEnd: string;
  active: boolean;
  reportChannel: WeekendReportChannel;
  reportLookbackHours: number;
  autoCreateContacts: boolean;
  autoCreatePipelineCards: boolean;
  autoExtractTasks: boolean;
  weekendSoulMode: string;
  reportDeliveryEmail?: string;
  reportDeliveryTelegramChatId?: string;
  previousSoulMode?: string;
  lastStateChangeAt?: number;
  lastReportWeekKey?: string;
  lastReportGeneratedAt?: number;
}

interface AgentToolSetupConfig {
  agentClass: AgentClass;
  preferredChannel: ToolSetupPreferredChannel;
  fallbackChannel: ToolSetupFallbackChannel;
  allowedHoursStart: string;
  allowedHoursEnd: string;
  deploymentChoice: ToolSetupDeploymentChoice;
  operatingMode: ToolSetupOperatingMode;
  weekendModeEnabled: boolean;
  updatedAt?: number;
}

interface WeekendRuntimeClock {
  weekday: "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
  weekdayLabel: string;
  minutesOfDay: number;
  localDateKey: string;
}

export interface WeekendModeRuntimeContract {
  contractVersion: typeof WEEKEND_MODE_CONTRACT_VERSION;
  enabled: boolean;
  active: boolean;
  reason:
    | "disabled"
    | "outside_weekend_window"
    | "inside_weekend_window"
    | "invalid_timezone_fallback";
  timezone: string;
  fridayStart: string;
  mondayEnd: string;
  reportChannel: WeekendReportChannel;
  autoCreateContacts: boolean;
  autoCreatePipelineCards: boolean;
  autoExtractTasks: boolean;
  reportLookbackHours: number;
  weekendSoulMode: string;
  clock: WeekendRuntimeClock;
}

interface WeekendTaskExtractionItem {
  title: string;
  details?: string;
  dueHint?: string;
  priority: WeekendUrgency;
}

interface WeekendTaskExtractionResult {
  contractVersion: typeof WEEKEND_TASK_EXTRACTION_CONTRACT_VERSION;
  category: string;
  urgency: WeekendUrgency;
  suggestedStage: WeekendSuggestedStageKey;
  confidence: number;
  customerIntent: string;
  notes: string;
  actionItems: WeekendTaskExtractionItem[];
}

const WEEKEND_STAGE_DEFINITIONS: Array<{
  key: WeekendSuggestedStageKey;
  name: string;
  description: string;
  order: number;
  color: string;
  subtype: "active" | "won" | "lost";
  probability: number;
}> = [
  {
    key: "new_call",
    name: "New Call",
    description: "Fresh weekend inbound call awaiting triage.",
    order: 1,
    color: "#94A3B8",
    subtype: "active",
    probability: 10,
  },
  {
    key: "needs_follow_up",
    name: "Needs Follow-up",
    description: "Caller requested a follow-up and expects next-step outreach.",
    order: 2,
    color: "#F59E0B",
    subtype: "active",
    probability: 35,
  },
  {
    key: "appointment_set",
    name: "Appointment Set",
    description: "Caller already has a concrete appointment or confirmed slot.",
    order: 3,
    color: "#3B82F6",
    subtype: "active",
    probability: 60,
  },
  {
    key: "resolved",
    name: "Resolved",
    description: "Issue appears complete with no further action required.",
    order: 4,
    color: "#10B981",
    subtype: "won",
    probability: 90,
  },
  {
    key: "escalated",
    name: "Escalated",
    description: "Urgent handoff required to owner or specialist.",
    order: 5,
    color: "#EF4444",
    subtype: "lost",
    probability: 20,
  },
];

const WEEKDAY_SHORT_TO_KEY: Record<string, WeekendRuntimeClock["weekday"]> = {
  mon: "mon",
  tue: "tue",
  wed: "wed",
  thu: "thu",
  fri: "fri",
  sat: "sat",
  sun: "sun",
};

const hourMinuteValidator = /^([01]\d|2[0-3]):([0-5]\d)$/;

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeHourMinute(value: unknown, fallback: string): string {
  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    return fallback;
  }
  return hourMinuteValidator.test(normalized) ? normalized : fallback;
}

function hourMinuteToMinutes(value: string): number {
  const [hourToken, minuteToken] = value.split(":");
  const hour = Number(hourToken);
  const minute = Number(minuteToken);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return 0;
  }
  return Math.max(0, Math.min(23, hour)) * 60 + Math.max(0, Math.min(59, minute));
}

function normalizeWeekdayKey(value: unknown): WeekendRuntimeClock["weekday"] {
  const normalized = normalizeOptionalString(value)?.toLowerCase() ?? "mon";
  return WEEKDAY_SHORT_TO_KEY[normalized.slice(0, 3)] ?? "mon";
}

function normalizeReportChannel(value: unknown): WeekendReportChannel {
  const normalized = normalizeOptionalString(value)?.toLowerCase();
  if (normalized === "email" || normalized === "telegram" || normalized === "in_app") {
    return normalized;
  }
  return "in_app";
}

function normalizeUrgency(value: unknown): WeekendUrgency {
  const normalized = normalizeOptionalString(value)?.toLowerCase();
  if (normalized === "low" || normalized === "normal" || normalized === "high") {
    return normalized;
  }
  return "normal";
}

function normalizeSuggestedStage(value: unknown): WeekendSuggestedStageKey {
  const normalized = normalizeOptionalString(value)?.toLowerCase() ?? "";
  if (normalized.includes("appointment")) return "appointment_set";
  if (normalized.includes("follow")) return "needs_follow_up";
  if (normalized.includes("resolve")) return "resolved";
  if (normalized.includes("escalat")) return "escalated";
  if (normalized.includes("new")) return "new_call";
  switch (normalized) {
    case "new_call":
    case "needs_follow_up":
    case "appointment_set":
    case "resolved":
    case "escalated":
      return normalized;
    default:
      return "needs_follow_up";
  }
}

function normalizeAgentClass(
  value: unknown,
  fallback: AgentClass = "internal_operator"
): AgentClass {
  const normalized = normalizeOptionalString(value)?.toLowerCase();
  if (normalized === "external_customer_facing" || normalized === "customer_facing") {
    return "external_customer_facing";
  }
  if (normalized === "internal_operator" || normalized === "internal_team") {
    return "internal_operator";
  }
  return fallback;
}

function normalizeToolSetupPreferredChannel(
  value: unknown
): ToolSetupPreferredChannel {
  const normalized = normalizeOptionalString(value)?.toLowerCase();
  if (normalized === "email" || normalized === "telegram" || normalized === "phone_call") {
    return normalized;
  }
  return "sms";
}

function normalizeToolSetupFallbackChannel(
  value: unknown
): ToolSetupFallbackChannel {
  const normalized = normalizeOptionalString(value)?.toLowerCase();
  if (normalized === "sms" || normalized === "email" || normalized === "telegram") {
    return normalized;
  }
  return "email";
}

function normalizeToolSetupDeploymentChoice(
  value: unknown
): ToolSetupDeploymentChoice {
  const normalized = normalizeOptionalString(value)?.toLowerCase();
  if (normalized === "telegram" || normalized === "both") {
    return normalized;
  }
  return "webchat";
}

function normalizeToolSetupOperatingMode(
  value: unknown
): ToolSetupOperatingMode {
  return normalizeOptionalString(value)?.toLowerCase() === "private"
    ? "private"
    : "work";
}

function normalizeConfidence(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(0, Math.min(1, Number(value.toFixed(3))));
}

function normalizeTimezone(value: unknown): {
  timezone: string;
  usedFallback: boolean;
} {
  const candidate = normalizeOptionalString(value) ?? DEFAULT_WEEKEND_TIMEZONE;
  try {
    // Throws RangeError for unknown zones.
    // eslint-disable-next-line no-new
    new Intl.DateTimeFormat("en-US", { timeZone: candidate });
    return { timezone: candidate, usedFallback: false };
  } catch {
    return { timezone: DEFAULT_WEEKEND_TIMEZONE, usedFallback: true };
  }
}

function normalizeReportLookbackHours(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_REPORT_LOOKBACK_HOURS;
  }
  const rounded = Math.trunc(value);
  return Math.max(24, Math.min(240, rounded));
}

function readWeekendModeConfig(raw: unknown): WeekendModeConfig {
  const record =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const timezoneResolution = normalizeTimezone(record.timezone);
  return {
    enabled: normalizeBoolean(record.enabled, false),
    timezone: timezoneResolution.timezone,
    fridayStart: normalizeHourMinute(record.fridayStart, DEFAULT_FRIDAY_START),
    mondayEnd: normalizeHourMinute(record.mondayEnd, DEFAULT_MONDAY_END),
    active: normalizeBoolean(record.active, false),
    reportChannel: normalizeReportChannel(record.reportChannel),
    reportLookbackHours: normalizeReportLookbackHours(record.reportLookbackHours),
    autoCreateContacts: normalizeBoolean(record.autoCreateContacts, true),
    autoCreatePipelineCards: normalizeBoolean(record.autoCreatePipelineCards, true),
    autoExtractTasks: normalizeBoolean(record.autoExtractTasks, true),
    weekendSoulMode: normalizeOptionalString(record.weekendSoulMode) ?? "private",
    reportDeliveryEmail: normalizeOptionalString(record.reportDeliveryEmail),
    reportDeliveryTelegramChatId: normalizeOptionalString(record.reportDeliveryTelegramChatId),
    previousSoulMode: normalizeOptionalString(record.previousSoulMode),
    lastStateChangeAt:
      typeof record.lastStateChangeAt === "number" ? record.lastStateChangeAt : undefined,
    lastReportWeekKey: normalizeOptionalString(record.lastReportWeekKey),
    lastReportGeneratedAt:
      typeof record.lastReportGeneratedAt === "number"
        ? record.lastReportGeneratedAt
        : undefined,
  };
}

function readAgentToolSetupConfig(raw: unknown): AgentToolSetupConfig {
  const record =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  return {
    agentClass: normalizeAgentClass(record.agentClass),
    preferredChannel: normalizeToolSetupPreferredChannel(record.preferredChannel),
    fallbackChannel: normalizeToolSetupFallbackChannel(record.fallbackChannel),
    allowedHoursStart: normalizeHourMinute(
      record.allowedHoursStart,
      DEFAULT_TOOL_SETUP_ALLOWED_HOURS_START
    ),
    allowedHoursEnd: normalizeHourMinute(
      record.allowedHoursEnd,
      DEFAULT_TOOL_SETUP_ALLOWED_HOURS_END
    ),
    deploymentChoice: normalizeToolSetupDeploymentChoice(record.deploymentChoice),
    operatingMode: normalizeToolSetupOperatingMode(record.operatingMode),
    weekendModeEnabled: normalizeBoolean(record.weekendModeEnabled, false),
    updatedAt: typeof record.updatedAt === "number" ? record.updatedAt : undefined,
  };
}

function serializeWeekendModeConfig(config: WeekendModeConfig): Record<string, unknown> {
  return {
    contractVersion: WEEKEND_MODE_CONTRACT_VERSION,
    enabled: config.enabled,
    timezone: config.timezone,
    fridayStart: config.fridayStart,
    mondayEnd: config.mondayEnd,
    active: config.active,
    reportChannel: config.reportChannel,
    reportLookbackHours: config.reportLookbackHours,
    autoCreateContacts: config.autoCreateContacts,
    autoCreatePipelineCards: config.autoCreatePipelineCards,
    autoExtractTasks: config.autoExtractTasks,
    weekendSoulMode: config.weekendSoulMode,
    reportDeliveryEmail: config.reportDeliveryEmail,
    reportDeliveryTelegramChatId: config.reportDeliveryTelegramChatId,
    previousSoulMode: config.previousSoulMode,
    lastStateChangeAt: config.lastStateChangeAt,
    lastReportWeekKey: config.lastReportWeekKey,
    lastReportGeneratedAt: config.lastReportGeneratedAt,
  };
}

function serializeAgentToolSetupConfig(
  config: AgentToolSetupConfig
): Record<string, unknown> {
  return {
    contractVersion: AGENT_TOOL_SETUP_CONTRACT_VERSION,
    agentClass: config.agentClass,
    preferredChannel: config.preferredChannel,
    fallbackChannel: config.fallbackChannel,
    allowedHoursStart: config.allowedHoursStart,
    allowedHoursEnd: config.allowedHoursEnd,
    deploymentChoice: config.deploymentChoice,
    operatingMode: config.operatingMode,
    weekendModeEnabled: config.weekendModeEnabled,
    updatedAt: config.updatedAt,
  };
}

function resolveLocalClock(timestamp: number, timezone: string): WeekendRuntimeClock {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = formatter.formatToParts(new Date(timestamp));
  const partMap: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== "literal") {
      partMap[part.type] = part.value;
    }
  }
  const weekdayLabel = partMap.weekday ?? "Mon";
  const weekday = normalizeWeekdayKey(weekdayLabel);
  const hour = Number(partMap.hour ?? "0");
  const minute = Number(partMap.minute ?? "0");
  const year = partMap.year ?? "1970";
  const month = partMap.month ?? "01";
  const day = partMap.day ?? "01";
  return {
    weekday,
    weekdayLabel,
    minutesOfDay:
      (Number.isFinite(hour) ? hour : 0) * 60 + (Number.isFinite(minute) ? minute : 0),
    localDateKey: `${year}-${month}-${day}`,
  };
}

function isWeekendWindowActive(args: {
  clock: WeekendRuntimeClock;
  fridayStart: string;
  mondayEnd: string;
}): boolean {
  const fridayStartMinutes = hourMinuteToMinutes(args.fridayStart);
  const mondayEndMinutes = hourMinuteToMinutes(args.mondayEnd);
  if (args.clock.weekday === "fri") {
    return args.clock.minutesOfDay >= fridayStartMinutes;
  }
  if (args.clock.weekday === "sat" || args.clock.weekday === "sun") {
    return true;
  }
  if (args.clock.weekday === "mon") {
    return args.clock.minutesOfDay < mondayEndMinutes;
  }
  return false;
}

function deriveWeekKey(clock: WeekendRuntimeClock): string {
  return `week:${clock.localDateKey}`;
}

export function resolveWeekendModeRuntimeContract(args: {
  weekendModeRaw: unknown;
  timestamp?: number;
}): WeekendModeRuntimeContract {
  const config = readWeekendModeConfig(args.weekendModeRaw);
  const now = typeof args.timestamp === "number" ? args.timestamp : Date.now();
  const timezoneResolution = normalizeTimezone(config.timezone);
  const clock = resolveLocalClock(now, timezoneResolution.timezone);
  if (!config.enabled) {
    return {
      contractVersion: WEEKEND_MODE_CONTRACT_VERSION,
      enabled: false,
      active: false,
      reason: "disabled",
      timezone: timezoneResolution.timezone,
      fridayStart: config.fridayStart,
      mondayEnd: config.mondayEnd,
      reportChannel: config.reportChannel,
      reportLookbackHours: config.reportLookbackHours,
      autoCreateContacts: config.autoCreateContacts,
      autoCreatePipelineCards: config.autoCreatePipelineCards,
      autoExtractTasks: config.autoExtractTasks,
      weekendSoulMode: config.weekendSoulMode,
      clock,
    };
  }

  const active = isWeekendWindowActive({
    clock,
    fridayStart: config.fridayStart,
    mondayEnd: config.mondayEnd,
  });

  return {
    contractVersion: WEEKEND_MODE_CONTRACT_VERSION,
    enabled: true,
    active,
    reason: timezoneResolution.usedFallback
      ? "invalid_timezone_fallback"
      : active
        ? "inside_weekend_window"
        : "outside_weekend_window",
    timezone: timezoneResolution.timezone,
    fridayStart: config.fridayStart,
    mondayEnd: config.mondayEnd,
    reportChannel: config.reportChannel,
    reportLookbackHours: config.reportLookbackHours,
    autoCreateContacts: config.autoCreateContacts,
    autoCreatePipelineCards: config.autoCreatePipelineCards,
    autoExtractTasks: config.autoExtractTasks,
    weekendSoulMode: config.weekendSoulMode,
    clock,
  };
}

function normalizeContactIdentifier(args: {
  channel: string;
  identifier: string;
}): string {
  const normalized = args.identifier.trim().toLowerCase();
  if (["phone_call", "sms", "whatsapp"].includes(args.channel)) {
    return normalized.replace(/[^\d+]/g, "");
  }
  return normalized;
}

function extractContactMatchValue(contact: {
  customProperties?: Record<string, unknown> | null;
}, channel: string): string {
  const props = (contact.customProperties || {}) as Record<string, unknown>;
  if (["phone_call", "sms", "whatsapp"].includes(channel)) {
    return String(props.phone || "").trim().toLowerCase().replace(/[^\d+]/g, "");
  }
  return String(props.email || "").trim().toLowerCase();
}

function buildFallbackContactName(identifier: string): string {
  const digits = identifier.replace(/[^\d]/g, "");
  const suffix = digits.length >= 4 ? digits.slice(-4) : identifier.slice(-6);
  return `Weekend Caller ${suffix || "Unknown"}`;
}

function safeJsonParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function normalizeTaskExtractionItem(raw: unknown): WeekendTaskExtractionItem | null {
  const record =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const title = normalizeOptionalString(record.title);
  if (!title) {
    return null;
  }
  return {
    title,
    details: normalizeOptionalString(record.details),
    dueHint: normalizeOptionalString(record.dueHint),
    priority: normalizeUrgency(record.priority),
  };
}

function normalizeTaskExtractionResult(args: {
  raw: unknown;
  fallbackSummary: string;
}): WeekendTaskExtractionResult {
  const record =
    args.raw && typeof args.raw === "object" && !Array.isArray(args.raw)
      ? (args.raw as Record<string, unknown>)
      : {};
  const actionItems = Array.isArray(record.actionItems)
    ? record.actionItems
        .map((item) => normalizeTaskExtractionItem(item))
        .filter((item): item is WeekendTaskExtractionItem => Boolean(item))
        .slice(0, 6)
    : [];
  const fallbackUrgency =
    /\b(urgent|asap|immediately|today)\b/i.test(args.fallbackSummary)
      ? "high"
      : "normal";
  return {
    contractVersion: WEEKEND_TASK_EXTRACTION_CONTRACT_VERSION,
    category:
      normalizeOptionalString(record.category) ||
      "Weekend inbound call",
    urgency: normalizeUrgency(record.urgency ?? fallbackUrgency),
    suggestedStage: normalizeSuggestedStage(record.suggestedStage),
    confidence: normalizeConfidence(record.confidence, 0.55),
    customerIntent:
      normalizeOptionalString(record.customerIntent) ||
      "Caller requested follow-up",
    notes: normalizeOptionalString(record.notes) || args.fallbackSummary,
    actionItems:
      actionItems.length > 0
        ? actionItems
        : [
            {
              title: "Review weekend call summary",
              details: args.fallbackSummary,
              priority: fallbackUrgency,
            },
          ],
  };
}

function mapStageNameToKey(name: string): WeekendSuggestedStageKey | null {
  const normalized = name.trim().toLowerCase();
  for (const definition of WEEKEND_STAGE_DEFINITIONS) {
    if (definition.name.toLowerCase() === normalized) {
      return definition.key;
    }
  }
  return null;
}

async function resolvePrimaryOrProvidedAgent(args: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any;
  organizationId: Id<"organizations">;
  agentId?: Id<"objects">;
}): Promise<{
  _id: Id<"objects">;
  organizationId: Id<"organizations">;
  name: string;
  status: string;
  customProperties?: Record<string, unknown>;
} | null> {
  if (args.agentId) {
    const explicit = await args.ctx.db.get(args.agentId);
    if (
      explicit &&
      explicit.type === "org_agent" &&
      explicit.organizationId === args.organizationId
    ) {
      return explicit;
    }
  }

  const agents = await args.ctx.db
    .query("objects")
    .withIndex("by_org_type", (q: any) =>
      q.eq("organizationId", args.organizationId).eq("type", "org_agent")
    )
    .collect();
  if (agents.length === 0) {
    return null;
  }

  const activeAgents = agents.filter((agent: any) => agent.status === "active");
  const preferredPool = activeAgents.length > 0 ? activeAgents : agents;
  const personalOperator = preferredPool.find((agent: any) =>
    isPersonalOperatorAgentCandidate(agent)
  );
  if (personalOperator) {
    return personalOperator as any;
  }
  const primary = preferredPool.find(
    (agent: any) => (agent.customProperties as Record<string, unknown> | undefined)?.isPrimary === true
  );
  return (primary || preferredPool[0] || null) as any;
}

function isPersonalOperatorAgentCandidate(agent: {
  customProperties?: Record<string, unknown> | null;
}): boolean {
  const props = (agent.customProperties || {}) as Record<string, unknown>;
  const templateRole = normalizeOptionalString(props.templateRole)?.toLowerCase();
  if (templateRole === PERSONAL_OPERATOR_TEMPLATE_ROLE) {
    return true;
  }
  const templateLayer = normalizeOptionalString(props.templateLayer)?.toLowerCase();
  if (templateLayer === PERSONAL_OPERATOR_TEMPLATE_LAYER) {
    return true;
  }
  const templatePlaybook = normalizeOptionalString(props.templatePlaybook)?.toLowerCase();
  if (templatePlaybook === PERSONAL_OPERATOR_TEMPLATE_PLAYBOOK) {
    return true;
  }
  const allowedPlaybooks = Array.isArray(props.allowedPlaybooks)
    ? props.allowedPlaybooks
    : [];
  return allowedPlaybooks.some(
    (entry) =>
      normalizeOptionalString(entry)?.toLowerCase() ===
      PERSONAL_OPERATOR_TEMPLATE_PLAYBOOK
  );
}

function selectPreferredWeekendAgent<T extends {
  _id: Id<"objects">;
  customProperties?: Record<string, unknown>;
}>(agents: T[]): T | null {
  if (agents.length === 0) {
    return null;
  }
  const personalOperator = agents.find((agent) =>
    isPersonalOperatorAgentCandidate(agent)
  );
  if (personalOperator) {
    return personalOperator;
  }
  const primary = agents.find(
    (agent) =>
      (agent.customProperties as Record<string, unknown> | undefined)?.isPrimary === true
  );
  return primary || agents[0] || null;
}

export const getWeekendModeConfig = query({
  args: {
    sessionId: v.string(),
    agentId: v.optional(v.id("objects")),
  },
  handler: async (ctx, args) => {
    const auth = await requireAuthenticatedUser(ctx, args.sessionId);
    const agent = await resolvePrimaryOrProvidedAgent({
      ctx,
      organizationId: auth.organizationId,
      agentId: args.agentId,
    });
    if (!agent) {
      return null;
    }
    const weekendRaw = (agent.customProperties as Record<string, unknown> | undefined)?.weekendMode;
    const config = readWeekendModeConfig(weekendRaw);
    const runtime = resolveWeekendModeRuntimeContract({ weekendModeRaw: weekendRaw });
    return {
      agentId: agent._id,
      config,
      runtime,
    };
  },
});

export const getAgentToolSetupConfig = query({
  args: {
    sessionId: v.string(),
    agentId: v.optional(v.id("objects")),
  },
  handler: async (ctx, args) => {
    const auth = await requireAuthenticatedUser(ctx, args.sessionId);
    const agent = await resolvePrimaryOrProvidedAgent({
      ctx,
      organizationId: auth.organizationId,
      agentId: args.agentId,
    });
    if (!agent) {
      return null;
    }

    const customProps = (agent.customProperties || {}) as Record<string, unknown>;
    const storedConfig = readAgentToolSetupConfig(customProps.agentToolSetup);
    const weekendConfig = readWeekendModeConfig(customProps.weekendMode);
    return {
      agentId: agent._id,
      contractVersion: AGENT_TOOL_SETUP_CONTRACT_VERSION,
      config: {
        ...storedConfig,
        weekendModeEnabled: weekendConfig.enabled,
      },
      weekendModeRuntime: resolveWeekendModeRuntimeContract({
        weekendModeRaw: customProps.weekendMode,
      }),
    };
  },
});

export const saveAgentToolSetupConfig = mutation({
  args: {
    sessionId: v.string(),
    agentId: v.optional(v.id("objects")),
    updates: v.object({
      agentClass: v.optional(
        v.union(v.literal("internal_operator"), v.literal("external_customer_facing"))
      ),
      preferredChannel: v.optional(
        v.union(
          v.literal("sms"),
          v.literal("email"),
          v.literal("telegram"),
          v.literal("phone_call")
        )
      ),
      fallbackChannel: v.optional(
        v.union(
          v.literal("none"),
          v.literal("sms"),
          v.literal("email"),
          v.literal("telegram")
        )
      ),
      allowedHoursStart: v.optional(v.string()),
      allowedHoursEnd: v.optional(v.string()),
      deploymentChoice: v.optional(
        v.union(v.literal("webchat"), v.literal("telegram"), v.literal("both"))
      ),
      operatingMode: v.optional(v.union(v.literal("work"), v.literal("private"))),
      weekendModeEnabled: v.optional(v.boolean()),
      weekendTimezone: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const auth = await requireAuthenticatedUser(ctx, args.sessionId);
    const agent = await resolvePrimaryOrProvidedAgent({
      ctx,
      organizationId: auth.organizationId,
      agentId: args.agentId,
    });
    if (!agent) {
      throw new Error("No operator agent found for organization.");
    }

    const now = Date.now();
    const customProps = (agent.customProperties || {}) as Record<string, unknown>;
    const currentConfig = readAgentToolSetupConfig(customProps.agentToolSetup);
    const currentWeekend = readWeekendModeConfig(customProps.weekendMode);
    const mergedConfig: AgentToolSetupConfig = {
      ...currentConfig,
      agentClass: normalizeAgentClass(args.updates.agentClass, currentConfig.agentClass),
      preferredChannel: normalizeToolSetupPreferredChannel(
        args.updates.preferredChannel ?? currentConfig.preferredChannel
      ),
      fallbackChannel: normalizeToolSetupFallbackChannel(
        args.updates.fallbackChannel ?? currentConfig.fallbackChannel
      ),
      allowedHoursStart: normalizeHourMinute(
        args.updates.allowedHoursStart,
        currentConfig.allowedHoursStart
      ),
      allowedHoursEnd: normalizeHourMinute(
        args.updates.allowedHoursEnd,
        currentConfig.allowedHoursEnd
      ),
      deploymentChoice: normalizeToolSetupDeploymentChoice(
        args.updates.deploymentChoice ?? currentConfig.deploymentChoice
      ),
      operatingMode: normalizeToolSetupOperatingMode(
        args.updates.operatingMode ?? currentConfig.operatingMode
      ),
      weekendModeEnabled: args.updates.weekendModeEnabled ?? currentWeekend.enabled,
      updatedAt: now,
    };

    const mergedWeekend: WeekendModeConfig = {
      ...currentWeekend,
      enabled: mergedConfig.weekendModeEnabled,
      timezone: normalizeTimezone(
        args.updates.weekendTimezone ?? currentWeekend.timezone
      ).timezone,
      active: currentWeekend.active,
      previousSoulMode: currentWeekend.previousSoulMode,
      lastStateChangeAt: currentWeekend.lastStateChangeAt,
      lastReportWeekKey: currentWeekend.lastReportWeekKey,
      lastReportGeneratedAt: currentWeekend.lastReportGeneratedAt,
    };
    const weekendRuntime = resolveWeekendModeRuntimeContract({
      weekendModeRaw: mergedWeekend,
    });
    const previousActive = currentWeekend.active;
    mergedWeekend.active = weekendRuntime.active;
    mergedWeekend.lastStateChangeAt = now;

    const nextCustomProps = { ...customProps };
    const currentSoulMode = normalizeOptionalString(nextCustomProps.activeSoulMode) || "work";
    if (mergedWeekend.active && !previousActive) {
      mergedWeekend.previousSoulMode = currentSoulMode;
      nextCustomProps.activeSoulMode = mergedWeekend.weekendSoulMode;
    } else if (!mergedWeekend.active && previousActive) {
      nextCustomProps.activeSoulMode = mergedWeekend.previousSoulMode || "work";
      mergedWeekend.previousSoulMode = undefined;
    }

    await ctx.db.patch(agent._id, {
      customProperties: {
        ...nextCustomProps,
        agentToolSetup: serializeAgentToolSetupConfig(mergedConfig),
        weekendMode: serializeWeekendModeConfig(mergedWeekend),
      },
      updatedAt: now,
    });

    await ctx.db.insert("objectActions", {
      organizationId: auth.organizationId,
      objectId: agent._id,
      actionType: "agent_tool_setup_config_updated",
      actionData: {
        contractVersion: AGENT_TOOL_SETUP_CONTRACT_VERSION,
        weekendModeContractVersion: WEEKEND_MODE_CONTRACT_VERSION,
        agentClass: mergedConfig.agentClass,
        preferredChannel: mergedConfig.preferredChannel,
        fallbackChannel: mergedConfig.fallbackChannel,
        allowedHoursStart: mergedConfig.allowedHoursStart,
        allowedHoursEnd: mergedConfig.allowedHoursEnd,
        deploymentChoice: mergedConfig.deploymentChoice,
        operatingMode: mergedConfig.operatingMode,
        weekendModeEnabled: mergedConfig.weekendModeEnabled,
      },
      performedBy: auth.userId,
      performedAt: now,
    });

    return {
      success: true,
      agentId: agent._id,
      contractVersion: AGENT_TOOL_SETUP_CONTRACT_VERSION,
      config: mergedConfig,
      weekendModeRuntime: weekendRuntime,
    };
  },
});

export const saveWeekendModeConfig = mutation({
  args: {
    sessionId: v.string(),
    agentId: v.optional(v.id("objects")),
    updates: v.object({
      enabled: v.optional(v.boolean()),
      timezone: v.optional(v.string()),
      fridayStart: v.optional(v.string()),
      mondayEnd: v.optional(v.string()),
      reportChannel: v.optional(
        v.union(v.literal("in_app"), v.literal("email"), v.literal("telegram"))
      ),
      reportLookbackHours: v.optional(v.number()),
      autoCreateContacts: v.optional(v.boolean()),
      autoCreatePipelineCards: v.optional(v.boolean()),
      autoExtractTasks: v.optional(v.boolean()),
      weekendSoulMode: v.optional(v.string()),
      reportDeliveryEmail: v.optional(v.string()),
      reportDeliveryTelegramChatId: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const auth = await requireAuthenticatedUser(ctx, args.sessionId);
    const agent = await resolvePrimaryOrProvidedAgent({
      ctx,
      organizationId: auth.organizationId,
      agentId: args.agentId,
    });
    if (!agent) {
      throw new Error("No operator agent found for organization.");
    }

    const customProps = (agent.customProperties || {}) as Record<string, unknown>;
    const current = readWeekendModeConfig(customProps.weekendMode);
    const merged: WeekendModeConfig = {
      ...current,
      enabled: args.updates.enabled ?? current.enabled,
      timezone: normalizeTimezone(args.updates.timezone ?? current.timezone).timezone,
      fridayStart: normalizeHourMinute(args.updates.fridayStart, current.fridayStart),
      mondayEnd: normalizeHourMinute(args.updates.mondayEnd, current.mondayEnd),
      reportChannel: normalizeReportChannel(args.updates.reportChannel ?? current.reportChannel),
      reportLookbackHours: normalizeReportLookbackHours(
        args.updates.reportLookbackHours ?? current.reportLookbackHours
      ),
      autoCreateContacts: args.updates.autoCreateContacts ?? current.autoCreateContacts,
      autoCreatePipelineCards:
        args.updates.autoCreatePipelineCards ?? current.autoCreatePipelineCards,
      autoExtractTasks: args.updates.autoExtractTasks ?? current.autoExtractTasks,
      weekendSoulMode:
        normalizeOptionalString(args.updates.weekendSoulMode) || current.weekendSoulMode,
      reportDeliveryEmail:
        normalizeOptionalString(args.updates.reportDeliveryEmail) || current.reportDeliveryEmail,
      reportDeliveryTelegramChatId:
        normalizeOptionalString(args.updates.reportDeliveryTelegramChatId) ||
        current.reportDeliveryTelegramChatId,
      active: current.active,
      previousSoulMode: current.previousSoulMode,
      lastStateChangeAt: current.lastStateChangeAt,
      lastReportWeekKey: current.lastReportWeekKey,
      lastReportGeneratedAt: current.lastReportGeneratedAt,
    };

    const runtime = resolveWeekendModeRuntimeContract({ weekendModeRaw: merged });
    const previousActive = current.active;
    merged.active = runtime.active;
    merged.lastStateChangeAt = Date.now();
    const currentSoulMode = normalizeOptionalString(customProps.activeSoulMode) || "work";
    if (merged.active && !previousActive) {
      merged.previousSoulMode = currentSoulMode;
      customProps.activeSoulMode = merged.weekendSoulMode;
    } else if (!merged.active && previousActive) {
      customProps.activeSoulMode = merged.previousSoulMode || "work";
      merged.previousSoulMode = undefined;
    }

    await ctx.db.patch(agent._id, {
      customProperties: {
        ...customProps,
        weekendMode: serializeWeekendModeConfig(merged),
      },
      updatedAt: Date.now(),
    });

    await ctx.db.insert("objectActions", {
      organizationId: auth.organizationId,
      objectId: agent._id,
      actionType: "weekend_mode_config_updated",
      actionData: {
        contractVersion: WEEKEND_MODE_CONTRACT_VERSION,
        enabled: merged.enabled,
        timezone: merged.timezone,
        fridayStart: merged.fridayStart,
        mondayEnd: merged.mondayEnd,
        reportChannel: merged.reportChannel,
      },
      performedBy: auth.userId,
      performedAt: Date.now(),
    });

    return {
      success: true,
      agentId: agent._id,
      config: merged,
      runtime,
    };
  },
});

export const ensureDefaultWeekendModeConfigForAgent = internalMutation({
  args: {
    agentId: v.id("objects"),
    enabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.agentId);
    if (!agent || agent.type !== "org_agent") {
      return { success: false, reason: "agent_not_found" as const };
    }
    const customProps = (agent.customProperties || {}) as Record<string, unknown>;
    const current = readWeekendModeConfig(customProps.weekendMode);
    const next: WeekendModeConfig = {
      ...current,
      enabled: args.enabled ?? current.enabled,
    };
    const runtime = resolveWeekendModeRuntimeContract({ weekendModeRaw: next });
    next.active = runtime.active;
    next.lastStateChangeAt = Date.now();
    if (next.active) {
      const currentSoulMode = normalizeOptionalString(customProps.activeSoulMode) || "work";
      next.previousSoulMode = currentSoulMode;
      customProps.activeSoulMode = next.weekendSoulMode;
    }
    await ctx.db.patch(agent._id, {
      customProperties: {
        ...customProps,
        weekendMode: serializeWeekendModeConfig(next),
      },
      updatedAt: Date.now(),
    });
    return { success: true, active: runtime.active };
  },
});

export const listWeekendModeEnabledAgents = internalQuery({
  args: {
    organizationId: v.optional(v.id("organizations")),
  },
  handler: async (ctx, args) => {
    const agents = args.organizationId
      ? await ctx.db
          .query("objects")
          .withIndex("by_org_type", (q) =>
            q.eq("organizationId", args.organizationId!).eq("type", "org_agent")
          )
          .collect()
      : await ctx.db
          .query("objects")
          .withIndex("by_type", (q) => q.eq("type", "org_agent"))
          .collect();
    return agents.filter((agent) => {
      if (agent.status !== "active") {
        return false;
      }
      const customProps = (agent.customProperties || {}) as Record<string, unknown>;
      const config = readWeekendModeConfig(customProps.weekendMode);
      return config.enabled;
    });
  },
});

export const syncAgentWeekendModeState = internalMutation({
  args: {
    agentId: v.id("objects"),
    nextActive: v.boolean(),
    reason: v.string(),
    observedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.agentId);
    if (!agent || agent.type !== "org_agent") {
      return { success: false, reason: "agent_not_found" as const };
    }
    const customProps = (agent.customProperties || {}) as Record<string, unknown>;
    const config = readWeekendModeConfig(customProps.weekendMode);
    if (!config.enabled) {
      return { success: false, reason: "weekend_mode_disabled" as const };
    }

    const previousActive = config.active;
    config.active = args.nextActive;
    config.lastStateChangeAt = args.observedAt;

    // Optional soul mode override for clearer mode transitions.
    const currentSoulMode =
      normalizeOptionalString(customProps.activeSoulMode) || "work";
    if (args.nextActive) {
      config.previousSoulMode = currentSoulMode;
      customProps.activeSoulMode = config.weekendSoulMode;
    } else {
      customProps.activeSoulMode = config.previousSoulMode || "work";
      config.previousSoulMode = undefined;
    }

    await ctx.db.patch(agent._id, {
      customProperties: {
        ...customProps,
        weekendMode: serializeWeekendModeConfig(config),
      },
      updatedAt: Date.now(),
    });

    await ctx.db.insert("objectActions", {
      organizationId: agent.organizationId,
      objectId: agent._id,
      actionType: "weekend_mode_state_changed",
      actionData: {
        previousActive,
        nextActive: args.nextActive,
        reason: args.reason,
        observedAt: args.observedAt,
      },
      performedAt: Date.now(),
    });

    return {
      success: true,
      previousActive,
      nextActive: args.nextActive,
      organizationId: agent.organizationId,
    };
  },
});

async function ensureWeekendPipelineInternal(args: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any;
  organizationId: Id<"organizations">;
}): Promise<{
  pipelineId: Id<"objects">;
  stageByKey: Record<WeekendSuggestedStageKey, Id<"objects">>;
  created: boolean;
}> {
  const existingPipelines = await args.ctx.db
    .query("objects")
    .withIndex("by_org_type", (q: any) =>
      q.eq("organizationId", args.organizationId).eq("type", "crm_pipeline")
    )
    .collect();

  const existingWeekendPipeline = existingPipelines.find((pipeline: any) => {
    const props = (pipeline.customProperties || {}) as Record<string, unknown>;
    return (
      props.weekendPipelineContractVersion === WEEKEND_PIPELINE_CONTRACT_VERSION ||
      pipeline.name === "Weekend Calls"
    );
  });

  const now = Date.now();
  let pipelineId: Id<"objects">;
  let created = false;
  if (existingWeekendPipeline) {
    pipelineId = existingWeekendPipeline._id;
  } else {
    pipelineId = await args.ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "crm_pipeline",
      subtype: "weekend_calls",
      name: "Weekend Calls",
      description:
        "Auto-triage pipeline for weekend inbound calls and follow-up planning.",
      status: "active",
      customProperties: {
        isTemplate: false,
        isDefault: false,
        category: "weekend_calls",
        weekendPipelineContractVersion: WEEKEND_PIPELINE_CONTRACT_VERSION,
        aiSettings: {
          autoScoring: true,
          autoProgression: true,
          suggestActions: true,
          scoreModel: "weekend_call_triage_v1",
        },
      },
      createdAt: now,
      updatedAt: now,
    });
    created = true;
  }

  const stageLinks = await args.ctx.db
    .query("objectLinks")
    .withIndex("by_to_object", (q: any) => q.eq("toObjectId", pipelineId))
    .filter((q: any) => q.eq(q.field("linkType"), "belongs_to_pipeline"))
    .collect();
  const existingStages = await Promise.all(
    stageLinks.map((link: any) => args.ctx.db.get(link.fromObjectId))
  );

  const stageByKey = {} as Record<WeekendSuggestedStageKey, Id<"objects">>;
  for (const stage of existingStages) {
    if (!stage) continue;
    const key =
      normalizeOptionalString(
        (stage.customProperties as Record<string, unknown> | undefined)?.weekendStageKey
      ) || mapStageNameToKey(stage.name);
    if (key && (key as WeekendSuggestedStageKey) in stageByKey === false) {
      stageByKey[key as WeekendSuggestedStageKey] = stage._id;
    }
  }

  for (const definition of WEEKEND_STAGE_DEFINITIONS) {
    if (stageByKey[definition.key]) {
      continue;
    }
    const stageId = await args.ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "crm_pipeline_stage",
      subtype: definition.subtype,
      name: definition.name,
      description: definition.description,
      status: "active",
      customProperties: {
        order: definition.order,
        color: definition.color,
        probability: definition.probability,
        weekendStageKey: definition.key,
      },
      createdAt: now,
      updatedAt: now,
    });

    await args.ctx.db.insert("objectLinks", {
      organizationId: args.organizationId,
      fromObjectId: stageId,
      toObjectId: pipelineId,
      linkType: "belongs_to_pipeline",
      properties: {
        order: definition.order,
      },
      createdAt: now,
    });

    stageByKey[definition.key] = stageId;
  }

  if (created) {
    await args.ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: pipelineId,
      actionType: "weekend_pipeline_initialized",
      actionData: {
        contractVersion: WEEKEND_PIPELINE_CONTRACT_VERSION,
        stages: WEEKEND_STAGE_DEFINITIONS.length,
      },
      performedAt: now,
    });
  }

  return {
    pipelineId,
    stageByKey,
    created,
  };
}

export const ensureWeekendPipelineForOrganization = internalMutation({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    return await ensureWeekendPipelineInternal({
      ctx,
      organizationId: args.organizationId,
    });
  },
});

export const ensureWeekendCallerCoverage = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    agentId: v.id("objects"),
    sessionId: v.id("agentSessions"),
    channel: v.string(),
    externalContactIdentifier: v.string(),
    observedAt: v.optional(v.number()),
    allowOutsideWindow: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = args.observedAt ?? Date.now();
    const session = await ctx.db.get(args.sessionId);
    const agent = await ctx.db.get(args.agentId);
    if (!session || !agent || agent.type !== "org_agent") {
      return { success: false, skipped: "missing_session_or_agent" as const };
    }

    const weekendRuntime = resolveWeekendModeRuntimeContract({
      weekendModeRaw: (agent.customProperties as Record<string, unknown> | undefined)?.weekendMode,
      timestamp: now,
    });
    if (
      !weekendRuntime.enabled ||
      (!weekendRuntime.active && args.allowOutsideWindow !== true)
    ) {
      return { success: false, skipped: "weekend_mode_inactive" as const };
    }
    if (!weekendRuntime.autoCreateContacts || !weekendRuntime.autoCreatePipelineCards) {
      return { success: false, skipped: "automation_disabled" as const };
    }
    if (args.channel !== "phone_call") {
      return { success: false, skipped: "channel_not_weekend_call" as const };
    }

    const pipeline = await ensureWeekendPipelineInternal({
      ctx,
      organizationId: args.organizationId,
    });
    const newCallStageId = pipeline.stageByKey.new_call;

    let crmContactId = session.crmContactId as Id<"objects"> | undefined;
    let createdContact = false;
    if (!crmContactId) {
      const contacts = await ctx.db
        .query("objects")
        .withIndex("by_org_type", (q) =>
          q.eq("organizationId", args.organizationId).eq("type", "crm_contact")
        )
        .collect();
      const identifier = normalizeContactIdentifier({
        channel: args.channel,
        identifier: args.externalContactIdentifier,
      });
      const existing = contacts.find((contact) => {
        const matchValue = extractContactMatchValue(contact, args.channel);
        return matchValue.length > 0 && matchValue === identifier;
      });
      if (existing) {
        crmContactId = existing._id;
      } else {
        const fallbackName = buildFallbackContactName(args.externalContactIdentifier);
        const phoneValue = args.externalContactIdentifier;
        const nameParts = fallbackName.split(/\s+/g);
        crmContactId = await ctx.db.insert("objects", {
          organizationId: args.organizationId,
          type: "crm_contact",
          subtype: "lead",
          name: fallbackName,
          description: "Auto-created weekend caller contact",
          status: "active",
          customProperties: {
            firstName: nameParts[0] || "Weekend",
            lastName: nameParts.slice(1).join(" ") || "Caller",
            email: undefined,
            phone: phoneValue,
            jobTitle: undefined,
            company: undefined,
            tags: ["weekend_call"],
            notes: "",
            outreachPreferences: {
              preferredChannel: "phone_call",
              allowedHours: {
                start: DEFAULT_FRIDAY_START,
                end: DEFAULT_MONDAY_END,
                timezone: weekendRuntime.timezone,
              },
              fallbackMethod: "email",
            },
            customFields: {},
          },
          createdAt: now,
          updatedAt: now,
        });
        createdContact = true;
      }
    }

    if (!crmContactId) {
      return { success: false, skipped: "contact_resolution_failed" as const };
    }

    if (!session.crmContactId) {
      await ctx.db.patch(args.sessionId, {
        crmContactId,
      });
    }

    const contactPipelineLinks = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_object", (q) => q.eq("fromObjectId", crmContactId!))
      .filter((q) => q.eq(q.field("linkType"), "in_pipeline"))
      .collect();
    const existingLink = contactPipelineLinks.find((link) => {
      const props = (link.properties || {}) as Record<string, unknown>;
      return String(props.pipelineId || "") === String(pipeline.pipelineId);
    });

    if (!existingLink) {
      await ctx.db.insert("objectLinks", {
        organizationId: args.organizationId,
        fromObjectId: crmContactId,
        toObjectId: newCallStageId,
        linkType: "in_pipeline",
        properties: {
          pipelineId: pipeline.pipelineId,
          movedAt: now,
          aiData: {
            score: 0,
            confidence: 0,
            reasoning: ["Weekend caller captured automatically."],
          },
        },
        createdAt: now,
      });
    }

    const weekendSessionState =
      (session.weekendMode as Record<string, unknown> | undefined) || {};
    await ctx.db.patch(args.sessionId, {
      weekendMode: {
        ...weekendSessionState,
        weekendWindowEvaluatedAt: now,
        weekendWindowActiveAtOpen: true,
        weekendPipelineId: pipeline.pipelineId,
        weekendStageId: newCallStageId,
        weekendContactAutoCreated: createdContact,
      },
    });

    if (createdContact) {
      await ctx.db.insert("objectActions", {
        organizationId: args.organizationId,
        objectId: crmContactId,
        actionType: "weekend_contact_auto_created",
        actionData: {
          sessionId: String(args.sessionId),
          channel: args.channel,
          externalContactIdentifier: args.externalContactIdentifier,
        },
        performedAt: now,
      });
    }

    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: crmContactId,
      actionType: "weekend_call_captured",
      actionData: {
        sessionId: String(args.sessionId),
        pipelineId: String(pipeline.pipelineId),
        stageId: String(newCallStageId),
      },
      performedAt: now,
    });

    return {
      success: true,
      crmContactId,
      pipelineId: pipeline.pipelineId,
      stageId: newCallStageId,
      createdContact,
      createdPipeline: pipeline.created,
    };
  },
});

async function analyzeWeekendConversation(args: {
  summary: string;
  transcript: string;
}): Promise<WeekendTaskExtractionResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return normalizeTaskExtractionResult({
      raw: null,
      fallbackSummary: args.summary,
    });
  }

  const client = new OpenRouterClient(apiKey);
  try {
    const response = await client.chatCompletion({
      model: "openai/gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Extract structured weekend follow-up data as JSON. " +
            "Return keys: category, urgency(low|normal|high), suggestedStage(new_call|needs_follow_up|appointment_set|resolved|escalated), confidence(0-1), customerIntent, notes, actionItems[]. " +
            "Each action item needs: title, details(optional), dueHint(optional), priority(low|normal|high).",
        },
        {
          role: "user",
          content: `Summary:\n${args.summary}\n\nTranscript:\n${args.transcript}`,
        },
      ],
      max_tokens: 550,
      temperature: 0.2,
      extraBody: {
        response_format: {
          type: "json_object",
        },
      },
    });
    const rawContent = response?.choices?.[0]?.message?.content;
    const rawJson =
      typeof rawContent === "string" ? safeJsonParse(rawContent) : null;
    return normalizeTaskExtractionResult({
      raw: rawJson,
      fallbackSummary: args.summary,
    });
  } catch (error) {
    console.warn("[WeekendMode] Task extraction failed, using fallback", error);
    return normalizeTaskExtractionResult({
      raw: null,
      fallbackSummary: args.summary,
    });
  }
}

export const applyWeekendTaskExtraction = internalMutation({
  args: {
    sessionId: v.id("agentSessions"),
    extraction: v.object({
      category: v.string(),
      urgency: v.union(v.literal("low"), v.literal("normal"), v.literal("high")),
      suggestedStage: v.union(
        v.literal("new_call"),
        v.literal("needs_follow_up"),
        v.literal("appointment_set"),
        v.literal("resolved"),
        v.literal("escalated")
      ),
      confidence: v.number(),
      customerIntent: v.string(),
      notes: v.string(),
      actionItems: v.array(
        v.object({
          title: v.string(),
          details: v.optional(v.string()),
          dueHint: v.optional(v.string()),
          priority: v.union(v.literal("low"), v.literal("normal"), v.literal("high")),
        })
      ),
    }),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      return { success: false, skipped: "session_not_found" as const };
    }
    const weekendState = (session.weekendMode || {}) as Record<string, unknown>;
    const extractionState =
      weekendState.taskExtraction && typeof weekendState.taskExtraction === "object"
        ? (weekendState.taskExtraction as Record<string, unknown>)
        : {};
    if (extractionState.status === "completed") {
      return { success: true, skipped: "already_completed" as const };
    }
    const crmContactId = session.crmContactId as Id<"objects"> | undefined;
    const pipelineId = weekendState.weekendPipelineId as Id<"objects"> | undefined;
    if (!crmContactId || !pipelineId) {
      await ctx.db.patch(args.sessionId, {
        weekendMode: {
          ...weekendState,
          taskExtraction: {
            status: "skipped",
            processedAt: Date.now(),
            reason: "missing_contact_or_pipeline",
          },
        },
      });
      return { success: false, skipped: "missing_contact_or_pipeline" as const };
    }

    const stageLinks = await ctx.db
      .query("objectLinks")
      .withIndex("by_to_object", (q) => q.eq("toObjectId", pipelineId))
      .filter((q) => q.eq(q.field("linkType"), "belongs_to_pipeline"))
      .collect();
    const stages = await Promise.all(
      stageLinks.map((link) => ctx.db.get(link.fromObjectId))
    );
    const stageByKey = new Map<WeekendSuggestedStageKey, Id<"objects">>();
    for (const stage of stages) {
      if (!stage) continue;
      const props = (stage.customProperties || {}) as Record<string, unknown>;
      const stageKey =
        normalizeOptionalString(props.weekendStageKey) || mapStageNameToKey(stage.name);
      if (stageKey) {
        stageByKey.set(stageKey as WeekendSuggestedStageKey, stage._id);
      }
    }

    const targetStageId = stageByKey.get(args.extraction.suggestedStage);
    const inPipelineLinks = await ctx.db
      .query("objectLinks")
      .withIndex("by_from_object", (q) => q.eq("fromObjectId", crmContactId))
      .filter((q) => q.eq(q.field("linkType"), "in_pipeline"))
      .collect();
    const pipelineLink = inPipelineLinks.find((link) => {
      const props = (link.properties || {}) as Record<string, unknown>;
      return String(props.pipelineId || "") === String(pipelineId);
    });
    const previousWeekendStageId = weekendState.weekendStageId as
      | Id<"objects">
      | undefined;

    const aiData = {
      score: Math.round(Math.max(0, Math.min(1, args.extraction.confidence)) * 100),
      confidence: Number(args.extraction.confidence.toFixed(3)),
      reasoning: [
        `Category: ${args.extraction.category}`,
        `Intent: ${args.extraction.customerIntent}`,
        `Urgency: ${args.extraction.urgency}`,
      ],
      weekendInsights: {
        extractedAt: Date.now(),
        category: args.extraction.category,
        urgency: args.extraction.urgency,
        customerIntent: args.extraction.customerIntent,
        notes: args.extraction.notes,
        actionItems: args.extraction.actionItems,
      },
    };

    if (pipelineLink) {
      await ctx.db.patch(pipelineLink._id, {
        toObjectId: targetStageId || pipelineLink.toObjectId,
        properties: {
          ...(pipelineLink.properties || {}),
          pipelineId,
          movedAt: Date.now(),
          aiData,
        },
      });
    } else {
      await ctx.db.insert("objectLinks", {
        organizationId: session.organizationId,
        fromObjectId: crmContactId,
        toObjectId: targetStageId || stageByKey.get("needs_follow_up")!,
        linkType: "in_pipeline",
        properties: {
          pipelineId,
          movedAt: Date.now(),
          aiData,
        },
        createdAt: Date.now(),
      });
    }

    const taskIds: Id<"objects">[] = [];
    for (const item of args.extraction.actionItems.slice(0, 6)) {
      const taskId = await ctx.db.insert("objects", {
        organizationId: session.organizationId,
        type: "task",
        subtype: "weekend_follow_up",
        name: item.title,
        description: item.details,
        status: "todo",
        customProperties: {
          contractVersion: WEEKEND_TASK_EXTRACTION_CONTRACT_VERSION,
          source: "weekend_mode",
          sessionId: String(args.sessionId),
          crmContactId: String(crmContactId),
          pipelineId: String(pipelineId),
          suggestedStage: args.extraction.suggestedStage,
          urgency: item.priority,
          dueHint: item.dueHint,
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      taskIds.push(taskId);
    }

    await ctx.db.patch(args.sessionId, {
      weekendMode: {
        ...weekendState,
        weekendStageId:
          targetStageId ||
          (pipelineLink ? pipelineLink.toObjectId : previousWeekendStageId),
        taskExtraction: {
          status: "completed",
          processedAt: Date.now(),
          extraction: args.extraction,
          taskCount: taskIds.length,
          taskIds: taskIds.map((id) => String(id)),
        },
      },
    });

    await ctx.db.insert("objectActions", {
      organizationId: session.organizationId,
      objectId: crmContactId,
      actionType: "weekend_task_extracted",
      actionData: {
        sessionId: String(args.sessionId),
        pipelineId: String(pipelineId),
        suggestedStage: args.extraction.suggestedStage,
        urgency: args.extraction.urgency,
        taskCount: taskIds.length,
      },
      performedAt: Date.now(),
    });

    return {
      success: true,
      taskCount: taskIds.length,
      suggestedStage: args.extraction.suggestedStage,
    };
  },
});

export const processWeekendSessionSummary = internalAction({
  args: {
    sessionId: v.id("agentSessions"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.runQuery(
      generatedApi.internal.ai.agentSessions.getSessionByIdInternal,
      { sessionId: args.sessionId }
    );
    if (!session || !session.summary?.text) {
      return { success: false, skipped: "missing_session_or_summary" as const };
    }
    const agent = await ctx.runQuery(generatedApi.internal.agentOntology.getAgentInternal, {
      agentId: session.agentId,
    });
    if (!agent) {
      return { success: false, skipped: "agent_not_found" as const };
    }
    const weekendRuntime = resolveWeekendModeRuntimeContract({
      weekendModeRaw: (agent.customProperties as Record<string, unknown> | undefined)?.weekendMode,
      timestamp: session.startedAt,
    });
    if (!weekendRuntime.enabled || !weekendRuntime.active || !weekendRuntime.autoExtractTasks) {
      return { success: false, skipped: "weekend_mode_not_eligible" as const };
    }

    await ctx.runMutation(generatedApi.internal.ai.weekendMode.ensureWeekendCallerCoverage, {
      organizationId: session.organizationId,
      agentId: session.agentId,
      sessionId: args.sessionId,
      channel: session.channel,
      externalContactIdentifier: session.externalContactIdentifier,
      observedAt: session.closedAt || Date.now(),
      allowOutsideWindow: true,
    });

    const messages = await ctx.runQuery(
      generatedApi.internal.ai.agentSessions.getSessionMessages,
      { sessionId: args.sessionId, limit: 30 }
    );
    const transcript = messages
      .map((message: { role: string; content: string }) => `${message.role}: ${message.content}`)
      .join("\n");
    const extraction = await analyzeWeekendConversation({
      summary: session.summary.text,
      transcript,
    });
    return await ctx.runMutation(generatedApi.internal.ai.weekendMode.applyWeekendTaskExtraction, {
      sessionId: args.sessionId,
      extraction,
    });
  },
});

export const listClosedSessionsSince = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    since: v.number(),
    channel: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const sessions = await ctx.db
      .query("agentSessions")
      .withIndex("by_org_status", (q) =>
        q.eq("organizationId", args.organizationId).eq("status", "closed")
      )
      .collect();
    return sessions.filter((session) => {
      if (typeof session.closedAt !== "number" || session.closedAt < args.since) {
        return false;
      }
      if (args.channel && session.channel !== args.channel) {
        return false;
      }
      return true;
    });
  },
});

export const listObjectActionsSince = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    actionType: v.string(),
    since: v.number(),
  },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("objectActions")
      .withIndex("by_org_action_type", (q) =>
        q.eq("organizationId", args.organizationId).eq("actionType", args.actionType)
      )
      .collect();
    return rows.filter((row) => row.performedAt >= args.since);
  },
});

export const storeWeekendReportArtifact = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    agentId: v.id("objects"),
    weekKey: v.string(),
    reportMarkdown: v.string(),
    metrics: v.object({
      totalSessions: v.number(),
      summarizedSessions: v.number(),
      escalationCount: v.number(),
      weekendContacts: v.number(),
      extractedTasks: v.number(),
    }),
    trigger: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const reportId = await ctx.db.insert("objects", {
      organizationId: args.organizationId,
      type: "weekend_report",
      subtype: "monday_briefing",
      name: `Weekend report ${args.weekKey}`,
      description: "Auto-generated Monday weekend operator report.",
      status: "active",
      customProperties: {
        contractVersion: WEEKEND_REPORT_CONTRACT_VERSION,
        weekKey: args.weekKey,
        reportMarkdown: args.reportMarkdown,
        metrics: args.metrics,
        trigger: args.trigger,
      },
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("objectActions", {
      organizationId: args.organizationId,
      objectId: reportId,
      actionType: "weekend_report_generated",
      actionData: {
        contractVersion: WEEKEND_REPORT_CONTRACT_VERSION,
        weekKey: args.weekKey,
        metrics: args.metrics,
      },
      performedAt: now,
    });

    return { reportId };
  },
});

export const markWeekendReportDelivered = internalMutation({
  args: {
    agentId: v.id("objects"),
    weekKey: v.string(),
    reportId: v.id("objects"),
    deliveredChannels: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.agentId);
    if (!agent || agent.type !== "org_agent") {
      return { success: false };
    }
    const customProps = (agent.customProperties || {}) as Record<string, unknown>;
    const config = readWeekendModeConfig(customProps.weekendMode);
    config.lastReportWeekKey = args.weekKey;
    config.lastReportGeneratedAt = Date.now();
    await ctx.db.patch(agent._id, {
      customProperties: {
        ...customProps,
        weekendMode: serializeWeekendModeConfig(config),
      },
      updatedAt: Date.now(),
    });
    await ctx.db.insert("objectActions", {
      organizationId: agent.organizationId,
      objectId: args.reportId,
      actionType: "weekend_report_delivered",
      actionData: {
        weekKey: args.weekKey,
        channels: args.deliveredChannels,
      },
      performedAt: Date.now(),
    });
    return { success: true };
  },
});

async function buildMondayReportMarkdown(args: {
  weekendSummaries: string[];
  escalationCount: number;
  weekendContacts: number;
  extractedTasks: number;
}): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const fallback = [
    "## Weekend Snapshot",
    `- Calls handled: ${args.weekendSummaries.length}`,
    `- Escalations: ${args.escalationCount}`,
    `- New weekend contacts: ${args.weekendContacts}`,
    `- Extracted tasks: ${args.extractedTasks}`,
    "",
    "## Action Focus",
    "1. Review all high-urgency call summaries first.",
    "2. Triage follow-up tasks into today/this-week buckets.",
    "3. Confirm escalations are assigned and acknowledged.",
  ].join("\n");
  if (!apiKey) {
    return fallback;
  }

  try {
    const client = new OpenRouterClient(apiKey);
    const response = await client.chatCompletion({
      model: "openai/gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Create a concise Monday morning weekend-ops report in Markdown. " +
            "Use sections: Weekend Snapshot, Conversation Categories, Action Items, Urgent Follow-ups, First-Hour Plan.",
        },
        {
          role: "user",
          content: JSON.stringify(
            {
              metrics: {
                callsHandled: args.weekendSummaries.length,
                escalationCount: args.escalationCount,
                weekendContacts: args.weekendContacts,
                extractedTasks: args.extractedTasks,
              },
              summaries: args.weekendSummaries.slice(0, 40),
            },
            null,
            2
          ),
        },
      ],
      max_tokens: 650,
      temperature: 0.2,
    });
    const content = response?.choices?.[0]?.message?.content;
    if (typeof content === "string" && content.trim().length > 0) {
      return content.trim();
    }
    return fallback;
  } catch (error) {
    console.warn("[WeekendMode] Monday report LLM synthesis failed", error);
    return fallback;
  }
}

export const generateMondayReportForOrganization = internalAction({
  args: {
    organizationId: v.id("organizations"),
    agentId: v.optional(v.id("objects")),
    force: v.optional(v.boolean()),
    trigger: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const weekendAgents = await ctx.runQuery(
      generatedApi.internal.ai.weekendMode.listWeekendModeEnabledAgents,
      { organizationId: args.organizationId }
    );
    const selectedAgent = args.agentId
      ? weekendAgents.find((agent: any) => String(agent._id) === String(args.agentId))
      : selectPreferredWeekendAgent(weekendAgents as any[]);
    if (!selectedAgent) {
      return { success: false, skipped: "no_weekend_agent" as const };
    }

    const weekendRuntime = resolveWeekendModeRuntimeContract({
      weekendModeRaw: (selectedAgent.customProperties as Record<string, unknown> | undefined)?.weekendMode,
    });
    const currentWeekKey = deriveWeekKey(weekendRuntime.clock);
    const config = readWeekendModeConfig(
      (selectedAgent.customProperties as Record<string, unknown> | undefined)?.weekendMode
    );

    if (!args.force) {
      if (weekendRuntime.clock.weekday !== "mon") {
        return { success: false, skipped: "not_monday_local" as const };
      }
      if (weekendRuntime.active) {
        return { success: false, skipped: "weekend_window_still_active" as const };
      }
      if (config.lastReportWeekKey === currentWeekKey) {
        return { success: true, skipped: "already_generated_this_week" as const };
      }
    }

    const since = Date.now() - config.reportLookbackHours * 60 * 60 * 1000;
    const closedSessions = await ctx.runQuery(
      generatedApi.internal.ai.weekendMode.listClosedSessionsSince,
      {
        organizationId: args.organizationId,
        since,
        channel: "phone_call",
      }
    );
    const weekendSessions = closedSessions.filter((session: any) => {
      if (!session.summary?.text) return false;
      if ((session.weekendMode as Record<string, unknown> | undefined)?.weekendWindowActiveAtOpen) {
        return true;
      }
      const runtimeAtStart = resolveWeekendModeRuntimeContract({
        weekendModeRaw:
          (selectedAgent.customProperties as Record<string, unknown> | undefined)?.weekendMode,
        timestamp: session.startedAt,
      });
      return runtimeAtStart.active;
    });
    const weekendSummaries = weekendSessions
      .map((session: any) => normalizeOptionalString(session.summary?.text))
      .filter((summary: string | undefined): summary is string => Boolean(summary))
      .slice(0, 40);

    const [escalationActions, contactActions, extractionActions] = await Promise.all([
      ctx.runQuery(generatedApi.internal.ai.weekendMode.listObjectActionsSince, {
        organizationId: args.organizationId,
        actionType: "escalation_created",
        since,
      }),
      ctx.runQuery(generatedApi.internal.ai.weekendMode.listObjectActionsSince, {
        organizationId: args.organizationId,
        actionType: "weekend_contact_auto_created",
        since,
      }),
      ctx.runQuery(generatedApi.internal.ai.weekendMode.listObjectActionsSince, {
        organizationId: args.organizationId,
        actionType: "weekend_task_extracted",
        since,
      }),
    ]);

    const reportMarkdown = await buildMondayReportMarkdown({
      weekendSummaries,
      escalationCount: escalationActions.length,
      weekendContacts: contactActions.length,
      extractedTasks: extractionActions.length,
    });

    const reportArtifact = await ctx.runMutation(
      generatedApi.internal.ai.weekendMode.storeWeekendReportArtifact,
      {
        organizationId: args.organizationId,
        agentId: selectedAgent._id,
        weekKey: currentWeekKey,
        reportMarkdown,
        metrics: {
          totalSessions: closedSessions.length,
          summarizedSessions: weekendSummaries.length,
          escalationCount: escalationActions.length,
          weekendContacts: contactActions.length,
          extractedTasks: extractionActions.length,
        },
        trigger: args.trigger || "manual_or_cron",
      }
    );

    const deliveredChannels: string[] = ["in_app"];
    if (config.reportChannel === "email") {
      const toEmail =
        config.reportDeliveryEmail ||
        (await ctx.runQuery(generatedApi.internal.ai.escalation.getOrgOwnerEmail, {
          organizationId: args.organizationId,
        }));
      if (toEmail) {
        try {
          await ctx.runAction(generatedApi.internal.emailDelivery.sendEmailWithDefaultSender, {
            to: toEmail,
            subject: "Monday Weekend Operator Report",
            html: `<pre style="white-space:pre-wrap;font-family:ui-monospace, SFMono-Regular, Menlo, monospace;">${reportMarkdown}</pre>`,
            text: reportMarkdown,
          });
          deliveredChannels.push("email");
        } catch (error) {
          console.warn("[WeekendMode] Failed to deliver Monday report via email", error);
        }
      }
    } else if (config.reportChannel === "telegram") {
      const mapping = await ctx.runQuery(generatedApi.internal.ai.escalation.getOrgTelegramMapping, {
        organizationId: args.organizationId,
      });
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      const chatId = config.reportDeliveryTelegramChatId || mapping?.telegramChatId;
      if (botToken && chatId) {
        try {
          const telegramText =
            reportMarkdown.length > 3900
              ? `${reportMarkdown.slice(0, 3900)}\n\n(Truncated)`
              : reportMarkdown;
          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              chat_id: chatId,
              text: telegramText,
            }),
          });
          deliveredChannels.push("telegram");
        } catch (error) {
          console.warn("[WeekendMode] Failed to deliver Monday report via Telegram", error);
        }
      }
    }

    await ctx.runMutation(generatedApi.internal.ai.weekendMode.markWeekendReportDelivered, {
      agentId: selectedAgent._id,
      weekKey: currentWeekKey,
      reportId: reportArtifact.reportId,
      deliveredChannels,
    });

    return {
      success: true,
      reportId: reportArtifact.reportId,
      deliveredChannels,
      metrics: {
        totalSessions: closedSessions.length,
        summarizedSessions: weekendSummaries.length,
        escalationCount: escalationActions.length,
        weekendContacts: contactActions.length,
        extractedTasks: extractionActions.length,
      },
    };
  },
});

export const generateMondayMorningReports = internalAction({
  args: {},
  handler: async (ctx) => {
    const agents = await ctx.runQuery(
      generatedApi.internal.ai.weekendMode.listWeekendModeEnabledAgents,
      {}
    );
    const orgToAgent = new Map<
      string,
      { agentId: Id<"objects">; isPrimary: boolean; isPersonalOperator: boolean; score: number }
    >();
    for (const agent of agents as Array<{
      _id: Id<"objects">;
      organizationId: Id<"organizations">;
      customProperties?: Record<string, unknown>;
    }>) {
      const key = String(agent.organizationId);
      const isPrimary =
        (agent.customProperties as Record<string, unknown> | undefined)?.isPrimary === true;
      const isPersonalOperator = isPersonalOperatorAgentCandidate(agent);
      const score = (isPersonalOperator ? 2 : 0) + (isPrimary ? 1 : 0);
      const existing = orgToAgent.get(key);
      if (!existing || score > existing.score) {
        orgToAgent.set(key, { agentId: agent._id, isPrimary, isPersonalOperator, score });
      }
    }

    const results: Array<Record<string, unknown>> = [];
    for (const [orgKey, selection] of orgToAgent.entries()) {
      try {
        const result = await ctx.runAction(
          generatedApi.internal.ai.weekendMode.generateMondayReportForOrganization,
          {
            organizationId: orgKey as Id<"organizations">,
            agentId: selection.agentId,
            trigger: "monday_cron",
          }
        );
        results.push({
          organizationId: orgKey,
          result,
        });
      } catch (error) {
        results.push({
          organizationId: orgKey,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return {
      processedOrganizations: orgToAgent.size,
      results,
    };
  },
});

export const enforceWeekendModeSchedules = internalAction({
  args: {},
  handler: async (ctx) => {
    const agents = await ctx.runQuery(
      generatedApi.internal.ai.weekendMode.listWeekendModeEnabledAgents,
      {}
    );
    const now = Date.now();
    const organizationsNeedingReports = new Set<string>();
    let changed = 0;
    for (const agent of agents as Array<{
      _id: Id<"objects">;
      organizationId: Id<"organizations">;
      customProperties?: Record<string, unknown>;
    }>) {
      const config = readWeekendModeConfig(
        (agent.customProperties as Record<string, unknown> | undefined)?.weekendMode
      );
      const runtime = resolveWeekendModeRuntimeContract({
        weekendModeRaw:
          (agent.customProperties as Record<string, unknown> | undefined)?.weekendMode,
        timestamp: now,
      });
      if (config.active === runtime.active) {
        continue;
      }
      changed += 1;
      await ctx.runMutation(generatedApi.internal.ai.weekendMode.syncAgentWeekendModeState, {
        agentId: agent._id,
        nextActive: runtime.active,
        observedAt: now,
        reason: "cron_enforcement",
      });
      if (config.active && !runtime.active) {
        organizationsNeedingReports.add(String(agent.organizationId));
      }
    }

    const reportResults: Array<Record<string, unknown>> = [];
    for (const organizationId of organizationsNeedingReports) {
      try {
        const result = await ctx.runAction(
          generatedApi.internal.ai.weekendMode.generateMondayReportForOrganization,
          {
            organizationId: organizationId as Id<"organizations">,
            trigger: "weekend_state_transition",
          }
        );
        reportResults.push({
          organizationId,
          result,
        });
      } catch (error) {
        reportResults.push({
          organizationId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return {
      scanned: Array.isArray(agents) ? agents.length : 0,
      changed,
      reportAttempts: organizationsNeedingReports.size,
      reportResults,
    };
  },
});
