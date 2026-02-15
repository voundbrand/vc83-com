#!/usr/bin/env tsx
/**
 * TELEGRAM BRIDGE — Bot API Long-Polling Relay
 *
 * Connects your Telegram bot to the agent pipeline via long-polling.
 * No webhook setup needed — just run it and start messaging the bot.
 *
 * Usage:
 *   npx tsx scripts/telegram-bridge.ts
 *   npx tsx scripts/telegram-bridge.ts --org <orgId>       # Skip resolver, use fixed org
 *   npx tsx scripts/telegram-bridge.ts --fresh              # Archive old agents first
 *
 * Environment variables (set in .env.local):
 *   TELEGRAM_BOT_TOKEN — your bot token from @BotFather
 *   NEXT_PUBLIC_CONVEX_URL — your Convex deployment URL
 *   TEST_ORG_ID — fallback org ID (used if no resolver match)
 */

import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(__dirname, "../.env.local") });

import { ConvexHttpClient } from "convex/browser";

// Dynamic require to avoid TS2589 deep type instantiation
// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-explicit-any
const { api } = require("../convex/_generated/api") as any;

// Parse CLI args
const cliArgs = process.argv.slice(2);
let fixedOrgId = "";
let freshMode = false;
let useResolver = true;

for (let i = 0; i < cliArgs.length; i++) {
  if (cliArgs[i] === "--org" && cliArgs[i + 1]) {
    fixedOrgId = cliArgs[++i];
    useResolver = false;
  }
  if (cliArgs[i] === "--fresh") freshMode = true;
}

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || "";
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// Validate
if (!BOT_TOKEN) {
  console.error("❌ TELEGRAM_BOT_TOKEN not set in .env.local");
  console.error("   Get one from @BotFather on Telegram");
  process.exit(1);
}
if (!CONVEX_URL) {
  console.error("❌ NEXT_PUBLIC_CONVEX_URL not set in .env.local");
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

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from?: {
      id: number;
      first_name?: string;
      last_name?: string;
      username?: string;
    };
    chat: { id: number; type: string; title?: string };
    date: number;
    text?: string;
    // Media types (Step 9)
    voice?: { file_id: string; duration: number; mime_type?: string };
    photo?: Array<{ file_id: string; width: number; height: number }>;
    document?: { file_id: string; file_name?: string; mime_type?: string };
    audio?: { file_id: string; file_name?: string; title?: string; mime_type?: string };
  };
  // Callback queries (Step 7: Soul Evolution inline buttons)
  callback_query?: {
    id: string;
    data?: string;
    from?: { id: number };
    message?: { chat?: { id: number } };
  };
  // Bot added/removed from groups (Step 8)
  my_chat_member?: {
    chat: { id: number; type: string; title?: string };
    from?: { id: number };
    new_chat_member?: { status: string };
  };
}

interface TelegramGetUpdatesResponse {
  ok: boolean;
  result: TelegramUpdate[];
}

async function getBotInfo() {
  const res = await fetch(`${TELEGRAM_API}/getMe`);
  const data = (await res.json()) as {
    ok: boolean;
    result?: { username?: string; first_name?: string };
  };
  if (!data.ok) throw new Error("Failed to fetch bot info — check your token");
  return data.result;
}

async function sendMessage(chatId: string, text: string) {
  const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "Markdown",
    }),
  });
  const data = (await res.json()) as { ok: boolean; description?: string };
  if (!data.ok) {
    // Retry without Markdown if parse fails
    if (data.description?.includes("parse")) {
      await fetch(`${TELEGRAM_API}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text }),
      });
    } else {
      console.error(`${c.red}[Telegram] Failed to send: ${data.description}${c.reset}`);
    }
  }
}

// Helper: resolve Telegram file_id to download URL (Step 9: Rich Media)
async function getTelegramFileUrl(fileId: string): Promise<string | null> {
  try {
    const res = await fetch(`${TELEGRAM_API}/getFile?file_id=${fileId}`);
    const data = (await res.json()) as { ok: boolean; result?: { file_path?: string } };
    if (data.ok && data.result?.file_path) {
      return `https://api.telegram.org/file/bot${BOT_TOKEN}/${data.result.file_path}`;
    }
  } catch (e) {
    console.error(`${c.red}[Media] Failed to resolve file: ${e}${c.reset}`);
  }
  return null;
}

