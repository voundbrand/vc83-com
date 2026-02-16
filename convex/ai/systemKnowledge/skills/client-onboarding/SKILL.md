# Skill: Client Onboarding

> References: `_SHARED.md` for all ontology definitions, mutation signatures, node types, and link types.

---

## 1. Purpose

This skill builds a complete client onboarding system for an agency's client. The deployment creates a project with milestones and tasks that track every phase of onboarding, captures detailed client information through an intake questionnaire, automates welcome communications and internal team notifications, analyzes questionnaire responses with AI to generate discovery insights, and tracks onboarding progress through a dedicated CRM pipeline. The outcome is a structured, repeatable onboarding process where new clients move through defined stages from contract signing to launch, with automated touchpoints ensuring nothing falls through the cracks. The canonical four-layer `BusinessLayer` model applies: `Business L1` (platform) provides infrastructure, `Business L2` (agency) configures and deploys, and the onboarded client stakeholder here is the `Business L3` customer (this workflow usually does not target a separate `Business L4` audience).

---

## 2. Ontologies Involved

### Objects (`objects` table)

| type | subtype | customProperties used |
|------|---------|----------------------|
| `project` | `client_project` | `projectCode`, `description`, `status`, `startDate`, `endDate`, `budget`, `milestones` (array of milestone objects with `title`, `dueDate`, `assignedTo`, `status`), `tasks` (array of task objects with `title`, `description`, `status`, `priority`, `assignedTo`, `dueDate`), `internalTeam` (array of `{ userId, role }`), `clientTeam` (array of `{ contactId, role }`), `publicPageConfig` |
| `crm_contact` | `customer` | `firstName`, `lastName`, `email`, `phone`, `companyName`, `contactType`, `tags`, `pipelineStageId`, `pipelineDealValue`, `customFields` (business info, goals, brand assets metadata, target audience) |
| `form` | `application` | `fields` (array of field objects for onboarding questionnaire), `formSettings` (redirect URL, notifications), `submissionWorkflow` |
| `layer_workflow` | `workflow` | Full `LayerWorkflowData`: `nodes`, `edges`, `metadata`, `triggers` |
| `automation_sequence` | `nachher` | Steps array with `channel`, `timing`, `content` -- welcome and milestone notification sequence |
| `automation_sequence` | `lifecycle` | Steps array with `channel`, `timing`, `content` -- ongoing check-in sequence |
| `builder_app` | `template_based` | Client welcome/portal page files |

### Object Links (`objectLinks` table)

| linkType | sourceObjectId | targetObjectId |
|----------|---------------|----------------|
| `workflow_form` | workflow (intake processing) | form (onboarding questionnaire) |
| `workflow_sequence` | workflow (intake processing) | sequence (welcome + milestone notifications) |
| `project_contact` | project (client project) | CRM contact (client stakeholder) |

---

## 3. Builder Components

### Client Welcome / Portal Page

The Builder generates a client-facing welcome page (`builder_app`, subtype: `template_based`) with these sections:

1. **Welcome Hero Section** -- Personalized greeting ("Welcome, [Client Name]!"), agency logo and branding, brief description of what to expect during onboarding.
2. **Onboarding Timeline Section** -- Visual milestone timeline showing phases: Discovery, Setup, Launch Prep, Launch, Optimize. Each phase shows estimated dates and current status.
3. **Questionnaire CTA Section** -- Prominent call-to-action to complete the onboarding questionnaire. Shows completion status if already submitted. Embedded form or link to standalone form page.
4. **Team Introduction Section** -- Photos and roles of the internal team members assigned to the client project (account manager, designer, developer, strategist).
5. **Resources Section** -- Links to brand asset upload portal, communication channels (Slack, email), meeting scheduler, and any relevant documentation or guides.
6. **Footer** -- Agency contact information, support email, privacy policy link.

**File:** `/builder/client-portal/index.html`

### Onboarding Questionnaire Form

**Object:** `type: "form"`, `subtype: "application"`

**Fields array:**

```json
[
  { "type": "section_header", "label": "Business Information", "required": false },
  { "type": "text",     "label": "Business Name",          "required": true,  "placeholder": "Your business name" },
  { "type": "text",     "label": "Business Address",       "required": true,  "placeholder": "123 Main St, City, State ZIP" },
  { "type": "phone",    "label": "Business Phone",         "required": true,  "placeholder": "+1 (555) 000-0000" },
  { "type": "email",    "label": "Primary Contact Email",  "required": true,  "placeholder": "owner@business.com" },
  { "type": "text",     "label": "Website URL (if existing)", "required": false, "placeholder": "https://yourbusiness.com" },
  { "type": "section_header", "label": "Brand Identity", "required": false },
  { "type": "textarea", "label": "Brand Story / Mission Statement", "required": true, "placeholder": "Tell us about your brand, its history, and what you stand for..." },
  { "type": "text",     "label": "Primary Brand Colors (hex codes)", "required": false, "placeholder": "#FF5733, #333333, #FFFFFF" },
  { "type": "text",     "label": "Brand Fonts (if any)",   "required": false, "placeholder": "Montserrat, Open Sans" },
  { "type": "select",   "label": "Do you have a logo and brand guidelines?", "required": true, "options": ["Yes, ready to share", "Yes, but needs updating", "No, I need branding help", "I have a logo but no formal guidelines"] },
  { "type": "select",   "label": "Do you have professional photography?", "required": true, "options": ["Yes, high-quality photos available", "Some photos but need more", "No professional photos", "I can arrange a photoshoot"] },
  { "type": "section_header", "label": "Goals and Objectives", "required": false },
  { "type": "textarea", "label": "What are your top 3 business goals for the next 6 months?", "required": true, "placeholder": "1. Increase foot traffic by 30%\n2. Build online presence\n3. Launch delivery service" },
  { "type": "select",   "label": "What is your primary marketing objective?", "required": true, "options": ["Increase brand awareness", "Generate leads / new customers", "Increase sales / revenue", "Improve customer retention", "Launch a new product or service", "Enter a new market"] },
  { "type": "number",   "label": "Monthly marketing budget (USD)", "required": false, "placeholder": "2000" },
  { "type": "section_header", "label": "Target Audience", "required": false },
  { "type": "textarea", "label": "Describe your ideal customer", "required": true, "placeholder": "Age range, location, income level, interests, pain points..." },
  { "type": "text",     "label": "Geographic target area",  "required": true,  "placeholder": "e.g., Within 15 miles of downtown Seattle" },
  { "type": "multi_select", "label": "Where does your audience spend time online?", "required": false, "options": ["Instagram", "Facebook", "TikTok", "Google Search", "YouTube", "LinkedIn", "Yelp", "Local directories", "Email newsletters"] },
  { "type": "section_header", "label": "Competitive Landscape", "required": false },
  { "type": "textarea", "label": "Who are your top 3 competitors?", "required": true, "placeholder": "Competitor 1: Name, website, what they do well\nCompetitor 2: ...\nCompetitor 3: ..." },
  { "type": "textarea", "label": "What makes you different from competitors?", "required": true, "placeholder": "Your unique selling proposition, specialties, awards, history..." },
  { "type": "section_header", "label": "Current Marketing", "required": false },
  { "type": "multi_select", "label": "Which marketing channels do you currently use?", "required": false, "options": ["Website", "Social media", "Email marketing", "Google Ads", "Facebook/Instagram Ads", "Print advertising", "Direct mail", "Referral program", "Events/sponsorships", "None"] },
  { "type": "textarea", "label": "What has worked well in the past? What has not?", "required": false, "placeholder": "Share any marketing wins or lessons learned..." },
  { "type": "section_header", "label": "Access and Credentials", "required": false },
  { "type": "textarea", "label": "List any existing accounts we will need access to", "required": false, "placeholder": "Google Business Profile, Facebook Business Page, Instagram, website hosting, analytics, etc." },
  { "type": "textarea", "label": "Anything else we should know?", "required": false, "placeholder": "Upcoming events, seasonal considerations, special requirements..." }
]
```

**formSettings:**
```json
{
  "redirectUrl": "/onboarding-thank-you",
  "notifications": { "adminEmail": true, "respondentEmail": true },
  "submissionBehavior": "redirect"
}
```

> **Customization note:** The fields above are designed for a marketing agency onboarding a business client. The section headers, field labels, and select options MUST be adapted to the agency's specific service offering. See Section 8.

### Progress Dashboard Page (Optional)

A secondary builder page that displays project milestones and task completion status. Useful for agencies that want to give clients visibility into project progress beyond the initial welcome page.

**File:** `/builder/progress-dashboard/index.html`

---

## 4. Layers Automations

### Workflow 1: Intake Processing (Required)

**Object:** `type: "layer_workflow"`, `subtype: "workflow"`, `name: "Client Intake Processing"`

**Trigger:** `trigger_form_submitted`

**Nodes:**

| id | type | label | config | status | position |
|----|------|-------|--------|--------|----------|
| `trigger-1` | `trigger_form_submitted` | "Questionnaire Submitted" | `{ "formId": "<QUESTIONNAIRE_FORM_ID>" }` | `ready` | `{ "x": 100, "y": 250 }` |
| `crm-1` | `lc_crm` | "Update Client Contact" | `{ "action": "update-contact", "contactId": "{{trigger.metadata.contactId}}", "tags": ["onboarding_active", "questionnaire_completed"], "customFields": { "businessName": "{{trigger.businessName}}", "businessAddress": "{{trigger.businessAddress}}", "businessPhone": "{{trigger.businessPhone}}", "website": "{{trigger.websiteUrl}}", "brandStory": "{{trigger.brandStoryMissionStatement}}", "brandColors": "{{trigger.primaryBrandColors}}", "hasLogo": "{{trigger.doYouHaveALogoAndBrandGuidelines}}", "hasPhotography": "{{trigger.doYouHaveProfessionalPhotography}}", "goals": "{{trigger.whatAreYourTop3BusinessGoals}}", "primaryObjective": "{{trigger.whatIsYourPrimaryMarketingObjective}}", "monthlyBudget": "{{trigger.monthlyMarketingBudget}}", "idealCustomer": "{{trigger.describeYourIdealCustomer}}", "geoTarget": "{{trigger.geographicTargetArea}}", "onlineChannels": "{{trigger.whereDoesYourAudienceSpendTimeOnline}}", "competitors": "{{trigger.whoAreYourTop3Competitors}}", "differentiator": "{{trigger.whatMakesYouDifferentFromCompetitors}}", "currentChannels": "{{trigger.whichMarketingChannelsDoYouCurrentlyUse}}", "pastResults": "{{trigger.whatHasWorkedWellInThePast}}", "existingAccounts": "{{trigger.listAnyExistingAccountsWeWillNeedAccessTo}}", "additionalNotes": "{{trigger.anythingElseWeShouldKnow}}" } }` | `ready` | `{ "x": 350, "y": 250 }` |
| `email-1` | `lc_email` | "Send Welcome Pack" | `{ "action": "send-confirmation-email", "to": "{{crm-1.output.email}}", "subject": "Welcome aboard! Here's your onboarding roadmap", "body": "Hi {{crm-1.output.firstName}},\n\nThank you for completing the onboarding questionnaire. We are excited to get started on your project.\n\nHere is what happens next:\n\n1. Our team will review your questionnaire responses within 24 hours\n2. Your account manager will schedule a discovery call to discuss your goals in detail\n3. We will prepare a customized strategy based on your input\n\nIn the meantime, you can access your client portal here: [PORTAL_LINK]\n\nYour dedicated team:\n- Account Manager: [AM_NAME] ([AM_EMAIL])\n- Project Lead: [PL_NAME] ([PL_EMAIL])\n\nIf you have any questions, reply to this email or reach out to your account manager directly.\n\nWelcome to the team,\n[AGENCY_NAME]" }` | `ready` | `{ "x": 600, "y": 100 }` |
| `ai-1` | `lc_ai_agent` | "Analyze Questionnaire" | `{ "prompt": "Analyze the following client onboarding questionnaire responses and produce a structured discovery brief. Include: 1) Business summary (2-3 sentences), 2) Key goals ranked by priority, 3) Target audience profile, 4) Competitive positioning opportunities, 5) Recommended marketing channels based on audience and budget, 6) Potential challenges or risks, 7) Suggested quick wins for the first 30 days. Client responses: {{crm-1.output.customFields}}", "model": "claude-sonnet" }` | `ready` | `{ "x": 600, "y": 250 }` |
| `crm-2` | `lc_crm` | "Move to Discovery" | `{ "action": "move-pipeline-stage", "contactId": "{{crm-1.output.contactId}}", "pipelineStageId": "discovery" }` | `ready` | `{ "x": 850, "y": 250 }` |
| `ac-1` | `activecampaign` | "Tag Onboarding Active" | `{ "action": "add_tag", "contactEmail": "{{crm-1.output.email}}", "tag": "onboarding_active" }` | `ready` | `{ "x": 850, "y": 400 }` |
| `email-2` | `lc_email` | "Notify Team: New Questionnaire" | `{ "action": "send-admin-notification", "to": "<ADMIN_EMAIL>", "subject": "New Client Questionnaire: {{crm-1.output.customFields.businessName}}", "body": "A new client has completed their onboarding questionnaire.\n\nClient: {{crm-1.output.firstName}} {{crm-1.output.lastName}}\nBusiness: {{crm-1.output.customFields.businessName}}\nPrimary Goal: {{crm-1.output.customFields.primaryObjective}}\nMonthly Budget: ${{crm-1.output.customFields.monthlyBudget}}\n\nAI Discovery Brief:\n{{ai-1.output.result}}\n\nFull questionnaire responses are available in the CRM contact record.\n\nNext step: Schedule discovery call within 24 hours." }` | `ready` | `{ "x": 1100, "y": 250 }` |

