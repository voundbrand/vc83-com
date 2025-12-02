# AI-Powered Contact Sync Tool + Bulk Communication

**Created:** December 2, 2025
**Dependencies:** 012_ai_chat_email_tool_v2.md, Microsoft OAuth, CRM System
**Goal:** Build AI tool for syncing external contacts (Microsoft/Google) + bulk CRM communication

---

## 🎯 Overview

This plan implements TWO interconnected AI tools:

1. **Contact Sync Tool** - AI-powered sync of Microsoft/Google contacts to CRM
2. **Bulk Communication Tool** - Send emails to CRM contacts/organizations (extends email tool from 012)

**Key Innovation:** Instead of building provider-specific sync logic, use AI to intelligently map and merge contact data from any source.

---

## 📊 Architecture

### Contact Sync Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    AI CONTACT SYNC TOOL                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  User: "Sync my Microsoft contacts to CRM"                 │
│    ↓                                                        │
│  AI analyzes intent                                         │
│    ↓                                                        │
│  Tool: sync_contacts                                        │
│    ├─ provider: "microsoft"                                │
│    ├─ mode: "preview" | "execute"                          │
│    └─ filters: { updated_since, categories, etc. }         │
│                                                             │
│  Backend:                                                   │
│  1. Fetch contacts from Microsoft Graph                    │
│  2. AI analyzes each contact                                │
│     ├─ Match existing CRM contact? (fuzzy matching)        │
│     ├─ Create new contact?                                  │
│     ├─ Update existing contact?                             │
│     └─ Skip (duplicate/invalid)?                            │
│  3. Generate preview (THREE-PANE mode)                      │
│                                                             │
│  UI switches to 3-pane:                                     │
│  ├─ Left: Chat continues                                   │
│  ├─ Middle: List of contacts to sync (20% width)           │
│  └─ Right: Individual contact details + AI suggestions     │
│                                                             │
│  User reviews each contact:                                 │
│  ☑ Create new                                               │
│  ☑ Update existing (shows diff)                            │
│  ☐ Skip this one                                            │
│                                                             │
│  User: "Approve all" or reviews one-by-one                 │
│    ↓                                                        │
│  AI executes sync:                                          │
│  ✅ Created 15 contacts                                     │
│  ✅ Updated 8 contacts                                      │
│  ⏭️ Skipped 3 duplicates                                    │
└─────────────────────────────────────────────────────────────┘
```

### Bulk Communication Flow

```
┌─────────────────────────────────────────────────────────────┐
│                 BULK CRM COMMUNICATION                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  User: "Email all contacts in 'Active Leads' pipeline"     │
│    ↓                                                        │
│  AI analyzes intent                                         │
│    ↓                                                        │
│  Tool: send_bulk_crm_email                                  │
│    ├─ target: { pipeline: "Active Leads" }                 │
│    ├─ template: "follow_up_v2"                              │
│    └─ personalization: { ai_tone: "friendly" }             │
│                                                             │
│  Backend:                                                   │
│  1. Query CRM contacts/orgs matching criteria               │
│  2. AI generates personalized email for each                │
│  3. Switch to THREE-PANE mode                               │
│                                                             │
│  UI (same as 012_email_tool):                               │
│  ├─ Left: Chat (40%)                                        │
│  ├─ Middle: Email preview list (20%)                        │
│  └─ Right: Edit individual email (40%)                      │
│                                                             │
│  User reviews, edits, approves                              │
│    ↓                                                        │
│  AI sends all emails via Microsoft Graph                    │
│  ✅ Sent 23 emails successfully                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tool Definitions

### Tool 1: Contact Sync

```typescript
// convex/ai/tools/contactSyncTool.ts

export const contactSyncToolDefinition = {
  type: "function",
  function: {
    name: "sync_contacts",
    description: "Sync contacts from Microsoft/Google to CRM. AI intelligently matches, merges, and creates contacts.",
    parameters: {
      type: "object",
      properties: {
        provider: {
          type: "string",
          enum: ["microsoft", "google"],
          description: "Contact provider to sync from"
        },
        mode: {
          type: "string",
          enum: ["preview", "execute"],
          description: "preview = show what would sync, execute = actually sync"
        },
        filters: {
          type: "object",
          properties: {
            updatedSince: {
              type: "string",
              description: "ISO date - only sync contacts updated after this date"
            },
            categories: {
              type: "array",
              items: { type: "string" },
              description: "Specific categories/groups to sync"
            },
            maxContacts: {
              type: "number",
              description: "Limit number of contacts (default: 100)"
            }
          }
        },
        targetOrganization: {
          type: "string",
          description: "CRM organization ID to link contacts to (optional)"
        }
      },
      required: ["provider", "mode"]
    }
  }
};
```