async function startBridge() {
  const botInfo = await getBotInfo();
  const botName = botInfo?.username ? `@${botInfo.username}` : botInfo?.first_name || "Bot";

  console.log(`\n${c.bold}${c.cyan}╔══════════════════════════════════════════╗${c.reset}`);
  console.log(`${c.bold}${c.cyan}║   TELEGRAM BRIDGE — Bot API Relay        ║${c.reset}`);
  console.log(`${c.bold}${c.cyan}╚══════════════════════════════════════════╝${c.reset}\n`);

  console.log(`${c.dim}Bot:          ${botName}${c.reset}`);
  console.log(`${c.dim}Convex:       ${CONVEX_URL}${c.reset}`);
  console.log(`${c.dim}Mode:         ${useResolver ? "Resolver (auto-route)" : `Fixed org: ${fixedOrgId}`}${c.reset}`);
  if (freshMode) {
    console.log(`${c.yellow}${c.bold}--fresh mode enabled${c.reset}`);
  }
  console.log(`${c.dim}${"─".repeat(55)}${c.reset}\n`);

  // Handle --fresh: archive existing agents first
  if (freshMode && fixedOrgId) {
    console.log(`${c.yellow}Archiving existing agents...${c.reset}`);
    try {
      const result = await convex.action(api.ai.soulGenerator.freshBootstrap, {
        organizationId: fixedOrgId as any,
      });
      console.log(`${c.green}Archived ${(result as any)?.archivedCount || 0} agent(s).${c.reset}\n`);
    } catch (e) {
      console.error(`${c.red}Failed to archive agents: ${e}${c.reset}`);
    }
  }

  console.log(`${c.green}${c.bold}✅ Connected! Listening for messages...${c.reset}`);
  console.log(`${c.dim}Message ${botName} on Telegram to test${c.reset}\n`);

  let offset = 0;

  // Long-polling loop
  while (true) {
    try {
      const res = await fetch(
        `${TELEGRAM_API}/getUpdates?offset=${offset}&timeout=30`,
        { signal: AbortSignal.timeout(35000) }
      );
      const data = (await res.json()) as TelegramGetUpdatesResponse;

      if (!data.ok || !data.result) continue;

      for (const update of data.result) {
        offset = update.update_id + 1;

        // Handle callback queries (Step 7: Soul Evolution inline buttons)
        if (update.callback_query) {
          const cb = update.callback_query;
          const callbackData = cb.data || "";
          const cbChatId = String(cb.message?.chat?.id || "");

          if (callbackData.startsWith("soul_")) {
            console.log(`${c.yellow}[Callback] Soul action: ${callbackData}${c.reset}`);
            try {
              await convex.action(
                api.ai.soulEvolution.handleTelegramCallback,
                {
                  callbackData,
                  telegramChatId: cbChatId,
                  callbackQueryId: cb.id,
                }
              );
            } catch (e) {
              console.error(`${c.red}[Callback] Failed: ${e}${c.reset}`);
            }
          }
          continue;
        }

        // Handle bot added/removed from groups (Step 8: Telegram Group Chat)
        if (update.my_chat_member) {
          const member = update.my_chat_member;
          const chatType = member.chat?.type;
          const newStatus = member.new_chat_member?.status;

          if ((chatType === "group" || chatType === "supergroup")
              && (newStatus === "member" || newStatus === "administrator")) {
            console.log(`${c.green}[Group] Bot added to group: ${member.chat.title || member.chat.id}${c.reset}`);
            try {
              await convex.action(
                api.channels.telegramGroupSetup.handleBotAddedToGroup,
                {
                  groupChatId: String(member.chat.id),
                  groupTitle: member.chat.title || "Unknown Group",
                  addedByUserId: String(member.from?.id || ""),
                }
              );
            } catch (e) {
              console.error(`${c.red}[Group] Setup failed: ${e}${c.reset}`);
            }
          }
          continue;
        }

        const msg = update.message;
        if (!msg) continue;

        // Handle messages from groups (Step 8: owner instructions)
        if (msg.chat?.type === "group" || msg.chat?.type === "supergroup") {
          const groupChatId = String(msg.chat.id);
          const groupText = msg.text || "";

          if (groupText === "/mute") {
            try {
              await convex.mutation(api.channels.telegramGroupSetup.toggleMirror, {
                groupChatId, enabled: false,
              });
              await sendMessage(groupChatId, "Mirroring paused. Use /unmute to resume.");
            } catch (e) {
              console.error(`${c.red}[Group] Mute failed: ${e}${c.reset}`);
            }
            continue;
          }
          if (groupText === "/unmute") {
            try {
              await convex.mutation(api.channels.telegramGroupSetup.toggleMirror, {
                groupChatId, enabled: true,
              });
              await sendMessage(groupChatId, "Mirroring resumed.");
            } catch (e) {
              console.error(`${c.red}[Group] Unmute failed: ${e}${c.reset}`);
            }
            continue;
          }

          // Owner messages in group → treated as instructions to the PM
          if (groupText && !groupText.startsWith("/")) {
            try {
              const orgMapping = await convex.query(
                api.channels.telegramGroupSetup.getOrgForGroup,
                { groupChatId }
              );

              if (orgMapping?.organizationId) {
                const groupSenderName = [msg.from?.first_name, msg.from?.last_name].filter(Boolean).join(" ");
                console.log(`${c.blue}[Group] ${groupSenderName}: ${groupText}${c.reset}`);

                const result = await convex.action(
                  api.ai.agentExecution.processInboundMessage,
                  {
                    organizationId: orgMapping.organizationId as any,
                    channel: "telegram",
                    externalContactIdentifier: groupChatId,
                    message: groupText,
                    metadata: {
                      providerId: "telegram",
                      source: "telegram-group",
                      senderName: groupSenderName,
                      isOwnerInstruction: true,
                      skipOutbound: true,
                    },
                  }
                );

                if (result.status === "success" && result.response) {
                  const agentDisplayName = result.agentName || "Agent";
                  await sendMessage(groupChatId, `*${agentDisplayName}:* ${result.response}`);
                }
              }
            } catch (e) {
              console.error(`${c.red}[Group] Message handling failed: ${e}${c.reset}`);
            }
          }
          continue;
        }

        // DM message handling (existing logic)
        if (!msg.text && !msg.voice && !msg.photo && !msg.document && !msg.audio) continue;

        const chatId = String(msg.chat.id);
        const senderName = [msg.from?.first_name, msg.from?.last_name]
          .filter(Boolean)
          .join(" ");
        const senderHandle = msg.from?.username ? `@${msg.from.username}` : chatId;

        // Handle /start deep links (Step 11: Sub-org routing)
        const msgText = msg.text || "";
        let startParam: string | undefined;
        if (msgText.startsWith("/start ")) {
          startParam = msgText.slice(7).trim();
          console.log(`${c.magenta}[DeepLink] /start param: ${startParam}${c.reset}`);
        }

        // Build attachments array (Step 9: Rich Media)
        const msgAttachments: Array<{ type: string; url: string; name?: string }> = [];
        if (msg.voice) {
          const fileUrl = await getTelegramFileUrl(msg.voice.file_id);
          if (fileUrl) {
            msgAttachments.push({
              type: msg.voice.mime_type || "audio/ogg",
              url: fileUrl,
              name: `voice_${msg.voice.duration}s`,
            });
          }
        }
        if (msg.photo) {
          const largest = msg.photo[msg.photo.length - 1];
          const fileUrl = await getTelegramFileUrl(largest.file_id);
          if (fileUrl) {
            msgAttachments.push({ type: "image/jpeg", url: fileUrl });
          }
        }
        if (msg.document) {
          const fileUrl = await getTelegramFileUrl(msg.document.file_id);
          if (fileUrl) {
            msgAttachments.push({
              type: msg.document.mime_type || "application/octet-stream",
              url: fileUrl,
              name: msg.document.file_name,
            });
          }
        }
        if (msg.audio) {
          const fileUrl = await getTelegramFileUrl(msg.audio.file_id);
          if (fileUrl) {
            msgAttachments.push({
              type: msg.audio.mime_type || "audio/mpeg",
              url: fileUrl,
              name: msg.audio.file_name || msg.audio.title,
            });
          }
        }

        console.log(
          `${c.bold}${c.blue}[Telegram] ${senderName} (${senderHandle}):${c.reset} ${msg.text}`
        );

        const startTime = Date.now();

        try {
          let orgId = fixedOrgId;

          // Use resolver if no fixed org
          if (useResolver) {
            console.log(`${c.dim}[Resolver] Resolving chat_id ${chatId}...${c.reset}`);
            const resolution = await convex.action(
              api.onboarding.telegramResolver.resolveChatToOrg,
              { telegramChatId: chatId, senderName, startParam }
            );
            orgId = resolution.organizationId;

            if (resolution.isNew) {
              console.log(`${c.green}[Resolver] New user → System Bot onboarding${c.reset}`);
            } else if (resolution.routeToSystemBot) {
              console.log(`${c.yellow}[Resolver] Resuming onboarding → System Bot${c.reset}`);
            } else {
              console.log(`${c.dim}[Resolver] Known user → org ${orgId}${c.reset}`);
            }
          }

          if (!orgId) {
            console.error(`${c.red}[Error] No org ID resolved and no --org flag${c.reset}`);
            await sendMessage(chatId, "Sorry, I couldn't route your message. Please try again later.");
            continue;
          }

          // Route through agent pipeline
          console.log(`${c.dim}[Pipeline] Routing to agent...${c.reset}`);

          const result = await convex.action(
            api.ai.agentExecution.processInboundMessage,
            {
              organizationId: orgId as any,
              channel: "telegram",
              externalContactIdentifier: chatId,
              message: startParam
                ? "Hello" // Deep link routing — send greeting instead of "/start slug"
                : (msg.text || (msgAttachments.length > 0 ? "[media message]" : "")),
              metadata: {
                providerId: "telegram_bot",
                source: "telegram-bridge",
                senderName,
                skipOutbound: true, // We send reply ourselves
                attachments: msgAttachments.length > 0 ? msgAttachments : undefined,
              },
            }
          );

          const elapsed = Date.now() - startTime;

          if (result.status === "success" && result.response) {
            const displayText = result.agentName
              ? `*${result.agentName}:* ${result.response}`
              : result.response;
            await sendMessage(chatId, displayText);
            console.log(`${c.bold}${c.magenta}[${result.agentName || "Agent"}]:${c.reset} ${result.response}`);
            console.log(
              `${c.dim}[Stats] ${elapsed}ms | Session: ${result.sessionId}${c.reset}`
            );

            if (result.toolResults?.length) {
              for (const tool of result.toolResults) {
                const icon =
                  tool.status === "success"
                    ? "✓"
                    : tool.status === "pending_approval"
                      ? "⏳"
                      : "✗";
                console.log(
                  `${c.dim}[Tool] ${icon} ${tool.tool} → ${tool.status}${c.reset}`
                );
              }
            }
          } else {
            console.log(`${c.red}[${result.status}] ${result.message}${c.reset}`);
            if (result.status === "rate_limited") {
              await sendMessage(
                chatId,
                "I'm taking a short break. Please try again in a moment!"
              );
            }
          }

          console.log(`${c.dim}${"─".repeat(55)}${c.reset}\n`);
        } catch (error) {
          console.error(
            `${c.red}[Error] Failed to process message: ${error}${c.reset}\n`
          );
          await sendMessage(
            chatId,
            "Sorry, something went wrong. Please try again."
          );
        }
      }
    } catch (error) {
      // Network error in long-polling — retry after brief pause
      if (String(error).includes("TimeoutError") || String(error).includes("abort")) {
        continue; // Normal timeout, just re-poll
      }
      console.error(`${c.red}[Poll] Error: ${error}${c.reset}`);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

startBridge().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
