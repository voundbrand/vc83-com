# Phase 2: Client Onboarding Flow

> Agency invites client → client signs up → lands in branded interview experience. No dashboard, no complexity.

**Depends on:** Phase 1 (Interview Engine)

---

## Goals

- Agencies can invite their clients via branded link
- Clients sign up with minimal friction (email or OAuth)
- Clients land in a scoped experience (interview + reviews only)
- Sub-org created automatically per client
- Credits draw from agency's pool

---

## 2.1 Invite System

### Flow

```
Agency Dashboard
    ↓
"Invite Client" button
    ↓
Agency enters: client name, email, (optional) phone, interview template
    ↓
System creates:
  1. Sub-organization (child of agency org)
  2. Invitation record (type="client_invitation" in objects table)
  3. Branded invite email via Resend
    ↓
Client receives email with branded link
    ↓
Link: https://{agency-domain}/onboard/{inviteToken}
    ↓
Client clicks → signup page (agency-branded)
    ↓
Client creates account (email+password or OAuth)
    ↓
frontend_user created → linked to sub-org as "client" role
    ↓
Redirect to interview experience
```

### Invitation Object Schema

```typescript
// type="client_invitation" in objects table
interface ClientInvitation {
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  interviewTemplateId: Id<"objects">;
  inviteToken: string;                    // UUID, used in URL
  status: "pending" | "accepted" | "expired";
  expiresAt: number;                      // 7 days from creation
  subOrganizationId: Id<"organizations">; // auto-created sub-org
  acceptedAt?: number;
  acceptedByUserId?: string;              // frontend_user ID
}
```

### Implementation Tasks

