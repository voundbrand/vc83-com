/**
 * Scheduled Jobs (Cron)
 *
 * This file defines scheduled jobs that run automatically in Convex.
 */

import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

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
  internal.accountManagement.permanentlyDeleteExpiredAccounts
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
  internal.transactionInvoicing.cleanupExpiredPdfCache
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
  internal.ai.modelDiscovery.fetchAvailableModels
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
  internal.licensing.badgeVerification.verifyAllBadgesInternal
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
  internal.sequences.messageQueueProcessor.processScheduledMessages
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
  internal.sequences.messageQueueProcessor.cleanupOldMessages
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
  internal.calendarSyncOntology.syncAllConnections
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
  internal.ai.trainingData.markAbandonedSessions,
  { olderThanMinutes: 15 }
);

export default crons;
