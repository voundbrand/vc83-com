# System Defaults - Auto-Selection Behavior

## Overview

When a super admin marks AI models as **"System Defaults"** in the Platform AI Models tab, these models automatically appear as **pre-selected and enabled** in all organization AI Settings, just as if the user manually checked them.

---

## How It Works

### 1. Super Admin Marks System Defaults

**Location:** Super Admin → Platform AI Models tab

**Action:**
1. Super admin enables a model platform-wide (click "Enabled" button)
2. Super admin clicks **"★ Set as Default"** button
3. Model is now marked as `isSystemDefault: true` in database

**Visual Indicator:**
- ⭐ Star icon fills with yellow
- Button text changes to **"★ System Default"**

**Example System Defaults:**
```
✓ anthropic/claude-3.5-sonnet      [★ System Default]
✓ openai/gpt-4o                    [★ System Default]
✓ google/gemini-pro-1.5            [★ System Default]
✓ meta-llama/llama-3.1-70b         [★ System Default]
```

---

### 2. Organization Opens AI Settings

**Location:** Org Owner Manage → AI Settings tab

**What Users See:**

#### **Scenario A: New Organization (No Settings Yet)**

When a new organization first opens AI Settings:

```
✅ Enable AI Features   [Checkbox: CHECKED automatically]

Privacy Tier:
  ⚪ Standard Tier (€49/month)
  ⚪ Privacy-Enhanced Tier (€49/month)

Enabled Models:
  ☑️ Claude 3.5 Sonnet        [CHECKED] [Blue highlight] [DEFAULT badge]
  ☑️ GPT-4o                   [CHECKED] [Blue highlight]
  ☑️ Gemini Pro 1.5           [CHECKED] [Blue highlight]
  ☑️ Llama 3.1 70B            [CHECKED] [Blue highlight]
  ☐ Other models...
```

**Behavior:**
- ✅ All system defaults are **pre-checked**
- ✅ First system default has **"DEFAULT"** badge (the active default)
- ✅ Blue highlight background on all checked models
- ✅ "Enable AI Features" is auto-enabled
- ✅ User can uncheck any model they don't want
- ✅ User can check additional models beyond system defaults

#### **Scenario B: Existing Organization (Settings Already Saved)**

When an organization already has AI settings saved:

```
Enabled Models:
  ☑️ Claude 3.5 Sonnet        [CHECKED] [Blue highlight] [DEFAULT badge]
  ☑️ GPT-4o                   [CHECKED] [Blue highlight]
  ☐ Other models...
```

