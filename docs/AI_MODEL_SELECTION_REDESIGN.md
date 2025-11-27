# AI Model Selection Redesign

## Problem with Current Design

**Current (Wrong)**:
- AI Settings: Pick ONE default model
- Chat: Uses that one model for all conversations
- Users can't choose different models for different tasks

**Why this is bad**:
- Claude 3.5 Sonnet is great for coding but expensive
- GPT-4 is good for general tasks
- Claude 3 Haiku is cheap for simple queries
- Users should pick the RIGHT tool for each job!

## New Design (Correct)

### AI Settings (Admin/Owner)
**Purpose**: Configure which models are AVAILABLE to users

```
☑ Claude 3.5 Sonnet ($9/1M) - Enable for organization
☑ Claude 3 Opus ($15/1M) - Enable for organization
☐ GPT-4 Turbo ($30/1M) - Disabled (too expensive)
☑ GPT-4 ($15/1M) - Enable for organization
☑ Claude 3 Haiku ($0.50/1M) - Enable for cheap tasks
☐ Gemini Pro ($7/1M) - Disabled (we don't want Google)
```

**Controls**:
- Checkboxes to enable/disable each model
- Set ONE as "default" (pre-selected in chat)
- Shows pricing so admin can make informed choices
- Can disable expensive models to control costs

### Chat Interface (User)
**Purpose**: Choose which model to use for THIS conversation

```
Model: [Claude 3.5 Sonnet ▼]
       │
       ├─ Claude 3.5 Sonnet (Default) ⭐
       ├─ Claude 3 Opus
       ├─ GPT-4
       └─ Claude 3 Haiku
```

**Features**:
- Dropdown shows only ENABLED models
- Default model is pre-selected
- User can change per-conversation
- Shows pricing hint next to each model
- Can switch mid-conversation

## Schema Changes

### Current Schema (organizationAiSettings)

```typescript
llm: v.object({
  provider: v.string(),      // "anthropic"
  model: v.string(),          // "claude-3-5-sonnet"  ← SINGLE MODEL
  temperature: v.number(),
  maxTokens: v.number(),
  openrouterApiKey: v.optional(v.string()),
}),
```

### New Schema (organizationAiSettings)

```typescript
llm: v.object({
  // REMOVED: provider (no longer needed, models include provider)
  // REMOVED: model (replaced with enabledModels array)

  enabledModels: v.array(v.object({
    modelId: v.string(),           // "anthropic/claude-3-5-sonnet"
    isDefault: v.boolean(),         // true for default model
    customLabel: v.optional(v.string()),  // Optional nickname
    enabledAt: v.number(),          // When this was enabled
  })),

  defaultModelId: v.string(),      // "anthropic/claude-3-5-sonnet"

  // Keep these (apply to all models)
  temperature: v.number(),
  maxTokens: v.number(),
  openrouterApiKey: v.optional(v.string()),
}),
```

### Conversation Schema (aiConversations)

```typescript
// ADD: Track which model was used for this conversation
export const aiConversations = defineTable({
  organizationId: v.id("organizations"),
  userId: v.id("users"),

  title: v.optional(v.string()),
  status: v.union(v.literal("active"), v.literal("archived")),

  // NEW FIELDS:
  modelId: v.string(),              // "anthropic/claude-3-5-sonnet"
  modelName: v.string(),            // "Claude 3.5 Sonnet" (for display)

  createdAt: v.number(),
  updatedAt: v.number(),
})
```

### Message Schema (aiMessages)

```typescript
// ADD: Track which model generated each message
export const aiMessages = defineTable({
  conversationId: v.id("aiConversations"),

  role: v.union(v.literal("system"), v.literal("user"), v.literal("assistant"), v.literal("tool")),
  content: v.string(),

  // NEW FIELD:
  modelId: v.optional(v.string()),  // Only for assistant messages

  toolCalls: v.optional(v.array(...)),
  timestamp: v.number(),
})
```

## UI Implementation

### AI Settings Tab

```tsx
export function AISettingsTab() {
  const availableModels = useQuery(api.ai.modelDiscovery.getModelsByProvider, {});
  const settings = useQuery(api.ai.settings.getAISettings, { organizationId });

  const [enabledModels, setEnabledModels] = useState<string[]>([]);
  const [defaultModelId, setDefaultModelId] = useState<string>("");

  return (
    <div>
      <h3>Available Models</h3>
      <p>Select which models your users can choose from</p>

      {/* Group by provider */}
      <div className="space-y-4">
        <ModelProviderSection
          provider="Anthropic"
          models={availableModels.anthropic}
          enabledModels={enabledModels}
          defaultModelId={defaultModelId}
          onToggle={(modelId) => toggleModel(modelId)}
          onSetDefault={(modelId) => setDefaultModelId(modelId)}
        />

        <ModelProviderSection
          provider="OpenAI"
          models={availableModels.openai}
          enabledModels={enabledModels}
          defaultModelId={defaultModelId}
          onToggle={(modelId) => toggleModel(modelId)}
          onSetDefault={(modelId) => setDefaultModelId(modelId)}
        />
      </div>

      <button onClick={handleSave}>Save Configuration</button>
    </div>
  );
}
```

