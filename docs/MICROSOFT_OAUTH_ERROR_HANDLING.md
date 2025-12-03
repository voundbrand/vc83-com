# Microsoft OAuth Error Handling Guide

## Common 403 "Access Denied" Error

### Error Message
```
Uncaught Error: Graph API request failed: 403 {"error":{"code":"ErrorAccessDenied","message":"Access is denied. Check credentials and try again."}}
```

### Root Causes

1. **Expired or Revoked Refresh Token**
   - Refresh tokens expire after 90 days of inactivity
   - User changed their Microsoft password
   - User revoked app permissions via Microsoft account settings

2. **Organizational Policy Changes**
   - Admin modified conditional access policies
   - Tenant-level permission changes
   - MFA requirements added or changed

3. **Scope/Permission Revocation**
   - User manually revoked specific permissions (e.g., Mail.Read)
   - Admin removed delegated permissions from the app

4. **Token Refresh Failure**
   - Refresh token itself is invalid or expired
   - Client credentials mismatch
   - Tenant configuration issues

## Solution Implemented

### 1. Enhanced Error Detection
We've improved error handling in `convex/oauth/graphClient.ts` to:
- Detect 403 Access Denied errors
- Detect 401 Unauthorized errors
- Automatically update connection status to "error" or "expired"
- Provide clear, actionable error messages to users

### 2. Improved Token Refresh Logic
Enhanced `convex/oauth/microsoft.ts` to:
- Parse OAuth error responses properly
- Handle common error codes:
  - `invalid_grant` - Authorization expired/revoked
  - `interaction_required` - Additional auth needed
  - `consent_required` - Permission consent needed
- Update connection status with user-friendly error messages

### 3. User Interface Updates
Modified `src/components/window-content/settings-window/integrations-tab.tsx` to:
- Show error warning banner when connection has issues
- Display the specific error message to the user
- Provide a "Reconnect Account" button for easy re-authorization
- Disable sync functionality when connection is in error state

## User Experience Flow

### When Error Occurs:
1. **Detection**: System detects 403/401 error during email sync or API call
2. **Status Update**: Connection status automatically updates to "error"
3. **User Notification**: Error message displays in Settings > Integrations
4. **Visual Indicator**: Red warning banner appears with ⚠️ icon
5. **Action Available**: "Reconnect Account" button prominently displayed

### User Resolution:
1. Navigate to Settings > Integrations
2. See error warning: "Your Microsoft account authorization has expired or been revoked"
3. Click "Reconnect Account" button
4. Complete OAuth flow again
5. Connection restored with fresh tokens

## Common Error Messages

### For Users:
- **403 Access Denied**: "Microsoft access denied. Your account permissions may have been revoked or expired. Please disconnect and reconnect your Microsoft account in Settings > Integrations."
- **401 Unauthorized**: "Microsoft authentication expired. Please reconnect your Microsoft account in Settings > Integrations."
- **Token Refresh - invalid_grant**: "Your Microsoft account authorization has expired or been revoked. Please reconnect your account."
- **Token Refresh - interaction_required**: "Additional authentication is required. Please reconnect your Microsoft account."
- **Token Refresh - consent_required**: "Permission consent is required. Please reconnect your Microsoft account."

## Prevention Strategies

### For Users:
1. **Regular Use**: Use the email sync feature regularly (at least monthly) to keep tokens active
2. **Stable Passwords**: Avoid frequent Microsoft password changes if possible
3. **Permission Awareness**: Don't manually revoke app permissions unless disconnecting
4. **Monitor Status**: Check Settings > Integrations occasionally for connection health

### For Developers:
1. **Proactive Refresh**: Consider implementing periodic token refresh (before 90-day expiry)
2. **Health Checks**: Add scheduled connection health validation
3. **User Notifications**: Email users before tokens are close to expiring
4. **Graceful Degradation**: Disable features gracefully when connection fails

## Testing the Fix

### Simulate 403 Error:
1. Manually revoke app permissions in Microsoft account settings
2. Attempt to sync emails
3. Verify error banner appears
4. Click "Reconnect Account"
5. Verify flow completes successfully

### Verify Error Handling:
```bash
# Check Convex logs for proper error handling
# Look for: "Connection status updated to error"
# Look for: User-friendly error messages in UI
```

## Related Files

- `/convex/oauth/graphClient.ts` - Graph API request handling
- `/convex/oauth/microsoft.ts` - Token refresh logic
- `/src/components/window-content/settings-window/integrations-tab.tsx` - UI error display
- `/convex/schemas/coreSchemas.ts` - OAuth connection schema

## Future Improvements

1. **Proactive Token Refresh**: Schedule token refresh before expiry
2. **Email Notifications**: Notify users when connection issues occur
3. **Health Dashboard**: Show connection health metrics
4. **Auto-Reconnect**: Attempt automatic re-authorization with saved credentials (if secure)
5. **Retry Logic**: Implement exponential backoff for temporary API failures

## Support Resources

- [Microsoft Graph API Error Codes](https://docs.microsoft.com/en-us/graph/errors)
- [OAuth 2.0 Token Refresh](https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-auth-code-flow)
- [Microsoft Entra ID Conditional Access](https://docs.microsoft.com/en-us/azure/active-directory/conditional-access/)