**Edges:**

| id | source | target | sourceHandle | targetHandle |
|----|--------|--------|-------------|-------------|
| `e-1` | `trigger-1` | `crm-1` | `output` | `input` |
| `e-2` | `crm-1` | `email-1` | `output` | `input` |
| `e-3` | `crm-1` | `ai-1` | `output` | `input` |
| `e-4` | `ai-1` | `crm-2` | `output` | `input` |
| `e-5` | `crm-1` | `ac-1` | `output` | `input` |
| `e-6` | `ai-1` | `email-2` | `output` | `input` |

**Mutations to execute:**

1. `createWorkflow({ sessionId, name: "Client Intake Processing", description: "Processes onboarding questionnaire submissions, updates CRM, analyzes responses with AI, moves pipeline to discovery, notifies team" })`
2. `saveWorkflow({ sessionId, workflowId: <ID>, name: "Client Intake Processing", nodes: [...], edges: [...], triggers: [{ type: "trigger_form_submitted", config: { formId: "<QUESTIONNAIRE_FORM_ID>" } }] })`
3. `updateWorkflowStatus({ sessionId, workflowId: <ID>, status: "active" })`

---

### Workflow 2: Milestone Tracking (Required)

**Object:** `type: "layer_workflow"`, `subtype: "workflow"`, `name: "Onboarding Milestone Tracker"`

**Trigger:** `trigger_webhook`

**Nodes:**

| id | type | label | config | status | position |
|----|------|-------|--------|--------|----------|
| `trigger-1` | `trigger_webhook` | "Milestone Completed" | `{ "path": "/webhooks/milestone-complete", "secret": "<WEBHOOK_SECRET>" }` | `ready` | `{ "x": 100, "y": 250 }` |
| `if-1` | `if_then` | "Check Milestone Type" | `{ "expression": "{{trigger.milestoneTitle}} === 'Discovery'" }` | `ready` | `{ "x": 350, "y": 150 }` |
| `crm-1` | `lc_crm` | "Move to Setup" | `{ "action": "move-pipeline-stage", "contactId": "{{trigger.contactId}}", "pipelineStageId": "setup" }` | `ready` | `{ "x": 600, "y": 50 }` |
| `if-2` | `if_then` | "Is Setup Complete?" | `{ "expression": "{{trigger.milestoneTitle}} === 'Setup'" }` | `ready` | `{ "x": 600, "y": 200 }` |
| `crm-2` | `lc_crm` | "Move to Launch Prep" | `{ "action": "move-pipeline-stage", "contactId": "{{trigger.contactId}}", "pipelineStageId": "launch_prep" }` | `ready` | `{ "x": 850, "y": 150 }` |
| `if-3` | `if_then` | "Is Launch Prep Complete?" | `{ "expression": "{{trigger.milestoneTitle}} === 'Launch Prep'" }` | `ready` | `{ "x": 850, "y": 300 }` |
| `crm-3` | `lc_crm` | "Move to Launched" | `{ "action": "move-pipeline-stage", "contactId": "{{trigger.contactId}}", "pipelineStageId": "launched" }` | `ready` | `{ "x": 1100, "y": 250 }` |
| `email-1` | `lc_email` | "Client: Milestone Complete" | `{ "action": "send-confirmation-email", "to": "{{trigger.clientEmail}}", "subject": "Milestone Complete: {{trigger.milestoneTitle}}", "body": "Hi {{trigger.clientFirstName}},\n\nGreat news! We have completed the {{trigger.milestoneTitle}} phase of your project.\n\nHere is a summary of what was accomplished:\n{{trigger.milestoneSummary}}\n\nNext up: {{trigger.nextMilestoneTitle}} (target date: {{trigger.nextMilestoneDueDate}})\n\nYou can view your full project timeline on your client portal: [PORTAL_LINK]\n\nIf you have any questions, reach out to your account manager.\n\nOnward,\n[AGENCY_NAME]" }` | `ready` | `{ "x": 1100, "y": 450 }` |
| `email-2` | `lc_email` | "Team: Milestone Complete" | `{ "action": "send-admin-notification", "to": "<ADMIN_EMAIL>", "subject": "Milestone Complete: {{trigger.milestoneTitle}} - {{trigger.clientBusinessName}}", "body": "Milestone completed for {{trigger.clientBusinessName}}.\n\nCompleted: {{trigger.milestoneTitle}}\nNext Phase: {{trigger.nextMilestoneTitle}}\nDue Date: {{trigger.nextMilestoneDueDate}}\nAssigned To: {{trigger.nextMilestoneAssignedTo}}\n\nPipeline has been updated automatically." }` | `ready` | `{ "x": 1350, "y": 250 }` |

**Edges:**

| id | source | target | sourceHandle | targetHandle |
|----|--------|--------|-------------|-------------|
| `e-1` | `trigger-1` | `if-1` | `output` | `input` |
| `e-2` | `if-1` | `crm-1` | `true` | `input` |
| `e-3` | `if-1` | `if-2` | `false` | `input` |
| `e-4` | `if-2` | `crm-2` | `true` | `input` |
| `e-5` | `if-2` | `if-3` | `false` | `input` |
| `e-6` | `if-3` | `crm-3` | `true` | `input` |
| `e-7` | `crm-1` | `email-1` | `output` | `input` |
| `e-8` | `crm-2` | `email-1` | `output` | `input` |
| `e-9` | `crm-3` | `email-1` | `output` | `input` |
| `e-10` | `email-1` | `email-2` | `output` | `input` |

**Mutations to execute:**

1. `createWorkflow({ sessionId, name: "Onboarding Milestone Tracker", description: "Tracks milestone completions, moves pipeline stages, notifies client and internal team" })`
2. `saveWorkflow({ sessionId, workflowId: <ID>, name: "Onboarding Milestone Tracker", nodes: [...], edges: [...], triggers: [{ type: "trigger_webhook", config: { path: "/webhooks/milestone-complete", secret: "<WEBHOOK_SECRET>" } }] })`
3. `updateWorkflowStatus({ sessionId, workflowId: <ID>, status: "active" })`

---

### Workflow 3: Questionnaire Reminder (Optional)

**Object:** `type: "layer_workflow"`, `subtype: "workflow"`, `name: "Onboarding Questionnaire Reminder"`

**Trigger:** `trigger_schedule`

**Nodes:**

| id | type | label | config | status | position |
|----|------|-------|--------|--------|----------|
| `trigger-1` | `trigger_schedule` | "Check Questionnaire Status" | `{ "cronExpression": "0 9 * * *", "timezone": "<CLIENT_TIMEZONE>" }` | `ready` | `{ "x": 100, "y": 200 }` |
| `crm-1` | `lc_crm` | "Check Contact Tags" | `{ "action": "update-contact", "contactId": "{{trigger.contactId}}", "tags": [] }` | `ready` | `{ "x": 350, "y": 200 }` |
| `if-1` | `if_then` | "Questionnaire Completed?" | `{ "expression": "{{crm-1.output.tags}}.includes('questionnaire_completed')" }` | `ready` | `{ "x": 600, "y": 200 }` |
| `email-1` | `lc_email` | "Send Reminder" | `{ "action": "send-confirmation-email", "to": "{{crm-1.output.email}}", "subject": "Quick reminder: Your onboarding questionnaire", "body": "Hi {{crm-1.output.firstName}},\n\nWe noticed you have not yet completed the onboarding questionnaire. This helps us understand your business and build the best strategy for you.\n\nIt takes about 15-20 minutes to complete: [QUESTIONNAIRE_LINK]\n\nThe sooner we receive your responses, the sooner we can kick off the discovery phase and start delivering results.\n\nIf you have any questions about the form, just reply to this email.\n\nBest,\n[ACCOUNT_MANAGER_NAME]\n[AGENCY_NAME]" }` | `ready` | `{ "x": 850, "y": 300 }` |

**Edges:**

| id | source | target | sourceHandle | targetHandle |
|----|--------|--------|-------------|-------------|
| `e-1` | `trigger-1` | `crm-1` | `output` | `input` |
| `e-2` | `crm-1` | `if-1` | `output` | `input` |
| `e-3` | `if-1` | `email-1` | `false` | `input` |

> Note: The `true` handle of `if-1` has no connection -- contacts who have already completed the questionnaire are not sent a reminder. The flow ends silently.

**Mutations to execute:**

1. `createWorkflow({ sessionId, name: "Onboarding Questionnaire Reminder", description: "Daily check for incomplete onboarding questionnaires, sends reminder emails" })`
2. `saveWorkflow({ sessionId, workflowId: <ID>, name: "Onboarding Questionnaire Reminder", nodes: [...], edges: [...], triggers: [{ type: "trigger_schedule", config: { cronExpression: "0 9 * * *", timezone: "<CLIENT_TIMEZONE>" } }] })`
3. `updateWorkflowStatus({ sessionId, workflowId: <ID>, status: "active" })`

---

### Workflow 4: Onboarding Completion (Required)

**Object:** `type: "layer_workflow"`, `subtype: "workflow"`, `name: "Client Onboarding Completion"`

**Trigger:** `trigger_manual`

**Nodes:**

