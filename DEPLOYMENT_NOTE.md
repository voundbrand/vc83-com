# Deployment Note: Microsoft OAuth Error Translations

## Action Required After Deployment

After deploying the latest changes to production, you need to seed the new error message translations.

### Run This Command in Production:

```bash
npx convex run translations/seedManage_07_Integrations:seed --prod
```

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
