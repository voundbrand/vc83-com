# Phase 4: Integration Expansion

**Goal**: Build out third-party integrations (OAuth flows, API clients) based on upvote data and user demand. Prioritize most-requested integrations.

**Estimated Duration**: Ongoing (iterative, prioritize top 5-10 first)

---

## Implementation Strategy

### 1. Integration Prioritization

- [ ] Create admin dashboard for integration upvotes:
  - [ ] Query: Most-upvoted unbuilt integrations
  - [ ] Show upvote count, requesting users, organizations
  - [ ] Sort by priority score (upvotes + user tier weight)

- [ ] Set integration build priority:
  - [ ] **Top Priority** (build first): 50+ upvotes or high-tier users
  - [ ] **Medium Priority** (build next): 20-49 upvotes
  - [ ] **Low Priority** (backlog): <20 upvotes

- [ ] Review existing integrations (19+ already built):
  - [ ] Verify OAuth flows work in Layers context
  - [ ] Test API clients with Layers execution engine
  - [ ] Document any missing features or edge cases

### 2. Integration Build Process

For each new integration, follow this workflow:

#### Step 1: Research & Documentation

- [ ] Review integration's API documentation
- [ ] Identify authentication method (OAuth, API key, webhook)
- [ ] Document available actions (triggers, actions, queries)
- [ ] Document required credentials and scopes
- [ ] Identify rate limits and usage quotas

#### Step 2: Node Configuration Schema

- [ ] Define node config schema:
  ```typescript
  {
    service: 'integration_name',
    config: {
      // Integration-specific fields
      account_id?: string,
      list_id?: string,
      tag?: string,
      // etc.
    },
    credentials_ref: string, // Reference to stored credentials
  }
  ```

- [ ] Define input/output handles:
  - [ ] What data does this node accept as input?
  - [ ] What data does this node output?
  - [ ] What fields are mappable?

#### Step 3: Credential Flow

- [ ] Implement OAuth flow (if applicable):
  - [ ] Create OAuth app in integration's developer portal
  - [ ] Add client ID and secret to environment variables
  - [ ] Implement OAuth callback route
  - [ ] Store access/refresh tokens encrypted in Convex
  - [ ] Implement token refresh logic

- [ ] Implement API key flow (if applicable):
  - [ ] Add secure input field in node inspector
  - [ ] Validate API key on save
  - [ ] Store encrypted in Convex

- [ ] Implement webhook authentication (if applicable):
  - [ ] Generate webhook secret
  - [ ] Verify webhook signatures

#### Step 4: API Client Implementation

- [ ] Create API client class/module:
  ```typescript
  class IntegrationClient {
    constructor(credentials: Credentials) {}

    async action1(params: any): Promise<any> {
      // API call logic
    }

    async action2(params: any): Promise<any> {
      // API call logic
    }
  }
  ```

- [ ] Implement error handling:
  - [ ] Handle rate limits (retry with backoff)
  - [ ] Handle authentication errors (refresh token)
  - [ ] Handle API errors (parse error messages)

- [ ] Add logging and monitoring:
  - [ ] Log all API calls (for debugging)
  - [ ] Track success/failure rates
  - [ ] Alert on repeated failures

#### Step 5: Node Executor

- [ ] Implement node executor for execution engine:
  ```typescript
  nodeExecutors['integration_name'] = async (node: WorkflowNode, context: ExecutionContext) => {
    const credentials = await getCredentials(node.credentials_ref);
    const client = new IntegrationClient(credentials);

    const input = mapInputData(node, context);
    const result = await client.action1(input);

    return mapOutputData(result, node);
  };
  ```

- [ ] Map node config to API parameters
- [ ] Map context data to API input
- [ ] Execute API call
- [ ] Map API response to node output
- [ ] Handle errors (throw or return error object)

#### Step 6: Testing

- [ ] Unit test API client:
  - [ ] Mock API responses
  - [ ] Test success cases
  - [ ] Test error cases (rate limit, auth failure, etc.)