| id | type | label | config | status | position |
|----|------|-------|--------|--------|----------|
| `trigger-1` | `trigger_manual` | "All Milestones Done" | `{ "sampleData": { "contactId": "sample_contact_id", "projectId": "sample_project_id", "clientEmail": "client@example.com", "clientFirstName": "Jane", "businessName": "Sample Business" } }` | `ready` | `{ "x": 100, "y": 250 }` |
| `crm-1` | `lc_crm` | "Move to Launched" | `{ "action": "move-pipeline-stage", "contactId": "{{trigger.contactId}}", "pipelineStageId": "launched" }` | `ready` | `{ "x": 350, "y": 250 }` |
| `email-1` | `lc_email` | "Launch Announcement" | `{ "action": "send-confirmation-email", "to": "{{trigger.clientEmail}}", "subject": "You are officially launched! Here is what comes next", "body": "Hi {{trigger.clientFirstName}},\n\nCongratulations! Your onboarding is complete and everything is now live.\n\nHere is a summary of what we built together:\n\n- Website: [WEBSITE_URL]\n- Social profiles: [SOCIAL_LINKS]\n- Google Business Profile: [GBP_LINK]\n- Review management system: Active\n- Content calendar: Loaded for the next 30 days\n\nWhat happens now:\n1. We will monitor performance daily and send you weekly reports\n2. Your first performance review call is scheduled for [DATE]\n3. Our team continues managing your campaigns and content\n\nYou can always check your project status on your client portal: [PORTAL_LINK]\n\nThank you for trusting us with your marketing. We are excited to watch your business grow.\n\nCheers,\n[AGENCY_NAME]" }` | `ready` | `{ "x": 600, "y": 150 }` |
| `ac-1` | `activecampaign` | "Remove Onboarding Tag" | `{ "action": "add_tag", "contactEmail": "{{trigger.clientEmail}}", "tag": "onboarding_complete" }` | `ready` | `{ "x": 600, "y": 350 }` |
| `ac-2` | `activecampaign` | "Tag Active Client" | `{ "action": "add_tag", "contactEmail": "{{trigger.clientEmail}}", "tag": "active_client" }` | `ready` | `{ "x": 850, "y": 350 }` |
| `email-2` | `lc_email` | "Notify Team: Client Launched" | `{ "action": "send-admin-notification", "to": "<ADMIN_EMAIL>", "subject": "Client Launched: {{trigger.businessName}}", "body": "{{trigger.businessName}} has completed onboarding and is now live.\n\nClient: {{trigger.clientFirstName}}\nBusiness: {{trigger.businessName}}\nPipeline Stage: Launched\n\nOnboarding tags updated:\n- Removed: onboarding_active\n- Added: active_client, onboarding_complete\n\nThis client is now in the optimization phase. Ensure weekly reports are scheduled and the first performance review call is booked." }` | `ready` | `{ "x": 850, "y": 150 }` |

**Edges:**

| id | source | target | sourceHandle | targetHandle |
|----|--------|--------|-------------|-------------|
| `e-1` | `trigger-1` | `crm-1` | `output` | `input` |
| `e-2` | `crm-1` | `email-1` | `output` | `input` |
| `e-3` | `crm-1` | `ac-1` | `output` | `input` |
| `e-4` | `ac-1` | `ac-2` | `output` | `input` |
| `e-5` | `email-1` | `email-2` | `output` | `input` |

**Mutations to execute:**

1. `createWorkflow({ sessionId, name: "Client Onboarding Completion", description: "Marks client as launched, sends launch announcement, updates tags, notifies internal team" })`
2. `saveWorkflow({ sessionId, workflowId: <ID>, name: "Client Onboarding Completion", nodes: [...], edges: [...], triggers: [{ type: "trigger_manual", config: { sampleData: { contactId: "sample_contact_id", projectId: "sample_project_id" } } }] })`
3. `updateWorkflowStatus({ sessionId, workflowId: <ID>, status: "active" })`

---

## 5. CRM Pipeline Definition

### Pipeline Name: "Client Onboarding Pipeline"

| Stage ID | Stage Name | Description | Automation Trigger |
|----------|-----------|-------------|-------------------|
| `signed` | Signed | Contract signed, client officially engaged. Onboarding begins. | Manual move after contract execution |
| `discovery` | Discovery | Questionnaire completed, AI analysis generated, discovery call scheduled. | Auto-set by Workflow 1 (`crm-2` node) after questionnaire submission |
| `setup` | Setup | Active build phase: website, profiles, systems being configured. | Auto-set by Workflow 2 (`crm-1` node) when Discovery milestone completes |
| `launch_prep` | Launch Prep | Final review, content loaded, testing and QA in progress. | Auto-set by Workflow 2 (`crm-2` node) when Setup milestone completes |
| `launched` | Launched | All deliverables live. Client is operational. | Auto-set by Workflow 2 (`crm-3` node) or Workflow 4 (`crm-1` node) |
| `optimizing` | Optimizing | Ongoing management phase: monitoring, reporting, iterating. | Manual move after first performance review, typically 2-4 weeks post-launch |

### Stage Transitions

```
signed -> discovery           (questionnaire submitted, Workflow 1)
discovery -> setup            (discovery milestone completed, Workflow 2)
setup -> launch_prep          (setup milestone completed, Workflow 2)
launch_prep -> launched       (launch prep milestone completed, Workflow 2 / Workflow 4)
launched -> optimizing        (manual, after first performance review)
```

---

## 6. File System Scaffold

**Project:** `type: "project"`, `subtype: "client_project"`

After calling `initializeProjectFolders({ organizationId, projectId })`, the default folders are created. Then populate:

```
/
├── builder/
│   ├── client-portal/              (kind: builder_ref -> builder_app for client welcome/portal page)
│   └── progress-dashboard/         (kind: builder_ref -> builder_app for progress dashboard -- optional)
├── layers/
│   ├── intake-processing-workflow   (kind: layer_ref -> layer_workflow "Client Intake Processing")
│   ├── milestone-tracker-workflow   (kind: layer_ref -> layer_workflow "Onboarding Milestone Tracker")
│   ├── questionnaire-reminder       (kind: layer_ref -> layer_workflow "Onboarding Questionnaire Reminder" -- optional)
│   └── completion-workflow          (kind: layer_ref -> layer_workflow "Client Onboarding Completion")
├── notes/
│   ├── onboarding-brief             (kind: virtual, content: client overview, service scope, timeline, KPIs)
│   ├── discovery-brief              (kind: virtual, content: AI-generated analysis from questionnaire responses)
│   └── meeting-notes/               (kind: folder)
│       ├── discovery-call            (kind: virtual, content: discovery call notes and action items)
│       └── kickoff-call              (kind: virtual, content: kickoff meeting notes)
├── assets/
│   ├── brand-assets/                (kind: folder)
│   │   ├── logo                     (kind: media_ref -> client logo files)
│   │   ├── brand-guidelines         (kind: media_ref -> brand guideline document)
│   │   └── photography/             (kind: folder)
│   │       └── product-photos       (kind: media_ref -> client product/service photos)
│   ├── questionnaire-responses/     (kind: folder)
│   │   └── intake-form-data         (kind: virtual, content: raw questionnaire response data)
│   └── deliverables/                (kind: folder)
│       ├── website-files            (kind: media_ref -> exported website assets)
│       ├── social-templates         (kind: media_ref -> social media templates)
│       └── content-calendar         (kind: media_ref -> content calendar export)
```

**Mutations to execute:**

1. `initializeProjectFolders({ organizationId: <ORG_ID>, projectId: <PROJECT_ID> })`
2. `createVirtualFile({ sessionId, projectId: <PROJECT_ID>, name: "onboarding-brief", parentPath: "/notes", content: "<onboarding brief markdown>" })`
3. `createVirtualFile({ sessionId, projectId: <PROJECT_ID>, name: "discovery-brief", parentPath: "/notes", content: "<AI-generated discovery brief>" })`
4. `createFolder({ sessionId, projectId: <PROJECT_ID>, name: "meeting-notes", parentPath: "/notes" })`
5. `createFolder({ sessionId, projectId: <PROJECT_ID>, name: "questionnaire-responses", parentPath: "/assets" })`
6. `createFolder({ sessionId, projectId: <PROJECT_ID>, name: "deliverables", parentPath: "/assets" })`
7. `captureBuilderApp({ projectId: <PROJECT_ID>, builderAppId: <CLIENT_PORTAL_APP_ID> })`
8. `captureLayerWorkflow({ projectId: <PROJECT_ID>, layerWorkflowId: <INTAKE_WF_ID> })`
9. `captureLayerWorkflow({ projectId: <PROJECT_ID>, layerWorkflowId: <MILESTONE_WF_ID> })`
10. `captureLayerWorkflow({ projectId: <PROJECT_ID>, layerWorkflowId: <COMPLETION_WF_ID> })`

---

## 7. Data Flow Diagram

```
                                CLIENT ONBOARDING - DATA FLOW
                                ==============================

  CLIENT                           PLATFORM (L4YERCAK3)                        EXTERNAL SYSTEMS
  ======                           ====================                        ================

  +------------------+
  | Contract Signed  |
  | (manual trigger) |
  +--------+---------+
           |
           | agency creates project + contact + sends questionnaire link
           v
  +------------------+
  | Receives Welcome |
  | Email + Portal   |
  | Link             |
  +--------+---------+
           |
           v
  +------------------+
  | Fills Out        |-----> submitPublicForm({ formId, responses, metadata })
  | Onboarding       |
  | Questionnaire    |
  +--------+---------+
           |
           |         +----------------------------------------------------------+
           |         |  WORKFLOW 1: Intake Processing                            |
           |         |                                                          |
           +-------->|  trigger_form_submitted                                  |
                     |         |                                                |
                     |         | (output -> input)                              |
                     |         v                                                |
                     |  lc_crm [update-contact]                                 |
                     |  -> updates objects { type: "crm_contact",               |
                     |     subtype: "customer", tags: ["onboarding_active",     |
                     |     "questionnaire_completed"] }                         |
                     |         |                                                |
                     |         +------------+-------------+                     |
                     |         |            |             |                     |
                     |    (output->input) (output->input) (output->input)       |
                     |         |            |             |                     |
                     |         v            v             v                     |
                     |    lc_email     lc_ai_agent   activecampaign            |
                     |    [send-       [analyze       [add_tag:                 |
                     |    confirmation  questionnaire  "onboarding_active"]     |
                     |    -email:      responses]           |                   |
                     |    welcome pack]     |               |         +------+  |
                     |                      |               +-------->| AC   |  |
                     |                 (output->input)                +------+  |
                     |                      v                                   |
                     |                 lc_crm [move-pipeline-stage              |
                     |                  -> "discovery"]                         |
                     |                      |                                   |
                     |                 (output->input)                          |
                     |                      v                                   |
                     |                 lc_email                                 |
                     |                 [send-admin-notification:                |
                     |                  "New questionnaire + AI brief"]         |
                     |                                                          |
                     +----------------------------------------------------------+

           MILESTONE PROGRESSION (Workflow 2):

           [Discovery Phase]
                |
                | milestone completed (webhook)
                v
           lc_crm [move-pipeline-stage -> "setup"]
                |
                +---> lc_email [client: milestone complete]
                +---> lc_email [team: milestone complete]
                |
                v
           [Setup Phase]
                |
                | milestone completed (webhook)
                v
           lc_crm [move-pipeline-stage -> "launch_prep"]
                |
                +---> lc_email [client: milestone complete]
                +---> lc_email [team: milestone complete]
                |
                v
           [Launch Prep Phase]
                |
                | milestone completed (webhook)
                v
           lc_crm [move-pipeline-stage -> "launched"]
                |
                +---> lc_email [client: milestone complete]
                +---> lc_email [team: milestone complete]

           COMPLETION (Workflow 4):

           trigger_manual (all milestones done)
                |
                v
           lc_crm [move-pipeline-stage -> "launched"]
                |
                +---> lc_email [launch announcement to client]
                +---> activecampaign [add_tag: "onboarding_complete"]
                |          |
                |          v
                |     activecampaign [add_tag: "active_client"]
                +---> lc_email [send-admin-notification: "Client launched"]

  PIPELINE PROGRESSION:

  [signed] --> [discovery] --> [setup] --> [launch_prep] --> [launched] --> [optimizing]
```

---

## 8. Customization Points

### Must-Customize (deployment will fail or be meaningless without these)