- [ ] Create `client_invitation` object type
- [ ] Create `sendClientInvite` mutation:
  - [ ] Validate agency has sub-org capacity (tier check)
  - [ ] Create sub-organization (inherit parent plan)
  - [ ] Generate invite token (UUID v4)
  - [ ] Create invitation object
  - [ ] Send branded email via Resend (agency's configured sender)
- [ ] Create `getInvitation` query (by token, for signup page)
- [ ] Create `acceptInvitation` mutation:
  - [ ] Validate token not expired
  - [ ] Create frontend_user (or link existing)
  - [ ] Add user to sub-org with "client" role
  - [ ] Mark invitation accepted
  - [ ] Start interview session (Phase 1 `startInterview`)
- [ ] Create `resendInvitation` mutation (reset expiry, re-send email)
- [ ] Create `revokeInvitation` mutation (mark expired, deactivate sub-org)
- [ ] Add invite list to agency dashboard (pending, accepted, expired)

---

## 2.2 Client Authentication

### New Role: "client"

Add to RBAC role hierarchy:

```typescript
ROLE_HIERARCHY: {
  super_admin: 0,
  org_owner: 1,
  business_manager: 2,
  employee: 3,
  viewer: 4,
  client: 5,          // NEW — most restricted
}
```

### Client Permissions

```typescript
CLIENT_PERMISSIONS = [
  "view_own_interview",        // see their interview sessions
  "respond_to_interview",      // submit answers
  "view_own_content",          // see generated content drafts
  "approve_content",           // approve/reject/edit drafts
  "view_own_profile",          // see their Content DNA
  "update_own_profile",        // edit their profile basics
];

// Explicitly DENIED (by omission):
// - view_contacts, manage_users, manage_organization
// - view_workflows, manage_projects, manage_integrations
// - view_credits, manage_billing
// - Everything else
```

### Authentication Options

1. **Email + Password** (simplest, always available)
2. **Google OAuth** (existing frontend_user OAuth flow)
3. **Apple Sign-In** (existing frontend_user OAuth flow)
4. **Magic Link** (future — email-only, no password)

### Implementation Tasks

- [ ] Add `client` role to `ROLE_HIERARCHY` in `rbacHelpers.ts`
- [ ] Create client permission set
- [ ] Create `ClientSignupPage` component:
  - [ ] Reads invite token from URL
  - [ ] Shows agency branding (logo, colors from parent org settings)
  - [ ] Email + password form
  - [ ] OAuth buttons (Google, Apple)
  - [ ] On submit: calls `acceptInvitation`
- [ ] Create `ClientLoginPage` component (for returning clients)
- [ ] Modify auth flow to support `client` role redirect:
  - [ ] After login, if role === "client" → redirect to `/interview` or `/reviews`
  - [ ] Never show main dashboard to client role

---

## 2.3 Client-Scoped Experience

### Routes

```
/onboard/{inviteToken}     → Signup page (agency-branded)
/c/login                   → Client login
/c/interview               → Active interview session
/c/interview/history       → Past interviews
/c/reviews                 → Content review queue (Phase 3)
/c/profile                 → Content DNA profile view
```

All `/c/*` routes enforce `client` role. No navigation to `/dashboard`, `/layers`, `/builder`.

### Client Shell Layout

```
┌─────────────────────────────────────────┐
│ [Agency Logo]           [Profile] [Logout]│
├─────────────────────────────────────────┤
│                                         │
│  Tab: Interview | Reviews | Profile     │
│                                         │
│  ┌─────────────────────────────────────┐│
│  │                                     ││
│  │        (Active content area)        ││
│  │                                     ││
│  └─────────────────────────────────────┘│
│                                         │
└─────────────────────────────────────────┘
```

- Minimal chrome — agency logo, 3 tabs, profile/logout
- Mobile-first layout (clients will primarily use mobile)
- No sidebar, no settings, no integrations
- Agency branding: logo, primary color, favicon

### Interview View (`/c/interview`)

```
┌─────────────────────────────────────────┐
│  Phase 2 of 4: Your Audience            │
│  ████████░░░░░░░░  45% complete         │
├─────────────────────────────────────────┤
│                                         │
│  AI: "Who is your ideal customer?       │
│       Describe the person who gets the  │
│       most value from what you offer."  │
│                                         │
│  ┌─────────────────────────────────────┐│
│  │  [Your answer here...]              ││
│  │                                     ││
│  │  [🎤 Voice]  [Type]       [Send →] ││
│  └─────────────────────────────────────┘│
│                                         │
│  Previous answers:                      │
│  ✓ Business description                │
│  ✓ Your role                           │
│  ✓ Years of experience                 │
│  → Who is your ideal customer (current) │
│  ○ Their biggest pain point            │
│  ○ Where they hang out online          │
│                                         │
└─────────────────────────────────────────┘
```

### Implementation Tasks

- [ ] Create client route group `/c/*` with role guard
- [ ] Create `ClientShell` layout component:
  - [ ] Agency branding injection (logo, colors from parent org)
  - [ ] Tab navigation (Interview, Reviews, Profile)
  - [ ] Mobile-first responsive layout
- [ ] Create `ClientInterviewView` component:
  - [ ] Progress bar (phases + questions)
  - [ ] Chat-style message display
  - [ ] Input area with voice toggle (placeholder for Phase 4)
  - [ ] Previous answers checklist
  - [ ] Resume interrupted interview
- [ ] Create `ClientInterviewHistoryView` component:
  - [ ] List of completed interviews with dates
  - [ ] View extracted Content DNA per interview
- [ ] Create `ClientProfileView` component:
  - [ ] Display Content DNA fields (read-only initially)
  - [ ] "Request re-interview" button
- [ ] Route guard middleware:
  - [ ] Check session role === "client"
  - [ ] Redirect non-clients away from `/c/*`
  - [ ] Redirect clients away from `/dashboard`

---

## 2.4 Agency Client Manager

### Agency Dashboard Addition

New section in agency dashboard: "Clients"

```
┌─────────────────────────────────────────────┐
│ Clients (4 active, 2 pending)               │
├─────────────────────────────────────────────┤
│ ┌─ Active ──────────────────────────────┐   │
│ │ Maria's Bakery    ✅ Interview done   │   │
│ │   Credits: 142/500  │  Content: 12    │   │
│ │   Last active: 2h ago                 │   │
│ ├───────────────────────────────────────┤   │
│ │ TechStart GmbH    🔄 In interview    │   │
│ │   Credits: 500/500  │  Phase 3/6     │   │
│ │   Last active: 1d ago                │   │
│ └───────────────────────────────────────┘   │
│                                             │
│ ┌─ Pending Invites ─────────────────────┐   │
│ │ john@example.com   Sent 3 days ago   │   │
│ │   [Resend]  [Revoke]                 │   │
│ └───────────────────────────────────────┘   │
│                                             │
│ [+ Invite New Client]                       │
└─────────────────────────────────────────────┘
```

### Implementation Tasks

- [ ] Create `ClientManagerPanel` component:
  - [ ] Active clients list with status, credits, last activity
  - [ ] Pending invites with resend/revoke actions
  - [ ] "Invite New Client" dialog (name, email, template picker)
- [ ] Create `listClientSubOrgs` query:
  - [ ] Returns child orgs with interview status, credit balance, content count
- [ ] Create `getClientActivity` query:
  - [ ] Last login, interview progress, content reviewed count
- [ ] Add "Clients" tab to agency dashboard navigation
- [ ] Add client count badge to navigation item

---

## 2.5 Branded Email Templates

### Invite Email

```
Subject: {AgencyName} has invited you to get started

Body:
  [Agency Logo]

  Hi {ClientName},

  {AgencyName} is ready to build your content strategy.
  We'll start with a quick interview to understand your
  brand, voice, and audience.

  [Get Started →]  (links to /onboard/{token})

  This link expires in 7 days.

  Questions? Reply to this email.

  — {AgencyName}
```

### Implementation Tasks

- [ ] Create branded email template for client invitation
- [ ] Create branded email template for interview reminder (day 3 if not started)
- [ ] Create branded email template for interview completion ("Your content is being prepared")
- [ ] Use agency's Resend configuration (per-org sender email + domain)
- [ ] Fallback to platform sender if agency hasn't configured Resend

---

## Success Criteria

- [ ] Agency can invite a client by email
- [ ] Client receives branded email with signup link
- [ ] Client can sign up (email+password or OAuth)
- [ ] Client lands directly in interview experience (no dashboard)
- [ ] Client role has minimal permissions (interview + reviews only)
- [ ] Agency can see all clients, their status, and credit usage
- [ ] Sub-org created automatically with plan inheritance
- [ ] Credits consumed from agency's pool
- [ ] Invite can be resent or revoked
- [ ] Returning clients can log in and resume

---

## Files to Create/Modify

| File | Action | Purpose |
|---|---|---|
| `convex/clientInvitations.ts` | **Create** | Invite CRUD + accept/revoke logic |
| `convex/rbacHelpers.ts` | **Modify** | Add `client` role + permissions |
| `src/app/onboard/[token]/page.tsx` | **Create** | Client signup page |
| `src/app/c/layout.tsx` | **Create** | Client shell layout |
| `src/app/c/interview/page.tsx` | **Create** | Client interview view |
| `src/app/c/reviews/page.tsx` | **Create** | Content review queue (stub for Phase 3) |
| `src/app/c/profile/page.tsx` | **Create** | Content DNA profile view |
| `src/components/client/client-shell.tsx` | **Create** | Branded client layout |
| `src/components/client/client-interview.tsx` | **Create** | Interview chat UI |
| `src/components/agency/client-manager.tsx` | **Create** | Agency client list + invite dialog |
| `convex/integrations/resend.ts` | **Modify** | Add invite email template |