- [ ] Integration test in Layers:
  - [ ] Create workflow with integration node
  - [ ] Configure credentials
  - [ ] Run workflow in Test mode
  - [ ] Verify output data correct

- [ ] Test in production:
  - [ ] Deploy integration to production
  - [ ] Have test user set up workflow with real credentials
  - [ ] Monitor execution logs for errors

#### Step 7: Documentation

- [ ] Write integration guide:
  - [ ] How to connect (OAuth or API key)
  - [ ] Available actions and triggers
  - [ ] Example workflows
  - [ ] Common use cases
  - [ ] Troubleshooting

- [ ] Add to node registry with status: "Available"
- [ ] Remove "Upvote" button from tool chest
- [ ] Announce to users who upvoted (email or in-app notification)

---

## Priority Integrations (Top 10)

Based on typical agency needs and likely upvote data:

### 1. HubSpot CRM

**Authentication**: OAuth 2.0

**Actions**:
- Create/update contact
- Add to list
- Update deal stage
- Send email via HubSpot
- Create task/note

**Triggers**:
- Contact created/updated
- Deal stage changed
- Form submitted

**Priority**: HIGH (large user base, common in agency stacks)

---

### 2. ActiveCampaign

**Authentication**: API Key

**Actions**:
- Add contact to list
- Apply tag
- Create deal
- Send email
- Update custom field

**Triggers**:
- Contact subscribed
- Tag applied
- Deal stage changed

**Priority**: HIGH (already integrated, verify Layers compatibility)

---

### 3. Mailchimp

**Authentication**: OAuth 2.0

**Actions**:
- Add subscriber to list
- Update subscriber
- Send campaign
- Add tag

**Triggers**:
- Subscriber added
- Campaign sent
- Subscriber unsubscribed

**Priority**: HIGH (widely used by small agencies)

---

### 4. Calendly

**Authentication**: OAuth 2.0

**Actions**:
- Get scheduled events
- Cancel event

**Triggers**:
- Event scheduled
- Event canceled
- Event rescheduled

**Priority**: HIGH (booking workflows common)

---

### 5. WordPress

**Authentication**: Application password or OAuth (via WordPress.com)

**Actions**:
- Create post/page
- Update post/page
- Get posts
- Add comment

**Triggers**:
- New post published
- New comment
- Form submitted (via WPForms, Contact Form 7, etc.)

**Priority**: MEDIUM (many agencies use WordPress for client sites)

---

### 6. Webflow

**Authentication**: API Key

**Actions**:
- Create CMS item
- Update CMS item
- Publish site

**Triggers**:
- Form submitted
- CMS item created

**Priority**: MEDIUM (growing popularity among agencies)

---

### 7. Salesforce

**Authentication**: OAuth 2.0

**Actions**:
- Create/update lead, contact, opportunity
- Add to campaign
- Create task

**Triggers**:
- Lead created/updated
- Opportunity stage changed

**Priority**: MEDIUM (enterprise agencies)

---

### 8. n8n

**Authentication**: Webhook

**Actions**:
- Trigger n8n workflow
- Get workflow execution result

**Triggers**:
- n8n workflow sends webhook to Layers

**Priority**: HIGH (bidirectional integration, strategic partnership)

---

### 9. Make (formerly Integromat)

**Authentication**: Webhook

**Actions**:
- Trigger Make scenario
- Send data to Make

**Triggers**:
- Make sends webhook to Layers

**Priority**: MEDIUM (automation power users)

---

### 10. Zapier

**Authentication**: Webhook (Layers as Zapier app)

**Actions**:
- Trigger Zap from Layers

**Triggers**:
- Zap sends data to Layers

**Priority**: HIGH (huge user base, strategic)

---

## Integration Categories

Group integrations by category for easier discovery:

