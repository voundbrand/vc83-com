# OAuth Architecture Clarification

## 🎯 Two Separate OAuth Systems

This platform has **two completely different OAuth implementations** for two different user types:

---

## 1️⃣ Platform OAuth (Admin/Staff Users)

### Purpose
Platform administrators connecting their **Microsoft 365 accounts** to enable email sending, calendar access, and other Microsoft Graph API features.

### Architecture
```
┌─────────────────────────┐
│  Platform Admin Panel   │
│  (Internal Dashboard)   │
└────────┬────────────────┘
         │
         │ User clicks "Connect Microsoft Account"
         ▼
┌─────────────────────────────────────────────────┐
│  Convex Backend                                 │
│  convex/oauth/microsoft.ts                      │
│  - initiateMicrosoftOAuth() mutation            │
│  - completeMicrosoftOAuth() mutation            │
│  - Stores tokens in oauthConnections table      │
└─────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Microsoft OAuth Flow   │
│  (Azure AD)             │
└─────────────────────────┘
```

### Database Tables
- **Users**: `users` table (platform staff)
- **OAuth Tokens**: `oauthConnections` table
- **Sessions**: `sessions` table
- **State Tokens**: `oauthStates` table

### Use Cases
- Sending emails on behalf of organization
- Accessing shared calendars
- Reading/writing contacts to Microsoft 365
- Syncing tasks and notes
- **NOT for authentication** (platform staff use email/password)

### Permissions (Microsoft Graph Scopes)
- `Mail.Send` - Send emails
- `Calendars.ReadWrite` - Manage calendars
- `Contacts.ReadWrite` - Manage contacts
- `offline_access` - Refresh tokens

### Code Location
- `convex/oauth/microsoft.ts` - OAuth flow
- `convex/oauth/microsoftScopes.ts` - Scope configuration
- `convex/oauth/graphClient.ts` - Microsoft Graph API client
- `convex/oauth/emailSending.ts` - Email sending via Graph API

---

## 2️⃣ Frontend OAuth (Customer/Freelancer Users)

### Purpose
Customer/freelancer **authentication** for accessing the client portal (projects, invoices, CRM data).

### Architecture
```
┌─────────────────────────┐
│  Frontend Application   │
│  (Next.js + NextAuth)   │
│                         │
│  User clicks            │
│  "Sign in with Google"  │
│  "Sign in with MS"      │
└────────┬────────────────┘
         │
         │ 1. NextAuth.js handles OAuth
         │ 2. Redirects to OAuth provider
         │ 3. User grants permission
         │ 4. Callback returns to frontend
         │
         ▼
┌─────────────────────────────────────────────────┐
│  NextAuth.js (Frontend)                         │
│  - Handles OAuth flow completely                │
│  - No backend OAuth routes needed               │
│  - Calls backend after success                  │
└────────┬────────────────────────────────────────┘
         │
         │ 5. POST /api/v1/auth/sync-user
         │    { email, name, oauthProvider, oauthId }
         ▼
┌─────────────────────────────────────────────────┐
│  Convex Backend                                 │
│  convex/api/v1/auth.ts                          │
│  - syncUser() HTTP action                       │
│  - Creates/updates frontend_user                │
│  - Links to CRM contact                         │
│  - Returns user ID (used as session token)      │
└─────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Frontend stores        │
│  user._id as token      │
│  for API calls          │
└─────────────────────────┘
```

### Database Tables
- **Users**: `objects` table with `type: "frontend_user"`
- **Sessions**: `frontendSessions` table (separate from staff sessions!)
- **OAuth Data**: Stored in `objects.customProperties` (not `oauthConnections`)
- **No Tokens**: Backend doesn't store OAuth access tokens (stateless)

### Use Cases
- User authentication (primary purpose)
- Accessing projects assigned to them
- Viewing their invoices
- Managing their profile
- Viewing CRM data they're linked to

