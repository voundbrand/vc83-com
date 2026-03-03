const MAX_CONTEXT_SNIPPET_LENGTH = 280;

function normalizeSnippet(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const collapsed = value.replace(/\s+/g, " ").trim();
  if (!collapsed) {
    return undefined;
  }

  if (collapsed.length <= MAX_CONTEXT_SNIPPET_LENGTH) {
    return collapsed;
  }

  return `${collapsed.slice(0, MAX_CONTEXT_SNIPPET_LENGTH - 1)}...`;
}

export type MobileFrontlineFeatureIntakeTrigger =
  | "tool_failure"
  | "manual_feedback"
  | "manual_intake";

export interface MobileFrontlineFeatureIntakeKickoffArgs {
  failedToolName?: string;
  boundaryReason?: string;
  lastUserMessage?: string;
  trigger?: MobileFrontlineFeatureIntakeTrigger;
}

export interface MobileToolBoundaryCtaArgs {
  policyError: string | null | undefined;
  lastUserMessage?: string;
}

export function shouldShowMobileToolBoundaryCta(
  policyError: string | null | undefined
): boolean {
  return typeof policyError === "string" && policyError.trim().length > 0;
}

export function buildMobileFrontlineFeatureIntakeKickoff(
  args: MobileFrontlineFeatureIntakeKickoffArgs = {}
): string {
  const lines: string[] = [
    "You are now the frontline product partner in this same conversation.",
    `trigger=${args.trigger || "manual_intake"}`,
    `failed_tool=${args.failedToolName || "unknown"}`,
    `boundary_reason=${args.boundaryReason || "not_provided"}`,
    `operator_original_request=${args.lastUserMessage || "not_captured"}`,
    "",
    "Tone and language:",
    "1) Use natural human language, no product jargon.",
    "2) Ask questions like: 'What's missing right now?' and 'What do you need that doesn't work yet?'",
    "3) Keep it warm, short, and one question at a time.",
    "",
    "Interview contract:",
    "1) Start with the highest-leverage question and wait for my answer before the next question.",
    "2) Capture required fields: desired outcome, current workflow, exact blocker, urgency, frequency, business impact, success criteria, and ideal UX.",
    "3) Offer a practical workaround if possible, but keep gathering requirements until the request is complete.",
    "4) Reflect back a concise draft in the user's own words and ask for explicit confirmation.",
    "5) Only after explicit confirmation, call request_feature with featureDescription, userMessage, userElaboration, suggestedToolName, and category.",
    "",
    "Start now with: What's missing right now, and what do you need that doesn't work yet?",
  ];

  return lines.join("\n");
}

export function buildMobileToolBoundaryIntakeKickoff(
  args: MobileToolBoundaryCtaArgs
): string | null {
  if (!shouldShowMobileToolBoundaryCta(args.policyError)) {
    return null;
  }

  return buildMobileFrontlineFeatureIntakeKickoff({
    trigger: "tool_failure",
    failedToolName: "unknown",
    boundaryReason: normalizeSnippet(args.policyError || undefined),
    lastUserMessage: normalizeSnippet(args.lastUserMessage),
  });
}
