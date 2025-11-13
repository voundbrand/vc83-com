# System Default Configuration

## Overview

The platform now supports **optional domain configuration**. When no custom domain config is specified, the system uses these hardcoded defaults.

## System Default Settings

### Email Configuration
```javascript
{
  senderEmail: "tickets@mail.l4yercak3.com",
  replyToEmail: "support@l4yercak3.com",
  defaultTemplateCode: "luxury-confirmation"
}
```

### Branding
```javascript
{
  logoUrl: "https://l4yercak3.com/logo.png",
  primaryColor: "#d4af37", // Gold
  secondaryColor: "#1a1412", // Dark brown
  accentColor: "#f5f1e8"    // Cream
}
```

### Web Publishing
```javascript
{
  siteUrl: "https://l4yercak3.com"
}
```

## Usage

### Backend (Convex Functions)

All email-related functions now accept **optional** `domainConfigId`:

```typescript
// Use system defaults
await ctx.runAction(api.ticketEmailService.sendTicketConfirmationEmail, {
  sessionId: "...",
  ticketId: "...",
  // domainConfigId not provided - uses system defaults
});

// Or use custom domain config
await ctx.runAction(api.ticketEmailService.sendTicketConfirmationEmail, {
  sessionId: "...",
  ticketId: "...",
  domainConfigId: "custom_domain_config_id" // Optional
});
```

### Frontend (UI)

The ticket detail modal and other email-sending UIs should:

1. Show "Use System Defaults" as the default option
2. Display system settings (grayed out/readonly)
3. Allow users to optionally select a custom domain config
4. Clearly indicate which settings are active

## Modified Functions

These functions now support optional domain config:

- ✅ `ticketEmailService.sendTicketConfirmationEmail`
- ✅ `ticketEmailService.previewTicketEmail`
- ✅ `emailTemplateRenderer.getEmailTemplateData`

## Future Enhancements

### Checkout Flow
The same pattern should be applied to checkout sessions:

1. Make domain config optional in checkout creation
2. Use system defaults when not specified
3. Allow custom branding per checkout if domain config provided

### Benefits
- **Simpler onboarding**: Users can send emails immediately without setup
- **Consistent branding**: System defaults ensure professional appearance
- **Flexibility**: Advanced users can still customize with domain configs
- **Backward compatible**: Existing domain configs continue to work

## Environment Variables Required

Ensure these are set in `.env.local`:
```bash
RESEND_API_KEY=re_...
```

The system defaults reference `mail.l4yercak3.com` domain which must be verified in Resend.
