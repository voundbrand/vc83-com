/**
 * PLATFORM ALERTS
 *
 * Sends alerts to platform administrators for critical issues
 * like OpenRouter API failures, payment issues, etc.
 */

import { action } from "../_generated/server";
import { v } from "convex/values";
import { Resend } from "resend";

// Admin email for platform alerts
const ADMIN_EMAIL = "service@l4yercak3.com";

export type SloMetricKey =
  | "tool_success_rate"
  | "model_fallback_rate"
  | "p95_response_latency_ms"
  | "cost_per_successful_task_usd"
  | "escalation_rate";

export interface SloThresholdDefinition {
  displayName: string;
  unit: "ratio" | "ms" | "usd";
  direction: "min" | "max";
  target: number;
  warningThreshold: number;
  criticalThreshold: number;
  windowHours: number;
}

export type SloAlertSeverity = "ok" | "warning" | "critical";

export const SLO_ALERT_THRESHOLDS: Record<SloMetricKey, SloThresholdDefinition> = {
  tool_success_rate: {
    displayName: "Tool success rate",
    unit: "ratio",
    direction: "min",
    target: 0.98,
    warningThreshold: 0.97,
    criticalThreshold: 0.95,
    windowHours: 24,
  },
  model_fallback_rate: {
    displayName: "Model fallback rate",
    unit: "ratio",
    direction: "max",
    target: 0.03,
    warningThreshold: 0.05,
    criticalThreshold: 0.08,
    windowHours: 24,
  },
  p95_response_latency_ms: {
    displayName: "P95 response latency",
    unit: "ms",
    direction: "max",
    target: 8000,
    warningThreshold: 10000,
    criticalThreshold: 15000,
    windowHours: 24,
  },
  cost_per_successful_task_usd: {
    displayName: "Cost per successful task",
    unit: "usd",
    direction: "max",
    target: 0.08,
    warningThreshold: 0.12,
    criticalThreshold: 0.2,
    windowHours: 24,
  },
  escalation_rate: {
    displayName: "Escalation rate",
    unit: "ratio",
    direction: "max",
    target: 0.04,
    warningThreshold: 0.06,
    criticalThreshold: 0.1,
    windowHours: 24,
  },
};

export interface SloEvaluation {
  metric: SloMetricKey;
  observedValue: number;
  severity: SloAlertSeverity;
  thresholdValue?: number;
}

export function evaluateSloMetric(
  metric: SloMetricKey,
  observedValue: number
): SloEvaluation {
  const threshold = SLO_ALERT_THRESHOLDS[metric];
  const safeObserved = Number.isFinite(observedValue) ? observedValue : 0;

  if (threshold.direction === "min") {
    if (safeObserved < threshold.criticalThreshold) {
      return {
        metric,
        observedValue: safeObserved,
        severity: "critical",
        thresholdValue: threshold.criticalThreshold,
      };
    }
    if (safeObserved < threshold.warningThreshold) {
      return {
        metric,
        observedValue: safeObserved,
        severity: "warning",
        thresholdValue: threshold.warningThreshold,
      };
    }
    return { metric, observedValue: safeObserved, severity: "ok" };
  }

  if (safeObserved > threshold.criticalThreshold) {
    return {
      metric,
      observedValue: safeObserved,
      severity: "critical",
      thresholdValue: threshold.criticalThreshold,
    };
  }
  if (safeObserved > threshold.warningThreshold) {
    return {
      metric,
      observedValue: safeObserved,
      severity: "warning",
      thresholdValue: threshold.warningThreshold,
    };
  }
  return { metric, observedValue: safeObserved, severity: "ok" };
}