### CRM
- [ ] HubSpot
- [ ] Salesforce
- [ ] Pipedrive
- [ ] Zoho CRM
- [ ] Copper

### Email Marketing
- [ ] ActiveCampaign (already integrated)
- [ ] Mailchimp
- [ ] ConvertKit
- [ ] Klaviyo
- [ ] SendinBlue

### Messaging
- [ ] WhatsApp Business (already integrated)
- [ ] ManyChat
- [ ] Telegram
- [ ] Instagram DM
- [ ] Facebook Messenger

### Communication
- [ ] Chatwoot (already integrated)
- [ ] Infobip (already integrated)
- [ ] Pushover
- [ ] Twilio SMS
- [ ] Slack

### Email Delivery
- [ ] Resend (already integrated)
- [ ] SendGrid
- [ ] Postmark
- [ ] Mailgun
- [ ] Amazon SES

### Websites
- [ ] WordPress
- [ ] Webflow
- [ ] Squarespace
- [ ] Wix
- [ ] Shopify

### Payments
- [ ] Stripe (already integrated)
- [ ] PayPal
- [ ] Mollie
- [ ] Square
- [ ] Braintree

### Automation
- [ ] n8n
- [ ] Make
- [ ] Zapier
- [ ] Pipedream

### Calendar & Booking
- [ ] Calendly
- [ ] Cal.com
- [ ] Acuity Scheduling
- [ ] SimplyBook.me

### Analytics
- [ ] PostHog (already integrated)
- [ ] Google Analytics
- [ ] Plausible
- [ ] Mixpanel
- [ ] Amplitude

### Dev & Deploy
- [ ] GitHub (already integrated)
- [ ] Vercel (already integrated)
- [ ] Netlify
- [ ] GitLab
- [ ] Bitbucket

### Office & Productivity
- [ ] Microsoft 365 (already integrated)
- [ ] Google Workspace (already integrated)
- [ ] Notion
- [ ] Airtable
- [ ] Asana

---

## n8n Integration (Strategic Priority)

n8n integration is a strategic priority because:
1. Many agencies already use n8n
2. n8n has 400+ integrations — instant expansion of Layers' capabilities
3. Bidirectional integration = Layers becomes more powerful, n8n users discover Layers

### Implementation Plan

**Option A: Webhook Bridge** (Simpler, faster)
- [ ] Layers can trigger n8n workflows via webhook
- [ ] n8n can trigger Layers workflows via webhook
- [ ] Data passes as JSON payload

**Option B: Native n8n Node** (Deeper integration)
- [ ] Create "Layer Cake" node in n8n
- [ ] Allows n8n users to call LC tools (CRM, Forms, etc.) from n8n workflows
- [ ] Requires publishing to n8n community nodes

**Option C: Embedded n8n** (Most ambitious)
- [ ] Embed n8n workflow engine inside Layers
- [ ] Layers workflows can contain n8n sub-flows
- [ ] Full bidirectional integration

**Recommended**: Start with **Option A** (webhook bridge), then build **Option B** (n8n community node) once Layers has proven adoption.

---

## Success Criteria

- Top 10 priority integrations implemented and tested
- All integrations have OAuth/API key flows working
- All integrations have node executors in execution engine
- Integration upvote system informs build priority
- Documentation for each integration published
- Users can build workflows with 30+ integrations (19 existing + 10 new)

---

## Testing Checklist

For each integration:
- [ ] Test OAuth flow (if applicable)
- [ ] Test API key flow (if applicable)
- [ ] Create workflow with integration node, configure credentials
- [ ] Run workflow in Test mode, verify output correct
- [ ] Run workflow in Live mode with real trigger, verify execution
- [ ] Test error handling (simulate API failure, rate limit)
- [ ] Document common use cases and example workflows

---

## Next Phase

Once Phase 4 is complete (or ongoing in parallel), proceed to **Phase 5: Monitoring & Polish** where we add workflow monitoring, analytics, performance optimization, and final UX polish.