### Tool 2: Bulk CRM Communication

```typescript
// convex/ai/tools/bulkCRMEmailTool.ts

export const bulkCRMEmailToolDefinition = {
  type: "function",
  function: {
    name: "send_bulk_crm_email",
    description: "Send personalized emails to multiple CRM contacts or organizations",
    parameters: {
      type: "object",
      properties: {
        target: {
          type: "object",
          description: "Who to email",
          properties: {
            type: {
              type: "string",
              enum: ["contacts", "organizations", "pipeline", "tag", "custom_query"],
              description: "Type of recipients"
            },
            // For type = "contacts"
            contactIds: {
              type: "array",
              items: { type: "string" },
              description: "Specific CRM contact IDs"
            },
            // For type = "organizations"
            organizationIds: {
              type: "array",
              items: { type: "string" },
              description: "Specific CRM organization IDs (emails primary contact)"
            },
            // For type = "pipeline"
            pipeline: {
              type: "string",
              description: "Pipeline name (e.g., 'Active Leads', 'Customers')"
            },
            pipelineStage: {
              type: "string",
              description: "Specific stage in pipeline (optional)"
            },
            // For type = "tag"
            tags: {
              type: "array",
              items: { type: "string" },
              description: "CRM tags to filter by"
            }
          },
          required: ["type"]
        },
        content: {
          type: "object",
          properties: {
            subject: { type: "string" },
            body: { type: "string" },
            template: {
              type: "string",
              description: "Use existing email template"
            },
            aiTone: {
              type: "string",
              enum: ["professional", "friendly", "urgent", "casual"],
              description: "AI adjusts tone for each recipient"
            },
            personalization: {
              type: "object",
              description: "Merge fields like {{firstName}}, {{companyName}}, etc."
            }
          }
        },
        options: {
          type: "object",
          properties: {
            requireApproval: {
              type: "boolean",
              description: "Show preview before sending (default: true)"
            },
            sendVia: {
              type: "string",
              enum: ["microsoft", "smtp"],
              description: "Email delivery method"
            },
            batchSize: {
              type: "number",
              description: "Send in batches (avoid rate limits)"
            },
            trackOpens: { type: "boolean" },
            trackClicks: { type: "boolean" }
          }
        }
      },
      required: ["target", "content"]
    }
  }
};
```

---

## 📋 Implementation Plan

### Phase 1: Contact Sync - Microsoft (Days 1-3)

**Day 1: Backend Foundation**
- [ ] Create `convex/ai/tools/contactSyncTool.ts`
- [ ] Implement `sync_contacts` tool definition
- [ ] Add Graph API contact fetching:
  ```typescript
  // GET /me/contacts
  // Returns: { value: [ { id, displayName, emailAddresses, ... } ] }
  ```
- [ ] Create AI prompt for contact matching:
  ```typescript
  // "Analyze this contact from Microsoft:
  // Name: John Smith, Email: john@acme.com
  //
  // Compare to existing CRM contacts:
  // 1. John A. Smith <john.smith@acme.com>
  // 2. Johnny Smith <j.smith@acme.com>
  //
  // Recommendation: merge | create_new | skip
  // Confidence: high | medium | low
  // Reason: ..."
  ```
- [ ] Build contact matching logic (fuzzy name + email matching)

**Day 2: Three-Pane Preview UI**
- [ ] Extend three-pane layout from 012_email_tool
- [ ] Create `ContactSyncPreview` component:
  - Left pane: Chat continues
  - Middle pane: List of contacts to sync (compact 20%)
  - Right pane: Contact details + AI recommendations
