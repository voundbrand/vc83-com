"use node";

/**
 * Linear API Client
 *
 * Creates Linear issues for feature requests submitted through the AI assistant
 */

import { LinearClient } from "@linear/sdk";

/**
 * Create a Linear client instance
 */
export const createLinearClient = () => {
  const apiKey = process.env.LINEAR_API_KEY;
  if (!apiKey) {
    throw new Error("LINEAR_API_KEY not configured");
  }
  return new LinearClient({ apiKey });
};

/**
 * Create a feature request issue in Linear
 */
export async function createFeatureRequestIssue(args: {
  // User context
  userName: string;
  userEmail: string;
  organizationName: string;

  // Feature details
  toolName: string;
  featureDescription: string;
  userMessage: string;
  userElaboration?: string;
  category?: string;

  // Additional context
  conversationId: string;
  occurredAt: number;
}) {
  const linear = createLinearClient();

  // Get the team ID from environment variable
  const teamId = process.env.LINEAR_TEAM_ID;
  if (!teamId) {
    throw new Error("LINEAR_TEAM_ID not configured");
  }

  // Format issue title
  const title = `[Feature Request] ${args.toolName} - ${args.userName}`;

  // Format issue description with rich context
  const description = `
## 🔧 Feature Request from User

**User**: ${args.userName} (${args.userEmail})
**Organization**: ${args.organizationName}
**Date**: ${new Date(args.occurredAt).toLocaleString()}
**Conversation**: \`${args.conversationId}\`

---

## 💬 What the User Said (Original Request)

> "${args.userMessage}"

${args.userElaboration ? `
---

## 📝 User's Detailed Requirements

> "${args.userElaboration}"

💡 *This elaboration was requested by the AI to better understand the user's needs*
` : ''}

---

## 🛠️ Tool Attempted

**Tool Name**: \`${args.toolName}\`
**Category**: ${args.category || 'general'}
**Feature Description**: ${args.featureDescription}

---

## ✅ Recommended Actions

1. Review the tool parameters to understand the user's intent
2. Implement the \`${args.toolName}\` tool with proper validation
3. Test the implementation with similar parameters
4. Update the tool status from "placeholder" to "ready"
5. Consider replying to ${args.userEmail} when implemented

---

## 🔗 References

- **Conversation ID**: \`${args.conversationId}\`
- **AI Generated**: This issue was automatically created by the AI assistant when a user attempted to use an unimplemented feature

---

**Labels**: feature-request, user-feedback, ai-generated
  `.trim();

  // Get the feature request label (or create it if it doesn't exist)
  const labels = await linear.issueLabels({
    filter: {
      name: { in: ["feature-request", "user-feedback"] }
    }
  });

  const labelIds = labels.nodes.map(label => label.id);

  // Create the issue
  const issuePayload = await linear.createIssue({
    teamId,
    title,
    description,
    labelIds: labelIds.length > 0 ? labelIds : undefined,
    // Set priority based on whether user provided elaboration (shows commitment)
    priority: args.userElaboration ? 2 : 3, // 2 = High, 3 = Medium
  });

  const issue = await issuePayload.issue;

  if (!issue) {
    throw new Error("Failed to create Linear issue");
  }

  console.log(`[Linear] Created issue: ${issue.identifier} - ${issue.url}`);

  return {
    issueId: issue.id,
    issueNumber: issue.identifier,
    issueUrl: issue.url,
  };
}

/**
 * Add a comment to an existing Linear issue
 */
export async function addCommentToIssue(issueId: string, comment: string) {
  const linear = createLinearClient();

  const commentPayload = await linear.createComment({
    issueId,
    body: comment,
  });

  const createdComment = await commentPayload.comment;

  if (!createdComment) {
    throw new Error("Failed to add comment to Linear issue");
  }

  return {
    commentId: createdComment.id,
    commentUrl: createdComment.url,
  };
}
