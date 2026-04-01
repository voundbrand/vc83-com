import type { SidecarClient } from "./sidecar-client.js";

/**
 * Background service that monitors sidecar health.
 *
 * OpenClaw plugins can register services that run in the background.
 * This service periodically checks sidecar health and provides
 * status to the agent runtime.
 */

export interface HealthStatus {
  healthy: boolean;
  ready: boolean;
  lastCheck: string;
  consecutiveFailures: number;
}

export function createHealthService(
  client: SidecarClient,
  intervalMs = 30_000,
) {
  let status: HealthStatus = {
    healthy: false,
    ready: false,
    lastCheck: new Date().toISOString(),
    consecutiveFailures: 0,
  };

  let timer: ReturnType<typeof setInterval> | null = null;

  async function check() {
    try {
      const healthy = await client.healthy();
      const ready = await client.ready();

      status = {
        healthy,
        ready,
        lastCheck: new Date().toISOString(),
        consecutiveFailures: healthy ? 0 : status.consecutiveFailures + 1,
      };
    } catch {
      status = {
        healthy: false,
        ready: false,
        lastCheck: new Date().toISOString(),
        consecutiveFailures: status.consecutiveFailures + 1,
      };
    }
  }

  return {
    name: "compliance_health",

    start: async () => {
      await check();
      timer = setInterval(check, intervalMs);
    },

    stop: () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    },

    getStatus: () => ({ ...status }),
  };
}