- [ ] Show diff for updates:
  ```
  Existing CRM Contact:
  Name: John Smith
  Email: john@acme.com
  Phone: (none)

  Microsoft Contact:
  Name: John A. Smith
  Email: john@acme.com
  Phone: +1-555-0123 ← NEW

  AI Recommendation: ✓ Update
  Confidence: High (email exact match)
  ```
- [ ] Add approve/reject/skip actions per contact
- [ ] Implement "Apply to All Similar" feature

**Day 3: Execution & Testing**
- [ ] Implement execute mode (actually create/update CRM contacts)
- [ ] Add progress tracking (batch processing)
- [ ] Handle errors gracefully:
  - Duplicate emails
  - Invalid contact data
  - Missing required fields
- [ ] Create audit log of all changes
- [ ] Test with real Microsoft account (100 contacts)

**Success Criteria:**
- ✅ User can say "Sync my Microsoft contacts"
- ✅ AI shows preview in 3-pane UI
- ✅ User can review each contact
- ✅ Contacts created/updated in CRM
- ✅ Audit trail of all changes

---

### Phase 2: Bulk CRM Communication (Days 4-6)

**Day 4: CRM Query Builder**
- [ ] Create `convex/ai/tools/bulkCRMEmailTool.ts`
- [ ] Implement recipient querying:
  ```typescript
  // Query CRM contacts by:
  // - Pipeline ("Active Leads")
  // - Tags (["vip", "enterprise"])
  // - Organization membership
  // - Custom filters (created_after, last_contact_date, etc.)
  ```
- [ ] Build AI prompt for personalization:
  ```typescript
  // "Generate personalized email:
  // Template: Invoice Reminder
  // Recipient: John Smith (Acme Corp)
  // Context: Last invoice #1234, due 7 days ago
  // Tone: Friendly but firm
  // Include: Payment link, support contact"
  ```
- [ ] Test with dummy data (50 contacts)

**Day 5: Email Generation & Preview**
- [ ] Integrate with existing email tool (012)
- [ ] Generate emails in batch:
  - One email per contact
  - AI personalizes subject/body based on CRM data
  - Merge fields: {{firstName}}, {{companyName}}, etc.
- [ ] Create three-pane preview:
  - Reuse layout from 012_email_tool
  - Left: Chat + workflow progress
  - Middle: Email list (20%)
  - Right: Edit individual email (40%)
- [ ] Add CRM-specific features:
  - Show contact's CRM profile
  - Show recent interactions
  - Show pipeline stage
  - Suggest next best action

**Day 6: Sending & Tracking**
- [ ] Implement batch sending via Microsoft Graph
- [ ] Add rate limiting (avoid Microsoft throttling)
- [ ] Track email status per contact:
  - ✅ Sent
  - ⏳ Queued
  - ❌ Failed (with reason)
- [ ] Update CRM contact activity:
  - Add "Email Sent" event
  - Link email content to contact timeline
  - Update last_contact_date
- [ ] Generate summary report:
  ```
  Bulk Email Campaign: Invoice Reminders
  ✅ Sent: 47/50 emails
  ⏳ Queued: 3 (rate limit)
  ❌ Failed: 0
  Total Cost: €0.14
  ```

**Success Criteria:**
- ✅ User can say "Email all overdue invoice customers"
- ✅ AI queries CRM for matching contacts
- ✅ Generates personalized emails
- ✅ Shows preview in 3-pane
- ✅ Sends via Microsoft Graph
- ✅ Updates CRM with email activity

---

### Phase 3: Google Contacts + Advanced Features (Days 7-8)

**Day 7: Google Contacts Sync**
- [ ] Add Google OAuth (similar to Microsoft)
  - Scopes: `https://www.googleapis.com/auth/contacts.readonly`
- [ ] Implement Google People API integration:
  ```typescript
  // GET https://people.googleapis.com/v1/people/me/connections
  ```
- [ ] Reuse AI matching logic (provider-agnostic)
- [ ] Test sync with Google account

**Day 8: Advanced Features & Polish**
- [ ] Bi-directional sync (update external contacts from CRM changes)
- [ ] Sync scheduling (auto-sync daily/weekly)
- [ ] Conflict resolution UI:
  - CRM contact changed since last sync
  - External contact changed
  - User chooses which to keep
- [ ] Sync analytics dashboard:
  - Total contacts synced
  - Source breakdown (Microsoft: 150, Google: 75)
  - Last sync date
  - Sync errors
