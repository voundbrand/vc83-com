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
import { internal } from "../_generated/api";

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
    // User context
    userId: v.id("users"),
    organizationId: v.id("organizations"),

    // Tool details
    toolName: v.string(),
    toolParameters: v.any(),
    errorMessage: v.string(),

    // Conversation context
    conversationId: v.id("aiConversations"),
    userMessage: v.string(),
    aiResponse: v.optional(v.string()),

    // Timestamp
    occurredAt: v.number(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; emailId?: string; linearIssue?: { issueId: string; issueNumber: string; issueUrl: string } }> => {
    // Get user and org details from database
    // In AI chat context, there's always a logged-in user with session
    const user: any = await ctx.runQuery(internal.ai.tools.internalToolMutations.getUserById, { userId: args.userId });
    const org: any = await ctx.runQuery(internal.ai.tools.internalToolMutations.getOrganizationById, { organizationId: args.organizationId });

    const userEmail = user?.email || "unknown@example.com";
    const userName = user?.displayName || user?.name || "Unknown User";
    const organizationName = org?.name || "Unknown Organization";
    const resend = createResendClient();
    const fromEmail = process.env.AUTH_RESEND_FROM || "l4yercak3 <team@mail.l4yercak3.com>";

    // Build feature request email
    const subject = `🔧 Feature Request: ${args.toolName} - User: ${userName}`;

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
        linearResult = await ctx.runAction(internal.ai.linearActions.createFeatureRequestIssue, {
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
        // Don't fail the whole flow if Linear fails, just log it
        console.error("Failed to create Linear issue:", linearError);
      }
    } else {
      console.log("[Feature Request] Linear not configured, skipping issue creation");
    }

    // 2. Send email notification (with Linear link if created)
    const emailSubjectSuffix = linearResult ? ` [${linearResult.issueNumber}]` : "";
    const emailBodyPrefix = linearResult ? `
      <div style="background: #e0f2fe; border: 2px solid #0ea5e9; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
        <h3 style="margin: 0 0 10px 0; color: #0369a1;">✅ Linear Issue Created</h3>
        <p style="margin: 0; color: #0c4a6e;">
          <strong>Issue:</strong> <a href="${linearResult.issueUrl}" style="color: #0284c7;">${linearResult.issueNumber}</a><br>
          <strong>Status:</strong> The issue has been automatically created and is ready for triage.
        </p>
      </div>
    ` : "";

    try {
      const { data, error } = await resend.emails.send({
        from: fromEmail,
        replyTo: userEmail, // Allow dev team to reply directly to user
        to: "remington@l4yercak3.com",
        subject: subject + emailSubjectSuffix,
        html: emailBodyPrefix + html,
        text: linearResult
          ? `✅ Linear Issue Created: ${linearResult.issueNumber}\nView at: ${linearResult.issueUrl}\n\n${text}`
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

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Feature Request: ${args.toolName}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">

  <!-- Header -->
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px; margin-bottom: 20px;">
    <h1 style="margin: 0 0 10px 0; font-size: 24px;">🔧 Feature Request</h1>
    <p style="margin: 0; opacity: 0.9; font-size: 14px;">A user tried to use a tool that needs implementation</p>
  </div>

  <!-- User Context -->
  <div style="background: #f7fafc; border-left: 4px solid #4299e1; padding: 20px; margin-bottom: 20px; border-radius: 4px;">
    <h2 style="margin: 0 0 15px 0; font-size: 18px; color: #2d3748;">👤 User Information</h2>
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 8px 0; color: #718096; font-weight: 600; width: 140px;">Name:</td>
        <td style="padding: 8px 0; color: #2d3748;">${args.userName}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #718096; font-weight: 600;">Email:</td>
        <td style="padding: 8px 0; color: #2d3748;">${args.userEmail}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #718096; font-weight: 600;">Organization:</td>
        <td style="padding: 8px 0; color: #2d3748;">${args.organizationName}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #718096; font-weight: 600;">Timestamp:</td>
        <td style="padding: 8px 0; color: #2d3748;">${timestamp}</td>
      </tr>
    </table>
  </div>

  <!-- What the User Wanted -->
  <div style="background: #fff; border: 2px solid #e2e8f0; padding: 20px; margin-bottom: 20px; border-radius: 4px;">
    <h2 style="margin: 0 0 15px 0; font-size: 18px; color: #2d3748;">💬 What the User Said (Original Request)</h2>
    <blockquote style="margin: 0; padding: 15px; background: #f7fafc; border-left: 4px solid #9f7aea; font-style: italic; color: #4a5568;">
      "${args.userMessage}"
    </blockquote>
  </div>

  <!-- User's Detailed Elaboration -->
  ${args.toolParameters?.userElaboration ? `
  <div style="background: #f0fdf4; border: 2px solid #86efac; padding: 20px; margin-bottom: 20px; border-radius: 4px;">
    <h2 style="margin: 0 0 15px 0; font-size: 18px; color: #166534;">📝 User's Detailed Requirements</h2>
    <blockquote style="margin: 0; padding: 15px; background: #dcfce7; border-left: 4px solid #22c55e; color: #166534;">
      "${args.toolParameters.userElaboration}"
    </blockquote>
    <p style="margin: 10px 0 0 0; font-size: 13px; color: #166534; font-style: italic;">💡 This elaboration was requested by the AI to better understand the user's needs</p>
  </div>
  ` : ''}

  <!-- Tool That Failed -->
  <div style="background: #fff5f5; border-left: 4px solid #fc8181; padding: 20px; margin-bottom: 20px; border-radius: 4px;">
    <h2 style="margin: 0 0 15px 0; font-size: 18px; color: #c53030;">🛠️ Tool Attempted</h2>
    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 8px 0; color: #742a2a; font-weight: 600; width: 140px;">Tool Name:</td>
        <td style="padding: 8px 0; color: #2d3748;"><code style="background: #fed7d7; padding: 2px 6px; border-radius: 3px; font-family: 'Courier New', monospace;">${args.toolName}</code></td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #742a2a; font-weight: 600; vertical-align: top;">Parameters:</td>
        <td style="padding: 8px 0;">
          <pre style="background: #fed7d7; padding: 10px; border-radius: 4px; overflow-x: auto; font-size: 12px; margin: 0; font-family: 'Courier New', monospace;">${JSON.stringify(args.toolParameters, null, 2)}</pre>
        </td>
      </tr>
    </table>
  </div>

  <!-- Error Details -->
  <div style="background: #fffaf0; border-left: 4px solid #f6ad55; padding: 20px; margin-bottom: 20px; border-radius: 4px;">
    <h2 style="margin: 0 0 15px 0; font-size: 18px; color: #c05621;">⚠️ Error Message</h2>
    <pre style="background: #feebc8; padding: 15px; border-radius: 4px; overflow-x: auto; font-size: 13px; margin: 0; color: #744210; font-family: 'Courier New', monospace; white-space: pre-wrap;">${args.errorMessage}</pre>
  </div>

  ${args.aiResponse ? `
  <!-- AI Response -->
  <div style="background: #f0fff4; border-left: 4px solid #68d391; padding: 20px; margin-bottom: 20px; border-radius: 4px;">
    <h2 style="margin: 0 0 15px 0; font-size: 18px; color: #276749;">🤖 AI Response to User</h2>
    <p style="margin: 0; color: #2f855a; font-size: 14px;">${args.aiResponse}</p>
  </div>
  ` : ''}

  <!-- Action Items -->
  <div style="background: #edf2f7; padding: 20px; border-radius: 4px; margin-bottom: 20px;">
    <h2 style="margin: 0 0 15px 0; font-size: 18px; color: #2d3748;">✅ Recommended Actions</h2>
    <ol style="margin: 0; padding-left: 20px; color: #4a5568;">
      <li style="margin-bottom: 10px;">Review the tool parameters to understand the user's intent</li>
      <li style="margin-bottom: 10px;">Implement the <strong>${args.toolName}</strong> tool with proper validation</li>
      <li style="margin-bottom: 10px;">Test the implementation with similar parameters</li>
      <li style="margin-bottom: 10px;">Update the tool status from "placeholder" to "ready"</li>
      <li style="margin-bottom: 10px;">Consider replying to <a href="mailto:${args.userEmail}" style="color: #667eea;">${args.userEmail}</a> when implemented</li>
    </ol>
  </div>

  <!-- Debug Info -->
  <div style="background: #f7fafc; padding: 15px; border-radius: 4px; margin-top: 20px; font-size: 12px; color: #718096;">
    <strong>Debug Info:</strong><br>
    Conversation ID: <code style="background: #e2e8f0; padding: 2px 4px; border-radius: 2px;">${args.conversationId}</code><br>
    Organization ID: <code style="background: #e2e8f0; padding: 2px 4px; border-radius: 2px;">${args.organizationId}</code>
  </div>

  <!-- Footer -->
  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #a0aec0; font-size: 12px;">
    <p style="margin: 0;">l4yercak3 AI Assistant - Automated Feature Request</p>
    <p style="margin: 5px 0 0 0;">This email was generated automatically when a user attempted to use an unimplemented tool</p>
  </div>

</body>
</html>
  `;
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
🔧 FEATURE REQUEST: ${args.toolName}

A user tried to use a tool that needs implementation.

👤 USER INFORMATION
====================
Name: ${args.userName}
Email: ${args.userEmail}
Organization: ${args.organizationName}
Timestamp: ${timestamp}

💬 WHAT THE USER SAID (ORIGINAL REQUEST)
=========================================
"${args.userMessage}"

${args.toolParameters?.userElaboration ? `
📝 USER'S DETAILED REQUIREMENTS
================================
"${args.toolParameters.userElaboration}"

💡 This elaboration was requested by the AI to better understand the user's needs
` : ''}

🛠️ TOOL ATTEMPTED
==================
Tool Name: ${args.toolName}
Parameters:
${JSON.stringify(args.toolParameters, null, 2)}

⚠️ ERROR MESSAGE
=================
${args.errorMessage}

${args.aiResponse ? `
🤖 AI RESPONSE TO USER
=======================
${args.aiResponse}
` : ''}

✅ RECOMMENDED ACTIONS
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
l4yercak3 AI Assistant - Automated Feature Request
This email was generated automatically when a user attempted to use an unimplemented tool.
  `.trim();
}
