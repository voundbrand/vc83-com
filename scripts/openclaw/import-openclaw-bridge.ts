#!/usr/bin/env npx tsx

import fs from "fs";
import path from "path";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";

interface ImportPayload {
  authProfiles: Array<{
    profileId: string;
    provider: string;
    apiKey?: string;
    token?: string;
    baseUrl?: string;
    enabled?: boolean;
    priority?: number;
    billingSource?: string;
    label?: string;
    defaultVoiceId?: string;
  }>;
  privateModels?: Array<{
    modelId: string;
    provider: string;
    label?: string;
    setAsDefault?: boolean;
  }>;
}

function readArg(args: string[], name: string): string | null {
  const prefix = `--${name}=`;
  const direct = args.find((arg) => arg.startsWith(prefix));
  if (direct) {
    return direct.slice(prefix.length).trim();
  }
  const index = args.findIndex((arg) => arg === `--${name}`);
  if (index === -1) {
    return null;
  }
  return args[index + 1]?.trim() ?? null;
}

function parseInputPayload(inputPath: string): ImportPayload {
  const resolvedPath = path.resolve(inputPath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Input file not found: ${resolvedPath}`);
  }
  const raw = fs.readFileSync(resolvedPath, "utf8");
  const payload = JSON.parse(raw) as ImportPayload;
  if (!Array.isArray(payload.authProfiles)) {
    throw new Error("Input payload must include authProfiles[]");
  }
  return payload;
}

async function main() {
  const args = process.argv.slice(2);
  const inputPath = readArg(args, "input");
  const sessionId = readArg(args, "session-id");
  const organizationId = readArg(args, "organization-id");
  const dryRun = args.includes("--dry-run");

  if (!inputPath || !sessionId || !organizationId) {
    throw new Error(
      [
        "Usage: npx tsx scripts/openclaw/import-openclaw-bridge.ts",
        "--input <path>",
        "--session-id <session>",
        "--organization-id <org>",
        "[--dry-run]",
      ].join(" ")
    );
  }

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
  if (!convexUrl) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is required.");
  }

  const payload = parseInputPayload(inputPath);
  const client = new ConvexHttpClient(convexUrl);
  const result = await client.mutation(
    (api as any).integrations.openclawBridge.importOpenClawBridge,
    {
      sessionId,
      organizationId,
      dryRun,
      payload,
    }
  );

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`❌ OpenClaw bridge import failed: ${message}`);
  process.exit(1);
});