| Item | Why | Where |
|------|-----|-------|
| Service type / offering | Determines questionnaire fields, milestone names, deliverables | Form `fields` array, project `milestones` array, file system `/deliverables` |
| Milestone names and timeline | Must match the agency's actual delivery process | `createMilestone` calls, Workflow 2 `if_then` expressions, sequence step content |
| Questionnaire fields | Must capture information relevant to the specific service being delivered | Form `fields` array -- change section headers, labels, options, required flags |
| Team members | Must reflect actual staff assigned to the project | `addInternalTeamMember` calls, welcome email body, client portal team section |
| Agency name and branding | Appears in all client-facing emails and the portal page | `lc_email` node config `body`, builder page content |
| Admin notification email | Internal team must receive alerts | Workflow 1 `email-2` and Workflow 2 `email-2` node config `to` |
| Webhook secret | Secures milestone completion endpoint | Workflow 2 `trigger_webhook` config `secret` |

### Should-Customize (significantly improves the onboarding experience)

| Item | Why | Default |
|------|-----|---------|
| Welcome email copy | Should reflect the agency's voice, specific service details, and actual portal URL | Generic welcome template with placeholder links |
| Onboarding timeline / due dates | Must match realistic delivery schedule for the service | No specific dates set |
| Milestone descriptions | Help clients understand what each phase involves | Generic phase names only |
| AI analysis prompt | Should focus on extracting insights relevant to the service being delivered | Generic marketing analysis prompt |
| Client portal page design | Should match agency brand and include service-specific information | Generic welcome page template |
| ActiveCampaign tags | Tags should align with the agency's existing segmentation strategy | Generic `onboarding_active` and `active_client` tags |

### Can-Use-Default (work out of the box for most deployments)

| Item | Default Value |
|------|--------------|
| Pipeline stages | signed -> discovery -> setup -> launch_prep -> launched -> optimizing |
| Workflow structure | 4 workflows as defined in Section 4 |
| File system folder structure | `/builder`, `/layers`, `/notes`, `/assets` with sub-folders for brand assets, questionnaire responses, deliverables |
| Questionnaire reminder timing | Daily at 9:00 AM in client timezone |
| Contact subtype | `customer` |
| Project subtype | `client_project` |
| Workflow status progression | `draft` -> `ready` -> `active` |
| Sequence channels | `email` for all steps |

---

## 9. Common Pitfalls

### What Breaks

| Pitfall | Symptom | Fix |
|---------|---------|-----|
| Form not linked to workflow | Questionnaire submissions do not trigger the Intake Processing Workflow | Create objectLink: `{ sourceObjectId: <WORKFLOW_ID>, targetObjectId: <FORM_ID>, linkType: "workflow_form" }`. Also ensure `trigger_form_submitted` node config has the correct `formId`. |
| ActiveCampaign integration not connected | `activecampaign` nodes fail silently or error | Verify the agency's ActiveCampaign API credentials are configured in the organization's integration settings before activating the workflow. |
| Milestone webhook path mismatch | Milestone completions do not trigger pipeline moves | Ensure the webhook path in Workflow 2 matches the exact path being called when marking milestones complete. Copy-paste the path, do not retype. |
| Pipeline stage IDs mismatch | `move-pipeline-stage` action fails or moves to wrong stage | The `pipelineStageId` values in `lc_crm` node configs must exactly match the stage IDs defined in the CRM pipeline. Copy-paste, do not retype. |
| Workflow 2 `if_then` expressions do not match milestone titles | Pipeline never advances because the condition never evaluates to true | The `expression` strings in Workflow 2 `if-1`, `if-2`, `if-3` must use the exact milestone title strings passed in the webhook payload. |
| Missing email sender configuration | Emails fail to send or land in spam | Confirm the organization has a verified sender domain and the `lc_email` node `to` field uses valid template variables. |
| Form `formId` placeholder not replaced | Workflow trigger never fires | After creating the form, update the `trigger_form_submitted` node config with the actual `formId` returned by `createForm`. Then call `saveWorkflow` again. |
| Workflow left in `draft` status | No automations execute | After saving all nodes/edges, call `updateWorkflowStatus({ status: "active" })`. |
| AI agent prompt too generic | Discovery brief lacks actionable insights for the specific service | Customize the `lc_ai_agent` prompt to focus on the agency's specific service area and the type of analysis that will be most useful. |
| Client contact not created before questionnaire | `update-contact` in Workflow 1 fails because there is no contact to update | Create the CRM contact during the project setup step (before sending the questionnaire link). The questionnaire form metadata must include the `contactId`. |
| Project milestones not aligned with pipeline stages | Pipeline moves happen at wrong times or not at all | Each milestone completion should map to exactly one pipeline stage transition. Audit the Workflow 2 `if_then` chain against the pipeline definition. |

### Pre-Launch Self-Check List

1. CRM contact for the client exists and has `pipelineStageId` set to `signed`.
2. Project created with all milestones, tasks, internalTeam, and clientTeam populated.
3. Onboarding questionnaire form exists and is published (`publishForm` was called).
4. Form `formId` is set in Workflow 1 `trigger_form_submitted` node config.
5. `objectLink` with `linkType: "workflow_form"` connects Workflow 1 to the questionnaire form.
6. `objectLink` with `linkType: "workflow_sequence"` connects Workflow 1 to the welcome sequence.
7. `objectLink` with `linkType: "project_contact"` connects the project to the client contact.
8. All `pipelineStageId` values in `lc_crm` nodes match actual pipeline stage IDs.
9. Workflow 2 `if_then` expressions match the exact milestone title strings.
10. Webhook secret in Workflow 2 is set and matches the calling system.
11. ActiveCampaign tags and integration credentials are configured.
12. `lc_email` sender identity is configured and verified.
13. Client portal page is deployed and accessible at the URL referenced in emails.
14. AI agent prompt in Workflow 1 is customized for the specific service.
15. All four workflows have `status: "active"`.
16. File system scaffold is initialized with all required folders.
17. Internal team members are notified of their project assignments.

---

## 10. Example Deployment Scenario

### Scenario: Digital Marketing Agency Onboards a Restaurant Client

A digital marketing agency ("Amplify Digital Agency") onboards a new restaurant client ("Bella Cucina Italian Restaurant"). The service package includes a complete digital marketing solution: website redesign, social media management, local SEO, Google Business Profile optimization, and online review management.

**Agency:** Amplify Digital Agency
**Client:** Bella Cucina Italian Restaurant
**Service:** Complete digital marketing package (website, social media, local SEO, review management)
**Contract Value:** $3,500/month
**Onboarding Timeline:** 8 weeks

---

### Step 1: Create the CRM Contact

```
createContact({
  sessionId: "<SESSION_ID>",
  organizationId: "<ORG_ID>",
  firstName: "Marco",
  lastName: "Rossi",
  email: "marco@bellacucina.com",
  phone: "+1 (555) 892-4310",
  contactType: "customer",
  customFields: {
    "companyName": "Bella Cucina Italian Restaurant",
    "contractValue": 3500,
    "contractStartDate": "2026-03-01",
    "servicePackage": "Complete Digital Marketing"
  },
  tags: ["new_client", "restaurant", "digital_marketing_package"]
})
// Returns: contactId = "contact_bella_cucina_001"
```

---

### Step 2: Create the Project

```
createProject({
  sessionId: "<SESSION_ID>",
  organizationId: "<ORG_ID>",
  name: "Bella Cucina - Digital Marketing Onboarding",
  subtype: "client_project",
  description: "Complete digital marketing onboarding for Bella Cucina Italian Restaurant. Includes website redesign, social media setup, local SEO, Google Business Profile optimization, and review management system.",
  startDate: 1740787200000,
  endDate: 1744588800000,
  budget: 28000,
  clientContactId: "contact_bella_cucina_001"
})
// Returns: projectId = "proj_bella_cucina_001"
```

```
initializeProjectFolders({
  organizationId: "<ORG_ID>",
  projectId: "proj_bella_cucina_001"
})
```

### Step 2b: Create Milestones

```
createMilestone({
  sessionId: "<SESSION_ID>",
  projectId: "proj_bella_cucina_001",
  title: "Discovery",
  dueDate: 1741392000000,
  assignedTo: "user_account_manager_001"
})

createMilestone({
  sessionId: "<SESSION_ID>",
  projectId: "proj_bella_cucina_001",
  title: "Setup",
  dueDate: 1742601600000,
  assignedTo: "user_project_lead_001"
})

createMilestone({
  sessionId: "<SESSION_ID>",
  projectId: "proj_bella_cucina_001",
  title: "Launch Prep",
  dueDate: 1743811200000,
  assignedTo: "user_project_lead_001"
})

createMilestone({
  sessionId: "<SESSION_ID>",
  projectId: "proj_bella_cucina_001",
  title: "Launch",
  dueDate: 1744243200000,
  assignedTo: "user_account_manager_001"
})

createMilestone({
  sessionId: "<SESSION_ID>",
  projectId: "proj_bella_cucina_001",
  title: "Optimize",
  dueDate: 1744588800000,
  assignedTo: "user_strategist_001"
})
```

### Step 2c: Create Tasks

```
createTask({
  sessionId: "<SESSION_ID>",
  projectId: "proj_bella_cucina_001",
  title: "Send onboarding questionnaire",
  description: "Send the intake questionnaire to Marco Rossi with portal access link",
  status: "pending",
  priority: "high",
  assignedTo: "user_account_manager_001",
  dueDate: 1740873600000
})

createTask({
  sessionId: "<SESSION_ID>",
  projectId: "proj_bella_cucina_001",
  title: "Conduct brand audit",
  description: "Review existing brand materials, website, social presence, and online reputation",
  status: "pending",
  priority: "high",
  assignedTo: "user_strategist_001",
  dueDate: 1741219200000
})

createTask({
  sessionId: "<SESSION_ID>",
  projectId: "proj_bella_cucina_001",
  title: "Competitor analysis",
  description: "Analyze top 3 competing restaurants in the area: Mario's Trattoria, The Olive Garden, Casa di Pasta",
  status: "pending",
  priority: "medium",
  assignedTo: "user_strategist_001",
  dueDate: 1741219200000
})

createTask({
  sessionId: "<SESSION_ID>",
  projectId: "proj_bella_cucina_001",
  title: "Schedule discovery call",
  description: "30-minute call with Marco to review questionnaire responses and AI discovery brief",
  status: "pending",
  priority: "high",
  assignedTo: "user_account_manager_001",
  dueDate: 1741046400000
})

createTask({
  sessionId: "<SESSION_ID>",
  projectId: "proj_bella_cucina_001",
  title: "Website wireframes and design",
  description: "Create wireframes for new restaurant website with online menu, reservations, and photo gallery",
  status: "pending",
  priority: "high",
  assignedTo: "user_designer_001",
  dueDate: 1742083200000
})

createTask({
  sessionId: "<SESSION_ID>",
  projectId: "proj_bella_cucina_001",
  title: "Set up social media profiles",
  description: "Create or optimize Instagram, Facebook, and TikTok profiles with brand assets",
  status: "pending",
  priority: "medium",
  assignedTo: "user_social_manager_001",
  dueDate: 1742256000000
})

createTask({
  sessionId: "<SESSION_ID>",
  projectId: "proj_bella_cucina_001",
  title: "Google Business Profile optimization",
  description: "Claim, verify, and fully optimize Google Business Profile with photos, hours, menu, and categories",
  status: "pending",
  priority: "high",
  assignedTo: "user_seo_specialist_001",
  dueDate: 1742428800000
})

createTask({
  sessionId: "<SESSION_ID>",
  projectId: "proj_bella_cucina_001",
  title: "Build website",
  description: "Develop responsive restaurant website based on approved wireframes",
  status: "pending",
  priority: "high",
  assignedTo: "user_developer_001",
  dueDate: 1742601600000
})

createTask({
  sessionId: "<SESSION_ID>",
  projectId: "proj_bella_cucina_001",
  title: "Create content calendar",
  description: "30-day content calendar for Instagram, Facebook, TikTok with restaurant-specific content themes",
  status: "pending",
  priority: "medium",
  assignedTo: "user_social_manager_001",
  dueDate: 1743292800000
})

createTask({
  sessionId: "<SESSION_ID>",
  projectId: "proj_bella_cucina_001",
  title: "Set up review management",
  description: "Configure automated review request system for Google, Yelp, and TripAdvisor",
  status: "pending",
  priority: "medium",
  assignedTo: "user_seo_specialist_001",
  dueDate: 1743465600000
})

createTask({
  sessionId: "<SESSION_ID>",
  projectId: "proj_bella_cucina_001",
  title: "Create ad creatives",
  description: "Design Facebook and Instagram ad creatives for launch campaign",
  status: "pending",
  priority: "medium",
  assignedTo: "user_designer_001",
  dueDate: 1743638400000
})

createTask({
  sessionId: "<SESSION_ID>",
  projectId: "proj_bella_cucina_001",
  title: "QA and testing",
  description: "Test website across devices, verify all social links, check Google Business Profile accuracy",
  status: "pending",
  priority: "high",
  assignedTo: "user_project_lead_001",
  dueDate: 1743811200000
})

createTask({
  sessionId: "<SESSION_ID>",
  projectId: "proj_bella_cucina_001",
  title: "Go live",
  description: "Launch website, activate social campaigns, start review management, begin content publishing",
  status: "pending",
  priority: "high",
  assignedTo: "user_project_lead_001",
  dueDate: 1744243200000
})

createTask({
  sessionId: "<SESSION_ID>",
  projectId: "proj_bella_cucina_001",
  title: "First performance review",
  description: "Review 2-week performance data, adjust campaigns, present report to Marco",
  status: "pending",
  priority: "high",
  assignedTo: "user_strategist_001",
  dueDate: 1744588800000
})
```

