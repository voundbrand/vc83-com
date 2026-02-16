# Phase 3: AI Content Generation & Social Media Management

> The agent doesn't just respond to customers — it creates content, manages social presence, and grows the business.

## Vision

Business owners spend hours creating social media posts, writing email campaigns, and managing their online presence. Their agent should handle this:

1. **Generate content** tailored to each platform (IG carousel ≠ LinkedIn article ≠ tweet)
2. **Learn the brand voice** from existing content and org data
3. **Schedule and post** autonomously (with approval controls)
4. **Track performance** and improve over time
5. **Repurpose content** across platforms automatically

This is the differentiator. GoHighLevel has basic email/SMS. Nobody gives small businesses an AI agent that manages their entire content strategy.

---

## What Already Exists

### AI Infrastructure
- `convex/ai/chat.ts` — Multi-turn AI with tool execution
- `convex/ai/openrouter.ts` — Multi-LLM (Claude, GPT-4o, etc.)
- `convex/ai/tools/registry.ts` — Extensible tool system
- `convex/ai/billing.ts` — Cost tracking per model

### Content-Adjacent Systems
- `convex/emailService.ts` — Email template rendering and delivery
- `convex/sequences/` — Multi-channel message scheduling
- Ontology system — Products, events, bookings data the agent can reference
- Builder system — AI-generated web pages (proves we can generate content)

### Channel Connectors (from Phase 2)
- Social media posting APIs (Instagram, Facebook, X, LinkedIn)
- Per-org OAuth credentials for each platform
- Channel abstraction layer

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                 CONTENT GENERATION PIPELINE                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────┐                                             │
│  │  CONTENT        │  Brand voice profile                        │
│  │  BRAIN          │  + Org data (products, events, CRM)        │
│  │                 │  + Performance history                       │
│  │  (LLM + tools) │  + Platform best practices                  │
│  └────────┬────────┘                                             │
│           │                                                       │
│           ▼                                                       │
│  ┌─────────────────┐                                             │
│  │  CONTENT        │  Raw content idea                           │
│  │  GENERATOR      │  → Platform-specific variants               │
│  │                 │  → Media suggestions                         │
│  │                 │  → Hashtag/keyword optimization              │
│  └────────┬────────┘                                             │
│           │                                                       │
│           ▼                                                       │
│  ┌─────────────────┐                                             │
│  │  APPROVAL       │  draft → review → approved → scheduled     │
│  │  QUEUE          │                                             │
│  │                 │  (Human-in-the-loop from Phase 1)           │
│  └────────┬────────┘                                             │
│           │                                                       │
│           ▼                                                       │
│  ┌─────────────────┐                                             │
│  │  SCHEDULER      │  Calendar view                              │
│  │  & PUBLISHER    │  → Optimal posting times                    │
│  │                 │  → Rate limit awareness                      │
│  │                 │  → Multi-platform dispatch                   │
│  └────────┬────────┘                                             │
│           │                                                       │
│           ▼                                                       │
│  ┌─────────────────┐                                             │
│  │  ANALYTICS      │  Engagement metrics                         │
│  │  & FEEDBACK     │  → Performance scoring                      │
│  │                 │  → Feed back to Content Brain                │
│  └─────────────────┘                                             │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Content Generation System

### 1. Brand Voice Profile

Stored as part of the `org_agent` config (Phase 1) or as a separate ontology object:

```typescript
// Object type: "brand_voice_profile"
{
  type: "brand_voice_profile",
  organizationId: Id<"organizations">,
  name: "Segelschule Brand Voice",
  status: "active",

  customProperties: {
    // Core Identity
    brandName: "Segelschule am Stettiner Haff",
    industry: "outdoor recreation / sailing school",
    targetAudience: "German-speaking adults interested in sailing, nature, and slow living",
    uniqueSellingPoints: [
      "Authentic small school, personal instruction from Gerrit",
      "Stettiner Haff — quiet, unspoiled nature",
      "Combined sailing + vacation house experience",
    ],

    // Voice & Tone
    voiceAttributes: ["warm", "authentic", "nautical", "casual but professional"],
    toneExamples: [
      "We say: 'Ahoi!' not 'Hello!'",
      "We use du (informal), not Sie",
      "We mention the wind, water, and nature frequently",
    ],
    avoidTopics: ["competitor comparisons", "aggressive sales language"],
    signOff: "Mast- und Schotbruch!",
    language: "de",

    // Content Themes
    contentPillars: [
      { theme: "sailing_education", description: "Tips, techniques, license prep", weight: 0.3 },
      { theme: "haff_nature", description: "Nature photos, wildlife, seasons at the Haff", weight: 0.25 },
      { theme: "student_stories", description: "Student achievements, testimonials", weight: 0.2 },
      { theme: "behind_scenes", description: "Gerrit's life at the Haff, boat maintenance", weight: 0.15 },
      { theme: "promotions", description: "Course dates, early bird, availability", weight: 0.1 },
    ],

    // Training Data (examples of good content)
    samplePosts: [
      {
        platform: "instagram",
        text: "Wind aus Nordwest, 4 Beaufort. Perfekter Tag zum Segeln lernen...",
        engagement: { likes: 45, comments: 8, shares: 3 },
      },
    ],

    // Hashtag Strategy
    defaultHashtags: {
      instagram: ["#segeln", "#stettinerhaff", "#segelschule", "#ostsee", "#sailing"],
      linkedin: ["#segeln", "#outdooradventure", "#mecklenburgvorpommern"],
    },
  }
}
```

