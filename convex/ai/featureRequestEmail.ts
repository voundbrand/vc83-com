"use node";

/**
 * Feature Request Email Service
 *
 * Automatically sends feature request emails when AI tool executions fail,
 * helping the dev team understand what users are trying to do and prioritize features.
 */

import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { Resend } from "resend";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const generatedApi: any = require("../_generated/api");
import {
  EMAIL_BRAND,
  EMAIL_COLORS,
  EMAIL_STYLES,
  emailDarkWrapper,
  emailHeader,
  emailFooter,
  emailContentRow,
  emailHeading,
  emailParagraph,
  emailInfoBox,
  emailDivider,
} from "../lib/emailBrandConstants";

const createResendClient = () => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY not configured");
  }
  return new Resend(apiKey);
};

/**
 * Send feature request email when a tool fails
 */
export const sendFeatureRequest = internalAction({
  args: {
    userId: v.id("users"),
    organizationId: v.id("organizations"),
    toolName: v.string(),
    toolParameters: v.any(),
    errorMessage: v.string(),
    conversationId: v.id("aiConversations"),
    userMessage: v.string(),
    aiResponse: v.optional(v.string()),
    occurredAt: v.number(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; emailId?: string; linearIssue?: { issueId: string; issueNumber: string; issueUrl: string } }> => {
    const user: any = await (ctx as any).runQuery(generatedApi.internal.ai.tools.internalToolMutations.getUserById, { userId: args.userId });
    const org: any = await (ctx as any).runQuery(generatedApi.internal.ai.tools.internalToolMutations.getOrganizationById, { organizationId: args.organizationId });

    const userEmail = user?.email || "unknown@example.com";
    const userName = user?.displayName || user?.name || "Unknown User";
    const organizationName = org?.name || "Unknown Organization";
    const resend = createResendClient();
    const fromEmail = process.env.AUTH_RESEND_FROM || "l4yercak3 <team@mail.l4yercak3.com>";

    const subject = `Feature Request: ${args.toolName} - User: ${userName}`;

    const emailData = {
      userEmail,
      userName,
      organizationId: args.organizationId,
      organizationName,
      toolName: args.toolName,
      toolParameters: args.toolParameters,
      errorMessage: args.errorMessage,
      conversationId: args.conversationId,
      userMessage: args.userMessage,
      aiResponse: args.aiResponse,
      occurredAt: args.occurredAt,
    };

    const html = getFeatureRequestEmailHTML(emailData);
    const text = getFeatureRequestEmailText(emailData);

    // 1. Create Linear issue first (if configured)
    let linearResult: { issueId: string; issueNumber: string; issueUrl: string } | null = null;

    if (process.env.LINEAR_API_KEY && process.env.LINEAR_TEAM_ID) {
      try {
        linearResult = await (ctx as any).runAction(generatedApi.internal.ai.linearActions.createFeatureRequestIssue, {
          userName,
          userEmail,
          organizationName,
          toolName: args.toolName,
          featureDescription: args.toolParameters.featureDescription || `Feature: ${args.toolName}`,
          userMessage: args.userMessage,
          userElaboration: args.toolParameters.userElaboration,
          category: args.toolParameters.category || "general",
          conversationId: args.conversationId,
          occurredAt: args.occurredAt,
        });

        console.log(`[Feature Request] Linear issue created: ${linearResult?.issueNumber}`);
      } catch (linearError: any) {
        console.error("Failed to create Linear issue:", linearError);
      }
    } else {
      console.log("[Feature Request] Linear not configured, skipping issue creation");
    }

    // 2. Send email notification (with Linear link if created)
    const emailSubjectSuffix = linearResult ? ` [${linearResult.issueNumber}]` : "";
    const emailBodyPrefix = linearResult ? emailInfoBox(`
      <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:${EMAIL_COLORS.success};">Linear Issue Created</p>
      <p style="margin:0;font-size:13px;color:${EMAIL_COLORS.textSecondary};">
        <strong style="color:${EMAIL_COLORS.textPrimary};">Issue:</strong> <a href="${linearResult.issueUrl}" style="color:${EMAIL_COLORS.accent};">${linearResult.issueNumber}</a><br>
        <strong style="color:${EMAIL_COLORS.textPrimary};">Status:</strong> The issue has been automatically created and is ready for triage.
      </p>
    `, { borderColor: EMAIL_COLORS.success }) : "";

    try {
      const { data, error } = await resend.emails.send({
        from: fromEmail,
        replyTo: userEmail,
        to: process.env.SALES_EMAIL || "sales@l4yercak3.com",
        subject: subject + emailSubjectSuffix,
        html: emailBodyPrefix ? emailDarkWrapper(
          emailHeader({ subtitle: "Feature Request" }) +
          emailContentRow(emailBodyPrefix) +
          html.replace(/^<!DOCTYPE html>[\s\S]*?<body[^>]*>/, "").replace(/<\/body>[\s\S]*$/, "")
        ) : html,
        text: linearResult
          ? `Linear Issue Created: ${linearResult.issueNumber}\nView at: ${linearResult.issueUrl}\n\n${text}`
          : text,
        headers: {
          'X-Entity-Ref-ID': `feature-request-${args.conversationId}-${Date.now()}`,
        },
      });

      if (error) {
        console.error("Failed to send feature request email:", error);
        throw new Error(`Feature request email failed: ${error.message}`);
      }

      console.log("Feature request email sent successfully:", data);
      return {
        success: true,
        emailId: data?.id,
        linearIssue: linearResult ? {
          issueId: linearResult.issueId,
          issueNumber: linearResult.issueNumber,
          issueUrl: linearResult.issueUrl,
        } : undefined
      };
    } catch (error) {
      console.error("Error sending feature request email:", error);
      throw error;
    }
  },
});

/**
 * Generate HTML email for feature request
 */
function getFeatureRequestEmailHTML(args: {
  userEmail: string;
  userName: string;
  organizationId: string;
  organizationName: string;
  toolName: string;
  toolParameters: any;
  errorMessage: string;
  conversationId: string;
  userMessage: string;
  aiResponse?: string;
  occurredAt: number;
}): string {
  const timestamp = new Date(args.occurredAt).toLocaleString('en-US', {
    dateStyle: 'full',
    timeStyle: 'long',
  });

  const infoRow = (label: string, value: string) =>
    `<tr>
      <td style="padding:6px 0;color:${EMAIL_COLORS.textSecondary};font-weight:600;width:140px;font-size:13px;vertical-align:top;">${label}:</td>
      <td style="padding:6px 0;color:${EMAIL_COLORS.textPrimary};font-size:13px;">${value}</td>
    </tr>`;

  return emailDarkWrapper(
    emailHeader({ subtitle: "A user tried to use a tool that needs implementation" }) +
    emailContentRow(
      emailHeading("Feature Request") +

      // User Context
      emailInfoBox(`
        <p style="margin:0 0 12px;font-size:15px;font-weight:600;color:${EMAIL_COLORS.textPrimary};">User Information</p>
        <table style="width:100%;border-collapse:collapse;">
          ${infoRow("Name", args.userName)}
          ${infoRow("Email", args.userEmail)}
          ${infoRow("Organization", args.organizationName)}
          ${infoRow("Timestamp", timestamp)}
        </table>
      `, { borderColor: EMAIL_COLORS.info }) +

      // What the User Wanted
      `<div style="background:${EMAIL_COLORS.surfaceRaised};border:1px solid ${EMAIL_COLORS.border};border-radius:${EMAIL_STYLES.cardRadius};padding:16px 20px;margin:16px 0;">
        <p style="margin:0 0 12px;font-size:15px;font-weight:600;color:${EMAIL_COLORS.textPrimary};">What the User Said</p>
        <blockquote style="margin:0;padding:12px;background:${EMAIL_COLORS.surface};border-left:3px solid ${EMAIL_COLORS.accent};font-style:italic;color:${EMAIL_COLORS.textSecondary};border-radius:4px;">
          "${args.userMessage}"
        </blockquote>
      </div>` +

      // User's Detailed Elaboration
      (args.toolParameters?.userElaboration ? `
      <div style="background:${EMAIL_COLORS.surfaceRaised};border:1px solid ${EMAIL_COLORS.border};border-radius:${EMAIL_STYLES.cardRadius};padding:16px 20px;margin:16px 0;">
        <p style="margin:0 0 12px;font-size:15px;font-weight:600;color:${EMAIL_COLORS.textPrimary};">User's Detailed Requirements</p>
        <blockquote style="margin:0;padding:12px;background:${EMAIL_COLORS.surface};border-left:3px solid ${EMAIL_COLORS.success};color:${EMAIL_COLORS.textSecondary};border-radius:4px;">
          "${args.toolParameters.userElaboration}"
        </blockquote>
        <p style="margin:8px 0 0;font-size:12px;color:${EMAIL_COLORS.textTertiary};font-style:italic;">This elaboration was requested by the AI to better understand the user's needs</p>
      </div>
      ` : '') +

      // Tool That Failed
      emailInfoBox(`
        <p style="margin:0 0 12px;font-size:15px;font-weight:600;color:${EMAIL_COLORS.textPrimary};">Tool Attempted</p>
        <table style="width:100%;border-collapse:collapse;">
          ${infoRow("Tool Name", `<code style="background:${EMAIL_COLORS.surface};padding:2px 6px;border-radius:3px;font-family:${EMAIL_STYLES.monoStack};">${args.toolName}</code>`)}
        </table>
        <p style="margin:12px 0 4px;color:${EMAIL_COLORS.textSecondary};font-weight:600;font-size:13px;">Parameters:</p>
        <pre style="background:${EMAIL_COLORS.surface};padding:10px;border-radius:4px;overflow-x:auto;font-size:12px;margin:0;font-family:${EMAIL_STYLES.monoStack};color:${EMAIL_COLORS.textPrimary};border:1px solid ${EMAIL_COLORS.border};">${JSON.stringify(args.toolParameters, null, 2)}</pre>
      `, { borderColor: EMAIL_COLORS.error }) +

      // Error Details
      emailInfoBox(`
        <p style="margin:0 0 12px;font-size:15px;font-weight:600;color:${EMAIL_COLORS.textPrimary};">Error Message</p>
        <pre style="background:${EMAIL_COLORS.surface};padding:12px;border-radius:4px;overflow-x:auto;font-size:13px;margin:0;color:${EMAIL_COLORS.warning};font-family:${EMAIL_STYLES.monoStack};white-space:pre-wrap;border:1px solid ${EMAIL_COLORS.border};">${args.errorMessage}</pre>
      `, { borderColor: EMAIL_COLORS.warning }) +

      // AI Response
      (args.aiResponse ? emailInfoBox(`
        <p style="margin:0 0 12px;font-size:15px;font-weight:600;color:${EMAIL_COLORS.textPrimary};">AI Response to User</p>
        <p style="margin:0;color:${EMAIL_COLORS.textSecondary};font-size:14px;">${args.aiResponse}</p>
      `, { borderColor: EMAIL_COLORS.success }) : '') +

      // Action Items
      emailDivider() +
      emailHeading("Recommended Actions", { level: 2 }) +
      `<ol style="margin:0;padding-left:20px;color:${EMAIL_COLORS.textSecondary};font-size:14px;line-height:2;">
        <li>Review the tool parameters to understand the user's intent</li>
        <li>Implement the <strong style="color:${EMAIL_COLORS.textPrimary};">${args.toolName}</strong> tool with proper validation</li>
        <li>Test the implementation with similar parameters</li>
        <li>Update the tool status from "placeholder" to "ready"</li>
        <li>Consider replying to <a href="mailto:${args.userEmail}" style="color:${EMAIL_COLORS.accent};">${args.userEmail}</a> when implemented</li>
      </ol>` +

      // Debug Info
      emailDivider() +
      `<p style="font-size:12px;color:${EMAIL_COLORS.textTertiary};">
        <strong>Debug Info:</strong><br>
        Conversation ID: <code style="background:${EMAIL_COLORS.surfaceRaised};padding:2px 4px;border-radius:2px;font-family:${EMAIL_STYLES.monoStack};">${args.conversationId}</code><br>
        Organization ID: <code style="background:${EMAIL_COLORS.surfaceRaised};padding:2px 4px;border-radius:2px;font-family:${EMAIL_STYLES.monoStack};">${args.organizationId}</code>
      </p>`
    ) +
    emailFooter({ extra: `${EMAIL_BRAND.name} AI Assistant — Automated Feature Request` })
  );
}

/**
 * Generate plain text email for feature request
 */
function getFeatureRequestEmailText(args: {
  userEmail: string;
  userName: string;
  organizationId: string;
  organizationName: string;
  toolName: string;
  toolParameters: any;
  errorMessage: string;
  conversationId: string;
  userMessage: string;
  aiResponse?: string;
  occurredAt: number;
}): string {
  const timestamp = new Date(args.occurredAt).toLocaleString('en-US', {
    dateStyle: 'full',
    timeStyle: 'long',
  });

  return `
FEATURE REQUEST: ${args.toolName}

A user tried to use a tool that needs implementation.

USER INFORMATION
====================
Name: ${args.userName}
Email: ${args.userEmail}
Organization: ${args.organizationName}
Timestamp: ${timestamp}

WHAT THE USER SAID (ORIGINAL REQUEST)
=========================================
"${args.userMessage}"

${args.toolParameters?.userElaboration ? `
USER'S DETAILED REQUIREMENTS
================================
"${args.toolParameters.userElaboration}"

This elaboration was requested by the AI to better understand the user's needs
` : ''}

TOOL ATTEMPTED
==================
Tool Name: ${args.toolName}
Parameters:
${JSON.stringify(args.toolParameters, null, 2)}

ERROR MESSAGE
=================
${args.errorMessage}

${args.aiResponse ? `
AI RESPONSE TO USER
=======================
${args.aiResponse}
` : ''}

RECOMMENDED ACTIONS
=======================
1. Review the tool parameters to understand the user's intent
2. Implement the ${args.toolName} tool with proper validation
3. Test the implementation with similar parameters
4. Update the tool status from "placeholder" to "ready"
5. Consider replying to ${args.userEmail} when implemented

DEBUG INFO
===========
Conversation ID: ${args.conversationId}
Organization ID: ${args.organizationId}

---
${EMAIL_BRAND.name} AI Assistant — Automated Feature Request
This email was generated automatically when a user attempted to use an unimplemented tool.
  `.trim();
}
