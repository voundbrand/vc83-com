# Custom Model Training Strategy

## Executive Summary

This document outlines the strategy for building a custom AI model trained on your platform's specific patterns, user interactions, and domain knowledge. The goal is to create a moat through a model that understands your schema, your users, and your design language better than any generic model.

---

## Current State

### What We Have

| Component | Status | Notes |
|-----------|--------|-------|
| AI Chat System | Production | Single `sendMessage` action serves both general chat and page builder |
| Page Builder | Production | Generates JSON pages with 10 section types |
| RAG Design System | Built, seeded | 12+ v0 prototypes with embeddings in `designPatterns` table |
| Training Schema | Added | `aiTrainingExamples` table ready for data collection |
| 58 Backend Tools | Production | Forms, products, checkout, booking, CRM, events, etc. |

### Traffic Reality

- Page builder: Low traffic (pre-launch)
- General chat: Low traffic
- **Implication**: We need synthetic data to bootstrap training

---

## The Strategy: Four Phases

### Phase 1: Synthetic Data Generation (Week 1)

**Goal**: Create 100-200 training examples from existing v0 templates.

**How it works**:
1. Take each v0 prototype (sailing-school, cafe-website, vacation-rental, etc.)
2. Extract the page structure (sections, colors, content)
3. Generate realistic user prompts that would produce that page
4. Create instruction → output pairs

**Example**:
```json
{
  "instruction": "Create a landing page for a sailing school in Germany. Include a hero section with booking CTA, course pricing, instructor team, testimonials, and FAQ.",
  "input": "Industry: maritime education. Location: Baltic Sea. Features needed: course booking, instructor profiles, student testimonials.",
  "output": "{\"version\":\"1.0\",\"metadata\":{\"title\":\"Sailing School\"},\"sections\":[{\"type\":\"hero\",...}]}"
}
```

**Estimated output**: 50-100 high-quality examples from 12 templates (multiple prompts per template).

### Phase 2: Real Data Collection (Ongoing from Day 1)

**Goal**: Capture every AI interaction for future training.

**What gets collected**:

| Interaction Type | Example Type | Captured Data |
|-----------------|--------------|---------------|
| Page generation | `page_generation` | User prompt, generated JSON, feedback |
| Chat with tools | `tool_invocation` | User request, tool calls, results |
| Design choices | `design_choice` | Color/font requests, AI response |
| Section edits | `section_edit` | Edit request, before/after JSON |

**Feedback signals**:

| Signal | Interpretation | Collection Method |
|--------|---------------|-------------------|
| Thumbs up | High quality | Explicit UI button |
| Thumbs down | Low quality | Explicit UI button |
| Page saved as-is | Accepted | Implicit (save mutation) |
| Page saved with edits | Needs improvement | Implicit (diff calculation) |
| Session abandoned | Rejected | Implicit (15-min timeout) |
| Regenerate request | Dissatisfied | Implicit (detect repeated prompts) |

**Collection point**: Single hook in `convex/ai/chat.ts` after AI response.

### Phase 3: First Training Run (After 200-500 examples)

**Platform**: Hugging Face AutoTrain
**Model Options**:
- Qwen2.5-32B-Instruct (best JSON generation)
- Llama-3.1-8B-Instruct (faster, cheaper)
- Mistral-7B-Instruct-v0.3 (good middle ground)

**Training data format** (Hugging Face instruction format):
```json
{
  "instruction": "User's request",
  "input": "Additional context (industry, current page state, etc.)",
  "output": "AI's response (page JSON or chat response)",
  "metadata": {
    "feedback_score": 1,
    "outcome": "accepted",
    "example_type": "page_generation"
  }
}
```

**Estimated cost**: $5-50 per training run depending on model size and examples.

**Timeline**: Can run first training within 1-2 weeks if we generate synthetic data.

### Phase 4: Evaluation and Deployment