### 2. Content Generator Tool

New AI tool registered in the tool registry:

```typescript
// convex/ai/tools/contentGeneratorTool.ts

export const content_generator_tool = {
  name: "content_generator_tool",
  description: "Generate social media content for the organization",
  parameters: {
    contentType: "post" | "story" | "reel_caption" | "email_campaign" | "blog_draft",
    platforms: ["instagram", "facebook", "x", "linkedin"],
    topic: string,              // "Upcoming SBF Binnen course in March"
    contentPillar: string,      // Optional: force a specific content pillar
    mediaType: "photo" | "carousel" | "video" | "text_only",
    urgency: "scheduled" | "timely" | "trending",
  },

  handler: async (ctx, args) => {
    // 1. Load brand voice profile
    const brandVoice = await loadBrandVoice(ctx, organizationId);

    // 2. Load relevant org data
    const contextData = await gatherContentContext(ctx, organizationId, args.topic);
    // e.g., upcoming courses, recent bookings, seasonal info

    // 3. Generate platform-specific content variants
    const variants = await generateContentVariants({
      brandVoice,
      contextData,
      platforms: args.platforms,
      contentType: args.contentType,
    });

    // Returns something like:
    return {
      variants: [
        {
          platform: "instagram",
          text: "Wind aus Nordwest, 4 Beaufort...",
          hashtags: ["#segeln", "#stettinerhaff"],
          mediaPrompt: "Photo of a sailboat on calm water at sunset, Stettiner Haff",
          suggestedPostTime: "2025-03-15T10:00:00+01:00",
          estimatedEngagement: "medium-high (nature content performs well)",
        },
        {
          platform: "x",
          text: "4 Beaufort am Haff. Perfekter Tag zum Lernen. ⛵\n\nSBF Binnen Kurs im März — noch 3 Plätze.",
          hashtags: ["#segeln"],
          suggestedPostTime: "2025-03-15T12:00:00+01:00",
        },
        {
          platform: "linkedin",
          text: "Was Segeln über Führung lehrt: ...",
          // LinkedIn gets a longer, more professional angle
        },
      ],
      mediaSuggestions: [
        { type: "existing", query: "recent sailing photos from media library" },
        { type: "generate", prompt: "Watercolor illustration of a sailboat on the Haff" },
        { type: "stock", query: "sailboat sunset Baltic Sea" },
      ],
    };
  }
};
```

### 3. Content Calendar

Ontology object for scheduled content:

```typescript
// Object type: "content_post"
{
  type: "content_post",
  subtype: "instagram" | "facebook" | "x" | "linkedin" | "tiktok" | "cross_platform",
  organizationId: Id<"organizations">,
  name: "März Kurs Promo",
  status: "draft" | "pending_approval" | "approved" | "scheduled" | "published" | "failed",

  customProperties: {
    // Content
    text: "Wind aus Nordwest...",
    hashtags: ["#segeln", "#haff"],
    mediaIds: [Id<"objects">],          // References to media library items
    generatedMediaPrompt: "...",         // If AI-generated image needed

    // Scheduling
    scheduledFor: 1710489600000,         // When to publish
    timezone: "Europe/Berlin",
    optimalTimeReason: "Audience most active 10-11am weekdays",

    // Platform-specific
    platforms: [
      {
        platform: "instagram",
        variant: "carousel",
        text: "...",                     // Platform-specific text variant
        published: false,
        publishedAt: null,
        externalPostId: null,            // IG post ID after publishing
        error: null,
      },
      {
        platform: "x",
        variant: "tweet",
        text: "...",
        published: false,
      },
    ],

    // Generation Context
    generatedBy: "agent" | "human",
    contentPillar: "sailing_education",
    agentSessionId: Id<"objects">,       // Which agent conversation generated this

    // Performance (filled after publishing)
    analytics: {
      instagram: { likes: 0, comments: 0, saves: 0, reach: 0 },
      x: { likes: 0, retweets: 0, impressions: 0 },
    },
  }
}
```

