/**
 * INTERVIEW TEMPLATE SEEDS
 *
 * Default interview templates that are seeded for new organizations.
 * These cover common use cases for client onboarding.
 *
 * Templates:
 * - Quick Brand Voice (15 min, 3 phases)
 * - Agency Client Discovery (45 min, 6 phases)
 * - Thought Leader Extraction (25 min, 4 phases)
 *
 * See: convex/schemas/interviewSchemas.ts for type definitions
 */

import type { InterviewTemplate, InterviewPhase } from "../schemas/interviewSchemas";

// ============================================================================
// TEMPLATE A: QUICK BRAND VOICE (15 min, 3 phases)
// ============================================================================

export const quickBrandVoiceTemplate: InterviewTemplate = {
  templateName: "Quick Brand Voice",
  description: "A fast 15-minute interview to capture the essentials of your brand voice, audience, and communication style.",
  version: 1,
  status: "active",
  estimatedMinutes: 15,
  mode: "quick",
  language: "en",

  phases: [
    {
      phaseId: "who_you_are",
      phaseName: "Who You Are",
      order: 1,
      isRequired: true,
      estimatedMinutes: 5,
      introPrompt: "Let's start with the basics. I'd love to learn about you and your business.",
      completionPrompt: "Great! I now have a good sense of who you are. Let's talk about your audience next.",
      questions: [
        {
          questionId: "q1_business",
          promptText: "Tell me about your business. What do you do, and what makes it unique?",
          helpText: "Share your elevator pitch or how you'd explain your business to a friend.",
          expectedDataType: "freeform",
          extractionField: "bio",
          followUpPrompts: [
            "Can you tell me more about what makes your approach different?",
            "What's the one thing you want people to remember about your business?",
          ],
        },
        {
          questionId: "q1_role",
          promptText: "What's your role, and how long have you been doing this?",
          expectedDataType: "text",
          extractionField: "role",
        },
        {
          questionId: "q1_experience",
          promptText: "How many years of experience do you have in this field?",
          expectedDataType: "text",
          extractionField: "experience",
          validationRules: { minLength: 1 },
        },
      ],
    },
    {
      phaseId: "your_audience",
      phaseName: "Your Audience",
      order: 2,
      isRequired: true,
      estimatedMinutes: 5,
      introPrompt: "Now let's talk about the people you serve.",
      completionPrompt: "Perfect! I have a clear picture of your audience. Finally, let's capture your voice.",
      questions: [
        {
          questionId: "q2_icp",
          promptText: "Describe your ideal customer. Who do you love working with?",
          helpText: "Think about your best clients - what do they have in common?",
          expectedDataType: "freeform",
          extractionField: "icp",
          followUpPrompts: [
            "What specific challenges do they face that you help with?",
            "Where do they typically find you?",
          ],
        },
        {
          questionId: "q2_pain_points",
          promptText: "What's the biggest pain point or frustration your customers have before working with you?",
          expectedDataType: "freeform",
          extractionField: "painPoints",
        },
        {
          questionId: "q2_channels",
          promptText: "Where does your audience hang out online? Which platforms do they use most?",
          expectedDataType: "list",
          extractionField: "channels",
          validationRules: { options: ["LinkedIn", "Instagram", "Twitter/X", "Facebook", "TikTok", "YouTube", "Email newsletters", "Podcasts", "Other"] },
        },
      ],
    },
    {
      phaseId: "your_voice",
      phaseName: "Your Voice",
      order: 3,
      isRequired: true,
      estimatedMinutes: 5,
      introPrompt: "Last section! Let's capture how you communicate.",
      completionPrompt: "Excellent! I now have everything I need to understand your brand voice. Thank you!",
      questions: [
        {
          questionId: "q3_tone",
          promptText: "How would you describe your communication style? (e.g., professional, casual, witty, authoritative)",
          expectedDataType: "text",
          extractionField: "tone",
          followUpPrompts: [
            "If your brand was a person, how would their friends describe them?",
          ],
        },
        {
          questionId: "q3_avoid_words",
          promptText: "Are there any words, phrases, or topics you never want associated with your brand?",
          expectedDataType: "list",
          extractionField: "avoidWords",
        },
        {
          questionId: "q3_brand_inspo",
          promptText: "Name 2-3 brands or public figures whose communication style you admire.",
          expectedDataType: "list",
          extractionField: "brandInspo",
        },
      ],
    },
  ],

  outputSchema: {
    fields: [
      { fieldId: "bio", fieldName: "Business Bio", dataType: "string", category: "brand", required: true },
      { fieldId: "role", fieldName: "Role", dataType: "string", category: "brand", required: true },
      { fieldId: "experience", fieldName: "Years of Experience", dataType: "string", category: "expertise", required: false },
      { fieldId: "icp", fieldName: "Ideal Customer Profile", dataType: "string", category: "audience", required: true },
      { fieldId: "painPoints", fieldName: "Customer Pain Points", dataType: "string", category: "audience", required: false },
      { fieldId: "channels", fieldName: "Preferred Channels", dataType: "string[]", category: "content_prefs", required: false },
      { fieldId: "tone", fieldName: "Communication Tone", dataType: "string", category: "voice", required: true },
      { fieldId: "avoidWords", fieldName: "Words to Avoid", dataType: "string[]", category: "voice", required: false },
      { fieldId: "brandInspo", fieldName: "Brand Inspiration", dataType: "string[]", category: "voice", required: false },
    ],
  },

  completionCriteria: {
    minPhasesCompleted: 3,
    requiredPhaseIds: ["who_you_are", "your_audience", "your_voice"],
  },

  interviewerPersonality: "Warm, curious, and encouraging. You make people feel comfortable sharing about themselves.",
  followUpDepth: 2,
  silenceHandling: "Take your time - there's no rush. If you're stuck, just describe what first comes to mind.",
};

