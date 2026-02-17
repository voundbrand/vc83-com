# Linear Integration - Automatic Feature Request Issues

This document explains how the l4yercak3 AI Assistant automatically creates Linear issues when users request features that don't exist yet.

## Overview

When a user interacts with the AI Assistant and requests a feature that isn't implemented, the AI will:

1. Guide the user through a 3-step feature request process
2. Ask for detailed requirements
3. Create a Linear issue automatically (if configured)
4. Send an email notification with the Linear issue link

## Setup

### 1. Get Your Linear API Key

1. Go to [https://linear.app/settings/api](https://linear.app/settings/api)
2. Click "Create new key"
3. Give it a name like "l4yercak3 Feature Requests"
4. Copy the API key

### 2. Get Your Team ID

1. Go to [https://linear.app/settings/teams](https://linear.app/settings/teams)
2. Click on the team where feature requests should be created
3. The team ID is in the URL: `https://linear.app/settings/team/[TEAM_ID]/general`
4. Copy the team ID

### 3. Configure Environment Variables

Add these to your `.env` file (or Convex environment variables):

```bash
# Linear Project Management
LINEAR_API_KEY=lin_api_xxxxxxxxxxxxxx
LINEAR_TEAM_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

### 4. Create Labels (Optional but Recommended)

In Linear, create these labels for better organization:

- **feature-request** - Marks issues as feature requests from users
- **user-feedback** - Indicates this came from actual user feedback
- **ai-generated** - Shows the issue was automatically created by the AI

The integration will automatically apply these labels if they exist.

## How It Works

### User Experience

1. **User asks for a feature:**
   ```
   User: "set a reminder for tomorrow at 10am"
   ```

2. **AI detects missing feature:**
   ```
   AI: "I don't have a reminder feature yet, but I can send a feature
        request to the dev team so they know you need this.
        Would you like me to do that?"
   ```

3. **User confirms:**
   ```
   User: "yes"
   ```

4. **AI asks for details:**
   ```
   AI: "Great! To help the dev team build exactly what you need, can you
        tell me more about how you'd like reminders to work?"
   ```

5. **User elaborates:**
   ```
   User: "I want to set reminders for specific times and dates, and get
          notifications on my desktop and phone"
   ```

6. **Linear issue is created automatically** ✅

### What Gets Created in Linear

**Issue Title:**
```
[Feature Request] create_reminder - John Doe
```

**Issue Description:**
- User information (name, email, organization)
- Original user request
- Detailed requirements (from elaboration)
- Tool name and suggested implementation
- Conversation ID for tracing
- Recommended action items for developers

**Labels Applied:**
- `feature-request`
- `user-feedback`

**Priority:**
- **High (2)**: If user provided detailed elaboration (shows strong interest)
- **Medium (3)**: If user only confirmed without elaboration

### Email Notification

The dev team receives an email that includes:

**Subject:**
```
🔧 Feature Request: create_reminder - User: John Doe [LIN-123]
```

**Body includes:**
- ✅ Blue banner with Linear issue link
- All the same information as the Linear issue
- Direct link to view the issue in Linear

## Benefits

### For Users
- ✅ Their feedback is captured and tracked
- ✅ Transparent process - they know their request is logged
- ✅ Feel heard and valued

### For Developers
- ✅ Automatic issue creation - no manual data entry
- ✅ Rich context - user's exact words and requirements
- ✅ Prioritization data - see which features users actually want
- ✅ Traceability - linked to conversation ID
- ✅ Email backup - get notified immediately

## Configuration Options

### Required Environment Variables

| Variable | Description | Where to Get It |
|----------|-------------|-----------------|
| `LINEAR_API_KEY` | Linear API authentication key | [linear.app/settings/api](https://linear.app/settings/api) |
| `LINEAR_TEAM_ID` | ID of the team where issues are created | Team settings URL |

### Optional Configuration

The integration is **gracefully degraded** - if Linear is not configured:
- ✅ Email notification still works
- ✅ Feature request flow still works
- ⚠️ No Linear issue is created (logged in console)

This means you can test the feature request system without Linear, and add it later.

## Code Files

### Main Implementation

- **`convex/ai/linearClient.ts`** - Linear SDK wrapper with issue creation
- **`convex/ai/featureRequestEmail.ts`** - Orchestrates Linear + Email
- **`convex/ai/tools/registry.ts`** - `request_feature` tool definition
- **`convex/ai/chat.ts`** - AI system prompt with 3-step workflow

### UI Components

- **`src/components/window-content/ai-chat-window/four-pane/chat-input-redesign.tsx`** - Feature request button
- **`src/app/page.tsx`** - AI chatbot icon in taskbar

## Testing

### Without Linear (Email Only)

1. Don't set `LINEAR_API_KEY` or `LINEAR_TEAM_ID`
2. Ask the AI for a non-existent feature
3. Go through the 3-step flow
4. ✅ Email is sent
5. ⚠️ No Linear issue created (check logs)

### With Linear (Full Integration)

1. Set `LINEAR_API_KEY` and `LINEAR_TEAM_ID`
2. Ask the AI for a non-existent feature
3. Go through the 3-step flow
4. ✅ Email is sent with Linear link
5. ✅ Linear issue is created
6. Check Linear to see the new issue

## Security Notes

- 🔐 **API Key Security**: Linear API key has full access to your workspace
- 🔐 **Environment Variables**: Store in Convex environment variables, not in code
- 🔐 **User Email**: Users' email addresses are included in issues (be aware of privacy)
- 🔐 **Conversation ID**: Convex IDs are included for tracing (internal only)

## Troubleshooting

### Issue Not Created

**Check logs for:**
```
[Feature Request] Linear not configured, skipping issue creation
```
→ **Fix**: Set `LINEAR_API_KEY` and `LINEAR_TEAM_ID`

**Or:**
```
Failed to create Linear issue: [error message]
```
→ **Fix**: Check API key permissions and team ID

### Labels Not Applied

**Issue**: Linear issue created but no labels

→ **Fix**: Create labels in Linear first:
  - Go to your team settings
  - Create labels: `feature-request`, `user-feedback`
  - The integration will find and apply them automatically

### Wrong Team

**Issue**: Issues created in wrong team

→ **Fix**: Update `LINEAR_TEAM_ID` to the correct team ID

## Advanced Usage

### Custom Priority Logic

Edit `convex/ai/linearClient.ts` to change priority logic:

```typescript
// Current: High if elaboration provided, Medium otherwise
priority: args.userElaboration ? 2 : 3

// Custom: Always set to Urgent
priority: 1

// Custom: Based on category
priority: args.category === 'critical' ? 1 : 3
```

### Custom Labels

Edit the label filter in `createFeatureRequestIssue()`:

```typescript
const labels = await linear.issueLabels({
  filter: {
    name: { in: ["feature-request", "user-feedback", "ai-generated"] }
  }
});
```

### Add to a Project

Add this to the `linear.createIssue()` call:

```typescript
const issuePayload = await linear.createIssue({
  teamId,
  projectId: "YOUR_PROJECT_ID", // Add this line
  title,
  description,
  // ...
});
```

## Future Enhancements

Potential improvements to the Linear integration:

- [ ] Add comments to issues when users follow up
- [ ] Update issue status when feature is implemented
- [ ] Notify user when their feature request is completed
- [ ] Create issue templates for different feature types
- [ ] Add user voting (increment priority if multiple requests)
- [ ] Integrate with Linear webhooks for status updates

## Support

For issues with the Linear integration:

1. Check the Convex logs for error messages
2. Verify your Linear API key has correct permissions
3. Ensure team ID is correct
4. Test with Linear API playground: [linear.app/playground](https://linear.app/playground)

---

**Last Updated**: December 2025
**Version**: 1.0.0