### 4. Approval Queue Integration

Connects to Phase 1's human-in-the-loop system:

```
Agent generates content
  │
  ├─► If autonomyLevel == "autonomous" AND post is low-risk:
  │     └─ Schedule directly
  │
  ├─► If autonomyLevel == "supervised" OR post is high-risk:
  │     ├─ Create content_post with status "pending_approval"
  │     ├─ Notify org admin (in-app + optional push)
  │     └─ Admin reviews in Content Calendar UI:
  │           ├─ Approve → status changes to "scheduled"
  │           ├─ Edit → modify text/media → then approve
  │           └─ Reject → status changes to "rejected" + feedback to agent
  │
  └─► Risk Assessment:
        low:  Educational content, nature photos, engagement replies
        medium: Promotional content, pricing mentions
        high: Response to negative review, anything mentioning competitors
```

### 5. Content Scheduling & Publishing

Extends the existing message queue pattern:

```typescript
// Reuse the 5-minute cron pattern from multichannel-automation
// But for social media posts instead of messages

// convex/contentPublisher.ts
export const publishScheduledContent = internalAction(async (ctx) => {
  // Get approved posts due for publishing
  const posts = await ctx.runQuery(internal.contentPosts.getDueForPublishing, {
    before: Date.now(),
    limit: 20,
  });

  for (const post of posts) {
    for (const platformVariant of post.platforms) {
      if (platformVariant.published) continue;

      try {
        // Use channel connector from Phase 2
        const result = await publishToChannel(
          ctx,
          post.organizationId,
          platformVariant.platform,
          {
            text: platformVariant.text,
            mediaUrls: await resolveMediaUrls(ctx, post.mediaIds),
          }
        );

        // Mark as published with external ID
        await ctx.runMutation(internal.contentPosts.markPublished, {
          postId: post._id,
          platform: platformVariant.platform,
          externalPostId: result.postId,
        });

      } catch (error) {
        await ctx.runMutation(internal.contentPosts.markFailed, {
          postId: post._id,
          platform: platformVariant.platform,
          error: error.message,
        });
      }
    }
  }
});
```

### 6. Analytics & Feedback Loop

```
Published post
  │
  ├─► After 24h: Fetch engagement metrics from platform API
  ├─► After 72h: Fetch final metrics
  ├─► Score post performance (0-100) based on:
  │     ├─ Engagement rate vs. org's average
  │     ├─ Reach vs. follower count
  │     └─ Conversion actions (link clicks, profile visits)
  │
  ├─► Feed back to Content Brain:
  │     "Instagram carousel posts about sailing education
  │      get 3x more saves than promotional posts.
  │      Best posting time: Tuesday 10am."
  │
  └─► Update brand_voice_profile with learned preferences
```

```typescript
// convex/ai/tools/contentAnalyticsTool.ts

export const content_analytics_tool = {
  name: "content_analytics_tool",
  description: "Analyze content performance and get recommendations",
  parameters: {
    timeframe: "7d" | "30d" | "90d",
    platform: "all" | "instagram" | "facebook" | "x" | "linkedin",
    metric: "engagement" | "reach" | "conversions" | "overview",
  },
  handler: async (ctx, args) => {
    // Query published content_post objects with analytics
    // Aggregate and analyze
    // Return insights like:
    return {
      topPerforming: [...],
      contentPillarRanking: [
        { pillar: "haff_nature", avgEngagement: 4.2, posts: 12 },
        { pillar: "student_stories", avgEngagement: 3.8, posts: 8 },
      ],
      bestPostingTimes: {
        instagram: { day: "Tuesday", hour: 10 },
        x: { day: "Wednesday", hour: 12 },
      },
      recommendations: [
        "Increase nature content — it outperforms by 40%",
        "Try more carousel posts — 2.5x more saves than single images",
        "Post more on Tuesdays — your audience is most active then",
      ],
    };
  }
};
```

---

## Autonomy Levels for Content

| Level | What Agent Does | Human Does |
|-------|----------------|------------|
| **Draft Only** | Generates content drafts in calendar | Reviews, edits, and manually publishes everything |
| **Supervised** | Generates + schedules, but requires approval | Reviews each post before it goes live |
| **Semi-Autonomous** | Auto-publishes low-risk (educational, nature), queues high-risk (promo) | Reviews only flagged/promotional content |
| **Autonomous** | Publishes everything within guardrails | Monitors dashboard, provides feedback |

Business owners graduate through levels as they build trust with their agent.

---

## Content UI

### Content Calendar View

