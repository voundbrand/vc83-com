/**
 * INTERVIEW SCHEMAS
 *
 * Types for interview templates and session state management.
 * Interview templates define scripted conversations for client onboarding.
 * Guided sessions use these templates to extract structured data (Content DNA).
 *
 * Key Concepts:
 * - InterviewTemplate: Stored as objects with type="interview_template"
 * - InterviewPhase: Groups of questions with skip conditions
 * - InterviewQuestion: Individual prompts with extraction fields
 * - InterviewState: Tracks progress through an interview session
 *
 * See: convex/interviewTemplateOntology.ts for CRUD operations
 * See: convex/ai/interviewRunner.ts for execution logic
 */

import { defineTable } from "convex/server";
import { v } from "convex/values";

// ============================================================================
// INTERVIEW TEMPLATE TYPES (stored in customProperties of objects table)
// ============================================================================

/**
 * Full interview template structure.
 * Stored as customProperties on an object with type="interview_template"
 */
export interface InterviewTemplate {
  // Identity
  templateName: string;
  description: string;
  version: number;
  status: "draft" | "active" | "archived";

  // Configuration
  estimatedMinutes: number;
  mode: "quick" | "standard" | "deep_discovery";
  language: string;
  additionalLanguages?: string[];

  // Interview Structure
  phases: InterviewPhase[];

  // Output Configuration
  outputSchema: ContentDNASchema;
  completionCriteria: {
    minPhasesCompleted: number;
    requiredPhaseIds: string[];
  };

  // Agent Behavior
  interviewerPersonality: string;
  followUpDepth: 1 | 2 | 3;
  silenceHandling: string;

  // Metadata
  createdFromTemplateId?: string; // If cloned from another template
  usageCount?: number; // How many interviews have used this template
}

export interface InterviewPhase {
  phaseId: string;
  phaseName: string;
  order: number;
  isRequired: boolean;
  estimatedMinutes: number;

  // Questions
  questions: InterviewQuestion[];

  // Branching
  skipCondition?: SkipCondition;

  // Phase completion
  completionPrompt: string;
  introPrompt?: string; // What to say when entering this phase
}

export interface InterviewQuestion {
  questionId: string;
  promptText: string;
  helpText?: string;
  expectedDataType: "text" | "list" | "choice" | "rating" | "freeform";
  extractionField: string;
  validationRules?: ValidationRules;

  // Follow-up logic
  followUpPrompts?: string[];
  branchOnAnswer?: BranchCondition;
}

export interface SkipCondition {
  field: string;
  operator: "equals" | "contains" | "not_empty" | "empty" | "greater_than" | "less_than";
  value?: string | number;
}

export interface BranchCondition {
  condition: string;
  skipToQuestionId?: string;
  skipToPhaseId?: string;
}

export interface ValidationRules {
  minLength?: number;
  maxLength?: number;
  options?: string[]; // For choice type
  minValue?: number;  // For rating type
  maxValue?: number;
  required?: boolean;
}

export interface ContentDNASchema {
  fields: ContentDNAField[];
}

export interface ContentDNAField {
  fieldId: string;
  fieldName: string;
  dataType: "string" | "string[]" | "number" | "boolean" | "object";
  category: "voice" | "expertise" | "audience" | "content_prefs" | "brand" | "goals";
  required: boolean;
  description?: string;
}

// ============================================================================
// INTERVIEW SESSION STATE (stored in agentSessions table)
// ============================================================================

/**
 * Tracks progress through a guided interview session.
 * Stored in agentSessions.interviewState field.
 */
export interface InterviewState {
  // Progress tracking
  currentPhaseIndex: number;
  currentQuestionIndex: number;
  completedPhases: string[];
  skippedPhases: string[];

  // Extracted data (partial Content DNA)
  extractedData: Record<string, unknown>;

  // Follow-up tracking
  currentFollowUpCount: number; // How many follow-ups for current question
  pendingFollowUp: boolean;     // Waiting for elaboration

  // Timing
  startedAt: number;
  lastActivityAt: number;
  phaseStartTimes: Record<string, number>; // phaseId -> timestamp

  // Completion
  isComplete: boolean;
  completedAt?: number;
  contentDNAId?: string; // ID of saved Content DNA object

  // Explicit user-controlled memory consent checkpoint
  memoryConsent?: {
    status: "pending" | "accepted" | "declined";
    consentScope: "content_dna_profile";
    consentPromptVersion: string;
    memoryCandidateIds: string[];
    promptedAt: number;
    decidedAt?: number;
    decisionSource?: "user";
  };
}

// ============================================================================
// CONVEX VALIDATORS
// ============================================================================

/**
 * Validator for interview state stored in agentSessions
 */
