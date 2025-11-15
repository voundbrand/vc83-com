# OAuth User Synchronization Flow

This document explains how user authentication and data syncing works between three systems:
1. **Gründungswerft Intranet** (OAuth provider - source of truth)
2. **Frontend (Benefits Platform)** (Next.js app where members interact)
3. **Backend (L4YERCAK3)** (Convex database with CRM data)

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     THREE-SYSTEM SYNC                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐      ┌──────────────────┐               │
│  │  Gründungswerft  │      │    Frontend      │               │
│  │    Intranet      │◄────►│ Benefits Platform│               │
│  │                  │      │   (Next.js)      │               │
│  │  - Members       │      │                  │               │
│  │  - Auth (OAuth)  │      │  - NextAuth.js   │               │
│  │  - Credentials   │      │  - UI/UX         │               │
│  └──────────────────┘      └─────────┬────────┘               │
│         ▲                             │                        │
│         │                             │                        │
│         │                             ▼                        │
│         │                  ┌──────────────────┐               │
│         │                  │     Backend      │               │
│         └──────────────────┤   L4YERCAK3.com  │               │
│           (manual sync)    │    (Convex)      │               │
│                            │                  │               │
│                            │  - frontend_user │               │
│                            │  - crm_contact   │               │
│                            │  - crm_org       │               │
│                            └──────────────────┘               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Complete User Flow (First-Time Login)

### Step 1: User Clicks "Login" on Benefits Platform

```
User on Frontend
    ↓
Clicks "Mit Gründungswerft anmelden"
    ↓
NextAuth.js redirects to: https://intranet.gruendungswerft.de/oauth/authorize
```

### Step 2: User Authenticates in Intranet

```
Gründungswerft Intranet
    ↓
User enters credentials
    ↓
Intranet validates (username/password)
    ↓
Intranet returns OAuth token + user data:
{
  "sub": "member_12345",
  "email": "max.mustermann@firma.de",
  "name": "Max Mustermann",
  "organization": "Firma ABC GmbH"
}
```

### Step 3: Frontend Receives OAuth Response

```
NextAuth.js callback receives:
    ↓
- OAuth access token
- User profile (email, name, etc.)
    ↓
Calls Backend API: POST /api/v1/auth/sync-user
```

**Frontend Code:**
```typescript
// app/api/auth/[...nextauth]/route.ts
callbacks: {
  async signIn({ user, account }) {
    // Call backend to sync/create user
    const response = await fetch(`${BACKEND_URL}/api/v1/auth/sync-user`, {
      method: 'POST',
      body: JSON.stringify({
        email: user.email,
        name: user.name,
        oauthProvider: "gruendungswerft",
        oauthId: account.providerAccountId, // "member_12345"
      }),
    });

    const backendUser = await response.json();
    user.backendUserId = backendUser._id;
    return true;
  }
}
```

### Step 4: Backend Creates/Updates frontend_user

```
Backend receives sync request
    ↓
Checks if frontend_user exists:
  - By oauthId ("member_12345")
  - Or by email ("max.mustermann@firma.de")
    ↓
IF EXISTS:
  → Update lastLogin timestamp
  → Return existing frontend_user
    ↓
IF NEW:
  → Create frontend_user object in ontology
  → Search for matching crm_contact by email
  → IF crm_contact found:
      → Create objectLink (frontend_user → crm_contact)
      → Get crm_organization from crm_contact
      → Create objectLink (frontend_user → crm_organization)
  → Return new frontend_user with CRM links
```

**Backend Code (Already Implemented):**
```typescript
// convex/auth.ts - syncFrontendUser
export const syncFrontendUser = internalMutation({
  handler: async (ctx, args) => {
    // 1. Check if user exists by OAuth ID
    const existingUser = await findByOAuth(oauthId);

    if (existingUser) {
      // Update last login
      await ctx.db.patch(existingUser._id, {
        customProperties: {
          ...existingUser.customProperties,
          lastLogin: Date.now(),
        }
      });
      return existingUser;
    }

    // 2. Create new frontend_user
    const userId = await ctx.db.insert("objects", {
      type: "frontend_user",
      subtype: "oauth",
      name: email, // "max.mustermann@firma.de"
      customProperties: {
        oauthProvider: "gruendungswerft",
        oauthId: "member_12345",
        displayName: "Max Mustermann",
        lastLogin: Date.now(),
      }
    });

    // 3. Link to existing CRM data (if found)
    await linkFrontendUserToCRM(userId, email);

    return await ctx.db.get(userId);
  }
});
```

### Step 5: Frontend Stores Session