**Shadow testing**:
1. Run both Claude AND fine-tuned model on same inputs
2. Compare outputs (don't show fine-tuned to users yet)
3. Measure: JSON validity, section accuracy, user acceptance rate

**Gradual rollout**:
1. 10% of requests → fine-tuned model (with fallback to Claude)
2. Monitor quality metrics
3. Increase percentage if quality holds
4. Eventually: fine-tuned model as primary, Claude as fallback

---

## RAG System: What Stays, What Goes

### Current RAG System

The RAG system retrieves design patterns based on user queries and injects them into the system prompt. It currently retrieves:
- Color systems (CSS variables)
- Typography patterns
- Section templates (hero, features, pricing, etc.)
- Animations and transitions
- Industry-specific moods

### Decision: Keep Everything For Now

**Rationale**: The fine-tuned model won't be ready for weeks/months. Removing RAG now would degrade quality.

**Transition plan**:

| Phase | RAG Behavior | Model | Reasoning |
|-------|-------------|-------|-----------|
| Now | Full RAG (all patterns) | Claude | Maximum quality while collecting data |
| After training v1 | Full RAG | Fine-tuned (shadow) | Compare with RAG context |
| After validation | Structure-only RAG | Fine-tuned | Model handles design taste |
| Long-term | Minimal RAG (animations only) | Fine-tuned v2+ | Model fully internalized design |

**What "structure-only RAG" means**:
- Keep: Section templates, complex animations, code snippets
- Remove: Color systems, typography, industry moods (model knows these)

---

## Implementation Checklist

### Already Done
- [x] `aiTrainingExamples` schema added to `convex/schemas/aiSchemas.ts`
- [x] Schema registered in `convex/schema.ts`

### To Build

#### 1. Training Data Collection (`convex/ai/trainingData.ts`)
- [ ] `collectTrainingExample` mutation - creates example after AI response
- [ ] `updateExampleFeedback` mutation - updates with thumbs up/down
- [ ] `updateExampleOutcome` mutation - updates when page is saved/abandoned
- [ ] `getTrainingStats` query - dashboard showing collection progress

#### 2. Hook Collection into Chat (`convex/ai/chat.ts`)
- [ ] After AI response (~line 760), call `collectTrainingExample`
- [ ] Pass: user message, AI response, context, RAG patterns used, model ID

#### 3. Feedback UI (`src/components/`)
- [ ] Thumbs up/down in `builder-chat-panel.tsx`
- [ ] Thumbs up/down in general chat messages
- [ ] Call `updateExampleFeedback` mutation on click

#### 4. Implicit Feedback (`convex/pageBuilder.ts`)
- [ ] On page save, find matching training example
- [ ] Calculate diff percentage (original vs saved)
- [ ] Update `feedback.outcome` based on diff

#### 5. Synthetic Data Generator (`scripts/training/`)
- [ ] `generate-synthetic.ts` - parses v0 templates, generates prompts
- [ ] Output: JSONL file ready for Hugging Face

#### 6. Export Pipeline (`convex/ai/trainingExport.ts`)
- [ ] `exportTrainingData` action - exports to Hugging Face format
- [ ] Anonymization (strip IDs, replace PII)
- [ ] Quality filtering (only high-quality examples)

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           USER INTERACTION                               │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  sendMessage (convex/ai/chat.ts)                                        │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 1. Get/create conversation                                       │   │
│  │ 2. Add user message to aiMessages                                │   │
│  │ 3. Build RAG context (if page_builder)                          │   │
│  │ 4. Call OpenRouter API                                           │   │
│  │ 5. Handle tool calls                                             │   │
│  │ 6. Save assistant message                                        │   │
│  │ 7. ★ NEW: collectTrainingExample() ← HOOK POINT                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
           ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
           │ User gives   │ │ User saves   │ │ User abandons│
           │ thumbs up/   │ │ page (with   │ │ session      │
           │ down         │ │ or w/o edits)│ │              │
           └──────────────┘ └──────────────┘ └──────────────┘
                    │               │               │
                    ▼               ▼               ▼
           ┌──────────────────────────────────────────────────┐
           │  updateExampleFeedback / updateExampleOutcome    │
           │  (updates aiTrainingExamples record)             │
           └──────────────────────────────────────────────────┘
                                    │
                                    ▼
           ┌──────────────────────────────────────────────────┐
           │  exportTrainingData (periodic or manual)         │
           │  - Filter high-quality examples                  │
           │  - Anonymize PII                                 │
           │  - Export to Hugging Face format                 │
           └──────────────────────────────────────────────────┘
                                    │
                                    ▼
           ┌──────────────────────────────────────────────────┐
           │  Hugging Face AutoTrain                          │
           │  - Upload dataset                                │
           │  - Fine-tune Qwen2.5 or Llama                    │
           │  - Download model weights                        │
           └──────────────────────────────────────────────────┘
                                    │
                                    ▼
           ┌──────────────────────────────────────────────────┐
           │  Deploy fine-tuned model                         │
           │  - Host on Hugging Face Inference                │
           │  - Or self-host via Ollama/vLLM                  │
           │  - Connect via OpenRouter custom endpoint        │
           └──────────────────────────────────────────────────┘
```

---

## Synthetic Data Generation Script

The synthetic data generator will:

1. **Parse v0 templates**:
   - Read `docs/prototypes_from_v0/*/app/page.tsx`
   - Extract sections, colors, typography from components
   - Map to our `AIGeneratedPageSchema` format

2. **Generate prompts**:
   - Industry-specific: "Create a landing page for a [industry] business"
   - Feature-specific: "Add a booking section with calendar"
   - Style-specific: "Use a warm color palette with rounded corners"

3. **Create variations**:
   - Same template, different prompts (3-5 per template)
   - Emphasize different features in each prompt

4. **Output format**:
   ```jsonl
   {"instruction":"...","input":"...","output":"...","metadata":{...}}
   {"instruction":"...","input":"...","output":"...","metadata":{...}}
   ```

---

## Quality Scoring Algorithm

Each training example gets a quality score (0-10):

```typescript
function calculateQualityScore(example: TrainingExample): number {
  let score = 0;

  // Valid JSON output (+3)
  if (example.quality.validJson) score += 3;

  // Explicit positive feedback (+3)
  if (example.feedback.feedbackScore === 1) score += 3;

  // User accepted without edits (+2)
  if (example.feedback.outcome === "accepted") score += 2;

  // User accepted with minor edits (+1)
  if (example.feedback.outcome === "accepted_with_edits") score += 1;

  // Conversation continued (user engaged) (+1)
  // (detected by multiple messages in same conversation)

  return score; // Max 10
}
```

**Export threshold**: Only examples with score >= 5 get exported for training.

---

## Privacy and Anonymization

Before export, all training data is anonymized:

| Data Type | Anonymization |
|-----------|---------------|
| Email addresses | `contact@example.com` |
| Phone numbers | `+1 (555) 000-0000` |
| Business names | `[BUSINESS_NAME]` |
| Person names | `[PERSON_NAME]` |
| Addresses | `[ADDRESS]` |
| Conversation IDs | Stripped |
| User IDs | Stripped |
| Organization IDs | Stripped |

**Opt-out**: Organizations can opt out of training data collection via AI settings.

---

## Cost Estimates

### Training Costs (Hugging Face AutoTrain)

| Model | Examples | Estimated Cost | Training Time |
|-------|----------|---------------|---------------|
| Llama-3.1-8B | 500 | $5-10 | 1-2 hours |
| Qwen2.5-32B | 500 | $20-40 | 3-5 hours |
| Llama-3.1-8B | 2000 | $15-30 | 4-6 hours |
| Qwen2.5-32B | 2000 | $50-100 | 8-12 hours |

### Inference Costs (After Training)

| Option | Cost | Latency | Notes |
|--------|------|---------|-------|
| Hugging Face Inference | $0.06/hr (dedicated) | ~500ms | Easy, managed |
| Together.ai | $0.20/M tokens | ~300ms | API-based |
| Self-hosted (Ollama) | GPU cost only | ~200ms | Full control |
| OpenRouter (if listed) | Varies | ~400ms | Drop-in replacement |

---

## Timeline

| Week | Milestone |
|------|-----------|
| 1 | Implement data collection hooks, synthetic data generator |
| 2 | Generate 100+ synthetic examples, deploy collection to production |
| 3 | Collect real user data, add feedback UI |
| 4 | First training run with 200-500 examples |
| 5 | Shadow testing, evaluation |
| 6+ | Gradual rollout if quality is good |

---

## Success Metrics

| Metric | Baseline (Claude) | Target (Fine-tuned) |
|--------|-------------------|---------------------|
| JSON validity rate | 95% | 98%+ |
| User acceptance rate | Unknown | 60%+ |
| Thumbs up rate | Unknown | 70%+ |
| Average edits needed | Unknown | <20% changes |
| Generation latency | ~3s | ~1s (smaller model) |

---

## Open Questions

1. **Model hosting**: Hugging Face Inference vs self-hosted vs OpenRouter?
2. **Retraining cadence**: Weekly? Monthly? Trigger-based (N new examples)?
3. **A/B testing infrastructure**: How to route % of traffic to fine-tuned model?
4. **Fallback strategy**: What happens if fine-tuned model fails?

---

## Next Steps

1. **Read this document** and confirm the strategy makes sense
2. **Decide**: Start with synthetic data generator or data collection hooks first?
3. **Execute**: Follow the implementation checklist above

---

*Document created: 2026-01-20*
*Last updated: 2026-01-20*
