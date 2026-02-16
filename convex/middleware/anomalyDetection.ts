/**
 * ANOMALY DETECTION MIDDLEWARE
 *
 * Real-time security monitoring and anomaly detection.
 * Detects suspicious patterns like geographic anomalies, velocity spikes, and brute force attacks.
 *
 * Detection Rules:
 * 1. Geographic Anomaly - API key used from 2+ countries within 1 hour
 * 2. Velocity Spike - Request rate 10x higher than 7-day average
 * 3. Failed Auth Spike - 20+ failed auth attempts in 5 minutes
 *
 * Performance: All detection is async and doesn't block API responses.
 *
 * @see .kiro/api_oauth_jose/OPTION_C_SECURITY_ENHANCEMENTS.md Task 3
 */

import { ActionCtx } from "../_generated/server";
const generatedApi: any = require("../_generated/api");
import { Id } from "../_generated/dataModel";

/**
 * Usage context for anomaly detection
 */
export interface UsageContext {
  organizationId: Id<"organizations">;
  authMethod: "api_key" | "oauth" | "cli_session" | "none";
  apiKeyId?: Id<"apiKeys">;
  apiKeyPrefix?: string;
  userId?: Id<"users">;
  endpoint: string;
  method: string;
  statusCode: number;
  ipAddress: string;
  country?: string;
  scopes?: string[];
  responseTimeMs?: number;
  userAgent?: string;
}

/**
 * Anomaly detection configuration
 */
interface AnomalyConfig {
  // Geographic anomaly
  geographicAnomalyEnabled: boolean;
  geographicAnomalyCountryCount: number; // Trigger if used from N+ countries
  geographicAnomalyTimeWindowMs: number; // Within time window

  // Velocity spike
  velocitySpikeEnabled: boolean;
  velocitySpikeMultiplier: number; // Trigger if N times average
  velocitySpikeWindowMs: number; // Current rate measured over this window

  // Failed auth spike
  failedAuthSpikeEnabled: boolean;
  failedAuthSpikeCount: number; // Trigger if N+ failed attempts
  failedAuthSpikeWindowMs: number; // Within time window

  // Alert cooldown (prevent duplicate alerts)
  alertCooldownMs: number;
}

/**
 * Default anomaly detection configuration
 */
export const DEFAULT_ANOMALY_CONFIG: AnomalyConfig = {
  // Geographic anomaly: API key from 2+ countries in 1 hour
  geographicAnomalyEnabled: true,
  geographicAnomalyCountryCount: 2,
  geographicAnomalyTimeWindowMs: 60 * 60 * 1000, // 1 hour

  // Velocity spike: 10x average rate
  velocitySpikeEnabled: true,
  velocitySpikeMultiplier: 10,
  velocitySpikeWindowMs: 5 * 60 * 1000, // 5 minutes

  // Failed auth spike: 20+ failed attempts in 5 minutes
  failedAuthSpikeEnabled: true,
  failedAuthSpikeCount: 20,
  failedAuthSpikeWindowMs: 5 * 60 * 1000, // 5 minutes

  // Alert cooldown: Don't re-alert for same issue within 1 hour
  alertCooldownMs: 60 * 60 * 1000, // 1 hour
};

/**
 * DETECT ANOMALIES
 *
 * Main entry point for anomaly detection.
 * Runs all detection rules asynchronously (doesn't block API response).
 *
 * Call this AFTER sending the API response using ctx.scheduler.
 *
 * @param ctx - Action context
 * @param usage - Request usage context
 * @param config - Anomaly detection configuration (optional, uses defaults)
 */
export async function detectAnomalies(
  ctx: ActionCtx,
  usage: UsageContext,
  config: AnomalyConfig = DEFAULT_ANOMALY_CONFIG
): Promise<void> {
  // Log usage metadata for future analysis
  await (ctx as any).runMutation(generatedApi.internal.middleware.anomalyDetectionDb.logUsageMetadata, {
    organizationId: usage.organizationId,
    authMethod: usage.authMethod,
    apiKeyId: usage.apiKeyId,
    userId: usage.userId,
    endpoint: usage.endpoint,
    method: usage.method,
    statusCode: usage.statusCode,
    ipAddress: usage.ipAddress,
    country: usage.country,
    scopes: usage.scopes,
    responseTimeMs: usage.responseTimeMs,
    userAgent: usage.userAgent,
  });

  // Run all detection rules in parallel
  await Promise.all([
    config.geographicAnomalyEnabled && usage.apiKeyId
      ? detectGeographicAnomaly(ctx, usage, config)
      : Promise.resolve(),
    config.velocitySpikeEnabled
      ? detectVelocitySpike(ctx, usage, config)
      : Promise.resolve(),
    config.failedAuthSpikeEnabled && usage.statusCode === 401
      ? detectFailedAuthSpike(ctx, usage, config)
      : Promise.resolve(),
  ]);
}

