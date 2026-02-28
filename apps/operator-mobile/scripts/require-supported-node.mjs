#!/usr/bin/env node

const [, , commandHint = "expo-command"] = process.argv;
const [majorRaw] = process.versions.node.split(".");
const major = Number.parseInt(majorRaw, 10);

const minSupported = 20;
const maxExclusive = 24;

if (Number.isNaN(major) || major < minSupported || major >= maxExclusive) {
  const current = process.versions.node;
  console.error("");
  console.error("Unsupported Node.js version for operator-mobile Expo commands.");
  console.error(`Detected: v${current}`);
  console.error(`Required: >=${minSupported} and <${maxExclusive}`);
  console.error(`Blocked command: ${commandHint}`);
  console.error("");
  console.error("Use a supported runtime before running Expo commands:");
  console.error("  1) cd apps/operator-mobile");
  console.error("  2) nvm use (or nvm install)");
  console.error("");
  console.error(
    "Reason: Expo CLI on Node 24 can fail early with ERR_SOCKET_BAD_PORT (65536) during iOS runs."
  );
  process.exit(1);
}