- [ ] Email campaign analytics:
  - Open rates (if tracking enabled)
  - Click rates
  - Bounce rates
  - Per-pipeline performance

---

## 🎨 UI Components

### Contact Sync Window

```tsx
// src/components/window-content/ai-chat-window/workflows/contact-sync-workflow.tsx

interface ContactSyncItem {
  id: string;
  sourceId: string;              // Microsoft/Google contact ID
  sourceName: string;            // "John Smith"
  sourceEmail: string;           // "john@acme.com"
  sourcePhone?: string;
  sourceCompany?: string;

  action: "create" | "update" | "skip" | "merge";
  existingContactId?: string;    // If updating/merging
  existingContact?: {            // Show for comparison
    name: string;
    email: string;
    phone?: string;
  };

  aiRecommendation: {
    action: "create" | "update" | "skip" | "merge";
    confidence: "high" | "medium" | "low";
    reason: string;
  };

  status: "pending" | "approved" | "rejected" | "synced";
}

<ContactSyncWorkflow>
  <LeftPane>
    {/* Chat continues */}
    <ChatMessages />
    <ChatInput />
  </LeftPane>

  <MiddlePane> {/* 20% width */}
    <PreviewHeader>
      <Title>👥 {totalContacts} Contacts</Title>
      <FilterButtons>
        <Button>All</Button>
        <Button>Create</Button>
        <Button>Update</Button>
        <Button>Skip</Button>
      </FilterButtons>
    </PreviewHeader>

    <ContactList>
      {contacts.map(contact => (
        <ContactItem
          key={contact.id}
          selected={selectedContact === contact.id}
          onClick={() => selectContact(contact.id)}
        >
          <Checkbox
            checked={contact.status === "approved"}
            onChange={() => toggleApproval(contact.id)}
          />
          <Badge>{contact.action}</Badge>
          <Name>{contact.sourceName}</Name>
          <Email>{contact.sourceEmail}</Email>
          {contact.aiRecommendation.confidence === "low" && (
            <WarningIcon />
          )}
        </ContactItem>
      ))}
    </ContactList>

    <PreviewFooter>
      <Summary>{approvedCount}/{totalContacts} approved</Summary>
      <BulkActions>
        <Button onClick={approveAll}>Approve All</Button>
        <Button onClick={skipDuplicates}>Skip Duplicates</Button>
      </BulkActions>
    </PreviewFooter>
  </MiddlePane>

  <RightPane> {/* 40% width */}
    <DetailHeader>
      <Title>📝 Contact Details</Title>
      <Navigation>
        <Button>← Prev</Button>
        <Badge>{currentIndex + 1}/{totalContacts}</Badge>
        <Button>Next →</Button>
      </Navigation>
    </DetailHeader>

    <DetailContent>
      {/* Source Contact */}
      <Section>
        <SectionTitle>Microsoft Contact</SectionTitle>
        <Field label="Name">{selectedContact.sourceName}</Field>
        <Field label="Email">{selectedContact.sourceEmail}</Field>
        <Field label="Phone">{selectedContact.sourcePhone}</Field>
        <Field label="Company">{selectedContact.sourceCompany}</Field>
      </Section>

      {/* Existing CRM Contact (if updating) */}
      {selectedContact.action === "update" && (
        <Section>
          <SectionTitle>Existing CRM Contact</SectionTitle>
          <DiffView>
            <DiffField
              label="Name"
              oldValue={selectedContact.existingContact.name}
              newValue={selectedContact.sourceName}
              changed={selectedContact.existingContact.name !== selectedContact.sourceName}
            />
            <DiffField
              label="Phone"
              oldValue={selectedContact.existingContact.phone || "(none)"}
              newValue={selectedContact.sourcePhone || "(none)"}
              changed={selectedContact.existingContact.phone !== selectedContact.sourcePhone}
            />
          </DiffView>
        </Section>
      )}

      {/* AI Recommendation */}
      <AIRecommendationCard>
        <Header>
          <Icon>✨</Icon>
          <Title>AI Recommendation</Title>
        </Header>
        <Body>
          <ActionBadge>{selectedContact.aiRecommendation.action}</ActionBadge>
          <ConfidenceBadge confidence={selectedContact.aiRecommendation.confidence}>
            {selectedContact.aiRecommendation.confidence} confidence
          </ConfidenceBadge>
          <Reason>{selectedContact.aiRecommendation.reason}</Reason>
        </Body>
      </AIRecommendationCard>

      {/* Manual Override */}
      <Section>
        <SectionTitle>Manual Action</SectionTitle>
        <RadioGroup value={selectedContact.action} onChange={updateAction}>
          <Radio value="create">Create New Contact</Radio>
          <Radio value="update">Update Existing</Radio>
          <Radio value="skip">Skip This Contact</Radio>
          {selectedContact.existingContactId && (
            <Radio value="merge">Merge with Existing</Radio>
          )}
        </RadioGroup>
      </Section>
    </DetailContent>

    <DetailFooter>
      <Checkbox checked={applyToSimilar}>
        Apply to all similar contacts
      </Checkbox>
      <Actions>
        <Button onClick={rejectContact}>Skip</Button>
        <Button primary onClick={approveContact}>Approve</Button>
      </Actions>
    </DetailFooter>
  </RightPane>

  <WorkflowFooter>
    <ProgressBar value={processedCount} max={totalContacts} />
    <Summary>
      {approvedCount} approved • {rejectedCount} skipped
    </Summary>
    <Actions>
      <Button onClick={cancelSync}>Cancel</Button>
      <Button onClick={savePreview}>Save Preview</Button>
      <Button primary onClick={executeSync} disabled={approvedCount === 0}>
        Sync {approvedCount} Contacts ✓
      </Button>
    </Actions>
  </WorkflowFooter>
</ContactSyncWorkflow>
```