### Step 2d: Assign Team Members

```
addInternalTeamMember({
  sessionId: "<SESSION_ID>",
  projectId: "proj_bella_cucina_001",
  userId: "user_account_manager_001",
  role: "Account Manager"
})

addInternalTeamMember({
  sessionId: "<SESSION_ID>",
  projectId: "proj_bella_cucina_001",
  userId: "user_project_lead_001",
  role: "Project Lead"
})

addInternalTeamMember({
  sessionId: "<SESSION_ID>",
  projectId: "proj_bella_cucina_001",
  userId: "user_strategist_001",
  role: "Digital Strategist"
})

addInternalTeamMember({
  sessionId: "<SESSION_ID>",
  projectId: "proj_bella_cucina_001",
  userId: "user_designer_001",
  role: "Designer"
})

addInternalTeamMember({
  sessionId: "<SESSION_ID>",
  projectId: "proj_bella_cucina_001",
  userId: "user_developer_001",
  role: "Web Developer"
})

addInternalTeamMember({
  sessionId: "<SESSION_ID>",
  projectId: "proj_bella_cucina_001",
  userId: "user_social_manager_001",
  role: "Social Media Manager"
})

addInternalTeamMember({
  sessionId: "<SESSION_ID>",
  projectId: "proj_bella_cucina_001",
  userId: "user_seo_specialist_001",
  role: "SEO Specialist"
})

addClientTeamMember({
  sessionId: "<SESSION_ID>",
  projectId: "proj_bella_cucina_001",
  contactId: "contact_bella_cucina_001",
  role: "Business Owner / Primary Contact"
})
```

---

### Step 3: Create the Onboarding Questionnaire Form

```
createForm({
  sessionId: "<SESSION_ID>",
  organizationId: "<ORG_ID>",
  name: "Bella Cucina Onboarding Questionnaire",
  description: "Intake questionnaire for Bella Cucina Italian Restaurant digital marketing onboarding",
  fields: [
    { "type": "section_header", "label": "Restaurant Information", "required": false },
    { "type": "text",     "label": "Business Name",           "required": true,  "placeholder": "Bella Cucina Italian Restaurant" },
    { "type": "text",     "label": "Business Address",        "required": true,  "placeholder": "456 Oak Street, Portland, OR 97201" },
    { "type": "phone",    "label": "Business Phone",          "required": true,  "placeholder": "+1 (555) 892-4310" },
    { "type": "email",    "label": "Primary Contact Email",   "required": true,  "placeholder": "marco@bellacucina.com" },
    { "type": "text",     "label": "Website URL (if existing)", "required": false, "placeholder": "https://bellacucina.com" },
    { "type": "text",     "label": "Hours of Operation",      "required": true,  "placeholder": "Mon-Thu 11am-9pm, Fri-Sat 11am-10pm, Sun 12pm-8pm" },
    { "type": "text",     "label": "Year Established",        "required": false, "placeholder": "2018" },
    { "type": "section_header", "label": "Menu and Specialties", "required": false },
    { "type": "textarea", "label": "Describe your menu highlights and signature dishes", "required": true, "placeholder": "Our handmade pasta is prepared fresh daily. Signature dishes include Osso Buco alla Milanese, truffle risotto, and our wood-fired Margherita pizza..." },
    { "type": "select",   "label": "Do you offer any of the following?", "required": true, "options": ["Dine-in only", "Dine-in + Takeout", "Dine-in + Takeout + Delivery", "Dine-in + Takeout + Delivery + Catering", "All of the above plus private events"] },
    { "type": "text",     "label": "Average price per person", "required": false, "placeholder": "$25-45" },
    { "type": "section_header", "label": "Brand Identity", "required": false },
    { "type": "textarea", "label": "Tell us the story of your restaurant", "required": true, "placeholder": "How did the restaurant start? What is your philosophy? What makes the dining experience special?" },
    { "type": "text",     "label": "Primary Brand Colors (hex codes)", "required": false, "placeholder": "#8B0000, #F5F5DC, #2C2C2C" },
    { "type": "select",   "label": "Do you have a logo and brand guidelines?", "required": true, "options": ["Yes, ready to share", "Yes, but needs updating", "No, I need branding help", "I have a logo but no formal guidelines"] },
    { "type": "select",   "label": "Do you have professional food photography?", "required": true, "options": ["Yes, high-quality photos of most dishes", "Some photos but need more", "No professional photos", "I can arrange a photoshoot"] },
    { "type": "section_header", "label": "Target Audience", "required": false },
    { "type": "textarea", "label": "Describe your ideal diner", "required": true, "placeholder": "Age range, dining occasions (date night, family, business lunch), income level, food preferences..." },
    { "type": "text",     "label": "Geographic target area",  "required": true,  "placeholder": "Within 10 miles of downtown Portland" },
    { "type": "multi_select", "label": "Where does your target audience find restaurants?", "required": true, "options": ["Google Search", "Google Maps", "Instagram", "Facebook", "TikTok", "Yelp", "TripAdvisor", "Word of mouth", "Food blogs / influencers", "Local publications"] },
    { "type": "section_header", "label": "Competition", "required": false },
    { "type": "textarea", "label": "Who are your top 3 competitors?", "required": true, "placeholder": "1. Mario's Trattoria (mariostrattoria.com) - known for their wine list\n2. The Olive Garden on Hawthorne - chain but heavy marketing\n3. Casa di Pasta (casadipasta.com) - similar price point, strong social media" },
    { "type": "textarea", "label": "What makes Bella Cucina different from these competitors?", "required": true, "placeholder": "Our handmade pasta, family recipes from Tuscany, intimate atmosphere, chef's table experience..." },
    { "type": "section_header", "label": "Goals and Budget", "required": false },
    { "type": "textarea", "label": "What are your top 3 business goals for the next 6 months?", "required": true, "placeholder": "1. Increase weekday dinner reservations by 40%\n2. Build Instagram following to 5,000\n3. Become #1 rated Italian restaurant on Google in Portland" },
    { "type": "select",   "label": "What is your primary marketing objective?", "required": true, "options": ["Increase brand awareness", "Drive more reservations", "Increase takeout and delivery orders", "Improve online reviews and ratings", "Launch catering or private events service", "Build social media presence"] },
    { "type": "number",   "label": "Monthly marketing budget (USD) beyond our retainer", "required": false, "placeholder": "1500" },
    { "type": "section_header", "label": "Current Marketing", "required": false },
    { "type": "multi_select", "label": "Which marketing channels do you currently use?", "required": false, "options": ["Website", "Instagram", "Facebook", "TikTok", "Google Business Profile", "Yelp listing", "Email newsletter", "Google Ads", "Facebook/Instagram Ads", "Print advertising", "Local event sponsorships", "Influencer partnerships", "None"] },
    { "type": "textarea", "label": "What has worked well in the past? What has not?", "required": false, "placeholder": "Our Instagram food photos get good engagement, but we post inconsistently. Tried Google Ads once but did not see results..." },
    { "type": "section_header", "label": "Access and Credentials", "required": false },
    { "type": "textarea", "label": "List existing accounts we will need access to", "required": false, "placeholder": "Google Business Profile (claimed, email: marco@bellacucina.com)\nInstagram: @bellacucinapdx\nFacebook: Bella Cucina Portland\nYelp: listed but not claimed\nWebsite hosting: GoDaddy" },
    { "type": "textarea", "label": "Anything else we should know?", "required": false, "placeholder": "We are renovating the patio in April. Chef Marco is available for video content on Tuesdays. We have a private dining room for events..." }
  ],
  formSettings: {
    "redirectUrl": "/onboarding-thank-you",
    "notifications": { "adminEmail": true, "respondentEmail": true },
    "submissionBehavior": "redirect"
  }
})
// Returns: formId = "form_bella_cucina_questionnaire_001"
```

```
publishForm({ sessionId: "<SESSION_ID>", formId: "form_bella_cucina_questionnaire_001" })
```

---

### Step 4: Create the CRM Pipeline

The pipeline is configured within the organization's CRM settings with these stages:

| Stage ID | Stage Name | Description |
|----------|-----------|-------------|
| `signed` | Signed | Contract signed with Bella Cucina. Onboarding begins. |
| `discovery` | Discovery | Questionnaire completed, AI brief generated, discovery call scheduled. |
| `setup` | Setup | Website being built, social profiles created, Google Business optimized. |
| `launch_prep` | Launch Prep | Content calendar loaded, ad creatives ready, review system configured, QA in progress. |
| `launched` | Launched | All channels live. Website, social, ads, and review management active. |
| `optimizing` | Optimizing | Ongoing management: weekly reports, campaign adjustments, content publishing. |

---

### Step 5: Create the Workflows

**Workflow 1: Intake Processing**

```
createWorkflow({
  sessionId: "<SESSION_ID>",
  name: "Bella Cucina Intake Processing",
  description: "Processes onboarding questionnaire, updates CRM with restaurant details, generates AI discovery brief, moves to discovery stage, notifies team"
})
// Returns: workflowId = "wf_bella_cucina_intake_001"
```