/**
 * DETECT GEOGRAPHIC ANOMALY
 *
 * Triggers if an API key is used from 2+ different countries within 1 hour.
 * This is a strong indicator of a compromised API key.
 *
 * Severity: HIGH
 */
async function detectGeographicAnomaly(
  ctx: ActionCtx,
  usage: UsageContext,
  config: AnomalyConfig
): Promise<void> {
  if (!usage.country || !usage.apiKeyId) return;

  const now = Date.now();
  const timeWindowStart = now - config.geographicAnomalyTimeWindowMs;

  // Get countries used in time window
  const recentCountries = await (ctx as any).runQuery(
    generatedApi.internal.middleware.anomalyDetectionDb.getRecentCountries,
    {
      apiKeyId: usage.apiKeyId,
      since: timeWindowStart,
    }
  );

  // Check if this is a new country
  if (!recentCountries.includes(usage.country)) {
    recentCountries.push(usage.country);
  }

  // Trigger if API key used from 2+ countries
  if (recentCountries.length >= config.geographicAnomalyCountryCount) {
    // Check for duplicate alerts (cooldown)
    const recentEvents = await (ctx as any).runQuery(
      generatedApi.internal.middleware.anomalyDetectionDb.getRecentSecurityEvents,
      {
        organizationId: usage.organizationId,
        eventType: "geographic_anomaly",
        since: now - config.alertCooldownMs,
      }
    );

    // Don't re-alert if recently alerted
    if (recentEvents.length > 0) {
      return;
    }

    // Create security event
    await (ctx as any).runMutation(
      generatedApi.internal.middleware.anomalyDetectionDb.createSecurityEvent,
      {
        organizationId: usage.organizationId,
        eventType: "geographic_anomaly",
        severity: "high",
        metadata: {
          countries: recentCountries,
          timeWindowHours: config.geographicAnomalyTimeWindowMs / (60 * 60 * 1000),
          currentCountry: usage.country,
          apiKeyPrefix: usage.apiKeyPrefix,
        },
        apiKeyId: usage.apiKeyId,
        apiKeyPrefix: usage.apiKeyPrefix,
        endpoint: usage.endpoint,
        method: usage.method,
        ipAddress: usage.ipAddress,
        country: usage.country,
      }
    );
  }
}

/**
 * DETECT VELOCITY SPIKE
 *
 * Triggers if current request rate is 10x higher than 7-day average.
 * This could indicate abuse or a runaway process.
 *
 * Severity: MEDIUM
 */
async function detectVelocitySpike(
  ctx: ActionCtx,
  usage: UsageContext,
  config: AnomalyConfig
): Promise<void> {
  const now = Date.now();
  const windowStart = now - config.velocitySpikeWindowMs;
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

  // Get current request count (last 5 minutes)
  const currentRequests = await (ctx as any).runQuery(
    generatedApi.internal.middleware.anomalyDetectionDb.getRequestCount,
    {
      organizationId: usage.organizationId,
      since: windowStart,
    }
  );

  // Get 7-day average (requests per 5 minutes)
  const averageRate = await (ctx as any).runQuery(
    generatedApi.internal.middleware.anomalyDetectionDb.getAverageRequestRate,
    {
      organizationId: usage.organizationId,
      since: sevenDaysAgo,
    }
  );

  // Skip if no baseline data
  if (averageRate === 0) {
    return;
  }

  // Trigger if current rate is 10x average
  const multiplier = currentRequests / averageRate;
  if (multiplier >= config.velocitySpikeMultiplier) {
    // Check for duplicate alerts (cooldown)
    const recentEvents = await (ctx as any).runQuery(
      generatedApi.internal.middleware.anomalyDetectionDb.getRecentSecurityEvents,
      {
        organizationId: usage.organizationId,
        eventType: "velocity_spike",
        since: now - config.alertCooldownMs,
      }
    );

    // Don't re-alert if recently alerted
    if (recentEvents.length > 0) {
      return;
    }

    // Create security event
    await (ctx as any).runMutation(
      generatedApi.internal.middleware.anomalyDetectionDb.createSecurityEvent,
      {
        organizationId: usage.organizationId,
        eventType: "velocity_spike",
        severity: "medium",
        metadata: {
          currentRate: currentRequests,
          averageRate: Math.round(averageRate * 100) / 100,
          multiplier: Math.round(multiplier * 100) / 100,
          windowMinutes: config.velocitySpikeWindowMs / (60 * 1000),
        },
        apiKeyId: usage.apiKeyId,
        apiKeyPrefix: usage.apiKeyPrefix,
        userId: usage.userId,
        endpoint: usage.endpoint,
        method: usage.method,
      }
    );
  }
}

