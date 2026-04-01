/**
 * OpenClaw Plugin Entry Point — Compliance Engine
 *
 * Registers compliance tools, hooks, commands, and services
 * with the OpenClaw agent runtime.
 *
 * Usage:
 *   This file is referenced by openclaw.plugin.json
 *   and loaded by the OpenClaw plugin system.
 */

import { SidecarClient } from "./src/sidecar-client.js";
import { createTools } from "./src/tools.js";
import { createHooks } from "./src/hooks.js";
import { createCommands } from "./src/commands.js";
import { createHealthService } from "./src/service.js";

interface PluginConfig {
  sidecar_url?: string;
  fail_closed?: boolean;
  auto_audit?: boolean;
}

/**
 * Plugin registration function.
 * Called by the OpenClaw runtime when the plugin is loaded.
 *
 * @param api - The OpenClaw plugin API
 */
export function register(api: {
  registerTool: (tool: { name: string; description: string; handler: Function }) => void;
  registerHook: (name: string, handler: Function) => void;
  registerCommand: (command: { name: string; description: string; handler: Function }) => void;
  registerService: (service: { name: string; start: Function; stop: Function }) => void;
  getConfig: () => PluginConfig;
}) {
  const config = api.getConfig();
  const sidecarUrl = config.sidecar_url ?? "http://127.0.0.1:3335";
  const failClosed = config.fail_closed ?? true;
  const autoAudit = config.auto_audit ?? true;

  const client = new SidecarClient({ baseUrl: sidecarUrl });

  // Register tools
  const tools = createTools(client);
  for (const tool of tools) {
    api.registerTool(tool);
  }

  // Register hooks
  const hooks = createHooks(client, { failClosed, autoAudit });
  api.registerHook("before_agent_start", hooks.before_agent_start);
  api.registerHook("agent_end", hooks.agent_end);

  // Register commands
  const commands = createCommands(client);
  api.registerCommand(commands.compliance);

  // Register health monitoring service
  const healthService = createHealthService(client);
  api.registerService(healthService);
}