```
Frontend receives backend response:
    ↓
{
  "_id": "k1abc123...",
  "name": "max.mustermann@firma.de",
  "customProperties": {
    "crmContactId": "k1contact456...",
    "crmOrganizationId": "k1org789..."
  }
}
    ↓
NextAuth.js stores in session:
    ↓
session.user = {
  email: "max.mustermann@firma.de",
  name: "Max Mustermann",
  backendUserId: "k1abc123...",
  crmContactId: "k1contact456...",
  crmOrganizationId: "k1org789..."
}
```

### Step 6: User Accesses Protected Resources

```
User navigates to /dashboard/listings
    ↓
Frontend makes API call to backend:
GET /api/v1/crm/listings
Authorization: Bearer k1abc123...
    ↓
Backend:
  1. Validates frontend_user (k1abc123...)
  2. Gets crmOrganizationId from frontend_user
  3. Filters listings by crmOrganizationId
  4. Returns only user's organization's data
    ↓
Frontend displays listings
```

---

## User Data Sync Scenarios

### Scenario 1: New Member (Not in CRM Yet)

**Problem:** User authenticates via intranet but doesn't exist in CRM yet.

**Solution:**
```
1. Frontend_user is created in backend
2. NO crm_contact link (because it doesn't exist)
3. User gets basic access but limited features
4. Admin manually creates crm_contact later
5. System auto-links when crm_contact is created (by email match)
```

**Backend Auto-Linking Code (Future Enhancement):**
```typescript
// When a new crm_contact is created, auto-link to frontend_user if email matches
export const createCrmContact = internalMutation({
  handler: async (ctx, args) => {
    // Create contact
    const contactId = await ctx.db.insert("objects", {
      type: "crm_contact",
      customProperties: { email: "max@firma.de" }
    });

    // Auto-link to frontend_user if exists
    const frontendUser = await findFrontendUserByEmail("max@firma.de");
    if (frontendUser) {
      await linkFrontendUserToCRM(frontendUser._id, contactId);
    }
  }
});
```

### Scenario 2: Existing Member (Already in CRM)

**Ideal Flow:**
```
1. User authenticates via intranet
2. Frontend_user created
3. Backend finds matching crm_contact by email
4. Auto-links: frontend_user → crm_contact
5. Auto-links: frontend_user → crm_organization
6. User gets full access to organization data
```

### Scenario 3: Member Changes Email in Intranet

**Problem:** User's email changes in intranet, sync breaks.

**Solution (Manual for now):**
```
1. Admin updates crm_contact email in backend
2. Admin updates frontend_user email manually
3. System re-links by new email

OR (Better - Future Enhancement):
1. Intranet sends webhook: "user_updated"
2. Backend receives webhook
3. Backend finds frontend_user by oauthId (not email!)
4. Backend updates frontend_user email
5. Backend re-links to crm_contact
```

### Scenario 4: Member Deleted from Intranet

**Problem:** Member can't log in anymore but data remains in backend.

**Solution:**
```
Option A (Soft Delete):
1. Login fails (intranet rejects)
2. Frontend shows error
3. Backend keeps frontend_user and CRM data
4. Admin can manually deactivate

Option B (Webhook - Future):
1. Intranet sends webhook: "user_deleted"
2. Backend receives webhook
3. Backend sets frontend_user status = "inactive"
4. User blocked from all API calls
```

---

## Data Ownership & Source of Truth

| Data Type | Source of Truth | Synced To | Sync Method |
|-----------|----------------|-----------|-------------|
| **Authentication** | Gründungswerft Intranet | Frontend (session) | OAuth flow |
| **User Identity** (email, name) | Gründungswerft Intranet | Backend (frontend_user) | API sync on login |
| **CRM Contact** | Backend (L4YERCAK3) | - | Manual creation by admin |
| **CRM Organization** | Backend (L4YERCAK3) | - | Manual creation by admin |
| **Listings/Inserate** | Backend (L4YERCAK3) | - | Created by user via frontend |

---

## Initial Setup: Syncing Existing Members

If you already have members in both systems, you need a one-time sync:

### Option 1: Manual Admin Task

```
1. Export members from Gründungswerft Intranet (CSV)
   Columns: oauth_id, email, name, organization

2. Import into Backend as crm_contacts:
   - Create crm_organization objects
   - Create crm_contact objects
   - Link contacts to organizations

3. When users first log in via OAuth:
   - Backend auto-creates frontend_user
   - Backend auto-links to existing crm_contact (by email)
```

### Option 2: Bulk API Import (Recommended)