### Permissions (Minimal OAuth Scopes)
- `openid` - Basic authentication
- `profile` - User's name and picture
- `email` - User's email address
- **No Microsoft Graph permissions** (don't need to send emails, etc.)

### Code Location
- `convex/api/v1/auth.ts` - Backend sync/validation endpoints
- `convex/frontendUserQueries.ts` - Frontend user queries
- `docs/FRONTEND_OAUTH_SETUP.md` - Frontend implementation guide
- Frontend: `app/api/auth/[...nextauth]/route.ts` (to be created)

---

## 📊 Comparison Table

| Aspect | Platform OAuth | Frontend OAuth |
|--------|---------------|----------------|
| **User Type** | Platform staff/admins | Customers/freelancers |
| **Purpose** | Microsoft Graph API access | User authentication |
| **Handler** | Convex backend | NextAuth.js (frontend) |
| **Database** | `users` + `oauthConnections` | `objects` (type=frontend_user) |
| **Sessions** | `sessions` table | `frontendSessions` table |
| **OAuth Provider** | Microsoft only | Google + Microsoft |
| **Tokens Stored** | ✅ Yes (for API access) | ❌ No (stateless) |
| **Scopes** | Mail, Calendar, Contacts | Profile, Email only |
| **Code Location** | `convex/oauth/` | Frontend + `convex/api/v1/auth.ts` |
| **Status** | ✅ Complete | ✅ Backend ready, frontend needs NextAuth |

---

## 🔑 Key Differences Explained

### Why Two Systems?

#### Platform OAuth (Staff)
- **Goal**: Access Microsoft services (email, calendar) on behalf of organization
- **Requirement**: Need ongoing access to Microsoft Graph API
- **Solution**: Store refresh tokens, handle token refresh, implement full OAuth flow in backend
- **Complexity**: High (full OAuth implementation with token management)

#### Frontend OAuth (Customers)
- **Goal**: Simply authenticate users (verify identity)
- **Requirement**: Just need to know who the user is (email + name)
- **Solution**: Use NextAuth.js (battle-tested OAuth library), backend just syncs user data
- **Complexity**: Low (NextAuth handles everything, backend is stateless)

### Why Not Use Same System?

**Bad idea because:**
1. **Security**: Staff credentials should never touch frontend
2. **Separation**: Different permission scopes (Graph API vs basic profile)
3. **Scalability**: Frontend OAuth is stateless (scales better)
4. **Maintenance**: NextAuth.js handles OAuth complexity for customers
5. **Provider Support**: Customers can use Google OR Microsoft easily

---

## 🚨 Common Misconceptions

### ❌ "Backend needs OAuth callback for frontend users"
**Wrong!** NextAuth.js handles OAuth callbacks on the frontend. Backend only has a sync endpoint.

### ❌ "convex/oauth/microsoft.ts is for frontend OAuth"
**Wrong!** That's for platform staff to connect Microsoft accounts for email/calendar features.

### ❌ "Backend needs to implement Google OAuth"
**Wrong!** NextAuth.js supports Google out of the box. Backend is provider-agnostic.

### ❌ "Frontend users are stored in users table"
**Wrong!** They're stored in `objects` table with `type: "frontend_user"` (separate from platform staff).

### ❌ "Backend needs to refresh OAuth tokens for customers"
**Wrong!** Backend doesn't store customer OAuth tokens at all (stateless authentication).

---

## ✅ Implementation Checklist

### Backend Team (Already Complete!)
- [x] Create `/api/v1/auth/sync-user` endpoint
- [x] Create `/api/v1/auth/validate-token` endpoint
- [x] Create `/api/v1/auth/user` endpoint
- [x] Define `frontend_user` object type
- [x] Create `frontendSessions` table
- [x] Link frontend_user to CRM contacts
- [x] Write comprehensive documentation

### Frontend Team (Todo)
- [ ] Install NextAuth.js (`npm install next-auth@beta`)
- [ ] Register OAuth apps (Google + Microsoft)
- [ ] Create NextAuth route handler
- [ ] Implement sign-in page
- [ ] Create API client helpers
- [ ] Add protected routes
- [ ] Test OAuth flow end-to-end
- [ ] Deploy to production

---

## 📚 Documentation References

### Platform OAuth (Staff)
- `convex/oauth/microsoft.ts` - Implementation
- `docs/MICROSOFT_OAUTH_ERROR_HANDLING.md` - Error handling

### Frontend OAuth (Customers)
- `docs/FRONTEND_OAUTH_SETUP.md` - **Complete setup guide** ⭐
- `docs/API_DATA_FLOW_DIAGRAM.md` - Data flow overview
- `convex/api/v1/auth.ts` - Backend endpoints
- `convex/frontendUserQueries.ts` - User data queries

---

## 🎯 Summary

**Two OAuth systems, two different purposes:**

1. **Platform OAuth** = Staff connecting Microsoft accounts → Backend handles everything
2. **Frontend OAuth** = Customer authentication → NextAuth.js handles OAuth, backend just syncs data

**Backend status:** ✅ Complete for both systems
**Frontend status:** ✅ Ready to implement NextAuth.js (2-3 days)

The confusion arises because both involve OAuth, but they serve completely different purposes and use different architectures. Platform OAuth is about **API access**, while Frontend OAuth is about **user authentication**.

---

*Last updated: December 4, 2025*