export const sendPlatformAlert = action({
  args: {
    alertType: v.union(
      v.literal("openrouter_payment"),
      v.literal("openrouter_error"),
      v.literal("rate_limit"),
      v.literal("service_outage"),
      v.literal("slo_breach")
    ),
    errorMessage: v.string(),
    organizationId: v.optional(v.id("organizations")),
    userId: v.optional(v.id("users")),
    context: v.optional(v.string()), // e.g., "page_builder", "chat"
    sloMetric: v.optional(v.union(
      v.literal("tool_success_rate"),
      v.literal("model_fallback_rate"),
      v.literal("p95_response_latency_ms"),
      v.literal("cost_per_successful_task_usd"),
      v.literal("escalation_rate")
    )),
    observedValue: v.optional(v.number()),
    thresholdValue: v.optional(v.number()),
    windowHours: v.optional(v.number()),
    severity: v.optional(v.union(v.literal("warning"), v.literal("critical"))),
  },
  handler: async (ctx, args) => {
    const resendApiKey = process.env.RESEND_API_KEY;

    if (!resendApiKey) {
      console.error("[Platform Alert] RESEND_API_KEY not configured");
      return { success: false, error: "Email service not configured" };
    }

    const resend = new Resend(resendApiKey);

    const computedSloEvaluation =
      args.alertType === "slo_breach"
      && args.sloMetric
      && typeof args.observedValue === "number"
        ? evaluateSloMetric(args.sloMetric, args.observedValue)
        : null;

    const derivedSloSeverity =
      args.severity
      ?? (computedSloEvaluation?.severity === "critical" ? "critical" : undefined)
      ?? (computedSloEvaluation?.severity === "warning" ? "warning" : undefined);

    const effectiveThresholdValue =
      args.thresholdValue ?? computedSloEvaluation?.thresholdValue;

    // Build alert subject and body based on type
    let subject: string;
    let urgency: string;

    switch (args.alertType) {
      case "openrouter_payment":
        subject = "🚨 URGENT: OpenRouter Payment Issue (402)";
        urgency = "HIGH";
        break;
      case "openrouter_error":
        subject = "⚠️ OpenRouter API Error";
        urgency = "MEDIUM";
        break;
      case "rate_limit":
        subject = "⚠️ OpenRouter Rate Limit Hit";
        urgency = "LOW";
        break;
      case "service_outage":
        subject = "🚨 URGENT: AI Service Outage";
        urgency = "HIGH";
        break;
      case "slo_breach":
        if (derivedSloSeverity === "critical") {
          subject = "🚨 URGENT: AI SLO Critical Breach";
          urgency = "HIGH";
        } else {
          subject = "⚠️ AI SLO Warning Breach";
          urgency = "MEDIUM";
        }
        break;
      default:
        subject = "⚠️ Platform Alert";
        urgency = "MEDIUM";
    }

    const timestamp = new Date().toISOString();

    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: ${urgency === "HIGH" ? "#dc2626" : "#f59e0b"}; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
    .field { margin-bottom: 12px; }
    .label { font-weight: 600; color: #6b7280; font-size: 12px; text-transform: uppercase; }
    .value { margin-top: 4px; padding: 8px 12px; background: white; border: 1px solid #e5e7eb; border-radius: 4px; font-family: monospace; font-size: 14px; }
    .error { color: #dc2626; }
    .action { margin-top: 20px; padding: 16px; background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; }
    .action-title { font-weight: 600; color: #92400e; margin-bottom: 8px; }
    .action-link { display: inline-block; margin-top: 8px; padding: 8px 16px; background: #f59e0b; color: white; text-decoration: none; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 20px;">${subject}</h1>
      <p style="margin: 8px 0 0 0; opacity: 0.9;">Platform Alert - ${timestamp}</p>
    </div>
    <div class="content">
      <div class="field">
        <div class="label">Alert Type</div>
        <div class="value">${args.alertType}</div>
      </div>

      <div class="field">
        <div class="label">Error Message</div>
        <div class="value error">${args.errorMessage}</div>
      </div>

      ${args.context ? `
      <div class="field">
        <div class="label">Context</div>
        <div class="value">${args.context}</div>
      </div>
      ` : ""}

      ${args.alertType === "slo_breach" && args.sloMetric ? `
      <div class="field">
        <div class="label">SLO Metric</div>
        <div class="value">${args.sloMetric}</div>
      </div>
      ` : ""}

      ${args.alertType === "slo_breach" && typeof args.observedValue === "number" ? `
      <div class="field">
        <div class="label">Observed Value</div>
        <div class="value">${args.observedValue}</div>
      </div>
      ` : ""}

      ${args.alertType === "slo_breach" && typeof effectiveThresholdValue === "number" ? `
      <div class="field">
        <div class="label">Threshold Value</div>
        <div class="value">${effectiveThresholdValue}</div>
      </div>
      ` : ""}

      ${args.alertType === "slo_breach" && typeof args.windowHours === "number" ? `
      <div class="field">
        <div class="label">Window (Hours)</div>
        <div class="value">${args.windowHours}</div>
      </div>
      ` : ""}

      ${args.alertType === "slo_breach" && derivedSloSeverity ? `
      <div class="field">
        <div class="label">Severity</div>
        <div class="value">${derivedSloSeverity}</div>
      </div>
      ` : ""}

      ${args.organizationId ? `
      <div class="field">
        <div class="label">Organization ID</div>
        <div class="value">${args.organizationId}</div>
      </div>
      ` : ""}

      ${args.userId ? `
      <div class="field">
        <div class="label">User ID</div>
        <div class="value">${args.userId}</div>
      </div>
      ` : ""}

      <div class="field">
        <div class="label">Timestamp</div>
        <div class="value">${timestamp}</div>
      </div>

      ${args.alertType === "openrouter_payment" ? `
      <div class="action">
        <div class="action-title">Recommended Action</div>
        <p style="margin: 0;">OpenRouter API credits may be depleted. Please check and top up the account.</p>
        <a href="https://openrouter.ai/credits" class="action-link">Go to OpenRouter Credits →</a>
      </div>
      ` : args.alertType === "slo_breach" ? `
      <div class="action">
        <div class="action-title">Recommended Action</div>
        <p style="margin: 0;">Check SLO dashboard trends, identify the regression source, and pause broad model rollout until this metric recovers.</p>
      </div>
      ` : ""}
    </div>
  </div>
</body>
</html>
    `;

    const textBody = `
${subject}

Alert Type: ${args.alertType}
Error Message: ${args.errorMessage}
${args.context ? `Context: ${args.context}` : ""}
${args.alertType === "slo_breach" && args.sloMetric ? `SLO Metric: ${args.sloMetric}` : ""}
${args.alertType === "slo_breach" && typeof args.observedValue === "number" ? `Observed Value: ${args.observedValue}` : ""}
${args.alertType === "slo_breach" && typeof effectiveThresholdValue === "number" ? `Threshold Value: ${effectiveThresholdValue}` : ""}
${args.alertType === "slo_breach" && typeof args.windowHours === "number" ? `Window Hours: ${args.windowHours}` : ""}
${args.alertType === "slo_breach" && derivedSloSeverity ? `Severity: ${derivedSloSeverity}` : ""}
${args.organizationId ? `Organization ID: ${args.organizationId}` : ""}
${args.userId ? `User ID: ${args.userId}` : ""}
Timestamp: ${timestamp}

${args.alertType === "openrouter_payment" ? `
RECOMMENDED ACTION:
OpenRouter API credits may be depleted. Please check and top up the account.
https://openrouter.ai/credits
` : args.alertType === "slo_breach" ? `
RECOMMENDED ACTION:
Review SLO dashboards, identify the regression source, and pause broad model rollout until metrics recover.
` : ""}
    `.trim();

    try {
      const result = await resend.emails.send({
        from: "l4yercak3 <alerts@mail.l4yercak3.com>",
        to: ADMIN_EMAIL,
        subject,
        html: htmlBody,
        text: textBody,
      });

      console.log(`[Platform Alert] Sent ${args.alertType} alert to ${ADMIN_EMAIL}`);

      return { success: true, emailId: result.data?.id };
    } catch (error) {
      console.error("[Platform Alert] Failed to send email:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to send alert email",
      };
    }
  },
});
