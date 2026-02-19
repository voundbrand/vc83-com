import fs from "node:fs/promises";
import path from "node:path";
import { ConvexHttpClient } from "convex/browser";
import type { FullConfig } from "@playwright/test";
import dotenv from "dotenv";

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
const { api: apiAny } = require("../../convex/_generated/api") as { api: any };

const STORAGE_STATE_PATH = path.join(process.cwd(), "tmp", "playwright", "atx-storage-state.json");
const SESSION_METADATA_PATH = path.join(process.cwd(), "tmp", "playwright", "atx-session-metadata.json");

dotenv.config({ path: path.join(process.cwd(), ".env.local"), override: false });

interface BootstrapResult {
  sessionId: string;
  email: string;
  organizationId: string;
  userId: string;
  created: boolean;
}

async function resolveSessionFromEnv(): Promise<BootstrapResult | null> {
  const sessionId = process.env.ATX_SESSION_ID?.trim();
  if (!sessionId) {
    return null;
  }

  return {
    sessionId,
    email: "env-provided",
    organizationId: "unknown",
    userId: "unknown",
    created: false,
  };
}

async function bootstrapSessionViaConvex(): Promise<BootstrapResult> {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    throw new Error(
      "Missing NEXT_PUBLIC_CONVEX_URL. Provide ATX_SESSION_ID or configure Convex env for ATX Playwright setup.",
    );
  }

  const convex = new ConvexHttpClient(convexUrl);
  const timestamp = Date.now();
  const email = `playwright.atx.${timestamp}@example.com`;
  const password = `Pw!ATX${timestamp}`;
  const organizationName = `Playwright ATX Org ${timestamp}`;
  const organizationSlug = `playwright-atx-${timestamp}`;

  const seedResult = await convex.mutation(apiAny.seedAdmin.createSuperAdminUser, {
    email,
    firstName: "Playwright",
    lastName: "ATX",
    organizationName,
    organizationSlug,
  });

  const setupResult = await convex.action(apiAny.auth.setupPassword, {
    email,
    password,
    firstName: "Playwright",
    lastName: "ATX",
  }) as {
    sessionId: string;
    success: boolean;
    user: { id: string; email: string };
  };

  if (!setupResult?.sessionId) {
    throw new Error("Failed to create ATX Playwright session via auth.setupPassword.");
  }

  return {
    sessionId: setupResult.sessionId,
    email,
    organizationId: seedResult.organizationId,
    userId: setupResult.user?.id,
    created: true,
  };
}

async function writeStorageState(config: FullConfig, sessionId: string) {
  const configuredBaseUrl = config.projects[0]?.use?.baseURL;
  const baseUrl = typeof configuredBaseUrl === "string"
    ? configuredBaseUrl
    : (process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000");
  const origin = new URL(baseUrl).origin;

  const storageState = {
    cookies: [],
    origins: [
      {
        origin,
        localStorage: [
          { name: "convex_session_id", value: sessionId },
        ],
      },
    ],
  };

  await fs.mkdir(path.dirname(STORAGE_STATE_PATH), { recursive: true });
  await fs.writeFile(STORAGE_STATE_PATH, JSON.stringify(storageState, null, 2), "utf8");
}

export default async function globalSetup(config: FullConfig) {
  const envSession = await resolveSessionFromEnv();
  const session = envSession ?? (await bootstrapSessionViaConvex());

  await writeStorageState(config, session.sessionId);
  await fs.writeFile(SESSION_METADATA_PATH, JSON.stringify(session, null, 2), "utf8");

  // Keep this line concise so CI logs show where session was sourced.
  console.log(
    `[ATX Playwright] session ready (${session.created ? "bootstrapped" : "env"}) email=${session.email}`,
  );
}