// ============================================================================
// TEMPLATE B: AGENCY CLIENT DISCOVERY (45 min, 6 phases)
// ============================================================================

export const agencyClientDiscoveryTemplate: InterviewTemplate = {
  templateName: "Agency Client Discovery",
  description: "A comprehensive 45-minute deep dive for agencies onboarding new clients. Covers business context, brand identity, audience, content strategy, voice, and goals.",
  version: 1,
  status: "active",
  estimatedMinutes: 45,
  mode: "deep_discovery",
  language: "en",

  phases: [
    {
      phaseId: "business_context",
      phaseName: "Business Context",
      order: 1,
      isRequired: true,
      estimatedMinutes: 8,
      introPrompt: "Let's start by understanding your business at a high level.",
      completionPrompt: "I have a solid understanding of your business model. Let's explore your brand identity next.",
      questions: [
        {
          questionId: "q1_business_model",
          promptText: "What's your business model? How do you make money?",
          expectedDataType: "freeform",
          extractionField: "businessModel",
          followUpPrompts: ["What's your primary revenue stream?"],
        },
        {
          questionId: "q1_revenue",
          promptText: "Can you share your revenue streams? What percentage comes from each?",
          expectedDataType: "freeform",
          extractionField: "revenue",
        },
        {
          questionId: "q1_team_size",
          promptText: "How big is your team?",
          expectedDataType: "text",
          extractionField: "teamSize",
        },
        {
          questionId: "q1_stage",
          promptText: "What growth stage would you say you're at? (startup, growth, established, enterprise)",
          expectedDataType: "choice",
          extractionField: "stage",
          validationRules: { options: ["Startup", "Growth", "Established", "Enterprise"] },
        },
      ],
    },
    {
      phaseId: "brand_identity",
      phaseName: "Brand Identity",
      order: 2,
      isRequired: true,
      estimatedMinutes: 8,
      introPrompt: "Now let's dive into who you are as a brand.",
      completionPrompt: "Your brand identity is coming into focus. Let's talk about your audience.",
      questions: [
        {
          questionId: "q2_mission",
          promptText: "What's your mission statement? Why does your company exist beyond making money?",
          expectedDataType: "freeform",
          extractionField: "mission",
          followUpPrompts: ["If you had to explain your 'why' to a five-year-old, what would you say?"],
        },
        {
          questionId: "q2_values",
          promptText: "What are your core values? (List 3-5)",
          expectedDataType: "list",
          extractionField: "values",
        },
        {
          questionId: "q2_personality",
          promptText: "If your brand was a person, how would you describe their personality?",
          expectedDataType: "freeform",
          extractionField: "personality",
        },
        {
          questionId: "q2_visual",
          promptText: "Describe your visual identity. What colors, imagery, and aesthetic define your brand?",
          expectedDataType: "freeform",
          extractionField: "visualIdentity",
        },
      ],
    },
    {
      phaseId: "target_audience",
      phaseName: "Target Audience",
      order: 3,
      isRequired: true,
      estimatedMinutes: 8,
      introPrompt: "Let's get specific about who you're trying to reach.",
      completionPrompt: "I have a detailed picture of your audience. Now let's discuss your content approach.",
      questions: [
        {
          questionId: "q3_primary_icp",
          promptText: "Describe your primary ideal customer in detail. Demographics, psychographics, behaviors.",
          expectedDataType: "freeform",
          extractionField: "primaryIcp",
          followUpPrompts: ["What does a day in their life look like?", "What keeps them up at night?"],
        },
        {
          questionId: "q3_secondary_icp",
          promptText: "Do you have a secondary audience? Describe them.",
          expectedDataType: "freeform",
          extractionField: "secondaryIcp",
        },
        {
          questionId: "q3_journey",
          promptText: "Walk me through your customer's journey. How do they discover you, evaluate you, and become a customer?",
          expectedDataType: "freeform",
          extractionField: "journey",
        },
        {
          questionId: "q3_objections",
          promptText: "What objections or hesitations do prospects typically have before buying?",
          expectedDataType: "list",
          extractionField: "objections",
        },
      ],
    },
    {
      phaseId: "content_strategy",
      phaseName: "Content Strategy",
      order: 4,
      isRequired: false,
      estimatedMinutes: 7,
      introPrompt: "Let's talk about your content efforts so far.",
      completionPrompt: "I understand your content landscape. Time to nail down your voice.",
      skipCondition: {
        field: "businessModel",
        operator: "contains",
        value: "B2B enterprise",
      },
      questions: [
        {
          questionId: "q4_current",
          promptText: "What content are you currently creating? How often do you publish?",
          expectedDataType: "freeform",
          extractionField: "currentEfforts",
        },
        {
          questionId: "q4_success",
          promptText: "What content has worked best for you? Any viral moments or high performers?",
          expectedDataType: "freeform",
          extractionField: "successStories",
        },
        {
          questionId: "q4_topics",
          promptText: "What topics do you 'own'? What are you the go-to expert for?",
          expectedDataType: "list",
          extractionField: "ownedTopics",
        },
        {
          questionId: "q4_competitor",
          promptText: "Whose content do you admire in your space? What do they do well?",
          expectedDataType: "freeform",
          extractionField: "competitorInspo",
        },
      ],
    },
    {
      phaseId: "voice_tone",
      phaseName: "Voice & Tone",
      order: 5,
      isRequired: true,
      estimatedMinutes: 7,
      introPrompt: "Let's capture exactly how you want to sound.",
      completionPrompt: "Your voice is crystal clear. Final stretch - let's talk goals!",
      questions: [
        {
          questionId: "q5_style",
          promptText: "Describe your communication style in 3-5 adjectives.",
          expectedDataType: "list",
          extractionField: "style",
        },
        {
          questionId: "q5_formality",
          promptText: "On a scale of 1-10, how formal is your communication? (1 = super casual, 10 = very formal)",
          expectedDataType: "rating",
          extractionField: "formality",
          validationRules: { minValue: 1, maxValue: 10 },
        },
        {
          questionId: "q5_humor",
          promptText: "How do you feel about humor in your content? Do you use it? What kind?",
          expectedDataType: "freeform",
          extractionField: "humor",
        },
        {
          questionId: "q5_hot_takes",
          promptText: "Do you have any contrarian views or 'hot takes' in your industry?",
          expectedDataType: "freeform",
          extractionField: "hotTakes",
        },
      ],
    },
    {
      phaseId: "goals_constraints",
      phaseName: "Goals & Constraints",
      order: 6,
      isRequired: true,
      estimatedMinutes: 7,
      introPrompt: "Finally, let's define success and set some boundaries.",
      completionPrompt: "We're all done! I have everything I need to create a comprehensive Content DNA profile for you.",
      questions: [
        {
          questionId: "q6_goals",
          promptText: "What are your top 3 goals for the next 90 days?",
          expectedDataType: "list",
          extractionField: "goals90d",
        },
        {
          questionId: "q6_frequency",
          promptText: "How often do you want to publish content? What's realistic for your bandwidth?",
          expectedDataType: "text",
          extractionField: "frequency",
        },
        {
          questionId: "q6_platforms",
          promptText: "Which platforms do you want to focus on? Rank them by priority.",
          expectedDataType: "list",
          extractionField: "platforms",
        },
        {
          questionId: "q6_avoid",
          promptText: "Are there any topics that are completely off-limits? Anything you never want to discuss publicly?",
          expectedDataType: "list",
          extractionField: "avoidTopics",
        },
      ],
    },
  ],

  outputSchema: {
    fields: [
      { fieldId: "businessModel", fieldName: "Business Model", dataType: "string", category: "brand", required: true },
      { fieldId: "revenue", fieldName: "Revenue Streams", dataType: "string", category: "brand", required: false },
      { fieldId: "teamSize", fieldName: "Team Size", dataType: "string", category: "brand", required: false },
      { fieldId: "stage", fieldName: "Growth Stage", dataType: "string", category: "brand", required: true },
      { fieldId: "mission", fieldName: "Mission Statement", dataType: "string", category: "brand", required: true },
      { fieldId: "values", fieldName: "Core Values", dataType: "string[]", category: "brand", required: true },
      { fieldId: "personality", fieldName: "Brand Personality", dataType: "string", category: "voice", required: true },
      { fieldId: "visualIdentity", fieldName: "Visual Identity", dataType: "string", category: "brand", required: false },
      { fieldId: "primaryIcp", fieldName: "Primary ICP", dataType: "string", category: "audience", required: true },
      { fieldId: "secondaryIcp", fieldName: "Secondary ICP", dataType: "string", category: "audience", required: false },
      { fieldId: "journey", fieldName: "Customer Journey", dataType: "string", category: "audience", required: false },
      { fieldId: "objections", fieldName: "Common Objections", dataType: "string[]", category: "audience", required: false },
      { fieldId: "currentEfforts", fieldName: "Current Content Efforts", dataType: "string", category: "content_prefs", required: false },
      { fieldId: "successStories", fieldName: "Content Success Stories", dataType: "string", category: "content_prefs", required: false },
      { fieldId: "ownedTopics", fieldName: "Owned Topics", dataType: "string[]", category: "expertise", required: false },
      { fieldId: "competitorInspo", fieldName: "Competitor Inspiration", dataType: "string", category: "content_prefs", required: false },
      { fieldId: "style", fieldName: "Communication Style", dataType: "string[]", category: "voice", required: true },
      { fieldId: "formality", fieldName: "Formality Level", dataType: "number", category: "voice", required: true },
      { fieldId: "humor", fieldName: "Humor Preferences", dataType: "string", category: "voice", required: false },
      { fieldId: "hotTakes", fieldName: "Hot Takes", dataType: "string", category: "expertise", required: false },
      { fieldId: "goals90d", fieldName: "90-Day Goals", dataType: "string[]", category: "goals", required: true },
      { fieldId: "frequency", fieldName: "Content Frequency", dataType: "string", category: "content_prefs", required: true },
      { fieldId: "platforms", fieldName: "Priority Platforms", dataType: "string[]", category: "content_prefs", required: true },
      { fieldId: "avoidTopics", fieldName: "Topics to Avoid", dataType: "string[]", category: "voice", required: false },
    ],
  },

  completionCriteria: {
    minPhasesCompleted: 5,
    requiredPhaseIds: ["business_context", "brand_identity", "target_audience", "voice_tone", "goals_constraints"],
  },

  interviewerPersonality: "Professional yet warm. You're a seasoned consultant who asks insightful questions and makes clients feel heard.",
  followUpDepth: 3,
  silenceHandling: "No pressure - this is about capturing the real you. Take a moment to think if you need to.",
};