### Model Provider Section Component

```tsx
function ModelProviderSection({
  provider,
  models,
  enabledModels,
  defaultModelId,
  onToggle,
  onSetDefault
}) {
  return (
    <div className="border p-4">
      <h4>{provider} Models</h4>

      <div className="space-y-2">
        {models.map((model) => {
          const isEnabled = enabledModels.includes(model.id);
          const isDefault = defaultModelId === model.id;

          // Calculate pricing
          const promptCost = parseFloat(model.pricing.prompt) * 1000000;
          const completionCost = parseFloat(model.pricing.completion) * 1000000;
          const avgCost = (promptCost + completionCost) / 2;

          return (
            <div key={model.id} className="flex items-center gap-3">
              {/* Enable/Disable Checkbox */}
              <input
                type="checkbox"
                checked={isEnabled}
                onChange={() => onToggle(model.id)}
              />

              {/* Model Info */}
              <div className="flex-1">
                <div className="font-bold">
                  {model.name}
                  {isDefault && <span className="ml-2">⭐ Default</span>}
                </div>
                <div className="text-xs text-gray-600">
                  ${avgCost.toFixed(2)}/1M tokens ·
                  {(model.context_length / 1000).toFixed(0)}k context
                </div>
              </div>

              {/* Set as Default Button */}
              {isEnabled && !isDefault && (
                <button
                  onClick={() => onSetDefault(model.id)}
                  className="text-xs"
                >
                  Set as Default
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

### Chat Interface (Model Picker)

```tsx
export function ChatWindow() {
  const settings = useQuery(api.ai.settings.getAISettings, { organizationId });
  const [selectedModelId, setSelectedModelId] = useState(settings?.llm.defaultModelId);

  // Only show enabled models
  const enabledModels = settings?.llm.enabledModels || [];

  return (
    <div className="chat-window">
      {/* Model Selector */}
      <div className="mb-4">
        <label>Model:</label>
        <select
          value={selectedModelId}
          onChange={(e) => setSelectedModelId(e.target.value)}
        >
          {enabledModels.map((model) => (
            <option key={model.modelId} value={model.modelId}>
              {model.customLabel || getModelName(model.modelId)}
              {model.isDefault && " (Default)"}
            </option>
          ))}
        </select>
      </div>

      {/* Chat Messages */}
      <ChatMessages conversationId={conversationId} />

      {/* Input */}
      <ChatInput
        onSend={(message) => sendMessage(message, selectedModelId)}
      />
    </div>
  );
}
```

## Backend Changes

### AI Settings Mutations

```typescript
// convex/ai/settings.ts

export const upsertAISettings = mutation({
  args: {
    organizationId: v.id("organizations"),
    enabled: v.boolean(),
    llm: v.object({
      enabledModels: v.array(v.object({
        modelId: v.string(),
        isDefault: v.boolean(),
        customLabel: v.optional(v.string()),
        enabledAt: v.number(),
      })),
      defaultModelId: v.string(),
      temperature: v.number(),
      maxTokens: v.number(),
      openrouterApiKey: v.optional(v.string()),
    }),
    embedding: v.object({...}),
    monthlyBudgetUsd: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Validation: Ensure default model is in enabled list
    const defaultModelEnabled = args.llm.enabledModels.some(
      m => m.modelId === args.llm.defaultModelId && m.isDefault
    );

    if (!defaultModelEnabled) {
      throw new Error("Default model must be enabled");
    }

    // Validation: Only one model can be default
    const defaultCount = args.llm.enabledModels.filter(m => m.isDefault).length;
    if (defaultCount !== 1) {
      throw new Error("Exactly one model must be set as default");
    }

    // Save settings...
  }
});
```

### Chat Mutations

```typescript
// convex/ai/chat.ts

export const sendMessage = mutation({
  args: {
    conversationId: v.id("aiConversations"),
    message: v.string(),
    modelId: v.string(),  // NEW: User-selected model
  },
  handler: async (ctx, args) => {
    // Validate model is enabled for this organization
    const settings = await ctx.db
      .query("organizationAiSettings")
      .withIndex("by_organization", q => q.eq("organizationId", conversation.organizationId))
      .first();

    const modelEnabled = settings?.llm.enabledModels.some(
      m => m.modelId === args.modelId
    );

    if (!modelEnabled) {
      throw new Error(`Model ${args.modelId} is not enabled for this organization`);
    }

    // Update conversation's model if it changed
    await ctx.db.patch(args.conversationId, {
      modelId: args.modelId,
      modelName: getModelName(args.modelId),
    });

    // Call OpenRouter with selected model...
    const response = await callOpenRouter({
      model: args.modelId,  // Use user-selected model
      messages: [...],
    });

    // Save assistant message with model info
    await ctx.db.insert("aiMessages", {
      conversationId: args.conversationId,
      role: "assistant",
      content: response.content,
      modelId: args.modelId,  // Track which model generated this
      timestamp: Date.now(),
    });
  }
});
```

## Migration Strategy

### Step 1: Update Schema (Backward Compatible)

```typescript
// Add new fields while keeping old ones temporarily
llm: v.object({
  // OLD (keep for backward compatibility)
  provider: v.optional(v.string()),
  model: v.optional(v.string()),

  // NEW
  enabledModels: v.optional(v.array(v.object({
    modelId: v.string(),
    isDefault: v.boolean(),
    customLabel: v.optional(v.string()),
    enabledAt: v.number(),
  }))),
  defaultModelId: v.optional(v.string()),

  // SHARED
  temperature: v.number(),
  maxTokens: v.number(),
  openrouterApiKey: v.optional(v.string()),
}),
```

### Step 2: Data Migration

```typescript
// convex/migrations/migrateToMultiModelSelection.ts