/**
 * DETECT FAILED AUTH SPIKE
 *
 * Triggers if 20+ failed auth attempts from the same IP within 5 minutes.
 * This is a strong indicator of a brute force attack.
 *
 * Severity: CRITICAL
 */
async function detectFailedAuthSpike(
  ctx: ActionCtx,
  usage: UsageContext,
  config: AnomalyConfig
): Promise<void> {
  const now = Date.now();
  const windowStart = now - config.failedAuthSpikeWindowMs;

  // Get failed auth attempts from this IP
  const failedAttempts = await (ctx as any).runQuery(
    generatedApi.internal.middleware.anomalyDetectionDb.getFailedAuthAttempts,
    {
      ipAddress: usage.ipAddress,
      since: windowStart,
    }
  );

  // Trigger if 20+ failed attempts
  if (failedAttempts >= config.failedAuthSpikeCount) {
    // Check for duplicate alerts (cooldown)
    const recentEvents = await (ctx as any).runQuery(
      generatedApi.internal.middleware.anomalyDetectionDb.getRecentSecurityEvents,
      {
        organizationId: usage.organizationId,
        eventType: "failed_auth_spike",
        since: now - config.alertCooldownMs,
      }
    );

    // Don't re-alert if recently alerted
    if (recentEvents.length > 0) {
      return;
    }

    // Create security event
    await (ctx as any).runMutation(
      generatedApi.internal.middleware.anomalyDetectionDb.createSecurityEvent,
      {
        organizationId: usage.organizationId,
        eventType: "failed_auth_spike",
        severity: "critical",
        metadata: {
          failedAttempts,
          windowMinutes: config.failedAuthSpikeWindowMs / (60 * 1000),
          threshold: config.failedAuthSpikeCount,
        },
        endpoint: usage.endpoint,
        method: usage.method,
        ipAddress: usage.ipAddress,
        country: usage.country,
      }
    );
  }
}

/**
 * LOG FAILED AUTH ATTEMPT
 *
 * Logs a failed authentication attempt for brute force detection.
 * Call this whenever API key or OAuth token verification fails.
 *
 * @param ctx - Action context
 * @param apiKeyPrefix - First 12 chars of API key (if API key auth)
 * @param tokenType - "api_key" or "oauth"
 * @param endpoint - Endpoint that was accessed
 * @param method - HTTP method
 * @param ipAddress - Client IP address
 * @param country - Client country (optional)
 * @param userAgent - Client user agent (optional)
 * @param failureReason - Why auth failed (e.g., "invalid_key", "expired_token")
 */
export async function logFailedAuthAttempt(
  ctx: ActionCtx,
  params: {
    apiKeyPrefix?: string;
    tokenType?: string;
    endpoint: string;
    method: string;
    ipAddress: string;
    country?: string;
    userAgent?: string;
    failureReason: string;
  }
): Promise<void> {
  await (ctx as any).runMutation(generatedApi.internal.middleware.anomalyDetectionDb.logFailedAuth, {
    apiKeyPrefix: params.apiKeyPrefix,
    tokenType: params.tokenType,
    endpoint: params.endpoint,
    method: params.method,
    ipAddress: params.ipAddress,
    country: params.country,
    userAgent: params.userAgent,
    failureReason: params.failureReason,
  });
}