// ============================================================================
// TEMPLATE C: THOUGHT LEADER EXTRACTION (25 min, 4 phases)
// ============================================================================

export const thoughtLeaderExtractionTemplate: InterviewTemplate = {
  templateName: "Thought Leader Extraction",
  description: "A 25-minute interview designed to extract unique expertise, stories, and opinions for thought leadership content.",
  version: 1,
  status: "active",
  estimatedMinutes: 25,
  mode: "standard",
  language: "en",

  phases: [
    {
      phaseId: "expertise",
      phaseName: "Expertise",
      order: 1,
      isRequired: true,
      estimatedMinutes: 7,
      introPrompt: "Let's uncover what makes you a true expert in your field.",
      completionPrompt: "Your expertise is impressive! Now let's capture some of your best stories.",
      questions: [
        {
          questionId: "q1_topics",
          promptText: "What are your top 3 topics you could talk about for hours without notes?",
          expectedDataType: "list",
          extractionField: "expertTopics",
          followUpPrompts: ["What aspect of this topic do most people get wrong?"],
        },
        {
          questionId: "q1_contrarian",
          promptText: "What's your unique take that goes against the mainstream thinking in your industry?",
          expectedDataType: "freeform",
          extractionField: "contrarian",
          followUpPrompts: ["Why do you think most people see this differently?"],
        },
        {
          questionId: "q1_frameworks",
          promptText: "Have you developed any frameworks, methodologies, or mental models? Describe them.",
          expectedDataType: "freeform",
          extractionField: "frameworks",
        },
      ],
    },
    {
      phaseId: "stories",
      phaseName: "Stories",
      order: 2,
      isRequired: true,
      estimatedMinutes: 7,
      introPrompt: "Stories are content gold. Let's capture your best ones.",
      completionPrompt: "These stories are powerful. Now let's get your bold opinions.",
      questions: [
        {
          questionId: "q2_origin",
          promptText: "Tell me your origin story. How did you get into this field? What was the turning point?",
          expectedDataType: "freeform",
          extractionField: "originStory",
          followUpPrompts: ["What would have happened if you hadn't made that choice?"],
        },
        {
          questionId: "q2_failure",
          promptText: "What's your biggest professional failure? What did you learn from it?",
          expectedDataType: "freeform",
          extractionField: "failureStory",
          followUpPrompts: ["How has that experience shaped how you work today?"],
        },
        {
          questionId: "q2_transformation",
          promptText: "Tell me about a client or customer transformation that you're proud of.",
          expectedDataType: "freeform",
          extractionField: "transformationStory",
        },
      ],
    },
    {
      phaseId: "opinions",
      phaseName: "Opinions",
      order: 3,
      isRequired: true,
      estimatedMinutes: 6,
      introPrompt: "Time for your bold takes and predictions.",
      completionPrompt: "Love the hot takes! Final section - let's nail down your style.",
      questions: [
        {
          questionId: "q3_disagreements",
          promptText: "What industry trends or 'best practices' do you strongly disagree with?",
          expectedDataType: "freeform",
          extractionField: "disagreements",
        },
        {
          questionId: "q3_predictions",
          promptText: "What are your predictions for your industry in the next 2 years?",
          expectedDataType: "freeform",
          extractionField: "predictions",
        },
        {
          questionId: "q3_advice",
          promptText: "What advice would you give your younger self when starting out?",
          expectedDataType: "freeform",
          extractionField: "advice",
        },
      ],
    },
    {
      phaseId: "style",
      phaseName: "Style",
      order: 4,
      isRequired: true,
      estimatedMinutes: 5,
      introPrompt: "Final section! Let's capture how you like to communicate.",
      completionPrompt: "Perfect! I now have everything I need to create thought leadership content that sounds authentically you.",
      questions: [
        {
          questionId: "q4_explain",
          promptText: "How would you explain what you do to a 10-year-old?",
          expectedDataType: "freeform",
          extractionField: "simpleExplanation",
        },
        {
          questionId: "q4_catchphrases",
          promptText: "Do you have any catchphrases, mantras, or sayings you use often?",
          expectedDataType: "list",
          extractionField: "catchphrases",
        },
        {
          questionId: "q4_length",
          promptText: "What's your preferred content length? Short punchy posts or long-form deep dives?",
          expectedDataType: "choice",
          extractionField: "postLength",
          validationRules: { options: ["Short and punchy", "Medium length", "Long-form deep dives", "Mix of all"] },
        },
      ],
    },
  ],

  outputSchema: {
    fields: [
      { fieldId: "expertTopics", fieldName: "Expert Topics", dataType: "string[]", category: "expertise", required: true },
      { fieldId: "contrarian", fieldName: "Contrarian Views", dataType: "string", category: "expertise", required: true },
      { fieldId: "frameworks", fieldName: "Proprietary Frameworks", dataType: "string", category: "expertise", required: false },
      { fieldId: "originStory", fieldName: "Origin Story", dataType: "string", category: "brand", required: true },
      { fieldId: "failureStory", fieldName: "Failure Story", dataType: "string", category: "brand", required: false },
      { fieldId: "transformationStory", fieldName: "Transformation Story", dataType: "string", category: "brand", required: false },
      { fieldId: "disagreements", fieldName: "Industry Disagreements", dataType: "string", category: "expertise", required: true },
      { fieldId: "predictions", fieldName: "Industry Predictions", dataType: "string", category: "expertise", required: false },
      { fieldId: "advice", fieldName: "Advice to Younger Self", dataType: "string", category: "brand", required: false },
      { fieldId: "simpleExplanation", fieldName: "Simple Explanation", dataType: "string", category: "voice", required: true },
      { fieldId: "catchphrases", fieldName: "Catchphrases", dataType: "string[]", category: "voice", required: false },
      { fieldId: "postLength", fieldName: "Preferred Post Length", dataType: "string", category: "content_prefs", required: true },
    ],
  },

  completionCriteria: {
    minPhasesCompleted: 4,
    requiredPhaseIds: ["expertise", "stories", "opinions", "style"],
  },

  interviewerPersonality: "An intellectual peer who's genuinely fascinated by your expertise. You ask probing questions that help uncover insights.",
  followUpDepth: 2,
  silenceHandling: "Take your time - the best insights often need a moment to surface.",
};

// ============================================================================
// ALL SEED TEMPLATES
// ============================================================================

export const SEED_TEMPLATES = [
  quickBrandVoiceTemplate,
  agencyClientDiscoveryTemplate,
  thoughtLeaderExtractionTemplate,
];

/**
 * Get a seed template by mode
 */
export function getSeedTemplateByMode(mode: "quick" | "standard" | "deep_discovery"): InterviewTemplate | undefined {
  return SEED_TEMPLATES.find((t) => t.mode === mode);
}