export const interviewStateValidator = v.object({
  currentPhaseIndex: v.number(),
  currentQuestionIndex: v.number(),
  completedPhases: v.array(v.string()),
  skippedPhases: v.array(v.string()),
  extractedData: v.record(v.string(), v.any()),
  currentFollowUpCount: v.number(),
  pendingFollowUp: v.boolean(),
  startedAt: v.number(),
  lastActivityAt: v.number(),
  phaseStartTimes: v.record(v.string(), v.number()),
  isComplete: v.boolean(),
  completedAt: v.optional(v.number()),
  contentDNAId: v.optional(v.string()),
  memoryConsent: v.optional(v.object({
    status: v.union(v.literal("pending"), v.literal("accepted"), v.literal("declined")),
    consentScope: v.literal("content_dna_profile"),
    consentPromptVersion: v.string(),
    memoryCandidateIds: v.array(v.string()),
    promptedAt: v.number(),
    decidedAt: v.optional(v.number()),
    decisionSource: v.optional(v.literal("user")),
  })),
});

/**
 * Validator for skip condition
 */
export const skipConditionValidator = v.object({
  field: v.string(),
  operator: v.union(
    v.literal("equals"),
    v.literal("contains"),
    v.literal("not_empty"),
    v.literal("empty"),
    v.literal("greater_than"),
    v.literal("less_than")
  ),
  value: v.optional(v.union(v.string(), v.number())),
});

/**
 * Validator for validation rules
 */
export const validationRulesValidator = v.object({
  minLength: v.optional(v.number()),
  maxLength: v.optional(v.number()),
  options: v.optional(v.array(v.string())),
  minValue: v.optional(v.number()),
  maxValue: v.optional(v.number()),
  required: v.optional(v.boolean()),
});

/**
 * Validator for branch condition
 */
export const branchConditionValidator = v.object({
  condition: v.string(),
  skipToQuestionId: v.optional(v.string()),
  skipToPhaseId: v.optional(v.string()),
});

/**
 * Validator for interview question
 */
export const interviewQuestionValidator = v.object({
  questionId: v.string(),
  promptText: v.string(),
  helpText: v.optional(v.string()),
  expectedDataType: v.union(
    v.literal("text"),
    v.literal("list"),
    v.literal("choice"),
    v.literal("rating"),
    v.literal("freeform")
  ),
  extractionField: v.string(),
  validationRules: v.optional(validationRulesValidator),
  followUpPrompts: v.optional(v.array(v.string())),
  branchOnAnswer: v.optional(branchConditionValidator),
});

/**
 * Validator for interview phase
 */
export const interviewPhaseValidator = v.object({
  phaseId: v.string(),
  phaseName: v.string(),
  order: v.number(),
  isRequired: v.boolean(),
  estimatedMinutes: v.number(),
  questions: v.array(interviewQuestionValidator),
  skipCondition: v.optional(skipConditionValidator),
  completionPrompt: v.string(),
  introPrompt: v.optional(v.string()),
});

/**
 * Validator for Content DNA field
 */
export const contentDNAFieldValidator = v.object({
  fieldId: v.string(),
  fieldName: v.string(),
  dataType: v.union(
    v.literal("string"),
    v.literal("string[]"),
    v.literal("number"),
    v.literal("boolean"),
    v.literal("object")
  ),
  category: v.union(
    v.literal("voice"),
    v.literal("expertise"),
    v.literal("audience"),
    v.literal("content_prefs"),
    v.literal("brand"),
    v.literal("goals")
  ),
  required: v.boolean(),
  description: v.optional(v.string()),
});

/**
 * Validator for Content DNA schema
 */
export const contentDNASchemaValidator = v.object({
  fields: v.array(contentDNAFieldValidator),
});

/**
 * Validator for completion criteria
 */
export const completionCriteriaValidator = v.object({
  minPhasesCompleted: v.number(),
  requiredPhaseIds: v.array(v.string()),
});

/**
 * Full interview template validator (for mutations)
 */
export const interviewTemplateValidator = v.object({
  templateName: v.string(),
  description: v.string(),
  version: v.number(),
  status: v.union(v.literal("draft"), v.literal("active"), v.literal("archived")),
  estimatedMinutes: v.number(),
  mode: v.union(v.literal("quick"), v.literal("standard"), v.literal("deep_discovery")),
  language: v.string(),
  additionalLanguages: v.optional(v.array(v.string())),
  phases: v.array(interviewPhaseValidator),
  outputSchema: contentDNASchemaValidator,
  completionCriteria: completionCriteriaValidator,
  interviewerPersonality: v.string(),
  followUpDepth: v.union(v.literal(1), v.literal(2), v.literal(3)),
  silenceHandling: v.string(),
  createdFromTemplateId: v.optional(v.string()),
  usageCount: v.optional(v.number()),
});

// ============================================================================
// HELPER TYPES
// ============================================================================

/**
 * Interview progress summary (for UI)
 */
export interface InterviewProgress {
  sessionId: string;
  templateId: string;
  templateName: string;
  currentPhaseName: string;
  currentQuestionIndex: number;
  totalQuestions: number;
  completedPhases: number;
  totalPhases: number;
  percentComplete: number;
  estimatedMinutesRemaining: number;
  isComplete: boolean;
}

/**
 * Extracted data point from an answer
 */
export interface ExtractionResult {
  field: string;
  value: unknown;
  confidence: number; // 0-1
  needsFollowUp: boolean;
  followUpReason?: string;
}

/**
 * Interview completion result
 */
export interface InterviewCompletionResult {
  success: boolean;
  contentDNAId?: string;
  extractedFields: string[];
  missingRequiredFields: string[];
  totalDurationMinutes: number;
}