```
saveWorkflow({
  sessionId: "<SESSION_ID>",
  workflowId: "wf_bella_cucina_intake_001",
  name: "Bella Cucina Intake Processing",
  nodes: [
    {
      "id": "trigger-1",
      "type": "trigger_form_submitted",
      "position": { "x": 100, "y": 250 },
      "config": { "formId": "form_bella_cucina_questionnaire_001" },
      "status": "ready",
      "label": "Questionnaire Submitted"
    },
    {
      "id": "crm-1",
      "type": "lc_crm",
      "position": { "x": 350, "y": 250 },
      "config": {
        "action": "update-contact",
        "contactId": "{{trigger.metadata.contactId}}",
        "tags": ["onboarding_active", "questionnaire_completed", "restaurant"],
        "customFields": {
          "businessName": "{{trigger.businessName}}",
          "businessAddress": "{{trigger.businessAddress}}",
          "businessPhone": "{{trigger.businessPhone}}",
          "website": "{{trigger.websiteUrl}}",
          "hoursOfOperation": "{{trigger.hoursOfOperation}}",
          "yearEstablished": "{{trigger.yearEstablished}}",
          "menuHighlights": "{{trigger.describeYourMenuHighlightsAndSignatureDishes}}",
          "serviceTypes": "{{trigger.doYouOfferAnyOfTheFollowing}}",
          "averagePrice": "{{trigger.averagePricePerPerson}}",
          "brandStory": "{{trigger.tellUsTheStoryOfYourRestaurant}}",
          "brandColors": "{{trigger.primaryBrandColors}}",
          "hasLogo": "{{trigger.doYouHaveALogoAndBrandGuidelines}}",
          "hasPhotography": "{{trigger.doYouHaveProfessionalFoodPhotography}}",
          "idealDiner": "{{trigger.describeYourIdealDiner}}",
          "geoTarget": "{{trigger.geographicTargetArea}}",
          "discoveryChannels": "{{trigger.whereDoesYourTargetAudienceFindRestaurants}}",
          "competitors": "{{trigger.whoAreYourTop3Competitors}}",
          "differentiator": "{{trigger.whatMakesBellaCucinaDifferent}}",
          "goals": "{{trigger.whatAreYourTop3BusinessGoals}}",
          "primaryObjective": "{{trigger.whatIsYourPrimaryMarketingObjective}}",
          "adBudget": "{{trigger.monthlyMarketingBudget}}",
          "currentChannels": "{{trigger.whichMarketingChannelsDoYouCurrentlyUse}}",
          "pastResults": "{{trigger.whatHasWorkedWellInThePast}}",
          "existingAccounts": "{{trigger.listExistingAccountsWeWillNeedAccessTo}}",
          "additionalNotes": "{{trigger.anythingElseWeShouldKnow}}"
        }
      },
      "status": "ready",
      "label": "Update Bella Cucina Contact"
    },
    {
      "id": "email-1",
      "type": "lc_email",
      "position": { "x": 600, "y": 100 },
      "config": {
        "action": "send-confirmation-email",
        "to": "{{crm-1.output.email}}",
        "subject": "Welcome aboard, Marco! Your Bella Cucina onboarding roadmap",
        "body": "Hi Marco,\n\nThank you for completing the onboarding questionnaire for Bella Cucina. We are thrilled to start working on your digital marketing.\n\nHere is what happens next:\n\n1. Our team reviews your responses and the AI-generated discovery brief (within 24 hours)\n2. Your account manager Sarah will schedule a discovery call to discuss your goals\n3. We will prepare a customized marketing strategy for Bella Cucina\n\nYour client portal is live: https://amplifydigital.com/portal/bella-cucina\n\nYour dedicated Amplify Digital team:\n- Account Manager: Sarah Chen (sarah@amplifydigital.com)\n- Project Lead: James Park (james@amplifydigital.com)\n- Digital Strategist: Lisa Nguyen (lisa@amplifydigital.com)\n- Designer: Alex Rivera (alex@amplifydigital.com)\n- Web Developer: Chris Taylor (chris@amplifydigital.com)\n- Social Media Manager: Maya Johnson (maya@amplifydigital.com)\n- SEO Specialist: David Kim (david@amplifydigital.com)\n\nIf you have any questions, reply to this email or reach out to Sarah directly.\n\nBenvenuto a bordo,\nThe Amplify Digital Team"
      },
      "status": "ready",
      "label": "Send Welcome Pack"
    },
    {
      "id": "ai-1",
      "type": "lc_ai_agent",
      "position": { "x": 600, "y": 250 },
      "config": {
        "prompt": "Analyze the following restaurant client onboarding questionnaire responses and produce a structured discovery brief for a digital marketing agency. Include:\n\n1) Restaurant summary (2-3 sentences covering concept, location, and dining experience)\n2) Menu and service analysis (key differentiators, price positioning, service offerings)\n3) Target audience profile (demographics, dining occasions, discovery channels)\n4) Competitive positioning (how to differentiate from the 3 listed competitors)\n5) Recommended marketing channel priority (ranked by expected ROI for a restaurant, considering budget and audience)\n6) Local SEO opportunities (Google Business Profile, Yelp, TripAdvisor, local directory opportunities)\n7) Content strategy suggestions (types of content that work for restaurants: food photography, behind-the-scenes, chef stories, seasonal menus)\n8) Potential challenges or risks (seasonality, competition, budget constraints)\n9) Quick wins for the first 30 days (high-impact, low-effort actions)\n10) Recommended KPIs to track\n\nClient responses: {{crm-1.output.customFields}}",
        "model": "claude-sonnet"
      },
      "status": "ready",
      "label": "Analyze Questionnaire"
    },
    {
      "id": "crm-2",
      "type": "lc_crm",
      "position": { "x": 850, "y": 250 },
      "config": {
        "action": "move-pipeline-stage",
        "contactId": "{{crm-1.output.contactId}}",
        "pipelineStageId": "discovery"
      },
      "status": "ready",
      "label": "Move to Discovery"
    },
    {
      "id": "ac-1",
      "type": "activecampaign",
      "position": { "x": 850, "y": 400 },
      "config": {
        "action": "add_tag",
        "contactEmail": "{{crm-1.output.email}}",
        "tag": "onboarding_active"
      },
      "status": "ready",
      "label": "Tag Onboarding Active"
    },
    {
      "id": "email-2",
      "type": "lc_email",
      "position": { "x": 1100, "y": 250 },
      "config": {
        "action": "send-admin-notification",
        "to": "team@amplifydigital.com",
        "subject": "New Client Questionnaire: Bella Cucina Italian Restaurant",
        "body": "Bella Cucina has completed their onboarding questionnaire.\n\nClient: Marco Rossi\nBusiness: Bella Cucina Italian Restaurant\nPrimary Goal: Increase weekday dinner reservations by 40%\nPrimary Objective: Drive more reservations\nAd Budget: $1,500/month\n\nAI Discovery Brief:\n{{ai-1.output.result}}\n\nFull questionnaire responses are available in the CRM contact record.\n\nNext step: Sarah, schedule discovery call with Marco within 24 hours."
      },
      "status": "ready",
      "label": "Notify Team: Questionnaire Complete"
    }
  ],
  edges: [
    { "id": "e-1", "source": "trigger-1", "target": "crm-1",  "sourceHandle": "output", "targetHandle": "input" },
    { "id": "e-2", "source": "crm-1",     "target": "email-1", "sourceHandle": "output", "targetHandle": "input" },
    { "id": "e-3", "source": "crm-1",     "target": "ai-1",    "sourceHandle": "output", "targetHandle": "input" },
    { "id": "e-4", "source": "ai-1",      "target": "crm-2",   "sourceHandle": "output", "targetHandle": "input" },
    { "id": "e-5", "source": "crm-1",     "target": "ac-1",    "sourceHandle": "output", "targetHandle": "input" },
    { "id": "e-6", "source": "ai-1",      "target": "email-2", "sourceHandle": "output", "targetHandle": "input" }
  ],
  triggers: [{ "type": "trigger_form_submitted", "config": { "formId": "form_bella_cucina_questionnaire_001" } }]
})
```

```
updateWorkflowStatus({
  sessionId: "<SESSION_ID>",
  workflowId: "wf_bella_cucina_intake_001",
  status: "active"
})
```

**Workflow 2: Milestone Tracking**

```
createWorkflow({
  sessionId: "<SESSION_ID>",
  name: "Bella Cucina Milestone Tracker",
  description: "Tracks milestone completions for Bella Cucina project, moves pipeline stages, sends client and team notifications"
})
// Returns: workflowId = "wf_bella_cucina_milestone_001"
```

```
saveWorkflow({
  sessionId: "<SESSION_ID>",
  workflowId: "wf_bella_cucina_milestone_001",
  name: "Bella Cucina Milestone Tracker",
  nodes: [
    {
      "id": "trigger-1",
      "type": "trigger_webhook",
      "position": { "x": 100, "y": 250 },
      "config": { "path": "/webhooks/milestone-complete", "secret": "wh_bella_cucina_ms_secret_2026" },
      "status": "ready",
      "label": "Milestone Completed"
    },
    {
      "id": "if-1",
      "type": "if_then",
      "position": { "x": 350, "y": 150 },
      "config": { "expression": "{{trigger.milestoneTitle}} === 'Discovery'" },
      "status": "ready",
      "label": "Is Discovery Complete?"
    },
    {
      "id": "crm-1",
      "type": "lc_crm",
      "position": { "x": 600, "y": 50 },
      "config": { "action": "move-pipeline-stage", "contactId": "{{trigger.contactId}}", "pipelineStageId": "setup" },
      "status": "ready",
      "label": "Move to Setup"
    },
    {
      "id": "if-2",
      "type": "if_then",
      "position": { "x": 600, "y": 200 },
      "config": { "expression": "{{trigger.milestoneTitle}} === 'Setup'" },
      "status": "ready",
      "label": "Is Setup Complete?"
    },
    {
      "id": "crm-2",
      "type": "lc_crm",
      "position": { "x": 850, "y": 150 },
      "config": { "action": "move-pipeline-stage", "contactId": "{{trigger.contactId}}", "pipelineStageId": "launch_prep" },
      "status": "ready",
      "label": "Move to Launch Prep"
    },
    {
      "id": "if-3",
      "type": "if_then",
      "position": { "x": 850, "y": 300 },
      "config": { "expression": "{{trigger.milestoneTitle}} === 'Launch Prep'" },
      "status": "ready",
      "label": "Is Launch Prep Complete?"
    },
    {
      "id": "crm-3",
      "type": "lc_crm",
      "position": { "x": 1100, "y": 250 },
      "config": { "action": "move-pipeline-stage", "contactId": "{{trigger.contactId}}", "pipelineStageId": "launched" },
      "status": "ready",
      "label": "Move to Launched"
    },
    {
      "id": "email-1",
      "type": "lc_email",
      "position": { "x": 1100, "y": 450 },
      "config": {
        "action": "send-confirmation-email",
        "to": "marco@bellacucina.com",
        "subject": "Milestone Complete: {{trigger.milestoneTitle}} - Bella Cucina",
        "body": "Hi Marco,\n\nGreat news! We have completed the {{trigger.milestoneTitle}} phase of your Bella Cucina digital marketing project.\n\nHere is a summary of what was accomplished:\n{{trigger.milestoneSummary}}\n\nNext up: {{trigger.nextMilestoneTitle}} (target date: {{trigger.nextMilestoneDueDate}})\n\nYou can view your full project timeline on your client portal: https://amplifydigital.com/portal/bella-cucina\n\nIf you have any questions, reach out to Sarah at sarah@amplifydigital.com.\n\nOnward,\nThe Amplify Digital Team"
      },
      "status": "ready",
      "label": "Client: Milestone Complete"
    },
    {
      "id": "email-2",
      "type": "lc_email",
      "position": { "x": 1350, "y": 250 },
      "config": {
        "action": "send-admin-notification",
        "to": "team@amplifydigital.com",
        "subject": "Milestone Complete: {{trigger.milestoneTitle}} - Bella Cucina",
        "body": "Milestone completed for Bella Cucina Italian Restaurant.\n\nCompleted: {{trigger.milestoneTitle}}\nNext Phase: {{trigger.nextMilestoneTitle}}\nDue Date: {{trigger.nextMilestoneDueDate}}\nAssigned To: {{trigger.nextMilestoneAssignedTo}}\n\nPipeline has been updated to {{trigger.nextPipelineStage}} automatically."
      },
      "status": "ready",
      "label": "Team: Milestone Complete"
    }
  ],
  edges: [
    { "id": "e-1",  "source": "trigger-1", "target": "if-1",   "sourceHandle": "output", "targetHandle": "input" },
    { "id": "e-2",  "source": "if-1",      "target": "crm-1",  "sourceHandle": "true",   "targetHandle": "input" },
    { "id": "e-3",  "source": "if-1",      "target": "if-2",   "sourceHandle": "false",  "targetHandle": "input" },
    { "id": "e-4",  "source": "if-2",      "target": "crm-2",  "sourceHandle": "true",   "targetHandle": "input" },
    { "id": "e-5",  "source": "if-2",      "target": "if-3",   "sourceHandle": "false",  "targetHandle": "input" },
    { "id": "e-6",  "source": "if-3",      "target": "crm-3",  "sourceHandle": "true",   "targetHandle": "input" },
    { "id": "e-7",  "source": "crm-1",     "target": "email-1", "sourceHandle": "output", "targetHandle": "input" },
    { "id": "e-8",  "source": "crm-2",     "target": "email-1", "sourceHandle": "output", "targetHandle": "input" },
    { "id": "e-9",  "source": "crm-3",     "target": "email-1", "sourceHandle": "output", "targetHandle": "input" },
    { "id": "e-10", "source": "email-1",   "target": "email-2", "sourceHandle": "output", "targetHandle": "input" }
  ],
  triggers: [{ "type": "trigger_webhook", "config": { "path": "/webhooks/milestone-complete", "secret": "wh_bella_cucina_ms_secret_2026" } }]
})
```

