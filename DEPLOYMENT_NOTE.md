# Deployment Note: Microsoft OAuth Fixes

## Actions Required After Deployment

After deploying the latest changes to production, you need to:

### 1. Seed Error Message Translations:

```bash
npx convex run translations/seedManage_07_Integrations:seed --prod
```

### 2. Cleanup Duplicate OAuth Connections (IMPORTANT!):

```bash
npx convex run migrations/cleanupDuplicateOAuthConnections:cleanup --prod
```

This will remove duplicate connection records that were created when you clicked
"Reconnect Account" multiple times. It keeps the newest connection and deletes
old error connections.

This will add the new error message translations in all 6 supported languages:
- English (en)
- German (de)
- Polish (pl)
- Spanish (es)
- French (fr)
- Japanese (ja)

### New Translation Keys Added:

- `ui.manage.integrations.errors.connection_issue_title`
- `ui.manage.integrations.errors.connection_expired`
- `ui.manage.integrations.errors.sync_failed_title`
- `ui.manage.integrations.errors.permissions_expired`
- `ui.manage.integrations.errors.session_expired`
- `ui.manage.integrations.errors.authorization_expired`
- `ui.manage.integrations.errors.sync_unavailable`
- `ui.manage.integrations.errors.sync_generic`
- `ui.manage.integrations.errors.connection_error`
- `ui.manage.integrations.actions.reconnect`
- `ui.manage.integrations.actions.reconnecting`

### What This Fixes:

Users will now see:
- ✅ "Your Microsoft account permissions have expired. Please reconnect your account below." (in their language)
- ❌ NOT: "Uncaught Error: Graph API request failed: 403..."

The errors are now user-friendly and translated!
