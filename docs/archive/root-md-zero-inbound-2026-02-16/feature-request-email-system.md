# Automated Feature Request Email System

## Overview

The platform now automatically sends beautifully formatted feature request emails to `remington@l4yercak3.com` whenever a user tries to use an AI tool that fails. This helps the dev team understand what users are trying to accomplish and prioritize which tools to build next.

## How It Works

### User Journey
```
1. User: "Create a task for tomorrow's meeting"
   ↓
2. AI attempts to call create_task tool
   ↓
3. Tool execution fails (not implemented yet)
   ↓
4. 🚨 AUTOMATIC EMAIL SENT TO remington@l4yercak3.com
   ↓
5. AI responds to user with tutorial guidance
```

### Email Triggered On
- ✅ **Tool execution errors** (database failures, validation errors, etc.)
- ✅ **Unimplemented tools** that throw errors
- ❌ **NOT triggered for "placeholder" tools** that return tutorials

The system distinguishes between:
- **Actual failures**: Tool tried to execute but crashed → Email sent
- **Placeholder responses**: Tool returned success:false with tutorial steps → No email

## Email Contents

Each feature request email includes:

### 1. User Information
- **Name**: John Smith
- **Email**: john@acme.com (set as Reply-To)
- **Organization**: Acme Corporation
- **Timestamp**: When the attempt occurred

### 2. What the User Said
The exact message the user sent:
> "Create a task for tomorrow's meeting with the design team"

### 3. Tool Details
- **Tool Name**: `create_task`
- **Parameters**: Full JSON of what the AI tried to pass
  ```json
  {
    "title": "Meeting with design team",
    "dueDate": "2024-12-04",
    "assignee": "john@acme.com"
  }
  ```

### 4. Error Message
The actual error that occurred:
```
Error: create_task is not yet implemented
```

### 5. AI Response (if available)
What the AI told the user after the failure

### 6. Recommended Actions
A checklist for the dev team:
1. Review the tool parameters to understand user intent
2. Implement the `create_task` tool with proper validation
3. Test with similar parameters
4. Update tool status from "placeholder" to "ready"
5. Consider replying to user when complete

### 7. Debug Information
- Conversation ID (for tracking)
- Organization ID (for context)

## Email Format

The email is sent in both **HTML** and **plain text** formats:

### HTML Email Features
- 🎨 **Beautiful gradient header** with purple/violet theme
- 📋 **Color-coded sections**:
  - User info: Blue
  - User message: Purple (blockquote style)
  - Tool details: Red (error context)
  - Error message: Orange (warning style)
  - AI response: Green (if available)
- 💻 **Syntax-highlighted code** for JSON parameters
- ✅ **Action checklist** for easy follow-up
- 📱 **Mobile-responsive** design

### Plain Text Email
Clean, readable ASCII format for email clients that don't support HTML

## Implementation Files

### 1. Email Service
**File**: `convex/ai/featureRequestEmail.ts`

Functions:
- `sendFeatureRequest` - Internal action to send the email
- `getFeatureRequestEmailHTML` - Generates HTML email template
- `getFeatureRequestEmailText` - Generates plain text version

### 2. Integration Point
**File**: `convex/ai/chat.ts`

Lines: ~375-405

When a tool execution fails, the system:
1. Catches the error
2. Gets user context from conversation
3. Fires feature request email (fire-and-forget)
4. Continues normal error handling