```
updateWorkflowStatus({
  sessionId: "<SESSION_ID>",
  workflowId: "wf_bella_cucina_milestone_001",
  status: "active"
})
```

**Workflow 3: Questionnaire Reminder (Optional)**

```
createWorkflow({
  sessionId: "<SESSION_ID>",
  name: "Bella Cucina Questionnaire Reminder",
  description: "Sends reminder to complete onboarding questionnaire if not completed within 48 hours"
})
// Returns: workflowId = "wf_bella_cucina_reminder_001"
```

```
saveWorkflow({
  sessionId: "<SESSION_ID>",
  workflowId: "wf_bella_cucina_reminder_001",
  name: "Bella Cucina Questionnaire Reminder",
  nodes: [
    {
      "id": "trigger-1",
      "type": "trigger_schedule",
      "position": { "x": 100, "y": 200 },
      "config": { "cronExpression": "0 9 * * *", "timezone": "America/Los_Angeles" },
      "status": "ready",
      "label": "Daily Check at 9AM PT"
    },
    {
      "id": "crm-1",
      "type": "lc_crm",
      "position": { "x": 350, "y": 200 },
      "config": { "action": "update-contact", "contactId": "{{trigger.contactId}}", "tags": [] },
      "status": "ready",
      "label": "Check Contact Tags"
    },
    {
      "id": "if-1",
      "type": "if_then",
      "position": { "x": 600, "y": 200 },
      "config": { "expression": "{{crm-1.output.tags}}.includes('questionnaire_completed')" },
      "status": "ready",
      "label": "Questionnaire Completed?"
    },
    {
      "id": "email-1",
      "type": "lc_email",
      "position": { "x": 850, "y": 300 },
      "config": {
        "action": "send-confirmation-email",
        "to": "marco@bellacucina.com",
        "subject": "Quick reminder: Your Bella Cucina onboarding questionnaire",
        "body": "Hi Marco,\n\nWe noticed you have not yet completed the onboarding questionnaire for Bella Cucina. This helps us understand your restaurant, your goals, and your competition so we can build the best marketing strategy.\n\nIt takes about 15-20 minutes to complete: https://amplifydigital.com/forms/bella-cucina-questionnaire\n\nThe sooner we receive your responses, the sooner we can kick off the discovery phase and start driving more customers to Bella Cucina.\n\nIf you have any questions about the form, just reply to this email or call me directly.\n\nBest,\nSarah Chen\nAccount Manager, Amplify Digital Agency\nsarah@amplifydigital.com | (555) 201-8834"
      },
      "status": "ready",
      "label": "Send Questionnaire Reminder"
    }
  ],
  edges: [
    { "id": "e-1", "source": "trigger-1", "target": "crm-1",  "sourceHandle": "output", "targetHandle": "input" },
    { "id": "e-2", "source": "crm-1",     "target": "if-1",   "sourceHandle": "output", "targetHandle": "input" },
    { "id": "e-3", "source": "if-1",      "target": "email-1", "sourceHandle": "false",  "targetHandle": "input" }
  ],
  triggers: [{ "type": "trigger_schedule", "config": { "cronExpression": "0 9 * * *", "timezone": "America/Los_Angeles" } }]
})
```

```
updateWorkflowStatus({
  sessionId: "<SESSION_ID>",
  workflowId: "wf_bella_cucina_reminder_001",
  status: "active"
})
```

**Workflow 4: Onboarding Completion**

```
createWorkflow({
  sessionId: "<SESSION_ID>",
  name: "Bella Cucina Onboarding Completion",
  description: "Marks Bella Cucina as launched, sends launch announcement to Marco, updates ActiveCampaign tags, notifies internal team"
})
// Returns: workflowId = "wf_bella_cucina_completion_001"
```

```
saveWorkflow({
  sessionId: "<SESSION_ID>",
  workflowId: "wf_bella_cucina_completion_001",
  name: "Bella Cucina Onboarding Completion",
  nodes: [
    {
      "id": "trigger-1",
      "type": "trigger_manual",
      "position": { "x": 100, "y": 250 },
      "config": { "sampleData": { "contactId": "contact_bella_cucina_001", "projectId": "proj_bella_cucina_001", "clientEmail": "marco@bellacucina.com", "clientFirstName": "Marco", "businessName": "Bella Cucina Italian Restaurant" } },
      "status": "ready",
      "label": "All Milestones Done"
    },
    {
      "id": "crm-1",
      "type": "lc_crm",
      "position": { "x": 350, "y": 250 },
      "config": { "action": "move-pipeline-stage", "contactId": "{{trigger.contactId}}", "pipelineStageId": "launched" },
      "status": "ready",
      "label": "Move to Launched"
    },
    {
      "id": "email-1",
      "type": "lc_email",
      "position": { "x": 600, "y": 150 },
      "config": {
        "action": "send-confirmation-email",
        "to": "marco@bellacucina.com",
        "subject": "Bella Cucina is officially launched! Here is what comes next",
        "body": "Hi Marco,\n\nCongratulations! Your Bella Cucina digital marketing is now fully live. Here is everything we built together:\n\n- Website: https://bellacucina.com (redesigned with online menu, reservations, and photo gallery)\n- Instagram: @bellacucinapdx (optimized profile, first 30 days of content scheduled)\n- Facebook: Bella Cucina Portland (page optimized, ad campaigns active)\n- Google Business Profile: Fully optimized with photos, menu, hours, and posts\n- Review Management: Automated review requests active for Google, Yelp, and TripAdvisor\n- Content Calendar: 30 days of social content loaded and scheduled\n\nWhat happens now:\n1. We monitor performance daily and send you weekly reports every Monday\n2. Your first performance review call with Lisa is scheduled for March 28\n3. Our team continues managing your campaigns, content, and online reputation\n4. Ad campaigns are live with a $1,500/month budget across Facebook and Google\n\nYour client portal stays active: https://amplifydigital.com/portal/bella-cucina\n\nThank you for trusting Amplify Digital with Bella Cucina's marketing. We are excited to watch your restaurant grow.\n\nCheers,\nThe Amplify Digital Team"
      },
      "status": "ready",
      "label": "Launch Announcement"
    },
    {
      "id": "ac-1",
      "type": "activecampaign",
      "position": { "x": 600, "y": 350 },
      "config": { "action": "add_tag", "contactEmail": "marco@bellacucina.com", "tag": "onboarding_complete" },
      "status": "ready",
      "label": "Tag Onboarding Complete"
    },
    {
      "id": "ac-2",
      "type": "activecampaign",
      "position": { "x": 850, "y": 350 },
      "config": { "action": "add_tag", "contactEmail": "marco@bellacucina.com", "tag": "active_client" },
      "status": "ready",
      "label": "Tag Active Client"
    },
    {
      "id": "email-2",
      "type": "lc_email",
      "position": { "x": 850, "y": 150 },
      "config": {
        "action": "send-admin-notification",
        "to": "team@amplifydigital.com",
        "subject": "Client Launched: Bella Cucina Italian Restaurant",
        "body": "Bella Cucina Italian Restaurant has completed onboarding and is now live.\n\nClient: Marco Rossi\nBusiness: Bella Cucina Italian Restaurant\nPipeline Stage: Launched\nContract Value: $3,500/month\n\nOnboarding tags updated:\n- Added: onboarding_complete, active_client\n\nThis client is now in the optimization phase. Action items:\n1. Lisa: Ensure weekly reports are scheduled (Mondays)\n2. Sarah: Book first performance review call for March 28\n3. Maya: Confirm content calendar is publishing on schedule\n4. David: Monitor Google Business Profile insights daily for first 2 weeks"
      },
      "status": "ready",
      "label": "Notify Team: Client Launched"
    }
  ],
  edges: [
    { "id": "e-1", "source": "trigger-1", "target": "crm-1",  "sourceHandle": "output", "targetHandle": "input" },
    { "id": "e-2", "source": "crm-1",     "target": "email-1", "sourceHandle": "output", "targetHandle": "input" },
    { "id": "e-3", "source": "crm-1",     "target": "ac-1",    "sourceHandle": "output", "targetHandle": "input" },
    { "id": "e-4", "source": "ac-1",      "target": "ac-2",    "sourceHandle": "output", "targetHandle": "input" },
    { "id": "e-5", "source": "email-1",   "target": "email-2", "sourceHandle": "output", "targetHandle": "input" }
  ],
  triggers: [{ "type": "trigger_manual", "config": { "sampleData": { "contactId": "contact_bella_cucina_001", "projectId": "proj_bella_cucina_001" } } }]
})
```

```
updateWorkflowStatus({
  sessionId: "<SESSION_ID>",
  workflowId: "wf_bella_cucina_completion_001",
  status: "active"
})
```

---

### Step 6: Create the Sequences

**Sequence A: Welcome and Onboarding Touchpoints** (`subtype: "nachher"`)

**Object:** `type: "automation_sequence"`, `subtype: "nachher"`, `name: "Bella Cucina Welcome Sequence"`

**Trigger event:** `pipeline_stage_changed` (to `signed`)