**Backend Mutation:**
```typescript
// convex/admin.ts
export const bulkImportMembers = internalMutation({
  args: {
    members: v.array(v.object({
      oauthId: v.string(),
      email: v.string(),
      name: v.string(),
      organization: v.string(),
    }))
  },
  handler: async (ctx, args) => {
    for (const member of args.members) {
      // 1. Find or create crm_organization
      let org = await findOrgByName(member.organization);
      if (!org) {
        org = await createCrmOrganization(member.organization);
      }

      // 2. Create crm_contact
      const contactId = await ctx.db.insert("objects", {
        type: "crm_contact",
        customProperties: {
          email: member.email,
          name: member.name,
        }
      });

      // 3. Link contact to organization
      await ctx.db.insert("objectLinks", {
        fromObjectId: contactId,
        toObjectId: org._id,
        linkType: "belongs_to_organization",
      });

      // Note: frontend_user will be created on first login
    }
  }
});
```

**Usage:**
```typescript
// One-time script
await ctx.runMutation(internal.admin.bulkImportMembers, {
  members: [
    { oauthId: "member_001", email: "max@firma.de", name: "Max", organization: "Firma ABC" },
    { oauthId: "member_002", email: "anna@company.de", name: "Anna", organization: "Company XYZ" },
    // ... etc
  ]
});
```

---

## API Flow Summary

### Login Flow
```
1. Frontend: Redirect to intranet OAuth
2. Intranet: User logs in, returns to frontend
3. Frontend: POST /api/v1/auth/sync-user → Backend
4. Backend: Create/update frontend_user, link to CRM
5. Backend: Return user with CRM context
6. Frontend: Store session, redirect to dashboard
```

### Data Access Flow
```
1. Frontend: GET /api/v1/crm/listings (with Authorization header)
2. Backend: Validate frontend_user
3. Backend: Get crmOrganizationId from frontend_user
4. Backend: Filter listings by crmOrganizationId
5. Backend: Return filtered data
6. Frontend: Display listings
```

### Create Listing Flow
```
1. Frontend: POST /api/v1/crm/listings { title, description, ... }
2. Backend: Validate frontend_user
3. Backend: Get crmOrganizationId from frontend_user
4. Backend: Create listing object linked to crmOrganizationId
5. Backend: Return created listing
6. Frontend: Show success message
```

---

## Security Considerations

✅ **Backend always validates frontend_user** before returning data
✅ **All data scoped to crmOrganizationId** (users can't see other orgs' data)
✅ **OAuth tokens stored only in frontend session** (not in backend)
✅ **Backend uses frontend_user._id as auth token** (not OAuth token)
✅ **No passwords stored in backend** (authentication delegated to intranet)

---

## Future Enhancements

### 1. Intranet Webhooks (Recommended)

**Benefits:**
- Real-time sync when user data changes
- Auto-deactivate deleted users
- Update email/name changes automatically

**Implementation:**
```typescript
// Backend webhook endpoint
http.route({
  path: "/webhooks/intranet/user-updated",
  method: "POST",
  handler: async (ctx, request) => {
    const { oauthId, email, name, action } = await request.json();

    const frontendUser = await findByOAuthId(oauthId);

    if (action === "updated") {
      await ctx.db.patch(frontendUser._id, {
        name: email,
        customProperties: {
          ...frontendUser.customProperties,
          displayName: name,
        }
      });
    }

    if (action === "deleted") {
      await ctx.db.patch(frontendUser._id, {
        status: "inactive",
      });
    }

    return new Response("OK");
  }
});
```

### 2. Bi-directional Sync

**Use Case:** When admin creates crm_contact in backend, also create user in intranet

**Implementation:**
- Backend calls Intranet API when creating crm_contact
- Intranet creates user account
- Returns oauthId to backend
- Backend stores oauthId in crm_contact

---

## Troubleshooting

### User can't log in
❌ **Problem:** OAuth fails
✅ **Check:** Intranet OAuth credentials, redirect URIs
✅ **Solution:** Verify GRUENDUNGSWERFT_CLIENT_ID and CLIENT_SECRET

### User logged in but no data
❌ **Problem:** frontend_user not linked to crm_contact
✅ **Check:** Email matches between intranet and CRM
✅ **Solution:** Manually link or update crm_contact email

### User sees other organization's data
❌ **Problem:** crmOrganizationId not properly scoped
✅ **Check:** Backend API filters by crmOrganizationId
✅ **Solution:** Verify objectLinks and query filters

---

**Last Updated:** 2025-01-14
**Version:** 1.0.0
