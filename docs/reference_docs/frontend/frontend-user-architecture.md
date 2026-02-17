# Frontend User Architecture

## 🚨 CRITICAL: Two Completely Separate User Systems

This system has **TWO DISTINCT USER TYPES** that must NEVER be confused:

---

## 1. Platform Users (`users` table)

**WHO**: Staff, administrators, event managers who MANAGE the platform

**TABLE**: `users` (dedicated table)

**AUTHENTICATION**: Backend admin dashboard login (password-based)

**PURPOSE**: Run the organization, create events, manage system

**EXAMPLES**:
- Event Manager (creates events, manages registrations)
- System Administrator (full access)
- Support Staff (helps customers)
- Organization Owner

**PERMISSIONS**: RBAC-controlled (roles like "admin", "manager", "viewer")

**RELATIONSHIP TO ORGANIZATION**:
- They ARE the organization
- Employees/contractors of the organization
- Stored in `organizationMemberships` table

---

## 2. Frontend Users (`objects` table, type: "frontend_user")

**WHO**: Doctors, attendees, customers who REGISTER for events

**TABLE**: `objects` with `type: "frontend_user"` (NOT the `users` table!)

**AUTHENTICATION**: Frontend OAuth (Google/Microsoft) or email/password

**PURPOSE**: Register for events, view tickets, manage their profile

**EXAMPLES**:
- Dr. Remington (registers for Haff Symposium)
- Dr. Schmidt (browses events, creates account)
- Guest User (registers without account → dormant frontend_user created)

**PERMISSIONS**: Limited to their own data (tickets, registrations)

