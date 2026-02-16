"use node";

/**
 * MUX VIDEO ACTIONS
 *
 * Convex actions for interacting with Mux Video API.
 * Handles video uploads, playback URLs, live streaming, and webhook processing.
 *
 * Environment Variables Required:
 * - MUX_TOKEN_ID: Mux API token ID
 * - MUX_TOKEN_SECRET: Mux API token secret
 * - MUX_WEBHOOK_SECRET: Secret for verifying Mux webhooks
 * - NEXT_PUBLIC_MUX_DATA_ENV_KEY: Environment key for Mux Data analytics
 */

import { action, internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";

// Dynamic import for Mux client to avoid bundler issues with Node.js built-ins
async function getMuxClient() {
  const Mux = (await import("@mux/mux-node")).default;

  const tokenId = process.env.MUX_TOKEN_ID;
  const tokenSecret = process.env.MUX_TOKEN_SECRET;

  if (!tokenId || !tokenSecret) {
    throw new Error("MUX_TOKEN_ID and MUX_TOKEN_SECRET must be configured");
  }

  return new Mux({
    tokenId,
    tokenSecret,
  });
}

/**
 * GET DIRECT UPLOAD URL
 *
 * Creates a direct upload URL for uploading videos to Mux.
 * The client uploads directly to Mux, bypassing our server.
 *
 * @param webinarId - ID of the webinar to link the video to
 * @param corsOrigin - CORS origin for the upload (e.g., "https://example.com")
 * @returns Upload URL, upload ID, and expiration time
 */
export const getDirectUploadUrl = action({
  args: {
    webinarId: v.id("objects"),
    corsOrigin: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const mux = await getMuxClient();

    // Create a direct upload URL
    const upload = await mux.video.uploads.create({
      cors_origin: args.corsOrigin || process.env.NEXT_PUBLIC_SITE_URL || "*",
      new_asset_settings: {
        playback_policy: ["public"],
        // Store webinarId in passthrough for webhook correlation
        passthrough: args.webinarId,
        // Enable MP4 support for downloads
        mp4_support: "standard",
        // Normalize audio levels
        normalize_audio: true,
        // Generate captions using Mux's AI
        // auto_generated_captions: true, // Commented out - requires specific plan
      },
    });

    return {
      uploadUrl: upload.url,
      uploadId: upload.id,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    };
  },
});

/**
 * GET ASSET STATUS
 *
 * Checks the status of a Mux asset (video processing progress).
 *
 * @param muxAssetId - Mux asset ID
 * @returns Asset status and metadata
 */
export const getAssetStatus = action({
  args: {
    muxAssetId: v.string(),
  },
  handler: async (ctx, args) => {
    const mux = await getMuxClient();

    const asset = await mux.video.assets.retrieve(args.muxAssetId);

    return {
      id: asset.id,
      status: asset.status, // "preparing", "ready", "errored"
      duration: asset.duration,
      aspectRatio: asset.aspect_ratio,
      maxStoredResolution: asset.max_stored_resolution,
      maxStoredFrameRate: asset.max_stored_frame_rate,
      playbackIds: asset.playback_ids?.map((p) => ({
        id: p.id,
        policy: p.policy,
      })),
      tracks: asset.tracks?.map((t) => ({
        type: t.type,
        maxWidth: t.max_width,
        maxHeight: t.max_height,
        maxFrameRate: t.max_frame_rate,
        duration: t.duration,
      })),
      errors: asset.errors,
      createdAt: asset.created_at,
    };
  },
});

/**
 * GET PLAYBACK URL
 *
 * Gets the HLS playback URL for a video.
 * For public videos, returns unsigned URL.
 * For private videos, would return signed URL (not implemented yet).
 *
 * @param playbackId - Mux playback ID
 * @returns Playback URL for video player
 */
export const getPlaybackUrl = action({
  args: {
    playbackId: v.string(),
  },
  handler: async (ctx, args) => {
    // Public playback URL (no signing required)
    return {
      streamUrl: `https://stream.mux.com/${args.playbackId}.m3u8`,
      posterUrl: `https://image.mux.com/${args.playbackId}/thumbnail.png`,
      animatedGifUrl: `https://image.mux.com/${args.playbackId}/animated.gif`,
      storyboardUrl: `https://image.mux.com/${args.playbackId}/storyboard.vtt`,
    };
  },
});

/**
 * DELETE ASSET
 *
 * Deletes a video asset from Mux.
 *
 * @param muxAssetId - Mux asset ID to delete
 */
export const deleteAsset = action({
  args: {
    muxAssetId: v.string(),
  },
  handler: async (ctx, args) => {
    const mux = await getMuxClient();

    await mux.video.assets.delete(args.muxAssetId);

    return { success: true };
  },
});

/**
 * CREATE LIVE STREAM
 *
 * Creates a new live stream for real-time broadcasting.
 * Returns RTMP credentials for OBS/encoder.
 *
 * @param webinarId - ID of the webinar
 * @param reducedLatency - Enable reduced latency mode (default: true)
 * @returns Live stream details including stream key
 */
export const createLiveStream = action({
  args: {
    webinarId: v.id("objects"),
    reducedLatency: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const mux = await getMuxClient();

    const liveStream = await mux.video.liveStreams.create({
      playback_policy: ["public"],
      new_asset_settings: {
        playback_policy: ["public"],
        passthrough: args.webinarId,
      },
      // Enable reduced latency for more interactive experience
      reduced_latency: args.reducedLatency ?? true,
      // Automatically generate a VOD asset when stream ends
      // recorded: true, // This is the default
      // Passthrough for webhook correlation
      passthrough: args.webinarId,
    });

    return {
      liveStreamId: liveStream.id,
      streamKey: liveStream.stream_key,
      status: liveStream.status,
      playbackId: liveStream.playback_ids?.[0]?.id,
      rtmpUrl: "rtmps://global-live.mux.com:443/app",
      // Full RTMP URL for OBS
      fullRtmpUrl: `rtmps://global-live.mux.com:443/app/${liveStream.stream_key}`,
    };
  },
});

/**
 * GET LIVE STREAM STATUS
 *
 * Gets the current status of a live stream.
 *
 * @param liveStreamId - Mux live stream ID
 * @returns Live stream status and details
 */
export const getLiveStreamStatus = action({
  args: {
    liveStreamId: v.string(),
  },
  handler: async (ctx, args) => {
    const mux = await getMuxClient();

    const liveStream = await mux.video.liveStreams.retrieve(args.liveStreamId);

    return {
      id: liveStream.id,
      status: liveStream.status, // "idle", "active", "disabled"
      playbackId: liveStream.playback_ids?.[0]?.id,
      activeAssetId: liveStream.active_asset_id,
      recentAssetIds: liveStream.recent_asset_ids,
      createdAt: liveStream.created_at,
    };
  },
});

/**
 * END LIVE STREAM
 *
 * Signals that the live stream is complete.
 * Mux will automatically create a VOD asset from the recording.
 *
 * @param liveStreamId - Mux live stream ID
 */
export const endLiveStream = action({
  args: {
    liveStreamId: v.string(),
  },
  handler: async (ctx, args) => {
    const mux = await getMuxClient();

    // Complete the live stream (triggers VOD asset creation)
    await mux.video.liveStreams.complete(args.liveStreamId);

    return { success: true };
  },
});

/**
 * DISABLE LIVE STREAM
 *
 * Disables a live stream (prevents further streaming).
 *
 * @param liveStreamId - Mux live stream ID
 */
export const disableLiveStream = action({
  args: {
    liveStreamId: v.string(),
  },
  handler: async (ctx, args) => {
    const mux = await getMuxClient();

    await mux.video.liveStreams.disable(args.liveStreamId);

    return { success: true };
  },
});

/**
 * ENABLE LIVE STREAM
 *
 * Re-enables a disabled live stream.
 *
 * @param liveStreamId - Mux live stream ID
 */
export const enableLiveStream = action({
  args: {
    liveStreamId: v.string(),
  },
  handler: async (ctx, args) => {
    const mux = await getMuxClient();

    await mux.video.liveStreams.enable(args.liveStreamId);

    return { success: true };
  },
});

/**
 * DELETE LIVE STREAM
 *
 * Deletes a live stream from Mux.
 *
 * @param liveStreamId - Mux live stream ID
 */
export const deleteLiveStream = action({
  args: {
    liveStreamId: v.string(),
  },
  handler: async (ctx, args) => {
    const mux = await getMuxClient();

    await mux.video.liveStreams.delete(args.liveStreamId);

    return { success: true };
  },
});

// ============================================================================
// INTERNAL ACTIONS (for webhook processing)
// ============================================================================

/**
 * INTERNAL: Process Mux webhook
 *
 * Handles incoming Mux webhook events and updates webinar status accordingly.
 */
export const processMuxWebhook = internalAction({
  args: {
    eventType: v.string(),
    eventId: v.string(),
    eventData: v.any(),
  },
  handler: async (ctx, args) => {
    console.log(`[Mux Webhook] Processing: ${args.eventType} (${args.eventId})`);

    const data = args.eventData;

    switch (args.eventType) {
      case "video.asset.created":
        console.log(`[Mux Webhook] Asset created: ${data.id}`);
        // Asset is being processed, update webinar status
        if (data.passthrough) {
          // Avoid deep type instantiation by requiring generated API at runtime
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const generatedApi: any = require("../_generated/api");
          await (ctx as any).runMutation(generatedApi.internal.webinarOntology.updateWebinarMuxStatus, {
            webinarId: data.passthrough,
            muxAssetId: data.id,
            status: "processing",
          });
        }
        break;

      case "video.asset.ready":
        console.log(`[Mux Webhook] Asset ready: ${data.id}`);
        // Asset is ready for playback
        if (data.passthrough) {
          const playbackId = data.playback_ids?.[0]?.id;
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const generatedApi: any = require("../_generated/api");
          await (ctx as any).runMutation(generatedApi.internal.webinarOntology.updateWebinarMuxStatus, {
            webinarId: data.passthrough,
            muxAssetId: data.id,
            muxPlaybackId: playbackId,
            status: "ready",
            duration: data.duration,
          });
        }
        break;

      case "video.asset.errored":
        console.error(`[Mux Webhook] Asset errored: ${data.id}`, data.errors);
        // Asset processing failed
        if (data.passthrough) {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const generatedApi: any = require("../_generated/api");
          await (ctx as any).runMutation(generatedApi.internal.webinarOntology.updateWebinarMuxStatus, {
            webinarId: data.passthrough,
            muxAssetId: data.id,
            status: "errored",
            error: JSON.stringify(data.errors),
          });
        }
        break;

      case "video.live_stream.active":
        console.log(`[Mux Webhook] Live stream active: ${data.id}`);
        // Live stream has started receiving data
        if (data.passthrough) {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const generatedApi: any = require("../_generated/api");
          await (ctx as any).runMutation(generatedApi.internal.webinarOntology.updateWebinarLiveStatus, {
            webinarId: data.passthrough,
            liveStreamId: data.id,
            status: "live",
            activeAssetId: data.active_asset_id,
          });
        }
        break;

      case "video.live_stream.idle":
        console.log(`[Mux Webhook] Live stream idle: ${data.id}`);
        // Live stream stopped receiving data
        if (data.passthrough) {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const generatedApi: any = require("../_generated/api");
          await (ctx as any).runMutation(generatedApi.internal.webinarOntology.updateWebinarLiveStatus, {
            webinarId: data.passthrough,
            liveStreamId: data.id,
            status: "idle",
          });
        }
        break;

      case "video.live_stream.recording":
        console.log(`[Mux Webhook] Live stream recording available: ${data.id}`);
        // Recording (VOD) is available from the live stream
        // The asset.ready webhook will handle the actual playback URL
        break;

      default:
        console.log(`[Mux Webhook] Unhandled event type: ${args.eventType}`);
    }

    return { processed: true };
  },
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// Note: verifyMuxWebhookSignature has been moved to convex/muxWebhookVerify.ts
// as an internalAction to avoid crypto bundler issues.

/**
 * Get thumbnail URL at a specific time
 *
 * @param playbackId - Mux playback ID
 * @param time - Time in seconds
 * @param width - Optional width (default: 640)
 * @param height - Optional height (default: 360)
 */
export function getThumbnailUrl(
  playbackId: string,
  time: number = 0,
  width: number = 640,
  height: number = 360
): string {
  return `https://image.mux.com/${playbackId}/thumbnail.png?time=${time}&width=${width}&height=${height}`;
}

/**
 * Get animated GIF URL for a time range
 *
 * @param playbackId - Mux playback ID
 * @param start - Start time in seconds
 * @param end - End time in seconds
 * @param width - Optional width (default: 320)
 */
export function getAnimatedGifUrl(
  playbackId: string,
  start: number = 0,
  end: number = 5,
  width: number = 320
): string {
  return `https://image.mux.com/${playbackId}/animated.gif?start=${start}&end=${end}&width=${width}`;
}
