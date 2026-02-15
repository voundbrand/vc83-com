# Beta Access Window Implementation

## Summary
Replaced the full-screen beta access blocker with a proper Window component that matches the LoginWindow styling and integrates seamlessly with the window system.

## What Was Created

### 1. New Component: `BetaAccessRequestWindow`
**Location:** `/src/components/window-content/beta-access-request-window/index.tsx`

**Features:**
- Matches LoginWindow styling (retro-bg, retro-button, retro-input classes)
- Centered layout within the window
- Shows different UI based on status:
  - `none`: Request form
  - `pending`: Status message with request date
  - `rejected`: Rejection message with reason + option to request again
- Form fields:
  - First Name & Last Name
  - Email (read-only for logged-in users, editable for non-logged-in)
  - Why do you want beta access? (textarea)
  - How do you plan to use l4yercak3? (textarea)
  - How did you hear about us? (text input)
- Success state with auto-refresh after submission
- Error handling with retro-error styling

### 2. Integration in `page.tsx`

**Changes:**
1. **Import updated:** Changed from `BetaAccessBlockedScreen` to `BetaAccessRequestWindow`

2. **New function added:**
```typescript
const openBetaAccessWindow = () => {
  // Centers the window on screen
  // Opens with beta access props
}
```

3. **Full-screen blocker replaced with automatic window opening:**
```typescript
useEffect(() => {
  if (betaStatus && !betaStatus.hasAccess && !isWindowOpen("beta-access")) {
    openBetaAccessWindow();
  }
}, [betaStatus]);
```

### 3. Window Registry Integration

**Location:** `/src/hooks/window-registry.tsx`

**Added:**
- Lazy-loaded component import
- Registry entry for "beta-access" window with:
  - Title: "Beta Access Required"
  - Icon: 🔒
  - Size: 500x650
  - Centered position

## User Experience

### Before (Full-Screen Blocker)
- User sees full-screen overlay blocking entire app
- Cannot interact with any other UI elements
- Windows 95 style window manually rendered in component
- No integration with window manager

### After (Window Integration)
- Window opens automatically when beta access denied
- User can move/close the window
- Matches the visual style of other windows (LoginWindow)
- Integrated with window manager (can be minimized, restored, etc.)
- Persists in session storage like other windows

## Window Behavior

1. **Automatic Opening:** Window opens automatically when:
   - Beta gating is ON
   - User doesn't have beta access (status is none/pending/rejected)
   - Window is not already open

2. **Status Display:**
   - **None:** Shows welcome message + request button
   - **Pending:** Shows status with request date + email notification info
   - **Rejected:** Shows rejection reason + "Request Again" button

3. **Form Submission:**
   - Creates user + organization automatically for non-logged-in users
   - Updates beta request status
   - Auto-refreshes page after 2 seconds to show new status

## Testing Checklist

- [ ] Window opens automatically when beta access denied
- [ ] Window can be moved around the screen
- [ ] Window can be closed and reopened
- [ ] Form submits successfully
- [ ] Email field is read-only for logged-in users
- [ ] Email field is editable for non-logged-in users
- [ ] Success message shows after submission
- [ ] Page refreshes automatically after successful submission
- [ ] Pending status shows correctly after refresh
- [ ] Rejection status shows with reason (if admin rejects)
- [ ] "Request Again" button works after rejection

## Files Modified

1. ✅ `/src/components/window-content/beta-access-request-window/index.tsx` (NEW)
2. ✅ `/src/app/page.tsx` (MODIFIED)
3. ✅ `/src/hooks/window-registry.tsx` (MODIFIED)

## Files No Longer Used

- `/src/components/beta-access-blocked-screen.tsx` (can be deleted)

## Next Steps

1. **Test the implementation:**
   ```bash
   npm run dev
   ```

2. **Verify beta gating is ON in Convex:**
   - Check Super Admin → System Organizations → Beta Access tab
   - Ensure "Beta Gating" is enabled

3. **Test scenarios:**
   - Visit site when not logged in → Window should open
   - Submit beta request → Should see success message
   - Refresh page → Should see pending status
   - Admin approves/rejects → Status updates accordingly

4. **Optional cleanup:**
   - Delete old full-screen blocker component if no longer needed:
     ```bash
     rm /src/components/beta-access-blocked-screen.tsx
     ```
