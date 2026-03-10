/**
 * Scheduled Jobs (Cron)
 *
 * This file defines scheduled jobs that run automatically in Convex.
 */

import { cronJobs } from "convex/server";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generatedApi: any = require("./_generated/api");

const crons = cronJobs();

/**
 * Permanently Delete Expired Accounts
 *
 * Runs daily at 2 AM UTC to check for accounts that have passed
 * their 2-week grace period and permanently delete them.
 *
 * What it does:
 * 1. Finds all users with scheduledDeletionDate < now
 * 2. Sets isActive = false (blocks login)
 * 3. Archives owned organizations
 * 4. Removes user from all organizations
 * 5. Logs audit event
 */
crons.daily(
  "Permanently delete expired accounts",
  {
    hourUTC: 2, // 2 AM UTC
    minuteUTC: 0,
  },
  generatedApi.internal.accountManagement.permanentlyDeleteExpiredAccounts
);

/**
 * Cleanup Expired Invoice PDF Cache
 *
 * Runs daily at 3 AM UTC to remove expired PDF files from storage.
 * Deletes PDFs older than 30 days to prevent storage bloat.
 *
 * What it does:
 * 1. Finds all checkout sessions with expired PDF cache
 * 2. Deletes PDF from Convex storage
 * 3. Removes cache reference from transaction customProperties
 * 4. Logs cleanup count
 */
crons.daily(
  "Cleanup expired invoice PDF cache",
  {
    hourUTC: 3, // 3 AM UTC
    minuteUTC: 0,
  },
  generatedApi.internal.transactionInvoicing.cleanupExpiredPdfCache
);

/**
 * Refresh AI Models from OpenRouter
 *
 * Runs daily at 4 AM UTC to discover new AI models available through OpenRouter.
 * Keeps our model cache up-to-date with latest releases.
 *
 * What it does:
 * 1. Fetches all models from OpenRouter API
 * 2. Updates cached pricing and capabilities
 * 3. Ensures UI always shows current model availability
 */
crons.daily(
  "Refresh AI models from OpenRouter",
  {
    hourUTC: 4, // 4 AM UTC (after other cleanup jobs)
    minuteUTC: 0,
  },
  generatedApi.internal.ai.modelDiscovery.fetchAvailableModels
);

/**
 * Sync Organization AI Model Defaults
 *
 * Runs daily at 4:30 AM UTC (after model discovery refresh).
 * Ensures every organization's AI settings include current
 * platform-enabled models and a valid default.
 *
 * What it does:
 * 1. Iterates all organizationAiSettings in paginated batches
 * 2. Calls ensureOrganizationModelDefaultsInternal per org
 * 3. Adds newly-enabled platform models to orgs with empty/stale lists
 * 4. Self-schedules next batch until all orgs are processed
 */
crons.daily(
  "Sync organization AI model defaults with platform-enabled models",
  {
    hourUTC: 4,
    minuteUTC: 30,
  },
  generatedApi.internal.migrations.syncOrgModelDefaults
    .syncOrgModelDefaultsBatch
);

/**
 * Verify API Key Domain Badges (Phase 2: Badge Enforcement)
 *
 * Runs daily at 5 AM UTC to verify badge presence on free tier domains.
 * Enforces "Powered by l4yercak3" badge requirement for free tier API usage.
 *
 * What it does:
 * 1. Gets all domains requiring badge verification (free tier, active, due for check)
 * 2. Makes HTTP request to /.well-known/l4yercak3-verify on each domain
 * 3. Verifies badge presence via badge_visible field
 * 4. Suspends domains missing badge after 3 failed checks (grace period)
 * 5. Logs verification results for monitoring
 *
 * Free tier customers must display badge or upgrade to remove requirement.
 */
crons.daily(
  "Verify API key domain badges",
  {
    hourUTC: 5, // 5 AM UTC (after model refresh)
    minuteUTC: 0,
  },
  generatedApi.internal.licensing.badgeVerification.verifyAllBadgesInternal
);

/**
 * Process Sequence Messages
 *
 * Runs every 5 minutes to process scheduled sequence messages.
 * Handles time-delayed emails, SMS, and WhatsApp for booking reminders,
 * follow-ups, and customer lifecycle messaging.
 *
 * What it does:
 * 1. Finds messages with scheduledFor <= now and status="scheduled"
 * 2. Routes each message to appropriate channel (email/SMS/WhatsApp)
 * 3. Updates message status and enrollment progress
 * 4. Handles retries for failed messages
 */
crons.interval(
  "Process sequence messages",
  { minutes: 5 },
  generatedApi.internal.sequences.messageQueueProcessor.processScheduledMessages
);