export const migrate = internalMutation({
  handler: async (ctx) => {
    const allSettings = await ctx.db.query("organizationAiSettings").collect();

    for (const setting of allSettings) {
      if (setting.llm.enabledModels) {
        // Already migrated
        continue;
      }

      // Convert single model to array format
      const oldModel = setting.llm.model || "anthropic/claude-3-5-sonnet";

      await ctx.db.patch(setting._id, {
        llm: {
          ...setting.llm,
          enabledModels: [
            {
              modelId: oldModel,
              isDefault: true,
              enabledAt: Date.now(),
            }
          ],
          defaultModelId: oldModel,
        },
      });

      console.log(`Migrated ${setting.organizationId}: ${oldModel} → multi-select`);
    }

    console.log(`✅ Migrated ${allSettings.length} organizations to multi-model selection`);
  }
});
```

### Step 3: Update UI

1. Deploy backend changes (backward compatible)
2. Run migration script
3. Deploy new UI (multi-select)
4. Remove old UI code after testing

### Step 4: Cleanup (After Migration)

```typescript
// Remove old fields after all orgs migrated
llm: v.object({
  // REMOVED: provider
  // REMOVED: model

  enabledModels: v.array(v.object({
    modelId: v.string(),
    isDefault: v.boolean(),
    customLabel: v.optional(v.string()),
    enabledAt: v.number(),
  })),
  defaultModelId: v.string(),

  temperature: v.number(),
  maxTokens: v.number(),
  openrouterApiKey: v.optional(v.string()),
}),
```

## Benefits

### For Administrators

1. **Cost Control**: Disable expensive models
2. **Quality Control**: Only enable models that meet standards
3. **Flexibility**: Different models for different use cases
4. **Visibility**: See what models users are choosing

### For Users

1. **Choice**: Pick best model for each task
2. **Optimization**: Use cheap models for simple tasks
3. **Experimentation**: Try different models
4. **Transparency**: See which model generated each response

### For Platform

1. **Revenue**: Can charge different rates per model
2. **Usage Tracking**: Know which models are popular
3. **Scaling**: Easy to add new models
4. **Compliance**: Can restrict models per region

## Future Enhancements

### 1. Model Recommendations

```typescript
// Suggest model based on task
function recommendModel(task: string): string {
  if (task.includes("code")) return "anthropic/claude-3-5-sonnet";
  if (task.includes("cheap") || task.includes("simple")) return "anthropic/claude-3-haiku";
  if (task.includes("creative")) return "anthropic/claude-3-opus";
  return defaultModelId;
}
```

### 2. Auto-Switch Based on Context

```typescript
// Automatically switch to larger context model if needed
if (conversationTokens > 100000) {
  // Switch from Claude 3.5 Sonnet (200k) to Gemini Pro (1M)
  suggestModelSwitch("google/gemini-pro-1.5");
}
```

### 3. Cost-Based Routing

```typescript
// Use cheaper model if budget is low
if (monthlySpend > monthlyBudget * 0.9) {
  // Force use of cheapest enabled model
  forceModelSelection("anthropic/claude-3-haiku");
}
```

### 4. Model Presets

```typescript
// Pre-defined configurations for common use cases
const presets = {
  coding: ["anthropic/claude-3-5-sonnet", "openai/gpt-4"],
  writing: ["anthropic/claude-3-opus", "openai/gpt-4"],
  analysis: ["openai/gpt-4", "google/gemini-pro"],
  cheap: ["anthropic/claude-3-haiku", "openai/gpt-3.5-turbo"],
};
```

## Summary

**Key Changes**:
1. ✅ AI Settings: Enable/disable multiple models (not just one)
2. ✅ Chat Interface: User picks model per-conversation
3. ✅ Track which model generated each message
4. ✅ Set one default model (pre-selected)
5. ✅ Show pricing to help users make informed choices

**Migration Path**:
1. Add new schema fields (backward compatible)
2. Run data migration
3. Deploy new UI
4. Remove old fields after testing

**Files to Update**:
- `convex/schemas/aiSchemas.ts` - Update schema
- `convex/ai/settings.ts` - Update mutations
- `convex/ai/chat.ts` - Accept modelId parameter
- `src/components/.../ai-settings-tab-v2.tsx` - Multi-select UI
- `src/components/chat-window.tsx` - Model picker dropdown

This is a much better design that gives users flexibility while maintaining administrative control!