**RELATIONSHIP TO ORGANIZATION**:
- They are CUSTOMERS of the organization
- Stored as `type: "frontend_user"` objects
- Linked to `type: "crm_contact"` objects (their CRM profile)

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ ORGANIZATION: Haff Symposium                                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  👥 PLATFORM USERS (Backend - Manage System)                │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
│  Table: users                                                │
│  ├─ Sarah (Event Manager) - creates events                  │
│  ├─ John (Admin) - manages system                           │
│  └─ Lisa (Support) - helps customers                        │
│                                                              │
│  👤 FRONTEND USERS (Customer-Facing - Attend Events)        │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
│  Table: objects (type: "frontend_user")                     │
│  ├─ Dr. Remington (subtype: "guest", status: "dormant")     │
│  │   └─ Links to: crm_contact (Dr. Remington's CRM profile) │
│  ├─ Dr. Schmidt (subtype: "oauth", status: "active")        │
│  │   └─ Links to: crm_contact (Dr. Schmidt's CRM profile)   │
│  └─ Dr. Mueller (subtype: "guest", status: "active")        │
│      └─ Links to: crm_contact (Dr. Mueller's CRM profile)   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Frontend User Lifecycle

### 1. Guest Registration (No Account)

```
Doctor fills event form (no login required)
         ↓
Backend creates:
├─ frontend_user (type: "frontend_user", subtype: "guest", status: "dormant")
│  └─ email: "dr.remington@example.com"
│  └─ NO password set (isPasswordSet: false)
│  └─ customProperties: { email, firstName, lastName }
│
├─ crm_contact (type: "crm_contact")
│  └─ Full CRM profile (phone, organization, etc.)
│
├─ ticket (type: "ticket")
│  └─ Event ticket with logistics
│
└─ objectLinks
   ├─ frontend_user → crm_contact ("represents")
   └─ ticket → frontend_user ("issued_to")

Doctor receives email:
"✅ Registration confirmed!
 📧 Confirmation email sent
 🔓 [Optional] Activate account to manage tickets"
```

### 2. Account Activation (Later)

```
Doctor clicks "Activate Account" in email
         ↓
Frontend: /activate-account?email=dr.remington@example.com
         ↓
Doctor sets password
         ↓
Backend updates:
└─ frontend_user
   └─ status: "dormant" → "active"
   └─ isPasswordSet: true
   └─ passwordHash: (bcrypt hash)

Now doctor can:
✅ Log in to frontend
✅ View "My Tickets"
✅ See registration history
✅ Update profile
✅ Register for future events (pre-filled form)
```

### 3. OAuth Registration (Direct Account)

```
Doctor clicks "Sign in with Google"
         ↓
OAuth flow completes
         ↓
Backend creates:
├─ frontend_user (subtype: "oauth", status: "active")
│  └─ customProperties: { oauthProvider: "google", oauthId: "..." }
│
└─ Links to existing crm_contact (if email matches)

Doctor immediately has active account
```

---

## Database Schema

### Frontend User Object
```typescript
{
  _id: Id<"objects">,
  organizationId: Id<"organizations">,
  type: "frontend_user",
  subtype: "guest" | "oauth" | "email",
  name: "dr.remington@example.com", // Email
  description: "Guest user from event registration",
  status: "dormant" | "active" | "suspended",
  customProperties: {
    email: string,
    firstName?: string,
    lastName?: string,
    displayName?: string,
    isPasswordSet?: boolean, // false for dormant accounts

    // OAuth-specific (if subtype: "oauth")
    oauthProvider?: "google" | "microsoft",
    oauthId?: string,

    // Metadata
    registrationSource: "event_registration" | "oauth" | "manual",
    lastLogin?: number,
  },
  createdAt: number,
  updatedAt: number,
  // NO createdBy field for frontend_users (they're top-level)
}
```

### CRM Contact Object (Linked)
```typescript
{
  _id: Id<"objects">,
  organizationId: Id<"organizations">,
  type: "crm_contact",
  subtype: "event_attendee",
  name: "Dr. Remington Splettstoesser",
  customProperties: {
    email: "dr.remington@example.com", // SAME as frontend_user
    firstName: "Remington",
    lastName: "Splettstoesser",
    salutation: "Dr.",
    phone: "+49...",
    organization: "Medical Practice",
    // ... full CRM data
  },
  createdBy: Id<"users"> | undefined, // Platform user who created (or undefined for auto-created)
}
```

### Link Between Them
```typescript
{
  _id: Id<"objectLinks">,
  organizationId: Id<"organizations">,
  fromObjectId: Id<"objects">, // frontend_user._id
  toObjectId: Id<"objects">,   // crm_contact._id
  linkType: "represents",
  properties: {
    label: "User account for contact",
    linkedAt: number,
  },
}
```

---

## Why This Separation?

### Security
- **Platform users**: Full system access, RBAC-controlled
- **Frontend users**: Limited to their own data only

### Scalability
- Platform users: ~10-50 per organization (employees)
- Frontend users: Thousands to millions (customers)

### Data Model
- Platform users: Complex permissions, roles, memberships
- Frontend users: Simple customer data, linked to CRM

### Authentication
- Platform users: Internal password system, 2FA, audit logs
- Frontend users: OAuth-first, optional password, simple auth

---

## Workflow Behaviors & Frontend Users

### Problem We're Solving

Workflow behaviors create objects (contacts, tickets, transactions) and require a `performedBy` field that references `users` table:

```typescript
// Internal mutation signature
createContactInternal({
  performedBy: v.id("users"), // ❌ Expects platform user
})
```

But guest registrations have **no platform user** (they're anonymous).

### ❌ WRONG Solution
```typescript
// Don't do this!
performedBy: "k1system000000000000000000" as Id<"users">
// This user doesn't exist!
```

### ✅ CORRECT Solution
```typescript
// Create frontend_user first, use its ID
const frontendUserId = await createOrGetGuestUser({
  email: "dr.remington@example.com",
  firstName: "Remington",
  lastName: "Splettstoesser",
});

// Now use frontend_user._id for performedBy
// But wait - performedBy expects Id<"users">, not Id<"objects">!
// So we need to make performedBy OPTIONAL for guest workflows
```

### The Real Fix

Make `performedBy`/`userId`/`createdBy` **optional** in internal mutations that support guest workflows:

```typescript
// Updated signature
createContactInternal({
  performedBy: v.optional(v.id("users")), // ✅ Optional for guests
  frontendUserId: v.optional(v.id("objects")), // ✅ New field for frontend_user
})
```

---

## Implementation Checklist

- [ ] Create `createOrGetGuestUser` mutation in `auth.ts`
- [ ] Update `createContactInternal` to accept optional `performedBy`
- [ ] Update `createTicketInternal` to accept optional `userId`
- [ ] Update `createFormResponseInternal` to accept optional `createdBy`
- [ ] Add `frontendUserId` field to track which frontend_user created the object
- [ ] Update workflow behaviors to create frontend_user first
- [ ] Link frontend_user → crm_contact after both created
- [ ] Update email templates to include "Activate Account" link
- [ ] Create frontend route: `/activate-account` for password setup

---

## Future Enhancements

### Account Dashboard
- My Tickets (all tickets for this frontend_user)
- My Registrations (all events registered for)
- Profile Settings (update email, phone, etc.)
- Registration History (past events attended)

### Single Sign-On
- Link Google/Microsoft OAuth to existing dormant accounts
- Merge duplicate accounts by email

### Email Preferences
- Frontend users can opt-in/out of marketing emails
- Stored in crm_contact customProperties

---

## Testing Scenarios

### Scenario 1: Guest Registration
1. Doctor fills form (no account)
2. System creates dormant frontend_user
3. System creates crm_contact
4. System creates ticket
5. Email sent with optional activation link

### Scenario 2: Activation
1. Doctor clicks "Activate Account"
2. Sets password
3. frontend_user.status → "active"
4. Can now log in and view tickets

### Scenario 3: Duplicate Prevention
1. Same doctor registers for 2nd event
2. System finds existing frontend_user by email
3. Reuses same frontend_user
4. Creates new ticket linked to same user

### Scenario 4: OAuth Registration
1. New doctor clicks "Sign in with Google"
2. System creates frontend_user (subtype: "oauth")
3. Links to crm_contact if email matches
4. Immediately active account

---

## Key Takeaways

1. **NEVER** confuse `users` (platform) with `frontend_user` (customers)
2. **ALWAYS** create dormant `frontend_user` during guest registration
3. **LINK** frontend_user → crm_contact by email
4. **OPTIONAL** `performedBy` for guest workflows
5. **ACTIVATE** account later via password setup

---

Last Updated: 2025-01-18
