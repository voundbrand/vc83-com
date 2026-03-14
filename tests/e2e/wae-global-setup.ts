import fs from "node:fs/promises";
import path from "node:path";
import { ConvexHttpClient } from "convex/browser";
import type { FullConfig } from "@playwright/test";
import dotenv from "dotenv";
import {
  buildWaePinManifest,
  buildWaeStorageState,
  buildWaeSuiteIdentity,
  collectLexicalReasonCodes,
  validateWaePinManifest,
  writeWaeLifecycleArtifacts,
} from "./utils/wae-eval-fixture";

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
const { api: apiAny } = require("../../convex/_generated/api") as { api: any };
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any
const { internal: internalAny } = require("../../convex/_generated/api") as { internal: any };

const STORAGE_STATE_PATH = path.join(process.cwd(), "tmp", "playwright", "wae-storage-state.json");
const SESSION_METADATA_PATH = path.join(process.cwd(), "tmp", "playwright", "wae-session-metadata.json");

dotenv.config({ path: path.join(process.cwd(), ".env.local"), override: false });

interface WaeSetupSession {
  sessionId: string;
  email: string;
  organizationId: string;
  userId: string;
  organizationSlug: string;
  suiteKeyHash: string;
  runId: string;
  created: boolean;
  templateVersionTag: string;
}

function resolvePlaywrightOrigin(config: FullConfig): string {
  const configuredBaseUrl = config.projects[0]?.use?.baseURL;
  const baseUrl = typeof configuredBaseUrl === "string"
    ? configuredBaseUrl
    : (process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000");
  return new URL(baseUrl).origin;
}

function resolveTemplateVersionTag(): string {
  const envTag = process.env.WAE_TEMPLATE_VERSION_TAG?.trim();
  if (envTag) {
    return envTag;
  }
  // Deterministic placeholder for local/CI fixture bootstrapping when ontology tag
  // is not explicitly injected yet.
  return "wae_template_version_unset";
}

function resolveRunId(suiteKeyHash: string): string {
  const envRunId = process.env.WAE_RUN_ID?.trim();
  if (envRunId) {
    return envRunId;
  }
  const attempt = Number(process.env.PLAYWRIGHT_RETRY_ATTEMPT || "1") || 1;
  return `wae-${suiteKeyHash}-attempt-${String(attempt).padStart(2, "0")}`;
}

async function bootstrapWaeSession(): Promise<WaeSetupSession> {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    throw new Error(
      "Missing NEXT_PUBLIC_CONVEX_URL. WAE Playwright fixture requires Convex API access.",
    );
  }

  const targetEnv = process.env.WAE_TARGET_ENV?.trim() || "local";
  const lane = process.env.WAE_LANE?.trim() || "C";
  const templateVersionTag = resolveTemplateVersionTag();
  const suite = buildWaeSuiteIdentity({
    templateVersionTag,
    targetEnv,
    lane,
  });

  const convex = new ConvexHttpClient(convexUrl);

  const seeded = await convex.mutation(apiAny.seedAdmin.createSuperAdminUser, {
    email: suite.adminEmail,
    firstName: "Playwright",
    lastName: "WAE",
    organizationName: suite.organizationName,
    organizationSlug: suite.organizationSlug,
  }) as {
    success: boolean;
    userId: string;
    organizationId: string;
    userCreated?: boolean;
    orgCreated?: boolean;
  };

  if (!seeded?.success || !seeded.organizationId) {
    throw new Error("WAE fixture bootstrap failed: could not ensure deterministic org/user.");
  }

  const ensureTemplateResult = await convex.mutation(
    internalAny.agentOntology.ensureTemplateManagedDefaultAgentForOrgInternal,
    {
      organizationId: seeded.organizationId,
      channel: "desktop",
    },
  ) as {
    fallbackUsed?: boolean;
    fallbackReason?: string;
  };

  if (ensureTemplateResult?.fallbackUsed) {
    throw new Error(
      `WAE fixture blocked: template provisioning fallback used (${ensureTemplateResult.fallbackReason || "unknown"}).`,
    );
  }

  const password = process.env.WAE_EVAL_PASSWORD?.trim() || `Pw!WAE${suite.suiteKeyHash}`;
  const needsSetup = await convex.query(apiAny.auth.checkNeedsPasswordSetup, {
    email: suite.adminEmail,
  }) as {
    userExists: boolean;
    needsSetup: boolean;
  };

  if (needsSetup.needsSetup) {
    await convex.action(apiAny.auth.setupPassword, {
      email: suite.adminEmail,
      password,
      firstName: "Playwright",
      lastName: "WAE",
    });
  }

  const signIn = await convex.action(apiAny.auth.signIn, {
    email: suite.adminEmail,
    password,
  }) as {
    success: boolean;
    sessionId: string;
    user: { id: string };
  };

  if (!signIn?.sessionId) {
    throw new Error("WAE fixture bootstrap failed: sign-in did not return a sessionId.");
  }

  return {
    sessionId: signIn.sessionId,
    email: suite.adminEmail,
    organizationId: seeded.organizationId,
    userId: signIn.user?.id || seeded.userId,
    organizationSlug: suite.organizationSlug,
    suiteKeyHash: suite.suiteKeyHash,
    runId: resolveRunId(suite.suiteKeyHash),
    created: Boolean(seeded.orgCreated || seeded.userCreated),
    templateVersionTag,
  };
}

