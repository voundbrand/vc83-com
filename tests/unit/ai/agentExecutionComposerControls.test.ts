import { describe, expect, it } from "vitest";
import {
  applyPlanSoftReadinessScoring,
  buildInboundPlanFeasibilityContext,
  buildInboundComposerRuntimeContext,
  resolveInboundComposerRuntimeControls,
  scorePlanSoftStepReadiness,
} from "../../../convex/ai/kernel/agentExecution";

describe("agentExecution composer runtime controls", () => {
  it("defaults to auto/medium with no references", () => {
    const result = resolveInboundComposerRuntimeControls({
      metadata: {},
      inboundMessage: "Help me draft a reply",
    });

    expect(result.mode).toBe("auto");
    expect(result.reasoningEffort).toBe("medium");
    expect(result.references).toEqual([]);
    expect(result.cleanedMessage).toBe("Help me draft a reply");
    expect(result.strippedFallbackEnvelope).toBe(false);
  });

  it("normalizes mode, reasoning effort, and valid references", () => {
    const result = resolveInboundComposerRuntimeControls({
      metadata: {
        mode: "plan",
        reasoningEffort: "high",
        references: [
          {
            url: "https://example.com/docs",
            status: "ready",
            content: "Reference body",
          },
          {
            url: "not-a-url",
            status: "ready",
            content: "Should be dropped",
          },
          {
            url: "https://example.com/error",
            error: "fetch failed",
          },
        ],
      },
      inboundMessage: "Use the docs and make a plan",
    });

    expect(result.mode).toBe("plan");
    expect(result.reasoningEffort).toBe("high");
    expect(result.references).toEqual([
      {
        url: "https://example.com/docs",
        status: "ready",
        content: "Reference body",
        error: undefined,
      },
      {
        url: "https://example.com/error",
        status: "error",
        content: undefined,
        error: "fetch failed",
      },
    ]);
  });

  it("supports plan_soft mode normalization", () => {
    const result = resolveInboundComposerRuntimeControls({
      metadata: {
        mode: "plan_soft",
      },
      inboundMessage: "Give me a phased rollout plan",
    });

    expect(result.mode).toBe("plan_soft");
  });

  it("strips composer fallback envelope from inbound message", () => {
    const wrappedMessage = [
      "[COMPOSER CONTROLS]",
      "chat_mode=plan",
      "[/COMPOSER CONTROLS]",
      "",
      "--- URL REFERENCES ---",
      "[1] URL: https://example.com",
      "STATUS: ready",
      "--- END URL REFERENCES ---",
      "",
      "USER MESSAGE:",
      "Need a launch plan",
    ].join("\n");

    const result = resolveInboundComposerRuntimeControls({
      metadata: {
        mode: "plan",
      },
      inboundMessage: wrappedMessage,
    });

    expect(result.cleanedMessage).toBe("Need a launch plan");
    expect(result.strippedFallbackEnvelope).toBe(true);
  });

  it("builds runtime context when controls are present", () => {
    const controls = resolveInboundComposerRuntimeControls({
      metadata: {
        mode: "plan",
        reasoningEffort: "extra_high",
        references: [
          {
            url: "https://example.com/guide",
            status: "ready",
            content: "Guide content",
          },
        ],
      },
      inboundMessage: "Create a plan",
    });

    const context = buildInboundComposerRuntimeContext(controls);

    expect(context).toContain("COMPOSER RUNTIME CONTROLS");
    expect(context).toContain("Planning mode is active");
    expect(context).toContain("Reasoning effort preference: extra_high");
    expect(context).toContain("https://example.com/guide");
    expect(context).toContain("Guide content");
  });

  it("compresses long reference content in runtime context", () => {
    const longContent = Array.from({ length: 30 })
      .map(
        (_, idx) =>
          `Sentence ${idx + 1}. This reference section includes deterministic details for rollout sequencing and operator handling.`
      )
      .join(" ");

    const controls = resolveInboundComposerRuntimeControls({
      metadata: {
        mode: "plan_soft",
        references: [
          {
            url: "https://example.com/long",
            status: "ready",
            content: longContent,
          },
        ],
      },
      inboundMessage: "Need feasibility-aware plan output",
    });

    const context = buildInboundComposerRuntimeContext(controls);

    expect(context).toContain("Plan-with-hints mode is active");
    expect(context).toContain("Reference summary:");
    expect(context).toContain("Summary compressed from");
  });

  it("ranks references against the active query and preserves attribution", () => {
    const controls = resolveInboundComposerRuntimeControls({
      metadata: {
        references: [
          {
            url: "https://example.com/slack-rollout",
            status: "ready",
            content:
              "Slack rollout checklist with deployment windows, channel setup, and incident responders.",
          },
          {
            url: "https://example.com/hr-policy",
            status: "ready",
            content: "Vacation policy and office closure schedule.",
          },
          {
            url: "https://example.com/pending",
            status: "loading",
          },
          {
            url: "https://example.com/failed",
            status: "error",
            error: "fetch failed",
          },
        ],
      },
      inboundMessage: "Build a Slack rollout plan with deployment safeguards",
    });

    const context = buildInboundComposerRuntimeContext(controls);

    expect(context).toContain("query-ranked");
    expect(context).toContain("Relevance signal:");
    expect(context).toContain("Status: ready");
    expect(context).toContain("https://example.com/slack-rollout");
    expect(context).not.toContain("https://example.com/failed");
    expect(context).toContain("Omitted lower-ranked references: 1.");
  });

  it("scores plan_soft steps with READY/BLOCKED/NEEDS_INFO statuses", () => {
    const blocked = scorePlanSoftStepReadiness({
      stepText: "Use send_email_from_template to notify users",
      availableToolNames: ["query_org_data", "send_email_from_template"],
      connectedIntegrations: ["gmail"],
      unavailableByIntegration: ["send_email_from_template"],
      unavailableByPolicy: [],
    });
    expect(blocked.status).toBe("BLOCKED");

    const ready = scorePlanSoftStepReadiness({
      stepText: "Use query_org_data to collect incident metadata",
      availableToolNames: ["query_org_data"],
      connectedIntegrations: [],
      unavailableByIntegration: [],
      unavailableByPolicy: [],
    });
    expect(ready.status).toBe("READY");

    const needsInfo = scorePlanSoftStepReadiness({
      stepText: "Deploy the workflow to production",
      availableToolNames: ["query_org_data"],
      connectedIntegrations: [],
      unavailableByIntegration: [],
      unavailableByPolicy: [],
    });
    expect(needsInfo.status).toBe("NEEDS_INFO");
  });

  it("appends deterministic plan_soft readiness scores to numbered plans", () => {
    const scored = applyPlanSoftReadinessScoring({
      assistantContent: [
        "1. Use query_org_data to gather tenant usage trends",
        "2. Use send_email_from_template to notify stakeholders",
      ].join("\n"),
      availableToolNames: ["query_org_data"],
      connectedIntegrations: [],
      unavailableByIntegration: ["send_email_from_template"],
      unavailableByPolicy: [],
    });

    expect(scored).toContain("PLAN SOFT READINESS SCORES");
    expect(scored).toContain("Step 1: READY");
    expect(scored).toContain("Step 2: BLOCKED");
  });

  it("appends deterministic plan_soft readiness scores to non-numbered plans", () => {
    const scored = applyPlanSoftReadinessScoring({
      assistantContent: [
        "- Query tenant telemetry with query_org_data",
        "- Send notifications with send_email_from_template",
      ].join("\n"),
      availableToolNames: ["query_org_data"],
      connectedIntegrations: ["slack"],
      unavailableByIntegration: ["send_email_from_template"],
      unavailableByPolicy: [],
    });

    expect(scored).toContain("PLAN SOFT READINESS SCORES");
    expect(scored).toContain("Step 1: READY");
    expect(scored).toContain("Step 2: BLOCKED");
  });

  it("builds plan_soft feasibility context with deterministic scoring contract", () => {
    const context = buildInboundPlanFeasibilityContext({
      mode: "plan_soft",
      userMessage: "1. Query data\n2. Publish updates",
      availableToolNames: ["query_org_data"],
      connectedIntegrations: ["slack"],
      unavailableByIntegration: ["send_slack_message"],
      unavailableByPolicy: ["publish_checkout"],
    });

    expect(context).toContain("Readiness: READY|BLOCKED|NEEDS_INFO");
    expect(context).toContain("Pre-scored request cues");
    expect(context).toContain("Unavailable (policy/scope)");
  });
});
