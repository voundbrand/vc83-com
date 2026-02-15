#!/usr/bin/env tsx
/**
 * AGENT CLI — Local Test Tool with Agent Bootstrap
 *
 * Interactive CLI to test your agent with soul + harness.
 * If no active agent exists, walks you through creating one.
 *
 * Usage:
 *   npx tsx scripts/agent-cli.ts
 *   npx tsx scripts/agent-cli.ts --org <orgId>
 *   npx tsx scripts/agent-cli.ts --org <orgId> --fresh   # archive old agents, create new
 *
 * Environment variables (set in .env.local):
 *   TEST_ORG_ID — your organization ID
 *   NEXT_PUBLIC_CONVEX_URL — your Convex deployment URL
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env.local") });

import { ConvexHttpClient } from "convex/browser";
import * as readline from "readline";

// Dynamic require to avoid TS2589 deep type instantiation
// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-explicit-any
const { api } = require("../convex/_generated/api") as any;

// Parse CLI args
const cliArgs = process.argv.slice(2);
let orgId = process.env.TEST_ORG_ID || "";
let freshMode = false;

for (let i = 0; i < cliArgs.length; i++) {
  if (cliArgs[i] === "--org" && cliArgs[i + 1]) orgId = cliArgs[++i];
  if (cliArgs[i] === "--fresh") freshMode = true;
}

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || "";

if (!CONVEX_URL) {
  console.error("\x1b[31m  NEXT_PUBLIC_CONVEX_URL not set in .env.local\x1b[0m");
  process.exit(1);
}

if (!orgId) {
  console.error("\x1b[31m  No organization ID. Set TEST_ORG_ID in .env.local or use --org <id>\x1b[0m");
  process.exit(1);
}

const client = new ConvexHttpClient(CONVEX_URL);
const contactId = `cli-tester-${Date.now()}@test`;

// Colors
const c = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  magenta: "\x1b[35m",
  blue: "\x1b[34m",
  red: "\x1b[31m",
  bold: "\x1b[1m",
};

function createRL(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

function ask(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
}

// ============================================================================
// AGENT BOOTSTRAP — Create agent + soul from CLI
// ============================================================================

async function bootstrapAgent(rl: readline.Interface): Promise<boolean> {
  console.log(`\n${c.yellow}${c.bold}No active agent found for this organization.${c.reset}`);
  console.log(`${c.yellow}Let's create one with a soul.${c.reset}\n`);

  const create = await ask(rl, `${c.cyan}Create a new agent? (y/n): ${c.reset}`);
  if (create.toLowerCase() !== "y") {
    console.log(`${c.dim}Exiting. Create an agent from the UI or try again.${c.reset}`);
    return false;
  }

  // Gather info
  console.log(`\n${c.dim}Tell me about your agent (press Enter to skip any field):${c.reset}\n`);

  const name = await ask(rl, `${c.cyan}Agent name ${c.dim}(or let it name itself)${c.reset}${c.cyan}: ${c.reset}`) || "";
  const industry = await ask(rl, `${c.cyan}Industry ${c.dim}(e.g., real estate, SaaS, fitness)${c.reset}${c.cyan}: ${c.reset}`) || "";
  const audience = await ask(rl, `${c.cyan}Target audience ${c.dim}(e.g., small business owners)${c.reset}${c.cyan}: ${c.reset}`) || "";
  const tone = await ask(rl, `${c.cyan}Tone ${c.dim}(e.g., warm, professional, casual)${c.reset}${c.cyan}: ${c.reset}`) || "";
  const context = await ask(rl, `${c.cyan}Anything else? ${c.dim}(describe your business)${c.reset}${c.cyan}: ${c.reset}`) || "";

  console.log(`\n${c.dim}[Creating agent and generating soul... this takes ~10-15s]${c.reset}\n`);

  try {
    const result = await client.action(api.ai.soulGenerator.bootstrapAgent, {
      organizationId: orgId as any,
      name: name || "Agent",
      subtype: "general",
      industry: industry || undefined,
      targetAudience: audience || undefined,
      tonePreference: tone || undefined,
      additionalContext: context || undefined,
    });

    if (result.status === "success") {
      console.log(`${c.green}${c.bold}Agent created and activated!${c.reset}\n`);

      if (result.soul) {
        console.log(`${c.magenta}${c.bold}  Soul: ${result.soul.name}${c.reset}`);
        if (result.soul.tagline) {
          console.log(`${c.dim}  "${result.soul.tagline}"${c.reset}`);
        }
        if (result.soul.traits?.length) {
          console.log(`${c.dim}  Traits: ${result.soul.traits.join(", ")}${c.reset}`);
        }
      } else {
        console.log(`${c.yellow}  Soul generation skipped (agent created without soul)${c.reset}`);
      }

      console.log(`${c.dim}  Agent ID: ${result.agentId}${c.reset}`);
      console.log(`\n${c.green}Ready to chat!${c.reset}`);
      return true;
    } else {
      console.error(`${c.red}Failed to create agent: ${JSON.stringify(result)}${c.reset}`);
      return false;
    }
  } catch (error) {
    console.error(`${c.red}Error creating agent: ${error}${c.reset}`);
    return false;
  }
}

// ============================================================================
// CHAT LOOP
// ============================================================================

async function chatLoop(rl: readline.Interface) {
  console.log(`\n${c.dim}Type your message and press Enter. Ctrl+C to quit.${c.reset}`);
  console.log(`${c.dim}${"─".repeat(55)}${c.reset}\n`);

  const prompt = () => {
    rl.question(`${c.green}You: ${c.reset}`, async (message) => {
      if (!message.trim()) {
        prompt();
        return;
      }

      const startTime = Date.now();

      try {
        console.log(`${c.dim}[Processing...]${c.reset}`);

        const result = await client.action(api.ai.agentExecution.processInboundMessage, {
          organizationId: orgId as any,
          channel: "api_test",
          externalContactIdentifier: contactId,
          message: message.trim(),
          metadata: { providerId: "direct", source: "agent-cli" },
        });

        const elapsed = Date.now() - startTime;

        if (result.status === "success") {
          console.log(`\n${c.bold}${c.magenta}Agent: ${c.reset}${result.response}\n`);
          console.log(`${c.dim}[Stats] ${elapsed}ms | Session: ${result.sessionId}${c.reset}`);

          if (result.toolResults && result.toolResults.length > 0) {
            for (const tool of result.toolResults) {
              const icon = tool.status === "success" ? "✓" : tool.status === "pending_approval" ? "⏳" : "✗";
              console.log(`${c.dim}[Tool] ${icon} ${tool.tool} → ${tool.status}${c.reset}`);
            }
          }
        } else if (result.status === "error" && result.message?.includes("No active agent")) {
          // Agent was deleted or deactivated mid-session
          console.log(`\n${c.yellow}Agent no longer active. Run the script again to create a new one.${c.reset}`);
          process.exit(0);
        } else {
          console.log(`\n${c.red}[${result.status}] ${result.message}${c.reset}`);
        }

        console.log(`${c.dim}${"─".repeat(55)}${c.reset}\n`);
      } catch (error) {
        console.error(`\n${c.red}[Error] ${error}${c.reset}\n`);
      }

      prompt();
    });
  };

  prompt();
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log(`\n${c.bold}${c.cyan}╔══════════════════════════════════════════╗${c.reset}`);
  console.log(`${c.bold}${c.cyan}║       AGENT CLI — Soul + Harness         ║${c.reset}`);
  console.log(`${c.bold}${c.cyan}╚══════════════════════════════════════════╝${c.reset}\n`);

  console.log(`${c.dim}Organization: ${orgId}${c.reset}`);
  console.log(`${c.dim}Contact ID:   ${contactId}${c.reset}`);
  console.log(`${c.dim}Channel:      api_test${c.reset}`);
  console.log(`${c.dim}Convex:       ${CONVEX_URL}${c.reset}`);

  const rl = createRL();

  // Handle --fresh: archive existing agents first
  if (freshMode) {
    console.log(`\n${c.yellow}${c.bold}--fresh mode: archiving existing agents...${c.reset}`);
    try {
      const result = await client.action(api.ai.soulGenerator.freshBootstrap, {
        organizationId: orgId as any,
      });
      console.log(`${c.green}Archived ${(result as any)?.archivedCount || 0} agent(s). Starting fresh.${c.reset}`);
    } catch (e) {
      console.error(`${c.red}Failed to archive agents: ${e}${c.reset}`);
      console.log(`${c.yellow}Continuing anyway — bootstrap will create a new agent.${c.reset}`);
    }
  }

  // Test if an agent exists by sending a probe
  console.log(`\n${c.dim}[Checking for active agent...]${c.reset}`);

  try {
    const probe = await client.action(api.ai.agentExecution.processInboundMessage, {
      organizationId: orgId as any,
      channel: "api_test",
      externalContactIdentifier: contactId,
      message: "__probe__",
      metadata: { providerId: "direct", source: "agent-cli-probe" },
    });

    if (probe.status === "error" && probe.message?.includes("No active agent")) {
      // No agent — offer to create one
      const created = await bootstrapAgent(rl);
      if (!created) {
        rl.close();
        process.exit(0);
      }
    } else if (freshMode) {
      // --fresh was passed but an agent still responded (archive may have failed)
      // Force bootstrap anyway
      console.log(`${c.yellow}Agent still active after archive — forcing fresh bootstrap...${c.reset}`);
      const created = await bootstrapAgent(rl);
      if (!created) {
        rl.close();
        process.exit(0);
      }
    } else if (probe.status === "success") {
      // Agent exists and responded to probe — show its name
      console.log(`${c.green}Agent found and ready.${c.reset}`);
    } else {
      // Other status (rate limited, credits, etc.) — agent exists
      console.log(`${c.yellow}Agent found (status: ${probe.status}).${c.reset}`);
    }
  } catch (error) {
    console.error(`${c.red}[Error] Could not reach Convex: ${error}${c.reset}`);
    rl.close();
    process.exit(1);
  }

  // Start chat loop
  await chatLoop(rl);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