| Step | Channel | Timing | Subject | Body Summary |
|------|---------|--------|---------|-------------|
| 1 | `email` | `{ offset: 0, unit: "minutes", referencePoint: "trigger_event" }` | "Welcome to Amplify Digital, Marco!" | Welcome email with onboarding overview. Introduce the team: Sarah Chen (Account Manager), James Park (Project Lead), Lisa Nguyen (Strategist), Alex Rivera (Designer), Chris Taylor (Developer), Maya Johnson (Social Media), David Kim (SEO). Set expectations for the 8-week timeline. Include client portal link: https://amplifydigital.com/portal/bella-cucina. Include questionnaire link with "Please complete within 48 hours." |
| 2 | `email` | `{ offset: 2, unit: "days", referencePoint: "trigger_event" }` | "Questionnaire reminder: Help us understand Bella Cucina" | Friendly reminder to complete the questionnaire if not already done. Emphasize that responses drive the strategy: "Your answers help us understand your restaurant, your ideal diners, and your competition." Include direct link to the questionnaire form. Mention it takes 15-20 minutes. |
| 3 | `email` | `{ offset: 5, unit: "days", referencePoint: "trigger_event" }` | "Your discovery call is coming up" | Remind Marco about the upcoming discovery call with Sarah and Lisa. Share what to prepare: any additional brand assets (logo files, menu PDF, photos), access credentials for Google Business Profile, Instagram, Facebook, website hosting. Include calendar link to reschedule if needed. |
| 4 | `email` | `{ offset: 14, unit: "days", referencePoint: "trigger_event" }` | "Setup is underway: Here is a sneak peek" | Mid-setup update with progress on: website wireframes showing the new menu page and reservation system, social profile setup on Instagram and Facebook, Google Business Profile verification status. Include preview screenshots. Reinforce timeline: "We are on track for launch in Week 5." |
| 5 | `email` | `{ offset: 28, unit: "days", referencePoint: "trigger_event" }` | "Launch prep: Final review needed" | Request Marco's review and approval on: website design (homepage, menu, about, reservations, gallery), social profile branding and bio copy, content calendar themes for the first 30 days (food photography Mondays, behind-the-scenes Wednesdays, community Fridays), ad creative concepts for Facebook and Instagram. Include review deadline: 3 business days. |
| 6 | `email` | `{ offset: 35, unit: "days", referencePoint: "trigger_event" }` | "Bella Cucina is live!" | Launch day email. Everything is live: website at bellacucina.com, Instagram @bellacucinapdx, Facebook Bella Cucina Portland, Google Business Profile fully optimized, review request system active, content calendar publishing, ad campaigns running. Remind about first performance review call with Lisa on March 28. |
| 7 | `email` | `{ offset: 65, unit: "days", referencePoint: "trigger_event" }` | "Your 30-day check-in: How is everything going?" | 30-day post-launch check-in. Share early performance highlights: website traffic, social follower growth, Google Business views, new reviews collected, ad campaign results. Ask for feedback on the onboarding experience. Confirm ongoing management rhythm: weekly reports every Monday, monthly strategy call on the first Thursday of each month. |

**Sequence B: Ongoing Client Lifecycle** (`subtype: "lifecycle"`)

**Object:** `type: "automation_sequence"`, `subtype: "lifecycle"`, `name: "Bella Cucina Client Lifecycle"`

**Trigger event:** `contact_tagged` (tag: `"active_client"`)

| Step | Channel | Timing | Subject | Body Summary |
|------|---------|--------|---------|-------------|
| 1 | `email` | `{ offset: 30, unit: "days", referencePoint: "trigger_event" }` | "Your first monthly performance report" | Comprehensive 30-day report: website traffic (sessions, page views, top pages), social metrics (followers gained, engagement rate, top posts), Google Business Profile (views, searches, direction requests, calls), review summary (new reviews, average rating across Google, Yelp, TripAdvisor), ad performance (impressions, clicks, cost per click, conversions). Include next month's strategy adjustments. |
| 2 | `email` | `{ offset: 60, unit: "days", referencePoint: "trigger_event" }` | "60-day milestone: Let us talk about what is next" | Two-month review. Invite to quarterly strategy session with Lisa. Share growth trends across all channels. Propose new initiatives: seasonal menu promotion campaign, local influencer partnership (food bloggers in Portland), catering service launch promotion, holiday event marketing (Easter brunch, summer patio opening). |
| 3 | `email` | `{ offset: 90, unit: "days", referencePoint: "trigger_event" }` | "Quarterly strategy session: Agenda inside" | Pre-meeting agenda for quarterly review. Include performance dashboard link. Discussion topics: campaign performance across all channels, budget allocation review (what is delivering best ROI), new opportunities (TikTok content, email newsletter to reservation database, loyalty program), upcoming seasonal events (summer patio season, restaurant week, holiday menus), content strategy evolution based on what resonates with Bella Cucina's audience. |

---

### Step 7: Link All Objects

```
// Link Workflow 1 to questionnaire form
objectLinks.create({
  sourceObjectId: "wf_bella_cucina_intake_001",
  targetObjectId: "form_bella_cucina_questionnaire_001",
  linkType: "workflow_form"
})

// Link Workflow 1 to welcome sequence
objectLinks.create({
  sourceObjectId: "wf_bella_cucina_intake_001",
  targetObjectId: "<WELCOME_SEQUENCE_ID>",
  linkType: "workflow_sequence"
})

// Link project to client contact
objectLinks.create({
  sourceObjectId: "proj_bella_cucina_001",
  targetObjectId: "contact_bella_cucina_001",
  linkType: "project_contact"
})
```

---

### Step 8: Populate the File System

```
createVirtualFile({
  sessionId: "<SESSION_ID>",
  projectId: "proj_bella_cucina_001",
  name: "onboarding-brief",
  parentPath: "/notes",
  content: "# Bella Cucina - Digital Marketing Onboarding Brief\n\n## Client\nBella Cucina Italian Restaurant\nOwner: Marco Rossi\nLocation: 456 Oak Street, Portland, OR 97201\n\n## Service Package\nComplete Digital Marketing: website redesign, social media management, local SEO, Google Business Profile optimization, review management\n\n## Contract\nMonthly retainer: $3,500\nAdditional ad budget: $1,500/month\nContract start: March 1, 2026\n\n## Timeline\n- Week 1: Discovery (questionnaire, brand audit, competitor analysis, discovery call)\n- Weeks 2-3: Setup (website build, social profiles, Google Business, review systems)\n- Week 4: Launch Prep (content calendar, ad creatives, testing, QA)\n- Week 5: Launch (all channels go live)\n- Weeks 6-8: Optimize (performance review, adjustments, reporting)\n\n## KPIs\n- Increase weekday dinner reservations by 40%\n- Build Instagram following to 5,000\n- Become #1 rated Italian restaurant on Google in Portland\n- Achieve 4.7+ average rating across review platforms\n- Drive 500+ monthly website visitors from organic search\n\n## Team\n- Account Manager: Sarah Chen\n- Project Lead: James Park\n- Digital Strategist: Lisa Nguyen\n- Designer: Alex Rivera\n- Web Developer: Chris Taylor\n- Social Media Manager: Maya Johnson\n- SEO Specialist: David Kim"
})

createVirtualFile({
  sessionId: "<SESSION_ID>",
  projectId: "proj_bella_cucina_001",
  name: "discovery-brief",
  parentPath: "/notes",
  content: "# AI Discovery Brief - Bella Cucina\n\n(This file will be populated automatically by the AI agent in Workflow 1 after Marco completes the onboarding questionnaire. The AI analysis will include: restaurant summary, menu analysis, target audience profile, competitive positioning, recommended channels, local SEO opportunities, content strategy, challenges, quick wins, and KPIs.)"
})

createFolder({
  sessionId: "<SESSION_ID>",
  projectId: "proj_bella_cucina_001",
  name: "meeting-notes",
  parentPath: "/notes"
})

createVirtualFile({
  sessionId: "<SESSION_ID>",
  projectId: "proj_bella_cucina_001",
  name: "discovery-call",
  parentPath: "/notes/meeting-notes",
  content: "# Discovery Call Notes - Bella Cucina\n\nDate: TBD (to be scheduled after questionnaire completion)\nAttendees: Marco Rossi (client), Sarah Chen (AM), Lisa Nguyen (strategist)\n\n## Agenda\n1. Review questionnaire responses and AI discovery brief\n2. Discuss business goals in detail\n3. Review competitor landscape\n4. Align on marketing strategy and priorities\n5. Confirm timeline and milestones\n6. Discuss brand asset handoff process\n7. Set communication cadence expectations\n\n## Notes\n(To be filled during call)\n\n## Action Items\n(To be filled during call)"
})

createFolder({
  sessionId: "<SESSION_ID>",
  projectId: "proj_bella_cucina_001",
  name: "questionnaire-responses",
  parentPath: "/assets"
})

createFolder({
  sessionId: "<SESSION_ID>",
  projectId: "proj_bella_cucina_001",
  name: "deliverables",
  parentPath: "/assets"
})

captureBuilderApp({
  projectId: "proj_bella_cucina_001",
  builderAppId: "<CLIENT_PORTAL_APP_ID>"
})

captureLayerWorkflow({
  projectId: "proj_bella_cucina_001",
  layerWorkflowId: "wf_bella_cucina_intake_001"
})

captureLayerWorkflow({
  projectId: "proj_bella_cucina_001",
  layerWorkflowId: "wf_bella_cucina_milestone_001"
})

captureLayerWorkflow({
  projectId: "proj_bella_cucina_001",
  layerWorkflowId: "wf_bella_cucina_reminder_001"
})

captureLayerWorkflow({
  projectId: "proj_bella_cucina_001",
  layerWorkflowId: "wf_bella_cucina_completion_001"
})
```

---

### Complete Object Inventory

| # | Object Type | Subtype | Name | Key Detail |
|---|------------|---------|------|-----------|
| 1 | `project` | `client_project` | "Bella Cucina - Digital Marketing Onboarding" | 5 milestones, 14 tasks, 7 internal team, 1 client team |
| 2 | `crm_contact` | `customer` | "Marco Rossi" | Bella Cucina owner, primary contact |
| 3 | `form` | `application` | "Bella Cucina Onboarding Questionnaire" | 28 fields across 7 sections, published |
| 4 | `layer_workflow` | `workflow` | "Bella Cucina Intake Processing" | 7 nodes, 6 edges, active |
| 5 | `layer_workflow` | `workflow` | "Bella Cucina Milestone Tracker" | 9 nodes, 10 edges, active |
| 6 | `layer_workflow` | `workflow` | "Bella Cucina Questionnaire Reminder" | 4 nodes, 3 edges, active |
| 7 | `layer_workflow` | `workflow` | "Bella Cucina Onboarding Completion" | 6 nodes, 5 edges, active |
| 8 | `automation_sequence` | `nachher` | "Bella Cucina Welcome Sequence" | 7 emails over 65 days |
| 9 | `automation_sequence` | `lifecycle` | "Bella Cucina Client Lifecycle" | 3 emails over 90 days |
| 10 | `builder_app` | `template_based` | "Bella Cucina Client Portal" | Welcome page + timeline + questionnaire CTA + team |

| # | Link Type | Source | Target |
|---|----------|--------|--------|
| 1 | `workflow_form` | Workflow (4) | Form (3) |
| 2 | `workflow_sequence` | Workflow (4) | Sequence (8) |
| 3 | `project_contact` | Project (1) | Contact (2) |

### Credit Cost Estimate

| Action | Count | Credits Each | Total |
|--------|-------|-------------|-------|
| Behavior: update-contact (questionnaire data) | 1 per client | 1 | 1 |
| Behavior: move-pipeline-stage (discovery) | 1 per client | 1 | 1 |
| Behavior: send-confirmation-email (welcome pack) | 1 per client | 1 | 1 |
| Behavior: activecampaign-sync (add_tag: onboarding_active) | 1 per client | 1 | 1 |
| AI agent: analyze questionnaire | 1 per client | 3 | 3 |
| Behavior: send-admin-notification (team alert) | 1 per client | 1 | 1 |
| Workflow 2: move-pipeline-stage (per milestone) | 3 per client | 1 | 3 |
| Workflow 2: send-confirmation-email (client notification, per milestone) | 3 per client | 1 | 3 |
| Workflow 2: send-admin-notification (team notification, per milestone) | 3 per client | 1 | 3 |
| Workflow 3: questionnaire reminder (if triggered) | 1-3 per client | 1 | 2 |
| Workflow 4: move-pipeline-stage (launched) | 1 per client | 1 | 1 |
| Workflow 4: send-confirmation-email (launch announcement) | 1 per client | 1 | 1 |
| Workflow 4: activecampaign-sync (add_tag x2) | 2 per client | 1 | 2 |
| Workflow 4: send-admin-notification (team alert) | 1 per client | 1 | 1 |
| Sequence A: 7 emails (welcome + onboarding touchpoints) | 7 per client | 1 | 7 |
| Sequence B: 3 emails (lifecycle) | 3 per client | 1 | 3 |
| **Total per client onboarding** | | | **34 credits** |

For an agency onboarding 5 new clients per month: approximately 170 credits/month.