```
┌─────────────────────────────────────────────────────────────────┐
│  Content Calendar — March 2025                                    │
├─────────────────────────────────────────────────────────────────┤
│  Mon      │  Tue      │  Wed      │  Thu      │  Fri            │
│           │           │           │           │                  │
│  3        │  4        │  5        │  6        │  7              │
│           │ 🟢 10:00  │           │ 🟡 12:00  │                │
│           │ IG: Haff  │           │ X: Kurs   │                │
│           │ nature    │           │ promo     │                │
│           │           │           │ [Review]  │                │
│  10       │  11       │  12       │  13       │  14             │
│           │ 🟢 10:00  │ ⬜ Draft  │           │ 🟢 09:00       │
│           │ IG+FB:    │ LI: Tips  │           │ IG: Student    │
│           │ Behind    │           │           │ story          │
│           │ scenes    │           │           │                │
├─────────────────────────────────────────────────────────────────┤
│  🟢 Approved/Scheduled  🟡 Pending Review  ⬜ Draft  🔴 Failed  │
│                                                                   │
│  [+ Generate Content]  [Auto-Fill Week]  [Analytics]             │
└─────────────────────────────────────────────────────────────────┘
```

### "Generate Content" Flow

```
User clicks [+ Generate Content]
  │
  ├─► Agent asks: "What should I create content about?"
  │   Or suggests: "You have a SBF Binnen course on March 15.
  │                 Want me to create a promotional series?"
  │
  ├─► User picks topic / confirms suggestion
  │
  ├─► Agent generates variants for each connected platform
  │     Shows preview with text, hashtags, media suggestion
  │
  ├─► User can:
  │     ├─ Approve all → schedule
  │     ├─ Edit individual variants
  │     ├─ Regenerate ("make it more casual")
  │     └─ Reject ("not right now")
  │
  └─► Approved posts appear on calendar
```

### "Auto-Fill Week" Flow

```
User clicks [Auto-Fill Week]
  │
  ├─► Agent analyzes:
  │     ├─ Content pillar distribution (are we balanced?)
  │     ├─ Upcoming events/bookings worth promoting
  │     ├─ Content gaps (no posts on Wednesday?)
  │     ├─ Performance data (what's working?)
  │     └─ Platform-specific optimal frequency
  │
  ├─► Generates a week's worth of content (e.g., 5-7 posts)
  │     Spread across platforms and content pillars
  │
  ├─► User reviews entire week at once
  │     Can approve all, edit individual, or regenerate any
  │
  └─► Approved posts scheduled at optimal times
```

---

## Implementation Priority

### Step 1: Brand Voice Profile
- Add `brand_voice_profile` type to ontology
- Create setup wizard (UI) where org fills in their brand details
- Or: Agent interviews the org owner to build the profile conversationally

### Step 2: Content Generator Tool
- Implement `content_generator_tool`
- Multi-platform variant generation
- Register in tool registry
- Test via existing AI chat

### Step 3: Content Calendar
- Add `content_post` type to ontology
- CRUD mutations for content posts
- Calendar UI component
- Draft → Approve → Schedule workflow

### Step 4: Publisher & Scheduler
- Cron job for publishing scheduled content (reuse queue pattern)
- Integrate with Phase 2 channel connectors
- Error handling and retry logic

### Step 5: Analytics Integration
- Fetch engagement metrics from platform APIs
- Store in content_post analytics field
- `content_analytics_tool` for agent to analyze
- Performance dashboard UI

### Step 6: Feedback Loop
- Agent learns from high-performing content
- Adjusts content pillar weights
- Optimizes posting times per org
- Suggests content strategy improvements

---

## Dependencies

- **Phase 1 (Agent Per Org)**: Agent config, tool registry, autonomy levels
- **Phase 2 (Channel Connectors)**: Social media OAuth + posting APIs
- **Existing**: AI chat, ontology, media library

---

## OpenClaw Reference Patterns

| Pattern | OpenClaw Location | How We Adapt |
|---------|------------------|-------------|
| Skill system | `skills/*/SKILL.md` | Brand voice profile as agent "knowledge" |
| Cron scheduling | `src/gateway/server-methods/cron.ts` | Content publishing scheduler |
| Canvas/A2UI | `src/gateway/server-methods/canvas.ts` | Content preview rendering |
| Agent memory | Agent workspace files | Brand voice + performance history |

---

## Success Metrics

- Agent can generate platform-appropriate content from a topic prompt
- Content maintains consistent brand voice across platforms
- Approval workflow works (draft → review → publish)
- Posts published at scheduled times to correct platforms
- Analytics tracked and fed back to improve future content
- Business owners report saving 5+ hours/week on content creation