---

## 🔒 Security & Privacy

### Data Protection
- **Minimal Storage**: Don't store full external contact data
- **Encrypt OAuth Tokens**: Use existing encryption (oauth/encryption.ts)
- **User Consent**: Clear permission requests
- **Audit Trail**: Log all sync operations

### Permissions
- **User-level sync**: Personal OAuth connection
- **Org-level sync**: Requires `manage_integrations` permission
- **Bulk email**: Requires `send_bulk_email` permission (new)

### Rate Limits
- **Microsoft Graph**: 2,000 requests/minute (per user)
- **Google People API**: 90 requests/minute (per user)
- **Solution**: Batch requests, implement queuing

---

## 💡 AI Prompts

### Contact Matching Prompt

```typescript
const CONTACT_MATCHING_PROMPT = `You are a CRM contact matching expert.

TASK: Analyze if this external contact matches any existing CRM contacts.

EXTERNAL CONTACT (from ${provider}):
Name: ${externalContact.name}
Email: ${externalContact.email}
Phone: ${externalContact.phone}
Company: ${externalContact.company}

EXISTING CRM CONTACTS:
${existingContacts.map((c, i) => `
${i + 1}. ${c.name} <${c.email}>
   Phone: ${c.phone || 'N/A'}
   Company: ${c.company || 'N/A'}
`).join('\n')}

RESPOND with JSON:
{
  "action": "create" | "update" | "skip" | "merge",
  "matchedContactId": "string or null",
  "confidence": "high" | "medium" | "low",
  "reason": "Brief explanation of your decision",
  "suggestedMerges": {
    // For updates, specify which fields to merge
    "name": true,
    "phone": true,
    "company": false
  }
}

MATCHING RULES:
- Exact email match = update (high confidence)
- Similar name + same email domain = likely match (medium confidence)
- No matches = create new (high confidence)
- Multiple possible matches = flag for review (low confidence)
- Email exists but different name = skip with warning (user reviews)
`;
```

### Bulk Email Personalization Prompt

```typescript
const BULK_EMAIL_PERSONALIZATION_PROMPT = `You are an email personalization expert.

TASK: Personalize this email template for the recipient using CRM context.

EMAIL TEMPLATE:
Subject: ${template.subject}
Body:
${template.body}

RECIPIENT CRM CONTEXT:
Name: ${contact.firstName} ${contact.lastName}
Company: ${contact.company}
Pipeline: ${contact.pipeline} (Stage: ${contact.stage})
Last Contact: ${contact.lastContactDate}
Recent Activity: ${contact.recentActivity}
Tags: ${contact.tags.join(', ')}

