#!/usr/bin/env tsx
/**
 * WHATSAPP BRIDGE — Baileys QR Code Relay
 *
 * Connects a personal WhatsApp number to your agent pipeline via QR code.
 * No Meta Business API needed — just scan and go.
 *
 * Inspired by OpenClaw's approach:
 * "The CLI message comes in. I call the CLI with -p. It does its magic,
 *  I get the string back and I send it back to WhatsApp."
 *
 * Usage:
 *   npx tsx scripts/whatsapp-bridge.ts
 *   npx tsx scripts/whatsapp-bridge.ts --org <orgId>
 *   npx tsx scripts/whatsapp-bridge.ts --org <orgId> --fresh   # archive old agents first
 *
 * First run: scans QR code in terminal, creates auth session
 * Subsequent runs: reconnects automatically
 *
 * Environment variables (set in .env.local):
 *   TEST_ORG_ID — your organization ID
 *   NEXT_PUBLIC_CONVEX_URL — your Convex deployment URL
 *
 * WARNING: Using unofficial WhatsApp APIs may violate WhatsApp ToS.
 * Use this for development/demo purposes only, not production.
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env.local") });

import { ConvexHttpClient } from "convex/browser";

// Dynamic require to avoid TS2589 deep type instantiation
// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-explicit-any
const { api } = require("../convex/_generated/api") as any;

// Baileys imports (installed separately)
let makeWASocket: any;
let useMultiFileAuthState: any;
let DisconnectReason: any;
let Boom: any;

async function loadDependencies() {
  try {
    const baileys = await import("@whiskeysockets/baileys");
    makeWASocket = baileys.default;
    useMultiFileAuthState = baileys.useMultiFileAuthState;
    DisconnectReason = baileys.DisconnectReason;
  } catch {
    console.error("❌ @whiskeysockets/baileys not installed.");
    console.error("   Run: npm install @whiskeysockets/baileys");
    process.exit(1);
  }

  try {
    const boom = await import("@hapi/boom");
    Boom = boom;
  } catch {
    console.error("❌ @hapi/boom not installed.");
    console.error("   Run: npm install @hapi/boom");
    process.exit(1);
  }
}

// Parse CLI args
const cliArgs = process.argv.slice(2);
let orgId = process.env.TEST_ORG_ID || "";
let freshMode = false;

for (let i = 0; i < cliArgs.length; i++) {
  if (cliArgs[i] === "--org" && cliArgs[i + 1]) orgId = cliArgs[++i];
  if (cliArgs[i] === "--fresh") freshMode = true;
}

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || "";
const AUTH_DIR = resolve(__dirname, "../.whatsapp-auth");

if (!CONVEX_URL) {
  console.error("❌ NEXT_PUBLIC_CONVEX_URL not set in .env.local");
  process.exit(1);
}

if (!orgId) {
  console.error("❌ No organization ID. Set TEST_ORG_ID in .env.local or use --org <id>");
  process.exit(1);
}

const convex = new ConvexHttpClient(CONVEX_URL);

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

// Track which messages we've already processed (avoid echo loops)
const processedMessages = new Set<string>();

async function startBridge() {
  await loadDependencies();

  console.log(`\n${c.bold}${c.cyan}╔══════════════════════════════════════════╗${c.reset}`);
  console.log(`${c.bold}${c.cyan}║   WHATSAPP BRIDGE — Baileys QR Relay     ║${c.reset}`);
  console.log(`${c.bold}${c.cyan}╚══════════════════════════════════════════╝${c.reset}\n`);

  console.log(`${c.dim}Organization: ${orgId}${c.reset}`);
  console.log(`${c.dim}Convex:       ${CONVEX_URL}${c.reset}`);
  console.log(`${c.dim}Auth dir:     ${AUTH_DIR}${c.reset}`);
  console.log(`${c.yellow}\n⚠️  Dev/demo use only — not for production${c.reset}\n`);

  // Handle --fresh: archive existing agents first
  if (freshMode) {
    console.log(`${c.yellow}${c.bold}--fresh mode: archiving existing agents...${c.reset}`);
    try {
      const result = await convex.action(api.ai.soulGenerator.freshBootstrap, {
        organizationId: orgId as any,
      });
      console.log(`${c.green}Archived ${(result as any)?.archivedCount || 0} agent(s). Starting fresh.${c.reset}\n`);
    } catch (e) {
      console.error(`${c.red}Failed to archive agents: ${e}${c.reset}`);
    }
  }

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true, // Shows QR code in terminal to scan
  });

  // Save auth credentials on update
  sock.ev.on("creds.update", saveCreds);

  // Handle connection events
  sock.ev.on("connection.update", (update: any) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log(`${c.yellow}📱 Scan the QR code above with WhatsApp${c.reset}\n`);
    }

    if (connection === "close") {
      const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      if (shouldReconnect) {
        console.log(`${c.yellow}Reconnecting...${c.reset}`);
        startBridge();
      } else {
        console.log(`${c.red}Logged out. Delete ${AUTH_DIR} and restart to re-authenticate.${c.reset}`);
      }
    } else if (connection === "open") {
      console.log(`${c.green}${c.bold}✅ Connected to WhatsApp!${c.reset}`);
      console.log(`${c.dim}Listening for incoming messages...${c.reset}`);
      console.log(`${c.dim}${"─".repeat(55)}${c.reset}\n`);
    }
  });

  // Handle incoming messages
  sock.ev.on("messages.upsert", async (m: any) => {
    const messages = m.messages || [];

    for (const msg of messages) {
      // Skip our own messages and status broadcasts
      if (msg.key.fromMe) continue;
      if (msg.key.remoteJid === "status@broadcast") continue;

      // Skip already-processed messages
      const msgId = msg.key.id;
      if (processedMessages.has(msgId)) continue;
      processedMessages.add(msgId);

      // Extract message content
      const text =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        msg.message?.imageMessage?.caption ||
        null;

      if (!text) {
        // Non-text message (image, audio, video, etc.)
        const msgType = Object.keys(msg.message || {})[0] || "unknown";
        console.log(`${c.dim}[Skipped] Non-text message (${msgType}) from ${msg.key.remoteJid}${c.reset}`);
        continue;
      }

      // Extract sender info
      const sender = msg.key.remoteJid || "";
      const senderPhone = sender.replace("@s.whatsapp.net", "");
      const pushName = msg.pushName || senderPhone;

      console.log(`${c.bold}${c.blue}[WhatsApp] ${pushName} (${senderPhone}):${c.reset} ${text}`);

      const startTime = Date.now();

      try {
        // Send through agent pipeline
        console.log(`${c.dim}[Harness] Routing to agent pipeline...${c.reset}`);

        const result = await convex.action(api.ai.agentExecution.processInboundMessage, {
          organizationId: orgId as any,
          channel: "whatsapp",
          externalContactIdentifier: senderPhone,
          message: text,
          metadata: {
            providerId: "baileys_bridge",
            source: "whatsapp-bridge",
            senderName: pushName,
            skipOutbound: true, // We'll send the reply ourselves via Baileys
          },
        });

        const elapsed = Date.now() - startTime;

        if (result.status === "success" && result.response) {
          // Send reply back via WhatsApp
          await sock.sendMessage(sender, { text: result.response });

          console.log(`${c.bold}${c.magenta}[Agent]:${c.reset} ${result.response}`);
          console.log(`${c.dim}[Stats] ${elapsed}ms | Session: ${result.sessionId}${c.reset}`);

          // Tool calls
          if (result.toolResults && result.toolResults.length > 0) {
            for (const tool of result.toolResults) {
              const icon = tool.status === "success" ? "✓" : tool.status === "pending_approval" ? "⏳" : "✗";
              console.log(`${c.dim}[Tool] ${icon} ${tool.tool} → ${tool.status}${c.reset}`);
            }
          }
        } else {
          console.log(`${c.red}[${result.status}] ${result.message}${c.reset}`);
          // Optionally send error reply
          if (result.status === "rate_limited") {
            await sock.sendMessage(sender, {
              text: "I'm taking a short break. Please try again in a moment!",
            });
          }
        }

        console.log(`${c.dim}${"─".repeat(55)}${c.reset}\n`);
      } catch (error) {
        console.error(`${c.red}[Error] Failed to process message: ${error}${c.reset}\n`);
      }
    }
  });
}

startBridge().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