**Behavior:**
- ✅ Previously saved models remain checked
- ✅ System defaults are **not** automatically added (user's choice preserved)
- ✅ User can manually add system defaults if desired

---

### 3. Backend Auto-Population

**When:** User clicks "Save Settings" with no models selected

**What Happens:**

```typescript
// convex/ai/settings.ts (lines 78-100)

if (no models enabled) {
  // Query all models marked as system defaults
  systemDefaults = db.query("aiModels")
    .where("isSystemDefault", true)
    .collect()

  // Auto-enable them
  enabledModels = systemDefaults.map((model, index) => ({
    modelId: model.modelId,
    isDefault: index === 0,  // First one is THE default
    enabledAt: Date.now()
  }))

  // Save to database
  save(enabledModels)
}
```

**Result:**
- System defaults are saved to the organization's AI settings
- First system default becomes the active default model
- User doesn't have to manually select anything

---

## Visual States

### Model Card States

#### **System Default (Checked)**
```
┌────────────────────────────────────────┐
│ ☑️ Claude 3.5 Sonnet                   │ ← Checkbox: CHECKED
│                                        │
│ 🇺🇸 200K context. Tool calling.       │
│                                        │
│ [DEFAULT]  [Set as Default]           │ ← "DEFAULT" badge
└────────────────────────────────────────┘
   ↑ Blue highlight background
```

#### **System Default (Not Default)**
```
┌────────────────────────────────────────┐
│ ☑️ GPT-4o                              │ ← Checkbox: CHECKED
│                                        │
│ 🇺🇸 128K context. Tool calling.       │
│                                        │
│ [Set as Default]                       │ ← Button to make it default
└────────────────────────────────────────┘
   ↑ Blue highlight background
```

#### **Recommended (System Default, Not Yet Checked by User)**

**Note:** This state ONLY appears in the UI before the user saves for the first time. Once saved, system defaults are auto-checked.

```
┌────────────────────────────────────────┐
│ ☐ Claude 3.5 Sonnet                   │ ← Checkbox: UNCHECKED
│                                        │
│ 🇺🇸 200K context. Tool calling.       │
│ [RECOMMENDED]                          │ ← "RECOMMENDED" badge
└────────────────────────────────────────┘
```

**Why this happens:**
- The UI hasn't loaded platform models yet
- Or the user manually unchecked the system defaults
- This is temporary - system defaults will be auto-checked on first load

#### **Regular Model (Not System Default)**
```
┌────────────────────────────────────────┐
│ ☐ Mistral Large                       │ ← Checkbox: UNCHECKED
│                                        │
│ 🇪🇺 128K context. Tool calling.       │
│                                        │
│ [Set as Default]                       │
└────────────────────────────────────────┘
```

---

## User Flow Examples

### Example 1: New Organization First Setup

**Step 1:** User creates new organization
- No AI settings exist yet

**Step 2:** User opens "AI Settings" tab
- Super admin has marked 4 models as system defaults
- UI automatically shows those 4 models as checked
- First model (Claude 3.5 Sonnet) has "DEFAULT" badge
- "Enable AI Features" is auto-enabled

**Step 3:** User reviews and adjusts
- User unchecks "Llama 3.1 70B" (doesn't want open source)
- User checks "Mistral Large" (wants EU model)
- 3 system defaults + 1 custom model = 4 total

**Step 4:** User clicks "Save Settings"
- Backend saves: Claude 3.5 Sonnet (default), GPT-4o, Gemini Pro 1.5, Mistral Large
- Settings saved successfully

**Step 5:** User returns later
- All 4 models still checked (user's choices preserved)
- Claude 3.5 Sonnet still has "DEFAULT" badge

---

### Example 2: Super Admin Changes System Defaults

**Initial State:**
- Super admin has 4 system defaults: Claude, GPT-4o, Gemini, Llama
- Organization A has settings saved with those 4 models

**Super Admin Action:**
- Super admin decides Llama is unreliable
- Super admin REMOVES "★ System Default" from Llama (clicks star button)
- Llama is now just a regular platform-enabled model

**Impact on Existing Organizations:**
- **Organization A:** Still has Llama enabled (their choice preserved)
  - System defaults DON'T retroactively change existing settings
  - Org A needs to manually uncheck Llama if they want to remove it

- **New Organization B:** Opens AI Settings for first time
  - Only sees 3 system defaults: Claude, GPT-4o, Gemini
  - Llama appears as a regular model (unchecked)
  - New orgs don't get the removed default

---

### Example 3: User Wants to Reset to System Defaults

**Scenario:** User has customized their model selection but wants to reset to system defaults

**Current:**
- User has 8 models enabled (mix of system defaults and custom)
- User is confused about which to use

**Reset Process:**
1. User unchecks ALL models
2. User clicks "Save Settings"
3. Backend detects no models enabled
4. Backend auto-populates system defaults
5. User sees system defaults appear as checked

**Alternative:**
- We could add a "Reset to Defaults" button in the UI
- This would be a future enhancement

---

## Technical Implementation

### Database Schema

**aiModels Table:**
```typescript
{
  modelId: "anthropic/claude-3.5-sonnet",
  name: "Claude 3.5 Sonnet",
  isPlatformEnabled: true,      // Enabled platform-wide
  isSystemDefault: true,         // ⭐ Marked as system default
}
```

**organizationAiSettings Table:**
```typescript
{
  organizationId: "org_123",
  llm: {
    enabledModels: [
      {
        modelId: "anthropic/claude-3.5-sonnet",
        isDefault: true,          // THE default model for this org
        enabledAt: 1733212800000
      },
      {
        modelId: "openai/gpt-4o",
        isDefault: false,         // Available but not default
        enabledAt: 1733212800000
      }
    ],
    defaultModelId: "anthropic/claude-3.5-sonnet"
  }
}
```

### Code Locations

**Backend Auto-Population:**
- File: `convex/ai/settings.ts`
- Lines: 78-100
- Function: `upsertAISettings` mutation

**UI Auto-Selection:**
- File: `src/components/window-content/org-owner-manage-window/ai-settings-tab-v3.tsx`
- Lines: 96-110
- Hook: `useEffect` for settings initialization

**Platform Models Query:**
- File: `convex/ai/platformModels.ts`
- Function: `getEnabledModels` query
- Returns: All platform-enabled models with `isSystemDefault` flag

---

## Badge Meanings

### "RECOMMENDED" Badge (Green)
- Model is marked as system default by super admin
- Appears on system default models that are NOT yet checked by the user
- Suggests the model is a good choice
- User can ignore this and choose their own models

### "DEFAULT" Badge (Purple)
- This is THE active default model for the organization
- Only ONE model can have this badge at a time
- This model is used when the user doesn't explicitly select a model
- Appears on the checked model marked as `isDefault: true`

### No Badge
- Regular model, not a system default
- User can still enable it if they want

---

## FAQ

### Q: What if a super admin marks 20 models as system defaults?

**A:** All 20 will be auto-checked for new organizations. This could be overwhelming for users. Recommendation: Keep system defaults to 3-5 models maximum.

### Q: Can a user disable all system defaults and use their own models?

**A:** Yes! System defaults are just suggestions. Users have full control to:
- Uncheck all system defaults
- Check only the models they want
- Mix system defaults with custom models

### Q: What if a system default model becomes unavailable?

**A:**
- Super admin should remove it from system defaults
- Existing organizations keep the model in their settings (won't auto-remove)
- New organizations won't see it in system defaults
- The model should be disabled platform-wide if it's truly broken

### Q: Can different tiers have different system defaults?

**A:** Currently, no. System defaults apply to all tiers. However:
- Privacy-Enhanced tier auto-filters to only show EU/ZDR models
- So system defaults appear differently based on tier restrictions
- Future enhancement: Tier-specific system defaults

### Q: Do system defaults cost money?

**A:** No. System defaults are just pre-selections. Organizations still need:
- An active AI subscription (€49/month)
- Sufficient token credits
- System defaults don't incur extra charges

---

## Best Practices for Super Admins

### Choosing System Defaults

**Criteria:**
1. ✅ **Validated** - All 5 tests passed
2. ✅ **Reliable** - Consistent performance
3. ✅ **Fast** - Response time < 3 seconds
4. ✅ **Cost-Effective** - $1-5 per million tokens
5. ✅ **Popular** - Well-known provider (Anthropic, OpenAI, Google)

**Recommended Count:**
- **Minimum:** 2 models (backup option if one fails)
- **Sweet Spot:** 3-4 models (variety without overwhelming users)
- **Maximum:** 5 models (more than this gets confusing)

### Updating System Defaults

**When to Add:**
- New model passes all validation tests
- Model is significantly better than existing defaults
- User feedback suggests a model should be default

**When to Remove:**
- Model starts failing validation tests
- Model pricing increases significantly (>$10/M tokens)
- Model provider becomes unreliable
- Better alternatives become available

**Communication:**
- Announce system default changes in release notes
- Email existing customers about major changes
- Provide migration guide if removing popular default

---

## Troubleshooting

### Issue: System Defaults Not Appearing as Checked

**Symptoms:**
- User opens AI Settings
- System defaults show "RECOMMENDED" badge but are unchecked

**Possible Causes:**
1. Organization already has saved settings (system defaults don't override)
2. Platform models not loaded yet (wait for loading to complete)
3. Browser cache issue (hard refresh with Cmd+Shift+R)

**Solutions:**
1. Check database: Does this org have `organizationAiSettings` record?
   - Yes → Settings exist, system defaults won't override
   - No → Should auto-populate on first load
2. Verify platform models loaded: `platformModels` query successful?
3. Clear browser cache and reload

### Issue: Wrong Model Marked as DEFAULT

**Symptoms:**
- Multiple models have "DEFAULT" badge, or
- Non-system-default has "DEFAULT" badge

**Possible Causes:**
1. Data inconsistency: Multiple `isDefault: true` in `enabledModels`
2. UI state desync

**Solutions:**
1. Check database: `organizationAiSettings.llm.enabledModels`
   - Should have EXACTLY one `isDefault: true`
2. Backend validation enforces this (mutation will reject multiple defaults)
3. Re-save settings to fix inconsistency

### Issue: System Default Changes Not Reflected

**Symptoms:**
- Super admin adds new system default
- New organizations still don't see it

**Possible Causes:**
1. Model not platform-enabled (must enable first, then set as default)
2. Browser cache showing old data
3. Query not refetching after mutation

**Solutions:**
1. Verify: Model has both `isPlatformEnabled: true` AND `isSystemDefault: true`
2. Hard refresh browser (Cmd+Shift+R)
3. Check Convex dashboard: Mutation succeeded?

---

## Future Enhancements

### Planned Features

1. **"Reset to Defaults" Button**
   - One-click restore system defaults
   - Confirms before overwriting user's selection

2. **Tier-Specific Defaults**
   - Standard tier: General-purpose models
   - Privacy-Enhanced tier: EU/ZDR models only
   - Private LLM tier: Self-hosted models

3. **Model Recommendations**
   - AI suggests models based on user's use case
   - "Most used by similar organizations"
   - "Best for your industry"

4. **Default Model Rotation**
   - Super admin sets multiple defaults
   - System rotates default based on load balancing
   - Fallback to next default if primary fails

5. **System Default History**
   - Track changes over time
   - "Previous defaults" section
   - Audit trail of who changed what

---

## Related Documentation

- [AI Model Validation Strategy](./AI_MODEL_VALIDATION_STRATEGY.md)
- [Platform AI Model Management](./PLATFORM_AI_MODEL_MANAGEMENT.md)
- [Organization AI Settings](./ORGANIZATION_AI_SETTINGS.md)
- [RBAC & Permissions](./RBAC_GUIDE.md)
