import type { SidecarClient } from "./sidecar-client.js";

/**
 * Lifecycle hooks for the OpenClaw agent runtime.
 *
 * before_agent_start: Verify compliance sidecar is reachable and ready.
 *   If fail_closed=true (default), agent cannot start without sidecar.
 *
 * agent_end: Flush audit buffer and record session summary.
 */

export interface HookConfig {
  failClosed: boolean;
  autoAudit: boolean;
}

export function createHooks(client: SidecarClient, config: HookConfig) {
  return {
    /**
     * Called before an agent session starts.
     * Verifies the compliance sidecar is healthy and ready.
     *
     * Returns { allow: boolean, reason: string }
     */
    before_agent_start: async (context: {
      agent_id: string;
      session_id: string;
      subject_id?: string;
    }) => {
      try {
        const healthy = await client.healthy();
        const ready = await client.ready();

        if (!healthy || !ready) {
          if (config.failClosed) {
            return {
              allow: false,
              reason: "Compliance sidecar not ready — agent start blocked (fail-closed)",
            };
          }
          // Warn but allow in non-fail-closed mode
          return {
            allow: true,
            reason: "Compliance sidecar not ready — proceeding in degraded mode",
          };
        }

        // Record agent start in audit trail
        if (config.autoAudit) {
          await client.recordAudit({
            event_type: "agent.start",
            actor: context.agent_id,
            subject_id: context.subject_id,
            action: "start_session",
            outcome: "allowed",
            details: { session_id: context.session_id },
          });
        }

        return { allow: true, reason: "Compliance sidecar ready" };
      } catch (err) {
        if (config.failClosed) {
          return {
            allow: false,
            reason: `Compliance sidecar unreachable — agent start blocked: ${err}`,
          };
        }
        return {
          allow: true,
          reason: `Compliance sidecar unreachable — proceeding in degraded mode`,
        };
      }
    },

    /**
     * Called when an agent session ends.
     * Records session summary in audit trail.
     */
    agent_end: async (context: {
      agent_id: string;
      session_id: string;
      subject_id?: string;
      tool_calls?: number;
      duration_ms?: number;
    }) => {
      if (!config.autoAudit) return;

      try {
        await client.recordAudit({
          event_type: "agent.end",
          actor: context.agent_id,
          subject_id: context.subject_id,
          action: "end_session",
          outcome: "completed",
          details: {
            session_id: context.session_id,
            tool_calls: context.tool_calls,
            duration_ms: context.duration_ms,
          },
        });
      } catch {
        // Best-effort audit on session end
      }
    },
  };
}