/**
 * Cleanup Old Sequence Messages
 *
 * Runs daily at 6 AM UTC to remove old sent/cancelled messages.
 * Prevents database bloat from historical message records.
 *
 * What it does:
 * 1. Deletes sent messages older than 30 days
 * 2. Deletes cancelled messages older than 30 days
 * 3. Logs cleanup count
 */
crons.daily(
  "Cleanup old sequence messages",
  {
    hourUTC: 6, // 6 AM UTC (after badge verification)
    minuteUTC: 0,
  },
  generatedApi.internal.sequences.messageQueueProcessor.cleanupOldMessages
);

/**
 * Cleanup Expired Auth Prefill Tokens
 *
 * Runs daily to remove expired one-time prefill tokens used by email deep-links.
 * Keeps token table small and limits retention of temporary onboarding metadata.
 */
crons.daily(
  "Cleanup expired auth prefill tokens",
  {
    hourUTC: 6,
    minuteUTC: 30,
  },
  generatedApi.internal.authPrefill.cleanupExpiredAuthPrefillTokens
);

/**
 * Sync External Calendar Events
 *
 * Runs every 15 minutes to pull events from connected Google and Microsoft
 * calendars into our availability system as external busy times.
 *
 * What it does:
 * 1. Finds all OAuth connections with calendar sync enabled
 * 2. Pulls events from Google Calendar API and Microsoft Graph API
 * 3. Upserts external events as calendar_event objects
 * 4. Deletes stale events that no longer exist in external calendar
 * 5. Links events to resources via blocks_resource objectLinks
 */
crons.interval(
  "Sync external calendar events",
  { minutes: 15 },
  generatedApi.internal.calendarSyncOntology.syncAllConnections
);

/**
 * Expire Stale Agent Sessions (Session TTL)
 *
 * Runs every 15 minutes to close sessions that have exceeded their idle TTL
 * or maximum duration. Prevents stale context from persisting indefinitely.
 *
 * What it does:
 * 1. Gets all active agent sessions (batch of 200)
 * 2. Resolves session policy (TTL, maxDuration) from agent config
 * 3. Closes sessions that are idle or expired
 * 4. Logs count of closed sessions
 */
crons.interval(
  "Expire stale agent sessions",
  { minutes: 15 },
  generatedApi.internal.ai.agentSessions.expireStaleSessions
);

/**
 * Retry Dead Letter Queue Messages
 *
 * Runs every 5 minutes to retry outbound messages that failed delivery.
 * Messages are abandoned after 10 failed attempts.
 *
 * What it does:
 * 1. Finds dead letter entries with nextRetryAt <= now
 * 2. Retries sending through the channel router
 * 3. Deletes on success, increments attempts on failure
 * 4. Abandons messages after 10 attempts
 */
crons.interval(
  "Retry dead letter queue messages",
  { minutes: 5 },
  generatedApi.internal.ai.deadLetterQueue.retryDeadLetters
);

/**
 * Process Pending Appointment Outreach Missions
 *
 * Runs every 10 minutes to advance deterministic outreach ladders for
 * appointment-booking missions.
 *
 * What it does:
 * 1. Selects active missions with due nextAttemptAt timestamps
 * 2. Executes exactly one ladder step per mission run
 * 3. Enforces bounded retries, business-hour guards, and call pacing
 * 4. Leaves mission audit artifacts attached to each attempt
 */
crons.interval(
  "Process pending appointment outreach missions",
  { minutes: 10 },
  generatedApi.internal.channels.router.processPendingAppointmentOutreachMissions
);

/**
 * Cleanup expired AI chat attachments
 *
 * Runs hourly to enforce attachment retention policy for chat uploads:
 * - uploaded > 1 hour
 * - orphaned > 24 hours
 * - linked > 30 days
 */
crons.interval(
  "Cleanup expired AI chat attachments",
  { minutes: 60 },
  generatedApi.internal.ai.chatAttachments.cleanupExpiredAttachments,
  {}
);

/**
 * Cleanup expired operator mobile retained media
 *
 * Runs hourly to enforce operator media retention TTL:
 * - marks expired retention rows as deleted
 * - deletes stored payload blobs when present
 */
crons.interval(
  "Cleanup expired operator mobile retained media",
  { minutes: 60 },
  generatedApi.internal.ai.mediaRetention.cleanupExpiredRetainedMedia,
  {}
);

/**
 * Cleanup old super-admin QA run telemetry
 *
 * Runs hourly to enforce QA run retention policy:
 * - completed/failed runs older than 30 days are deleted
 * - active runs idle > 7 days are deleted
 * - table is trimmed toward bounded row cap to keep storage predictable
 */
