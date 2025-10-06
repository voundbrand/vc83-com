# Microsoft OAuth & Email Integration Plan for L4YERCAK3.com

## Overview
This document outlines the implementation strategy for integrating Microsoft account authentication and email access into the L4YERCAK3.com Next.js application using Microsoft Entra ID (formerly Azure AD).

## Architecture Options

### Option 1: Microsoft Graph API with OAuth 2.0 (Recommended)
**Best for**: Full email access, calendar integration, and other Microsoft 365 features

#### Pros:
- Full access to Microsoft Graph API (emails, calendar, contacts, OneDrive)
- Granular permission scopes
- Modern authentication flow
- Supports both personal (outlook.com) and work/school accounts
- Real-time email sync capabilities
- Webhooks for email notifications

#### Cons:
- More complex setup
- Requires Azure app registration
- Token management complexity

#### Implementation Flow:
1. User clicks "Login with Microsoft"
2. Redirect to Microsoft OAuth consent page
3. User grants email access permissions
4. Receive authorization code
5. Exchange for access/refresh tokens
6. Use tokens to access Microsoft Graph API
7. Store refresh token securely for offline access

### Option 2: NextAuth.js with Microsoft Provider
**Best for**: Simple authentication without deep email integration

#### Pros:
- Easy to implement
- Built-in session management
- Supports multiple providers
- Good for basic authentication

#### Cons:
- Limited email access out of the box
- Requires custom implementation for Graph API
- Less flexibility

### Option 3: MSAL (Microsoft Authentication Library) + Next.js
**Best for**: Enterprise applications with advanced scenarios

#### Pros:
- Official Microsoft library
- Advanced token caching
- Supports complex auth scenarios
- Better for enterprise SSO

#### Cons:
- Heavier client-side bundle
- More complex than needed for basic email sync

## Recommended Architecture

### 1. Authentication Flow
```
Next.js App � Microsoft OAuth 2.0 � Authorization Code � Access Token � Microsoft Graph API
```

### 2. Technology Stack
- **Frontend**: Next.js + TypeScript
- **Auth Library**: NextAuth.js with custom Microsoft provider
- **API Integration**: Microsoft Graph SDK for JavaScript
- **Backend**: Convex for token storage and email caching
- **Token Management**: Secure refresh token rotation

### 3. Required Permissions (Scopes)
```
- openid (required)
- profile (required)
- email (required)
- offline_access (for refresh tokens)
- Mail.Read (read user's mail)
- Mail.ReadWrite (full mail access)
- Mail.Send (send mail on behalf)
- User.Read (read user profile)
```

## Implementation Steps

### Phase 1: Azure App Registration
1. **Create Azure AD App Registration**
   - Navigate to Azure Portal � Azure Active Directory � App registrations
   - Register new application
   - Set redirect URIs: 
     - Development: `http://localhost:3000/api/auth/callback/microsoft`
     - Production: `https://L4YERCAK3.com/api/auth/callback/microsoft`
   - Enable public client flows if needed

2. **Configure API Permissions**
   - Add Microsoft Graph permissions
   - Request admin consent if needed
   - Configure application permissions vs delegated permissions

3. **Generate Client Credentials**
   - Create client secret
   - Note down:
     - Client ID (Application ID)
     - Tenant ID
     - Client Secret

### Phase 2: Next.js Integration

#### Install Dependencies
```bash
npm install next-auth @azure/msal-node @microsoft/microsoft-graph-client
npm install @types/microsoft-graph --save-dev
```

#### Environment Variables
```env
# .env.local
MICROSOFT_CLIENT_ID=your-client-id
MICROSOFT_CLIENT_SECRET=your-client-secret
MICROSOFT_TENANT_ID=your-tenant-id
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret
```

#### NextAuth Configuration
```typescript
// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth"
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id"

const handler = NextAuth({
  providers: [
    MicrosoftEntraID({
      clientId: process.env.MICROSOFT_CLIENT_ID!,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
      tenantId: process.env.MICROSOFT_TENANT_ID!,
      authorization: {
        params: {
          scope: 'openid profile email offline_access Mail.Read Mail.ReadWrite User.Read',
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        token.expiresAt = account.expires_at
      }
      return token
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken
      return session
    },
  },
})

export { handler as GET, handler as POST }
```

### Phase 3: Microsoft Graph Integration

#### Create Graph Client
```typescript
// lib/microsoft-graph.ts
import { Client } from '@microsoft/microsoft-graph-client'

export function createGraphClient(accessToken: string) {
  return Client.init({
    authProvider: (done) => {
      done(null, accessToken)
    },
  })
}

// Email fetching functions
export async function getUserEmails(accessToken: string) {
  const client = createGraphClient(accessToken)
  
  try {
    const messages = await client
      .api('/me/messages')
      .top(10)
      .orderby('receivedDateTime desc')
      .select('subject,from,receivedDateTime,bodyPreview')
      .get()
    
    return messages.value
  } catch (error) {
    console.error('Error fetching emails:', error)
    throw error
  }
}

export async function getEmailDetails(accessToken: string, messageId: string) {
  const client = createGraphClient(accessToken)
  
  const message = await client
    .api(`/me/messages/${messageId}`)
    .get()
  
  return message
}
```

### Phase 4: Convex Integration