**Key Features**:
- ✅ Non-blocking (doesn't slow down AI response)
- ✅ Error-resilient (email failure won't crash AI)
- ✅ Comprehensive logging for debugging

## Configuration

### Environment Variables Required
- `RESEND_API_KEY` - Your Resend API key
- `AUTH_RESEND_FROM` - From email address (default: "l4yercak3 <team@mail.l4yercak3.com>")

### Email Destination
Currently hardcoded to: **remington@l4yercak3.com**

To change the recipient, edit line 77 in `convex/ai/featureRequestEmail.ts`:
```typescript
to: "your-email@example.com",
```

## Testing

### Test Scenario 1: Trigger a Failed Tool
```
1. Start AI chat
2. Ask: "Create a task for tomorrow"
3. AI will try to call a non-existent tool
4. Check your inbox at remington@l4yercak3.com
5. You should receive a feature request email
```

### Test Scenario 2: Verify Email Contents
Check that the email includes:
- ✅ Your user name and email
- ✅ The exact message you sent
- ✅ Tool name and parameters
- ✅ Error details
- ✅ Conversation context

### Test Scenario 3: Reply-To Functionality
1. Receive a feature request email
2. Click "Reply" in your email client
3. Verify it replies to the user's email address
4. Use this to notify users when you implement their requested feature!

## Benefits

### For Product Team
- 📊 **Data-driven prioritization**: See what users actually want
- 🎯 **User intent clarity**: Understand the "why" behind feature requests
- 📧 **Direct user connection**: Reply-to feature enables follow-up
- 🚀 **Fast iteration**: Implement tools that users are actively requesting

### For Users
- ✅ **Transparent**: They get tutorial guidance immediately
- 📝 **Documented**: Their request is automatically logged
- 🔔 **Notifiable**: Dev team can email when feature is ready
- 🎁 **Delightful**: Users feel heard when features appear quickly

## Example Email Preview

```
Subject: 🔧 Feature Request: create_task - User: John Smith

---

🔧 FEATURE REQUEST
A user tried to use a tool that needs implementation

👤 USER INFORMATION
Name: John Smith
Email: john@acme.com
Organization: Acme Corporation
Timestamp: Tuesday, December 3, 2024 at 2:30:45 PM PST

💬 WHAT THE USER SAID
"Create a task for tomorrow's meeting with the design team"

🛠️ TOOL ATTEMPTED
Tool Name: create_task
Parameters:
{
  "title": "Meeting with design team",
  "dueDate": "2024-12-04",
  "assignee": "john@acme.com"
}

⚠️ ERROR MESSAGE
Error: create_task is not yet implemented

✅ RECOMMENDED ACTIONS
1. Review the tool parameters to understand the user's intent
2. Implement the create_task tool with proper validation
3. Test the implementation with similar parameters
4. Update the tool status from "placeholder" to "ready"
5. Consider replying to john@acme.com when implemented

DEBUG INFO
Conversation ID: j57abc123def456
Organization ID: k57xyz789ghi012
```

## Future Enhancements

### Potential Improvements
1. **Duplicate detection**: Don't send email if same tool failed recently
2. **Weekly digest**: Batch feature requests into one weekly email
3. **Priority scoring**: Auto-calculate priority based on user tier + frequency
4. **Auto-ticket creation**: Create GitHub/Linear issues automatically
5. **Success notifications**: Email users when their requested feature ships
6. **Analytics dashboard**: Visualize most-requested features
7. **A/B testing**: Track which tools get built fastest affect user retention

### Configuration Options
Future config could include:
```typescript
{
  emailFrequency: "immediate" | "daily" | "weekly",
  recipients: ["dev1@example.com", "dev2@example.com"],
  minimumUserTier: "free" | "pro" | "enterprise",
  excludeTools: ["debug_only_tool"],
  autoCreateIssue: true,
}
```

## Monitoring & Debugging

### Logs to Watch
```bash
# Successful email send
[AI Chat] Feature request email triggered for failed tool: create_task

# Email send failure (doesn't affect user)
[AI Chat] Failed to send feature request email: [error details]

# Email system error (doesn't affect user)
[AI Chat] Error in feature request email system: [error details]
```

### Email Delivery Tracking
Check Resend dashboard for:
- ✅ Delivery status
- 📊 Open rates (is the team reading them?)
- 🔗 Click tracking (are they acting on recommendations?)

## Security & Privacy

### User Data Protection
- ✅ **No sensitive data exposure**: Only tool parameters sent (already sanitized by AI)
- ✅ **User consent implied**: Tool usage = consent to error reporting
- ✅ **Reply-to transparency**: Users know dev team may contact them

### Rate Limiting
Consider adding rate limits to prevent spam:
- Max 1 email per tool per user per hour
- Max 10 emails per organization per day
- Max 100 emails per day total

## Support

### Common Issues

**Q: Emails not being received?**
- Check `RESEND_API_KEY` is set in environment variables
- Verify Resend account is active
- Check spam folder
- Review Resend dashboard for delivery errors

**Q: Wrong user information in emails?**
- User/org data pulled from database at time of failure
- Check that user record exists and has email field
- Verify organization record has name field

**Q: Too many emails?**
- Add duplicate detection (future enhancement)
- Implement rate limiting
- Consider daily digest mode

**Q: Want to disable feature requests temporarily?**
- Comment out lines 375-405 in `convex/ai/chat.ts`
- Or add environment variable check: `if (!process.env.ENABLE_FEATURE_REQUESTS) return;`

## Summary

The automated feature request system transforms every tool failure into actionable product intelligence. Instead of users getting frustrated and leaving, their needs are instantly communicated to the development team in a beautifully formatted, actionable format.

This creates a virtuous cycle:
1. 🚀 Users try advanced features
2. 📧 Dev team learns what users want
3. 🔨 Tools get built faster
4. 🎉 Users delight when features appear
5. 💰 Platform stickiness increases

**Result**: Build the features your users actually want, not what you think they want.
