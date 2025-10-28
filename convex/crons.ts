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

export default crons;