crons.interval(
  "Cleanup super-admin QA runs",
  { minutes: 60 },
  generatedApi.internal.ai.qaRuns.cleanupQaRunsInternal,
  {}
);

/**
 * Cleanup Old Credit Sharing Ledger Entries
 *
 * Runs daily at 3:30 AM UTC to remove ledger entries older than 90 days.
 * Prevents database bloat from historical credit sharing records.
 *
 * What it does:
 * 1. Finds credit_sharing_ledger objects updated >90 days ago
 * 2. Deletes them in batches of 500
 * 3. Logs cleanup count
 */
crons.daily(
  "Cleanup old credit sharing ledger",
  {
    hourUTC: 3,
    minuteUTC: 30,
  },
  generatedApi.internal.credits.sharing.cleanupOldLedgerEntries
);

/**
 * Weekly Soul Reflection
 *
 * Runs weekly on Monday at 9 AM UTC.
 * Triggers self-reflection for all eligible active agents.
 *
 * What it does:
 * 1. Iterates all active agents
 * 2. Skips protected agents and those with reflection disabled
 * 3. Checks rate limits before scheduling
 * 4. Staggers reflections over 60 minutes to avoid spikes
 * 5. Each reflection reviews recent conversations and proposes soul updates
 */
crons.weekly(
  "Weekly soul reflection",
  {
    dayOfWeek: "monday",
    hourUTC: 9,
    minuteUTC: 0,
  },
  generatedApi.internal.ai.soulEvolution.scheduledReflection
);

/**
 * Archive Idle Quinn Workers
 *
 * Runs every 15 minutes to archive Quinn onboarding workers
 * that have been idle for more than 60 minutes.
 * Always keeps at least 1 worker active.
 *
 * What it does:
 * 1. Finds all active workers (agents cloned from Quinn template)
 * 2. Skips the most-recently-active worker
 * 3. Archives workers idle for over 60 minutes
 * 4. Logs count of archived workers
 */
crons.interval(
  "Archive idle Quinn workers",
  { minutes: 15 },
  generatedApi.internal.ai.workerPool.archiveIdleWorkers
);

/**
 * Mark Abandoned AI Training Sessions
 *
 * Runs every 15 minutes to mark old AI conversations without feedback.
 * This helps maintain accurate training data quality metrics.
 *
 * What it does:
 * 1. Finds training examples older than 15 minutes with no feedback
 * 2. Marks them as low quality (user didn't engage)
 * 3. Helps separate genuinely useful interactions from abandoned sessions
 */
crons.interval(
  "Mark abandoned AI training sessions",
  { minutes: 15 },
  generatedApi.internal.ai.trainingData.markAbandonedSessions,
  { olderThanMinutes: 15 }
);

/**
 * Auto-Resume Timed Out Escalations
 *
 * Runs every 5 minutes to auto-resume conversations where a human
 * was notified but didn't respond within 30 minutes.
 *
 * What it does:
 * 1. Finds sessions with pending escalations older than 30 minutes
 * 2. Sets escalation status to "timed_out" so agent can resume
 * 3. Prevents customers from being stuck in limbo indefinitely
 */
crons.interval(
  "Auto-resume timed out escalations",
  { minutes: 5 },
  generatedApi.internal.ai.escalation.autoResumeTimedOutEscalations
);

/**
 * Audit Onboarding First-Win SLA Breaches
 *
 * Runs hourly to detect nurture journeys where Day 0 first-win
 * was not delivered within 24 hours.
 */
crons.interval(
  "Audit onboarding first-win SLA",
  { minutes: 60 },
  generatedApi.internal.onboarding.nurtureScheduler.auditFirstWinGuarantees,
  { limit: 100 }
);

/**
 * Agent Catalog Drift Audit (Phase 3)
 *
 * Runs daily to persist read-only drift telemetry for the Agent Control Center.
 * This keeps CI and scheduled checks aligned with the same dataset snapshot.
 */
crons.daily(
  "Agent catalog drift audit",
  {
    hourUTC: 7,
    minuteUTC: 20,
  },
  generatedApi.internal.ai.agentCatalogSync.runScheduledDriftAudit,
  {
    datasetVersion: "agp_v1",
  }
);

/**
 * Agent Catalog Scheduled Sync Automation (Phase 3)
 *
 * Runs daily after the drift audit. Current rollout keeps sync-apply non-blocking
 * and read-only-safe while optional docs snapshot export remains gated.
 */
crons.daily(
  "Agent catalog scheduled sync automation",
  {
    hourUTC: 7,
    minuteUTC: 40,
  },
  generatedApi.internal.ai.agentCatalogSync.runScheduledSyncApply,
  {
    datasetVersion: "agp_v1",
    includeDocsSnapshotExport: true,
  }
);

export default crons;