#### Token Storage Schema
```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
  users: defineTable({
    email: v.string(),
    name: v.optional(v.string()),
    microsoftId: v.string(),
    accessToken: v.string(), // Encrypted in production
    refreshToken: v.string(), // Encrypted in production
    tokenExpiresAt: v.number(),
    lastSync: v.optional(v.number()),
  }).index("by_email", ["email"]),
  
  emails: defineTable({
    userId: v.id("users"),
    messageId: v.string(),
    subject: v.string(),
    from: v.object({
      email: v.string(),
      name: v.optional(v.string()),
    }),
    receivedDateTime: v.string(),
    bodyPreview: v.string(),
    body: v.optional(v.string()),
    isRead: v.boolean(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_date", ["userId", "receivedDateTime"]),
})
```

#### Email Sync Function
```typescript
// convex/emails.ts
import { mutation, query } from "./_generated/server"
import { v } from "convex/values"

export const syncEmails = mutation({
  args: { 
    emails: v.array(v.object({
      messageId: v.string(),
      subject: v.string(),
      from: v.object({
        email: v.string(),
        name: v.optional(v.string()),
      }),
      receivedDateTime: v.string(),
      bodyPreview: v.string(),
      isRead: v.boolean(),
    }))
  },
  handler: async (ctx, { emails }) => {
    const user = await ctx.auth.getUserIdentity()
    if (!user) throw new Error("Not authenticated")
    
    // Store emails in Convex
    for (const email of emails) {
      await ctx.db.insert("emails", {
        userId: user._id,
        ...email,
      })
    }
  },
})
```

### Phase 5: UI Components

#### Retro Email Client Window
```typescript
// components/window-content/email-window.tsx
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { getUserEmails } from '@/lib/microsoft-graph'

export function EmailWindow() {
  const { data: session } = useSession()
  const [emails, setEmails] = useState([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    if (session?.accessToken) {
      fetchEmails()
    }
  }, [session])
  
  async function fetchEmails() {
    try {
      const messages = await getUserEmails(session.accessToken)
      setEmails(messages)
    } catch (error) {
      console.error('Failed to fetch emails:', error)
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="retro-email-client">
      {/* Retro-styled email list */}
    </div>
  )
}
```

## Security Considerations

### 1. Token Security
- **Encryption**: Encrypt tokens before storing in Convex
- **Secure Storage**: Use environment variables for secrets
- **Token Rotation**: Implement automatic token refresh
- **Minimal Scopes**: Request only necessary permissions

### 2. Data Privacy
- **Data Minimization**: Only sync necessary email data
- **User Consent**: Clear consent for email access
- **Data Retention**: Implement data deletion policies
- **GDPR Compliance**: Handle EU user data appropriately

### 3. Authentication Security
- **HTTPS Only**: Enforce HTTPS in production
- **CSRF Protection**: Use NextAuth's built-in CSRF protection
- **Session Security**: Secure session cookies
- **Rate Limiting**: Implement API rate limiting

## Advanced Features

### 1. Real-time Email Sync
```typescript
// Use Microsoft Graph webhooks
POST https://graph.microsoft.com/v1.0/subscriptions
{
  "changeType": "created,updated",
  "notificationUrl": "https://L4YERCAK3.com/api/webhooks/microsoft",
  "resource": "/me/messages",
  "expirationDateTime": "2024-12-01T00:00:00Z",
  "clientState": "secret-client-state"
}
```

### 2. Email Actions
- Mark as read/unread
- Archive emails
- Delete emails
- Send replies
- Create drafts

### 3. Search Integration
```typescript
// Search emails using Graph API
const searchResults = await client
  .api('/me/messages')
  .filter(`contains(subject, '${searchTerm}')`)
  .get()
```

## Testing Strategy

### 1. Unit Tests
- Test Graph API client functions
- Test token refresh logic
- Test email parsing functions

### 2. Integration Tests
- Test OAuth flow end-to-end
- Test email sync with mock data
- Test error handling

### 3. E2E Tests
- Test login flow
- Test email viewing
- Test permission handling

## Deployment Checklist

### Production Setup
- [ ] Register production redirect URIs in Azure
- [ ] Set production environment variables
- [ ] Enable HTTPS
- [ ] Configure CORS policies
- [ ] Set up monitoring and logging
- [ ] Implement rate limiting
- [ ] Configure backup strategies

### Monitoring
- Track authentication success/failure rates
- Monitor API rate limits
- Log token refresh failures
- Track email sync performance

## Alternative Considerations

### For Simpler Requirements
If you only need basic authentication without email access:
```typescript
// Use standard NextAuth Microsoft provider
MicrosoftEntraID({
  clientId: process.env.MICROSOFT_CLIENT_ID!,
  clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
  tenantId: process.env.MICROSOFT_TENANT_ID!,
})
```

### For Enterprise Features
Consider adding:
- Conditional Access policies
- Multi-tenant support
- Admin consent workflows
- Advanced threat protection

## Resources

- [Microsoft Graph API Documentation](https://docs.microsoft.com/en-us/graph/)
- [NextAuth.js Microsoft Provider](https://next-auth.js.org/providers/azure-ad)
- [MSAL.js Documentation](https://docs.microsoft.com/en-us/azure/active-directory/develop/msal-overview)
- [Azure AD App Registration Guide](https://docs.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app)

## Next Steps

1. **Decision Required**: Choose between basic auth or full email integration
2. **Azure Setup**: Create app registration in Azure Portal
3. **Implement Auth**: Start with basic Microsoft login
4. **Add Email Access**: Incrementally add email features
5. **Test Security**: Thoroughly test all security aspects
6. **Deploy**: Use staged rollout approach