PERSONALIZATION INSTRUCTIONS:
- Tone: ${options.aiTone}
- Reference their company and role naturally
- If they're in "Overdue Invoice" stage, add urgency
- If last contact was >30 days ago, acknowledge the gap
- Use merge fields: {{firstName}}, {{companyName}}, {{invoiceNumber}}, etc.
- Keep subject under 60 characters
- Keep body under 200 words

RESPOND with JSON:
{
  "subject": "Personalized subject line",
  "body": "Personalized email body with merge fields",
  "reasoning": "Brief note about personalization choices"
}
`;
```

---

## 📊 Database Schema Updates

### Add to `convex/schema.ts`

```typescript
// Contact sync records (audit trail)
contactSyncs: defineTable({
  organizationId: v.id("organizations"),
  userId: v.id("users"),
  provider: v.string(), // "microsoft" | "google"
  connectionId: v.id("oauthConnections"),
  syncType: v.string(), // "manual" | "scheduled"
  status: v.string(), // "preview" | "executing" | "completed" | "failed"

  // Stats
  totalContacts: v.number(),
  created: v.number(),
  updated: v.number(),
  skipped: v.number(),
  failed: v.number(),

  // Metadata
  startedAt: v.number(),
  completedAt: v.optional(v.number()),
  errorMessage: v.optional(v.string()),

  // Preview data (for 3-pane UI)
  previewData: v.optional(v.any()),
}).index("by_org_user", ["organizationId", "userId"]),

// Bulk email campaigns
emailCampaigns: defineTable({
  organizationId: v.id("organizations"),
  userId: v.id("users"),
  name: v.string(), // "Invoice Reminders Q1 2025"
  status: v.string(), // "draft" | "sending" | "completed" | "failed"

  // Target
  targetType: v.string(), // "contacts" | "pipeline" | "tags"
  targetCriteria: v.any(), // Query criteria

  // Content
  subject: v.string(),
  bodyTemplate: v.string(),
  aiTone: v.optional(v.string()),

  // Stats
  totalRecipients: v.number(),
  sent: v.number(),
  failed: v.number(),
  opened: v.optional(v.number()),
  clicked: v.optional(v.number()),

  // Metadata
  createdAt: v.number(),
  sentAt: v.optional(v.number()),
  totalCost: v.optional(v.number()), // AI cost
}).index("by_org", ["organizationId"])
  .index("by_user", ["userId"])
  .index("by_status", ["status"]),
```

---

## 🚀 Integration with Existing Systems

### Microsoft OAuth
- Reuse: `convex/oauth/microsoft.ts`
- Add scope: `Contacts.Read` (if not already present)
- Use: `convex/oauth/graphClient.ts` for API calls

### Google OAuth (New)
- Create: `convex/oauth/google.ts` (mirror Microsoft structure)
- Scopes: `https://www.googleapis.com/auth/contacts.readonly`
- API: Google People API v1

### CRM System
- Use: `convex/crmOntology.ts` for contact CRUD
- Use: `convex/crmPipeline.ts` for pipeline queries
- Use: `convex/crmTags.ts` for tag filtering

### AI Chat Window
- Extend: `012_ai_chat_email_tool_v2.md` three-pane layout
- Add new tools to: `convex/ai/tools/toolRegistry.ts`
- Reuse: OpenRouter integration for AI decisions

---

## 🎯 Success Metrics

### Contact Sync
- ✅ Sync 100+ contacts in <2 minutes
- ✅ AI matching accuracy >90%
- ✅ User can review/override all decisions
- ✅ Audit trail of all changes
- ✅ Support Microsoft + Google

### Bulk Communication
- ✅ Send to 50+ recipients simultaneously
- ✅ AI personalization per recipient
- ✅ Preview all emails before sending
- ✅ Track sending status per recipient
- ✅ Update CRM with email activity

---

## 📝 User Stories

### Story 1: First-time Contact Sync
```
As a sales manager
I want to sync my Microsoft Outlook contacts to CRM
So that I can manage all contacts in one place

Acceptance:
- Open AI chat window
- Say "Sync my Microsoft contacts"
- Review AI recommendations in 3-pane UI
- Approve/reject individual contacts
- Execute sync
- See confirmation of created/updated contacts
```

