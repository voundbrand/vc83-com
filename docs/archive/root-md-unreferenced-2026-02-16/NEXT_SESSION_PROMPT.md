# Quick Start Prompt for Next Session

Copy and paste this into your next Claude Code session:

---

## Session Context

Read the comprehensive handoff document:
```
/Users/foundbrand_001/Development/vc83-com/docs/AI_CHAT_HANDOFF.md
```

## What We Were Working On

We were implementing AI chat functionality with tools for:
1. **Bulk CRM email sending** (`convex/ai/tools/bulkCRMEmailTool.ts`)
2. **Microsoft contact syncing** (`convex/ai/tools/contactSyncTool.ts`)
3. **AI chat with function calling** (single LLM, not multi-agent)

## Current Issue

**I encountered an API error** while working with:
- [ ] AI chat functionality
- [ ] Contact sync tool
- [ ] Bulk email tool
- [ ] Microsoft OAuth connection
- [ ] Other: _________________________

**Error details:**
```
[Paste error message, stack trace, or describe what happened]
```

**What I was doing when error occurred:**
```
[Describe the steps that led to the error]
```

## What We Need To Do

1. **First**: Investigate and fix the API error I encountered
2. **Then**: Test the AI tools end-to-end
3. **Finally**: Complete any missing integrations (email sending, Microsoft Graph API)

## Key Context

- **Architecture**: Single LLM + function calling (NOT multi-agent)
- **Billing**: Platform key mode with manual subscription grants
- **Tools**: bulkCRMEmailTool.ts and contactSyncTool.ts recently created
- **Recent Work**: Just completed AI Settings translations with German price formatting
- **Session Object Fix**: Changed from `session.user.defaultOrgId` to `session.organizationId`

## Project Info

- **Working Directory**: `/Users/foundbrand_001/Development/vc83-com`
- **Last Commit**: `e59a1a0` (translations)
- **Branch**: `main`
- **Database**: Convex

---

**Ready to continue!** Let's investigate the API error and get the AI chat tools working.