export default async function globalSetup(config: FullConfig) {
  const session = await bootstrapWaeSession();
  const origin = resolvePlaywrightOrigin(config);

  const pinManifest = buildWaePinManifest(session.templateVersionTag);
  const pinManifestReasonCodes = validateWaePinManifest(pinManifest);
  const blockedReasonCodes = collectLexicalReasonCodes(pinManifestReasonCodes);
  const lifecycleStatus = blockedReasonCodes.length > 0 ? "blocked" : "passed";

  await writeWaeLifecycleArtifacts({
    runId: session.runId,
    pinManifest,
    createReceipt: {
      runId: session.runId,
      suiteKeyHash: session.suiteKeyHash,
      organizationId: session.organizationId,
      organizationSlug: session.organizationSlug,
      templateVersionTag: session.templateVersionTag,
      scenarioMatrixContractVersion: "wae_eval_scenario_matrix_v1",
      status: lifecycleStatus,
      reasonCodes: blockedReasonCodes,
      attempt: 1,
      timestamp: Date.now(),
    },
    resetReceipt: {
      runId: session.runId,
      suiteKeyHash: session.suiteKeyHash,
      organizationId: session.organizationId,
      organizationSlug: session.organizationSlug,
      templateVersionTag: session.templateVersionTag,
      scenarioMatrixContractVersion: "wae_eval_scenario_matrix_v1",
      status: lifecycleStatus,
      reasonCodes: blockedReasonCodes,
      attempt: 1,
      timestamp: Date.now(),
      preCount: 0,
      postCount: 0,
    },
    teardownReceipt: {
      runId: session.runId,
      suiteKeyHash: session.suiteKeyHash,
      organizationId: session.organizationId,
      organizationSlug: session.organizationSlug,
      templateVersionTag: session.templateVersionTag,
      scenarioMatrixContractVersion: "wae_eval_scenario_matrix_v1",
      status: lifecycleStatus,
      reasonCodes: blockedReasonCodes,
      attempt: 1,
      timestamp: Date.now(),
      mode: "replay_preserve",
    },
  });

  const storageState = buildWaeStorageState({
    origin,
    sessionId: session.sessionId,
  });

  await fs.mkdir(path.dirname(STORAGE_STATE_PATH), { recursive: true });
  await fs.writeFile(STORAGE_STATE_PATH, JSON.stringify(storageState, null, 2), "utf8");
  await fs.writeFile(
    SESSION_METADATA_PATH,
    JSON.stringify(
      {
        ...session,
        lifecycleStatus,
        reasonCodes: blockedReasonCodes,
      },
      null,
      2,
    ),
    "utf8",
  );

  if (lifecycleStatus === "blocked") {
    throw new Error(
      `WAE fixture blocked by fail-closed pin-manifest validation: ${blockedReasonCodes.join(",")}`,
    );
  }

  console.log(
    `[WAE Playwright] session ready suite=${session.suiteKeyHash} org=${session.organizationSlug} run=${session.runId}`,
  );
}