### Story 2: Bulk Invoice Reminders
```
As an accounts manager
I want to email all customers with overdue invoices
So that I can improve payment collection

Acceptance:
- Open AI chat window
- Say "Email all customers with invoices overdue >7 days"
- AI finds 23 matching CRM contacts
- AI generates personalized reminder for each
- Review emails in 3-pane UI
- Edit specific emails if needed
- Approve and send
- See confirmation of sent emails
```

### Story 3: Pipeline-based Outreach
```
As a marketing manager
I want to email everyone in "Active Leads" pipeline
So that I can nurture potential customers

Acceptance:
- Open AI chat window
- Say "Send newsletter to all Active Leads"
- AI queries CRM pipeline
- AI personalizes newsletter based on lead data
- Review in 3-pane UI
- Approve and send
- Track opens/clicks (future)
```

---

## 🔧 Technical Challenges & Solutions

### Challenge 1: Contact Deduplication
**Problem:** Same person may exist in Microsoft, Google, and CRM with slight variations.

**Solution:**
- AI-powered fuzzy matching
- Compare: email (exact), name (Levenshtein distance), phone (normalized)
- User reviews low-confidence matches
- Manual merge option

### Challenge 2: Rate Limiting
**Problem:** Microsoft/Google have API rate limits.

**Solution:**
- Batch requests (50 contacts at a time)
- Queue system for large syncs
- Progressive UI updates (show as they load)
- Retry with exponential backoff

### Challenge 3: Large Result Sets
**Problem:** User has 1,000+ contacts to review.

**Solution:**
- Virtual scrolling in middle pane
- Filter by action type (create/update/skip)
- Smart defaults: "Approve all high-confidence matches"
- Save preview and resume later

### Challenge 4: Email Personalization at Scale
**Problem:** AI generates 50 emails = expensive & slow.

**Solution:**
- Generate in batches (10 at a time)
- Cache common personalizations
- Allow user to edit one and "apply to similar"
- Show cost estimate before executing

---

## 📦 Dependencies

### External APIs
- **Microsoft Graph API** (already integrated)
  - `/me/contacts` - List contacts
  - `/me/messages/` - Send emails
- **Google People API** (new)
  - `/v1/people/me/connections` - List contacts
  - Gmail API for sending

### Internal Services
- `convex/ai/openrouter.ts` - AI decisions
- `convex/oauth/microsoft.ts` - Microsoft OAuth
- `convex/crmOntology.ts` - CRM operations
- `012_ai_chat_email_tool_v2.md` - Three-pane UI

### New Packages
```json
{
  "dependencies": {
    "fuse.js": "^7.0.0",      // Fuzzy search for contact matching
    "diff": "^5.1.0",          // Show field diffs in UI
    "react-window": "^1.8.10"  // Virtual scrolling for large lists
  }
}
```

---

## 🧪 Testing Strategy

### Unit Tests
- [ ] Contact matching logic (fuzzy name/email)
- [ ] CRM query builder (pipeline, tags, filters)
- [ ] Email personalization (merge fields)
- [ ] Rate limiting / batching

### Integration Tests
- [ ] Full contact sync flow (Microsoft → CRM)
- [ ] Bulk email sending (CRM → Microsoft Graph)
- [ ] Three-pane UI interactions
- [ ] Error handling (invalid contacts, network failures)

### User Testing
- [ ] Sync 100+ contacts from real Microsoft account
- [ ] Send bulk email to 25+ CRM contacts
- [ ] Review UI with non-technical user
- [ ] Test conflict resolution UX

---

## 🚦 Go-Live Checklist

- [ ] Microsoft OAuth scopes approved
- [ ] Google OAuth configured (if Phase 3)
- [ ] AI prompts tested and refined
- [ ] Three-pane UI responsive on mobile
- [ ] Rate limiting tested (large syncs)
- [ ] Error messages user-friendly
- [ ] Documentation for users
- [ ] Audit logging enabled
- [ ] Performance metrics collected
- [ ] Security review completed

---

**Status:** Ready for Implementation
**Timeline:** 8 days (3 contact sync + 3 bulk email + 2 polish)
**Next Step:** Review plan → Set up Google OAuth → Start Phase 1
