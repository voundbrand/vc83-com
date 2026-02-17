# AI Model Validation & Testing Strategy

## Overview

This document outlines the comprehensive testing and validation strategy for AI models before enabling them platform-wide. The system ensures that only reliable, well-tested models are available to customers, preventing broken tool calling and poor user experiences.

---

## Table of Contents

1. [Problem Statement](#problem-statement)
2. [Solution Architecture](#solution-architecture)
3. [Testing Methodology](#testing-methodology)
4. [Validation Workflow](#validation-workflow)
5. [Release Gates & Thresholds](#release-gates--thresholds)
6. [CLI Testing Tool](#cli-testing-tool)
7. [UI Integration](#ui-integration)
8. [Audit Trail & Compliance](#audit-trail--compliance)
9. [Best Practices](#best-practices)
10. [Troubleshooting](#troubleshooting)

---

## Problem Statement

### The Challenge

We have 200+ AI models from OpenRouter API, automatically discovered via daily cron jobs. Each model claims to support "tool calling" (function execution), but:

- **Not all models work correctly** - Some fail to call tools at all
- **Parameter parsing varies** - Complex parameters may be misinterpreted
- **Context handling differs** - Multi-turn conversations may lose context
- **Edge cases** - Incomplete queries, ambiguous requests, etc.

### The Risk

Enabling an untested model platform-wide could:
- Break customer workflows (tools not called when needed)
- Cause data integrity issues (wrong parameters passed)
- Generate support tickets and customer frustration
- Damage platform reputation

### The Goal

**Validate tool calling reliability BEFORE enabling models platform-wide.**

---

## Solution Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Super Admin Workflow                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  1. Daily Cron: Fetch Models from OpenRouter                │
│     ├── Discover 200+ models                                │
│     ├── Store in aiModels table                             │
│     └── Mark new models (last 7 days)                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  2. Platform AI Models Tab (Super Admin UI)                 │
│     ├── View all discovered models                          │
│     ├── Filter by: Provider, Status, Capability, Tested     │
│     ├── See validation badges: ✓ Tested, ⚠ Not Tested      │
│     └── Enable/disable platform-wide                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  3. CLI Testing Tool (npm run test:model)                   │
│     ├── Run 5 validation tests per model                    │
│     ├── Save results to database                            │
│     └── Generate pass/fail report                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  4. Review Results & Enable                                  │
│     ├── Filter by "✓ Validated" in UI                       │
│     ├── Review test results                                  │
│     ├── Enable validated models only                         │
│     └── Mark system defaults (auto-selected for new orgs)   │
└─────────────────────────────────────────────────────────────┘
```

---

## Testing Methodology

### 6-Phase Validation Suite

Each model undergoes **6 critical tests** that simulate real-world usage:

#### **Test 1: Basic Chat Response** ⚡ (10-15 seconds)

**Purpose:** Verify the model responds to simple queries without errors.

**Test Case:**
```
Input: "Hello! Please respond with a simple greeting."
Expected: Non-empty response, no errors
```

**Pass Criteria:**
- ✅ Response length > 0
- ✅ No API errors
- ✅ Completes within timeout (30s)

**Failure Scenarios:**
- ❌ Empty response
- ❌ Network/API errors
- ❌ Timeout

---

#### **Test 2: Tool Calling** 🔧 (15-20 seconds)

**Purpose:** Verify the model calls the correct tool when prompted.

**Test Case:**
```
Input: "List my forms"
Expected Tool: list_forms
```

**Pass Criteria:**
- ✅ Tool called: `list_forms`
- ✅ Tool executed successfully
- ✅ Response includes tool results

**Failure Scenarios:**
- ❌ No tool called (responded with text only)
- ❌ Wrong tool called (e.g., `search_contacts` instead)
- ❌ Tool call failed with error

---

#### **Test 3: Complex Parameters** 🎯 (20-25 seconds)

**Purpose:** Verify parameter parsing accuracy for complex queries.

**Test Case:**
```
Input: "Search for contacts named Alice Smith in the sales department"
Expected Tool: search_contacts OR manage_crm (search action)
Expected Parameters: Search signal preserved (query/searchQuery/name fields)
```

**Pass Criteria:**
- ✅ Correct tool called
- ✅ Query/search signal extracted ("Alice Smith")
- ✅ Additional context parsed (department)

**Failure Scenarios:**
- ❌ Missing parameters (empty query)
- ❌ Incorrect parameter names
- ❌ Failed to parse multi-part query

---

#### **Test 4: Multi-Turn Context** 💬 (30-40 seconds)

**Purpose:** Verify conversation memory across multiple messages.

**Test Case:**
```
Turn 1: "List my forms"
Turn 2: "How many did you find?"
Expected: Model remembers previous tool call results
```

**Pass Criteria:**
- ✅ Responds to follow-up question
- ✅ References previous context
- ✅ No repeated tool calls

**Failure Scenarios:**
- ❌ Lost context ("I don't know what you're referring to")
- ❌ Called tool again unnecessarily
- ❌ Hallucinated response (made up numbers)

---

#### **Test 5: Edge Cases** 🛡️ (15-20 seconds)

**Purpose:** Verify graceful handling of incomplete/ambiguous queries.

**Test Case:**
```
Input: "Search for" (incomplete query)
Expected: Either ask for clarification OR handle gracefully
```

**Pass Criteria:**
- ✅ Asks for clarification, OR
- ✅ Handles gracefully without error

**Failure Scenarios:**
- ❌ Called tool with empty/null parameters
- ❌ Crashed with error
- ❌ Hallucinated response

---

#### **Test 6: Tool Contract Checks** 📘 (20-30 seconds)

**Purpose:** Verify tool calls satisfy versioned contract metadata for critical tools.

**Test Cases:**
```
Input: "List my forms"
Expected Tool: list_forms
Expected Contract: versioned metadata present, required fields satisfied

Input: "Search for contacts named Alice Smith in the sales department"
Expected Tool: search_contacts OR manage_crm
Expected Contract: versioned metadata present, required fields for the selected tool satisfied
```

**Pass Criteria:**
- ✅ Exactly 10 critical tool contracts are defined
- ✅ Called tool has contract metadata with semantic version
- ✅ Required contract fields are present in tool arguments

**Failure Scenarios:**
- ❌ Missing contract metadata for critical tool
- ❌ Invalid/empty contract version
- ❌ Required contract fields missing

---

### Test Execution

**Sequential Execution:**
- Tests run in order (1 → 2 → 3 → 4 → 5 → 6)
- Total time per model: ~110-150 seconds
- 2-second delay between models (rate limiting)

**Scoring:**
- Each test: Pass (true) or Fail (false)
- Overall status:
  - **"validated"** - All 6 tests passed
  - **"failed"** - Any test failed

---

## Validation Workflow

### For Super Admins

#### **Step 1: Identify Untested Models**

1. Open **Super Admin → Platform AI Models**
2. Click **Validation filter** → Select **"⚠ Not Tested"**
3. Review list of untested models with tool calling support

#### **Step 2: Run CLI Tests**

**Option A: Test Single Model**
```bash
npm run test:model -- --model="anthropic/claude-3.5-sonnet"
```

**Option B: Test All Models from Provider**
```bash
npm run test:model -- --provider="anthropic"
```

**Option C: Test All Untested Models**
```bash
npm run test:model -- --untested-only
```

#### **Step 3: Review Terminal Output**

```
================================================================
🔍 Validating Model: anthropic/claude-3.5-sonnet
================================================================

  🧪 Test 1: Basic Chat Response
     ✅ PASS: Got response (1,243ms)
     Response: Hello! I'm happy to help you today. How can I assist you?

  🧪 Test 2: Tool Calling
     ✅ PASS: Called list_forms tool (2,156ms)
     Tool status: success

  🧪 Test 3: Complex Parameters
     ✅ PASS: Parsed complex parameters (1,987ms)
     Arguments: {"query":"Alice Smith","department":"sales"}

  🧪 Test 4: Multi-turn Context
     ✅ PASS: Maintained context (3,421ms)
     Response: I found 12 forms in your organization.

  🧪 Test 5: Edge Cases
     ✅ PASS: Handled edge case gracefully (1,654ms)

  🧪 Test 6: Tool Contract Checks
     ✅ list_forms matched contract 1.0.0
     ✅ search_contacts matched contract 1.0.0
     ✅ PASS: Contract checks passed (2,004ms)

================================================================
📊 Summary: 6/6 tests passed
================================================================

💾 Saving validation results to database...
✅ Results saved successfully
```

#### **Step 4: Review UI Badges**

1. Refresh **Platform AI Models** tab
2. Look for validation badges:
   - **✓ Tested** (green) - All tests passed
   - **✗ Failed** (red) - Some tests failed
   - **⚠ Not Tested** (yellow) - Not yet tested

#### **Step 5: Enable Validated Models**

1. Filter by **"✓ Validated"**
2. Review pricing and capabilities
3. Click **"Enabled"** button to enable platform-wide
   - Explicitly acknowledge that operational telemetry review (fallback/tool-failure trends) was completed for this enablement.
4. Optionally: Click **"★ Set as Default"** for recommended starter models

---

## Release Gates & Thresholds

Model enablement must pass both validation and release-gate checks:

1. **Hard gate (single model run):**
   - `basicChat`, `toolCalling`, `complexParams`, `multiTurn`, `edgeCases`, and `contractChecks` must all pass.
   - Any failed check blocks enablement.
2. **Contract gate (critical tools):**
   - Critical tool contract set must include exactly 10 tools.
   - Tool calls used in validation must match a contract version and include required fields.
3. **Operational gate (manual until observability automation is complete):**
   - Review recent fallback and tool-failure telemetry before enabling model broadly.
   - If fallback/tool telemetry is unavailable, keep model disabled until manual review is completed.
   - Super-admin enable mutations require explicit `operationalReviewAcknowledged=true`; missing acknowledgement blocks enablement.
4. **Batch rollout threshold guidance:**
   - Only auto-promote models when last 20 runs show at least 95% overall pass rate and no contract-check failures.

These thresholds are release policy for super-admin enablement decisions and are intentionally stricter than basic smoke tests.

---

## CLI Testing Tool

### Installation & Setup

**1. Environment Variables**

Add to `.env.local`:
```bash
TEST_ORG_ID=<your-test-organization-id>
TEST_USER_ID=<your-super-admin-user-id>
TEST_SESSION_ID=<your-session-id>
```

**2. Verify Setup**
```bash
npm run test:model -- --model="anthropic/claude-3.5-sonnet"
```

### Usage Examples

#### **Single Model Test**
```bash
npm run test:model -- --model="anthropic/claude-3.5-sonnet"
```
- Tests one specific model
- Takes ~90-120 seconds
- Shows detailed pass/fail for each test

#### **Provider Batch Test**
```bash
npm run test:model -- --provider="anthropic"
```
- Tests all Anthropic models
- Runs sequentially with 2s delays
- Shows progress for each model

#### **Untested Models Only**
```bash
npm run test:model -- --untested-only
```
- Tests only models with `validationStatus: "not_tested"`
- Skips already validated models
- Useful for new models from daily cron

#### **Combined Filters**
```bash
npm run test:model -- --provider="openai" --untested-only
```
- Tests untested OpenAI models only

### Output Interpretation

**Success Indicators:**
- ✅ Green checkmarks for passed tests
- 6/6 tests passed
- Exit code: 0

**Failure Indicators:**
- ❌ Red X for failed tests
- Detailed error messages
- Exit code: 1

**Test Results Saved:**
- Stored in `aiModels.testResults`
- Includes timestamp, pass/fail per test
- Tracks who tested (`testedBy`)

---

## UI Integration

### Platform AI Models Tab

#### **Filters Available**

1. **Search** - Filter by model name or ID
2. **Provider** - Filter by provider (Anthropic, OpenAI, etc.)
3. **Status** - Filter by platform enabled/disabled
4. **Capability** - Filter by tool calling, multimodal, vision
5. **Defaults** - Filter by system defaults
6. **Validation** - Filter by tested/not tested/failed ✨

#### **Validation Filter Options**

- **All Status** - Show all models
- **✓ Validated** - Only validated models (all tests passed)
- **⚠ Not Tested** - Models not yet tested
- **✗ Failed** - Models that failed validation

#### **Model Cards Display**

Each model card shows:
- **Provider Badge** - Visual provider indicator
- **Model Name & ID** - Official model name
- **Capabilities** - Tool Calling, Multimodal, Vision badges
- **Validation Badge** ✨ - ✓ Tested, ⚠ Not Tested, or ✗ Failed
- **Pricing** - Input/output cost per million tokens
- **Context Length** - Maximum token window
- **Actions** - Enable/Disable, Set as Default

#### **Validation Badge Colors**

```css
✓ Tested       → Green (#10B981)   → All 6 tests passed
⚠ Not Tested   → Yellow (#F59E0B)  → Tool calling model, not yet tested
✗ Failed       → Red (#EF4444)     → Some tests failed
```

---

## Audit Trail & Compliance

### Database Schema

**aiModels Table:**
```typescript
{
  modelId: "anthropic/claude-3.5-sonnet",
  validationStatus: "validated" | "not_tested" | "failed",
  testResults: {
    basicChat: true,
    toolCalling: true,
    complexParams: true,
    multiTurn: true,
    edgeCases: true,
    contractChecks: true,
    timestamp: 1733212800000
  },
  testedBy: Id<"users">,  // Super admin who ran tests
  testedAt: 1733212800000,
  notes: "Validated via CLI test script on 2025-12-03T10:00:00Z"
}
```

### Audit Questions Answered

**Q: When was this model last tested?**
- `testedAt` timestamp

**Q: Who validated this model?**
- `testedBy` user ID (links to users table)

**Q: Which tests passed/failed?**
- `testResults` object (6 boolean fields)

**Q: Why did we enable this model?**
- If `validationStatus: "validated"` → All tests passed
- Audit log shows super admin who enabled it

**Q: Has this model been re-tested after updates?**
- Compare `testedAt` with `lastSeenAt` (from OpenRouter)
- Re-test if model updated by provider

---

## Best Practices

### Testing Frequency

**New Models:**
- Test BEFORE enabling platform-wide
- Mark as "⚠ Not Tested" until validated

**Existing Models:**
- Re-test after provider updates (check `lastSeenAt`)
- Re-test quarterly for high-usage models
- Re-test immediately if customer reports issues

### Model Selection Criteria

**Recommended for Platform Enablement:**
- ✅ All 6 tests passed
- ✅ Pricing reasonable (<$5/M tokens)
- ✅ Context length adequate (>50K tokens)
- ✅ Provider reliability (Anthropic, OpenAI, Google)

**Red Flags (Do Not Enable):**
- ❌ Failed tool calling test
- ❌ Failed parameter parsing test
- ❌ Failed tool contract checks
- ❌ Excessive cost (>$20/M tokens)
- ❌ Unknown provider with no track record

### System Defaults Strategy

**What to Mark as System Default:**
- ✅ High reliability (validated)
- ✅ Good performance (fast response)
- ✅ Moderate pricing ($1-5/M tokens)
- ✅ Popular providers (Anthropic, OpenAI)
- ✅ Strong tool calling support

**Current Recommended System Defaults:**
1. `anthropic/claude-3.5-sonnet` - Best overall
2. `openai/gpt-4o` - Reliable alternative
3. `google/gemini-pro-1.5` - Cost-effective
4. `meta-llama/llama-3.1-70b` - Open source option

---

## Troubleshooting

### Common Issues

#### **Issue: Tests Timing Out**

**Symptoms:**
- Tests fail with timeout errors
- Takes longer than 30s per test

**Solutions:**
1. Check OpenRouter API status
2. Verify network connectivity
3. Increase timeout in test script (if needed)
4. Test during off-peak hours

#### **Issue: Tool Not Called**

**Symptoms:**
- Test 2 fails: Model responds with text instead of calling tool

**Root Causes:**
- Model doesn't support tool calling (check OpenRouter docs)
- Model requires specific prompt format
- Model too small (< 7B parameters)

**Solutions:**
1. Verify model has `capabilities.toolCalling: true` in database
2. Check OpenRouter documentation for model limitations
3. Mark model as "failed" and do not enable

#### **Issue: Parameter Parsing Errors**

**Symptoms:**
- Test 3 fails: Tool called but parameters missing/wrong

**Root Causes:**
- Model has poor instruction following
- Parameter schema too complex
- Model trained on different format

**Solutions:**
1. Review tool definitions (check schema)
2. Simplify parameter names
3. Consider model not suitable for complex tools

#### **Issue: Context Loss**

**Symptoms:**
- Test 4 fails: Model doesn't remember previous messages

**Root Causes:**
- Model has short context window
- Conversation history not passed correctly
- Model architecture doesn't support multi-turn

**Solutions:**
1. Check `contextLength` - should be >50K tokens
2. Verify conversation history sent in API call
3. Mark model as "failed" if context loss is consistent

#### **Issue: CLI Authentication Errors**

**Symptoms:**
```
❌ Insufficient permissions. Super admin access required.
```

**Solutions:**
1. Verify `TEST_SESSION_ID` is valid and not expired
2. Verify `TEST_USER_ID` has super admin role
3. Generate new session ID via login

#### **Issue: Database Save Fails**

**Symptoms:**
- Tests pass but results not visible in UI

**Solutions:**
1. Check Convex logs for errors
2. Verify mutation `updateModelValidation` exists
3. Check network connectivity to Convex
4. Refresh UI (F5)

---

## Performance Metrics

### Expected Test Times

| Test Phase         | Average Duration | Timeout |
|--------------------|------------------|---------|
| Basic Chat         | 1-2 seconds      | 30s     |
| Tool Calling       | 2-3 seconds      | 30s     |
| Complex Parameters | 2-3 seconds      | 30s     |
| Multi-Turn         | 3-4 seconds      | 60s     |
| Edge Cases         | 1-2 seconds      | 30s     |
| **Total per Model**| **90-120s**      | -       |

### Batch Testing Performance

- **10 models**: ~15-20 minutes
- **50 models**: ~75-100 minutes
- **200 models**: ~6-8 hours

**Recommendation:** Run batch tests overnight or during low-traffic periods.

---

## Security Considerations

### API Key Protection

- Test organization's API keys stored encrypted in Convex
- Never log API keys in console output
- Use environment variables for sensitive data

### Rate Limiting

- 2-second delay between model tests
- Prevents overwhelming OpenRouter API
- Respects API rate limits

### Super Admin Access

- Only super admins can:
  - Run validation tests
  - Mark models as validated
  - Enable models platform-wide
- RBAC enforced in backend mutations

---

## Future Enhancements

### Planned Improvements

1. **Automated Testing**
   - Daily cron job auto-tests new models
   - Email notifications for failed validations
   - Automatic retry on transient failures

2. **Enhanced Test Coverage**
   - Vision capability tests (image analysis)
   - Multimodal tests (image + text)
   - Long context tests (>100K tokens)
   - Performance benchmarks (latency, cost)

3. **UI Enhancements**
   - View detailed test results in modal
   - Re-test button for individual models
   - Test history timeline
   - Compare model performance

4. **Analytics Dashboard**
   - Success rate by provider
   - Average test duration by model size
   - Cost analysis (test cost vs. model cost)
   - Trending models (most used, highest success rate)

---

## Conclusion

This validation strategy ensures that only reliable, well-tested AI models are available to customers. By combining automated CLI testing with manual super admin review, we maintain high quality standards while scaling to 200+ models.

**Key Takeaways:**
- ✅ Test BEFORE enabling platform-wide
- ✅ Use 5-phase validation suite
- ✅ Review test results in UI
- ✅ Mark reliable models as system defaults
- ✅ Re-test after provider updates

**Questions?**
Contact the platform engineering team or review:
- [AI Model Management Guide](../../platform/ARCHITECTURE.md)
- [Tool Calling Documentation](./ai-tool-calling-guide.md)
- [RBAC & Permissions](../RBAC_COMPLETE_GUIDE.md)
